import type {
    Container,
    ItemTemplate,
    Placement,
    EngineState,
    FindPlacementOptions,
    PlacementProvider,
    HeightMapProvider
} from './types'
import { HeightMap } from './HeightMap'
import { PlacementValidator } from './PlacementValidator'
import { PositionFinder } from './PositionFinder'

/**
 * PackingEngine - координатор операций с грузами
 *
 * Отвечает за:
 * - Управление состоянием (placements, heightMap)
 * - Координацию операций (add, remove, move)
 * - Undo/Redo
 *
 * Делегирует:
 * - Валидацию → PlacementValidator
 * - Поиск позиций → PositionFinder
 *
 * Реализует PlacementProvider и HeightMapProvider для
 * предоставления данных validator и positionFinder.
 */
export class PackingEngine implements PlacementProvider, HeightMapProvider {
    private readonly container: Container
    private readonly step: number

    private placements: Placement[] = []
    private readonly heightMap: HeightMap
    private readonly validator: PlacementValidator
    private readonly positionFinder: PositionFinder

    private undoStack: EngineState[] = []
    private redoStack: EngineState[] = []

    constructor(container: Container, step = 1) {
        this.container = container
        this.step = step
        this.heightMap = new HeightMap(container, step)

        // Validator и PositionFinder получают heightMap через this (provider)
        // Это позволяет не пересоздавать их при rebuildHeightMap
        this.validator = new PlacementValidator(container, this, this)
        this.positionFinder = new PositionFinder(
            container,
            step,
            this,
            this.validator,
            this
        )
    }

    // ═══════════════════════════════════════════════════════════════
    // HeightMapProvider interface
    // ═══════════════════════════════════════════════════════════════

    getHeightMap() {
        return this.heightMap
    }

    // ═══════════════════════════════════════════════════════════════
    // PlacementProvider interface
    // ═══════════════════════════════════════════════════════════════

    getPlacements(): readonly Placement[] {
        return this.placements
    }

    getPlacementById(id: string): Placement | null {
        return this.placements.find(p => p.id === id) ?? null
    }

    // ═══════════════════════════════════════════════════════════════
    // Валидация (делегируем PlacementValidator)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Проверяет, можно ли разместить груз в позиции (x, y)
     * @returns z-координата или null
     */
    canPlaceAt(template: ItemTemplate, x: number, y: number): number | null {
        return this.validator.canPlaceAt(template, x, y)
    }

    /**
     * Проверяет, можно ли модифицировать груз
     */
    canModifyPlacement(id: string): boolean {
        return this.validator.canModifyById(id)
    }

    // ═══════════════════════════════════════════════════════════════
    // Поиск позиции (делегируем PositionFinder)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Находит оптимальную позицию для размещения груза
     */
    findPlacement(
        template: ItemTemplate,
        options: FindPlacementOptions = { mode: 'uniform' }
    ): Placement | null {
        return this.positionFinder.findBestPosition(template, options)
    }

    // ═══════════════════════════════════════════════════════════════
    // Операции с грузами
    // ═══════════════════════════════════════════════════════════════

    /**
     * Добавляет груз с автоматическим поиском позиции
     */
    addItem(
        template: ItemTemplate,
        options: FindPlacementOptions
    ): Placement | null {
        const placement = this.findPlacement(template, options)
        if (!placement) return null

        return this.addItemAt(template, placement.x, placement.y)
    }

    /**
     * Добавляет груз в конкретную позицию (x, y)
     */
    addItemAt(template: ItemTemplate, x: number, y: number): Placement | null {
        const z = this.canPlaceAt(template, x, y)
        if (z === null) return null

        const placement = this.createPlacement(template, x, y, z)

        this.commit()
        this.applyPlacement(placement)

        return placement
    }

    /**
     * Удаляет груз (только если сверху ничего нет и не заблокирован)
     */
    removePlacement(id: string): boolean {
        const placement = this.getPlacementById(id)
        if (!placement) return false

        if (!this.validator.canModify(placement)) {
            return false
        }

        const index = this.placements.findIndex(p => p.id === id)

        this.commit()
        this.placements.splice(index, 1)
        this.rebuildHeightMap()

        return true
    }

    /**
     * Перемещает груз в новую позицию
     */
    movePlacement(id: string, x: number, y: number): Placement | null {
        const original = this.getPlacementById(id)
        if (!original) return null

        if (!this.validator.canModify(original)) {
            return null
        }

        const index = this.placements.findIndex(p => p.id === id)

        this.commit()

        // Временно убираем placement
        this.placements.splice(index, 1)
        this.rebuildHeightMap()

        // Проверяем новое место
        const template: ItemTemplate = {
            id: original.id,
            templateId: original.templateId,
            width: original.width,
            length: original.length,
            height: original.height,
            fragile: original.fragile
        }

        const z = this.canPlaceAt(template, x, y)

        // Если нельзя — откат
        if (z === null) {
            this.placements.splice(index, 0, original)
            this.rebuildHeightMap()
            return null
        }

        // Применяем новое размещение
        const moved: Placement = { ...original, x, y, z }
        this.placements.push(moved)
        this.rebuildHeightMap()

        return moved
    }

    /**
     * Устанавливает флаг locked
     */
    setLocked(id: string, locked: boolean): boolean {
        const placement = this.getPlacementById(id)
        if (!placement) return false

        placement.locked = locked
        return true
    }

    // ═══════════════════════════════════════════════════════════════
    // Undo / Redo
    // ═══════════════════════════════════════════════════════════════

    undo(): boolean {
        if (!this.canUndo()) return false

        const prev = this.undoStack.pop()!
        this.redoStack.push(this.snapshot())
        this.restore(prev)

        return true
    }

    redo(): boolean {
        if (!this.canRedo()) return false

        const next = this.redoStack.pop()!
        this.undoStack.push(this.snapshot())
        this.restore(next)

        return true
    }

    canUndo(): boolean {
        return this.undoStack.length > 0
    }

    canRedo(): boolean {
        return this.redoStack.length > 0
    }

    // ═══════════════════════════════════════════════════════════════
    // Внутренние методы
    // ═══════════════════════════════════════════════════════════════

    /**
     * Применяет размещение (добавляет в список и обновляет heightMap)
     * @internal Используется только внутри engine и в тестах
     */
    applyPlacementUnsafe(p: Placement): void {
        this.applyPlacement(p)
    }

    private applyPlacement(placement: Placement): void {
        this.placements.push(placement)
        this.heightMap.applyPlacement(placement)
    }

    private createPlacement(
        template: ItemTemplate,
        x: number,
        y: number,
        z: number
    ): Placement {
        return {
            id: template.id,
            templateId: template.templateId,
            name: (template as { name?: string }).name ?? '',
            color: (template as { color?: string }).color ?? '#9e9e9e',
            weight: (template as { weight?: number }).weight,
            width: template.width,
            length: template.length,
            height: template.height,
            x,
            y,
            z,
            fragile: template.fragile ?? false,
            locked: false,
        }
    }

    /**
     * Пересчитывает HeightMap на основе текущих placements.
     *
     * Оптимизации:
     * - Использует reset() вместо создания нового объекта
     * - Не пересоздаёт validator и positionFinder (они получают heightMap через provider)
     */
    private rebuildHeightMap(): void {
        this.heightMap.reset()

        for (const placement of this.placements) {
            this.heightMap.applyPlacement(placement)
        }
    }

    private snapshot(): EngineState {
        return {
            placements: this.placements.map(p => ({ ...p }))
        }
    }

    private restore(state: EngineState): void {
        this.placements = state.placements.map(p => ({ ...p }))
        this.rebuildHeightMap()
    }

    private commit(): void {
        this.undoStack.push(this.snapshot())
        this.redoStack.length = 0
    }
}

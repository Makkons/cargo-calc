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
     * Добавляет груз в позицию (x, y) или ближайшую валидную.
     * Используется при drag-and-drop нового груза из шаблонов.
     */
    addItemAtOrNear(
        template: ItemTemplate,
        x: number,
        y: number,
        maxRadius: number = 300
    ): Placement | null {
        // Сначала пробуем точную позицию
        const direct = this.addItemAt(template, x, y)
        if (direct) return direct

        // Ищем ближайшую валидную позицию
        const nearest = this.findNearestPlacePosition(template, x, y, maxRadius)
        if (!nearest) return null

        return this.addItemAt(template, nearest.x, nearest.y)
    }

    /**
     * Ищет ближайшую валидную позицию для НОВОГО груза.
     * Аналог findNearestDropPosition, но без удаления существующего груза.
     */
    findNearestPlacePosition(
        template: ItemTemplate,
        targetX: number,
        targetY: number,
        maxRadius: number = 300
    ): { x: number; y: number; z: number } | null {
        const snap = (v: number) => Math.round(v / this.step) * this.step
        const snappedX = snap(targetX)
        const snappedY = snap(targetY)

        const euclidean = (x: number, y: number) =>
            Math.sqrt((x - snappedX) ** 2 + (y - snappedY) ** 2)

        // 1. Проверяем целевую точку
        const z = this.canPlaceAt(template, snappedX, snappedY)
        if (z !== null) {
            return { x: snappedX, y: snappedY, z }
        }

        // 2. Находим грузы которые пересекаются с target
        const overlapping = this.findOverlappingPlacements(
            snappedX, snappedY, template.width, template.length
        )

        // 3. Приоритет 1: позиции вплотную к пересекающимся грузам
        if (overlapping.length > 0) {
            const priorityPositions = this.getAdjacentPositions(
                template, snappedX, snappedY, overlapping, snap
            )
            priorityPositions.sort((a, b) => euclidean(a.x, a.y) - euclidean(b.x, b.y))

            for (const pos of priorityPositions) {
                const z = this.canPlaceAt(template, pos.x, pos.y)
                if (z !== null) {
                    return { x: pos.x, y: pos.y, z }
                }
            }
        }

        // 4. Приоритет 2: позиции вплотную к другим ближайшим грузам
        const nearbyPlacements = this.placements.filter(p => !overlapping.includes(p))
        const nearbyPositions = this.getAdjacentPositions(
            template, snappedX, snappedY, nearbyPlacements, snap, maxRadius
        )
        nearbyPositions.sort((a, b) => euclidean(a.x, a.y) - euclidean(b.x, b.y))

        for (const pos of nearbyPositions) {
            const z = this.canPlaceAt(template, pos.x, pos.y)
            if (z !== null) {
                return { x: pos.x, y: pos.y, z }
            }
        }

        // 5. Fallback: поиск по сетке
        const gridPositions = this.getGridPositions(snappedX, snappedY, maxRadius)

        for (const pos of gridPositions) {
            if (pos.x < 0 || pos.y < 0) continue
            if (pos.x + template.width > this.container.width) continue
            if (pos.y + template.length > this.container.length) continue

            const z = this.canPlaceAt(template, pos.x, pos.y)
            if (z !== null) {
                return { x: pos.x, y: pos.y, z }
            }
        }

        return null
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
     * Проверяет, можно ли переместить груз в позицию (x, y) БЕЗ реального перемещения.
     * Используется для валидации во время drag-and-drop.
     *
     * @returns z-координата если можно, null если нельзя
     */
    canMoveToPosition(id: string, x: number, y: number): number | null {
        const placement = this.getPlacementById(id)
        if (!placement) return null

        if (!this.validator.canModify(placement)) {
            return null
        }

        const index = this.placements.indexOf(placement)

        // Временно убираем placement (БЕЗ commit)
        this.placements.splice(index, 1)
        this.rebuildHeightMap()

        const z = this.canPlaceAt(this.toTemplate(placement), x, y)

        // Восстанавливаем (БЕЗ commit)
        this.placements.splice(index, 0, placement)
        this.rebuildHeightMap()

        return z
    }

    /**
     * Ищет ближайшую валидную позицию для перемещения груза.
     *
     * Алгоритм (с приоритетами):
     * 1. Проверяем целевую позицию
     * 2. Ищем позиции вплотную к грузам, которые ПЕРЕСЕКАЮТСЯ с target (высший приоритет)
     * 3. Ищем позиции вплотную к остальным ближайшим грузам
     * 4. Fallback: поиск по сетке (включая границы контейнера)
     *
     * Используем Евклидово расстояние для более интуитивной сортировки.
     */
    findNearestDropPosition(
        id: string,
        targetX: number,
        targetY: number,
        maxRadius: number = 300
    ): { x: number; y: number; z: number } | null {
        const placement = this.getPlacementById(id)
        if (!placement) return null

        if (!this.validator.canModify(placement)) {
            return null
        }

        const index = this.placements.indexOf(placement)

        // Snap к сетке
        const snap = (v: number) => Math.round(v / this.step) * this.step
        const snappedX = snap(targetX)
        const snappedY = snap(targetY)

        const template = this.toTemplate(placement)

        // === ОДИН rebuild: убираем груз ===
        this.placements.splice(index, 1)
        this.rebuildHeightMap()

        // Евклидово расстояние
        const euclidean = (x: number, y: number) =>
            Math.sqrt((x - snappedX) ** 2 + (y - snappedY) ** 2)

        try {
            // 1. Проверяем целевую точку
            const z = this.canPlaceAt(template, snappedX, snappedY)
            if (z !== null) {
                return { x: snappedX, y: snappedY, z }
            }

            // 2. Находим груз(ы) которые пересекаются с target (на которые бросили)
            const overlapping = this.findOverlappingPlacements(
                snappedX, snappedY, template.width, template.length
            )

            // 3. Приоритет 1: позиции вплотную к пересекающимся грузам
            if (overlapping.length > 0) {
                const priorityPositions = this.getAdjacentPositions(
                    template, snappedX, snappedY, overlapping, snap
                )
                priorityPositions.sort((a, b) => euclidean(a.x, a.y) - euclidean(b.x, b.y))

                for (const pos of priorityPositions) {
                    const z = this.canPlaceAt(template, pos.x, pos.y)
                    if (z !== null) {
                        return { x: pos.x, y: pos.y, z }
                    }
                }
            }

            // 4. Приоритет 2: позиции вплотную к другим ближайшим грузам
            const nearbyPlacements = this.placements.filter(p => !overlapping.includes(p))
            const nearbyPositions = this.getAdjacentPositions(
                template, snappedX, snappedY, nearbyPlacements, snap, maxRadius
            )
            nearbyPositions.sort((a, b) => euclidean(a.x, a.y) - euclidean(b.x, b.y))

            for (const pos of nearbyPositions) {
                const z = this.canPlaceAt(template, pos.x, pos.y)
                if (z !== null) {
                    return { x: pos.x, y: pos.y, z }
                }
            }

            // 5. Fallback: поиск по сетке
            const gridPositions = this.getGridPositions(snappedX, snappedY, maxRadius)

            for (const pos of gridPositions) {
                if (pos.x < 0 || pos.y < 0) continue
                if (pos.x + template.width > this.container.width) continue
                if (pos.y + template.length > this.container.length) continue

                const z = this.canPlaceAt(template, pos.x, pos.y)
                if (z !== null) {
                    return { x: pos.x, y: pos.y, z }
                }
            }

            return null
        } finally {
            // === ОДИН rebuild: возвращаем груз ===
            this.placements.splice(index, 0, placement)
            this.rebuildHeightMap()
        }
    }

    /**
     * Находит грузы, которые пересекаются с заданной областью
     */
    private findOverlappingPlacements(
        x: number,
        y: number,
        width: number,
        length: number
    ): Placement[] {
        return this.placements.filter(p => {
            const overlapX = x < p.x + p.width && x + width > p.x
            const overlapY = y < p.y + p.length && y + length > p.y
            return overlapX && overlapY
        })
    }

    /**
     * Генерирует позиции вплотную к граням указанных грузов
     */
    private getAdjacentPositions(
        template: ItemTemplate,
        targetX: number,
        targetY: number,
        placements: Placement[],
        snap: (v: number) => number,
        maxRadius?: number
    ): Array<{ x: number; y: number }> {
        const positions: Array<{ x: number; y: number }> = []

        for (const other of placements) {
            // Пропускаем далёкие грузы если указан maxRadius
            if (maxRadius !== undefined) {
                const centerX = other.x + other.width / 2
                const centerY = other.y + other.length / 2
                const dist = Math.sqrt((centerX - targetX) ** 2 + (centerY - targetY) ** 2)
                if (dist > maxRadius + Math.max(other.width, other.length)) continue
            }

            // Справа от груза
            const rightX = snap(other.x + other.width)
            if (rightX + template.width <= this.container.width) {
                positions.push({ x: rightX, y: snap(other.y) })
                positions.push({ x: rightX, y: snap(other.y + other.length - template.length) })
            }

            // Слева от груза
            const leftX = snap(other.x - template.width)
            if (leftX >= 0) {
                positions.push({ x: leftX, y: snap(other.y) })
                positions.push({ x: leftX, y: snap(other.y + other.length - template.length) })
            }

            // Снизу от груза
            const bottomY = snap(other.y + other.length)
            if (bottomY + template.length <= this.container.length) {
                positions.push({ x: snap(other.x), y: bottomY })
                positions.push({ x: snap(other.x + other.width - template.width), y: bottomY })
            }

            // Сверху от груза
            const topY = snap(other.y - template.length)
            if (topY >= 0) {
                positions.push({ x: snap(other.x), y: topY })
                positions.push({ x: snap(other.x + other.width - template.width), y: topY })
            }
        }

        // Убираем дубликаты
        const unique = new Map<string, { x: number; y: number }>()
        for (const pos of positions) {
            if (pos.x < 0 || pos.y < 0) continue
            if (pos.x + template.width > this.container.width) continue
            if (pos.y + template.length > this.container.length) continue
            const key = `${pos.x},${pos.y}`
            if (!unique.has(key)) {
                unique.set(key, pos)
            }
        }

        return Array.from(unique.values())
    }

    /**
     * Генерирует позиции на сетке для fallback поиска
     */
    private getGridPositions(
        centerX: number,
        centerY: number,
        maxRadius: number
    ): Array<{ x: number; y: number }> {
        const positions: Array<{ x: number; y: number }> = []
        const step = this.step

        // Генерируем точки по спирали
        for (let radius = step; radius <= maxRadius; radius += step) {
            // Точки на текущем радиусе
            for (let dx = -radius; dx <= radius; dx += step) {
                positions.push({ x: centerX + dx, y: centerY - radius })
                positions.push({ x: centerX + dx, y: centerY + radius })
            }
            for (let dy = -radius + step; dy < radius; dy += step) {
                positions.push({ x: centerX - radius, y: centerY + dy })
                positions.push({ x: centerX + radius, y: centerY + dy })
            }
        }

        // Сортируем по расстоянию
        positions.sort((a, b) => {
            const distA = Math.abs(a.x - centerX) + Math.abs(a.y - centerY)
            const distB = Math.abs(b.x - centerX) + Math.abs(b.y - centerY)
            return distA - distB
        })

        return positions
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

        const z = this.canPlaceAt(this.toTemplate(original), x, y)

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

    /**
     * Восстанавливает размещения из сохранённых данных (история).
     * Применяет placement'ы напрямую без поиска позиций.
     * Очищает текущие размещения перед загрузкой.
     */
    restorePlacements(placements: Placement[]): void {
        this.commit()

        // Очищаем текущие размещения
        this.placements = []
        this.heightMap.reset()

        // Восстанавливаем сохранённые размещения
        for (const p of placements) {
            // Создаём копию с новым id чтобы избежать конфликтов
            const restored: Placement = {
                ...p,
                id: crypto.randomUUID(),
            }
            this.applyPlacement(restored)
        }
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

    /**
     * Создаёт ItemTemplate из Placement для проверок canPlaceAt
     */
    private toTemplate(p: Placement): ItemTemplate {
        return {
            id: p.id,
            templateId: p.templateId,
            width: p.width,
            length: p.length,
            height: p.height,
            fragile: p.fragile,
        }
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

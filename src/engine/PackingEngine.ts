import type {
    Container,
    ItemTemplate,
    Placement,
    EngineState
} from './types'
import {HeightMap} from './HeightMap'
import { scoreUniform, scoreDense } from './scoring'

type FindPlacementOptions = {
    mode: 'uniform' | 'dense'
    /** Искать размещение только на полу (z = 0) */
    floorOnly?: boolean
}

export class PackingEngine {
    private container: Container
    private heightMap: HeightMap
    private placements: Placement[] = []
    private undoStack: EngineState[] = []
    private redoStack: EngineState[] = []
    private step: number

    constructor(container: Container, step = 1) {
        this.container = container
        this.step = step
        this.heightMap = new HeightMap(container, step)
    }

    canPlaceAt(
        template: ItemTemplate,
        x: number,
        y: number
    ): number | null {
        const {width, length, height} = template

        if (
            x < 0 ||
            y < 0 ||
            x + width > this.container.width ||
            y + length > this.container.length
        ) {
            return null
        }

        const cells = this.heightMap.getCells(x, y, width, length)
        const z = this.heightMap.getBaseHeight(cells)
        if (z === null) return null

        // ❗ Нельзя ставить на fragile
        for (const cell of cells) {
            if (cell.topPlacementId) {
                const below = this.getPlacementById(cell.topPlacementId)
                if (below?.fragile) {
                    return null
                }
            }
        }

        if (z + height > this.container.height) {
            return null
        }

        return z
    }

    canModifyPlacement(id: string): boolean {
        const p = this.getPlacementById(id)
        if (!p) return false
        if (p.locked) return false
        return !this.heightMap.hasPlacementAbove(p)
    }

    /**
     * 🎯 Генерация кандидатных позиций для размещения
     *
     * Вместо перебора всех позиций O(W×L) генерируем только "интересные" точки:
     * - (0, 0) — угол контейнера
     * - Справа от каждого груза: (p.x + p.width, p.y)
     * - Снизу от каждого груза: (p.x, p.y + p.length)
     *
     * Это сокращает количество проверок с тысяч до десятков.
     */
    private getCandidatePositions(template: ItemTemplate): Array<{ x: number; y: number }> {
        const candidates = new Map<string, { x: number; y: number }>()

        const addCandidate = (x: number, y: number) => {
            // Snap к сетке
            const sx = Math.round(x / this.step) * this.step
            const sy = Math.round(y / this.step) * this.step

            // Проверяем границы с учётом размеров груза
            if (sx < 0 || sy < 0) return
            if (sx + template.width > this.container.width) return
            if (sy + template.length > this.container.length) return

            const key = `${sx},${sy}`
            if (!candidates.has(key)) {
                candidates.set(key, { x: sx, y: sy })
            }
        }

        // Базовая позиция — угол контейнера
        addCandidate(0, 0)

        // Кандидаты от существующих грузов
        for (const p of this.placements) {
            // Справа от груза
            addCandidate(p.x + p.width, p.y)

            // Снизу от груза
            addCandidate(p.x, p.y + p.length)

            // Диагональ (полезно для заполнения углов)
            addCandidate(p.x + p.width, p.y + p.length)

            // Выравнивание по левому краю груза (для стекинга)
            addCandidate(p.x, p.y)
        }

        return Array.from(candidates.values())
    }

    /**
     * 🔍 Поиск оптимального размещения (оптимизированный)
     *
     * Использует кандидатные точки вместо полного перебора.
     * Сложность: O(N) вместо O(W×L), где N — число размещений.
     */
    findPlacement(
        template: ItemTemplate,
        options: FindPlacementOptions = { mode: 'uniform' }
    ): Placement | null {
        const candidates = this.getCandidatePositions(template)

        let best: Placement | null = null
        let bestScore: number | null = null

        for (const { x, y } of candidates) {
            const z = this.canPlaceAt(template, x, y)
            if (z === null) continue

            // В режиме floorOnly размещаем только на полу
            if (options.floorOnly && z !== 0) continue

            const cells = this.heightMap.getCells(x, y, template.width, template.length)

            const score =
                options.mode === 'uniform'
                    ? scoreUniform(cells, z)
                    : scoreDense(cells, z)

            if (best === null || score < bestScore!) {
                bestScore = score
                best = {
                    id: crypto.randomUUID(),
                    templateId: template.templateId,
                    x,
                    y,
                    z,
                    width: template.width,
                    length: template.length,
                    height: template.height,
                    fragile: template.fragile
                }
            }
        }

        return best
    }

    applyPlacementUnsafe(p: Placement): void {
        this.placements.push(p)
        this.heightMap.applyPlacement(p)
    }


    /**
     * 📦 Только для чтения (UI / тесты / визуализация)
     */
    getPlacements(): readonly Placement[] {
        return this.placements
    }

    /**
     * ➕ Высокоуровневое добавление груза
     * findPlacement → applyPlacement
     */
    addItem(
        template: ItemTemplate,
        options: { mode: 'uniform' | 'dense'; floorOnly?: boolean }
    ): Placement | null {
        const pos = this.findPlacement(template, options)

        if (!pos) {
            return null
        }

        return this.addItemAt(template, pos.x, pos.y)
    }

    /**
     * ➕ Добавление груза в конкретную позицию (x, y)
     * z вычисляется автоматически
     */
    addItemAt(
        template: ItemTemplate,
        x: number,
        y: number
    ): Placement | null {
        const z = this.canPlaceAt(template, x, y)

        if (z === null) {
            return null
        }

        const placement: Placement = {
            // идентичность
            id: template.id,
            templateId: template.templateId,

            // метаданные
            name: template.name,
            color: template.color,
            weight: template.weight,

            // геометрия
            width: template.width,
            length: template.length,
            height: template.height,

            // позиция
            x,
            y,
            z,

            // флаги
            fragile: template.fragile,
            locked: false,
        }

        this.commit()
        this.applyPlacementUnsafe(placement)

        return placement
    }

    /**
     * ❌ Удаление груза
     * Можно удалить ТОЛЬКО если сверху ничего не лежит
     */
    removePlacement(id: string): boolean {
        const index = this.placements.findIndex(p => p.id === id)
        if (index === -1) return false

        const placement = this.placements[index]

        // 🔒 Нельзя удалять заблокированный
        if (placement.locked) {
            return false
        }

        // ❌ Нельзя удалять, если сверху что-то есть
        if (this.hasItemsAbove(id)) {
            return false
        }

        this.commit()
        this.placements.splice(index, 1)
        this.rebuildHeightMap()
        return true
    }

    /**
     * ↔️ Перемещение груза (v1)
     * Можно перемещать ТОЛЬКО верхний груз
     */
    movePlacement(
        id: string,
        x: number,
        y: number
    ): Placement | null {
        const index = this.placements.findIndex(p => p.id === id)
        if (index === -1) return null

        this.commit()

        const original = this.placements[index]

        // 🔒 Нельзя двигать заблокированный
        if (original.locked) {
            return null
        }

        // ❌ Нельзя двигать, если сверху что-то есть
        if (this.hasItemsAbove(id)) {
            return null
        }

        // 1. Временно убираем placement
        this.placements.splice(index, 1)
        this.rebuildHeightMap()

        // 2. Проверяем новое место
        const z = this.canPlaceAt(
            {
                id: original.templateId,
                width: original.width,
                length: original.length,
                height: original.height,
                fragile: original.fragile
            },
            x,
            y
        )

        // 3. Если нельзя — откат
        if (z === null) {
            this.placements.splice(index, 0, original)
            this.rebuildHeightMap()
            return null
        }

        // 4. Применяем новое размещение
        const moved: Placement = {
            ...original,
            x,
            y,
            z
        }

        this.placements.push(moved)
        this.rebuildHeightMap()

        return moved
    }

    setLocked(id: string, locked: boolean): boolean {
        const p = this.getPlacementById(id)
        if (!p) return false
        p.locked = locked
        return true
    }

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


    /**
     * Проверяет, лежит ли на этом грузе что-то ещё
     */
    private hasItemsAbove(id: string): boolean {
        const placement = this.getPlacementById(id)
        if (!placement) return false
        return this.heightMap.hasPlacementAbove(placement)
    }

    private getPlacementById(id: string): Placement | null {
        return this.placements.find(p => p.id === id) ?? null
    }

    /**
     * 🔄 Полная пересборка карты высот
     * Используется при удалении и в будущем при undo / move
     */
    private rebuildHeightMap(): void {
        // создаём новую пустую карту
        this.heightMap = new HeightMap(this.container, this.step)

        // заново применяем все размещения
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
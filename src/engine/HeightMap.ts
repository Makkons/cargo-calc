import type { Container, Cell, Placement } from './types'

export class HeightMap {
    private readonly step: number
    private readonly gridWidth: number
    private readonly gridLength: number
    private grid: Cell[][]

    constructor(container: Container, step = 1) {
        this.step = step
        this.gridWidth = Math.ceil(container.width / step)
        this.gridLength = Math.ceil(container.length / step)
        this.grid = this.createEmptyGrid()
    }

    /**
     * Создаёт пустую сетку
     */
    private createEmptyGrid(): Cell[][] {
        return Array.from({ length: this.gridWidth }, () =>
            Array.from({ length: this.gridLength }, () => ({
                height: 0,
                topPlacementId: null
            }))
        )
    }

    /**
     * Сбрасывает HeightMap в начальное состояние без пересоздания объекта.
     * Оптимизация: переиспользуем существующие ячейки вместо аллокации новых.
     */
    reset(): void {
        for (let i = 0; i < this.gridWidth; i++) {
            for (let j = 0; j < this.gridLength; j++) {
                this.grid[i][j].height = 0
                this.grid[i][j].topPlacementId = null
            }
        }
    }

    /**
     * Возвращает все ячейки под прямоугольником
     */
    getCells(x: number, y: number, w: number, l: number): Cell[] {
        const cells: Cell[] = []

        const x0 = Math.floor(x / this.step)
        const y0 = Math.floor(y / this.step)
        const x1 = Math.ceil((x + w) / this.step)
        const y1 = Math.ceil((y + l) / this.step)

        for (let i = x0; i < x1; i++) {
            for (let j = y0; j < y1; j++) {
                const cell = this.grid[i]?.[j]
                if (!cell) {
                    throw new Error('HeightMap out of bounds access')
                }
                cells.push(cell)
            }
        }

        return cells
    }

    /**
     * Возвращает базовую высоту или null, если нет полной опоры
     *
     * NOTE: Используем цикл вместо Math.min(...spread) чтобы избежать
     * stack overflow при большом количестве ячеек (>65000)
     */
    getBaseHeight(cells: Cell[]): number | null {
        if (cells.length === 0) return null

        let min = cells[0].height
        let max = cells[0].height

        for (let i = 1; i < cells.length; i++) {
            const h = cells[i].height
            if (h < min) min = h
            if (h > max) max = h
        }

        // допустимый перепад = step (или 0, если хочешь строго)
        if (max - min > this.step) return null

        return max
    }

    /**
     * Применяет размещение и обновляет поверхность
     */
    applyPlacement(p: Placement): void {
        const x0 = Math.floor(p.x / this.step)
        const y0 = Math.floor(p.y / this.step)
        const x1 = Math.ceil((p.x + p.width) / this.step)
        const y1 = Math.ceil((p.y + p.length) / this.step)

        const newHeight = p.z + p.height

        for (let i = x0; i < x1; i++) {
            for (let j = y0; j < y1; j++) {
                const cell = this.grid[i]?.[j]
                if (!cell) {
                    throw new Error('HeightMap out of bounds write')
                }
                cell.height = newHeight
                cell.topPlacementId = p.id
            }
        }
    }

    /**
     * Есть ли над placement другие грузы
     */
    hasPlacementAbove(placement: Placement): boolean {
        const x0 = Math.floor(placement.x / this.step)
        const y0 = Math.floor(placement.y / this.step)
        const x1 = Math.ceil((placement.x + placement.width) / this.step)
        const y1 = Math.ceil((placement.y + placement.length) / this.step)

        const topZ = placement.z + placement.height

        for (let i = x0; i < x1; i++) {
            for (let j = y0; j < y1; j++) {
                const cell = this.grid[i]?.[j]
                if (!cell) continue

                // ❗ если НАД этим грузом есть что-то
                if (cell.height > topZ) {
                    return true
                }
            }
        }

        return false
    }

    /**
     * Для тестов и дебага
     */
    snapshot(): number[][] {
        return this.grid.map(col => col.map(c => c.height))
    }
}
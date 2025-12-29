import type { Container, Cell, Placement } from './types'

export class HeightMap {
    private step: number
    private width: number
    private length: number
    private grid: Cell[][]

    constructor(container: Container, step = 1) {
        this.step = step
        this.width = Math.ceil(container.width / step)
        this.length = Math.ceil(container.length / step)

        this.grid = Array.from({ length: this.width }, () =>
            Array.from({ length: this.length }, () => ({
                height: 0,
                topPlacementId: null
            }))
        )
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
     */
    getBaseHeight(cells: Cell[]): number | null {
        if (cells.length === 0) return null

        const base = Math.max(...cells.map(c => c.height))

        for (const c of cells) {
            if (c.height !== base) return null
        }

        return base
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
    hasPlacementAbove(id: string): boolean {
        for (const column of this.grid) {
            for (const cell of column) {
                if (cell.topPlacementId !== null && cell.topPlacementId !== id) {
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
import type { HeightMap, Mode } from '@/types'

export function canPlaceItem(
    map: HeightMap,
    item: { width: number; length: number },
    x: number,
    y: number,
    mode: Mode
): number | null {

    const supports: number[] = []

    for (const cell of map.cells) {
        if (
            x >= cell.x &&
            y >= cell.y &&
            x + item.width <= cell.x + cell.width &&
            y + item.length <= cell.y + cell.length
        ) {
            supports.push(cell.z)
        }
    }

    if (supports.length === 0) return null

    if (mode === 'uniform') {
        // ВСЕГДА сначала пол
        return supports.includes(0) ? 0 : Math.min(...supports)
    }

    // dense → вверх
    return Math.max(...supports)
}
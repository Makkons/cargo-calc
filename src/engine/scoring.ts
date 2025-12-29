import type { Cell } from './types'

function surfaceMetrics(cells: Cell[], z: number) {
    let min = Infinity
    let max = -Infinity
    let gap = 0

    for (const c of cells) {
        min = Math.min(min, c.height)
        max = Math.max(max, c.height)
        gap += z - c.height
    }

    return {
        variance: max - min,
        gap
    }
}

export function scoreUniform(cells: Cell[], z: number): number {
    const { variance, gap } = surfaceMetrics(cells, z)
    return z * 1_000_000 + variance * 1_000 + gap
}

export function scoreDense(cells: Cell[], z: number): number {
    const { variance, gap } = surfaceMetrics(cells, z)
    return -z * 1_000_000 + gap * 1_000 + variance
}
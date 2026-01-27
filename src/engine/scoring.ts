import type { Cell } from './types'

/**
 * Весовые коэффициенты для функций оценки размещения.
 *
 * Приоритеты (по убыванию):
 * - PRIMARY: основной критерий (высота z)
 * - SECONDARY: вторичный критерий (variance или gap)
 * - TERTIARY: третичный критерий (оставшийся)
 */
const SCORE_WEIGHTS = {
    PRIMARY: 1_000_000,
    SECONDARY: 1_000,
    TERTIARY: 1,
} as const

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

/**
 * Оценка для режима uniform — равномерное распределение веса.
 * Предпочитает: низкую высоту, минимальный перепад поверхности, меньше пустот.
 */
export function scoreUniform(cells: Cell[], z: number): number {
    const { variance, gap } = surfaceMetrics(cells, z)
    return z * SCORE_WEIGHTS.PRIMARY + variance * SCORE_WEIGHTS.SECONDARY + gap
}

/**
 * Оценка для режима dense — плотная укладка.
 * Предпочитает: максимальную высоту (заполнение снизу вверх), минимум пустот.
 */
export function scoreDense(cells: Cell[], z: number): number {
    const { variance, gap } = surfaceMetrics(cells, z)
    return -z * SCORE_WEIGHTS.PRIMARY + gap * SCORE_WEIGHTS.SECONDARY + variance
}
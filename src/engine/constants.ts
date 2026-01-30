/**
 * Константы для engine и UI
 */

/** Радиус поиска позиции по умолчанию (в единицах контейнера) */
export const DEFAULT_SEARCH_RADIUS = 300

/** Порог расстояния для магнитного snap к граням грузов */
export const SNAP_THRESHOLD = 30

/** Расстояние для "отлипания" от snap (должно быть > SNAP_THRESHOLD) */
export const SNAP_BREAKAWAY = 45

/** Цвет груза по умолчанию */
export const DEFAULT_CARGO_COLOR = '#9e9e9e'

/**
 * Округляет значение до ближайшей точки сетки.
 * Используется во всех местах где нужен snap к сетке.
 */
export function snapToGrid(value: number, step: number): number {
    return Math.round(value / step) * step
}

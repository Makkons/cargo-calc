export type Container = {
    width: number
    length: number
    height: number
}

export type Cell = {
    height: number
    topPlacementId: string | null
}

export interface Placement {
    id: string

    // связь
    templateId?: string

    // метаданные
    name: string
    color: string
    weight?: number

    // геометрия
    width: number
    length: number
    height: number

    // позиция
    x: number
    y: number
    z: number

    // флаги
    fragile: boolean
    locked?: boolean
}

export interface ItemTemplate {
    id: string            // ← ЭТО ID ГРУЗА
    templateId?: string   // ← ссылка на CargoTemplate
    width: number
    length: number
    height: number
    fragile?: boolean
}

export type EngineState = {
    placements: Placement[]
}

/**
 * Режим поиска оптимальной позиции
 */
export type PlacementMode = 'uniform' | 'dense'

/**
 * Опции для поиска позиции
 */
export interface FindPlacementOptions {
    mode: PlacementMode
    /** Размещать только на полу (z = 0) */
    floorOnly?: boolean
}

/**
 * Кандидатная позиция для размещения
 */
export interface CandidatePosition {
    x: number
    y: number
}

/**
 * Результат обновления груза (edit/rotate)
 */
export interface PlacementUpdateResult {
    /** Обновлённый груз или null если обновление невозможно */
    placement: Placement | null
    /** true если груз был перемещён на другую позицию */
    relocated: boolean
}

/**
 * Интерфейс для доступа к размещениям (read-only)
 */
export interface PlacementProvider {
    getPlacements(): readonly Placement[]
    getPlacementById(id: string): Placement | null
}

/**
 * Интерфейс для доступа к HeightMap
 * Позволяет не пересоздавать validator/positionFinder при rebuild
 */
export interface HeightMapProvider {
    getHeightMap(): {
        getCells(x: number, y: number, w: number, l: number): Cell[]
        getBaseHeight(cells: Cell[]): number | null
        hasPlacementAbove(placement: Placement): boolean
    }
}


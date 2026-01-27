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


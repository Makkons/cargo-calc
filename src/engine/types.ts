export type Container = {
    width: number
    length: number
    height: number
}

export type Cell = {
    height: number
    topPlacementId: string | null
}

export type Placement = {
    id: string
    templateId: string
    x: number
    y: number
    z: number
    width: number
    length: number
    height: number
    fragile?: boolean
    locked?: boolean
}

export type ItemTemplate = {
    id: string
    width: number
    length: number
    height: number
    fragile?: boolean
}

export type EngineState = {
    placements: Placement[]
}
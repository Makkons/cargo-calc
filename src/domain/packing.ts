export interface Size {
    width: number
    length: number
    height: number
}

export interface Position2D {
    x: number
    y: number
}

export interface Position3D extends Position2D {
    z: number
}

export interface PackingItem {
    id: string
    templateId?: string
    name: string
    size: Size
    weight?: number
    color: string

    fragile: boolean
    fixed: boolean
}

export interface PlacementEdit {
    width: number
    length: number
    height: number
    fragile: boolean
}
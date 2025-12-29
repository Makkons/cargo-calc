/* =========================
   БАЗОВЫЕ ТИПЫ
========================= */

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

/* =========================
   ШАБЛОН ГРУЗА
========================= */

export interface CargoTemplate {
    id: string
    name: string
    size: Size
    weight?: number
    color: string
}

/* =========================
   ГРУЗ (СУЩНОСТЬ)
   ❗ не знает где он лежит
========================= */

export interface PackingItem {
    id: string
    templateId?: string        // если создан из шаблона
    name: string
    size: Size
    weight?: number
    color: string

    fragile: boolean           // нельзя класть сверху
    fixed: boolean             // нельзя двигать при оптимизации
}

/* =========================
   РАЗМЕЩЁННЫЙ ГРУЗ
   (факт положения)
========================= */

export interface PlacedItem {
    itemId: string             // ссылка на PackingItem.id

    layerId: string            // в каком слое лежит
    position: Position3D

    rotated: boolean           // повернут ли (90°)
}

/* =========================
   СЛОЙ
========================= */

export interface PackingLayer {
    id: string                 // uuid
    index: number              // 0,1,2…
    baseHeight: number         // z-основание слоя

    availableArea: {
        x: number
        y: number
        width: number
        length: number
    }[]

    placedItems: PlacedItem[]
}

/* =========================
   АКТИВНАЯ КОМПОНОВКА
   ❗ источник истины
========================= */

export interface PackingState {
    items: PackingItem[]           // все грузы
    layers: PackingLayer[]         // все слои
}

/* =========================
   РЕЗУЛЬТАТ ОПТИМИЗАЦИИ
   (производный)
========================= */

export interface PackingResult {
    layers: PackingLayer[]
    totalHeight: number
    filledVolume: number
    filledWeight?: number
}

/* =========================
   КОНТЕЙНЕР / МАШИНА
========================= */

export interface ContainerTemplate {
    id: string
    name: string
    container: Size
    maxWeight?: number
}

/* =========================
   ИСТОРИЯ
========================= */

export interface PackingHistoryEntry {
    id: string
    name: string

    createdAt: number
    loadingDate?: number
    comment?: string

    container: ContainerTemplate
    state: PackingState
}




//// NEEEEEEWW ?????????

export type Container = {
    width: number
    length: number
    height: number
}

export type ItemTemplate = {
    id: string
    width: number
    length: number
    height: number
    fragile?: boolean
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

export type EngineState = {
    container: Container
    placements: Placement[]
    heightMap: HeightMapSnapshot
}

export type PackingMode = 'uniform' | 'dense'

export type FindPlacementOptions = {
    mode: PackingMode
    allowRotate?: boolean
    step?: number
}
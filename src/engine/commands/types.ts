import type { ItemTemplate } from '../types'

export type AddItemCommand = {
    type: 'addItem'
    template: ItemTemplate
    mode: 'uniform' | 'dense'
    /** Размещать только на полу (z = 0) */
    floorOnly?: boolean
}

export type RemovePlacementCommand = {
    type: 'removePlacement'
    placementId: string
}

export type MovePlacementCommand = {
    type: 'movePlacement'
    placementId: string
    x: number
    y: number
}

export type UndoCommand = {
    type: 'undo'
}

export type RedoCommand = {
    type: 'redo'
}

export type PackingCommand =
    | AddItemCommand
    | RemovePlacementCommand
    | MovePlacementCommand
    | UndoCommand
    | RedoCommand
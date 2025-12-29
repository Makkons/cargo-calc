import type { ItemTemplate } from '../types'

export type AddItemCommand = {
    type: 'addItem'
    template: ItemTemplate
    mode: 'uniform' | 'dense'
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
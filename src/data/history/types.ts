// src/data/history/types.ts
import type { Placement, Container } from '@/engine/types'
import type { PackingMode } from '@/domain/packing/usePacking'

export type PackingHistoryItem = {
    id: string

    // метаданные
    title: string
    comment?: string
    shippingDate?: string // ISO
    savedAt: string       // ISO

    // состояние
    container: Container
    placements: Placement[]
    mode: PackingMode
}

export const PACKING_HISTORY_KEY = 'packing-history'
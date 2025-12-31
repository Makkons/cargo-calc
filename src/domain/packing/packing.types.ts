import type { Placement } from '@/engine/types'
import type { CargoTemplate } from '@/data/templates/types'

/**
 * Режим автокомпоновки
 */
export type PackingMode = 'uniform' | 'dense'

/**
 * Элемент списка компоновки (для UI)
 * Placement + шаблон
 */
export interface PackingListItem {
    placement: Placement
    template: CargoTemplate
}

/**
 * Статистика заполнения контейнера
 */
export interface PackingStats {
    usedVolume: number
    totalVolume: number

    usedWeight?: number
    maxWeight?: number

    heightUsed: number
    heightTotal: number
}
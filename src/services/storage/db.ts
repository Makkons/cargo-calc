import Dexie, { type EntityTable } from 'dexie'
import type { CargoTemplate } from '@/data/templates/types'
import type { ContainerTemplate } from '@/data/containers/types'
import type { PackingHistoryItem } from '@/data/history/types'

/**
 * Dexie база данных для приложения.
 *
 * Схема версионируется — при изменении структуры увеличиваем версию
 * и добавляем миграцию.
 */
class CargoCalcDB extends Dexie {
    cargoTemplates!: EntityTable<CargoTemplate, 'id'>
    containerTemplates!: EntityTable<ContainerTemplate, 'id'>
    packingHistory!: EntityTable<PackingHistoryItem, 'id'>

    constructor() {
        super('CargoCalcDB')

        // Версия 1: начальная схема
        // Указываем только индексируемые поля, остальные хранятся автоматически
        this.version(1).stores({
            cargoTemplates: 'id, name',
            containerTemplates: 'id, name',
            packingHistory: 'id, savedAt, shippingDate',
        })
    }
}

export const db = new CargoCalcDB()
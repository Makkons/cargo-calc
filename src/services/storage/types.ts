import type { CargoTemplate } from '@/data/templates/types'
import type { ContainerTemplate } from '@/data/containers/types'
import type { PackingHistoryItem } from '@/data/history/types'

/**
 * Названия хранилищ (таблиц)
 */
export type StoreName = 'cargoTemplates' | 'containerTemplates' | 'packingHistory'

/**
 * Маппинг названий хранилищ на типы данных
 */
export interface StoreTypeMap {
    cargoTemplates: CargoTemplate
    containerTemplates: ContainerTemplate
    packingHistory: PackingHistoryItem
}

/**
 * Абстрактный интерфейс хранилища.
 * Позволяет легко заменить реализацию (IndexedDB → Tauri Store, SQLite и т.д.)
 */
export interface IStorageService {
    /**
     * Получить все записи из хранилища
     */
    getAll<K extends StoreName>(store: K): Promise<StoreTypeMap[K][]>

    /**
     * Получить запись по ID
     */
    getById<K extends StoreName>(store: K, id: string): Promise<StoreTypeMap[K] | undefined>

    /**
     * Добавить или обновить запись
     */
    put<K extends StoreName>(store: K, item: StoreTypeMap[K]): Promise<void>

    /**
     * Добавить несколько записей (bulk)
     */
    putMany<K extends StoreName>(store: K, items: StoreTypeMap[K][]): Promise<void>

    /**
     * Удалить запись по ID
     */
    delete<K extends StoreName>(store: K, id: string): Promise<void>

    /**
     * Очистить хранилище
     */
    clear<K extends StoreName>(store: K): Promise<void>

    /**
     * Проверить, пустое ли хранилище
     */
    isEmpty<K extends StoreName>(store: K): Promise<boolean>
}
import { db } from './db'
import type { IStorageService, StoreName, StoreTypeMap } from './types'

/**
 * Реализация хранилища через IndexedDB (Dexie).
 *
 * Для миграции на Tauri:
 * 1. Создать TauriStorageService implements IStorageService
 * 2. Заменить экспорт в index.ts
 */
class IndexedDBStorageService implements IStorageService {
    async getAll<K extends StoreName>(store: K): Promise<StoreTypeMap[K][]> {
        return db[store].toArray() as Promise<StoreTypeMap[K][]>
    }

    async getById<K extends StoreName>(
        store: K,
        id: string
    ): Promise<StoreTypeMap[K] | undefined> {
        return db[store].get(id) as Promise<StoreTypeMap[K] | undefined>
    }

    async put<K extends StoreName>(store: K, item: StoreTypeMap[K]): Promise<void> {
        await db[store].put(item as never)
    }

    async putMany<K extends StoreName>(store: K, items: StoreTypeMap[K][]): Promise<void> {
        await db[store].bulkPut(items as never[])
    }

    async delete<K extends StoreName>(store: K, id: string): Promise<void> {
        await db[store].delete(id)
    }

    async clear<K extends StoreName>(store: K): Promise<void> {
        await db[store].clear()
    }

    async isEmpty<K extends StoreName>(store: K): Promise<boolean> {
        const count = await db[store].count()
        return count === 0
    }
}

export const storageService: IStorageService = new IndexedDBStorageService()
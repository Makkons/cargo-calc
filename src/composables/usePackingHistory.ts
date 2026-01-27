import { ref, readonly } from 'vue'
import { storageService } from '@/services/storage'
import type { PackingHistoryItem } from '@/data/history/types'

/**
 * Composable для работы с историей компоновок.
 * Централизует всю логику CRUD и синхронизацию с IndexedDB.
 */

const items = ref<PackingHistoryItem[]>([])
const isLoading = ref(false)
const isLoaded = ref(false)

export function usePackingHistory() {
    async function load(): Promise<void> {
        if (isLoaded.value) return

        isLoading.value = true
        try {
            const all = await storageService.getAll('packingHistory')
            // Сортируем по дате сохранения (новые первые)
            items.value = all.sort((a, b) =>
                new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
            )
            isLoaded.value = true
        } finally {
            isLoading.value = false
        }
    }

    async function reload(): Promise<void> {
        isLoaded.value = false
        await load()
    }

    async function save(item: PackingHistoryItem): Promise<void> {
        await storageService.put('packingHistory', item)
        // Добавляем в начало списка
        items.value.unshift(item)
    }

    async function remove(id: string): Promise<void> {
        items.value = items.value.filter(h => h.id !== id)
        await storageService.delete('packingHistory', id)
    }

    async function clear(): Promise<void> {
        items.value = []
        await storageService.clear('packingHistory')
    }

    return {
        items: readonly(items),
        isLoading: readonly(isLoading),
        isLoaded: readonly(isLoaded),
        load,
        reload,
        save,
        remove,
        clear,
    }
}
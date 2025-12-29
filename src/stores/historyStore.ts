import { defineStore } from 'pinia'
import type { PackingHistoryEntry } from '@/types'
import { usePackingStore } from '@/stores/packingStore'
import { useContainerTemplatesStore } from '@/stores/containerTemplatesStore'
import { loadFromStorage, saveToStorage } from '@/utils/storage'

const STORAGE_KEY = 'packing-history'

export const useHistoryStore = defineStore('history', {
    state: () => ({
        entries: loadFromStorage(STORAGE_KEY, []) as PackingHistoryEntry[],
    }),

    actions: {
        saveCurrent(name: string) {
            const packingStore = usePackingStore()
            const containerStore = useContainerTemplatesStore()

            if (!containerStore.activeId) return

            const entry: PackingHistoryEntry = {
                id: String(Date.now()),
                name,
                date: Date.now(),
                containerId: containerStore.activeId,
                items: JSON.parse(JSON.stringify(packingStore.items)),
            }

            this.entries.unshift(entry)
            saveToStorage(STORAGE_KEY, this.entries)
        },

        loadEntry(id: string) {
            const entry = this.entries.find(e => e.id === id)
            if (!entry) return

            const packingStore = usePackingStore()
            const containerStore = useContainerTemplatesStore()

            containerStore.selectContainer(entry.containerId)
            packingStore.updateItems(entry.items)
        },

        removeEntry(id: string) {
            this.entries = this.entries.filter(e => e.id !== id)
            saveToStorage(STORAGE_KEY, this.entries)
        },
    },
})
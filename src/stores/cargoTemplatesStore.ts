import { defineStore } from 'pinia'
import type { CargoTemplate, PackingItem } from '@/types'
import { usePackingStore } from '@/stores/packingStore'
import { loadFromStorage, saveToStorage } from '@/utils/storage'

const STORAGE_KEY = 'cargo-templates'

export const useCargoTemplatesStore = defineStore('cargo-templates', {
    state: () => ({
        templates: loadFromStorage(STORAGE_KEY, []) as CargoTemplate[],
    }),

    actions: {
        /* ============================
           CRUD ШАБЛОНОВ
        ============================ */

        addTemplate(template: CargoTemplate) {
            this.templates.push(template)
            saveToStorage(STORAGE_KEY, this.templates)
        },

        updateTemplate(updated: CargoTemplate) {
            const index = this.templates.findIndex(t => t.id === updated.id)
            if (index !== -1) {
                this.templates[index] = updated
                saveToStorage(STORAGE_KEY, this.templates)
            }
        },

        removeTemplate(id: string) {
            this.templates = this.templates.filter(t => t.id !== id)
            saveToStorage(STORAGE_KEY, this.templates)
        },

        /* ============================
           ДОБАВЛЕНИЕ В КОМПОНОВКУ
        ============================ */

        addToPacking(template: CargoTemplate) {
            const packingStore = usePackingStore()

            const item: PackingItem = {
                id: crypto.randomUUID(), // ⚠️ гарантированно уникально
                name: template.name,
                size: {
                    width: template.size.width,
                    length: template.size.length,
                    height: template.size.height,
                },
                weight: template.weight,
                color: template.color || '#9e9e9e',
                fragile: Boolean(template.fragile),
                fixed: false,
            }

            packingStore.addItem(item)
        },
    },
})
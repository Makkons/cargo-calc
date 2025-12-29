import { defineStore } from 'pinia'
import type { ContainerTemplate } from '@/types'
import { usePackingStore } from '@/stores/packingStore'
import { loadFromStorage, saveToStorage } from '@/utils/storage'

const STORAGE_KEY = 'container-templates'
const ACTIVE_KEY = 'container-active-id'

export const useContainerTemplatesStore = defineStore('container-templates', {
    state: () => ({
        templates: loadFromStorage(STORAGE_KEY, []) as ContainerTemplate[],
        activeId: loadFromStorage<string | null>(ACTIVE_KEY, null),
    }),

    getters: {
        activeContainer(state): ContainerTemplate | null {
            return state.templates.find(t => t.id === state.activeId) || null
        },
    },

    actions: {
        addTemplate(template: ContainerTemplate) {
            this.templates.push(template)
            saveToStorage(STORAGE_KEY, this.templates)

            if (!this.activeId) {
                this.selectContainer(template.id)
            }
        },

        updateTemplate(updated: ContainerTemplate) {
            const index = this.templates.findIndex(t => t.id === updated.id)
            if (index !== -1) {
                this.templates[index] = updated
                saveToStorage(STORAGE_KEY, this.templates)

                if (this.activeId === updated.id) {
                    this.applyToPacking(updated)
                }
            }
        },

        removeTemplate(id: string) {
            this.templates = this.templates.filter(t => t.id !== id)
            saveToStorage(STORAGE_KEY, this.templates)

            if (this.activeId === id) {
                this.activeId = this.templates[0]?.id ?? null
                saveToStorage(ACTIVE_KEY, this.activeId)

                if (this.activeId) {
                    this.applyToPacking(
                        this.templates.find(t => t.id === this.activeId)!
                    )
                }
            }
        },

        selectContainer(id: string) {
            this.activeId = id
            saveToStorage(ACTIVE_KEY, id)

            const container = this.templates.find(t => t.id === id)
            if (container) {
                this.applyToPacking(container)
            }
        },

        applyToPacking(container: ContainerTemplate) {
            const packingStore = usePackingStore()
            packingStore.container = { ...container.container }
            packingStore.recalculate()
        },
    },
})
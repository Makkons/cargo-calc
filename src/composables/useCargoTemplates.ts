import { ref, readonly } from 'vue'
import { storageService } from '@/services/storage'
import type { CargoTemplate } from '@/data/templates/types'

/**
 * Composable для работы с шаблонами грузов.
 * Централизует всю логику CRUD и синхронизацию с IndexedDB.
 */

const templates = ref<CargoTemplate[]>([])
const isLoading = ref(false)
const isLoaded = ref(false)

export function useCargoTemplates() {
    async function load(): Promise<void> {
        if (isLoaded.value) return

        isLoading.value = true
        try {
            templates.value = await storageService.getAll('cargoTemplates')
            isLoaded.value = true
        } finally {
            isLoading.value = false
        }
    }

    async function create(template: Omit<CargoTemplate, 'id'>): Promise<CargoTemplate> {
        const newTemplate: CargoTemplate = {
            ...template,
            id: crypto.randomUUID(),
        }

        templates.value.push(newTemplate)
        await storageService.put('cargoTemplates', newTemplate)

        return newTemplate
    }

    async function update(template: CargoTemplate): Promise<void> {
        const index = templates.value.findIndex(t => t.id === template.id)
        if (index !== -1) {
            templates.value[index] = { ...template }
            await storageService.put('cargoTemplates', template)
        }
    }

    async function remove(id: string): Promise<void> {
        templates.value = templates.value.filter(t => t.id !== id)
        await storageService.delete('cargoTemplates', id)
    }

    async function rotate(id: string): Promise<void> {
        const template = templates.value.find(t => t.id === id)
        if (template) {
            const rotated = {
                ...template,
                width: template.length,
                length: template.width,
            }
            await update(rotated)
        }
    }

    return {
        templates: readonly(templates),
        isLoading: readonly(isLoading),
        isLoaded: readonly(isLoaded),
        load,
        create,
        update,
        remove,
        rotate,
    }
}
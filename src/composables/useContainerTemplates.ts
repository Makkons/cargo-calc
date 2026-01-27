import { ref, readonly, computed } from 'vue'
import { storageService } from '@/services/storage'
import type { ContainerTemplate } from '@/data/containers/types'

/**
 * Composable для работы с шаблонами контейнеров (машин).
 * Централизует всю логику CRUD и синхронизацию с IndexedDB.
 */

const templates = ref<ContainerTemplate[]>([])
const activeId = ref<string | null>(null)
const isLoading = ref(false)
const isLoaded = ref(false)

export function useContainerTemplates() {
    const active = computed(() =>
        templates.value.find(c => c.id === activeId.value) ?? null
    )

    async function load(): Promise<void> {
        if (isLoaded.value) return

        isLoading.value = true
        try {
            templates.value = await storageService.getAll('containerTemplates')
            // Автоматически выбираем первый контейнер
            if (templates.value.length > 0 && !activeId.value) {
                activeId.value = templates.value[0].id
            }
            isLoaded.value = true
        } finally {
            isLoading.value = false
        }
    }

    function select(id: string): void {
        if (templates.value.some(c => c.id === id)) {
            activeId.value = id
        }
    }

    async function create(template: ContainerTemplate): Promise<void> {
        const clone = structuredClone(template)
        templates.value.push(clone)
        await storageService.put('containerTemplates', clone)

        // Если это первый контейнер — выбираем его
        if (!activeId.value) {
            activeId.value = clone.id
        }
    }

    async function update(template: ContainerTemplate): Promise<void> {
        const index = templates.value.findIndex(c => c.id === template.id)
        if (index !== -1) {
            templates.value[index] = structuredClone(template)
            await storageService.put('containerTemplates', template)
        }
    }

    async function remove(id: string): Promise<void> {
        templates.value = templates.value.filter(c => c.id !== id)
        await storageService.delete('containerTemplates', id)

        // Если удалили активный — выбираем следующий
        if (activeId.value === id) {
            activeId.value = templates.value[0]?.id ?? null
        }
    }

    return {
        templates: readonly(templates),
        activeId: readonly(activeId),
        active,
        isLoading: readonly(isLoading),
        isLoaded: readonly(isLoaded),
        load,
        select,
        create,
        update,
        remove,
    }
}
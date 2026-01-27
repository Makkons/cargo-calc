import { watch } from 'vue'
import { useContainerTemplates } from './useContainerTemplates'
import type { ContainerTemplate } from '@/data/containers/types'
import type { Container } from '@/engine/types'

export interface ContainerManagerCallbacks {
    /** Вызывается при смене активного контейнера */
    onContainerChange: (container: Container) => void
}

/**
 * Composable для управления контейнерами
 *
 * Расширяет useContainerTemplates:
 * - Автоматическая синхронизация с packing при смене контейнера
 * - CRUD операции с уведомлениями
 * - Инициализация при загрузке
 */
export function useContainerManager(callbacks: ContainerManagerCallbacks) {
    const store = useContainerTemplates()

    // Автоматически обновляем packing при смене контейнера
    watch(() => store.active.value, (next) => {
        if (next) {
            callbacks.onContainerChange(next.container)
        }
    })

    /**
     * Выбирает контейнер и обновляет packing
     */
    function select(id: string): boolean {
        const template = store.templates.value.find(c => c.id === id)
        if (!template) return false

        store.select(id)
        callbacks.onContainerChange(template.container)
        return true
    }

    /**
     * Создаёт контейнер и выбирает его, если нет активного
     */
    async function create(template: ContainerTemplate): Promise<void> {
        await store.create(template)

        if (!store.activeId.value) {
            select(template.id)
        }
    }

    /**
     * Обновляет контейнер и синхронизирует packing, если это активный
     */
    async function update(template: ContainerTemplate): Promise<void> {
        await store.update(template)

        if (template.id === store.activeId.value) {
            callbacks.onContainerChange(template.container)
        }
    }

    /**
     * Удаляет контейнер и переключается на другой, если удалён активный
     */
    async function remove(id: string): Promise<void> {
        const wasActive = store.activeId.value === id
        await store.remove(id)

        if (wasActive && store.active.value) {
            callbacks.onContainerChange(store.active.value.container)
        }
    }

    /**
     * Загружает контейнеры и инициализирует packing
     */
    async function init(): Promise<void> {
        await store.load()

        if (store.active.value) {
            callbacks.onContainerChange(store.active.value.container)
        }
    }

    return {
        // State (проксируем из store)
        templates: store.templates,
        activeId: store.activeId,
        active: store.active,

        // Actions
        select,
        create,
        update,
        remove,
        init,
    }
}

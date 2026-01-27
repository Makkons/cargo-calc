import { ref, toRaw } from 'vue'
import type { PackingHistoryItem } from '@/data/history/types'
import type { Container, Placement, PlacementMode } from '@/engine/types'

export interface PackingSessionMeta {
    title: string
    comment?: string
    shippingDate?: string
}

export interface PackingSessionState {
    /** ID текущей сессии из истории (null если новая) */
    activeId: string | null
    title: string
    comment?: string
    shippingDate?: string
}

export interface SavePackingParams {
    meta: PackingSessionMeta
    container: Container
    placements: readonly Placement[]
    mode: PlacementMode
}

/**
 * Composable для управления текущей сессией погрузки
 *
 * Отвечает за:
 * - Метаданные сессии (title, comment, shippingDate)
 * - Связь с историей (activeId)
 * - Сохранение и загрузка сессий
 */
export function usePackingSession() {
    const activeId = ref<string | null>(null)
    const title = ref('Погрузка')
    const comment = ref<string | undefined>(undefined)
    const shippingDate = ref<string | undefined>(undefined)

    /**
     * Создаёт объект для сохранения в историю
     */
    function createHistoryItem(params: SavePackingParams): PackingHistoryItem {
        // Преобразуем реактивные данные в обычные объекты
        const rawPlacements = toRaw(params.placements).map(p => ({ ...toRaw(p) }))
        const rawContainer = { ...toRaw(params.container) }

        return {
            id: crypto.randomUUID(),
            title: params.meta.title,
            comment: params.meta.comment,
            shippingDate: params.meta.shippingDate,
            savedAt: new Date().toISOString(),
            container: rawContainer,
            placements: rawPlacements,
            mode: params.mode,
        }
    }

    /**
     * Обновляет метаданные сессии после сохранения
     */
    function updateFromSaved(item: PackingHistoryItem): void {
        activeId.value = item.id
        title.value = item.title
        comment.value = item.comment
        shippingDate.value = item.shippingDate
    }

    /**
     * Загружает метаданные из элемента истории
     */
    function loadFrom(item: PackingHistoryItem): void {
        activeId.value = item.id
        title.value = item.title
        comment.value = item.comment
        shippingDate.value = item.shippingDate
    }

    /**
     * Сбрасывает сессию (для новой погрузки)
     */
    function reset(): void {
        activeId.value = null
        title.value = 'Погрузка'
        comment.value = undefined
        shippingDate.value = undefined
    }

    /**
     * Отвязывает от истории (если удалили запись)
     */
    function detachIfMatches(id: string): boolean {
        if (activeId.value === id) {
            activeId.value = null
            return true
        }
        return false
    }

    /**
     * Получить текущие метаданные
     */
    function getMeta(): PackingSessionMeta {
        return {
            title: title.value,
            comment: comment.value,
            shippingDate: shippingDate.value,
        }
    }

    return {
        // State
        activeId,
        title,
        comment,
        shippingDate,

        // Actions
        createHistoryItem,
        updateFromSaved,
        loadFrom,
        reset,
        detachIfMatches,
        getMeta,
    }
}

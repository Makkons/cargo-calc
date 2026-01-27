import { ref, readonly } from 'vue'

/**
 * Глобальное состояние для подсветки груза при hover.
 * Используется для синхронизации PackingList ↔ PackingScene2D
 */

const highlightedId = ref<string | null>(null)

export function useHighlightedPlacement() {
    function setHighlighted(id: string | null) {
        highlightedId.value = id
    }

    return {
        highlightedId: readonly(highlightedId),
        setHighlighted,
    }
}
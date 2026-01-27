import { computed, type Ref } from 'vue'
import type { Container, Placement } from '@/engine/types'

export interface PackingStats {
    /** Использованный объём (см³) */
    usedVolume: Ref<number>
    /** Заполнение по объёму (0-1) */
    volumeFill: Ref<number>
    /** Использованная площадь пола (см²) */
    usedFloorArea: Ref<number>
    /** Заполнение по площади (0-1) */
    floorFill: Ref<number>
    /** Общий вес грузов (кг) */
    usedWeight: Ref<number>
}

/**
 * Composable для вычисления статистики размещений
 *
 * Отвечает за:
 * - Подсчёт использованного объёма
 * - Подсчёт использованной площади
 * - Вычисление процента заполнения
 * - Подсчёт общего веса
 */
export function usePackingStats(
    container: Container,
    placements: Ref<readonly Placement[]>
): PackingStats {
    const containerVolume = container.width * container.length * container.height
    const containerFloorArea = container.width * container.length

    const usedVolume = computed(() =>
        placements.value.reduce(
            (sum, p) => sum + p.width * p.length * p.height,
            0
        )
    )

    const usedFloorArea = computed(() =>
        placements.value.reduce(
            (sum, p) => sum + p.width * p.length,
            0
        )
    )

    const volumeFill = computed(() => {
        if (containerVolume === 0) return 0
        return Math.min(usedVolume.value / containerVolume, 1)
    })

    const floorFill = computed(() => {
        if (containerFloorArea === 0) return 0
        return Math.min(usedFloorArea.value / containerFloorArea, 1)
    })

    const usedWeight = computed(() =>
        placements.value.reduce(
            (sum, p) => sum + (typeof p.weight === 'number' ? p.weight : 0),
            0
        )
    )

    return {
        usedVolume,
        volumeFill,
        usedFloorArea,
        floorFill,
        usedWeight,
    }
}

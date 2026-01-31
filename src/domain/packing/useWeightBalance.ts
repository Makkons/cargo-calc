import { computed, ref, watch, type Ref } from 'vue'
import type { Container, Placement } from '@/engine/types'

/** Статус баланса */
export type BalanceStatus = 'safe' | 'warning' | 'danger'

/** Направление для будущего расширения */
export type BalanceAxis = 'lateral' | 'longitudinal'

/** Пороги для определения статуса (в долях от 0 до 1) */
export interface BalanceThresholds {
    warning: number  // 0.10 = 10%
    danger: number   // 0.25 = 25%
}

const DEFAULT_THRESHOLDS: BalanceThresholds = {
    warning: 0.10,
    danger: 0.25,
}

export interface WeightBalanceResult {
    /** Центр тяжести (мм от левого борта) */
    centerOfGravity: Ref<number>
    /** Отклонение от центра (-1 до 1, где 0 = идеальный баланс) */
    deviation: Ref<number>
    /** Уровень опасности */
    status: Ref<BalanceStatus>
    /** Есть ли грузы с указанным весом */
    hasWeightedItems: Ref<boolean>
    /** Общий вес грузов */
    totalWeight: Ref<number>
    /** Флаг: было ли показано предупреждение о критическом состоянии */
    dangerAlertShown: Ref<boolean>
    /** Сбросить флаг предупреждения */
    resetDangerAlert: () => void
}

/**
 * Composable для расчёта баланса веса
 *
 * Спроектирован с возможностью расширения для продольного баланса.
 * Сейчас реализован только латеральный (лево-право).
 *
 * @param container - контейнер с размерами
 * @param placements - список размещённых грузов
 * @param axis - ось баланса (пока только 'lateral')
 * @param thresholds - пороги для статусов
 */
export function useWeightBalance(
    container: Container,
    placements: Ref<readonly Placement[]>,
    axis: BalanceAxis = 'lateral',
    thresholds: BalanceThresholds = DEFAULT_THRESHOLDS
): WeightBalanceResult {

    // Флаг для toast-уведомления (показываем только 1 раз)
    const dangerAlertShown = ref(false)

    /**
     * Размер контейнера по выбранной оси
     * lateral = width (лево-право)
     * longitudinal = length (перед-зад)
     */
    const containerSize = computed(() => {
        return axis === 'lateral' ? container.width : container.length
    })

    /** Центр контейнера по оси */
    const containerCenter = computed(() => containerSize.value / 2)

    /** Фильтруем только грузы с указанным весом */
    const weightedPlacements = computed(() =>
        placements.value.filter(p => typeof p.weight === 'number' && p.weight > 0)
    )

    const hasWeightedItems = computed(() => weightedPlacements.value.length > 0)

    const totalWeight = computed(() =>
        weightedPlacements.value.reduce((sum, p) => sum + (p.weight ?? 0), 0)
    )

    /**
     * Центр тяжести по выбранной оси
     *
     * Формула: CG = Σ(weight × center) / Σ(weight)
     * где center = позиция + размер/2
     */
    const centerOfGravity = computed(() => {
        if (!hasWeightedItems.value || totalWeight.value === 0) {
            return containerCenter.value // По умолчанию — центр
        }

        const totalMoment = weightedPlacements.value.reduce((sum, p) => {
            const position = axis === 'lateral' ? p.x : p.y
            const size = axis === 'lateral' ? p.width : p.length
            const center = position + size / 2
            return sum + (p.weight ?? 0) * center
        }, 0)

        return totalMoment / totalWeight.value
    })

    /**
     * Отклонение от центра в диапазоне [-1, 1]
     *
     * -1 = полностью влево (или назад для longitudinal)
     * +1 = полностью вправо (или вперёд для longitudinal)
     *  0 = идеальный баланс
     */
    const deviation = computed(() => {
        if (!hasWeightedItems.value) return 0

        const offset = centerOfGravity.value - containerCenter.value
        const maxOffset = containerCenter.value

        if (maxOffset === 0) return 0

        // Нормализуем и ограничиваем диапазоном [-1, 1]
        return Math.max(-1, Math.min(1, offset / maxOffset))
    })

    /** Статус баланса на основе порогов */
    const status = computed<BalanceStatus>(() => {
        const absDeviation = Math.abs(deviation.value)

        if (absDeviation >= thresholds.danger) return 'danger'
        if (absDeviation >= thresholds.warning) return 'warning'
        return 'safe'
    })

    // Автоматический сброс флага при выходе из критического состояния
    watch(status, (newStatus, oldStatus) => {
        if (oldStatus === 'danger' && newStatus !== 'danger') {
            dangerAlertShown.value = false
        }
    })

    function resetDangerAlert() {
        dangerAlertShown.value = false
    }

    return {
        centerOfGravity,
        deviation,
        status,
        hasWeightedItems,
        totalWeight,
        dangerAlertShown,
        resetDangerAlert,
    }
}

import { shallowRef, ref } from 'vue'
import { PackingEngine } from '@/engine/PackingEngine'
import { PackingCommandExecutor } from '@/engine/commands/PackingCommandExecutor'
import type { Container, Placement, PlacementMode } from '@/engine/types'
import { usePackingStats } from './usePackingStats'
import { usePackingOperations } from './usePackingOperations'

/** @deprecated Use PlacementMode from engine/types */
export type PackingMode = PlacementMode

export interface UsePackingOptions {
    step?: number
    /** Размещать только на полу (для default режима) */
    floorOnly?: boolean
}

/**
 * Главный composable для работы с размещением грузов
 *
 * Координирует:
 * - PackingEngine (алгоритмы)
 * - PackingCommandExecutor (команды)
 * - usePackingStats (статистика)
 * - usePackingOperations (операции)
 */
export function usePacking(
    container: Container,
    options: UsePackingOptions | number = {}
) {
    // Обратная совместимость: если передано число — это step
    const opts = typeof options === 'number'
        ? { step: options, floorOnly: false }
        : options

    const step = opts.step ?? 50

    /* =========================
       ENGINE
    ========================= */

    const engine = shallowRef<PackingEngine>(new PackingEngine(container, step))
    const executor = shallowRef<PackingCommandExecutor>(
        new PackingCommandExecutor(engine.value)
    )

    /* =========================
       STATE
    ========================= */

    const mode = ref<PlacementMode>('uniform')
    const floorOnly = ref(opts.floorOnly ?? false)
    const placements = ref<readonly Placement[]>([])

    /* =========================
       SYNC
    ========================= */

    function sync() {
        placements.value = engine.value.getPlacements().map(p => ({ ...p }))
    }

    function resetEngine() {
        engine.value = new PackingEngine(container, step)
        executor.value = new PackingCommandExecutor(engine.value)
    }

    function resetContainer(newContainer: Container) {
        engine.value = new PackingEngine(newContainer, step)
        executor.value = new PackingCommandExecutor(engine.value)
        sync()
    }

    /* =========================
       COMPOSE
    ========================= */

    const stats = usePackingStats(container, placements)

    const operations = usePackingOperations({
        engine,
        executor,
        container,
        step,
        mode,
        floorOnly,
        sync,
        resetEngine,
    })

    /* =========================
       MODE SETTERS
    ========================= */

    function setMode(next: PlacementMode) {
        mode.value = next
    }

    function setFloorOnly(value: boolean) {
        floorOnly.value = value
    }

    /* =========================
       INIT
    ========================= */

    sync()

    /* =========================
       RETURN
    ========================= */

    return {
        // state
        placements,
        mode,
        floorOnly,

        // stats (from usePackingStats)
        usedVolume: stats.usedVolume,
        volumeFill: stats.volumeFill,
        usedFloorArea: stats.usedFloorArea,
        floorFill: stats.floorFill,
        usedWeight: stats.usedWeight,

        // operations (from usePackingOperations)
        addFromTemplate: operations.addFromTemplate,
        addFromTemplateAt: operations.addFromTemplateAt,
        addCustomItem: operations.addCustomItem,
        removePlacement: operations.removePlacement,
        editPlacement: operations.editPlacement,
        movePlacement: operations.movePlacement,
        rotatePlacement: operations.rotatePlacement,
        optimize: operations.optimize,
        canModify: operations.canModify,

        // settings
        setMode,
        setFloorOnly,
        resetContainer,

        // meta
        step,
    }
}

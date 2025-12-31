import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'

import { PackingEngine } from '@/engine/PackingEngine'
import { PackingCommandExecutor } from '@/engine/commands/PackingCommandExecutor'
import type { PackingCommand } from '@/engine/commands/types'
import type { Container } from '@/engine/types'

export const usePackingStore = defineStore('packing', () => {

    // 1. Инициализация ядра (ОДИН раз)
    const container: Container = {
        width: 600,
        length: 400,
        height: 300
    }

    const engine = new PackingEngine(container, 10)
    const executor = new PackingCommandExecutor(engine)

    // 2. Реактивный state (только чтение)
    const state = reactive({
        placements: engine.getPlacements(),
        lastError: null as string | null
    })

    // 3. Синхронизация после каждой команды
    function sync() {
        state.placements = engine.getPlacements()
    }

    // 4. Dispatch — ЕДИНСТВЕННЫЙ вход в ядро
    function dispatch(cmd: PackingCommand) {
        const res = executor.execute(cmd)

        if (!res.ok) {
            state.lastError = res.reason
            return false
        }

        state.lastError = null
        sync()
        return true
    }

    // 5. Готовые actions для UI
    function addItem(template, mode: 'uniform' | 'dense') {
        return dispatch({
            type: 'addItem',
            template,
            mode
        })
    }

    function removePlacement(id: string) {
        return dispatch({
            type: 'removePlacement',
            placementId: id
        })
    }

    function movePlacement(id: string, x: number, y: number) {
        return dispatch({
            type: 'movePlacement',
            placementId: id,
            x,
            y
        })
    }

    function undo() {
        return dispatch({ type: 'undo' })
    }

    function redo() {
        return dispatch({ type: 'redo' })
    }

    // 6. Computed для UI
    const canUndo = computed(() => engine.canUndo())
    const canRedo = computed(() => engine.canRedo())

    return {
        placements: computed(() => state.placements),
        lastError: computed(() => state.lastError),

        addItem,
        removePlacement,
        movePlacement,
        undo,
        redo,
        canUndo,
        canRedo
    }
})
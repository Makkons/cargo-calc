import { shallowRef, ref, computed } from 'vue'
import { PackingEngine } from '@/engine/PackingEngine'
import { PackingCommandExecutor } from '@/engine/commands/PackingCommandExecutor'
import type { Container, Placement, PlacementEdit, PackingInputItem } from '@/engine/types'
import type { CargoTemplate } from '@/data/templates/types'

export type PackingMode = 'uniform' | 'dense'

export function usePacking(container: Container, step = 50) {
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

    const mode = ref<PackingMode>('uniform')
    const placements = ref<readonly Placement[]>([])

    const containerVolume =
        container.width * container.length * container.height

    const usedVolume = computed(() =>
        placements.value.reduce(
            (sum, p) => sum + p.width * p.length * p.height,
            0
        )
    )

    const volumeFill = computed(() => {
        const v = containerVolume === 0 ? 0 : Math.min(usedVolume.value / containerVolume, 1)
        return v
    })

    const usedWeight = computed(() => {
        return placements.value.reduce((sum, p) => {
            return sum + (typeof p.weight === 'number' ? p.weight : 0)
        }, 0)
    })

    /* =========================
       INTERNAL
    ========================= */

    function sync() {
        placements.value = engine.value.getPlacements().map(p => ({ ...p }))
    }

    function resetEngine() {
        engine.value = new PackingEngine(container, step)
        executor.value = new PackingCommandExecutor(engine.value)
        sync()
    }

    function resetContainer(container: Container) {
        engine.value = new PackingEngine(container, step)
        executor.value = new PackingCommandExecutor(engine.value)
        sync()
    }

    /* =========================
       COMMANDS
    ========================= */

    function addFromTemplate(template: CargoTemplate): boolean {
        const res = executor.value.execute({
            type: 'addItem',
            template: {
                id: crypto.randomUUID(),
                templateId: template.id,

                name: template.name,
                color: template.color,
                weight: typeof template.weight === 'number' ? template.weight : undefined,

                width: template.width,
                length: template.length,
                height: template.height,
                fragile: template.fragile,
            },
            mode: mode.value,
        })

        if (res.ok) sync()
        return res.ok
    }

    function addCustomItem(template: CargoTemplate): boolean {
        const res = executor.value.execute({
            type: 'addItem',
            template: {
                id: crypto.randomUUID(),
                // ❌ templateId отсутствует
                width: template.width,
                length: template.length,
                height: template.height,
                fragile: template.fragile,
                weight: template.weight,
                color: template.color,
                name: template.name,
            },
            mode: mode.value,
        })
        if (res.ok) sync()
        return res.ok
    }

    function removePlacement(id: string): boolean {
        const ok = executor.value.execute({
            type: 'removePlacement',
            placementId: id,
        }).ok

        if (ok) sync()
        return ok
    }

    function editPlacement(id: string, patch: Partial<Placement>): boolean {
        if (!canModify(id)) return false

        const old = engine.value.getPlacements().find(p => p.id === id)
        if (!old) return false

        executor.value.execute({
            type: 'removePlacement',
            placementId: id,
        })

        executor.value.execute({
            type: 'addItem',
            template: {
                id: crypto.randomUUID(),
                templateId: old.templateId,

                name: patch.name ?? old.name,
                color: patch.color ?? old.color,
                weight: patch.weight ?? old.weight,

                width: patch.width ?? old.width,
                length: patch.length ?? old.length,
                height: patch.height ?? old.height,
                fragile: patch.fragile ?? old.fragile,
            },
            mode: mode.value,
        })

        sync()
        return true
    }

    function optimize(): boolean {
        // 1. Сохраняем ЛОГИЧЕСКИЕ грузы (не placements)
        const items = engine.value.getPlacements().map(p => ({
            templateId: p.templateId!,
            width: p.width,
            length: p.length,
            height: p.height,
            fragile: p.fragile,
            weight: p.weight,
            color: p.color,
            name: p.name,
        }))

        // 2. Полностью пересоздаём engine и executor
        engine.value = new PackingEngine(container, step)
        executor.value = new PackingCommandExecutor(engine.value)

        // 3. Кладём грузы заново в текущем режиме
        for (const item of items) {
            const res = executor.value.execute({
                type: 'addItem',
                template: {
                    id: crypto.randomUUID(), // 🔥 новый placement
                    ...item,
                },
                mode: mode.value,
            })

            if (!res.ok) {
                console.warn('[optimize] item skipped:', item)
                // v1: просто пропускаем, позже можно улучшить
            }
        }

        // 4. Синхронизируем UI
        sync()
        return true
    }

    function movePlacement(id: string, x: number, y: number): Placement | null {
        const moved = engine.value.movePlacement(id, x, y)

        if (moved) {
            sync()
            return moved
        }

        return null
    }

    function rotatePlacement(id: string): boolean {
        if (!canModify(id)) return false

        const p = engine.value.getPlacements().find(p => p.id === id)
        if (!p) return false

        // 1. удаляем
        const removed = executor.value.execute({
            type: 'removePlacement',
            placementId: id,
        }).ok

        if (!removed) return false

        // 2. добавляем повернутый
        const added = executor.value.execute({
            type: 'addItem',
            template: {
                id: crypto.randomUUID(),
                templateId: p.templateId!,
                width: p.length,        // 🔁 swap
                length: p.width,        // 🔁 swap
                height: p.height,
                fragile: p.fragile,
                weight: p.weight,
                color: p.color,
                name: p.name,
            },
            mode: mode.value,
        }).ok

        // 3. если не влез — откат
        if (!added) {
            executor.value.execute({
                type: 'addItem',
                template: {
                    id: crypto.randomUUID(),
                    templateId: p.templateId!,
                    width: p.width,
                    length: p.length,
                    height: p.height,
                    fragile: p.fragile,
                    weight: p.weight,
                    color: p.color,
                    name: p.name,
                },
                mode: mode.value,
            })
            sync()
            return false
        }

        sync()
        return true
    }

    function canModify(id: string): boolean {
        return engine.value.canModifyPlacement(id)
    }

    function setMode(next: PackingMode) {
        mode.value = next
    }

    /* =========================
       INIT
    ========================= */

    sync()

    return {
        placements,
        mode,

        // stats
        usedVolume,
        volumeFill,
        usedWeight,

        // actions
        addFromTemplate,
        removePlacement,
        editPlacement,
        optimize,
        setMode,
        canModify,
        rotatePlacement,
        addCustomItem,
        resetContainer,
        movePlacement,
        step
    }
}
import { shallowRef, ref, computed } from 'vue'
import { PackingEngine } from '@/engine/PackingEngine'
import { PackingCommandExecutor } from '@/engine/commands/PackingCommandExecutor'
import type { Container, Placement } from '@/engine/types'
import type { CargoTemplate } from '@/data/templates/types'

export type PackingMode = 'uniform' | 'dense'

export interface UsePackingOptions {
    step?: number
    /** Размещать только на полу (для default режима) */
    floorOnly?: boolean
}

export function usePacking(
    container: Container,
    options: UsePackingOptions | number = {}
) {
    // Обратная совместимость: если передано число — это step
    const opts = typeof options === 'number'
        ? { step: options, floorOnly: false }
        : options

    const step = opts.step ?? 50
    const floorOnly = ref(opts.floorOnly ?? false)

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

    const containerFloorArea =
        container.width * container.length

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
        const v = containerVolume === 0 ? 0 : Math.min(usedVolume.value / containerVolume, 1)
        return v
    })

    const floorFill = computed(() => {
        const f = containerFloorArea === 0 ? 0 : Math.min(usedFloorArea.value / containerFloorArea, 1)
        return f
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

    function resetContainer(newContainer: Container) {
        engine.value = new PackingEngine(newContainer, step)
        executor.value = new PackingCommandExecutor(engine.value)
        sync()
    }

    /** Внутренний helper для добавления груза */
    function executeAddItem(item: {
        templateId?: string
        name: string
        color: string
        weight?: number
        width: number
        length: number
        height: number
        fragile: boolean
    }): boolean {
        const res = executor.value.execute({
            type: 'addItem',
            template: {
                id: crypto.randomUUID(),
                templateId: item.templateId,
                name: item.name,
                color: item.color,
                weight: item.weight,
                width: item.width,
                length: item.length,
                height: item.height,
                fragile: item.fragile,
            },
            mode: mode.value,
            floorOnly: floorOnly.value,
        })
        if (res.ok) sync()
        return res.ok
    }

    /* =========================
       COMMANDS
    ========================= */

    function addFromTemplate(template: CargoTemplate): boolean {
        return executeAddItem({
            templateId: template.id,
            name: template.name,
            color: template.color,
            weight: template.weight,
            width: template.width,
            length: template.length,
            height: template.height,
            fragile: template.fragile,
        })
    }

    /** Добавление груза из шаблона в конкретную позицию */
    function addFromTemplateAt(template: CargoTemplate, x: number, y: number): boolean {
        const placement = engine.value.addItemAt(
            {
                id: crypto.randomUUID(),
                templateId: template.id,
                name: template.name,
                color: template.color,
                weight: template.weight,
                width: template.width,
                length: template.length,
                height: template.height,
                fragile: template.fragile,
            },
            x,
            y
        )

        if (placement) {
            sync()
            return true
        }
        return false
    }

    function addCustomItem(item: {
        name: string
        color: string
        weight?: number
        width: number
        length: number
        height: number
        fragile: boolean
    }): boolean {
        return executeAddItem(item)
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
            floorOnly: floorOnly.value,
        })

        sync()
        return true
    }

    function optimize(): boolean {
        // 1. Сохраняем грузы
        const items = engine.value.getPlacements().map(p => ({
            templateId: p.templateId,
            width: p.width,
            length: p.length,
            height: p.height,
            fragile: p.fragile,
            weight: p.weight,
            color: p.color,
            name: p.name,
        }))

        // 2. Пересоздаём engine
        engine.value = new PackingEngine(container, step)
        executor.value = new PackingCommandExecutor(engine.value)

        // 3. Кладём грузы заново в текущем режиме
        for (const item of items) {
            const res = executor.value.execute({
                type: 'addItem',
                template: {
                    id: crypto.randomUUID(),
                    ...item,
                },
                mode: mode.value,
                floorOnly: floorOnly.value,
            })

            if (!res.ok) {
                console.warn('[optimize] item skipped:', item)
            }
        }

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

        // 2. добавляем повернутый (swap width/length)
        const added = executor.value.execute({
            type: 'addItem',
            template: {
                id: crypto.randomUUID(),
                templateId: p.templateId,
                width: p.length,
                length: p.width,
                height: p.height,
                fragile: p.fragile,
                weight: p.weight,
                color: p.color,
                name: p.name,
            },
            mode: mode.value,
            floorOnly: floorOnly.value,
        }).ok

        // 3. если не влез — откат
        if (!added) {
            executor.value.execute({
                type: 'addItem',
                template: {
                    id: crypto.randomUUID(),
                    templateId: p.templateId,
                    width: p.width,
                    length: p.length,
                    height: p.height,
                    fragile: p.fragile,
                    weight: p.weight,
                    color: p.color,
                    name: p.name,
                },
                mode: mode.value,
                floorOnly: floorOnly.value,
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

    function setFloorOnly(value: boolean) {
        floorOnly.value = value
    }

    /* =========================
       INIT
    ========================= */

    sync()

    return {
        placements,
        mode,
        floorOnly,

        // stats
        usedVolume,
        volumeFill,
        usedFloorArea,
        floorFill,
        usedWeight,

        // actions
        addFromTemplate,
        addFromTemplateAt,
        removePlacement,
        editPlacement,
        optimize,
        setMode,
        setFloorOnly,
        canModify,
        rotatePlacement,
        addCustomItem,
        resetContainer,
        movePlacement,
        step
    }
}
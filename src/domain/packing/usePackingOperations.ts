import type { ShallowRef, Ref } from 'vue'
import type { PackingEngine } from '@/engine/PackingEngine'
import type { PackingCommandExecutor } from '@/engine/commands/PackingCommandExecutor'
import type { Container, Placement, PlacementMode } from '@/engine/types'
import type { CargoTemplate } from '@/data/templates/types'

export interface PackingOperationsContext {
    engine: ShallowRef<PackingEngine>
    executor: ShallowRef<PackingCommandExecutor>
    container: Container
    step: number
    mode: Ref<PlacementMode>
    floorOnly: Ref<boolean>
    sync: () => void
    resetEngine: () => void
}

export interface MoveCheckResult {
    valid: boolean
    z?: number
}

export interface DropPosition {
    x: number
    y: number
    z: number
}

export interface PackingOperations {
    addFromTemplate: (template: CargoTemplate) => boolean
    addFromTemplateAt: (template: CargoTemplate, x: number, y: number) => boolean
    addCustomItem: (item: CustomItemInput) => boolean
    removePlacement: (id: string) => boolean
    editPlacement: (id: string, patch: Partial<Placement>) => boolean
    movePlacement: (id: string, x: number, y: number) => Placement | null
    rotatePlacement: (id: string) => boolean
    optimize: () => boolean
    canModify: (id: string) => boolean
    /** Проверяет возможность перемещения БЕЗ реального перемещения (для drag preview) */
    checkMovePosition: (id: string, x: number, y: number) => MoveCheckResult
    /** Ищет ближайшую валидную позицию для drop */
    findDropPosition: (id: string, x: number, y: number) => DropPosition | null
    /** Восстанавливает размещения из истории с сохранением координат */
    restorePlacements: (placements: Placement[]) => void
}

export interface CustomItemInput {
    name: string
    color: string
    weight?: number
    width: number
    length: number
    height: number
    fragile: boolean
}

interface AddItemInput extends CustomItemInput {
    templateId?: string
}

/**
 * Composable для операций с грузами
 *
 * Отвечает за:
 * - Добавление грузов (из шаблона, кастомных)
 * - Удаление грузов
 * - Редактирование грузов
 * - Перемещение и поворот
 * - Оптимизацию размещения
 */
export function usePackingOperations(ctx: PackingOperationsContext): PackingOperations {
    const { engine, executor, mode, floorOnly, sync, resetEngine } = ctx

    /**
     * Внутренний helper для добавления груза
     */
    function executeAddItem(item: AddItemInput): boolean {
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

    function addFromTemplateAt(template: CargoTemplate, x: number, y: number): boolean {
        // Используем addItemAtOrNear чтобы при бросании на занятое место
        // груз размещался в ближайшей валидной позиции
        const placement = engine.value.addItemAtOrNear(
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

    function addCustomItem(item: CustomItemInput): boolean {
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

        // 2. Пересоздаём engine через callback
        resetEngine()

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

    function canModify(id: string): boolean {
        return engine.value.canModifyPlacement(id)
    }

    /**
     * Проверяет возможность перемещения груза БЕЗ реального перемещения.
     * Используется для валидации во время drag-and-drop.
     */
    function checkMovePosition(id: string, x: number, y: number): MoveCheckResult {
        const z = engine.value.canMoveToPosition(id, x, y)
        return z !== null ? { valid: true, z } : { valid: false }
    }

    /**
     * Ищет ближайшую валидную позицию для drop.
     * Используется когда пользователь отпускает груз в невалидной позиции.
     */
    function findDropPosition(id: string, x: number, y: number): DropPosition | null {
        return engine.value.findNearestDropPosition(id, x, y)
    }

    /**
     * Восстанавливает размещения из истории с сохранением координат.
     */
    function restorePlacements(placements: Placement[]): void {
        engine.value.restorePlacements(placements)
        sync()
    }

    return {
        addFromTemplate,
        addFromTemplateAt,
        addCustomItem,
        removePlacement,
        editPlacement,
        movePlacement,
        rotatePlacement,
        optimize,
        canModify,
        checkMovePosition,
        findDropPosition,
        restorePlacements,
    }
}

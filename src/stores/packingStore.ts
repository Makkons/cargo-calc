import { defineStore } from 'pinia'
import type {
    PackingItem,
    PackingResult,
    Size,
} from '@/types'
import { packItems } from '@/core/packing'
import { canPlaceItem } from '@/core/canPlaceItem'

/* ============================
   UI-СЛОЙ
============================ */
export interface PackingLayer {
    id: number
    itemIds: string[]
}

export const usePackingStore = defineStore('packing', {
    state: () => ({
        /* ============================
           КОНТЕЙНЕР
        ============================ */
        container: null as Size | null,

        /* ============================
           ВСЕ ГРУЗЫ
        ============================ */
        items: [] as PackingItem[],

        /* ============================
           УПРАВЛЯЕМЫЕ СЛОИ
        ============================ */
        layers: [
            {
                id: 0,
                itemIds: [],
            },
        ] as PackingLayer[],

        activeLayerIndex: 0,

        /* ============================
           РЕЗУЛЬТАТ (CORE / 3D)
        ============================ */
        result: {
            layers: [],
            totalHeight: 0,
            filledVolume: 0,
        } as PackingResult,
    }),

    getters: {
        activeLayer(state): PackingLayer {
            return state.layers[state.activeLayerIndex]
        },

        canCreateLayer(state): boolean {
            if (!state.container) return false

            const lastLayer = state.result.layers[state.result.layers.length - 1]
            if (!lastLayer) return false

            if (lastLayer.items.length === 0) return false
            if (state.result.totalHeight >= state.container.height) return false

            return true
        },
    },

    actions: {
        /* ============================
           КОНТЕЙНЕР
        ============================ */
        setContainer(container: Size) {
            this.container = { ...container }
            this.recalculate()
        },

        clearContainer() {
            this.container = null
            this.items = []
            this.layers = [{ id: 0, itemIds: [] }]
            this.activeLayerIndex = 0
            this.clearResult()
        },

        /* ============================
           СЛОИ
        ============================ */
        setActiveLayer(index: number) {
            if (index < 0) return

            const maxIndex = this.result.layers.length - 1
            if (index > maxIndex) return

            this.activeLayerIndex = index
        },

        createNextLayer() {
            if (!this.canCreateLayer) {
                console.warn('[packingStore] Cannot create layer')
                return false
            }

            const nextIndex = this.layers.length

            this.layers.push({
                id: nextIndex,
                itemIds: [],
            })

            this.activeLayerIndex = nextIndex
            this.recalculate()
            return true
        },

        /* ============================
           ГРУЗЫ
        ============================ */
        addItem(item: PackingItem) {
            if (!this.container) return

            // 1️⃣ Пробуем положить в активный слой
            if (
                canPlaceItem(
                    item,
                    this.activeLayerIndex,
                    this.layers,
                    this.items,
                    this.container
                )
            ) {
                this.items.push(item)
                this.layers[this.activeLayerIndex].itemIds.push(item.id)
                this.recalculate()
                return
            }

            // 2️⃣ Пробуем создать новый слой
            if (this.canCreateLayer) {
                const nextLayerIndex = this.layers.length

                this.layers.push({
                    id: nextLayerIndex,
                    itemIds: [],
                })

                if (
                    canPlaceItem(
                        item,
                        nextLayerIndex,
                        this.layers,
                        this.items,
                        this.container
                    )
                ) {
                    this.items.push(item)
                    this.layers[nextLayerIndex].itemIds.push(item.id)
                    this.activeLayerIndex = nextLayerIndex
                    this.recalculate()
                    return
                }

                // если не влез даже туда — откатываем слой
                this.layers.pop()
            }

            // ❌ Груз не помещается
            console.warn('Груз не помещается в контейнер', item)
        },

        syncActiveLayer() {
            const maxIndex = this.result.layers.length - 1

            if (maxIndex < 0) {
                this.activeLayerIndex = 0
                return
            }

            if (this.activeLayerIndex > maxIndex) {
                this.activeLayerIndex = maxIndex
            }
        },

        updateItem(item: PackingItem) {
            const index = this.items.findIndex(i => i.id === item.id)
            if (index === -1) return

            this.items[index] = item
            this.recalculate()
        },

        removeItem(id: string) {
            this.items = this.items.filter(i => i.id !== id)

            this.layers.forEach(layer => {
                layer.itemIds = layer.itemIds.filter(itemId => itemId !== id)
            })

            // если активный слой стал пустым и не первый — откат
            if (
                this.activeLayerIndex > 0 &&
                this.layers[this.activeLayerIndex].itemIds.length === 0
            ) {
                this.layers.pop()
                this.activeLayerIndex--
            }

            this.recalculate()
        },

        /* ============================
           CORE
        ============================ */
        recalculate() {
            if (!this.container) {
                this.clearResult()
                this.activeLayerIndex = 0
                return
            }

            this.result = packItems(
                this.layers,
                this.items,
                this.container
            )

            this.syncActiveLayer()
        },

        clearResult() {
            this.result = {
                layers: [],
                totalHeight: 0,
                filledVolume: 0,
            }
        },
    },
})
import type {
    PackingItem,
    PackedItem,
    PackingResult,
    LayerResult,
    Size,
} from '@/types'
import type { PackingLayer } from '@/stores/packingStore'

interface Area {
    width: number
    length: number
}

export function packItems(
    layers: PackingLayer[],
    items: PackingItem[],
    container: Size
): PackingResult {
    const resultLayers: LayerResult[] = []

    let currentZ = 0 // текущая высота по контейнеру

    for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
        const layer = layers[layerIndex]
        const layerItems = layer.itemIds
            .map(id => items.find(i => i.id === id))
            .filter(Boolean) as PackingItem[]

        if (layerItems.length === 0) break

        // ===== 1. availableArea =====
        const availableArea: Area =
            layerIndex === 0
                ? {
                    width: container.width,
                    length: container.length,
                }
                : getPreviousLayerArea(resultLayers[layerIndex - 1])

        // ===== 2. Раскладка слоя =====
        let x = 0
        let y = 0
        let rowLength = 0
        let maxHeight = 0

        const packedItems: PackedItem[] = []

        for (const item of layerItems) {
            // перенос строки
            if (x + item.size.width > availableArea.width) {
                x = 0
                y += rowLength
                rowLength = 0
            }

            // выход за пределы availableArea
            if (y + item.size.length > availableArea.length) {
                return buildResult(resultLayers)
            }

            // выход по высоте контейнера
            if (currentZ + item.size.height > container.height) {
                return buildResult(resultLayers)
            }

            const packed: PackedItem = {
                ...item,
                rotated: false,
                position: {
                    x,
                    y,
                    z: currentZ,
                },
            }

            packedItems.push(packed)

            x += item.size.width
            rowLength = Math.max(rowLength, item.size.length)
            maxHeight = Math.max(maxHeight, item.size.height)
        }

        resultLayers.push({
            z: currentZ,
            heightUsed: maxHeight,
            items: packedItems,
        })

        currentZ += maxHeight
    }

    return buildResult(resultLayers)
}

/* ============================
   HELPERS
============================ */

function getPreviousLayerArea(layer: LayerResult): Area {
    let maxX = 0
    let maxY = 0

    for (const item of layer.items) {
        maxX = Math.max(maxX, item.position.x + item.size.width)
        maxY = Math.max(maxY, item.position.y + item.size.length)
    }

    return {
        width: maxX,
        length: maxY,
    }
}

function buildResult(layers: LayerResult[]): PackingResult {
    let totalHeight = 0
    let filledVolume = 0

    for (const layer of layers) {
        totalHeight += layer.heightUsed
        for (const item of layer.items) {
            filledVolume +=
                item.size.width *
                item.size.length *
                item.size.height
        }
    }

    return {
        layers,
        totalHeight,
        filledVolume,
    }
}


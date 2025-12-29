import type { PackingItem, Size } from '@/types'
import type { PackingLayer } from '@/stores/packingStore'

export interface Area {
    width: number
    length: number
}

/**
 * Минимально доступная область слоя.
 * Считаем, что слой заполняется:
 * - слева направо
 * - затем новая строка
 */
export function getAvailableArea(
    layerIndex: number,
    layers: PackingLayer[],
    items: PackingItem[],
    container: Size
): Area[] {
    const layer = layers[layerIndex]
    if (!layer) return []

    let usedWidth = 0
    let usedLength = 0
    let rowHeight = 0

    for (const itemId of layer.itemIds) {
        const item = items.find(i => i.id === itemId)
        if (!item) continue

        // перенос строки
        if (usedWidth + item.size.width > container.width) {
            usedWidth = 0
            usedLength += rowHeight
            rowHeight = 0
        }

        usedWidth += item.size.width
        rowHeight = Math.max(rowHeight, item.size.length)
    }

    const remainingWidth = container.width - usedWidth
    const remainingLength = container.length - usedLength

    if (remainingWidth <= 0 || remainingLength <= 0) {
        return []
    }

    return [
        {
            width: remainingWidth,
            length: remainingLength,
        },
    ]
}
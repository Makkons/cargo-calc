import type { ItemTemplate, Placement } from './types'

/**
 * Расширенный шаблон с метаданными для создания Placement.
 * ItemTemplate может содержать опциональные поля name, color, weight.
 */
type TemplateWithMeta = ItemTemplate & {
    name?: string
    color?: string
    weight?: number
}

/**
 * Создаёт Placement из шаблона и координат.
 *
 * @param template - шаблон груза (может содержать name, color, weight)
 * @param x - координата X
 * @param y - координата Y
 * @param z - координата Z (высота)
 * @param id - опциональный ID; если не указан, используется template.id
 */
export function createPlacement(
    template: ItemTemplate,
    x: number,
    y: number,
    z: number,
    id?: string
): Placement {
    const meta = template as TemplateWithMeta

    return {
        id: id ?? template.id,
        templateId: template.templateId,
        name: meta.name ?? '',
        color: meta.color ?? '#9e9e9e',
        weight: meta.weight,
        width: template.width,
        length: template.length,
        height: template.height,
        x,
        y,
        z,
        fragile: template.fragile ?? false,
        locked: false,
    }
}

import type { Placement, HeightMap, HeightCell } from '@/types'

/**
 * Строит height-map:
 * каждая ячейка = верхняя поверхность размещённого груза
 * + пол контейнера (z = 0)
 */
export function buildHeightMapFromPlacements(
    placements: Placement[],
    containerWidth: number,
    containerLength: number
): HeightMap {

    const cells: HeightCell[] = []

    /* ============================
       1. ПОЛ КОНТЕЙНЕРА (ВСЕГДА)
    ============================ */
    cells.push({
        x: 0,
        y: 0,
        width: containerWidth,
        length: containerLength,
        z: 0,
    })

    /* ============================
       2. ВЕРХ КАЖДОГО ГРУЗА
    ============================ */
    for (const p of placements) {
        cells.push({
            x: p.x,
            y: p.y,
            width: p.width,
            length: p.length,
            z: p.z + p.height, // ← КРИТИЧНО
        })
    }

    /* ============================
       3. MERGE по (z)
       (простой вариант: только
        прямоугольники с общими
        границами)
    ============================ */
    return {
        cells: mergeCellsByZ(cells),
    }
}

function mergeCellsByZ(cells: HeightCell[]): HeightCell[] {
    const result: HeightCell[] = []

    const byZ = new Map<number, HeightCell[]>()

    for (const c of cells) {
        if (!byZ.has(c.z)) byZ.set(c.z, [])
        byZ.get(c.z)!.push(c)
    }

    for (const [z, group] of byZ.entries()) {
        // пол не мерджим ни с чем
        if (z === 0) {
            result.push(...group)
            continue
        }

        // простой bbox merge
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        for (const c of group) {
            minX = Math.min(minX, c.x)
            minY = Math.min(minY, c.y)
            maxX = Math.max(maxX, c.x + c.width)
            maxY = Math.max(maxY, c.y + c.length)
        }

        result.push({
            x: minX,
            y: minY,
            width: maxX - minX,
            length: maxY - minY,
            z,
        })
    }

    return result
}
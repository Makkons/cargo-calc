import type { Placement, Container } from './types'
import { snapToGrid, SNAP_THRESHOLD, SNAP_BREAKAWAY } from './constants'

export interface SnapResult {
    x: number
    y: number
    snappedX: boolean  // Был ли snap по X
    snappedY: boolean  // Был ли snap по Y
}

export interface SnapState {
    snappedX: boolean
    snappedY: boolean
}

interface Edge {
    position: number  // Координата грани
    isStart: boolean  // Это начало объекта (left/top) или конец (right/bottom)
}

/**
 * SnapHelper - помощник для притягивания грузов к граням других грузов.
 *
 * Реализует "магнитное" прилипание как в Figma/Sketch:
 * - Когда край перетаскиваемого груза близок к краю другого → притягивается
 * - Для отлипания нужно потянуть чуть дальше (гистерезис)
 * - Snap к грузам приоритетнее snap к сетке
 */
export class SnapHelper {
    constructor(
        private readonly container: Container,
        private readonly step: number,
        private readonly threshold: number = SNAP_THRESHOLD,
        private readonly breakaway: number = SNAP_BREAKAWAY
    ) {}

    /**
     * Применяет snap к позиции перетаскиваемого груза
     *
     * @param rawX - "сырая" X позиция от курсора
     * @param rawY - "сырая" Y позиция от курсора
     * @param placement - перетаскиваемый груз
     * @param others - остальные грузы
     * @param prevState - предыдущее состояние snap (для гистерезиса)
     */
    snap(
        rawX: number,
        rawY: number,
        placement: Placement,
        others: readonly Placement[],
        prevState: SnapState
    ): SnapResult {
        // Собираем вертикальные грани (для snap по X)
        const verticalEdges = this.collectVerticalEdges(others, placement.id)
        // Собираем горизонтальные грани (для snap по Y)
        const horizontalEdges = this.collectHorizontalEdges(others, placement.id)

        // Добавляем границы контейнера
        verticalEdges.push({ position: 0, isStart: true })
        verticalEdges.push({ position: this.container.width, isStart: false })
        horizontalEdges.push({ position: 0, isStart: true })
        horizontalEdges.push({ position: this.container.length, isStart: false })

        // Snap по X
        const snapX = this.snapAxis(
            rawX,
            placement.width,
            verticalEdges,
            prevState.snappedX
        )

        // Snap по Y
        const snapY = this.snapAxis(
            rawY,
            placement.length,
            horizontalEdges,
            prevState.snappedY
        )

        return {
            x: snapX.position,
            y: snapY.position,
            snappedX: snapX.snapped,
            snappedY: snapY.snapped,
        }
    }

    /**
     * Snap по одной оси
     */
    private snapAxis(
        rawPos: number,
        size: number,
        edges: Edge[],
        wasSnapped: boolean
    ): { position: number; snapped: boolean } {
        const myStart = rawPos
        const myEnd = rawPos + size
        const activeThreshold = wasSnapped ? this.breakaway : this.threshold

        let bestSnap: { position: number; distance: number } | null = null

        const trySnap = (snapPos: number, distance: number) => {
            // Early exit: точное совпадение
            if (distance === 0) {
                bestSnap = { position: snapPos, distance: 0 }
                return true
            }
            // Пропускаем далёкие грани
            if (distance > activeThreshold) return false
            if (!bestSnap || distance < bestSnap.distance) {
                bestSnap = { position: snapPos, distance }
            }
            return false
        }

        for (const edge of edges) {
            // Мой start → их позиция (выравнивание или примыкание)
            if (trySnap(edge.position, Math.abs(myStart - edge.position))) break

            // Мой end → их позиция
            const endSnapPos = edge.position - size
            if (endSnapPos >= 0) {
                if (trySnap(endSnapPos, Math.abs(myEnd - edge.position))) break
            }
        }

        if (bestSnap && bestSnap.distance <= activeThreshold) {
            return { position: bestSnap.position, snapped: true }
        }

        return { position: snapToGrid(rawPos, this.step), snapped: false }
    }

    /**
     * Собирает вертикальные грани (левые и правые края грузов)
     */
    private collectVerticalEdges(placements: readonly Placement[], excludeId: string): Edge[] {
        const edges: Edge[] = []

        for (const p of placements) {
            if (p.id === excludeId) continue

            edges.push({ position: p.x, isStart: true })                    // Левый край
            edges.push({ position: p.x + p.width, isStart: false })         // Правый край
        }

        return edges
    }

    /**
     * Собирает горизонтальные грани (верхние и нижние края грузов)
     */
    private collectHorizontalEdges(placements: readonly Placement[], excludeId: string): Edge[] {
        const edges: Edge[] = []

        for (const p of placements) {
            if (p.id === excludeId) continue

            edges.push({ position: p.y, isStart: true })                     // Верхний край
            edges.push({ position: p.y + p.length, isStart: false })         // Нижний край
        }

        return edges
    }
}

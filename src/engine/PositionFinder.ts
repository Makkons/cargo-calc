import type {
    Container,
    ItemTemplate,
    Placement,
    CandidatePosition,
    FindPlacementOptions,
    PlacementProvider,
    HeightMapProvider
} from './types'
import type { PlacementValidator } from './PlacementValidator'
import { scoreUniform, scoreDense } from './scoring'
import { createPlacement } from './PlacementFactory'
import { snapToGrid } from './constants'

/**
 * PositionFinder - поиск оптимальной позиции для груза
 *
 * Отвечает за:
 * - Генерацию кандидатных позиций
 * - Оценку позиций (scoring)
 * - Выбор лучшей позиции
 *
 * Получает HeightMap через provider, что позволяет engine
 * пересоздавать heightMap без пересоздания positionFinder.
 */
export class PositionFinder {
    constructor(
        private readonly container: Container,
        private readonly step: number,
        private readonly heightMapProvider: HeightMapProvider,
        private readonly validator: PlacementValidator,
        private readonly placementProvider: PlacementProvider
    ) {}

    private get heightMap() {
        return this.heightMapProvider.getHeightMap()
    }

    /**
     * Находит оптимальную позицию для размещения груза
     */
    findBestPosition(
        template: ItemTemplate,
        options: FindPlacementOptions
    ): Placement | null {
        const candidates = this.generateCandidates(template)

        let best: Placement | null = null
        let bestScore: number | null = null

        for (const { x, y } of candidates) {
            const z = this.validator.canPlaceAt(template, x, y)
            if (z === null) continue

            // В режиме floorOnly размещаем только на полу
            if (options.floorOnly && z !== 0) continue

            const score = this.scorePosition(template, x, y, z, options.mode)

            if (best === null || score < bestScore!) {
                bestScore = score
                best = createPlacement(template, x, y, z, crypto.randomUUID())
            }
        }

        return best
    }

    /**
     * Генерирует кандидатные позиции для размещения
     *
     * Вместо перебора всех позиций O(W×L) генерируем только "интересные" точки:
     * - (0, 0) — угол контейнера
     * - Справа от каждого груза: (p.x + p.width, p.y)
     * - Снизу от каждого груза: (p.x, p.y + p.length)
     * - Диагональ: (p.x + p.width, p.y + p.length)
     * - Выравнивание: (p.x, p.y)
     */
    private generateCandidates(template: ItemTemplate): CandidatePosition[] {
        const candidates = new Map<string, CandidatePosition>()

        const addCandidate = (x: number, y: number) => {
            // Snap к сетке
            const sx = snapToGrid(x, this.step)
            const sy = snapToGrid(y, this.step)

            // Проверяем границы с учётом размеров груза
            if (sx < 0 || sy < 0) return
            if (sx + template.width > this.container.width) return
            if (sy + template.length > this.container.length) return

            const key = `${sx},${sy}`
            if (!candidates.has(key)) {
                candidates.set(key, { x: sx, y: sy })
            }
        }

        // Базовая позиция — угол контейнера
        addCandidate(0, 0)

        // Кандидаты от существующих грузов
        const placements = this.placementProvider.getPlacements()
        for (const p of placements) {
            // Справа от груза
            addCandidate(p.x + p.width, p.y)

            // Снизу от груза
            addCandidate(p.x, p.y + p.length)

            // Диагональ (полезно для заполнения углов)
            addCandidate(p.x + p.width, p.y + p.length)

            // Выравнивание по левому краю груза (для стекинга)
            addCandidate(p.x, p.y)
        }

        return Array.from(candidates.values())
    }

    /**
     * Оценивает позицию для размещения
     */
    private scorePosition(
        template: ItemTemplate,
        x: number,
        y: number,
        z: number,
        mode: 'uniform' | 'dense'
    ): number {
        const cells = this.heightMap.getCells(x, y, template.width, template.length)

        return mode === 'uniform'
            ? scoreUniform(cells, z)
            : scoreDense(cells, z)
    }
}

import type {
    Container,
    ItemTemplate,
    Placement,
    PlacementProvider,
    HeightMapProvider
} from './types'
import {
    ok,
    err,
    type ValidationResult,
    type PlacementError,
    type Result
} from './result'

/**
 * PlacementValidator - валидация размещения грузов
 *
 * Отвечает за:
 * - Проверку границ контейнера
 * - Проверку коллизий с другими грузами
 * - Проверку fragile (нельзя ставить на хрупкие)
 * - Проверку locked (нельзя модифицировать заблокированные)
 * - Проверку наличия грузов сверху
 *
 * Получает HeightMap через provider, что позволяет engine
 * пересоздавать heightMap без пересоздания validator.
 */
export class PlacementValidator {
    constructor(
        private readonly container: Container,
        private readonly heightMapProvider: HeightMapProvider,
        private readonly placementProvider: PlacementProvider
    ) {}

    private get heightMap() {
        return this.heightMapProvider.getHeightMap()
    }

    /**
     * Проверяет, можно ли разместить груз в позиции (x, y)
     *
     * @returns Ok с z-координатой или Err с причиной
     *
     * @example
     * const result = validator.validatePosition(template, 0, 0)
     * if (result.ok) {
     *     console.log(`Можно поставить на высоте ${result.value.z}`)
     * } else {
     *     console.log(`Ошибка: ${getErrorMessage(result.error)}`)
     * }
     */
    validatePosition(
        template: ItemTemplate,
        x: number,
        y: number
    ): ValidationResult {
        const { width, length, height } = template

        // Проверка границ контейнера
        if (x < 0 || y < 0) {
            return err('position_negative')
        }

        if (x + width > this.container.width) {
            return err('exceeds_width')
        }

        if (y + length > this.container.length) {
            return err('exceeds_length')
        }

        // Получаем ячейки под грузом
        const cells = this.heightMap.getCells(x, y, width, length)

        // Вычисляем базовую высоту (поверхность на которую ставим)
        const z = this.heightMap.getBaseHeight(cells)
        if (z === null) {
            return err('uneven_surface')
        }

        // Проверка fragile - нельзя ставить на хрупкие грузы
        for (const cell of cells) {
            if (cell.topPlacementId) {
                const below = this.placementProvider.getPlacementById(cell.topPlacementId)
                if (below?.fragile) {
                    return err('fragile_below')
                }
            }
        }

        // Проверка высоты контейнера
        if (z + height > this.container.height) {
            return err('exceeds_height')
        }

        return ok({ z })
    }

    /**
     * Проверяет, можно ли разместить груз (упрощённая версия)
     * @returns z-координата или null
     */
    canPlaceAt(template: ItemTemplate, x: number, y: number): number | null {
        const result = this.validatePosition(template, x, y)
        return result.ok ? result.value.z : null
    }

    /**
     * Проверяет, можно ли модифицировать груз с типизированной ошибкой
     *
     * @returns Ok(void) или Err с причиной
     */
    validateModify(placement: Placement): Result<void, PlacementError> {
        if (placement.locked) {
            return err('locked')
        }

        if (this.heightMap.hasPlacementAbove(placement)) {
            return err('has_items_above')
        }

        return ok(undefined)
    }

    /**
     * Проверяет, можно ли модифицировать (удалить/переместить) груз
     * @deprecated Используйте validateModify для типизированных ошибок
     */
    canModify(placement: Placement): boolean {
        return this.validateModify(placement).ok
    }

    /**
     * Проверяет, можно ли модифицировать груз по ID
     * @deprecated Используйте validateModifyById для типизированных ошибок
     */
    canModifyById(id: string): boolean {
        const result = this.validateModifyById(id)
        return result.ok
    }

    /**
     * Проверяет, можно ли модифицировать груз по ID с типизированной ошибкой
     */
    validateModifyById(id: string): Result<Placement, PlacementError> {
        const placement = this.placementProvider.getPlacementById(id)
        if (!placement) {
            return err('not_found')
        }

        const canModify = this.validateModify(placement)
        if (!canModify.ok) {
            return err(canModify.error)
        }

        return ok(placement)
    }
}

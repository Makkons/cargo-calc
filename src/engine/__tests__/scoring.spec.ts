import { describe, it, expect } from 'vitest'
import { PackingEngine } from '../PackingEngine'
import { scoreUniform, scoreDense } from '../scoring'
import type { Container, ItemTemplate, Cell } from '../types'

const container: Container = {
    width: 100,
    length: 100,
    height: 100
}

const box: ItemTemplate = {
    id: 'box',
    width: 50,
    length: 50,
    height: 20
}

describe('scoring functions', () => {

    describe('scoreUniform', () => {

        it('prefers lower z position', () => {
            const cells: Cell[] = [
                { height: 0, placementId: null },
                { height: 0, placementId: null }
            ]

            const scoreAtZ0 = scoreUniform(cells, 0)
            const scoreAtZ10 = scoreUniform(cells, 10)
            const scoreAtZ20 = scoreUniform(cells, 20)

            // Меньший score — лучше, поэтому z=0 должен быть лучше z=10
            expect(scoreAtZ0).toBeLessThan(scoreAtZ10)
            expect(scoreAtZ10).toBeLessThan(scoreAtZ20)
        })

        it('prefers smaller variance (flatter surface)', () => {
            // Плоская поверхность: все ячейки на одной высоте
            const flatCells: Cell[] = [
                { height: 10, placementId: null },
                { height: 10, placementId: null }
            ]

            // Неровная поверхность: разная высота ячеек
            const unevenCells: Cell[] = [
                { height: 0, placementId: null },
                { height: 20, placementId: null }
            ]

            const z = 20
            const scoreFlat = scoreUniform(flatCells, z)
            const scoreUneven = scoreUniform(unevenCells, z)

            // Плоская поверхность должна быть предпочтительнее
            expect(scoreFlat).toBeLessThan(scoreUneven)
        })
    })

    describe('scoreDense', () => {

        it('prefers higher z position (stacking on top)', () => {
            const cells: Cell[] = [
                { height: 10, placementId: 'a' },
                { height: 10, placementId: 'a' }
            ]

            const scoreAtZ10 = scoreDense(cells, 10)
            const scoreAtZ0 = scoreDense(cells, 0)

            // Для dense: выше — лучше (заполняем снизу вверх)
            expect(scoreAtZ10).toBeLessThan(scoreAtZ0)
        })

        it('prefers fewer gaps under item', () => {
            // Без пустот: ячейки на высоте z
            const noGapCells: Cell[] = [
                { height: 20, placementId: 'a' },
                { height: 20, placementId: 'a' }
            ]

            // С пустотами: ячейки ниже z
            const withGapCells: Cell[] = [
                { height: 0, placementId: null },
                { height: 0, placementId: null }
            ]

            const z = 20
            const scoreNoGap = scoreDense(noGapCells, z)
            const scoreWithGap = scoreDense(withGapCells, z)

            // Меньше пустот — лучше
            expect(scoreNoGap).toBeLessThan(scoreWithGap)
        })
    })
})

describe('scoring in engine', () => {

    it('dense prefers position with fewer gaps under item', () => {
        const engine = new PackingEngine(container)

        // создаём ступеньку
        engine.addItem({
            id: 'A',
            width: 50,
            length: 50,
            height: 20
        }, { mode: 'uniform' })

        engine.addItem({
            id: 'B',
            width: 50,
            length: 50,
            height: 10
        }, { mode: 'uniform' })

        const p = engine.addItem(box, { mode: 'dense' })!

        // dense должен выбрать верх с меньшей "дырой"
        expect(p.z).toBe(20)
    })
})
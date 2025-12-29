import { describe, it, expect } from 'vitest'
import { PackingEngine } from '../PackingEngine'
import type { Container, ItemTemplate, Placement } from '../types'

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

describe('PackingEngine.canPlaceAt', () => {
    it('places item on empty floor at z = 0', () => {
        const engine = new PackingEngine(container)

        const z = engine.canPlaceAt(box, 0, 0)

        expect(z).toBe(0)
    })

    it('rejects placement outside container', () => {
        const engine = new PackingEngine(container)

        const z = engine.canPlaceAt(box, 60, 0)

        expect(z).toBe(null)
    })

    it('rejects placement without full support', () => {
        const engine = new PackingEngine(container)

        const base: Placement = {
            id: 'A',
            x: 0,
            y: 0,
            z: 0,
            width: 50,
            length: 50,
            height: 20
        }

        engine.applyPlacementUnsafe(base)

        const z = engine.canPlaceAt(box, 25, 0)

        expect(z).toBe(null)
    })

    it('rejects placement exceeding container height', () => {
        const engine = new PackingEngine(container)

        engine.applyPlacementUnsafe({
            id: 'A',
            x: 0,
            y: 0,
            z: 0,
            width: 50,
            length: 50,
            height: 90
        })

        const tallBox: ItemTemplate = {
            id: 'tall',
            width: 50,
            length: 50,
            height: 20
        }

        const z = engine.canPlaceAt(tallBox, 0, 0)

        expect(z).toBe(null)
    })
})
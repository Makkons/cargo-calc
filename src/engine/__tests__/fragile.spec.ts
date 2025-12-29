import { describe, it, expect } from 'vitest'
import { PackingEngine } from '../PackingEngine'
import type { Container, ItemTemplate } from '../types'

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

describe('Placement.fragile', () => {

    it('does not allow placing item on fragile placement when no floor space is available', () => {
        const engine = new PackingEngine(container)

        // fragile занимает ВЕСЬ пол
        const fragile = engine.addItem({
            id: 'fragile',
            width: 100,
            length: 100,
            height: 20
        }, { mode: 'uniform' })!

        engine.getPlacements()[0].fragile = true

        // теперь единственный вариант — поставить сверху
        const top = engine.addItem(box, { mode: 'dense' })

        expect(top).toBeNull()
        expect(engine.getPlacements().length).toBe(1)
    })

    it('allows placing item on non-fragile placement', () => {
        const engine = new PackingEngine(container)

        engine.addItem(box, { mode: 'uniform' })

        const top = engine.addItem(box, { mode: 'dense' })

        expect(top).not.toBeNull()
        expect(top!.z).toBe(20)
    })

    it('fragile placement itself can be moved if it is top-level', () => {
        const engine = new PackingEngine(container)

        const p = engine.addItem(box, { mode: 'uniform' })!
        engine.getPlacements()[0].fragile = true

        const moved = engine.movePlacement(p.id, 50, 0)

        expect(moved).not.toBeNull()
        expect(moved!.x).toBe(50)
    })
})
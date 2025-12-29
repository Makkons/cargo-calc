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

describe('PackingEngine.movePlacement', () => {

    it('moves a top-level placement to a new valid position', () => {
        const engine = new PackingEngine(container)

        const p = engine.addItem(box, { mode: 'uniform' })!
        const moved = engine.movePlacement(p.id, 50, 0)

        expect(moved).not.toBeNull()
        expect(moved!.x).toBe(50)
        expect(moved!.y).toBe(0)
        expect(moved!.z).toBe(0)
    })

    it('does not move placement if new position is invalid', () => {
        const engine = new PackingEngine(container)

        const p = engine.addItem(box, { mode: 'uniform' })!
        const moved = engine.movePlacement(p.id, 60, 0) // вылезает

        expect(moved).toBeNull()
        expect(engine.getPlacements()[0].x).toBe(p.x)
        expect(engine.getPlacements()[0].y).toBe(p.y)
    })

    it('does not allow moving placement with something above it', () => {
        const engine = new PackingEngine(container)

        const bottom = engine.addItem(box, { mode: 'dense' })!
        const top = engine.addItem(box, { mode: 'dense' })!

        const moved = engine.movePlacement(bottom.id, 50, 0)

        expect(moved).toBeNull()
        expect(engine.getPlacements().length).toBe(2)
    })

    it('allows moving only the top placement', () => {
        const engine = new PackingEngine(container)

        const bottom = engine.addItem(box, { mode: 'dense' })!
        const top = engine.addItem(box, { mode: 'dense' })!

        const movedTop = engine.movePlacement(top.id, 50, 0)

        expect(movedTop).not.toBeNull()
        expect(movedTop!.x).toBe(50)
        expect(engine.getPlacements().length).toBe(2)
    })
})
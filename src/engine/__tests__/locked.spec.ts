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

describe('Placement.locked', () => {

    it('does not allow removing locked placement', () => {
        const engine = new PackingEngine(container)

        const p = engine.addItem(box, { mode: 'uniform' })!
        engine.setLocked(p.id, true)

        const result = engine.removePlacement(p.id)

        expect(result).toBe(false)
        expect(engine.getPlacements().length).toBe(1)
    })

    it('does not allow moving locked placement', () => {
        const engine = new PackingEngine(container)

        const p = engine.addItem(box, { mode: 'uniform' })!
        engine.setLocked(p.id, true)

        const moved = engine.movePlacement(p.id, 50, 0)

        expect(moved).toBeNull()
        expect(engine.getPlacements()[0].x).toBe(p.x)
        expect(engine.getPlacements()[0].y).toBe(p.y)
    })

    it('allows moving when unlocked', () => {
        const engine = new PackingEngine(container)

        const p = engine.addItem(box, { mode: 'uniform' })!
        engine.setLocked(p.id, false)

        const moved = engine.movePlacement(p.id, 50, 0)

        expect(moved).not.toBeNull()
        expect(moved!.x).toBe(50)
    })

    it('locked does not affect addItem for other placements', () => {
        const engine = new PackingEngine(container)

        const p1 = engine.addItem(box, { mode: 'uniform' })!
        engine.setLocked(p1.id, true)

        const p2 = engine.addItem(box, { mode: 'uniform' })

        expect(p2).not.toBeNull()
        expect(engine.getPlacements().length).toBe(2)
    })
})
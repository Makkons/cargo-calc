import { describe, it, expect } from 'vitest'
import { PackingEngine } from '../PackingEngine'
import type { Container, ItemTemplate } from '../types'

const container: Container = {
    width: 100,
    length: 100,
    height: 100
}

function createBox(id: string): ItemTemplate {
    return { id, width: 50, length: 50, height: 20 }
}

describe('PackingEngine.movePlacement', () => {

    it('moves a top-level placement to a new valid position', () => {
        const engine = new PackingEngine(container)

        const p = engine.addItem(createBox('box-1'), { mode: 'uniform' })!
        const moved = engine.movePlacement(p.id, 50, 0)

        expect(moved).not.toBeNull()
        expect(moved!.x).toBe(50)
        expect(moved!.y).toBe(0)
        expect(moved!.z).toBe(0)
    })

    it('does not move placement if new position is invalid', () => {
        const engine = new PackingEngine(container)

        const p = engine.addItem(createBox('box-1'), { mode: 'uniform' })!
        const moved = engine.movePlacement(p.id, 60, 0) // вылезает

        expect(moved).toBeNull()
        expect(engine.getPlacements()[0].x).toBe(p.x)
        expect(engine.getPlacements()[0].y).toBe(p.y)
    })

    it('does not allow moving placement with something above it', () => {
        const engine = new PackingEngine(container)

        const bottom = engine.addItem(createBox('bottom'), { mode: 'dense' })!
        const top = engine.addItem(createBox('top'), { mode: 'dense' })!

        const moved = engine.movePlacement(bottom.id, 50, 0)

        expect(moved).toBeNull()
        expect(engine.getPlacements().length).toBe(2)
    })

    it('allows moving only the top placement', () => {
        const engine = new PackingEngine(container)

        const bottom = engine.addItem(createBox('bottom'), { mode: 'dense' })!
        const top = engine.addItem(createBox('top'), { mode: 'dense' })!

        const movedTop = engine.movePlacement(top.id, 50, 0)

        expect(movedTop).not.toBeNull()
        expect(movedTop!.x).toBe(50)
        expect(engine.getPlacements().length).toBe(2)
    })

    it('preserves placement order in array after move', () => {
        const largeContainer = { width: 1000, length: 1000, height: 100 }
        const engine = new PackingEngine(largeContainer, 10)

        // Add 3 placements
        engine.addItemAt({ id: 'a', width: 100, length: 100, height: 50, fragile: false }, 0, 0)
        engine.addItemAt({ id: 'b', width: 100, length: 100, height: 50, fragile: false }, 200, 0)
        engine.addItemAt({ id: 'c', width: 100, length: 100, height: 50, fragile: false }, 400, 0)

        const placementB = engine.getPlacements()[1]
        expect(placementB.x).toBe(200)

        // Move middle placement
        const moved = engine.movePlacement(placementB.id, 300, 0)

        expect(moved).not.toBeNull()
        expect(moved!.x).toBe(300)

        // Order should be preserved: a, b, c
        const placements = engine.getPlacements()
        expect(placements.length).toBe(3)
        expect(placements[0].x).toBe(0)   // a - unchanged
        expect(placements[1].x).toBe(300) // b - moved but still second
        expect(placements[2].x).toBe(400) // c - unchanged
    })

    it('preserves placement ID after move', () => {
        const largeContainer = { width: 1000, length: 1000, height: 100 }
        const engine = new PackingEngine(largeContainer, 10)

        const original = engine.addItemAt({
            id: 'my-cargo',
            width: 100,
            length: 100,
            height: 50,
            fragile: false,
        }, 0, 0)

        const moved = engine.movePlacement(original!.id, 500, 500)

        expect(moved).not.toBeNull()
        expect(moved!.id).toBe(original!.id) // Same ID
        expect(engine.getPlacements()[0].id).toBe(original!.id)
    })
})
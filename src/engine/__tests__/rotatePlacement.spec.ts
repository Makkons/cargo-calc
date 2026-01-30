import { describe, it, expect } from 'vitest'
import { PackingEngine } from '../PackingEngine'

describe('rotatePlacement', () => {
    const container = { width: 2400, length: 7200, height: 2000 }

    it('should rotate in place when space allows', () => {
        const engine = new PackingEngine(container, 10)

        // Cargo in the middle of container - plenty of space
        const placement = engine.addItemAt({
            id: 'test-1',
            width: 200,
            length: 100,
            height: 100,
            fragile: false,
        }, 1000, 3000)

        const result = engine.rotatePlacement(placement!.id, true)

        expect(result.placement).not.toBeNull()
        expect(result.relocated).toBe(false) // No need to relocate
        expect(result.placement!.width).toBe(100)
        expect(result.placement!.length).toBe(200)
        expect(result.placement!.x).toBe(1000) // Same position
        expect(result.placement!.y).toBe(3000)
    })

    it('should rotate and relocate small cargo at bottom edge', () => {
        const engine = new PackingEngine(container, 10)

        const placement = engine.addItemAt({
            id: 'test-1',
            width: 100,
            length: 50,
            height: 100,
            fragile: false,
        }, 0, 7150) // y + 50 = 7200 (at bottom)

        const result = engine.rotatePlacement(placement!.id, true)

        expect(result.placement).not.toBeNull()
        expect(result.relocated).toBe(true)
        expect(result.placement!.width).toBe(50)
        expect(result.placement!.length).toBe(100)
        expect(result.placement!.y).toBe(7100) // 7200 - 100 = 7100
    })

    it('should rotate and relocate LARGE cargo at bottom edge (requires extended search radius)', () => {
        const engine = new PackingEngine(container, 10)

        // Large cargo 1350x830
        const placement = engine.addItemAt({
            id: 'test-large',
            width: 1350,
            length: 830,
            height: 100,
            fragile: false,
        }, 0, 6370) // y + 830 = 7200 (at bottom)

        // After rotation: width=830, length=1350
        // Need y <= 7200 - 1350 = 5850
        // Difference: 6370 - 5850 = 520 (more than default maxRadius=300!)
        const result = engine.rotatePlacement(placement!.id, true)

        expect(result.placement).not.toBeNull()
        expect(result.relocated).toBe(true)
        expect(result.placement!.width).toBe(830)
        expect(result.placement!.length).toBe(1350)
        expect(result.placement!.y).toBe(5850)
    })

    it('should not rotate square cargo (no change)', () => {
        const engine = new PackingEngine(container, 10)

        const placement = engine.addItemAt({
            id: 'square',
            width: 100,
            length: 100,
            height: 100,
            fragile: false,
        }, 0, 0)

        const result = engine.rotatePlacement(placement!.id, true)

        expect(result.placement).not.toBeNull()
        expect(result.relocated).toBe(false)
        // Width and length unchanged (both 100)
        expect(result.placement!.width).toBe(100)
        expect(result.placement!.length).toBe(100)
    })

    it('should fail without allowRelocate when cannot fit at current position', () => {
        const engine = new PackingEngine(container, 10)

        const placement = engine.addItemAt({
            id: 'test-1',
            width: 200,
            length: 50,
            height: 100,
            fragile: false,
        }, 0, 7150) // y + 50 = 7200

        // Try to rotate without allowing relocate
        const result = engine.rotatePlacement(placement!.id, false)

        expect(result.placement).toBeNull()
        expect(result.relocated).toBe(false)

        // Original placement preserved
        const p = engine.getPlacements()[0]
        expect(p.width).toBe(200)
        expect(p.length).toBe(50)
    })

    it('should preserve placement ID after rotation', () => {
        const engine = new PackingEngine(container, 10)

        const placement = engine.addItemAt({
            id: 'original-id',
            width: 200,
            length: 100,
            height: 100,
            fragile: false,
        }, 0, 0)

        const result = engine.rotatePlacement(placement!.id, true)

        expect(result.placement!.id).toBe('original-id')
    })

    it('should preserve placement order in array', () => {
        const engine = new PackingEngine(container, 10)

        engine.addItemAt({ id: 'a', width: 100, length: 100, height: 100, fragile: false }, 0, 0)
        engine.addItemAt({ id: 'b', width: 200, length: 100, height: 100, fragile: false }, 200, 0)
        engine.addItemAt({ id: 'c', width: 100, length: 100, height: 100, fragile: false }, 500, 0)

        const placementB = engine.getPlacements()[1]

        // Rotate middle placement
        engine.rotatePlacement(placementB.id, true)

        const placements = engine.getPlacements()
        expect(placements[0].id).toBe('a')
        expect(placements[1].id).toBe('b') // Still in middle position
        expect(placements[2].id).toBe('c')
    })

    it('should not rotate locked placement', () => {
        const engine = new PackingEngine(container, 10)

        const placement = engine.addItemAt({
            id: 'locked-cargo',
            width: 200,
            length: 100,
            height: 100,
            fragile: false,
        }, 0, 0)

        engine.setLocked(placement!.id, true)

        const result = engine.rotatePlacement(placement!.id, true)

        expect(result.placement).toBeNull()
    })

    it('should not rotate placement with something on top', () => {
        const smallContainer = { width: 500, length: 500, height: 500 }
        const engine = new PackingEngine(smallContainer, 10)

        // Bottom placement
        const bottom = engine.addItemAt({
            id: 'bottom',
            width: 200,
            length: 100,
            height: 100,
            fragile: false,
        }, 0, 0)

        // Top placement (stacked)
        engine.addItemAt({
            id: 'top',
            width: 100,
            length: 100,
            height: 50,
            fragile: false,
        }, 0, 0)

        const result = engine.rotatePlacement(bottom!.id, true)

        expect(result.placement).toBeNull()
    })
})

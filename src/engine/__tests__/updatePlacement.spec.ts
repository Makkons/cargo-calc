import { describe, it, expect } from 'vitest'
import { PackingEngine } from '../PackingEngine'

describe('updatePlacement', () => {
    const container = { width: 2400, length: 7200, height: 2000 }

    it('should update metadata without relocating', () => {
        const engine = new PackingEngine(container, 10)

        const placement = engine.addItemAt({
            id: 'test-1',
            width: 100,
            length: 100,
            height: 100,
            fragile: false,
        }, 0, 0)

        const result = engine.updatePlacement(placement!.id, {
            name: 'Updated Name',
            color: '#ff0000',
            weight: 500,
        })

        expect(result.placement).not.toBeNull()
        expect(result.relocated).toBe(false)
        expect(result.placement!.name).toBe('Updated Name')
        expect(result.placement!.color).toBe('#ff0000')
        expect(result.placement!.weight).toBe(500)
        // Position unchanged
        expect(result.placement!.x).toBe(0)
        expect(result.placement!.y).toBe(0)
    })

    it('should update size in place when it fits', () => {
        const engine = new PackingEngine(container, 10)

        const placement = engine.addItemAt({
            id: 'test-1',
            width: 100,
            length: 100,
            height: 100,
            fragile: false,
        }, 0, 0)

        // Make it smaller - should fit in same place
        const result = engine.updatePlacement(placement!.id, {
            width: 50,
            length: 50,
        }, true)

        expect(result.placement).not.toBeNull()
        expect(result.relocated).toBe(false)
        expect(result.placement!.width).toBe(50)
        expect(result.placement!.length).toBe(50)
        expect(result.placement!.x).toBe(0)
        expect(result.placement!.y).toBe(0)
    })

    it('should relocate when enlarged size does not fit at current position', () => {
        const engine = new PackingEngine(container, 10)

        // Place cargo at bottom edge
        const placement = engine.addItemAt({
            id: 'test-1',
            width: 100,
            length: 100,
            height: 100,
            fragile: false,
        }, 0, 7100) // y = 7200 - 100 = 7100

        // Try to make length = 200 (would exceed container)
        const result = engine.updatePlacement(placement!.id, {
            length: 200,
        }, true)

        expect(result.placement).not.toBeNull()
        expect(result.relocated).toBe(true)
        expect(result.placement!.length).toBe(200)
        expect(result.placement!.y).toBe(7000) // 7200 - 200 = 7000
    })

    it('should fail when enlarged size cannot fit anywhere (allowRelocate=false)', () => {
        const engine = new PackingEngine(container, 10)

        const placement = engine.addItemAt({
            id: 'test-1',
            width: 100,
            length: 100,
            height: 100,
            fragile: false,
        }, 0, 7100)

        // Try to enlarge without allowing relocate
        const result = engine.updatePlacement(placement!.id, {
            length: 200,
        }, false) // allowRelocate = false

        expect(result.placement).toBeNull()
        expect(result.relocated).toBe(false)

        // Original placement should be preserved
        const placements = engine.getPlacements()
        expect(placements.length).toBe(1)
        expect(placements[0].length).toBe(100)
    })

    it('should preserve placement order in array', () => {
        const engine = new PackingEngine(container, 10)

        // Add 3 placements
        engine.addItemAt({ id: 'a', width: 100, length: 100, height: 100, fragile: false }, 0, 0)
        engine.addItemAt({ id: 'b', width: 100, length: 100, height: 100, fragile: false }, 200, 0)
        engine.addItemAt({ id: 'c', width: 100, length: 100, height: 100, fragile: false }, 400, 0)

        const placementB = engine.getPlacements()[1]

        // Update middle placement
        engine.updatePlacement(placementB.id, { name: 'Updated B' })

        const placements = engine.getPlacements()
        expect(placements[0].name).toBe('')
        expect(placements[1].name).toBe('Updated B')
        expect(placements[2].name).toBe('')
    })

    it('should handle large size changes with dynamic search radius', () => {
        const engine = new PackingEngine(container, 10)

        // Place large cargo at bottom
        const placement = engine.addItemAt({
            id: 'test-large',
            width: 1000,
            length: 500,
            height: 100,
            fragile: false,
        }, 0, 6700) // y + 500 = 7200

        // Change length from 500 to 1500 (needs y <= 5700, diff = 1000)
        const result = engine.updatePlacement(placement!.id, {
            length: 1500,
        }, true)

        expect(result.placement).not.toBeNull()
        expect(result.relocated).toBe(true)
        expect(result.placement!.length).toBe(1500)
        expect(result.placement!.y).toBe(5700) // 7200 - 1500 = 5700
    })
})

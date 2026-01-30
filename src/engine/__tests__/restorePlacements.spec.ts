import { describe, it, expect } from 'vitest'
import { PackingEngine } from '../PackingEngine'
import type { Placement } from '../types'

describe('restorePlacements', () => {
    const container = { width: 2400, length: 7200, height: 2000 }

    it('should restore placements with exact coordinates', () => {
        const engine = new PackingEngine(container, 10)

        const savedPlacements: Placement[] = [
            {
                id: 'old-id-1',
                name: 'Box A',
                color: '#ff0000',
                width: 100,
                length: 200,
                height: 150,
                x: 500,
                y: 1000,
                z: 0,
                fragile: false,
            },
            {
                id: 'old-id-2',
                name: 'Box B',
                color: '#00ff00',
                width: 300,
                length: 400,
                height: 200,
                x: 700,
                y: 2000,
                z: 0,
                fragile: true,
            },
        ]

        engine.restorePlacements(savedPlacements)

        const restored = engine.getPlacements()
        expect(restored.length).toBe(2)

        // Check first placement
        expect(restored[0].name).toBe('Box A')
        expect(restored[0].x).toBe(500)
        expect(restored[0].y).toBe(1000)
        expect(restored[0].width).toBe(100)
        expect(restored[0].length).toBe(200)

        // Check second placement
        expect(restored[1].name).toBe('Box B')
        expect(restored[1].x).toBe(700)
        expect(restored[1].y).toBe(2000)
        expect(restored[1].fragile).toBe(true)
    })

    it('should generate new IDs for restored placements', () => {
        const engine = new PackingEngine(container, 10)

        const savedPlacements: Placement[] = [
            {
                id: 'original-id-123',
                name: 'Test',
                color: '#000',
                width: 100,
                length: 100,
                height: 100,
                x: 0,
                y: 0,
                z: 0,
                fragile: false,
            },
        ]

        engine.restorePlacements(savedPlacements)

        const restored = engine.getPlacements()
        expect(restored[0].id).not.toBe('original-id-123')
        expect(restored[0].id).toMatch(/^[0-9a-f-]{36}$/) // UUID format
    })

    it('should clear existing placements before restoring', () => {
        const engine = new PackingEngine(container, 10)

        // Add some placements first
        engine.addItemAt({ id: 'existing-1', width: 100, length: 100, height: 100, fragile: false }, 0, 0)
        engine.addItemAt({ id: 'existing-2', width: 100, length: 100, height: 100, fragile: false }, 200, 0)
        expect(engine.getPlacements().length).toBe(2)

        // Restore different placements
        const savedPlacements: Placement[] = [
            {
                id: 'saved-1',
                name: 'Restored',
                color: '#fff',
                width: 50,
                length: 50,
                height: 50,
                x: 1000,
                y: 1000,
                z: 0,
                fragile: false,
            },
        ]

        engine.restorePlacements(savedPlacements)

        const restored = engine.getPlacements()
        expect(restored.length).toBe(1)
        expect(restored[0].name).toBe('Restored')
        expect(restored[0].x).toBe(1000)
    })

    it('should restore stacked placements correctly', () => {
        const engine = new PackingEngine(container, 10)

        // Two placements stacked on top of each other
        const savedPlacements: Placement[] = [
            {
                id: 'bottom',
                name: 'Bottom',
                color: '#000',
                width: 200,
                length: 200,
                height: 100,
                x: 0,
                y: 0,
                z: 0,
                fragile: false,
            },
            {
                id: 'top',
                name: 'Top',
                color: '#fff',
                width: 200,
                length: 200,
                height: 100,
                x: 0,
                y: 0,
                z: 100, // On top of bottom
                fragile: false,
            },
        ]

        engine.restorePlacements(savedPlacements)

        const restored = engine.getPlacements()
        expect(restored.length).toBe(2)
        expect(restored[0].z).toBe(0)
        expect(restored[1].z).toBe(100)
    })

    it('should update height map after restore', () => {
        const engine = new PackingEngine(container, 10)

        const savedPlacements: Placement[] = [
            {
                id: 'test',
                name: 'Test',
                color: '#000',
                width: 100,
                length: 100,
                height: 100,
                x: 0,
                y: 0,
                z: 0,
                fragile: false,
            },
        ]

        engine.restorePlacements(savedPlacements)

        // Try to add another cargo at the same position - should stack
        const added = engine.addItemAt({
            id: 'new',
            width: 100,
            length: 100,
            height: 50,
            fragile: false,
        }, 0, 0)

        expect(added).not.toBeNull()
        expect(added!.z).toBe(100) // Should be on top of restored placement
    })
})

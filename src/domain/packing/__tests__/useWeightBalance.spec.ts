import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useWeightBalance } from '../useWeightBalance'
import type { Container, Placement } from '@/engine/types'

function createPlacement(overrides: Partial<Placement> = {}): Placement {
    return {
        id: 'test-1',
        name: 'Test',
        color: '#ccc',
        width: 100,
        length: 100,
        height: 100,
        x: 0,
        y: 0,
        z: 0,
        fragile: false,
        ...overrides,
    }
}

describe('useWeightBalance', () => {
    const container: Container = { width: 1000, length: 2000, height: 1000 }

    it('returns center position when no placements', () => {
        const placements = ref<Placement[]>([])
        const balance = useWeightBalance(container, placements)

        expect(balance.centerOfGravity.value).toBe(500) // center
        expect(balance.deviation.value).toBe(0)
        expect(balance.status.value).toBe('safe')
        expect(balance.hasWeightedItems.value).toBe(false)
    })

    it('returns center when placements have no weight', () => {
        const placements = ref<Placement[]>([
            createPlacement({ x: 0, width: 200 }), // no weight
        ])
        const balance = useWeightBalance(container, placements)

        expect(balance.hasWeightedItems.value).toBe(false)
        expect(balance.deviation.value).toBe(0)
    })

    it('calculates center of gravity for centered load', () => {
        const placements = ref<Placement[]>([
            createPlacement({
                x: 450,
                width: 100,
                weight: 100,
            }), // center = 450 + 50 = 500
        ])
        const balance = useWeightBalance(container, placements)

        expect(balance.centerOfGravity.value).toBe(500)
        expect(balance.deviation.value).toBe(0)
        expect(balance.status.value).toBe('safe')
    })

    it('calculates deviation for left-heavy load', () => {
        const placements = ref<Placement[]>([
            createPlacement({
                x: 0,
                width: 100,
                weight: 100,
            }), // center = 50
        ])
        const balance = useWeightBalance(container, placements)

        // deviation = (50 - 500) / 500 = -0.9
        expect(balance.centerOfGravity.value).toBe(50)
        expect(balance.deviation.value).toBeCloseTo(-0.9)
        expect(balance.status.value).toBe('danger')
    })

    it('calculates deviation for right-heavy load', () => {
        const placements = ref<Placement[]>([
            createPlacement({
                x: 900,
                width: 100,
                weight: 100,
            }), // center = 950
        ])
        const balance = useWeightBalance(container, placements)

        // deviation = (950 - 500) / 500 = 0.9
        expect(balance.centerOfGravity.value).toBe(950)
        expect(balance.deviation.value).toBeCloseTo(0.9)
        expect(balance.status.value).toBe('danger')
    })

    it('calculates weighted average for multiple items', () => {
        const placements = ref<Placement[]>([
            createPlacement({ id: '1', x: 0, width: 100, weight: 100 }),     // center = 50
            createPlacement({ id: '2', x: 900, width: 100, weight: 100 }),   // center = 950
        ])
        const balance = useWeightBalance(container, placements)

        // CG = (100*50 + 100*950) / 200 = 100000/200 = 500
        expect(balance.centerOfGravity.value).toBe(500)
        expect(balance.deviation.value).toBe(0)
        expect(balance.status.value).toBe('safe')
    })

    it('weights heavier items more in calculation', () => {
        const placements = ref<Placement[]>([
            createPlacement({ id: '1', x: 0, width: 100, weight: 300 }),     // center = 50, heavy
            createPlacement({ id: '2', x: 900, width: 100, weight: 100 }),   // center = 950, light
        ])
        const balance = useWeightBalance(container, placements)

        // CG = (300*50 + 100*950) / 400 = (15000 + 95000) / 400 = 275
        expect(balance.centerOfGravity.value).toBe(275)
        // deviation = (275 - 500) / 500 = -0.45
        expect(balance.deviation.value).toBeCloseTo(-0.45)
        expect(balance.status.value).toBe('danger')
    })

    it('returns warning status for moderate deviation', () => {
        const placements = ref<Placement[]>([
            createPlacement({
                x: 350, // center = 400
                width: 100,
                weight: 100,
            }),
        ])
        const balance = useWeightBalance(container, placements)

        // deviation = (400 - 500) / 500 = -0.2
        expect(balance.deviation.value).toBeCloseTo(-0.2)
        expect(balance.status.value).toBe('warning')
    })

    it('returns safe status for small deviation', () => {
        const placements = ref<Placement[]>([
            createPlacement({
                x: 425, // center = 475
                width: 100,
                weight: 100,
            }),
        ])
        const balance = useWeightBalance(container, placements)

        // deviation = (475 - 500) / 500 = -0.05
        expect(balance.deviation.value).toBeCloseTo(-0.05)
        expect(balance.status.value).toBe('safe')
    })

    it('clamps deviation to [-1, 1] range', () => {
        // This shouldn't happen in practice, but let's ensure safety
        const placements = ref<Placement[]>([
            createPlacement({
                x: -500, // negative position (edge case)
                width: 100,
                weight: 100,
            }),
        ])
        const balance = useWeightBalance(container, placements)

        expect(balance.deviation.value).toBeGreaterThanOrEqual(-1)
        expect(balance.deviation.value).toBeLessThanOrEqual(1)
    })

    it('supports custom thresholds', () => {
        const placements = ref<Placement[]>([
            createPlacement({
                x: 400, // center = 450
                width: 100,
                weight: 100,
            }),
        ])
        // deviation = (450 - 500) / 500 = -0.1

        // With default thresholds (warning: 0.1), this is exactly at boundary
        const balance1 = useWeightBalance(container, placements)
        expect(balance1.status.value).toBe('warning')

        // With custom thresholds (warning: 0.15), should be safe
        const balance2 = useWeightBalance(container, placements, 'lateral', {
            warning: 0.15,
            danger: 0.3,
        })
        expect(balance2.status.value).toBe('safe')
    })

    it('calculates total weight correctly', () => {
        const placements = ref<Placement[]>([
            createPlacement({ id: '1', weight: 100 }),
            createPlacement({ id: '2', weight: 250 }),
            createPlacement({ id: '3', weight: 50 }),
        ])
        const balance = useWeightBalance(container, placements)

        expect(balance.totalWeight.value).toBe(400)
    })
})

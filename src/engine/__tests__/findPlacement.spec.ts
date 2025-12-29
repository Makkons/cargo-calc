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

describe('PackingEngine.findPlacement', () => {
    it('finds placement on empty floor', () => {
        const engine = new PackingEngine(container)

        const p = engine.findPlacement(box, { mode: 'uniform' })

        expect(p).not.toBeNull()
        expect(p!.z).toBe(0)
    })

    it('returns null if no space available', () => {
        const engine = new PackingEngine(container)

        engine.applyPlacementUnsafe({
            id: 'A',
            x: 0,
            y: 0,
            z: 0,
            width: 100,
            length: 100,
            height: 100
        })

        const p = engine.findPlacement(box, { mode: 'uniform' })

        expect(p).toBeNull()
    })

    it('uniform prefers lower placement', () => {
        const engine = new PackingEngine(container)

        engine.applyPlacementUnsafe({
            id: 'A',
            x: 0,
            y: 0,
            z: 0,
            width: 50,
            length: 50,
            height: 40
        })

        const p = engine.findPlacement(box, { mode: 'uniform' })

        expect(p!.z).toBe(0)
    })

    it('dense prefers higher placement', () => {
        const engine = new PackingEngine(container)

        engine.applyPlacementUnsafe({
            id: 'A',
            x: 0,
            y: 0,
            z: 0,
            width: 50,
            length: 50,
            height: 40
        })

        const p = engine.findPlacement(box, { mode: 'dense' })

        expect(p!.z).toBe(40)
    })
})
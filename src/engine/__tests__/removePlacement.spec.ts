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

describe('PackingEngine.removePlacement', () => {

    it('removes single top-level placement', () => {
        const engine = new PackingEngine(container)

        const p = engine.addItem(createBox('box-1'), { mode: 'uniform' })
        expect(engine.getPlacements().length).toBe(1)

        const result = engine.removePlacement(p!.id)

        expect(result).toBe(true)
        expect(engine.getPlacements().length).toBe(0)
    })

    it('does not remove placement if something is above it', () => {
        const engine = new PackingEngine(container)

        const bottom = engine.addItem(createBox('bottom'), { mode: 'dense' })!
        const top = engine.addItem(createBox('top'), { mode: 'dense' })!

        expect(bottom.z).toBe(0)
        expect(top.z).toBe(20)

        const result = engine.removePlacement(bottom.id)

        expect(result).toBe(false)
        expect(engine.getPlacements().length).toBe(2)
    })

    it('allows removing top placement while keeping bottom', () => {
        const engine = new PackingEngine(container)

        const bottom = engine.addItem(createBox('bottom'), { mode: 'dense' })!
        const top = engine.addItem(createBox('top'), { mode: 'dense' })!

        const result = engine.removePlacement(top.id)

        expect(result).toBe(true)
        expect(engine.getPlacements().length).toBe(1)
        expect(engine.getPlacements()[0].id).toBe(bottom.id)
    })

    it('returns false when trying to remove non-existent placement', () => {
        const engine = new PackingEngine(container)

        const result = engine.removePlacement('no-such-id')

        expect(result).toBe(false)
        expect(engine.getPlacements().length).toBe(0)
    })
})
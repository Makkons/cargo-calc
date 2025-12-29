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

describe('PackingEngine.addItem', () => {
    it('adds item on empty floor', () => {
        const engine = new PackingEngine(container)

        const p = engine.addItem(box, { mode: 'uniform' })

        expect(p).not.toBeNull()
        expect(p!.z).toBe(0)
        expect(engine.getPlacements().length).toBe(1)
    })

    it('does not modify state if no space', () => {
        const engine = new PackingEngine(container)

        engine.addItem({
            id: 'big',
            width: 100,
            length: 100,
            height: 100
        }, { mode: 'uniform' })

        const result = engine.addItem(box, { mode: 'uniform' })

        expect(result).toBeNull()
        expect(engine.getPlacements().length).toBe(1)
    })

    it('adds multiple items sequentially', () => {
        const engine = new PackingEngine(container)

        const p1 = engine.addItem(box, { mode: 'uniform' })
        const p2 = engine.addItem(box, { mode: 'uniform' })

        expect(p1).not.toBeNull()
        expect(p2).not.toBeNull()
        expect(engine.getPlacements().length).toBe(2)
    })

    it('dense stacks items vertically', () => {
        const engine = new PackingEngine(container)

        const p1 = engine.addItem(box, { mode: 'dense' })
        const p2 = engine.addItem(box, { mode: 'dense' })

        expect(p1!.z).toBe(0)
        expect(p2!.z).toBe(20)
    })
})
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

describe('undo / redo', () => {

    it('undo after addItem removes placement', () => {
        const engine = new PackingEngine(container)

        engine.addItem(box, { mode: 'uniform' })
        expect(engine.getPlacements().length).toBe(1)

        engine.undo()
        expect(engine.getPlacements().length).toBe(0)
    })

    it('redo restores undone addItem', () => {
        const engine = new PackingEngine(container)

        engine.addItem(box, { mode: 'uniform' })
        engine.undo()
        engine.redo()

        expect(engine.getPlacements().length).toBe(1)
    })

    it('redo stack clears after new action', () => {
        const engine = new PackingEngine(container)

        engine.addItem(box, { mode: 'uniform' })
        engine.undo()

        engine.addItem(box, { mode: 'uniform' })

        expect(engine.canRedo()).toBe(false)
    })

    it('undo restores previous movePlacement', () => {
        const engine = new PackingEngine(container)

        const p = engine.addItem(box, { mode: 'uniform' })!
        engine.movePlacement(p.id, 50, 0)

        engine.undo()

        const restored = engine.getPlacements()[0]
        expect(restored.x).toBe(0)
        expect(restored.y).toBe(0)
    })
})
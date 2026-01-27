import { describe, it, expect } from 'vitest'
import { PackingEngine } from '../PackingEngine'
import { PackingCommandExecutor } from '../commands/PackingCommandExecutor'
import type { Container, ItemTemplate } from '../types'

const container: Container = {
    width: 100,
    length: 100,
    height: 20
}

const box: ItemTemplate = {
    id: 'box',
    width: 50,
    length: 50,
    height: 20
}

describe('PackingCommandExecutor', () => {

    it('executes addItem command', () => {
        const engine = new PackingEngine(container)
        const executor = new PackingCommandExecutor(engine)

        const res = executor.execute({
            type: 'addItem',
            template: box,
            mode: 'uniform'
        })

        expect(res.ok).toBe(true)
        if (res.ok) {
            expect(res.value.placement).toBeDefined()
            expect(res.value.placement!.width).toBe(50)
        }
        expect(engine.getPlacements().length).toBe(1)
    })

    it('returns error when addItem fails', () => {
        const engine = new PackingEngine(container)
        const executor = new PackingCommandExecutor(engine)

        for (let i = 0; i < 4; i++) {
            const res = executor.execute({
                type: 'addItem',
                template: box,
                mode: 'uniform'
            })
            expect(res.ok).toBe(true)
        }

        const res = executor.execute({
            type: 'addItem',
            template: box,
            mode: 'uniform'
        })

        expect(res.ok).toBe(false)
        if (!res.ok) {
            expect(res.error).toBeDefined()
            expect(res.error).toBe('no_space')
        }
    })

    it('supports undo via command', () => {
        const engine = new PackingEngine(container)
        const executor = new PackingCommandExecutor(engine)

        executor.execute({ type: 'addItem', template: box, mode: 'uniform' })
        executor.execute({ type: 'undo' })

        expect(engine.getPlacements().length).toBe(0)
    })
})
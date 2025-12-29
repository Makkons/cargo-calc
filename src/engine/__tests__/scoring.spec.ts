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

describe('scoring++', () => {


    it('dense prefers position with fewer gaps under item', () => {
        const engine = new PackingEngine(container)

        // создаём ступеньку
        engine.addItem({
            id: 'A',
            width: 50,
            length: 50,
            height: 20
        }, { mode: 'uniform' })

        engine.addItem({
            id: 'B',
            width: 50,
            length: 50,
            height: 10
        }, { mode: 'uniform' })

        const p = engine.addItem(box, { mode: 'dense' })!

        // dense должен выбрать верх с меньшей "дырой"
        expect(p.z).toBe(20)
    })
})
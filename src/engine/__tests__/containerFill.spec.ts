import {it, expect, describe} from 'vitest'
import { PackingEngine } from '../PackingEngine'

describe('PackingCommandExecutor', () => {
    it('fills container 100x100x100 with 8 cubes 50x50x50', () => {
        const engine = new PackingEngine({width: 100, length: 100, height: 100}, 50)

        for (let i = 0; i < 8; i++) {
            const res = engine.addItem({
                width: 50, length: 50, height: 50
            })
            expect(res).not.toBeNull()
        }

        expect(engine.getPlacements().length).toBe(8)
    })
})
import {it, expect, describe} from 'vitest'
import { PackingEngine } from '../PackingEngine'

describe('container fill', () => {

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

    it('returns null when item is taller than container', () => {
        const engine = new PackingEngine({width: 100, length: 100, height: 50})

        const result = engine.addItem({
            width: 20,
            length: 20,
            height: 100  // больше высоты контейнера
        })

        expect(result).toBeNull()
        expect(engine.getPlacements().length).toBe(0)
    })

    it('returns null when item is wider than container', () => {
        const engine = new PackingEngine({width: 50, length: 100, height: 100})

        const result = engine.addItem({
            width: 100,  // больше ширины контейнера
            length: 20,
            height: 20
        })

        expect(result).toBeNull()
        expect(engine.getPlacements().length).toBe(0)
    })

    it('returns null when item is longer than container', () => {
        const engine = new PackingEngine({width: 100, length: 50, height: 100})

        const result = engine.addItem({
            width: 20,
            length: 100,  // больше длины контейнера
            height: 20
        })

        expect(result).toBeNull()
        expect(engine.getPlacements().length).toBe(0)
    })

    it('handles item exactly fitting container dimensions', () => {
        const engine = new PackingEngine({width: 100, length: 100, height: 100})

        const result = engine.addItem({
            width: 100,
            length: 100,
            height: 100
        })

        expect(result).not.toBeNull()
        expect(result!.x).toBe(0)
        expect(result!.y).toBe(0)
        expect(result!.z).toBe(0)
        expect(engine.getPlacements().length).toBe(1)
    })

    it('returns null when container is already full', () => {
        const engine = new PackingEngine({width: 100, length: 100, height: 100})

        // Заполняем контейнер полностью
        engine.addItem({
            width: 100,
            length: 100,
            height: 100
        })

        // Пытаемся добавить ещё один предмет
        const result = engine.addItem({
            width: 10,
            length: 10,
            height: 10
        })

        expect(result).toBeNull()
        expect(engine.getPlacements().length).toBe(1)
    })
})
import { describe, it, expect } from 'vitest'
import { HeightMap } from '../HeightMap'
import type { Container, Placement } from '../types'

const container: Container = {
    width: 100,
    length: 100,
    height: 100
}

describe('HeightMap', () => {
    it('returns base height 0 on empty floor', () => {
        const map = new HeightMap(container)

        const cells = map.getCells(0, 0, 50, 50)
        const z = map.getBaseHeight(cells)

        expect(z).toBe(0)
    })

    it('returns correct height after single placement', () => {
        const map = new HeightMap(container)

        const p: Placement = {
            id: 'A',
            x: 0,
            y: 0,
            z: 0,
            width: 50,
            length: 50,
            height: 20
        }

        map.applyPlacement(p)

        const cells = map.getCells(0, 0, 50, 50)
        const z = map.getBaseHeight(cells)

        expect(z).toBe(20)
    })

    it('returns null if support is uneven', () => {
        const map = new HeightMap(container)

        map.applyPlacement({
            id: 'A',
            x: 0,
            y: 0,
            z: 0,
            width: 50,
            length: 50,
            height: 20
        })

        map.applyPlacement({
            id: 'B',
            x: 50,
            y: 0,
            z: 0,
            width: 50,
            length: 50,
            height: 10
        })

        const cells = map.getCells(0, 0, 100, 50)
        const z = map.getBaseHeight(cells)

        expect(z).toBe(null)
    })

    it('allows stacking on flat surface', () => {
        const map = new HeightMap(container)

        map.applyPlacement({
            id: 'A',
            x: 0,
            y: 0,
            z: 0,
            width: 100,
            length: 100,
            height: 30
        })

        const cells = map.getCells(0, 0, 100, 100)
        const z = map.getBaseHeight(cells)

        expect(z).toBe(30)
    })
})
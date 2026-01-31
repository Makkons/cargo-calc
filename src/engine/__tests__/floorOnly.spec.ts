import { describe, it, expect } from 'vitest'
import { PackingEngine } from '../PackingEngine'
import type { Container, ItemTemplate } from '../types'

/**
 * Тесты для режима floorOnly - размещение только на полу
 */

const container: Container = {
    width: 3000,
    length: 3000,
    height: 500
}

describe('floorOnly mode', () => {
    describe('addItemAtOrNear with floorOnly', () => {
        it('не позволяет положить груз на другой груз даже если полностью помещается', () => {
            // Воспроизводит баг: большой груз 1600×1400×100 на полу,
            // маленький груз 1350×830×100 кидается полностью внутрь (не задевая границ).
            // В режиме floorOnly маленький груз должен искать место на полу,
            // а не ложиться сверху на большой.

            const engine = new PackingEngine(container, 10)

            // Кладём большой груз на пол
            const bigBox: ItemTemplate = {
                id: 'big',
                width: 1600,
                length: 1400,
                height: 100
            }
            const p1 = engine.addItemAt(bigBox, 0, 0)
            expect(p1).not.toBeNull()
            expect(p1!.z).toBe(0)

            // Пытаемся положить маленький груз в центр большого
            // Координаты специально выбраны так, чтобы маленький груз
            // полностью помещался на большом (не задевая границ)
            const smallBox: ItemTemplate = {
                id: 'small',
                width: 1350,
                length: 830,
                height: 100
            }

            // Центр большого груза: (800, 700)
            // Левый верхний угол маленького: (800 - 675, 700 - 415) = (125, 285)
            // Это полностью внутри большого: 0 < 125 и 125+1350=1475 < 1600
            const targetX = 125
            const targetY = 285

            // В режиме floorOnly=true груз должен искать место на полу
            const p2 = engine.addItemAtOrNear(smallBox, targetX, targetY, 500, { floorOnly: true })

            expect(p2).not.toBeNull()
            // КЛЮЧЕВОЙ ASSERTION: груз должен быть на полу, а не на высоте 100
            expect(p2!.z).toBe(0)
            // Груз не должен быть в той же позиции, потому что там занято
            // (он должен был найти другое место на полу)
        })

        it('в режиме без floorOnly позволяет класть на другие грузы', () => {
            const engine = new PackingEngine(container, 10)

            const bigBox: ItemTemplate = {
                id: 'big',
                width: 1600,
                length: 1400,
                height: 100
            }
            engine.addItemAt(bigBox, 0, 0)

            const smallBox: ItemTemplate = {
                id: 'small',
                width: 1350,
                length: 830,
                height: 100
            }

            // Без floorOnly груз может лечь на другой груз
            const p2 = engine.addItemAtOrNear(smallBox, 125, 285, 500, { floorOnly: false })

            expect(p2).not.toBeNull()
            // Груз должен быть на высоте большого груза
            expect(p2!.z).toBe(100)
        })

        it('с floorOnly=true груз на границе большого груза размещается на полу', () => {
            const engine = new PackingEngine(container, 10)

            const bigBox: ItemTemplate = {
                id: 'big',
                width: 1000,
                length: 1000,
                height: 100
            }
            engine.addItemAt(bigBox, 0, 0)

            const smallBox: ItemTemplate = {
                id: 'small',
                width: 500,
                length: 500,
                height: 100
            }

            // Кидаем на границу - частично пересекает большой груз
            const p2 = engine.addItemAtOrNear(smallBox, 800, 800, 500, { floorOnly: true })

            expect(p2).not.toBeNull()
            expect(p2!.z).toBe(0)
        })
    })

    describe('addItemAt with floorOnly', () => {
        it('отклоняет размещение на z > 0 когда floorOnly=true', () => {
            const engine = new PackingEngine(container, 10)

            const bigBox: ItemTemplate = { id: 'big', width: 1000, length: 1000, height: 100 }
            engine.addItemAt(bigBox, 0, 0)

            const smallBox: ItemTemplate = { id: 'small', width: 500, length: 500, height: 100 }

            // В позиции (100, 100) груз встал бы на большой (z=100)
            // С floorOnly=true это должно вернуть null
            const result = engine.addItemAt(smallBox, 100, 100, { floorOnly: true })
            expect(result).toBeNull()
        })

        it('разрешает размещение на z=0 когда floorOnly=true', () => {
            const engine = new PackingEngine(container, 10)

            const bigBox: ItemTemplate = { id: 'big', width: 1000, length: 1000, height: 100 }
            engine.addItemAt(bigBox, 0, 0)

            const smallBox: ItemTemplate = { id: 'small', width: 500, length: 500, height: 100 }

            // Позиция рядом с большим грузом - на полу
            const result = engine.addItemAt(smallBox, 1000, 0, { floorOnly: true })
            expect(result).not.toBeNull()
            expect(result!.z).toBe(0)
        })
    })

    describe('findNearestDropPosition with floorOnly', () => {
        it('ищет позицию только на полу', () => {
            const engine = new PackingEngine(container, 10)

            const bigBox: ItemTemplate = { id: 'big', width: 1000, length: 1000, height: 100 }
            const p1 = engine.addItemAt(bigBox, 0, 0)
            expect(p1).not.toBeNull()

            const smallBox: ItemTemplate = { id: 'small', width: 500, length: 500, height: 100 }
            const p2 = engine.addItemAt(smallBox, 1000, 0)
            expect(p2).not.toBeNull()

            // Ищем позицию для маленького груза в центре большого
            const pos = engine.findNearestDropPosition(p2!.id, 250, 250, 500, { floorOnly: true })

            expect(pos).not.toBeNull()
            expect(pos!.z).toBe(0) // Должен найти позицию на полу
        })
    })

    describe('checkMovePosition with floorOnly', () => {
        it('не разрешает переместить груз на другой груз когда floorOnly=true', () => {
            const engine = new PackingEngine(container, 10)

            const bigBox: ItemTemplate = { id: 'big', width: 1000, length: 1000, height: 100 }
            engine.addItemAt(bigBox, 0, 0)

            const smallBox: ItemTemplate = { id: 'small', width: 500, length: 500, height: 100 }
            const p2 = engine.addItemAt(smallBox, 1000, 0)

            // Пробуем переместить на большой груз
            const result = engine.canMoveToPosition(p2!.id, 250, 250, { floorOnly: true })

            // Должен вернуть null, т.к. там z=100
            expect(result).toBeNull()
        })

        it('разрешает переместить груз на другой груз когда floorOnly=false', () => {
            const engine = new PackingEngine(container, 10)

            const bigBox: ItemTemplate = { id: 'big', width: 1000, length: 1000, height: 100 }
            engine.addItemAt(bigBox, 0, 0)

            const smallBox: ItemTemplate = { id: 'small', width: 500, length: 500, height: 100 }
            const p2 = engine.addItemAt(smallBox, 1000, 0)

            const result = engine.canMoveToPosition(p2!.id, 250, 250, { floorOnly: false })

            expect(result).toBe(100) // z = высота большого груза
        })
    })

    describe('movePlacement with floorOnly', () => {
        it('не перемещает груз на другой груз когда floorOnly=true', () => {
            const engine = new PackingEngine(container, 10)

            const bigBox: ItemTemplate = { id: 'big', width: 1000, length: 1000, height: 100 }
            engine.addItemAt(bigBox, 0, 0)

            const smallBox: ItemTemplate = { id: 'small', width: 500, length: 500, height: 100 }
            const p2 = engine.addItemAt(smallBox, 1000, 0)

            // Пробуем переместить на большой груз с floorOnly=true
            const result = engine.movePlacement(p2!.id, 250, 250, { floorOnly: true })

            // Должен вернуть null - перемещение запрещено
            expect(result).toBeNull()
            // Груз должен остаться на месте
            const current = engine.getPlacementById(p2!.id)
            expect(current!.x).toBe(1000)
            expect(current!.y).toBe(0)
        })
    })
})
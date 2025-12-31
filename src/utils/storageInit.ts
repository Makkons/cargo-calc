import { loadFromStorage, saveToStorage } from '@/utils/storage'
import type { CargoTemplate } from '@/data/templates/types'
import type { ContainerTemplate } from '@/data/containers/types'

const DEMO_CARGO_TEMPLATES: CargoTemplate[] = [
    {
        id: '8c7a341e-0dea-4636-8731-f1227d52f4e4',
        name: 'A',
        width: 50,
        length: 100,
        height: 50,
        color: '#604d4d',
        weight: 20,
        fragile: false,
    },
    {
        id: '5ded1b64-6e49-46a6-859e-300a1b2a0120',
        name: 'B',
        width: 50,
        length: 50,
        height: 50,
        color: '#9818dc',
        weight: 30,
        fragile: false,
    },
    {
        id: '5ded1b64-6e49-46a6-859e-300a1b2a0120',
        name: 'C',
        width: 10,
        length: 10,
        height: 10,
        color: '#2fdc18',
        weight: 5,
        fragile: false,
    },
]

const DEMO_CONTAINER_TEMPLATES: ContainerTemplate[] = [
    {
        id: 'a607c7f3-091b-4df4-a75a-781c4846e8e4',
        name: 'Машина',
        container: {
            width: 100,
            length: 100,
            height: 100,
        },
        maxWeight: 3400,
    },
]

export function initDemoStorage() {
    const cargo = loadFromStorage<CargoTemplate[]>('cargo-templates', [])
    if (!Array.isArray(cargo) || cargo.length === 0) {
        saveToStorage('cargo-templates', DEMO_CARGO_TEMPLATES)
    }

    const containers = loadFromStorage<ContainerTemplate[]>(
        'container-templates',
        []
    )
    if (!Array.isArray(containers) || containers.length === 0) {
        saveToStorage('container-templates', DEMO_CONTAINER_TEMPLATES)
    }
}
import { storageService } from '@/services/storage'
import { STORAGE_KEYS } from '@/constants/storage'
import type { CargoTemplate } from '@/data/templates/types'
import type { ContainerTemplate } from '@/data/containers/types'
import type { PackingHistoryItem } from '@/data/history/types'

const DEMO_CARGO_TEMPLATES: CargoTemplate[] = [
    {
        id: '8c7a341e-0dea-4636-8731-f1227d52f4e1',
        name: 'Груз, 20 шт (10 кг)',
        width: 830,
        length: 1350,
        height: 100,
        color: '#31961a',
        weight: 10,
        fragile: false,
    },
    {
        id: '8c7a341e-0dea-4636-8731-f1227d52f4e2',
        name: 'Груз, 20 шт (15 кг)',
        width: 830,
        length: 1350,
        height: 100,
        color: '#237810',
        weight: 15,
        fragile: false,
    },
    {
        id: '8c7a341e-0dea-4636-8731-f1227d52f4e3',
        name: 'Груз, 20 шт (20 кг)',
        width: 830,
        length: 1350,
        height: 100,
        color: '#164e09',
        weight: 20,
        fragile: false,
    },
    {
        id: '8c7a341e-0dea-4636-8731-f1227d52f4e4',
        name: 'Груз, 14 шт (25 кг)',
        width: 830,
        length: 1300,
        height: 100,
        color: '#184baa',
        weight: 25,
        fragile: false,
    },
    {
        id: '8c7a341e-0dea-4636-8731-f1227d52f4e5',
        name: 'Груз, 14 шт (30 кг)',
        width: 980,
        length: 1300,
        height: 100,
        color: '#123d8e',
        weight: 30,
        fragile: false,
    },
    {
        id: '8c7a341e-0dea-4636-8731-f1227d52f4e6',
        name: 'Груз, 14 шт (35 кг)',
        width: 1080,
        length: 1300,
        height: 100,
        color: '#0c2e6e',
        weight: 35,
        fragile: false,
    },
    {
        id: '8c7a341e-0dea-4636-8731-f1227d52f4e7',
        name: 'Груз, 14 шт (40 кг)',
        width: 1180,
        length: 1430,
        height: 100,
        color: '#09265a',
        weight: 40,
        fragile: false,
    },
    {
        id: '8c7a341e-0dea-4636-8731-f1227d52f4e8',
        name: 'Груз, 14 шт (45 кг)',
        width: 1280,
        length: 1430,
        height: 100,
        color: '#07204e',
        weight: 45,
        fragile: false,
    },
    {
        id: '8c7a341e-0dea-4636-8731-f1227d52f4e9',
        name: 'Груз, 9 шт (55 кг)',
        width: 1280,
        length: 1220,
        height: 100,
        color: '#98172f',
        weight: 55,
        fragile: false,
    },
    {
        id: '8c7a341e-0dea-4636-8731-f1227d52f4ea',
        name: 'Груз, 9 шт (70 кг)',
        width: 1600,
        length: 1400,
        height: 100,
        color: '#750e21',
        weight: 70,
        fragile: false,
    },
    {
        id: '8c7a341e-0dea-4636-8731-f1227d52f4eb',
        name: 'Груз, 9 шт (80 кг)',
        width: 1800,
        length: 1400,
        height: 100,
        color: '#67091a',
        weight: 80,
        fragile: false,
    },
]

const DEMO_CONTAINER_TEMPLATES: ContainerTemplate[] = [
    {
        id: 'a607c7f3-091b-4df4-a75a-781c4846e8e4',
        name: 'Машина',
        container: {
            width: 2400,
            length: 7200,
            height: 2000
        },
        maxWeight: 3400,
    },
]

/**
 * Миграция данных из localStorage в IndexedDB.
 * Выполняется один раз, после чего данные в localStorage удаляются.
 */
async function migrateFromLocalStorage(): Promise<void> {
    const migrationKey = 'indexeddb-migration-done'

    // Уже мигрировали?
    if (localStorage.getItem(migrationKey)) {
        return
    }

    try {
        // Миграция cargo templates
        const cargoRaw = localStorage.getItem(STORAGE_KEYS.CARGO_TEMPLATES)
        if (cargoRaw) {
            const cargo = JSON.parse(cargoRaw) as CargoTemplate[]
            if (Array.isArray(cargo) && cargo.length > 0) {
                await storageService.putMany('cargoTemplates', cargo)
            }
        }

        // Миграция container templates
        const containersRaw = localStorage.getItem(STORAGE_KEYS.CONTAINER_TEMPLATES)
        if (containersRaw) {
            const containers = JSON.parse(containersRaw) as ContainerTemplate[]
            if (Array.isArray(containers) && containers.length > 0) {
                await storageService.putMany('containerTemplates', containers)
            }
        }

        // Миграция history
        const historyRaw = localStorage.getItem(STORAGE_KEYS.PACKING_HISTORY)
        if (historyRaw) {
            const history = JSON.parse(historyRaw) as PackingHistoryItem[]
            if (Array.isArray(history) && history.length > 0) {
                await storageService.putMany('packingHistory', history)
            }
        }

        // Помечаем миграцию как выполненную
        localStorage.setItem(migrationKey, 'true')

        // Удаляем старые данные из localStorage
        localStorage.removeItem(STORAGE_KEYS.CARGO_TEMPLATES)
        localStorage.removeItem(STORAGE_KEYS.CONTAINER_TEMPLATES)
        localStorage.removeItem(STORAGE_KEYS.PACKING_HISTORY)

        console.log('[Storage] Migration from localStorage completed')
    } catch (e) {
        console.error('[Storage] Migration failed:', e)
    }
}

/**
 * Инициализация демо-данных если хранилище пустое
 */
async function initDemoData(): Promise<void> {
    const cargoEmpty = await storageService.isEmpty('cargoTemplates')
    if (cargoEmpty) {
        await storageService.putMany('cargoTemplates', DEMO_CARGO_TEMPLATES)
        console.log('[Storage] Demo cargo templates initialized')
    }

    const containersEmpty = await storageService.isEmpty('containerTemplates')
    if (containersEmpty) {
        await storageService.putMany('containerTemplates', DEMO_CONTAINER_TEMPLATES)
        console.log('[Storage] Demo container templates initialized')
    }
}

/**
 * Основная функция инициализации хранилища.
 * Вызывается при старте приложения.
 */
export async function initStorage(): Promise<void> {
    await migrateFromLocalStorage()
    await initDemoData()
}

// Legacy export для обратной совместимости
export const initDemoStorage = initStorage
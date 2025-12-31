import type { CargoTemplate } from '@/data/templates/types'
import type { ContainerTemplate } from '@/data/containers/types'

export const DEMO_CARGO_TEMPLATES: CargoTemplate[] = [
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
]

export const DEMO_CONTAINER_TEMPLATES: ContainerTemplate[] = [
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
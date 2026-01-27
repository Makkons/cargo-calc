import type { Container } from '@/engine/types'

export interface ContainerTemplate {
    id: string
    name: string
    container: Container
    maxWeight?: number
}

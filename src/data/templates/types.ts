
export interface CargoTemplate {
    id: string
    name: string

    width: number
    length: number
    height: number

    weight?: number
    color: string

    fragile: boolean
}
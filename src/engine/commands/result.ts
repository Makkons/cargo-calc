import type { Placement } from '../types'

export type CommandResult =
    | { ok: true; placement?: Placement }
    | { ok: false; reason: string }
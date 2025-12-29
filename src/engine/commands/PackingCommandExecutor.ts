import type { PackingEngine } from '../PackingEngine'
import type { PackingCommand } from './types'
import type { CommandResult } from './result'

export class PackingCommandExecutor {
    constructor(private engine: PackingEngine) {}

    execute(cmd: PackingCommand): CommandResult {
        switch (cmd.type) {

            case 'addItem': {
                const placement = this.engine.addItem(
                    cmd.template,
                    { mode: cmd.mode }
                )

                if (!placement) {
                    return { ok: false, reason: 'No space to place item' }
                }

                return { ok: true, placement }
            }

            case 'removePlacement': {
                const success = this.engine.removePlacement(cmd.placementId)
                if (!success) {
                    return { ok: false, reason: 'Cannot remove placement' }
                }
                return { ok: true }
            }

            case 'movePlacement': {
                const success = this.engine.movePlacement(
                    cmd.placementId,
                    cmd.x,
                    cmd.y
                )
                if (!success) {
                    return { ok: false, reason: 'Cannot move placement' }
                }
                return { ok: true }
            }

            case 'undo': {
                if (!this.engine.undo()) {
                    return { ok: false, reason: 'Nothing to undo' }
                }
                return { ok: true }
            }

            case 'redo': {
                if (!this.engine.redo()) {
                    return { ok: false, reason: 'Nothing to redo' }
                }
                return { ok: true }
            }

            default:
                return { ok: false, reason: 'Unknown command' }
        }
    }
}
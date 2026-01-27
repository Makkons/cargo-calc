import type { PackingEngine } from '../PackingEngine'
import type { PackingCommand } from './types'
import { ok, err, type CommandResult } from '../result'

/**
 * PackingCommandExecutor — выполняет команды над PackingEngine
 *
 * Паттерн Command: инкапсулирует операции в объекты команд.
 * Преимущества:
 * - Единый интерфейс для всех операций
 * - Типизированные результаты с ошибками
 * - Легко добавить логирование, отмену, повтор
 */
export class PackingCommandExecutor {
    constructor(private engine: PackingEngine) {}

    execute(cmd: PackingCommand): CommandResult {
        switch (cmd.type) {
            case 'addItem': {
                const placement = this.engine.addItem(
                    cmd.template,
                    { mode: cmd.mode, floorOnly: cmd.floorOnly }
                )

                if (!placement) {
                    return err('no_space')
                }

                return ok({ placement })
            }

            case 'removePlacement': {
                const success = this.engine.removePlacement(cmd.placementId)
                if (!success) {
                    return err('has_items_above')
                }
                return ok({})
            }

            case 'movePlacement': {
                const moved = this.engine.movePlacement(
                    cmd.placementId,
                    cmd.x,
                    cmd.y
                )
                if (!moved) {
                    return err('no_space')
                }
                return ok({ placement: moved })
            }

            case 'undo': {
                if (!this.engine.undo()) {
                    return err('nothing_to_undo')
                }
                return ok({})
            }

            case 'redo': {
                if (!this.engine.redo()) {
                    return err('nothing_to_redo')
                }
                return ok({})
            }

            default:
                return err('unknown_command')
        }
    }
}

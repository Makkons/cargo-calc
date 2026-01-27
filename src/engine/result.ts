/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RESULT TYPES — типизированные результаты операций
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Паттерн Result из функционального программирования.
 * Вместо исключений функции возвращают объект с результатом или ошибкой.
 *
 * Преимущества:
 * - Явная обработка ошибок в типах
 * - Нет неожиданных исключений
 * - Автокомплит для всех возможных ошибок
 */

// ═══════════════════════════════════════════════════════════════════════════
// GENERIC RESULT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Успешный результат с данными типа T
 */
export interface Ok<T> {
    readonly ok: true
    readonly value: T
}

/**
 * Ошибка с кодом типа E
 */
export interface Err<E> {
    readonly ok: false
    readonly error: E
}

/**
 * Результат операции: либо успех с данными T, либо ошибка E
 */
export type Result<T, E> = Ok<T> | Err<E>

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCTORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Создаёт успешный результат
 *
 * @example
 * const result = ok({ x: 10, y: 20 })
 * // result.ok === true
 * // result.value === { x: 10, y: 20 }
 */
export function ok<T>(value: T): Ok<T> {
    return { ok: true, value }
}

/**
 * Создаёт результат с ошибкой
 *
 * @example
 * const result = err('not_found')
 * // result.ok === false
 * // result.error === 'not_found'
 */
export function err<E>(error: E): Err<E> {
    return { ok: false, error }
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Проверяет, что результат успешен
 *
 * @example
 * const result = addItem(template)
 * if (isOk(result)) {
 *     console.log(result.value) // TypeScript знает что value существует
 * }
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
    return result.ok === true
}

/**
 * Проверяет, что результат — ошибка
 *
 * @example
 * const result = addItem(template)
 * if (isErr(result)) {
 *     console.log(result.error) // TypeScript знает что error существует
 * }
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
    return result.ok === false
}

// ═══════════════════════════════════════════════════════════════════════════
// DOMAIN-SPECIFIC ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ошибки валидации размещения
 */
export type PlacementError =
    | 'position_negative'      // x или y < 0
    | 'exceeds_width'          // выходит за ширину контейнера
    | 'exceeds_length'         // выходит за длину контейнера
    | 'exceeds_height'         // выходит за высоту контейнера
    | 'uneven_surface'         // неровная поверхность (нельзя поставить)
    | 'fragile_below'          // под грузом хрупкий предмет
    | 'no_space'               // нет места для размещения
    | 'not_found'              // груз не найден
    | 'locked'                 // груз заблокирован
    | 'has_items_above'        // на грузе лежат другие грузы

/**
 * Ошибки команд
 */
export type CommandError =
    | PlacementError
    | 'nothing_to_undo'        // нечего отменять
    | 'nothing_to_redo'        // нечего повторять
    | 'unknown_command'        // неизвестная команда

// ═══════════════════════════════════════════════════════════════════════════
// DOMAIN-SPECIFIC RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════

import type { Placement } from './types'

/**
 * Результат валидации позиции
 */
export type ValidationResult = Result<{ z: number }, PlacementError>

/**
 * Результат добавления груза
 */
export type AddItemResult = Result<Placement, PlacementError>

/**
 * Результат удаления груза
 */
export type RemoveResult = Result<void, PlacementError>

/**
 * Результат перемещения груза
 */
export type MoveResult = Result<Placement, PlacementError>

/**
 * Результат команды
 */
export type CommandResult = Result<{ placement?: Placement }, CommandError>

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Извлекает значение из Result или возвращает default
 *
 * @example
 * const z = unwrapOr(validatePosition(template, x, y), { z: 0 })
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result.ok ? result.value : defaultValue
}

/**
 * Применяет функцию к значению Result, если он успешен
 *
 * @example
 * const doubled = map(ok(5), x => x * 2) // Ok(10)
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    return result.ok ? ok(fn(result.value)) : result
}

/**
 * Получает человекочитаемое сообщение об ошибке
 */
export function getErrorMessage(error: PlacementError | CommandError): string {
    const messages: Record<PlacementError | CommandError, string> = {
        position_negative: 'Позиция не может быть отрицательной',
        exceeds_width: 'Груз выходит за ширину контейнера',
        exceeds_length: 'Груз выходит за длину контейнера',
        exceeds_height: 'Груз выходит за высоту контейнера',
        uneven_surface: 'Неровная поверхность для размещения',
        fragile_below: 'Нельзя ставить на хрупкий груз',
        no_space: 'Нет места для размещения',
        not_found: 'Груз не найден',
        locked: 'Груз заблокирован',
        has_items_above: 'На грузе лежат другие грузы',
        nothing_to_undo: 'Нечего отменять',
        nothing_to_redo: 'Нечего повторять',
        unknown_command: 'Неизвестная команда',
    }

    return messages[error] ?? error
}

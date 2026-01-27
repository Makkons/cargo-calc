/**
 * Проверка, запущено ли приложение в Tauri (десктоп)
 */
export function isTauri(): boolean {
    return '__TAURI_INTERNALS__' in window
}

/**
 * Получить информацию о платформе
 */
export function getPlatform(): 'tauri' | 'web' {
    return isTauri() ? 'tauri' : 'web'
}
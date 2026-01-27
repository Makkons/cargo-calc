import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration: number
}

const toasts = ref<ToastMessage[]>([])

let counter = 0

function show(message: string, type: ToastType = 'info', duration = 4000) {
  const id = `toast-${++counter}`

  toasts.value.push({ id, type, message, duration })

  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }

  return id
}

function remove(id: string) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

function update(id: string, message: string, type: ToastType, duration = 4000) {
  const toast = toasts.value.find(t => t.id === id)
  if (toast) {
    toast.message = message
    toast.type = type
    toast.duration = duration

    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
  }
}

function success(message: string, duration?: number) {
  return show(message, 'success', duration)
}

function error(message: string, duration?: number) {
  return show(message, 'error', duration)
}

function warning(message: string, duration?: number) {
  return show(message, 'warning', duration)
}

function info(message: string, duration?: number) {
  return show(message, 'info', duration)
}

function loading(message: string) {
  return show(message, 'loading', 0) // duration=0 — не исчезает автоматически
}

/**
 * Показывает loading toast, выполняет promise, затем показывает success/error
 */
async function promise<T>(
  fn: () => Promise<T>,
  messages: {
    loading: string
    success: string
    error: string
  }
): Promise<T> {
  const id = loading(messages.loading)

  try {
    const result = await fn()
    update(id, messages.success, 'success')
    return result
  } catch (err) {
    update(id, messages.error, 'error')
    throw err
  }
}

export function useToast() {
  return {
    toasts,
    show,
    remove,
    update,
    success,
    error,
    warning,
    info,
    loading,
    promise,
  }
}

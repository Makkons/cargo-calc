import { ref, readonly } from 'vue'
import type { CargoTemplate } from '@/data/templates/types'

/**
 * Глобальное состояние для drag-and-drop шаблонов грузов
 */

const draggingTemplate = ref<CargoTemplate | null>(null)
const isDragging = ref(false)
const isOverContainer = ref(false)
const hideGhost = ref(false)

export function useDragTemplate() {
  function startDrag(template: CargoTemplate) {
    draggingTemplate.value = template
    isDragging.value = true
    isOverContainer.value = false
    hideGhost.value = false
  }

  function stopDrag() {
    draggingTemplate.value = null
    isDragging.value = false
    isOverContainer.value = false
    hideGhost.value = false
  }

  function setOverContainer(value: boolean) {
    isOverContainer.value = value
  }

  function setHideGhost(value: boolean) {
    hideGhost.value = value
  }

  return {
    draggingTemplate: readonly(draggingTemplate),
    isDragging: readonly(isDragging),
    isOverContainer: readonly(isOverContainer),
    hideGhost: readonly(hideGhost),
    startDrag,
    stopDrag,
    setOverContainer,
    setHideGhost,
  }
}
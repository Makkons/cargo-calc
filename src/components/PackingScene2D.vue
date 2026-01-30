<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import type { Placement, Container } from '@/engine/types'
import type { CargoTemplate } from '@/data/templates/types'
import { SnapHelper } from '@/engine/SnapHelper'
import { useDragTemplate } from '@/composables/useDragTemplate'
import { useHighlightedPlacement } from '@/composables/useHighlightedPlacement'
import Car from '@/assets/images/car.png'

const { draggingTemplate, isDragging, stopDrag, setHideGhost } = useDragTemplate()
const { highlightedId, setHighlighted } = useHighlightedPlacement()

/* =========================
   PROPS
========================= */

import type { MoveCheckResult, DropPosition } from '@/domain/packing/usePackingOperations'

const props = defineProps<{
  container: Container
  placements: Placement[]
  canModify: (id: string) => boolean
  onMove: (id: string, x: number, y: number) => Placement | null
  onRemove: (id: string) => void
  onRotate: (id: string) => void
  onDropTemplate: (template: CargoTemplate, x: number, y: number) => boolean
  checkMovePosition: (id: string, x: number, y: number) => MoveCheckResult
  findDropPosition: (id: string, x: number, y: number) => DropPosition | null
  step: number
}>()

/* =========================
   REFS
========================= */

const containerEl = ref<HTMLDivElement | null>(null)

/** Триггер для пересчёта scale при resize */
const resizeKey = ref(0)
let resizeObserver: ResizeObserver | null = null
let resizeTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Состояние drag-and-drop для Free Drag подхода.
 * Груз визуально следует за курсором через CSS transform,
 * реальное перемещение происходит только при mouseup.
 */
const dragState = ref<{
  id: string
  startX: number        // Начальная позиция груза
  startY: number
  offsetX: number       // Смещение курсора от верхнего левого угла
  offsetY: number
  currentX: number      // Текущая визуальная позиция (snapped)
  currentY: number
  valid: boolean        // Валидна ли текущая позиция
  snappedX: boolean     // Прилип ли по X к грани другого груза
  snappedY: boolean     // Прилип ли по Y к грани другого груза
} | null>(null)

/**
 * SnapHelper для притягивания к граням других грузов.
 * Создаётся один раз при монтировании (container и step не меняются).
 */
let snapHelper: SnapHelper | null = null
function getSnapHelper(): SnapHelper {
  if (!snapHelper) {
    snapHelper = new SnapHelper(props.container, props.step, 30, 45)
  }
  return snapHelper
}

/* =========================
   UTILS
========================= */

function snapToGrid(value: number): number {
  return Math.round(value / props.step) * props.step
}

function getPlacement(id: string): Placement | null {
  return props.placements.find(p => p.id === id) ?? null
}

/* =========================
   DRAG LOGIC (Free Drag)

   Принцип: груз визуально следует за курсором через CSS transform.
   Валидация происходит постоянно для индикации цветом.
   Реальное перемещение — только при mouseup.
========================= */

function onMouseDown(p: Placement, e: MouseEvent) {
  if (!props.canModify(p.id)) return
  if (!containerEl.value) return

  const rect = containerEl.value.getBoundingClientRect()

  // Вычисляем точку клика в координатах контейнера
  const clickX = (e.clientX - rect.left) / scale.value
  const clickY = (e.clientY - rect.top) / scale.value

  // Инициализируем состояние drag
  dragState.value = {
    id: p.id,
    startX: p.x,
    startY: p.y,
    offsetX: clickX - p.x,
    offsetY: clickY - p.y,
    currentX: p.x,
    currentY: p.y,
    valid: true,
    snappedX: false,
    snappedY: false,
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)

  e.preventDefault()
}

const scale = computed(() => {
  // resizeKey триггерит пересчёт при resize окна
  void resizeKey.value
  if (!containerEl.value) return 1
  return containerEl.value.clientWidth / props.container.width
})

function onMouseMove(e: MouseEvent) {
  if (!dragState.value || !containerEl.value) return

  const rect = containerEl.value.getBoundingClientRect()
  const p = getPlacement(dragState.value.id)
  if (!p) return

  // Вычисляем позицию курсора и вычитаем offset
  const rawX = (e.clientX - rect.left) / scale.value - dragState.value.offsetX
  const rawY = (e.clientY - rect.top) / scale.value - dragState.value.offsetY

  // Clamp к границам контейнера
  const clampedX = Math.max(0, Math.min(rawX, props.container.width - p.width))
  const clampedY = Math.max(0, Math.min(rawY, props.container.length - p.length))

  // Применяем snap к граням других грузов (приоритет над сеткой)
  const snapped = getSnapHelper().snap(
    clampedX,
    clampedY,
    p,
    props.placements,
    { snappedX: dragState.value.snappedX, snappedY: dragState.value.snappedY }
  )

  const targetX = snapped.x
  const targetY = snapped.y

  // Проверяем валидность БЕЗ реального перемещения
  const check = props.checkMovePosition(dragState.value.id, targetX, targetY)

  // Обновляем визуальное состояние
  dragState.value.currentX = targetX
  dragState.value.currentY = targetY
  dragState.value.valid = check.valid
  dragState.value.snappedX = snapped.snappedX
  dragState.value.snappedY = snapped.snappedY
}

function onMouseUp() {
  if (!dragState.value) {
    cleanupDrag()
    return
  }

  const { id, startX, startY, currentX, currentY, valid } = dragState.value

  // Если позиция не изменилась — ничего не делаем
  if (currentX === startX && currentY === startY) {
    cleanupDrag()
    return
  }

  if (valid) {
    // Позиция валидна — перемещаем напрямую
    props.onMove(id, currentX, currentY)
  } else {
    // Позиция невалидна — ищем ближайшую валидную
    const drop = props.findDropPosition(id, currentX, currentY)
    if (drop) {
      props.onMove(id, drop.x, drop.y)
    }
    // Если не нашли — груз остаётся на месте (ничего не делаем)
  }

  cleanupDrag()
}

function cleanupDrag() {
  dragState.value = null
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

/* =========================
   RESIZE OBSERVER
========================= */

onMounted(() => {
  if (!containerEl.value) return

  resizeObserver = new ResizeObserver(() => {
    // Debounce: пересчёт scale через 150ms после последнего resize
    if (resizeTimeout) {
      clearTimeout(resizeTimeout)
    }
    resizeTimeout = setTimeout(() => {
      resizeKey.value++
    }, 150)
  })

  resizeObserver.observe(containerEl.value)
})

/* =========================
   TEMPLATE DRAG PREVIEW
========================= */

const templatePreview = ref<{
  x: number
  y: number
  width: number
  length: number
  color: string
  valid: boolean
} | null>(null)

/** Состояние snap для template preview */
const templateSnapState = ref({ snappedX: false, snappedY: false })

function onGlobalMouseMove(e: MouseEvent) {
  if (!isDragging.value || !draggingTemplate.value || !containerEl.value) return

  const rect = containerEl.value.getBoundingClientRect()
  const template = draggingTemplate.value

  // Проверяем, находится ли курсор над контейнером
  const isOverContainer =
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom

  if (!isOverContainer) {
    templatePreview.value = null
    templateSnapState.value = { snappedX: false, snappedY: false }
    setHideGhost(false)
    return
  }

  // Курсор над сценой — скрываем глобальный ghost
  setHideGhost(true)

  // Вычисляем позицию (центрируем груз под курсором)
  const rawX = (e.clientX - rect.left) / scale.value - template.width / 2
  const rawY = (e.clientY - rect.top) / scale.value - template.length / 2

  // Clamp к границам
  const clampedX = Math.max(0, Math.min(rawX, props.container.width - template.width))
  const clampedY = Math.max(0, Math.min(rawY, props.container.length - template.length))

  // Создаём временный placement для snap
  const tempPlacement: Placement = {
    id: '__template_preview__',
    templateId: template.id,
    name: template.name,
    color: template.color,
    weight: template.weight,
    width: template.width,
    length: template.length,
    height: template.height,
    x: clampedX,
    y: clampedY,
    z: 0,
    fragile: template.fragile,
    locked: false,
  }

  // Применяем snap к граням других грузов
  const snapped = getSnapHelper().snap(
    clampedX,
    clampedY,
    tempPlacement,
    props.placements,
    templateSnapState.value
  )

  templateSnapState.value = { snappedX: snapped.snappedX, snappedY: snapped.snappedY }

  // Проверяем валидность (границы контейнера)
  const valid =
    snapped.x >= 0 &&
    snapped.y >= 0 &&
    snapped.x + template.width <= props.container.width &&
    snapped.y + template.length <= props.container.length

  templatePreview.value = {
    x: snapped.x,
    y: snapped.y,
    width: template.width,
    length: template.length,
    color: template.color,
    valid,
  }
}

function onGlobalMouseUp() {
  if (!isDragging.value || !draggingTemplate.value) return

  if (templatePreview.value && templatePreview.value.valid) {
    const success = props.onDropTemplate(
      draggingTemplate.value,
      templatePreview.value.x,
      templatePreview.value.y
    )
    // Если не удалось разместить — preview останется для feedback
    if (!success) {
      templatePreview.value = { ...templatePreview.value, valid: false }
    }
  }

  templatePreview.value = null
  templateSnapState.value = { snappedX: false, snappedY: false }
  setHideGhost(false)
  stopDrag()
}

// Следим за началом drag и подключаем глобальные обработчики
watch(isDragging, (dragging) => {
  if (dragging) {
    window.addEventListener('mousemove', onGlobalMouseMove)
    window.addEventListener('mouseup', onGlobalMouseUp)
  } else {
    window.removeEventListener('mousemove', onGlobalMouseMove)
    window.removeEventListener('mouseup', onGlobalMouseUp)
    setHideGhost(false)
  }
})

/* =========================
   CLEANUP
========================= */

onBeforeUnmount(() => {
  // Drag cleanup
  cleanupDrag()

  // Resize observer cleanup
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
    resizeTimeout = null
  }

  // Template drag cleanup
  window.removeEventListener('mousemove', onGlobalMouseMove)
  window.removeEventListener('mouseup', onGlobalMouseUp)

  // Reset snapHelper
  snapHelper = null
})

/* =========================
   STYLES
========================= */

function itemStyle(p: Placement) {
  const base: Record<string, string> = {
    left: p.x * scale.value + 'px',
    top: p.y * scale.value + 'px',
    width: p.width * scale.value + 'px',
    height: p.length * scale.value + 'px',
    background: p.color || '#9e9e9e',
    border: '1px solid #333',
  }

  // Если это перетаскиваемый груз — добавляем transform для визуального смещения
  if (dragState.value && dragState.value.id === p.id) {
    const dx = (dragState.value.currentX - p.x) * scale.value
    const dy = (dragState.value.currentY - p.y) * scale.value
    base.transform = `translate(${dx}px, ${dy}px)`
    base.zIndex = '100'
  }

  return base
}

/**
 * Вычисляем оптимальный размер шрифта для лейбла внутри груза.
 * Минимум 6px, максимум 14px.
 */
function labelFontSize(p: Placement): number {
  const widthPx = p.width * scale.value
  const heightPx = p.length * scale.value

  // Берём меньшую сторону и делим на 5 для читаемости
  const basedOnSize = Math.min(widthPx, heightPx) / 5

  // Ограничиваем в пределах 6-14px
  return Math.max(6, Math.min(12, basedOnSize))
}

/**
 * Определяем контрастный цвет текста (белый или чёрный) на основе фона.
 */
function getContrastColor(hexColor: string | undefined): string {
  if (!hexColor) return '#000000'

  // Убираем # если есть
  const hex = hexColor.replace('#', '')

  // Парсим RGB
  const r = parseInt(hex.substring(0, 2), 16) || 0
  const g = parseInt(hex.substring(2, 4), 16) || 0
  const b = parseInt(hex.substring(4, 6), 16) || 0

  // Вычисляем яркость (формула W3C)
  const luminance = (r * 299 + g * 587 + b * 114) / 1000

  return luminance > 128 ? '#000000' : '#ffffff'
}

</script>

<template>
  <div class="truck-wrapper">
    <!-- КАБИНА -->
    <div class="truck-cabin" :style="{ backgroundImage: `url(${Car})` }">
    </div>

    <!-- КОНТЕЙНЕР -->
    <div
        ref="containerEl"
        class="scene scene2D"
        :class="{ 'scene--drag-over': isDragging }"
        :style="{
      aspectRatio: `${container.width} / ${container.length}`,
    }"
    >
    <!-- GRID -->
    <div
        v-for="x in Math.floor(container.width / step)"
        :key="'gx' + x"
        class="grid-line vertical"
        :style="{ left: x * step * scale + 'px' }"
    />

    <div
        v-for="y in Math.floor(container.length / step)"
        :key="'gy' + y"
        class="grid-line horizontal"
        :style="{ top: y * step * scale + 'px' }"
    />

    <!-- ITEMS -->
    <div
        v-for="p in placements"
        :key="p.id"
        class="item"
        :class="{
          'item--locked': !canModify(p.id),
          'item--highlighted': highlightedId === p.id,
          'item--dragging': dragState?.id === p.id,
          'item--invalid': dragState?.id === p.id && !dragState.valid
        }"
        :style="itemStyle(p)"
        @mousedown="e => onMouseDown(p, e)"
        @mouseenter="setHighlighted(p.id)"
        @mouseleave="setHighlighted(null)"
    >
      <!-- Лейбл с информацией о грузе -->
      <div
          class="item-label"
          :style="{
            fontSize: labelFontSize(p) + 'px',
            color: getContrastColor(p.color),
          }"
      >
        <span class="item-label__name">{{ p.name || 'Груз' }}</span>
        <span class="item-label__size">{{ p.width }}×{{ p.length }}</span>
        <span v-if="p.weight" class="item-label__weight">{{ p.weight }}кг</span>
      </div>

      <!-- Панель управления грузом -->
      <div v-if="canModify(p.id)" class="item-controls">
        <button
            class="item-btn item-btn--rotate"
            title="Повернуть"
            @click.stop="props.onRotate(p.id)"
            @mousedown.stop
        >
          ↻
        </button>
        <button
            class="item-btn item-btn--remove"
            title="Удалить"
            @click.stop="props.onRemove(p.id)"
            @mousedown.stop
        >
          ✕
        </button>
      </div>
    </div>

    <!-- PREVIEW для нового груза из шаблонов -->
    <div
        v-if="templatePreview"
        class="template-preview"
        :class="{ invalid: !templatePreview.valid }"
        :style="{
          left: templatePreview.x * scale + 'px',
          top: templatePreview.y * scale + 'px',
          width: templatePreview.width * scale + 'px',
          height: templatePreview.length * scale + 'px',
          background: templatePreview.color,
        }"
    />
    </div>

    <!-- ВОРОТА ПОГРУЗКИ -->
    <div class="truck-doors">
    </div>
  </div>
</template>

<style scoped>
/* =========================
   SCENE (CANVAS)
========================= */

.scene {
  position: relative;
  box-sizing: border-box;

  overflow: hidden;
  isolation: isolate;
  contain: layout paint;

  background-color: #fafafa;
  border: 1px solid #d1d5db;

  user-select: none;

  transition: background-color 0.15s ease, border-color 0.15s ease;

  width: auto;
  height: calc(var(--scene-height) - 90px); /* минус cabin + doors */
  @media (max-width: 780px) {
    height: auto;
  }
}

.scene--drag-over {
  background-color: #ecfdf5;
  border-color: #10b981;
  border-style: dashed;
}

/* =========================
   GRID (VISUAL ONLY)
========================= */

.grid-line {
  position: absolute;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.06);
  z-index: 0;
}

.grid-line.vertical {
  top: 0;
  bottom: 0;
  width: 1px;
}

.grid-line.horizontal {
  left: 0;
  right: 0;
  height: 1px;
}

/* =========================
   ITEMS
========================= */

.item {
  position: absolute;
  box-sizing: border-box;

  cursor: grab;
  z-index: 2;

  /* 🔒 не влияет на layout */
  outline: 1px solid rgba(0, 0, 0, 0.4);
  outline-offset: -1px;

  will-change: transform;
}

.item:active {
  cursor: grabbing;
}

.item--locked {
  cursor: not-allowed;
  opacity: 0.7;
}

.item--highlighted {
  outline: 3px solid #fbbf24 !important;
  outline-offset: -1px;
  z-index: 3;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.6);
}

.item--dragging {
  opacity: 0.9;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  cursor: grabbing;
  /* Плавный transform для отзывчивости */
  transition: none;
}

.item--invalid {
  outline: 3px dashed #f44336 !important;
  outline-offset: -1px;
  background-image:
      repeating-linear-gradient(
          45deg,
          transparent,
          transparent 8px,
          rgba(244, 67, 54, 0.15) 8px,
          rgba(244, 67, 54, 0.15) 16px
      ) !important;
  background-blend-mode: overlay;
}

/* =========================
   ITEM LABEL
========================= */

.item-label {
  position: absolute;
  inset: 4px;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1px;

  text-align: center;
  overflow: hidden;
  pointer-events: none;

  line-height: 1.2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.item-label__name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.item-label__size,
.item-label__weight {
  opacity: 0.85;
  white-space: nowrap;
}

/* =========================
   ITEM CONTROLS
========================= */

.item-controls {
  position: absolute;
  top: 5px;
  right: 5px;

  display: flex;
  gap: 4px;

  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.item:hover .item-controls {
  opacity: 1;
  pointer-events: auto;
}

.item-btn {
  width: 18px;
  height: 18px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: none;
  border-radius: 6px;
  cursor: pointer;

  font-size: 14px;
  font-weight: 600;

  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  transition: transform 0.1s ease, background 0.15s ease;
}

.item-btn:hover {
  transform: scale(1.1);
}

.item-btn:active {
  transform: scale(0.95);
}

.item-btn--rotate {
  background: #ffffff;
  color: #374151;
}

.item-btn--rotate:hover {
  background: #f3f4f6;
}

.item-btn--remove {
  background: #ef4444;
  color: #ffffff;
}

.item-btn--remove:hover {
  background: #dc2626;
}

/* =========================
   TEMPLATE PREVIEW (новый груз)
========================= */

.template-preview {
  position: absolute;
  pointer-events: none;

  z-index: 10;

  box-sizing: border-box;

  opacity: 0.8;
  outline: 2px solid #4caf50;
  outline-offset: -2px;

  transition: opacity 0.1s ease;
}

.template-preview.invalid {
  outline-color: #f44336;
  opacity: 0.5;
}

/* =========================
   TRUCK WRAPPER
========================= */

.truck-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* =========================
   TRUCK CABIN
========================= */

.truck-cabin {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  background-size: 100% 100%;
}

/* =========================
   TRUCK DOORS
========================= */

.truck-doors {
  background: #354057;
  height: 10px;
}
</style>
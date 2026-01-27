<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import type { Placement, Container } from '@/engine/types'
import type { CargoTemplate } from '@/data/templates/types'
import { useDragTemplate } from '@/composables/useDragTemplate'
import { useHighlightedPlacement } from '@/composables/useHighlightedPlacement'
import Car from '@/assets/images/car.png'

const { draggingTemplate, isDragging, stopDrag, setHideGhost } = useDragTemplate()
const { highlightedId, setHighlighted } = useHighlightedPlacement()

/* =========================
   PROPS
========================= */

const props = defineProps<{
  container: Container
  placements: Placement[]
  canModify: (id: string) => boolean
  onMove: (id: string, x: number, y: number) => Placement | null
  onRemove: (id: string) => void
  onRotate: (id: string) => void
  onDropTemplate: (template: CargoTemplate, x: number, y: number) => boolean
  step: number
}>()

/* =========================
   REFS
========================= */

const containerEl = ref<HTMLDivElement | null>(null)
const draggingId = ref<string | null>(null)

/** Триггер для пересчёта scale при resize */
const resizeKey = ref(0)
let resizeObserver: ResizeObserver | null = null
let resizeTimeout: ReturnType<typeof setTimeout> | null = null

/** Смещение курсора относительно верхнего левого угла груза при захвате */
const dragOffset = ref<{ x: number; y: number } | null>(null)

const preview = ref<{
  x: number
  y: number
  valid: boolean
} | null>(null)

/** Последняя валидная позиция для "прилипания" к границам */
const lastValidPosition = ref<{ x: number; y: number } | null>(null)

/* =========================
   UTILS
========================= */

function snap(value: number, step: number) {
  return Math.round(value / step) * step
}

function getPlacement(id: string) {
  return props.placements.find(p => p.id === id) ?? null
}

/**
 * Бинарный поиск ближайшей валидной позиции на пути от start к target.
 * Используется для "прилипания" к грузам при быстром перемещении.
 *
 * @returns Ближайшая валидная позиция или null если start невалидна
 */
function findNearestValidPosition(
    id: string,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number
): { x: number; y: number } | null {
  // Если target валиден — просто возвращаем его
  if (props.onMove(id, targetX, targetY) !== null) {
    return { x: targetX, y: targetY }
  }

  // Бинарный поиск границы между валидной и невалидной областью
  let lo = 0 // start (должен быть валидным)
  let hi = 1 // target (невалидный)

  // 8 итераций дают точность ~0.4% от расстояния, достаточно для step
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2
    const x = snap(startX + (targetX - startX) * mid, props.step)
    const y = snap(startY + (targetY - startY) * mid, props.step)

    if (props.onMove(id, x, y) !== null) {
      lo = mid
    } else {
      hi = mid
    }
  }

  // Возвращаем позицию на границе (lo — последняя валидная точка)
  const resultX = snap(startX + (targetX - startX) * lo, props.step)
  const resultY = snap(startY + (targetY - startY) * lo, props.step)

  // Если результат совпадает с start — движение невозможно
  if (resultX === startX && resultY === startY) {
    return null
  }

  return { x: resultX, y: resultY }
}

/* =========================
   DRAG LOGIC
========================= */

function onMouseDown(p: Placement, e: MouseEvent) {
  if (!props.canModify(p.id)) return
  if (!containerEl.value) return

  const rect = containerEl.value.getBoundingClientRect()

  // Вычисляем точку клика в координатах контейнера
  const clickX = (e.clientX - rect.left) / scale.value
  const clickY = (e.clientY - rect.top) / scale.value

  // Сохраняем смещение курсора относительно верхнего левого угла груза
  dragOffset.value = {
    x: clickX - p.x,
    y: clickY - p.y,
  }

  draggingId.value = p.id
  preview.value = {
    x: p.x,
    y: p.y,
    valid: true,
  }
  lastValidPosition.value = { x: p.x, y: p.y }

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
  if (!draggingId.value || !preview.value || !containerEl.value || !dragOffset.value || !lastValidPosition.value) return

  const rect = containerEl.value.getBoundingClientRect()
  const p = getPlacement(draggingId.value)
  if (!p) return

  // Вычисляем позицию курсора и вычитаем offset, чтобы груз не прыгал
  const rawX = (e.clientX - rect.left) / scale.value - dragOffset.value.x
  const rawY = (e.clientY - rect.top) / scale.value - dragOffset.value.y

  // Clamp к границам контейнера (груз не может выйти за пределы)
  const clampedX = Math.max(0, Math.min(rawX, props.container.width - p.width))
  const clampedY = Math.max(0, Math.min(rawY, props.container.length - p.length))

  const targetX = snap(clampedX, props.step)
  const targetY = snap(clampedY, props.step)

  const lastX = lastValidPosition.value.x
  const lastY = lastValidPosition.value.y

  // Пробуем полное перемещение
  if (props.onMove(p.id, targetX, targetY) !== null) {
    lastValidPosition.value = { x: targetX, y: targetY }
    preview.value = { x: targetX, y: targetY, valid: true }
    return
  }

  // Скольжение: пробуем двигаться только по X (Y остаётся от lastValid)
  if (targetX !== lastX && props.onMove(p.id, targetX, lastY) !== null) {
    lastValidPosition.value = { x: targetX, y: lastY }
    preview.value = { x: targetX, y: lastY, valid: true }
    return
  }

  // Скольжение: пробуем двигаться только по Y (X остаётся от lastValid)
  if (targetY !== lastY && props.onMove(p.id, lastX, targetY) !== null) {
    lastValidPosition.value = { x: lastX, y: targetY }
    preview.value = { x: lastX, y: targetY, valid: true }
    return
  }

  // Ничего не сработало — показываем невалидный preview
  preview.value = {
    x: targetX,
    y: targetY,
    valid: false,
  }
}

function onMouseUp() {
  if (!draggingId.value || !lastValidPosition.value || !preview.value) {
    cleanup()
    return
  }

  const p = getPlacement(draggingId.value)
  if (!p) {
    cleanup()
    return
  }

  let finalX = lastValidPosition.value.x
  let finalY = lastValidPosition.value.y

  // Если текущая позиция невалидна — ищем ближайшую валидную (прилипание)
  if (!preview.value.valid) {
    const nearest = findNearestValidPosition(
        draggingId.value,
        lastValidPosition.value.x,
        lastValidPosition.value.y,
        preview.value.x,
        preview.value.y
    )
    if (nearest) {
      finalX = nearest.x
      finalY = nearest.y
    }
  } else {
    // Текущая позиция валидна — используем её
    finalX = preview.value.x
    finalY = preview.value.y
  }

  props.onMove(draggingId.value, finalX, finalY)
  cleanup()
}

function cleanup() {
  draggingId.value = null
  preview.value = null
  dragOffset.value = null
  lastValidPosition.value = null

  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

onBeforeUnmount(cleanup)

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

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
    resizeTimeout = null
  }
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
    setHideGhost(false)
    return
  }

  // Курсор над сценой — скрываем глобальный ghost
  setHideGhost(true)

  // Вычисляем позицию (центрируем груз под курсором)
  const rawX = (e.clientX - rect.left) / scale.value - template.width / 2
  const rawY = (e.clientY - rect.top) / scale.value - template.length / 2

  const x = snap(Math.max(0, rawX), props.step)
  const y = snap(Math.max(0, rawY), props.step)

  // Проверяем валидность позиции (грубая проверка границ)
  const valid =
    x >= 0 &&
    y >= 0 &&
    x + template.width <= props.container.width &&
    y + template.length <= props.container.length

  templatePreview.value = {
    x,
    y,
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

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onGlobalMouseMove)
  window.removeEventListener('mouseup', onGlobalMouseUp)
})

/* =========================
   STYLES
========================= */

function itemStyle(p: Placement) {
  return {
    left: p.x * scale.value + 'px',
    top: p.y * scale.value + 'px',
    width: p.width * scale.value + 'px',
    height: p.length * scale.value + 'px',
    background: p.color || '#9e9e9e',
    border: '1px solid #333',
  }
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

const previewStyle = computed(() => {
  if (!preview.value || !draggingId.value) return {}

  const p = getPlacement(draggingId.value)
  if (!p) return {}

  return {
    left: preview.value.x * scale.value + 'px',
    top: preview.value.y * scale.value + 'px',
    width: p.width * scale.value + 'px',
    height: p.length * scale.value + 'px',
  }
})
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
          'item--highlighted': highlightedId === p.id
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

    <!-- PREVIEW для перемещения существующих грузов -->
    <div
        v-if="preview && draggingId"
        class="preview"
        :class="{ invalid: !preview.valid }"
        :style="previewStyle"
    />

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
   PREVIEW
========================= */

.preview {
  position: absolute;
  pointer-events: none;

  z-index: 5;

  box-sizing: border-box;

  /* ❗ outline вместо border */
  outline: 2px dashed #4caf50;
  outline-offset: -2px;

  background: rgba(76, 175, 80, 0.25);
}

.preview.invalid {
  outline-color: #f44336;
  background: rgba(244, 67, 54, 0.25);
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
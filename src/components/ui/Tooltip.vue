<script setup lang="ts">
import { ref, onBeforeUnmount, nextTick } from 'vue'

type Position = 'top' | 'right' | 'bottom' | 'left'

const props = withDefaults(defineProps<{
  text: string
  position?: Position
  delay?: number
  disabled?: boolean
}>(), {
  position: 'right',
  delay: 300,
  disabled: false
})

const isVisible = ref(false)
const triggerEl = ref<HTMLElement | null>(null)
const tooltipEl = ref<HTMLElement | null>(null)
const tooltipStyle = ref<Record<string, string>>({})

let showTimeout: ReturnType<typeof setTimeout> | null = null

const VIEWPORT_PADDING = 8
const GAP = 8

/**
 * Корректирует позицию tooltip, чтобы он не выходил за границы viewport
 */
function clampToViewport(
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number } {
  const maxX = window.innerWidth - width - VIEWPORT_PADDING
  const maxY = window.innerHeight - height - VIEWPORT_PADDING

  return {
    x: Math.max(VIEWPORT_PADDING, Math.min(x, maxX)),
    y: Math.max(VIEWPORT_PADDING, Math.min(y, maxY)),
  }
}

async function updatePosition() {
  if (!triggerEl.value) return

  const rect = triggerEl.value.getBoundingClientRect()

  // Сначала позиционируем tooltip за пределами видимости для измерения
  tooltipStyle.value = {
    left: '-9999px',
    top: '-9999px',
    transform: 'none',
    visibility: 'hidden',
  }

  // Ждём рендер для получения размеров
  await nextTick()

  if (!tooltipEl.value) return

  const tooltipRect = tooltipEl.value.getBoundingClientRect()
  const tooltipWidth = tooltipRect.width
  const tooltipHeight = tooltipRect.height

  let x = 0
  let y = 0

  switch (props.position) {
    case 'right':
      x = rect.right + GAP
      y = rect.top + rect.height / 2 - tooltipHeight / 2
      break
    case 'left':
      x = rect.left - GAP - tooltipWidth
      y = rect.top + rect.height / 2 - tooltipHeight / 2
      break
    case 'top':
      x = rect.left + rect.width / 2 - tooltipWidth / 2
      y = rect.top - GAP - tooltipHeight
      break
    case 'bottom':
      x = rect.left + rect.width / 2 - tooltipWidth / 2
      y = rect.bottom + GAP
      break
  }

  const clamped = clampToViewport(x, y, tooltipWidth, tooltipHeight)

  tooltipStyle.value = {
    left: `${clamped.x}px`,
    top: `${clamped.y}px`,
    transform: 'none',
    visibility: 'visible',
  }
}

function handleMouseEnter() {
  if (props.disabled) return

  showTimeout = setTimeout(() => {
    isVisible.value = true
    // updatePosition вызывается после рендера через nextTick внутри
    nextTick(() => updatePosition())
  }, props.delay)
}

function handleMouseLeave() {
  if (showTimeout) {
    clearTimeout(showTimeout)
    showTimeout = null
  }
  isVisible.value = false
}

onBeforeUnmount(() => {
  if (showTimeout) {
    clearTimeout(showTimeout)
  }
})
</script>

<template>
  <div
    ref="triggerEl"
    class="tooltip-trigger"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @focusin="handleMouseEnter"
    @focusout="handleMouseLeave"
  >
    <slot />
  </div>

  <Teleport to="body">
    <Transition name="tooltip">
      <div
        v-if="isVisible"
        ref="tooltipEl"
        class="tooltip"
        :class="`tooltip--${position}`"
        :style="tooltipStyle"
        role="tooltip"
      >
        {{ text }}
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss">
.tooltip-trigger {
  display: inline-flex;
}

.tooltip {
  position: fixed;
  z-index: 10000;

  max-width: 300px;
  padding: 6px 10px;
  border-radius: 6px;

  background: white;
  color: #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  font-size: 13px;
  line-height: 1.4;
  white-space: normal;
  word-wrap: break-word;
  pointer-events: none;
}

// Transition
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
}
</style>

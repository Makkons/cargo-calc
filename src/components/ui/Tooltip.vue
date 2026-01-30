<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'

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
const tooltipStyle = ref<Record<string, string>>({})

let showTimeout: ReturnType<typeof setTimeout> | null = null

function updatePosition() {
  if (!triggerEl.value) return

  const rect = triggerEl.value.getBoundingClientRect()
  const gap = 8

  switch (props.position) {
    case 'right':
      tooltipStyle.value = {
        left: `${rect.right + gap}px`,
        top: `${rect.top + rect.height / 2}px`,
        transform: 'translateY(-50%)',
      }
      break
    case 'left':
      tooltipStyle.value = {
        right: `${window.innerWidth - rect.left + gap}px`,
        top: `${rect.top + rect.height / 2}px`,
        transform: 'translateY(-50%)',
      }
      break
    case 'top':
      tooltipStyle.value = {
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.top - gap}px`,
        transform: 'translate(-50%, -100%)',
      }
      break
    case 'bottom':
      tooltipStyle.value = {
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.bottom + gap}px`,
        transform: 'translateX(-50%)',
      }
      break
  }
}

function handleMouseEnter() {
  if (props.disabled) return

  showTimeout = setTimeout(() => {
    updatePosition()
    isVisible.value = true
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

  padding: 6px 10px;
  border-radius: 6px;

  background: var(--color-background-soft);
  color: var(--color-text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  font-size: 13px;
  line-height: 1.3;
  white-space: nowrap;
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

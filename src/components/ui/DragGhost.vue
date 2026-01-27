<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useDragTemplate } from '@/composables/useDragTemplate'

const { draggingTemplate, isDragging, hideGhost } = useDragTemplate()

const mouseX = ref(0)
const mouseY = ref(0)

function onMouseMove(e: MouseEvent) {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
})

// Масштаб для отображения (чтобы груз не был огромным)
const DISPLAY_SCALE = 0.15

const ghostStyle = computed(() => {
  if (!draggingTemplate.value) return {}

  const t = draggingTemplate.value
  const width = t.width * DISPLAY_SCALE
  const height = t.length * DISPLAY_SCALE

  return {
    left: mouseX.value - width / 2 + 'px',
    top: mouseY.value - height / 2 + 'px',
    width: width + 'px',
    height: height + 'px',
    background: t.color,
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isDragging && draggingTemplate && !hideGhost"
      class="drag-ghost"
      :style="ghostStyle"
    >
      <span class="drag-ghost__label">{{ draggingTemplate.name }}</span>
      <span class="drag-ghost__size">
        {{ draggingTemplate.width }} × {{ draggingTemplate.length }}
      </span>
    </div>
  </Teleport>
</template>

<style scoped>
.drag-ghost {
  position: fixed;
  z-index: 9999;
  pointer-events: none;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;

  border-radius: 4px;
  border: 2px solid rgba(0, 0, 0, 0.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);

  opacity: 0.9;

  /* Минимальные размеры для читаемости */
  min-width: 80px;
  min-height: 60px;
}

.drag-ghost__label {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  text-align: center;
  padding: 0 4px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drag-ghost__size {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
</style>
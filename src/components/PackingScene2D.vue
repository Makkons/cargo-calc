<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Placement, Container } from '@/engine/types'

const props = defineProps<{
  container: Container
  placements: Placement[]
  canModify: (id: string) => boolean
  onMove: (id: string, x: number, y: number) => Placement | null
}>()

const rootRef = ref<HTMLDivElement | null>(null)

const draggingId = ref<string | null>(null)
const startMouse = ref({ x: 0, y: 0 })
const startPos = ref({ x: 0, y: 0 })

const scale = computed(() => {
  if (!rootRef.value) return 1
  return rootRef.value.clientWidth / props.container.width
})

// =========================
// DRAG
// =========================

function onMouseDown(e: MouseEvent, p: Placement) {
  if (!props.canModify(p.id)) return

  draggingId.value = p.id
  startMouse.value = { x: e.clientX, y: e.clientY }
  startPos.value = { x: p.x, y: p.y }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!draggingId.value) return
  e.preventDefault()
}

function onMouseUp(e: MouseEvent) {
  if (!draggingId.value) return

  const dx = (e.clientX - startMouse.value.x) / scale.value
  const dy = (e.clientY - startMouse.value.y) / scale.value

  const x = Math.round(startPos.value.x + dx)
  const y = Math.round(startPos.value.y + dy)

  const ok = props.onMove(draggingId.value, x, y)

  draggingId.value = null

  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}
</script>

<template>
  <div class="scene-2d" ref="rootRef">
    <!-- container -->
    <div
        class="container"
        :style="{
        width: container.width * scale + 'px',
        height: container.length * scale + 'px',
      }"
    >
      <!-- items -->
      <div
          v-for="p in placements"
          :key="p.id"
          class="item"
          :class="{
          locked: !canModify(p.id),
          dragging: draggingId === p.id,
        }"
          :style="{
          left: p.x * scale + 'px',
          top: p.y * scale + 'px',
          width: p.width * scale + 'px',
          height: p.length * scale + 'px',
          background: p.color || '#9e9e9e',
        }"
          @mousedown="e => onMouseDown(e, p)"
      >
        <span class="label">{{ p.name ?? 'Груз' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene-2d {
  width: 100%;
  overflow: auto;
  border: 1px solid #ddd;
  padding: 8px;
}

.container {
  position: relative;
  background: #fafafa;
  border: 2px solid #000;
}

.item {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid #000;
  cursor: grab;
  user-select: none;
}

.item.dragging {
  opacity: 0.7;
  cursor: grabbing;
}

.item.locked {
  opacity: 0.4;
  cursor: not-allowed;
}

.label {
  font-size: 10px;
  color: #000;
  padding: 2px;
}
</style>
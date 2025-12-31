<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import type { Placement, Container } from '@/engine/types'

/* =========================
   PROPS
========================= */

const props = defineProps<{
  container: Container
  placements: Placement[]
  canModify: (id: string) => boolean
  onMove: (id: string, x: number, y: number) => Placement | null
  step: number
}>()

/* =========================
   REFS
========================= */

const containerEl = ref<HTMLDivElement | null>(null)
const draggingId = ref<string | null>(null)

const preview = ref<{
  x: number
  y: number
  valid: boolean
} | null>(null)

/* =========================
   UTILS
========================= */

function snap(value: number, step: number) {
  return Math.round(value / step) * step
}

function getPlacement(id: string) {
  return props.placements.find(p => p.id === id) ?? null
}

/* =========================
   DRAG LOGIC
========================= */

function onMouseDown(p: Placement, e: MouseEvent) {
  if (!props.canModify(p.id)) return

  draggingId.value = p.id
  preview.value = {
    x: p.x,
    y: p.y,
    valid: true,
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)

  e.preventDefault()
}

const scale = computed(() => {
  if (!containerEl.value) return 1
  return containerEl.value.clientWidth / props.container.width
})

function onMouseMove(e: MouseEvent) {
  if (!draggingId.value || !preview.value || !containerEl.value) return

  const rect = containerEl.value.getBoundingClientRect()
  const p = getPlacement(draggingId.value)
  if (!p) return

  const rawX = (e.clientX - rect.left) / scale.value
  const rawY = (e.clientY - rect.top) / scale.value

  const x = snap(rawX, props.step)
  const y = snap(rawY, props.step)

  // 🔍 ПРОВЕРКА ЧЕРЕЗ ENGINE (без коммита)
  const test = props.onMove(p.id, x, y)

  preview.value = {
    x,
    y,
    valid: test !== null,
  }
}

function onMouseUp() {
  if (!draggingId.value || !preview.value) {
    cleanup()
    return
  }

  if (preview.value.valid) {
    props.onMove(
        draggingId.value,
        preview.value.x,
        preview.value.y
    )
  }

  cleanup()
}

function cleanup() {
  draggingId.value = null
  preview.value = null

  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

onBeforeUnmount(cleanup)

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
  <div
      ref="containerEl"
      class="scene scene2D"
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
        :style="itemStyle(p)"
        @mousedown="e => onMouseDown(p, e)"
    />

    <!-- PREVIEW -->
    <div
        v-if="preview && draggingId"
        class="preview"
        :class="{ invalid: !preview.valid }"
        :style="previewStyle"
    />
  </div>
</template>

<style scoped>
/* =========================
   SCENE (CANVAS)
========================= */

.scene {
  width: 100%;
  position: relative;
  box-sizing: border-box;

  /* 🔒 КРИТИЧНО */
  overflow: hidden;
  isolation: isolate;
  contain: layout paint size;

  background-color: #fafafa;
  border: 1px solid #d1d5db;

  user-select: none;
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
</style>
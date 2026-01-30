<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  width: number
  length: number
  color?: string
}>()

// Размер SVG
const VIEW_SIZE = 48

const rect = computed(() => {
  const max = Math.max(props.width, props.length)
  const scale = VIEW_SIZE / max

  return {
    w: props.width * scale,
    h: props.length * scale,
    x: (VIEW_SIZE - props.width * scale) / 2,
    y: (VIEW_SIZE - props.length * scale) / 2,
  }
})
</script>

<template>
  <svg
      :width="VIEW_SIZE"
      :height="VIEW_SIZE"
      viewBox="0 0 48 48"
      class="cargo-preview"
  >
    <!-- Контур -->
    <rect
        :x="rect.x"
        :y="rect.y"
        :width="rect.w"
        :height="rect.h"
        rx="4"
        ry="4"
        :fill="color || '#bdbdbd'"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
    />
  </svg>
</template>

<style scoped>
.cargo-preview {
  flex-shrink: 0;
}
</style>
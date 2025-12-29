<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import * as THREE from 'three'
import type { LayerResult, Size } from '@/types'

const props = defineProps<{
  layer: LayerResult | null
  container: Size | null
}>()

const containerRef = ref<HTMLDivElement | null>(null)

let scene: THREE.Scene | null = null
let camera: THREE.OrthographicCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let animationId = 0

// =======================
// INIT
// =======================

function initScene(width: number, height: number) {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff)

  camera = new THREE.OrthographicCamera(
      0,
      width,
      height,
      0,
      -1000,
      1000
  )

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  containerRef.value!.appendChild(renderer.domElement)
}

// =======================
// CLEAR
// =======================

function clearScene() {
  if (!scene) return
  const toRemove: THREE.Object3D[] = []
  scene.traverse(o => {
    if (o.type === 'Mesh' || o.type === 'Line') {
      toRemove.push(o)
    }
  })
  toRemove.forEach(o => scene!.remove(o))
}

// =======================
// RENDER LAYER BOUNDS
// =======================

function renderLayerBounds() {
  if (!scene || !props.container) return

  const { width, length } = props.container

  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(width, 0, 0),
    new THREE.Vector3(width, length, 0),
    new THREE.Vector3(0, length, 0),
    new THREE.Vector3(0, 0, 0),
  ])

  const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0x000000 })
  )

  scene.add(line)
}

// =======================
// RERENDER
// =======================

function rerender() {
  if (!scene) return

  clearScene()
  renderLayerBounds()
}

// =======================
// LOOP
// =======================

function animate() {
  if (!renderer || !scene || !camera) return
  renderer.render(scene, camera)
  animationId = requestAnimationFrame(animate)
}

// =======================
// LIFECYCLE
// =======================

onMounted(() => {
  if (!containerRef.value) return

  initScene(
      containerRef.value.clientWidth,
      containerRef.value.clientHeight
  )

  rerender()
  animate()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  renderer?.dispose()
})

// =======================
// WATCHERS
// =======================

watch(
    () => [props.layer, props.container],
    () => rerender(),
    { deep: true }
)
</script>

<template>
  <div ref="containerRef" class="layer2d" />
</template>

<style scoped>
.layer2d {
  width: 100%;
  height: 400px;
  border: 1px dashed #bbb;
}
</style>
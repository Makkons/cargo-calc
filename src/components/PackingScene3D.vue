<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'
import type { PackingResult } from '@/types'

const props = defineProps<{
  result: PackingResult
  container: {
    width: number
    length: number
    height: number
  } | null
  activeResultLayerIndex: number
}>()

const containerRef = ref<HTMLDivElement | null>(null)

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let animationId = 0

// =======================
// INIT
// =======================

function initScene(width: number, height: number) {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f5f5)

  camera = new THREE.PerspectiveCamera(45, width / height, 1, 50000)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  containerRef.value!.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  scene.add(new THREE.AmbientLight(0xffffff, 0.6))

  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(1, 2, 1)
  scene.add(light)
}

// =======================
// CLEAR
// =======================

function clearScene() {
  if (!scene) return

  const toRemove: THREE.Object3D[] = []

  scene.traverse(obj => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
      toRemove.push(obj)
    }
  })

  toRemove.forEach(obj => scene!.remove(obj))
}

// =======================
// CONTAINER
// =======================

function renderContainer() {
  if (!scene || !props.container || !camera || !controls) return

  const { width, height, length } = props.container

  const geometry = new THREE.BoxGeometry(width, height, length)
  const wireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0x000000 })
  )

  wireframe.position.set(
      width / 2,
      height / 2,
      length / 2
  )

  scene.add(wireframe)

  camera.position.set(width * 1.3, height * 1.2, length * 1.3)
  controls.target.set(width / 2, height / 2, length / 2)
  controls.update()
}

// =======================
// ITEMS (С УЧЁТОМ СЛОЁВ)
// =======================

function renderItems() {
  if (!scene) return

  props.result.layers.forEach((layer, layerIndex) => {
    const isActive = layerIndex === props.activeResultLayerIndex

    layer.items.forEach(item => {
      const material = new THREE.MeshStandardMaterial({
        color: item.color || '#9e9e9e',
        transparent: true,
        opacity: isActive ? 1 : 0.25,
        emissive: isActive
            ? new THREE.Color(0x222222)
            : new THREE.Color(0x000000),
      })

      const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
              item.size.width,
              item.size.height,
              item.size.length
          ),
          material
      )

      mesh.position.set(
          item.position.x + item.size.width / 2,
          item.position.z + item.size.height / 2,
          item.position.y + item.size.length / 2
      )

      scene.add(mesh)
    })
  })
}

// =======================
// RERENDER
// =======================

function rerender() {
  if (!scene) return

  clearScene()

  if (!props.container) return

  renderContainer()
  renderItems()
}

// =======================
// LOOP
// =======================

function animate() {
  if (!renderer || !scene || !camera) return

  controls?.update()
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
    () => [props.container, props.result, props.activeResultLayerIndex],
    () => rerender(),
    { deep: true }
)
</script>

<template>
  <div ref="containerRef" class="scene" />
</template>

<style scoped>
.scene {
  width: 100%;
  height: 400px;
  border: 1px solid #ddd;
}
</style>
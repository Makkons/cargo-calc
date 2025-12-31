<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'

/* ======================
   PROPS
====================== */

const props = defineProps<{
  container: {
    width: number
    length: number
    height: number
  } | null

  placements: {
    id: string
    x: number
    y: number
    z: number
    width: number
    length: number
    height: number
    color?: string
  }[]
}>()

/* ======================
   REFS
====================== */

const containerRef = ref<HTMLDivElement | null>(null)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let frameId = 0

/* ======================
   INIT
====================== */

function initScene(width: number, height: number) {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f5f5)

  camera = new THREE.PerspectiveCamera(45, width / height, 1, 100_000)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)

  containerRef.value!.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08

  scene.add(new THREE.AmbientLight(0xffffff, 0.6))

  const light = new THREE.DirectionalLight(0xffffff, 0.8)
  light.position.set(1, 2, 1)
  scene.add(light)
}

/* ======================
   CLEAR
====================== */

function clearScene() {
  const toRemove: THREE.Object3D[] = []

  scene.traverse(obj => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
      toRemove.push(obj)
    }
  })

  toRemove.forEach(obj => {
    scene.remove(obj)

    if ((obj as THREE.Mesh).geometry) {
      ;(obj as THREE.Mesh).geometry.dispose()
    }

    if ((obj as THREE.Mesh).material) {
      const mat = (obj as THREE.Mesh).material
      if (Array.isArray(mat)) mat.forEach(m => m.dispose())
      else mat.dispose()
    }
  })
}

/* ======================
   CONTAINER
====================== */

function renderContainer() {
  if (!props.container) return

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

  camera.position.set(
      width * 1.4,
      height * 1.2,
      length * 1.4
  )

  controls.target.set(
      width / 2,
      height / 2,
      length / 2
  )

  controls.update()
}

/* ======================
   PLACEMENTS
====================== */

function renderPlacements() {
  for (const item of props.placements) {

    const geometry = new THREE.BoxGeometry(
        item.width,
        item.height,
        item.length
    )

// сам груз
    const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: item.color || '#9e9e9e',
          transparent: true,
          opacity: 1,
        })
    )

// контур (stroke)
    const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({
          color: 0x000000,
          linewidth: 1, // ⚠️ в WebGL реально игнорируется, но оставим
        })
    )

// позиция (ОБЯЗАТЕЛЬНО одинаковая)
    mesh.position.set(
        item.x + item.width / 2,
        item.z + item.height / 2,
        item.y + item.length / 2
    )

    edges.position.copy(mesh.position)

// добавляем оба
    scene.add(mesh)
    scene.add(edges)
  }
}

/* ======================
   RENDER
====================== */

function render() {
  clearScene()

  if (!props.container) return

  renderContainer()
  renderPlacements()
}

/* ======================
   LOOP
====================== */

function animate() {
  controls.update()
  renderer.render(scene, camera)
  frameId = requestAnimationFrame(animate)
}

/* ======================
   LIFECYCLE
====================== */

onMounted(() => {
  if (!containerRef.value) return

  initScene(
      containerRef.value.clientWidth,
      containerRef.value.clientHeight
  )

  render()
  animate()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId)
  renderer.dispose()
})

/* ======================
   WATCHERS
====================== */

watch(
    () => [props.container, props.placements],
    render,
    { deep: true }
)
</script>

<template>
  <div ref="containerRef" class="scene scene3D" />
</template>

<style scoped>
.scene {
  width: 100%;
  height: 400px;
  border: 1px solid #ddd;
}
</style>
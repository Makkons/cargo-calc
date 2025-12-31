<script setup lang="ts">
import { ref, computed, watch } from 'vue'

import CargoTemplates from '@/components/CargoTemplates.vue'
import ContainerTemplates from '@/components/ContainerTemplates.vue'
import PackingList from '@/components/PackingList.vue'
import PackingScene3D from '@/components/PackingScene3D.vue'

import { usePacking } from '@/domain/packing/usePacking'
import { loadFromStorage, saveToStorage } from '@/utils/storage'

import type { CargoTemplate } from '@/data/templates/types'
import type { ContainerTemplate } from '@/data/containers/types'
import PackingScene2D from "@/components/PackingScene2D.vue";

import { PACKING_HISTORY_KEY } from '@/data/history/types'
import type { PackingHistoryItem } from '@/data/history/types'
import PackingHistory from "@/components/PackingHistory.vue";

/* =========================
   CONTAINERS
========================= */

const CONTAINERS_KEY = 'container-templates'

const containers = ref<ContainerTemplate[]>(
    loadFromStorage<ContainerTemplate[]>(CONTAINERS_KEY, [])
)

const activeContainerId = ref<string | null>(
    containers.value[0]?.id ?? null
)

const activeContainer = computed(() =>
    containers.value.find(c => c.id === activeContainerId.value) ?? null
)

/* =========================
   PACKING
========================= */

const packing = usePacking({ width: 100, length: 100, height: 100 }, 10)

/* =========================
   WATCH CONTAINER CHANGE
========================= */

function selectContainer(id: string) {
  const next = containers.value.find(c => c.id === id)
  if (!next) return

  activeContainerId.value = id
  packing.resetContainer(next.container)
}

/* =========================
   CONTAINER CRUD
========================= */

function createContainer(t: ContainerTemplate) {
  const clone = structuredClone(t)

  containers.value.push(clone)
  saveToStorage(CONTAINERS_KEY, containers.value)

  if (!activeContainerId.value) {
    selectContainer(clone.id)
  }
}

function updateContainer(t: ContainerTemplate) {
  const i = containers.value.findIndex(c => c.id === t.id)
  if (i !== -1) {
    containers.value[i] = structuredClone(t)
  }

  saveToStorage(CONTAINERS_KEY, containers.value)

  if (t.id === activeContainerId.value) {
    packing.resetContainer(t.container)
  }
}
const currentPackingTitle = ref('Компоновка')
const currentPackingComment = ref<string | undefined>(undefined)
const currentShippingDate = ref<string | undefined>(undefined)
const activeHistoryId = ref<string | null>(null)

function savePacking(meta) {
  const history = loadFromStorage<PackingHistoryItem[]>(PACKING_HISTORY_KEY, [])

  const item: PackingHistoryItem = {
    id: crypto.randomUUID(),
    title: meta.title,
    comment: meta.comment,
    shippingDate: meta.shippingDate,
    savedAt: new Date().toISOString(),
    container: activeContainer.value!.container,
    placements: structuredClone(packing.placements.value),
    mode: packing.mode.value,
  }

  history.unshift(item)
  saveToStorage(PACKING_HISTORY_KEY, history)

  currentPackingTitle.value = item.title
  currentPackingComment.value = item.comment
  currentShippingDate.value = item.shippingDate
  activeHistoryId.value = item.id
}

function loadFromHistory(item: PackingHistoryItem) {
  activeHistoryId.value = item.id
  currentPackingTitle.value = item.title
  currentPackingComment.value = item.comment
  currentShippingDate.value = item.shippingDate

  packing.resetContainer(item.container)
  packing.setMode(item.mode)

  for (const p of item.placements) {
    packing.addCustomItem(p)
  }
}

function removeContainer(id: string) {
  containers.value = containers.value.filter(c => c.id !== id)
  saveToStorage(CONTAINERS_KEY, containers.value)

  if (activeContainerId.value === id) {
    const next = containers.value[0]
    activeContainerId.value = next?.id ?? null

    if (next) {
      packing.resetContainer(next.container)
    }
  }
}

/* =========================
   CARGO TEMPLATES
========================= */

const cargoTemplates = ref<CargoTemplate[]>(
    loadFromStorage<CargoTemplate[]>('cargo-templates', [])
)

function onAddItemToPacking(template: CargoTemplate) {
  if (!packing.addFromTemplate(template)) {
    alert('Нет места для груза')
  }
}

function onAddCustomItem(template: CargoTemplate) {
  if (!packing.addCustomItem(template)) {
    alert('Нет места для груза')
  }
}

watch(activeContainer, (next) => {
  if (next) {
    packing.resetContainer(next.container)
  }
}, { immediate: true })
</script>

<template>
  <div class="layout">

    <ContainerTemplates
        :templates="containers"
        :activeId="activeContainerId"
        @select="selectContainer"
        @create="createContainer"
        @update="updateContainer"
        @remove="removeContainer"
    />

    <CargoTemplates
        @add-to-packing="onAddItemToPacking"
    />
    <div class="scenes">
      <PackingScene2D
          :container="activeContainer.container"
          :placements="packing.placements.value"
          :canModify="packing.canModify"
          :onMove="packing.movePlacement"
          :step="packing.step"
      />
      <PackingScene3D
          :container="activeContainer?.container ?? null"
          :placements="packing.placements.value"
      />
    </div>
    <PackingList
        :title="currentPackingTitle"
        :comment="currentPackingComment"
        :shippingDate="currentShippingDate"
        :placements="packing.placements.value"
        :mode="packing.mode.value"
        :volumeFill="packing.volumeFill.value"
        :usedWeight="packing.usedWeight.value"
        :canRemove="packing.canModify"
        :onSave="savePacking"
        :onSetMode="packing.setMode"
        :onRotate="packing.rotatePlacement"
        :onRemove="packing.removePlacement"
        :onEdit="packing.editPlacement"
        :onOptimize="packing.optimize"
        :onAddCustom="onAddCustomItem"
    />

    <PackingHistory
        :activeId="activeHistoryId"
        @load="loadFromHistory"
    />

  </div>

</template>

<style lang="scss">
.layout {
  display: grid;
  gap: 16px;

  /* 🔹 Desktop grid */
  grid-template-columns: repeat(2, 1fr);
}

.layout * {
  box-sizing: border-box;
}

/* =========================
   GRID AREAS
========================= */


/* =========================
   LEFT COLUMN STACK
========================= */

.scene2D,
.scene3D {
  width: 100%;
}

.scene3D {
  margin-top: 16px;
}

/* =========================
   FIXED HISTORY SIDEBAR
========================= */

.packing-history {
  position: fixed;
  top: 0;
  left: 0;

  margin: 8px;
  height: 100vh;
  width: 56px;
  padding: 12px 8px;

  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);

  overflow: hidden;
  z-index: 2000;

  transition: width 0.25s ease;
}

/* expand on hover */
.packing-history:hover {
  width: 320px;
}

/* content scroll */
.packing-history > * {
  max-height: 100%;
  overflow-y: auto;
}

/* =========================
   OFFSET MAIN CONTENT
========================= */

.layout {
  margin-left: calc(56px + 8px);
}

.packing-history:hover ~ .layout {
  margin-left: 320px;
}

/* =========================
   MOBILE
========================= */

@media (min-width: 1024px) {
  .packing-history::before {
    content: "⏱";
    position: absolute;
    top: 16px;
    left: 20px;
    //transform: translateX(-50%);

    font-size: 20px;
    color: #6b7280; /* нейтральный серый */

    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.25s ease;
  }
  .packing-history {
    padding-top: 50px!important;
    height: calc(100% - 16px);
  }
  .packing-history * {
    opacity: 0;
    overflow: hidden;
    white-space: nowrap;
  }
  .packing-history:hover * {
    opacity: 1;
  }
}

@media (max-width: 1023px) {
  .layout {
    grid-template-columns: 1fr;
    margin-left: 0;
  }

  .scene3D {
    margin-top: 16px;
  }

  .packing-list {
    grid-row: 3 / 4;
  }

  /* history becomes normal block */
  .packing-history {
    position: static;
    width: 100%;
    height: auto;
    box-shadow: none;
    border-right: none;
    margin-top: 16px;
    margin: 0;
  }

  .packing-history:hover {
    width: 100%;
  }
}

</style>
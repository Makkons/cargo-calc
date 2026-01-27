<script setup lang="ts">
import {ref, computed, watch, toRaw, onMounted} from 'vue'

import CargoTemplates from '@/components/CargoTemplates.vue'
import ContainerTemplates from '@/components/ContainerTemplates.vue'
import PackingList from '@/components/PackingList.vue'
import PackingScene3D from '@/components/PackingScene3D.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import DragGhost from '@/components/ui/DragGhost.vue'

import {usePacking} from '@/domain/packing/usePacking'
import {useToast} from '@/composables/useToast'
import {useContainerTemplates} from '@/composables/useContainerTemplates'
import {usePackingHistory} from '@/composables/usePackingHistory'

import {exportToPdf} from '@/utils/exportPdf'

import type {CargoTemplate} from '@/data/templates/types'
import type {ContainerTemplate} from '@/data/containers/types'
import PackingScene2D from "@/components/PackingScene2D.vue"

import type {PackingHistoryItem} from '@/data/history/types'
import PackingHistory from "@/components/PackingHistory.vue"
import AsideBar from "@/components/AsideBar.vue";

const isAsideOpen = ref(false)
const asideTab = ref<'history' | 'settings'>('history')

/* =========================
   MODE (default / pro)
========================= */

const isProMode = ref(false)
const sceneRef = ref<InstanceType<typeof PackingScene2D> | null>(null)

/* =========================
   TOAST
========================= */

const toast = useToast()

/* =========================
   CONTAINERS
========================= */

const containerStore = useContainerTemplates()

/* =========================
   PACKING
========================= */

const packing = usePacking(
    {width: 2400, length: 7200, height: 2000},
    {step: 10, floorOnly: !isProMode.value}
)

// Синхронизируем floorOnly с isProMode
watch(isProMode, (isPro) => {
  packing.setFloorOnly(!isPro)
})

/* =========================
   WATCH CONTAINER CHANGE
========================= */

function selectContainer(id: string) {
  const next = containerStore.templates.value.find(c => c.id === id)
  if (!next) return

  containerStore.select(id)
  packing.resetContainer(next.container)
}

/* =========================
   CONTAINER CRUD
========================= */

async function createContainer(t: ContainerTemplate) {
  await containerStore.create(t)

  if (!containerStore.activeId.value) {
    selectContainer(t.id)
  }
}

async function updateContainer(t: ContainerTemplate) {
  await containerStore.update(t)

  if (t.id === containerStore.activeId.value) {
    packing.resetContainer(t.container)
  }
}

async function removeContainer(id: string) {
  const wasActive = containerStore.activeId.value === id
  await containerStore.remove(id)

  if (wasActive && containerStore.active.value) {
    packing.resetContainer(containerStore.active.value.container)
  }
}

/* =========================
   HISTORY
========================= */

const historyStore = usePackingHistory()

const currentPackingTitle = ref('Погрузка')
const currentPackingComment = ref<string | undefined>(undefined)
const currentShippingDate = ref<string | undefined>(undefined)
const activeHistoryId = ref<string | null>(null)

async function savePacking(meta: { title: string; comment?: string; shippingDate?: string }) {
  // Преобразуем реактивные данные в обычные объекты
  const rawPlacements = toRaw(packing.placements.value).map(p => ({...toRaw(p)}))
  const rawContainer = {...toRaw(containerStore.active.value!.container)}

  const item: PackingHistoryItem = {
    id: crypto.randomUUID(),
    title: meta.title,
    comment: meta.comment,
    shippingDate: meta.shippingDate,
    savedAt: new Date().toISOString(),
    container: rawContainer,
    placements: rawPlacements,
    mode: packing.mode.value,
  }

  await historyStore.save(item)

  currentPackingTitle.value = item.title
  currentPackingComment.value = item.comment
  currentShippingDate.value = item.shippingDate
  activeHistoryId.value = item.id

  toast.success(`Погрузка "${item.title}" сохранена`)
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

  toast.info(`Загружена компоновка "${item.title}"`)
}

async function onRemoveFromHistory(id: string) {
  await historyStore.remove(id)

  if (activeHistoryId.value === id) {
    activeHistoryId.value = null
  }
  toast.warning('Погрузка удалена из истории')
}

async function handleExportPdf() {
  if (!sceneRef.value?.$el || !containerStore.active.value) return

  await toast.promise(
    () => exportToPdf(sceneRef.value!.$el, {
      title: currentPackingTitle.value,
      comment: currentPackingComment.value,
      shippingDate: currentShippingDate.value,
      container: containerStore.active.value!.container,
      placements: toRaw(packing.placements.value).map(p => ({...toRaw(p)})),
      fill: isProMode.value ? packing.volumeFill.value : packing.floorFill.value,
      fillLabel: isProMode.value ? 'Объём' : 'Площадь',
      usedWeight: packing.usedWeight.value,
    }),
    {
      loading: 'Создание PDF...',
      success: 'PDF успешно создан',
      error: 'Не удалось создать PDF',
    }
  ).catch(() => {
    // Ошибка уже показана в toast
  })
}

/* =========================
   CARGO TEMPLATES
========================= */

function onAddItemToPacking(template: CargoTemplate) {
  if (!packing.addFromTemplate(template)) {
    toast.error('Нет места для груза')
  } else {
    toast.success(`Груз "${template.name}" добавлен`)
  }
}

function onAddCustomItem(template: CargoTemplate) {
  if (!packing.addCustomItem(template)) {
    toast.error('Нет места для груза')
  } else {
    toast.success(`Груз "${template.name}" добавлен`)
  }
}

function onDropTemplateAt(template: CargoTemplate, x: number, y: number): boolean {
  if (!packing.addFromTemplateAt(template, x, y)) {
    toast.error('Невозможно разместить груз в этой позиции')
    return false
  }
  toast.success(`Груз "${template.name}" добавлен`)
  return true
}

function openHistory() {
  asideTab.value = 'history'
  isAsideOpen.value = true
}

/* =========================
   INITIALIZATION
========================= */

onMounted(async () => {
  await Promise.all([
    containerStore.load(),
    historyStore.load(),
  ])

  // Инициализируем packing с активным контейнером
  if (containerStore.active.value) {
    packing.resetContainer(containerStore.active.value.container)
  }
})

watch(() => containerStore.active.value, (next) => {
  if (next) {
    packing.resetContainer(next.container)
  }
})
</script>

<template>
  <div class="layout">

    <div class="sections">
      <CargoTemplates
          @add-to-packing="onAddItemToPacking"
          :isProMode="isProMode"
      />

      <PackingList
          :title="currentPackingTitle"
          :comment="currentPackingComment"
          :shippingDate="currentShippingDate"
          :placements="packing.placements.value"
          :mode="packing.mode.value"
          :isProMode="isProMode"
          :volumeFill="packing.volumeFill.value"
          :floorFill="packing.floorFill.value"
          :usedWeight="packing.usedWeight.value"
          :canRemove="packing.canModify"
          :showModeSwitch="isProMode"
          :showOptimize="isProMode"
          :showAddCargo="isProMode"
          :onSave="savePacking"
          :onSetMode="packing.setMode"
          :onRotate="packing.rotatePlacement"
          :onRemove="packing.removePlacement"
          :onEdit="packing.editPlacement"
          :onOptimize="packing.optimize"
          :onAddCustom="onAddCustomItem"
          :onExportPdf="handleExportPdf"
          @open-history="openHistory"
      />
    </div>

    <div class="scenes">
      <PackingScene2D
          v-if="containerStore.active.value"
          ref="sceneRef"
          :container="containerStore.active.value.container"
          :placements="packing.placements.value"
          :canModify="packing.canModify"
          :onMove="packing.movePlacement"
          :onRemove="packing.removePlacement"
          :onRotate="packing.rotatePlacement"
          :onDropTemplate="onDropTemplateAt"
          :step="packing.step"
      />
      <PackingScene3D
          v-if="isProMode && containerStore.active.value"
          :container="containerStore.active.value.container"
          :placements="packing.placements.value"
      />
    </div>

    <AsideBar
        v-model:open="isAsideOpen"
        :activeTab="asideTab"
        @set-tab="asideTab = $event"
        v-slot="{ activeTab }"
    >
      <PackingHistory
          v-if="activeTab === 'history'"
          :items="historyStore.items.value"
          :activeId="activeHistoryId"
          @load="loadFromHistory"
          @remove="onRemoveFromHistory"
      />
      <ContainerTemplates
          v-if="activeTab === 'settings'"
          :templates="containerStore.templates.value"
          :activeId="containerStore.activeId.value"
          @select="selectContainer"
          @create="createContainer"
          @update="updateContainer"
          @remove="removeContainer"
      />
    </AsideBar>

  </div>

  <ToastContainer/>
  <DragGhost/>
</template>

<style lang="scss">

.layout {
  display: grid;
  gap: 16px;
  padding: var(--spacing-sm);

  /* 🔹 Desktop grid: левая растягивается, правая (сцена) — по содержимому */
  grid-template-columns: 1fr auto;
}

/* =========================
   TEMPLATES SECTION
========================= */

.sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.layout * {
  box-sizing: border-box;
}

/* =========================
   GRID AREAS
========================= */


/* =========================
   SCENES (sticky, высота = viewport)
========================= */

.scenes {
  position: sticky;
  top: calc(var(--titlebar-height, 0px) + var(--spacing-sm));
  align-self: start;

  /* Высота сцены = viewport минус отступы */
  --scene-height: calc(100vh - var(--titlebar-height, 0px) - var(--spacing-sm) * 2);
}

/* Сцена: фиксированная высота, ширина из aspect-ratio */
.scenes :deep(.scene) {

}

.scene3D {
  margin-top: 16px;
}

/* =========================
   OFFSET MAIN CONTENT
========================= */

.layout {
  margin-left: calc(56px + 16px);
}

/* =========================
   MOBILE
========================= */

@media (max-width: 780px) {
  .layout {
    grid-template-columns: 1fr;
    margin-left: 64px;
    //padding: 16px;
  }

  .scenes {
    position: static;
    max-height: none;
    order: -1; /* сцена сверху */
  }

  .scene3D {
    margin-top: 16px;
  }
}

</style>
<script setup lang="ts">
import { ref, watch, toRaw, onMounted, markRaw } from 'vue'

import CargoTemplates from '@/components/CargoTemplates.vue'
import ContainerTemplates from '@/components/ContainerTemplates.vue'
import PackingList from '@/components/PackingList.vue'
import PackingScene3D from '@/components/PackingScene3D.vue'
import PackingScene2D from '@/components/PackingScene2D.vue'
import PackingHistory from '@/components/PackingHistory.vue'
import AsideBar, { type AsideTab } from '@/components/AsideBar.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import DragGhost from '@/components/ui/DragGhost.vue'

import BookIcon from '@/assets/icon/book.svg'
import SettingsIcon from '@/assets/icon/settings.svg'

import { usePacking } from '@/domain/packing/usePacking'
import { useToast } from '@/composables/useToast'
import { useContainerManager } from '@/composables/useContainerManager'
import { usePackingHistory } from '@/composables/usePackingHistory'
import { usePackingSession } from '@/composables/usePackingSession'

import { exportToPdf } from '@/utils/exportPdf'

import type { CargoTemplate } from '@/data/templates/types'
import type { PackingHistoryItem } from '@/data/history/types'
import type { Placement } from '@/engine/types'

/* =========================
   UI STATE
========================= */

const isAsideOpen = ref(false)
const asideTab = ref('history')

/** Конфигурация вкладок бокового меню */
const asideTabs: AsideTab[] = [
  { id: 'history', icon: markRaw(BookIcon), label: 'История' },
  { id: 'settings', icon: markRaw(SettingsIcon), label: 'Настройки' },
]
const isProMode = ref(false)
const sceneRef = ref<InstanceType<typeof PackingScene2D> | null>(null)

/* =========================
   CORE SERVICES
========================= */

const toast = useToast()

const packing = usePacking(
    { width: 2400, length: 7200, height: 2000 },
    { step: 10, floorOnly: !isProMode.value }
)

const containers = useContainerManager({
    onContainerChange: (container) => packing.resetContainer(container)
})

const history = usePackingHistory()
const session = usePackingSession()

/* =========================
   MODE SYNC
========================= */

watch(isProMode, (isPro) => {
    packing.setFloorOnly(!isPro)
})

/* =========================
   HISTORY OPERATIONS
========================= */

async function handleSave(meta: { title: string; comment?: string; shippingDate?: string }) {
    if (!containers.active.value) return

    const item = session.createHistoryItem({
        meta,
        container: containers.active.value.container,
        placements: packing.placements.value,
        mode: packing.mode.value,
    })

    await history.save(item)
    session.updateFromSaved(item)

    toast.success(`Погрузка "${item.title}" сохранена`)
}

function handleLoadFromHistory(item: PackingHistoryItem) {
    session.loadFrom(item)

    packing.resetContainer(item.container)
    packing.setMode(item.mode)
    packing.restorePlacements(item.placements)

    toast.info(`Загружена компоновка "${item.title}"`)
}

async function handleRemoveFromHistory(id: string) {
    await history.remove(id)
    session.detachIfMatches(id)
    toast.warning('Погрузка удалена из истории')
}

/* =========================
   CARGO OPERATIONS
========================= */

function handleAddCargo(template: CargoTemplate) {
    const success = packing.addFromTemplate(template)
    showCargoResult(success, template.name)
}

function handleAddCustomCargo(template: CargoTemplate) {
    const success = packing.addCustomItem(template)
    showCargoResult(success, template.name)
}

function handleDropCargoAt(template: CargoTemplate, x: number, y: number): boolean {
    const success = packing.addFromTemplateAt(template, x, y)
    showCargoResult(success, template.name)
    return success
}

function showCargoResult(success: boolean, name: string) {
    if (success) {
        toast.success(`Груз "${name}" добавлен`)
    } else {
        toast.error('Нет места для груза')
    }
}

/* =========================
   CARGO MODIFICATIONS
========================= */

function handleRotatePlacement(id: string) {
    const result = packing.rotatePlacement(id)

    if (!result.success) {
        toast.error('Невозможно повернуть груз — нет места')
        return
    }
}

function handleEditPlacement(id: string, patch: Partial<Placement>) {
    const result = packing.editPlacement(id, patch)

    if (!result.success) {
        toast.error('Невозможно изменить груз — нет места')
        return
    }

    if (result.relocated) {
        toast.info('Груз изменён и перемещён')
    }
}

/* =========================
   PDF EXPORT
========================= */

async function handleExportPdf() {
    if (!sceneRef.value?.$el || !containers.active.value) return

    await toast.promise(
        () => exportToPdf(sceneRef.value!.$el, {
            title: session.title.value,
            comment: session.comment.value,
            shippingDate: session.shippingDate.value,
            containerName: containers.active.value!.name,
            container: containers.active.value!.container,
            placements: toRaw(packing.placements.value).map(p => ({ ...toRaw(p) })),
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
   UI HELPERS
========================= */

function openHistory() {
    asideTab.value = 'history'
    isAsideOpen.value = true
}

/* =========================
   INITIALIZATION
========================= */

onMounted(async () => {
    await Promise.all([
        containers.init(),
        history.load(),
    ])
})
</script>

<template>
  <div class="layout">

    <div class="sections">
      <CargoTemplates
          @add-to-packing="handleAddCargo"
          :isProMode="isProMode"
      />

      <PackingList
          :title="session.title.value"
          :comment="session.comment.value"
          :shippingDate="session.shippingDate.value"
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
          :onSave="handleSave"
          :onSetMode="packing.setMode"
          :onRotate="handleRotatePlacement"
          :onRemove="packing.removePlacement"
          :onEdit="handleEditPlacement"
          :onOptimize="packing.optimize"
          :onAddCustom="handleAddCustomCargo"
          :onExportPdf="handleExportPdf"
          @open-history="openHistory"
      />
    </div>

    <div class="scenes">
      <PackingScene2D
          v-if="containers.active.value"
          ref="sceneRef"
          :container="containers.active.value.container"
          :placements="packing.placements.value"
          :canModify="packing.canModify"
          :onMove="packing.movePlacement"
          :onRemove="packing.removePlacement"
          :onRotate="handleRotatePlacement"
          :onDropTemplate="handleDropCargoAt"
          :checkMovePosition="packing.checkMovePosition"
          :findDropPosition="packing.findDropPosition"
          :step="packing.step"
      />
      <PackingScene3D
          v-if="isProMode && containers.active.value"
          :container="containers.active.value.container"
          :placements="packing.placements.value"
      />
    </div>

    <AsideBar
        v-model:open="isAsideOpen"
        v-model:activeTab="asideTab"
        :tabs="asideTabs"
        v-slot="{ activeTab }"
    >
      <PackingHistory
          v-if="activeTab === 'history'"
          :items="history.items.value"
          :activeId="session.activeId.value"
          @load="handleLoadFromHistory"
          @remove="handleRemoveFromHistory"
      />
      <ContainerTemplates
          v-if="activeTab === 'settings'"
          :templates="containers.templates.value"
          :activeId="containers.activeId.value"
          @select="containers.select"
          @create="containers.create"
          @update="containers.update"
          @remove="containers.remove"
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
  grid-template-columns: 1fr auto;
}

.sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.layout * {
  box-sizing: border-box;
}

.scenes {
  position: sticky;
  top: calc(var(--titlebar-height, 0px) + var(--spacing-sm));
  align-self: start;
  --scene-height: calc(100vh - var(--titlebar-height, 0px) - var(--spacing-sm) * 2);
  padding: 0 var(--spacing-xl);
}

.scene3D {
  margin-top: 16px;
}

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
  }

  .scenes {
    position: static;
    max-height: none;
    order: -1;
    padding: 0;
  }

  .scene3D {
    margin-top: 16px;
  }
}

</style>

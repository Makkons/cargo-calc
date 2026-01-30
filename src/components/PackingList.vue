<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Placement } from '@/engine/types'
import CargoModal from '@/components/modals/CargoModal.vue'
import CargoPreview from '@/components/ui/CargoPreview.vue'
import type { CargoTemplate } from '@/data/templates/types'
import PackingSaveModal from '@/components/modals/PackingSaveModal.vue'
import { useHighlightedPlacement } from '@/composables/useHighlightedPlacement'

const { highlightedId, setHighlighted } = useHighlightedPlacement()

type PackingMode = 'uniform' | 'dense'

const emit = defineEmits<{
  (e: 'open-history'): void
}>()

const props = withDefaults(
  defineProps<{
    title: string
    comment?: string
    shippingDate?: string

    placements: Placement[]
    canRemove: (id: string) => boolean
    mode: PackingMode

    /** Pro режим приложения */
    isProMode?: boolean

    showModeSwitch?: boolean
    showOptimize?: boolean
    showAddCargo?: boolean

    onRotate: (id: string) => void
    onSetMode: (mode: PackingMode) => void
    onRemove: (id: string) => void
    onEdit: (id: string, patch: Partial<Placement>) => void
    onOptimize: () => void
    onAddCustom: (template: CargoTemplate) => void
    onExportPdf: () => void

    /** Заполнение по объёму (для pro режима) */
    volumeFill: number
    /** Заполнение по площади пола (для default режима) */
    floorFill?: number
    usedWeight: number

    onSave: (meta: {
      title: string
      comment?: string
      shippingDate?: string
    }) => void
  }>(),
  {
    isProMode: false,
    showModeSwitch: true,
    showOptimize: true,
    showAddCargo: false,
    floorFill: 0,
  }
)

const showEditModal = ref(false)
const showCreateModal = ref(false)
const showSaveModal = ref(false)
const editingPlacementId = ref<string | null>(null)

const editingPlacement = computed(() =>
    editingPlacementId.value
        ? props.placements.find(p => p.id === editingPlacementId.value) ?? null
        : null
)

function openEdit(p: Placement) {
  if (!props.canRemove(p.id)) return
  editingPlacementId.value = p.id
  showEditModal.value = true
}

function saveEdited(patch: Placement) {
  if (!editingPlacement.value) return

  props.onEdit(editingPlacement.value.id, {
    name: patch.name,
    color: patch.color,
    weight: patch.weight,
    width: patch.width,
    length: patch.length,
    height: patch.height,
    fragile: patch.fragile,
  })

  showEditModal.value = false
  editingPlacementId.value = null
}

/** Текущее заполнение — объём для pro, площадь для default */
const currentFill = computed(() =>
    props.isProMode ? props.volumeFill : props.floorFill
)

const fillLabel = computed(() =>
    props.isProMode ? 'Объём' : 'Площадь'
)

/**
 * Грузы отсортированные по позиции в контейнере:
 * - Сначала по Y (от начала контейнера к концу)
 * - При равном Y - по X (слева направо)
 *
 * Это соответствует порядку чтения и упрощает сопоставление
 * списка с 2D сценой и PDF.
 */
const sortedPlacements = computed(() =>
    [...props.placements].sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y
        return a.x - b.x
    })
)
</script>

<template>
  <div class="packing-list">
    <h2 class="packing-list__title">{{ title }}</h2>

    <p v-if="comment" class="packing-list__subtitle">{{ comment }}</p>
    <p v-if="shippingDate" class="packing-list__subtitle">Отгрузка: {{ shippingDate }}</p>

    <div class="packing-list__status">
      <div class="packing-list__bar">
        <div class="packing-list__bar-fill" :style="{ width: Math.round(currentFill * 100) + '%' }" />
      </div>
      <div class="packing-list__labels">
        <span>{{ fillLabel }}: {{ Math.round(currentFill * 100) }}%</span>
        <span v-if="usedWeight > 0">Вес: {{ usedWeight }} кг</span>
      </div>
    </div>

    <div class="packing-list__actions">
      <div v-if="showModeSwitch" class="packing-list__mode-switch">
        <button
            :class="{ 'packing-list__mode-btn--active': mode === 'uniform' }"
            @click="props.onSetMode('uniform')"
        >
          Равномерно
        </button>
        <button
            :class="{ 'packing-list__mode-btn--active': mode === 'dense' }"
            @click="props.onSetMode('dense')"
        >
          Плотно
        </button>
      </div>

      <button v-if="showAddCargo" class="packing-list__action-btn" @click="showCreateModal = true">＋ Добавить груз</button>
      <button v-if="showOptimize" class="packing-list__action-btn" @click="props.onOptimize" :disabled="placements.length === 0">🔄 Оптимизировать</button>
      <button class="packing-list__action-btn" @click="showSaveModal = true" :disabled="placements.length === 0">
        💾 Сохранить
      </button>
      <button class="packing-list__action-btn" :disabled="placements.length === 0" @click="props.onExportPdf">
        📄 Выгрузить в PDF
      </button>
      <button class="packing-list__action-btn" @click="emit('open-history')">
        📋 История
      </button>
    </div>

    <div v-if="placements.length === 0" class="packing-list__empty">
      Грузы не добавлены
    </div>

    <div
        v-for="p in sortedPlacements"
        :key="p.id"
        class="packing-item"
        :class="{ 'packing-item--highlighted': highlightedId === p.id }"
        @mouseenter="setHighlighted(p.id)"
        @mouseleave="setHighlighted(null)"
    >
      <div class="packing-item__info">
        <strong class="packing-item__name">{{ p.name || 'Груз' }}</strong>
        <div class="packing-item__size">{{ p.width }} × {{ p.length }} × {{ p.height }}</div>
        <div v-if="p.weight != null" class="packing-item__weight">{{ p.weight }} кг</div>
      </div>

      <CargoPreview :width="p.width" :length="p.length" :color="p.color" />

      <div class="packing-item__controls">
        <button class="packing-item__btn" @click="openEdit(p)" :disabled="!canRemove(p.id)">✏️</button>
        <button class="packing-item__btn packing-item__btn--rotate" @click="props.onRotate(p.id)" :disabled="!canRemove(p.id)">↻</button>
        <button class="packing-item__btn packing-item__btn--danger" @click="props.onRemove(p.id)" :disabled="!canRemove(p.id)">✕</button>
      </div>
    </div>

    <CargoModal
        v-if="editingPlacement"
        :open="showEditModal"
        mode="edit"
        :item="editingPlacement"
        @close="showEditModal = false"
        @save="saveEdited"
    />

    <CargoModal
        v-if="showCreateModal"
        :open="true"
        mode="create"
        :item="undefined"
        @close="showCreateModal = false"
        @save="props.onAddCustom"
    />

    <PackingSaveModal
        :open="showSaveModal"
        :defaultTitle="title"
        @close="showSaveModal = false"
        @save="props.onSave"
    />
  </div>
</template>

<style scoped lang="scss">
/* ===== Panel ===== */

.packing-list {
  padding: var(--spacing-xl, 20px);
  border-radius: var(--radius-xl, 12px);
  background: #ffffff;
  border: 1px solid var(--color-border, #e5e7eb);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
}

/* ===== Header ===== */

.packing-list__title {
  margin: 0 0 var(--spacing-xs, 4px);
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

.packing-list__subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary, #6b7280);
}

/* ===== Status ===== */

.packing-list__status {
  margin: 14px 0 18px;
}

.packing-list__bar {
  height: 8px;
  background: var(--color-border, #e5e7eb);
  border-radius: 999px;
  overflow: hidden;
}

.packing-list__bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #66bb6a);
  transition: width 0.25s ease;
}

.packing-list__labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
  margin-top: var(--spacing-xs, 4px);
}

/* ===== Actions ===== */

.packing-list__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm, 8px);
  align-items: center;
  margin-bottom: var(--spacing-lg, 16px);
}

.packing-list__action-btn {
  padding: var(--spacing-xs, 4px) var(--spacing-md, 12px);
  font-size: 13px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--color-border-hover, #d1d5db);
  background: var(--color-bg-card-hover, #f9fafb);
  color: var(--color-text-primary, #111827);
  cursor: pointer;
  transition: background var(--transition-fast, 0.15s ease),
              border-color var(--transition-fast, 0.15s ease);
}

.packing-list__action-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.packing-list__action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== Mode Switch ===== */

.packing-list__mode-switch {
  display: flex;
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
  border: 1px solid var(--color-border-hover, #d1d5db);
}

.packing-list__mode-switch button {
  padding: var(--spacing-xs, 4px) 14px;
  font-size: 12px;
  background: var(--color-bg-card-hover, #f9fafb);
  border: none;
  cursor: pointer;
  color: #374151;
  transition: background var(--transition-fast, 0.15s ease);
}

.packing-list__mode-btn--active {
  background: var(--color-primary, #2563eb) !important;
  color: #ffffff !important;
}

.packing-list__mode-btn--active:hover {
  background: var(--color-primary-hover, #1d4ed8) !important;
}

/* ===== Empty ===== */

.packing-list__empty {
  font-size: 13px;
  color: var(--color-text-muted, #9ca3af);
  padding: var(--spacing-md, 12px) 0;
}

/* ===== Items (Card) ===== */

.packing-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 12px);

  padding: var(--spacing-md, 12px);
  margin-bottom: var(--spacing-sm, 8px);

  border-radius: var(--radius-lg, 10px);
  border: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-bg-card, #fafafa);

  transition: background var(--transition-fast, 0.15s ease),
              border-color var(--transition-fast, 0.15s ease);
}

.packing-item:hover {
  background: var(--color-bg-card-hover, #f9fafb);
  border-color: var(--color-border-hover, #d1d5db);
}

.packing-item--highlighted {
  background: #fef3c7 !important;
  border-color: #fbbf24 !important;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
}

.packing-item__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 4px);
}

.packing-item__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #111827);
}

.packing-item__size {
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
}

.packing-item__weight {
  font-size: 12px;
  color: #374151;
}

/* ===== Controls ===== */

.packing-item__controls {
  display: flex;
  gap: var(--spacing-xs, 4px);
}

.packing-item__btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--color-border-hover, #d1d5db);
  background: #ffffff;
  cursor: pointer;
  font-size: 14px;
  transition: background var(--transition-fast, 0.15s ease),
              border-color var(--transition-fast, 0.15s ease);
  &:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  &--danger:hover:not(:disabled) {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #b91c1c;
  }
  &--rotate {
    background: #f0f9ff;
    border-color: #bae6fd;
    color: #0369a1;
    &:hover:not(:disabled) {
      background: #e0f2fe;
      border-color: #7dd3fc;
    }
  }
}
</style>

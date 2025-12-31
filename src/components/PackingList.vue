<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Placement } from '@/engine/types'
import CargoModal from '@/components/modals/CargoModal.vue'
import CargoPreview from '@/components/ui/CargoPreview.vue'
import type { CargoTemplate } from '@/data/templates/types'
import PackingSaveModal from '@/components/modals/PackingSaveModal.vue'

type PackingMode = 'uniform' | 'dense'

const props = defineProps<{
  title: string
  comment?: string
  shippingDate?: string

  placements: Placement[]
  canRemove: (id: string) => boolean
  mode: PackingMode

  onRotate: (id: string) => void
  onSetMode: (mode: PackingMode) => void
  onRemove: (id: string) => void
  onEdit: (id: string, patch: Partial<Placement>) => void
  onOptimize: () => void
  onAddCustom: (template: CargoTemplate) => void

  volumeFill: number
  usedWeight: number

  onSave: (meta: {
    title: string
    comment?: string
    shippingDate?: string
  }) => void
}>()

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
</script>

<template>
  <div class="packing-list">
    <h2>{{ title }}</h2>

    <p v-if="comment">{{ comment }}</p>
    <p v-if="shippingDate">Отгрузка: {{ shippingDate }}</p>

    <div class="status">
      <div class="bar">
        <div class="bar-fill" :style="{ width: Math.round(volumeFill * 100) + '%' }" />
      </div>
      <div class="labels">
        <span>Объём: {{ Math.round(volumeFill * 100) }}%</span>
        <span v-if="usedWeight > 0">Вес: {{ usedWeight }} кг</span>
      </div>
    </div>

    <div class="actions">
      <div class="mode-switch">
        <button :class="{ active: mode === 'uniform' }" @click="props.onSetMode('uniform')">
          Равномерно
        </button>
        <button :class="{ active: mode === 'dense' }" @click="props.onSetMode('dense')">
          Плотно
        </button>
      </div>

      <button @click="showCreateModal = true">＋ Добавить груз</button>
      <button @click="props.onOptimize" :disabled="placements.length === 0">🔄 Оптимизировать</button>
      <button :disabled="placements.length === 0">
        💾 Сохранить
      </button>
      <button @click="showSaveModal = true" :disabled="placements.length === 0">
        📄 Выгрузить в PDF
      </button>
    </div>

    <div v-if="placements.length === 0" class="empty">
      Грузы не добавлены
    </div>

    <div v-for="p in placements" :key="p.id" class="packing-item">
      <div class="info">
        <strong>{{ p.name || 'Груз' }}</strong>
        <div class="size">{{ p.width }} × {{ p.length }} × {{ p.height }}</div>
        <div v-if="p.weight != null" class="weight">{{ p.weight }} кг</div>
      </div>

      <CargoPreview :width="p.width" :length="p.length" :color="p.color" />

      <div class="controls">
        <button @click="openEdit(p)" :disabled="!canRemove(p.id)">✏️</button>
        <button @click="props.onRotate(p.id)" :disabled="!canRemove(p.id)">🔄</button>
        <button @click="props.onRemove(p.id)" :disabled="!canRemove(p.id)">✕</button>
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

<style scoped>
.packing-list {
  padding: 20px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
}

/* ===== Header ===== */

.packing-list h2 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.packing-list p {
  margin: 0;
  font-size: 13px;
  color: #4b5563;
}

/* ===== Status ===== */

.status {
  margin: 14px 0 18px;
}

.bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #66bb6a);
  transition: width 0.25s ease;
}

.labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
  margin-top: 6px;
}

/* ===== Actions ===== */

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.actions button {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #111827;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.actions button:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== Mode Switch ===== */

.mode-switch {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #d1d5db;
}

.mode-switch button {
  padding: 6px 14px;
  font-size: 12px;
  background: #f9fafb;
  border: none;
  cursor: pointer;
  color: #374151;
}

.mode-switch button.active {
  background: #2563eb;
  color: #ffffff;
}
.mode-switch button.active:hover {
  background: #174fca;
}

/* ===== Empty ===== */

.empty {
  font-size: 13px;
  color: #9ca3af;
  padding: 12px 0;
}

/* ===== Items ===== */

.packing-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  margin-bottom: 8px;
  background: #fafafa;
  transition: background 0.15s, border-color 0.15s;
}

.packing-item:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.info {
  flex: 1;
}

.info strong {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}

.size {
  font-size: 12px;
  color: #6b7280;
}

.weight {
  font-size: 12px;
  color: #374151;
}

/* ===== Controls ===== */

.controls {
  display: flex;
  gap: 6px;
}

.controls button {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.15s, border-color 0.15s;
}

.controls button:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.controls button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
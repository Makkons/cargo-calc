<script setup lang="ts">
import { ref } from 'vue'
import CargoPreview from '@/components/ui/CargoPreview.vue'
import CargoModal from '@/components/modals/CargoModal.vue'
import { loadFromStorage, saveToStorage } from '@/utils/storage'
import type { CargoTemplate } from '@/data/templates/types'

const STORAGE_KEY = 'cargo-templates'

/* =========================
   EMITS
========================= */

const emit = defineEmits<{
  (e: 'add-to-packing', template: CargoTemplate): void
}>()

/* =========================
   STATE
========================= */

const templates = ref<CargoTemplate[]>(
    loadFromStorage<CargoTemplate[]>(STORAGE_KEY, [])
)

const showModal = ref(false)
const editing = ref<CargoTemplate | null>(null)
const mode = ref<'create' | 'edit'>('create')

/* =========================
   HELPERS
========================= */

function persist() {
  saveToStorage(STORAGE_KEY, templates.value)
}

/* =========================
   CRUD
========================= */

function openCreate() {
  mode.value = 'create'
  editing.value = null
  showModal.value = true
}

function openEdit(t: CargoTemplate) {
  mode.value = 'edit'
  // ❗ создаём копию, а не прокси
  editing.value = { ...t }
  showModal.value = true
}

function save(template: CargoTemplate) {
  if (mode.value === 'create') {
    templates.value.push({
      ...template,
      id: crypto.randomUUID(), // ✅ всегда новый id
    })
  } else {
    const idx = templates.value.findIndex(t => t.id === template.id)
    if (idx !== -1) {
      templates.value[idx] = { ...template }
    }
  }

  persist()
  showModal.value = false
}

function remove(id: string) {
  templates.value = templates.value.filter(t => t.id !== id)
  persist()
}

/* =========================
   ACTIONS
========================= */

function addToPacking(template: CargoTemplate) {
  emit('add-to-packing', template)
}
</script>

<template>
  <div class="cargo-templates">
    <h2>Шаблоны грузов</h2>

    <button @click="openCreate">
      + Добавить шаблон
    </button>

    <CargoModal
        :open="showModal"
        :item="editing ?? undefined"
        :mode="mode"
        @close="showModal = false"
        @save="save"
    />

    <div
        v-for="template in templates"
        :key="template.id"
        class="template"
    >
      <div class="info">
        <strong>{{ template.name }}</strong>

        <div class="size">
          {{ template.width }} × {{ template.length }} × {{ template.height }}
        </div>

        <CargoPreview
            :width="template.width"
            :length="template.length"
            :color="template.color"
        />

        <div v-if="template.weight" class="weight">
          {{ template.weight }} кг
        </div>
        <div v-if="template.fragile" class="fragile">
          хрупкий
        </div>
      </div>

      <div class="controls">
        <button @click="openEdit(template)">✏️</button>
        <button @click="addToPacking(template)">＋</button>
        <button @click="remove(template.id)">✕</button>
      </div>
    </div>

    <p v-if="templates.length === 0">
      Шаблонов пока нет
    </p>
  </div>
</template>

<style scoped>
.cargo-templates {
  padding: 20px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
}

/* ===== Header ===== */

.cargo-templates h2 {
  margin: 0 0 12px;
  font-size: 17px;
  font-weight: 600;
  color: #111827;
}

/* ===== Add button ===== */

.cargo-templates > button {
  width: 100%;
  margin-bottom: 12px;
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 500;
  color: #2563eb;
  background: #eef4ff;
  border: 1px dashed #c7d2fe;
  border-radius: 8px;
  cursor: pointer;
  transition:
      background 0.15s ease,
      border-color 0.15s ease;
}

.cargo-templates > button:hover {
  background: #e0eaff;
  border-color: #a5b4fc;
}

/* ===== Empty ===== */

.cargo-templates p {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 8px;
}

/* ===== Template card ===== */

.template {
  margin-top: 8px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fafafa;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  transition:
      background 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease;
}

.template:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

/* ===== Info ===== */

.info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info strong {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}

/* ===== Size ===== */

.size {
  font-size: 12px;
  color: #6b7280;
}

/* ===== Weight ===== */

.weight {
  font-size: 12px;
  color: #374151;
}

/* ===== Fragile ===== */

.fragile {
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  color: #b91c1c;
  background: #fee2e2;
  padding: 2px 6px;
  border-radius: 6px;
  width: fit-content;
}

/* ===== Controls ===== */

.controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.controls button {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
}

/* edit */

.controls button:nth-child(1):hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

/* add */

.controls button:nth-child(2) {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #047857;
}

.controls button:nth-child(2):hover {
  background: #d1fae5;
  border-color: #6ee7b7;
}

/* delete */

.controls button:nth-child(3):hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}
</style>
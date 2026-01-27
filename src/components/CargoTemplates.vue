<script setup lang="ts">
import { onMounted } from 'vue'
import CargoPreview from '@/components/ui/CargoPreview.vue'
import CargoModal from '@/components/modals/CargoModal.vue'
import ConfirmModal from '@/components/modals/ConfirmModal.vue'
import { useCargoTemplates } from '@/composables/useCargoTemplates'
import { useDragTemplate } from '@/composables/useDragTemplate'
import type { CargoTemplate } from '@/data/templates/types'
import { ref } from 'vue'

const { startDrag } = useDragTemplate()
const cargoStore = useCargoTemplates()

const props = withDefaults(
    defineProps<{
      isProMode?: boolean
    }>(),
    {
      isProMode: false
    }
)

/* =========================
   EMITS
========================= */

const emit = defineEmits<{
  (e: 'add-to-packing', template: CargoTemplate): void
}>()

/* =========================
   MODAL STATE
========================= */

const showModal = ref(false)
const editing = ref<CargoTemplate | null>(null)
const mode = ref<'create' | 'edit'>('create')

/* =========================
   DELETE CONFIRMATION
========================= */

const showDeleteConfirm = ref(false)
const deletingTemplate = ref<CargoTemplate | null>(null)

function confirmDelete(template: CargoTemplate) {
  deletingTemplate.value = template
  showDeleteConfirm.value = true
}

async function executeDelete() {
  if (deletingTemplate.value) {
    await cargoStore.remove(deletingTemplate.value.id)
  }
  showDeleteConfirm.value = false
  deletingTemplate.value = null
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deletingTemplate.value = null
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
  editing.value = { ...t }
  showModal.value = true
}

async function save(template: CargoTemplate) {
  if (mode.value === 'create') {
    await cargoStore.create(template)
  } else {
    await cargoStore.update(template)
  }

  showModal.value = false
}


async function rotate(id: string) {
  await cargoStore.rotate(id)
}

/* =========================
   ACTIONS
========================= */

function addToPacking(template: CargoTemplate) {
  emit('add-to-packing', template)
}

/* =========================
   DRAG & DROP
========================= */

function onTemplateMouseDown(template: CargoTemplate, e: MouseEvent) {
  // Игнорируем клики по кнопкам
  if ((e.target as HTMLElement).closest('.cargo-template__controls')) return

  e.preventDefault()
  startDrag(template)
}

/* =========================
   INITIALIZATION
========================= */

onMounted(() => {
  cargoStore.load()
})
</script>

<template>
  <div class="cargo-templates">
    <h2 class="cargo-templates__title">Шаблоны грузов</h2>

    <button class="cargo-templates__add-btn" @click="openCreate">
      + Добавить шаблон
    </button>

    <CargoModal
        v-if="showModal"
        :open="showModal"
        :item="editing ?? undefined"
        :mode="mode"
        :showFragile="props.isProMode"
        @close="showModal = false"
        @save="save"
    />

    <ConfirmModal
        v-if="showDeleteConfirm"
        :open="showDeleteConfirm"
        title="Удаление шаблона"
        :message="`Вы уверены, что хотите удалить шаблон «${deletingTemplate?.name}»?`"
        confirm-text="Удалить"
        cancel-text="Отмена"
        :danger="true"
        @confirm="executeDelete"
        @cancel="cancelDelete"
    />

    <div class="cargo-list">
      <div
          v-for="template in cargoStore.templates.value"
          :key="template.id"
          class="cargo-template"
          @mousedown="e => onTemplateMouseDown(template, e)"
      >
        <div class="cargo-template__info">
          <strong class="cargo-template__name">{{ template.name }}</strong>

          <div class="cargo-template__size">
            {{ template.width }} × {{ template.length }} × {{ template.height }}
          </div>

          <div v-if="template.weight" class="cargo-template__weight">
            {{ template.weight }} кг
          </div>
          <div v-if="template.fragile" class="cargo-template__fragile">
            хрупкий
          </div>
        </div>

        <CargoPreview
            :width="template.width"
            :length="template.length"
            :color="template.color"
        />

        <div class="cargo-template__controls">
          <button class="cargo-template__btn" title="Редактировать" @click="openEdit(template)">✏️</button>
          <button class="cargo-template__btn cargo-template__btn--rotate" title="Повернуть" @click="rotate(template.id)">↻</button>
          <button class="cargo-template__btn cargo-template__btn--add" title="Добавить на сцену" @click="addToPacking(template)">＋</button>
          <button class="cargo-template__btn cargo-template__btn--danger" title="Удалить" @click="confirmDelete(template)">✕</button>
        </div>
      </div>
    </div>

    <p v-if="cargoStore.templates.value.length === 0" class="cargo-templates__empty">
      Шаблонов пока нет
    </p>
  </div>
</template>

<style scoped>
/* ===== Panel ===== */

.cargo-templates {
  padding: var(--spacing-xl, 20px);
  border-radius: var(--radius-xl, 12px);
  background: #ffffff;
  border: 1px solid var(--color-border, #e5e7eb);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
}

/* ===== Header ===== */

.cargo-templates__title {
  margin: 0 0 var(--spacing-md, 12px);
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

/* ===== Add button ===== */

.cargo-templates__add-btn {
  width: 100%;
  margin-bottom: var(--spacing-md, 12px);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-primary, #2563eb);
  background: #eef4ff;
  border: 1px dashed #c7d2fe;
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: background var(--transition-fast, 0.15s ease),
              border-color var(--transition-fast, 0.15s ease);
}

.cargo-templates__add-btn:hover {
  background: #e0eaff;
  border-color: #a5b4fc;
}

/* ===== Empty ===== */

.cargo-templates__empty {
  font-size: 13px;
  color: var(--color-text-muted, #9ca3af);
  margin-top: var(--spacing-sm, 8px);
}
.cargo-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-sm, 8px);
}
/* ===== Template card ===== */

.cargo-template {
  padding: var(--spacing-md, 12px);
  border-radius: var(--radius-lg, 10px);
  border: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-bg-card, #fafafa);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md, 12px);
  transition: background var(--transition-fast, 0.15s ease),
              border-color var(--transition-fast, 0.15s ease);
}

.cargo-template:hover {
  background: var(--color-bg-card-hover, #f9fafb);
  border-color: var(--color-border-hover, #d1d5db);
  cursor: grab;
}

.cargo-template:active {
  cursor: grabbing;
}

/* ===== Info ===== */

.cargo-template__info {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: var(--spacing-xs, 4px);
}

.cargo-template__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #111827);
}

.cargo-template__size {
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
}

.cargo-template__weight {
  font-size: 12px;
  color: #374151;
}

.cargo-template__fragile {
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  color: #b91c1c;
  background: #fee2e2;
  padding: 2px 6px;
  border-radius: var(--radius-sm, 6px);
  width: fit-content;
}

/* ===== Controls ===== */

.cargo-template__controls {
  display: flex;
  //flex-direction: column;
  gap: var(--spacing-xs, 4px);
}

.cargo-template__btn {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--color-border-hover, #d1d5db);
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition: background var(--transition-fast, 0.15s ease),
              border-color var(--transition-fast, 0.15s ease),
              color var(--transition-fast, 0.15s ease);
}

.cargo-template__btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.cargo-template__btn--rotate {
  background: #f0f9ff;
  border-color: #bae6fd;
  color: #0369a1;
}

.cargo-template__btn--rotate:hover {
  background: #e0f2fe;
  border-color: #7dd3fc;
}

.cargo-template__btn--add {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #047857;
}

.cargo-template__btn--add:hover {
  background: #d1fae5;
  border-color: #6ee7b7;
}

.cargo-template__btn--danger:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}
</style>
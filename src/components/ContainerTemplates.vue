<script setup lang="ts">
import { ref } from 'vue'
import ContainerModal from '@/components/modals/ContainerModal.vue'
import ConfirmModal from '@/components/modals/ConfirmModal.vue'
import type { ContainerTemplate } from '@/data/containers/types'

const { templates, activeId } = defineProps<{
  templates: ContainerTemplate[]
  activeId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'create', template: ContainerTemplate): void
  (e: 'update', template: ContainerTemplate): void
  (e: 'remove', id: string): void
}>()

const showModal = ref(false)
const editing = ref<ContainerTemplate | undefined>(undefined)

/* =========================
   DELETE CONFIRMATION
========================= */

const showDeleteConfirm = ref(false)
const deletingContainer = ref<ContainerTemplate | null>(null)

function confirmDelete(container: ContainerTemplate) {
  deletingContainer.value = container
  showDeleteConfirm.value = true
}

function executeDelete() {
  if (deletingContainer.value) {
    emit('remove', deletingContainer.value.id)
  }
  showDeleteConfirm.value = false
  deletingContainer.value = null
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deletingContainer.value = null
}

/* =========================
   CRUD
========================= */

function openCreate() {
  editing.value = undefined
  showModal.value = true
}

function openEdit(template: ContainerTemplate) {
  editing.value = template
  showModal.value = true
}

function save(template: ContainerTemplate) {
  if (editing.value) {
    emit('update', template)
  } else {
    emit('create', template)
  }

  showModal.value = false
  editing.value = undefined
}
</script>

<template>
  <div class="container-templates" data-tab="settings">
    <h2 class="container-templates__title">Машины</h2>

    <button class="container-templates__add-btn" @click="openCreate">
      + Добавить машину
    </button>

    <ContainerModal
        v-if="showModal"
        :open="showModal"
        :item="editing"
        @close="showModal = false"
        @save="save"
    />

    <ConfirmModal
        v-if="showDeleteConfirm"
        :open="showDeleteConfirm"
        title="Удаление машины"
        :message="`Вы уверены, что хотите удалить машину «${deletingContainer?.name}»?`"
        confirm-text="Удалить"
        cancel-text="Отмена"
        :danger="true"
        @confirm="executeDelete"
        @cancel="cancelDelete"
    />

    <div
        v-for="c in templates"
        :key="c.id"
        class="container-template"
        :class="{ 'container-template--active': c.id === activeId }"
        @click="emit('select', c.id)"
    >
      <strong class="container-template__name">{{ c.name }}</strong>

      <div class="container-template__size">
        {{ c.container.width }} ×
        {{ c.container.length }} ×
        {{ c.container.height }}
      </div>

      <div class="container-template__weight">
        {{ c.maxWeight ? c.maxWeight + ' кг' : 'Без лимита веса' }}
      </div>

      <div class="container-template__controls">
        <button class="container-template__btn" @click.stop="openEdit(c)">✏️</button>
        <button class="container-template__btn container-template__btn--danger" @click.stop="confirmDelete(c)">✕</button>
      </div>
    </div>

    <p v-if="templates.length === 0" class="container-templates__empty">
      Машин пока нет
    </p>
  </div>
</template>

<style scoped>
/* ===== Panel ===== */

.container-templates {
  padding: var(--spacing-xl, 20px);
  border-radius: var(--radius-xl, 12px);
  background: #ffffff;
  border: 1px solid var(--color-border, #e5e7eb);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
}

/* ===== Header ===== */

.container-templates__title {
  margin: 0 0 var(--spacing-md, 12px);
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

/* ===== Add button ===== */

.container-templates__add-btn {
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

.container-templates__add-btn:hover {
  background: #e0eaff;
  border-color: #a5b4fc;
}

/* ===== Empty ===== */

.container-templates__empty {
  font-size: 13px;
  color: var(--color-text-muted, #9ca3af);
  margin-top: var(--spacing-sm, 8px);
}

/* ===== Container item ===== */

.container-template {
  margin-top: var(--spacing-sm, 8px);
  padding: var(--spacing-md, 12px);
  border-radius: var(--radius-lg, 10px);
  border: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-bg-card, #fafafa);
  cursor: pointer;
  transition: background var(--transition-fast, 0.15s ease),
              border-color var(--transition-fast, 0.15s ease),
              box-shadow var(--transition-fast, 0.15s ease);
}

.container-template:hover {
  background: var(--color-bg-card-hover, #f9fafb);
  border-color: var(--color-border-hover, #d1d5db);
}

.container-template--active {
  background: #eef4ff;
  border-color: var(--color-primary, #2563eb);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.15);
}

/* ===== Title ===== */

.container-template__name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #111827);
}

/* ===== Size ===== */

.container-template__size {
  margin-top: var(--spacing-xs, 4px);
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
}

/* ===== Weight ===== */

.container-template__weight {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
}

/* ===== Controls ===== */

.container-template__controls {
  margin-top: var(--spacing-sm, 8px);
  display: flex;
  gap: var(--spacing-xs, 4px);
}

.container-template__btn {
  width: 28px;
  height: 28px;
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

.container-template__btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.container-template__btn--danger:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}
</style>

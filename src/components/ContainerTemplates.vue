<script setup lang="ts">
import { ref } from 'vue'
import ContainerModal from '@/components/modals/ContainerModal.vue'
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

function openCreate() {
  editing.value = undefined
  showModal.value = true
}

function openEdit(template: ContainerTemplate) {
  editing.value = template      // ✅ БЕЗ clone
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
  <div class="container-templates">
    <h2>Машины</h2>

    <button @click="openCreate">
      + Добавить машину
    </button>

    <ContainerModal
        v-if="showModal"
        :open="true"
        :item="editing"
        @close="showModal = false"
        @save="save"
    />

    <div
        v-for="c in templates"
        :key="c.id"
        class="container"
        :class="{ active: c.id === activeId }"
        @click="emit('select', c.id)"
    >
      <strong>{{ c.name }}</strong>

      <div class="size">
        {{ c.container.width }} ×
        {{ c.container.length }} ×
        {{ c.container.height }}
      </div>

      <div class="weight">
        {{ c.maxWeight ? c.maxWeight + ' кг' : 'Без лимита веса' }}
      </div>

      <div class="controls">
        <button @click.stop="openEdit(c)">✏️</button>
        <button @click.stop="emit('remove', c.id)">✕</button>
      </div>
    </div>

    <p v-if="templates.length === 0">
      Машин пока нет
    </p>
  </div>
</template>

<style scoped>
.container-templates {
  padding: 20px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
}

/* ===== Header ===== */

.container-templates h2 {
  margin: 0 0 12px;
  font-size: 17px;
  font-weight: 600;
  color: #111827;
}

/* ===== Add button ===== */

.container-templates > button {
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

.container-templates > button:hover {
  background: #e0eaff;
  border-color: #a5b4fc;
}

/* ===== Empty ===== */

.container-templates p {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 8px;
}

/* ===== Container item ===== */

.container {
  margin-top: 8px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fafafa;
  cursor: pointer;
  transition:
      background 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease;
}

.container:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.container.active {
  background: #eef4ff;
  border-color: #2563eb;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.15);
}

/* ===== Title ===== */

.container strong {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}

/* ===== Size ===== */

.size {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

/* ===== Weight ===== */

.weight {
  margin-top: 2px;
  font-size: 12px;
  color: #6b7280;
}

/* ===== Controls ===== */

.controls {
  margin-top: 8px;
  display: flex;
  gap: 6px;
}

.controls button {
  width: 28px;
  height: 28px;
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

.controls button:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

/* delete */

.controls button:last-child:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}
</style>
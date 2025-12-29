<script setup lang="ts">
import { useCargoTemplatesStore } from '@/stores/cargoTemplatesStore'
import CargoPreview from '@/components/UI/CargoPreview.vue'
import type { CargoTemplate } from '@/types'

const store = useCargoTemplatesStore()

import { ref } from 'vue'
import CargoModal from '@/components/modals/CargoModal.vue'

const showModal = ref(false)
const editing = ref<CargoTemplate | undefined>(undefined)

function openCreate() {
  editing.value = undefined
  showModal.value = true
}

function openEdit(template: CargoTemplate) {
  editing.value = template
  showModal.value = true
}

function save(template: CargoTemplate) {
  if (editing.value) {
    store.updateTemplate(template)
  } else {
    store.addTemplate(template)
  }
}
</script>

<template>
  <div class="cargo-templates">
    <button @click="openCreate">+ Добавить шаблон</button>

    <CargoModal
        v-model="showModal"
        :item="editing || undefined"
        @save="save"
    />
    <h2>Шаблоны грузов</h2>

    <div
        v-for="template in store.templates"
        :key="template.id"
        class="template"
    >
      <div class="info">
        <strong>{{ template.name }}</strong>
        <div class="size">
          {{ template.size.width }} × {{ template.size.length }} × {{ template.size.height }}
        </div>
        <div class="weight">
          {{ template.weight ?
            template.weight + ' кг' :
            ''
          }}
        </div>
        <div class="color-preview">
          <CargoPreview
              :width="template.size.width"
              :length="template.size.length"
              :color="template.color"
          />
        </div>
      </div>

      <div class="controls">
        <button @click.stop="openEdit(template)">✏️</button>
        <button @click.stop="store.addToPacking(template)">+</button>
        <button @click.stop="store.removeTemplate(template.id)">✕</button>
      </div>
    </div>

    <p v-if="store.templates.length === 0">
      Шаблонов пока нет
    </p>
  </div>
</template>

<style scoped>
.cargo-templates {
  padding: 16px;
  border: 1px solid #ddd;
}

.template {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  margin-top: 8px;
  border: 1px solid #eee;
}

.size {
  font-size: 12px;
  color: #666;
}
</style>
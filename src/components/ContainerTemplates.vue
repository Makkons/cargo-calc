<script setup lang="ts">
import { useContainerTemplatesStore } from '@/stores/containerTemplatesStore'
import type { ContainerTemplate } from '@/types'

const store = useContainerTemplatesStore()

import { ref } from 'vue'
import ContainerModal from '@/components/modals/ContainerModal.vue'

const showModal = ref(false)
const editing = ref<ContainerTemplate | undefined>(undefined)

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
    store.updateTemplate(template)
  } else {
    store.addTemplate(template)
  }
}
</script>

<template>
  <div class="container-templates">
    <h2>Машины</h2>

    <button @click="openCreate">+ Добавить шаблон</button>

    <ContainerModal
        v-model="showModal"
        :item="editing"
        @save="save"
    />

    <div
        v-for="container in store.templates"
        :key="container.id"
        class="container"
        :class="{ active: container.id === store.activeId }"
        @click="store.selectContainer(container.id)"
    >
      <strong>{{ container.name }}</strong>

      <div class="size">
        {{ container.container.width }}
        × {{ container.container.length }}
        × {{ container.container.height }}
      </div>

      <div class="weight">
        {{ container.maxWeight
          ? container.maxWeight + ' кг'
          : 'Предельный вес не установлен'
        }}
      </div>

      <div class="controls">
        <button @click.stop="openEdit(container)">✏️</button>
        <button @click.stop="store.removeTemplate(container.id)">✕</button>
      </div>
    </div>

    <p v-if="store.templates.length === 0">
      Машин пока нет
    </p>
  </div>
</template>

<style scoped>
.container-templates {
  padding: 16px;
  border: 1px solid #ddd;
}

.container {
  padding: 8px;
  margin-top: 8px;
  border: 1px solid #eee;
  cursor: pointer;
}

.container.active {
  border-color: #1976d2;
  background: #e3f2fd;
}

.size {
  font-size: 12px;
  color: #666;
}
</style>
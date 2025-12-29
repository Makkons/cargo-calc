<script setup lang="ts">
import ContainerTemplates from '@/components/ContainerTemplates.vue'
import CargoTemplates from '@/components/CargoTemplates.vue'
import PackingList from '@/components/PackingList.vue'
import PackingScene3D from '@/components/PackingScene3D.vue'
import PackingHistory from '@/components/PackingHistory.vue'
import { usePackingStore } from '@/stores/packingStore'
import { useContainerTemplatesStore } from '@/stores/containerTemplatesStore'

const containerStore = useContainerTemplatesStore()
const packingStore = usePackingStore()

import { watch, onMounted } from 'vue'

watch(
    () => [containerStore.activeId, containerStore.templates],
    ([id, templates]) => {
      if (!id) {
        packingStore.clearContainer()
        return
      }

      const container = templates.find(v => v.id === id)
      if (container) {
        packingStore.setContainer(container.container)
      }
    },
    { immediate: true, deep: true }
)
</script>

<template>
  <div class="layout">
    <ContainerTemplates />
    <CargoTemplates />
    <PackingList />
    <PackingScene3D
        :container="packingStore.container"
        :result="packingStore.result"
        :active-result-layer-index="packingStore.activeLayerIndex"
    />
    <PackingHistory />
  </div>
</template>

<style>
.layout {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}
</style>
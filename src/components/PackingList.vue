<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePackingStore } from '@/stores/packingStore'
import type { PackingItem } from '@/types'
import CargoModal from '@/components/modals/CargoModal.vue'

const store = usePackingStore()

const showModal = ref(false)
const editingItem = ref<PackingItem | null>(null)

/* ============================
   АКТИВНЫЙ СЛОЙ
============================ */

const activeLayerIndex = computed(() => store.activeLayerIndex)

/* ============================
   ГРУЗЫ АКТИВНОГО СЛОЯ
============================ */

const itemsInActiveLayer = computed(() => {
  const layer = store.layers[store.activeLayerIndex]
  if (!layer) return []

  return layer.itemIds
      .map(id => store.items.find(i => i.id === id))
      .filter(Boolean) as PackingItem[]
})

/* ============================
   ACTIONS
============================ */

function openCreate() {
  editingItem.value = null
  showModal.value = true
}

function openEdit(item: PackingItem) {
  editingItem.value = item
  showModal.value = true
}

function save(item: PackingItem) {
  if (editingItem.value) {
    store.updateItem(item)
  } else {
    store.addItem(item)
  }
}

function removeItem(id: string) {
  store.removeItem(id)
}

function setActiveLayer(index: number) {
  store.setActiveLayer(index)
}

function addLayer() {
  store.createNextLayer()
}
</script>

<template>
  <div class="packing-list">
    <h2>Список компоновки</h2>

    <!-- ============================
         ВКЛАДКИ СЛОЁВ
    ============================ -->
    <div class="layers-tabs">
      <button
          v-for="(layer, index) in store.layers"
          :key="layer.id"
          class="layer-tab"
          :class="{ active: index === activeLayerIndex }"
          @click="setActiveLayer(index)"
      >
        Слой {{ index + 1 }}
      </button>

      <button class="layer-tab add" :disabled="!store.canCreateLayer" @click="addLayer">
        +
      </button>
    </div>

    <!-- ============================
         ACTIONS
    ============================ -->
    <div class="actions">
      <button @click="openCreate">
        ➕ Добавить груз
      </button>

      <button
          v-if="store.items.length > 0"
          @click="store.optimize()"
      >
        Оптимизировать
      </button>
    </div>

    <!-- ============================
         СПИСОК ГРУЗОВ СЛОЯ
    ============================ -->
    <div v-if="itemsInActiveLayer.length === 0" class="empty">
      В этом слое грузов нет
    </div>

    <div
        v-for="item in itemsInActiveLayer"
        :key="item.id"
        class="packing-item"
    >
      <div class="info">
        <strong>{{ item.name }}</strong>

        <div class="size">
          {{ item.size.width }} ×
          {{ item.size.length }} ×
          {{ item.size.height }}
        </div>

        <div v-if="item.weight" class="weight">
          {{ item.weight }} кг
        </div>

        <div class="flags">
          <span v-if="item.fragile">🧱 хрупкий</span>
          <span v-if="item.hold">📌 фиксированный</span>
        </div>
      </div>

      <div
          class="color"
          :style="{ backgroundColor: item.color }"
      />

      <div class="controls">
        <button @click="openEdit(item)">✏️</button>
        <button @click="removeItem(item.id)">✕</button>
      </div>
    </div>
  </div>

  <!-- ============================
       MODAL
  ============================ -->
  <CargoModal
      v-model="showModal"
      :item="editingItem || undefined"
      @save="save"
  />
</template>

<style scoped>
.packing-list {
  padding: 16px;
  border: 1px solid #ddd;
  max-height: 500px;
  overflow: auto;
}

/* ============================
   TABS
============================ */

.layers-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.layer-tab {
  padding: 4px 10px;
  border: 1px solid #ccc;
  background: #f7f7f7;
  cursor: pointer;
  font-size: 12px;
}

.layer-tab.active {
  background: #1976d2;
  color: #fff;
  border-color: #1976d2;
}

.layer-tab.add {
  font-weight: bold;
}

/* ============================
   ACTIONS
============================ */

.actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

/* ============================
   ITEMS
============================ */

.empty {
  color: #888;
  font-size: 14px;
}

.packing-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid #eee;
  margin-bottom: 6px;
}

.info {
  flex: 1;
}

.size {
  font-size: 12px;
  color: #666;
}

.weight {
  font-size: 12px;
}

.flags {
  font-size: 11px;
  color: #999;
}

.color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.controls {
  display: flex;
  gap: 4px;
}
</style>
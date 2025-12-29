<script setup lang="ts">
import { useHistoryStore } from '@/stores/historyStore'

const store = useHistoryStore()

function save() {
  const name = prompt('Название компоновки')
  if (name) {
    store.saveCurrent(name)
  }
}
</script>

<template>
  <div class="packing-history">
    <h2>История</h2>

    <button @click="save">Сохранить текущую</button>

    <div
        v-for="entry in store.entries"
        :key="entry.id"
        class="entry"
    >
      <div class="info">
        <strong>{{ entry.name }}</strong>
        <div class="date">
          {{ new Date(entry.date).toLocaleString() }}
        </div>
      </div>

      <div class="controls">
        <button @click="store.loadEntry(entry.id)">Загрузить</button>
        <button @click="store.removeEntry(entry.id)">✕</button>
      </div>
    </div>

    <p v-if="store.entries.length === 0">
      История пуста
    </p>
  </div>
</template>

<style scoped>
.packing-history {
  padding: 16px;
  border: 1px solid #ddd;
}

.entry {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  margin-top: 8px;
  border: 1px solid #eee;
}

.date {
  font-size: 12px;
  color: #666;
}
</style>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { loadFromStorage, saveToStorage } from '@/utils/storage'
import { PACKING_HISTORY_KEY } from '@/data/history/types'
import type { PackingHistoryItem } from '@/data/history/types'

const props = defineProps<{
  activeId?: string | null
}>()

const emit = defineEmits<{
  (e: 'load', item: PackingHistoryItem): void
}>()

const history = ref<PackingHistoryItem[]>(
    loadFromStorage(PACKING_HISTORY_KEY, [])
)

function remove(id: string) {
  history.value = history.value.filter(h => h.id !== id)
  saveToStorage(PACKING_HISTORY_KEY, history.value)
}

watch(
    () => loadFromStorage(PACKING_HISTORY_KEY, []),
    v => (history.value = v)
)
</script>

<template>
  <div class="packing-history">
    <h2>История компоновок</h2>

    <div
        v-for="h in history"
        :key="h.id"
        class="item"
        :class="{ active: h.id === activeId }"
    >
      <div class="main" @click="emit('load', h)">
        <strong>{{ h.title }}</strong>

        <div class="meta">
          <span>Сохранено: {{ new Date(h.savedAt).toLocaleString() }}</span>
          <span v-if="h.shippingDate">
            Отгрузка: {{ h.shippingDate }}
          </span>
        </div>

        <div v-if="h.comment" class="comment">
          {{ h.comment }}
        </div>
      </div>

      <button class="remove" @click.stop="remove(h.id)">✕</button>
    </div>

    <p v-if="history.length === 0">
      История пуста
    </p>
  </div>
</template>

<style scoped>
.packing-history {
  padding: 20px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
}

/* ===== Header ===== */

.packing-history h2 {
  margin: 0 0 14px;
  font-size: 17px;
  font-weight: 600;
  color: #111827;
}

/* ===== Empty ===== */

.packing-history p {
  font-size: 13px;
  color: #9ca3af;
}

/* ===== Item ===== */

.item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  margin-top: 8px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fafafa;
  cursor: pointer;
  transition:
      background 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease;
}

.item:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.item.active {
  background: #eef4ff;
  border-color: #2563eb;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.15);
}

/* ===== Main ===== */

.main {
  flex: 1;
}

.main strong {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}

/* ===== Meta ===== */

.meta {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
}

/* ===== Comment ===== */

.comment {
  margin-top: 6px;
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
}

/* ===== Remove ===== */

.remove {
  align-self: flex-start;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #6b7280;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
}

.remove:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}
</style>
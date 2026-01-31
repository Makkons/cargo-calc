<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PackingHistoryItem } from '@/data/history/types'

const props = defineProps<{
  items: PackingHistoryItem[]
  activeId?: string | null
}>()

const emit = defineEmits<{
  (e: 'load', item: PackingHistoryItem): void
  (e: 'remove', id: string): void
}>()

// Фильтры
const searchQuery = ref('')
const dateFrom = ref('')
const dateTo = ref('')

// Отфильтрованные элементы
const filteredItems = computed(() => {
  let result = props.items

  // Фильтр по названию
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    result = result.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.comment?.toLowerCase().includes(query)
    )
  }

  // Фильтр по дате "от"
  if (dateFrom.value) {
    const from = new Date(dateFrom.value)
    from.setHours(0, 0, 0, 0)
    result = result.filter(item => new Date(item.savedAt) >= from)
  }

  // Фильтр по дате "до"
  if (dateTo.value) {
    const to = new Date(dateTo.value)
    to.setHours(23, 59, 59, 999)
    result = result.filter(item => new Date(item.savedAt) <= to)
  }

  return result
})

// Есть ли активные фильтры
const hasFilters = computed(() =>
  searchQuery.value.trim() || dateFrom.value || dateTo.value
)

function clearFilters() {
  searchQuery.value = ''
  dateFrom.value = ''
  dateTo.value = ''
}
</script>

<template>
  <div class="packing-history" data-tab="history">
    <h2>История компоновок</h2>

    <!-- Фильтры -->
    <div class="history-filters">
      <div class="history-filters__search">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по названию..."
          class="filter-input"
        />
      </div>

      <div class="history-filters__dates">
        <input
          v-model="dateFrom"
          type="date"
          class="filter-input filter-input--date"
          title="Дата от"
        />
        <span class="filter-separator">—</span>
        <input
          v-model="dateTo"
          type="date"
          class="filter-input filter-input--date"
          title="Дата до"
        />
      </div>

      <button
        v-if="hasFilters"
        class="filter-clear"
        @click="clearFilters"
        title="Сбросить фильтры"
      >
        Сбросить
      </button>
    </div>

    <div class="history-list">
      <div
          v-for="h in filteredItems"
          :key="h.id"
          class="history-item"
          :class="{ 'history-item--active': h.id === activeId }"
      >
        <div class="history-item__main" @click="emit('load', h)">
          <strong>{{ h.title }}</strong>

          <div class="history-item__meta">
            <span>Сохранено: {{ new Date(h.savedAt).toLocaleString() }}</span>
            <span v-if="h.shippingDate">
              Отгрузка: {{ h.shippingDate }}
            </span>
          </div>

          <div v-if="h.comment" class="history-item__comment">
            {{ h.comment }}
          </div>
        </div>

        <button class="history-item__remove" @click.stop="emit('remove', h.id)">✕</button>
      </div>

      <p v-if="items.length === 0">
        История пуста
      </p>
      <p v-else-if="filteredItems.length === 0">
        Ничего не найдено
      </p>
    </div>
  </div>
</template>

<style scoped>
.packing-history {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 14px;
}

/* ===== Header ===== */

.packing-history h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

/* ===== Filters ===== */

.history-filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-filters__search {
  width: 100%;
}

.history-filters__dates {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-input {
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  background: #fff;
  color: var(--color-text-primary, #111827);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.filter-input:focus {
  outline: none;
  border-color: var(--color-primary, #2563eb);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.filter-input::placeholder {
  color: var(--color-text-muted, #9ca3af);
}

.filter-input--date {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  font-size: 12px;
}

.filter-separator {
  color: var(--color-text-muted, #9ca3af);
  font-size: 12px;
  flex-shrink: 0;
}

.filter-clear {
  align-self: flex-start;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
  background: transparent;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.filter-clear:hover {
  background: var(--color-bg-card, #fafafa);
  color: var(--color-text-primary, #111827);
}

/* ===== Empty ===== */

.packing-history p {
  font-size: 13px;
  color: var(--color-text-muted, #9ca3af);
}

.history-list {
  flex: 1 1 auto;
  overflow: hidden;
  overflow-y: auto;
  min-height: 0;
}

.history-list::-webkit-scrollbar {
  width: 8px;
}

.history-list::-webkit-scrollbar-track {
  background: transparent;
}

.history-list::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.18);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.28);
}
/* ===== Item (БЭМ: history-item) ===== */

.history-item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: var(--spacing-md, 12px);
  margin-top: var(--spacing-sm, 8px);
  border-radius: var(--radius-lg, 10px);
  border: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-bg-card, #fafafa);
  cursor: pointer;
  transition:
      background var(--transition-fast, 0.15s ease),
      border-color var(--transition-fast, 0.15s ease),
      box-shadow var(--transition-fast, 0.15s ease);
}

.history-item:hover {
  background: var(--color-bg-card-hover, #f9fafb);
  border-color: var(--color-border-hover, #d1d5db);
}

.history-item--active {
  background: #eef4ff;
  border-color: var(--color-primary, #2563eb);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.15);
}

/* ===== Main ===== */

.history-item__main {
  flex: 1;
}

.history-item__main strong {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #111827);
}

/* ===== Meta ===== */

.history-item__meta {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
}

/* ===== Comment ===== */

.history-item__comment {
  margin-top: 6px;
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
}

/* ===== Remove ===== */

.history-item__remove {
  align-self: flex-start;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--color-border-hover, #d1d5db);
  background: #ffffff;
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition:
      background var(--transition-fast, 0.15s ease),
      border-color var(--transition-fast, 0.15s ease),
      color var(--transition-fast, 0.15s ease);
}

.history-item__remove:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}
</style>
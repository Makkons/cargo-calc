<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, type Component } from 'vue'
import Tooltip from '@/components/ui/Tooltip.vue'

export interface AsideTab {
  id: string
  icon: Component
  label: string
}

const props = defineProps<{
  tabs: AsideTab[]
  activeTab: string
  /** Внешнее управление открытием (v-model:open) */
  open?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:activeTab', tab: string): void
  (e: 'update:open', value: boolean): void
}>()

const asideEl = ref<HTMLElement | null>(null)

// Залочен ли sidebar (был клик внутри или открыт программно)
const isLocked = ref(false)

// Наведён ли курсор на sidebar
const isHovered = ref(false)

// Sidebar раскрыт — скрываем tooltips
const isExpanded = computed(() => isLocked.value || isHovered.value)

// Флаг: игнорировать следующий клик снаружи (для программного открытия)
let ignoreNextOutsideClick = false

// Синхронизация с внешним open
watch(() => props.open, (val) => {
  if (val) {
    isLocked.value = true
    // Игнорируем клик который вызвал открытие
    ignoreNextOutsideClick = true
    requestAnimationFrame(() => {
      ignoreNextOutsideClick = false
    })
  }
})

function setTab(tabId: string) {
  emit('update:activeTab', tabId)
}

function handleClickInside() {
  isLocked.value = true
}

function handleClickOutside(e: MouseEvent) {
  if (!asideEl.value) return
  if (ignoreNextOutsideClick) return

  // Если клик был вне sidebar — разблокируем
  if (!asideEl.value.contains(e.target as Node)) {
    isLocked.value = false
    emit('update:open', false)
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <aside
    ref="asideEl"
    class="aside card"
    :class="{ active: isLocked }"
    @click="handleClickInside"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <nav class="aside__nav" aria-label="Боковое меню">
      <ul class="aside__list" role="tablist">
        <li
          v-for="tab in tabs"
          :key="tab.id"
          class="aside__item"
          :class="{ active: activeTab === tab.id }"
          role="presentation"
        >
          <Tooltip :text="tab.label" position="right" :disabled="isExpanded">
            <button
              type="button"
              class="aside__button"
              role="tab"
              :aria-selected="activeTab === tab.id"
              :aria-controls="`aside-panel-${tab.id}`"
              :tabindex="activeTab === tab.id ? 0 : -1"
              @click="setTab(tab.id)"
            >
              <component :is="tab.icon" class="aside__icon" />
              <span class="visually-hidden">{{ tab.label }}</span>
            </button>
          </Tooltip>
        </li>
      </ul>
    </nav>
    <div
      class="aside__content"
      role="tabpanel"
      :id="`aside-panel-${activeTab}`"
      :aria-labelledby="`aside-tab-${activeTab}`"
    >
      <slot :activeTab="activeTab"></slot>
    </div>
  </aside>
</template>

<style lang="scss">
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.aside {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: fixed;
  top: var(--titlebar-height, 0px);
  left: 0;

  margin: 8px;
  height: calc(100vh - var(--titlebar-height, 0px) - 16px);
  width: 56px;

  overflow: hidden;
  z-index: 500;

  transition: width 0.3s ease !important;

  &:hover, &.active {
    width: 320px;

    .aside__list {
      flex-direction: row;
      align-items: center;
    }

    .aside__content {
      opacity: 1;
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: var(--spacing-lg);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__content {
    opacity: 0;
    overflow: hidden;
    white-space: nowrap;
    display: flex;
    flex-direction: column;
  }

  &__item {
    display: flex;
    align-items: center;
    opacity: 0.5;
    transition: opacity 0.3s ease 0s;

    &:hover {
      opacity: 1;
    }

    &.active {
      opacity: 1;
      flex: 1;
      order: -1;

      .aside__button {
        cursor: default;
      }
    }
  }

  &__button {
    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0;
    border: none;
    border-radius: 6px;

    background: transparent;
    color: inherit;
    cursor: pointer;

    transition: background-color 0.2s ease;

    &:hover {
      background: var(--color-background-soft);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary, #4a9eff);
      outline-offset: 2px;
    }
  }

  &__icon {
    width: 30px;
    height: 30px;
  }
}
</style>

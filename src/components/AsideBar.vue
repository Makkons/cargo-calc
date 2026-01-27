<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Book from '@/assets/icon/book.svg'
import Settings from '@/assets/icon/settings.svg'

const props = defineProps<{
  activeTab: 'history' | 'settings'
  /** Внешнее управление открытием (v-model:open) */
  open?: boolean
}>()

const emit = defineEmits<{
  (e: 'set-tab', tab: 'history' | 'settings'): void
  (e: 'update:open', value: boolean): void
}>()

const asideEl = ref<HTMLElement | null>(null)

// Залочен ли sidebar (был клик внутри или открыт программно)
const isLocked = ref(false)

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

function setTab(tab: 'history' | 'settings') {
  emit('set-tab', tab)
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
  >
    <nav class="aside__nav">
      <ul class="aside__list">
        <li class="aside__item"
            :class="{ active: activeTab === 'history' }"
            @click="setTab('history')"
            data-target="history" >
          <Book class="aside__icon"/>
        </li>
        <li class="aside__item"
            :class="{ active: activeTab === 'settings' }"
            @click="setTab('settings')"
            data-target="settings">
          <Settings class="aside__icon"/>
        </li>
      </ul>
    </nav>
    <div class="aside__content">
      <slot :activeTab="activeTab"></slot>
    </div>
  </aside>
</template>

<style lang="scss">

/* =========================
   FIXED HISTORY SIDEBAR
========================= */

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
    gap: 16px;
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
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.3s ease 0s;
    &:hover {
      opacity: 1;
    }
    &.active {
      opacity: 1;
      cursor: auto;
      flex: 1;
      order: -1;
    }
  }
  &__icon {
    width: 30px;
    height: 30px;
  }
}
</style>
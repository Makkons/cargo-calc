<script setup lang="ts">
import {nextTick, onMounted, onUnmounted, ref, watch} from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit'): void
}>()

const modalRef = ref<HTMLDivElement | null>(null)

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

function onKeydown(e: KeyboardEvent) {
  if (!props.open) return

  if (e.key === 'Escape') {
    emit('close')
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    const target = e.target as HTMLElement
    // Не срабатывать на textarea или кнопках
    if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return
    e.preventDefault()
    emit('submit')
  }
}

onMounted(() => {
  modalRef.value?.querySelector('input')?.focus()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
        v-if="open"
        class="modal-backdrop"
        @click="onBackdropClick"
        ref="modalRef"
    >
      <div class="modal">
        <slot/>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 18, 25, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  animation: modal-backdrop-fade-in 0.2s ease-out;
}

.modal {
  background: #ffffff;
  color: var(--color-text-primary, #1f2937);

  width: 100%;
  max-width: 480px;
  margin: 0 16px;

  padding: var(--spacing-xl, 20px);
  border-radius: var(--radius-xl, 12px);
  border: 1px solid var(--color-border, #e5e7eb);

  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15),
  0 4px 10px rgba(0, 0, 0, 0.08);

  animation: modal-scale-in 0.2s ease-out;
}

/* ===== Слоты: заголовок ===== */

.modal :deep(h3) {
  margin: 0 0 var(--spacing-lg, 16px);
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

/* ===== Слоты: label ===== */

.modal :deep(label) {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 4px);
  margin-bottom: var(--spacing-md, 12px);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7280);
}

.modal :deep(label:has(input[type="checkbox"])) {
  flex-direction: row;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  cursor: pointer;
}

/* ===== Слоты: input ===== */

.modal :deep(input:not([type="checkbox"]):not([type="color"])),
.modal :deep(textarea) {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
  font-size: 14px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  background: var(--color-bg-card, #fafafa);
  color: var(--color-text-primary, #111827);
  transition: border-color var(--transition-fast, 0.15s ease),
  box-shadow var(--transition-fast, 0.15s ease);
  resize: none;
}

.modal :deep(input:not([type="checkbox"]):not([type="color"]):focus) {
  outline: none;
  border-color: var(--color-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.modal :deep(input:not([type="checkbox"]):not([type="color"]).input--error) {
  border-color: var(--color-error, #ef4444);
}

.modal :deep(input[type="color"]) {
  width: 48px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
}

.modal :deep(input[type="checkbox"]) {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary, #2563eb);
  cursor: pointer;
}

/* ===== Слоты: ошибки ===== */

.modal :deep(.field-error) {
  font-size: 12px;
  color: var(--color-error, #ef4444);
  margin-top: 2px;
}

/* ===== Слоты: actions ===== */

.modal :deep(.modal__actions) {
  display: flex;
  gap: var(--spacing-sm, 8px);
  justify-content: flex-end;
  margin-top: var(--spacing-lg, 16px);
  padding-top: var(--spacing-lg, 16px);
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.modal :deep(.modal__actions button) {
  padding: var(--spacing-sm, 8px) var(--spacing-lg, 16px);
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--color-border-hover, #d1d5db);
  background: #fff;
  color: var(--color-text-primary, #111827);
  cursor: pointer;
  transition: background var(--transition-fast, 0.15s ease),
  border-color var(--transition-fast, 0.15s ease);
}

.modal :deep(.modal__actions button:hover) {
  background: var(--color-bg-card-hover, #f9fafb);
  border-color: #9ca3af;
}

.modal :deep(.modal__actions button:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal :deep(.modal__actions button--primary) {
  background: var(--color-primary, #2563eb);
  border-color: var(--color-primary, #2563eb);
  color: #fff;
}

.modal :deep(.modal__actions button--primary:hover:not(:disabled)) {
  background: var(--color-primary-hover, #1d4ed8);
  border-color: var(--color-primary-hover, #1d4ed8);
}

/* ===== Animations ===== */

@keyframes modal-backdrop-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modal-scale-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>

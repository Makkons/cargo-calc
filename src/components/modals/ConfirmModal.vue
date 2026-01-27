<script setup lang="ts">
import BaseModal from '@/components/ui/BaseModal.vue'

defineProps<{
  open: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <BaseModal :open="open" @close="emit('cancel')" @submit="emit('confirm')">
    <h3>{{ title ?? 'Подтверждение' }}</h3>

    <p class="confirm-message">{{ message }}</p>

    <div class="modal__actions">
      <button type="button" @click="emit('cancel')">
        {{ cancelText ?? 'Отмена' }}
      </button>
      <button
          type="button"
          :class="danger ? 'button--danger' : 'button--primary'"
          @click="emit('confirm')"
      >
        {{ confirmText ?? 'Подтвердить' }}
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
.confirm-message {
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

.button--danger {
  background: #ef4444 !important;
  border-color: #ef4444 !important;
  color: #fff !important;
}

.button--danger:hover:not(:disabled) {
  background: #dc2626 !important;
  border-color: #dc2626 !important;
}
</style>
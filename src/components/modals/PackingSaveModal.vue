<script setup lang="ts">
import {reactive, ref, watch, nextTick} from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const props = defineProps<{
  open: boolean
  defaultTitle: string
}>()

const emit = defineEmits<{
  (e: 'save', payload: {
    title: string
    comment?: string
    shippingDate?: string
  }): void
  (e: 'close'): void
}>()

const form = reactive({
  title: '',
  comment: '',
  shippingDate: '',
})

function getTodayDateInputValue(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

watch(
    () => props.open,
    open => {
      if (open) {
        form.title = ''
        form.comment = ''
        form.shippingDate = getTodayDateInputValue()
      }
    }
)

function save() {
  emit('save', {
    title: form.title || props.defaultTitle,
    comment: form.comment || undefined,
    shippingDate: form.shippingDate || undefined,
  })
  emit('close')
}
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <h3>Сохранить компоновку</h3>

    <label>
      Название
      <input v-model="form.title" :placeholder="defaultTitle" />
    </label>

    <label>
      Комментарий
      <textarea v-model="form.comment" />
    </label>

    <label>
      Дата отгрузки
      <input type="date" v-model="form.shippingDate" />
    </label>

    <div class="modal__actions">
      <button @click="save">Сохранить</button>
      <button @click="emit('close')">Отмена</button>
    </div>
  </BaseModal>
</template>

<style scoped>
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

textarea {
  resize: vertical;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
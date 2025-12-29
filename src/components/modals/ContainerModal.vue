<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { ContainerTemplate } from '@/types'
import BaseModal from "@/components/ui/BaseModal.vue";

const props = defineProps<{
  modelValue: boolean
  item?: ContainerTemplate
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', value: ContainerTemplate): void
}>()

const form = reactive<ContainerTemplate>({
  id: '',
  name: '',
  container: { width: 0, length: 0, height: 0 },
})

watch(
    () => props.item,
    (value) => {
      if (value) {
        Object.assign(form, JSON.parse(JSON.stringify(value)))
      } else {
        Object.assign(form, {
          id: String(Date.now()),
          name: `Машина`,
          container: { width: 1830, length: 3140, height: 1500 },
          maxWeight: 3400,
        })
      }
    },
    { immediate: true }
)

function save() {
  emit('save', JSON.parse(JSON.stringify(form)))
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal :open="modelValue" @close="$emit('update:modelValue', false)">
    <h3>{{ item ? 'Редактировать машину' : 'Новая машина' }}</h3>

    <label>
      Название
      <input v-model="form.name" />
    </label>

    <label>
      Ширина
      <input type="number" v-model.number="form.container.width" />
    </label>

    <label>
      Длина
      <input type="number" v-model.number="form.container.length" />
    </label>

    <label>
      Высота
      <input type="number" v-model.number="form.container.height" />
    </label>

    <label>
      Максимальная грузоподъемность, кг.
      <input type="number" v-model.number="form.maxWeight" />
    </label>

    <div class="actions">
      <button @click="save">Сохранить</button>
      <button @click="$emit('update:modelValue', false)">Отмена</button>
    </div>
  </BaseModal>
</template>

<style scoped>
label {
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
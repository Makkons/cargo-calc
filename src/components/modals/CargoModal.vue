<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { CargoTemplate } from '@/types'
import BaseModal from "@/components/ui/BaseModal.vue";

const props = defineProps<{
  modelValue: boolean
  item?: CargoTemplate
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', value: CargoTemplate): void
}>()

const form = reactive<CargoTemplate>({
  id: '',
  name: '',
  size: { width: 0, length: 0, height: 0 },
  weight: '',
  color: '#9e9e9e',
  fragile: false,
})

watch(
    () => props.item,
    (value) => {
      if (value) {
        Object.assign(form, JSON.parse(JSON.stringify(value)))
      } else {
        Object.assign(form, {
          id: String(Date.now()),
          name: 'Груз',
          size: { width: 200, length: 400, height: 200 },
          weight: 2000,
          color: '#9e9e9e',
          fragile: false,
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
    <h3>{{ props.item ? 'Редактировать груз' : 'Новый груз' }}</h3>

    <label>
      Название
      <input v-model="form.name" />
    </label>

    <label>
      Ширина
      <input type="number" v-model.number="form.size.width" />
    </label>

    <label>
      Длина
      <input type="number" v-model.number="form.size.length" />
    </label>

    <label>
      Высота
      <input type="number" v-model.number="form.size.height" />
    </label>


    <label>
      Вес, кг.
      <input type="number" v-model.number="form.weight" />
    </label>

    <label>
      Цвет
      <input type="color" v-model="form.color" />
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
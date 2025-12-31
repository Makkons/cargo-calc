<script setup lang="ts">
import { reactive, watch, toRaw } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import type { CargoTemplate } from '@/data/templates/types'

const props = defineProps<{
  open: boolean
  item?: CargoTemplate
  mode: 'create' | 'edit'
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', value: CargoTemplate): void
}>()

const form = reactive<CargoTemplate>({
  id: '',
  name: '',
  width: 0,
  length: 0,
  height: 0,
  color: '#9e9e9e',
  weight: '',
  fragile: false,
})

watch(
    () => props.item,
    (value) => {
      if (value) {
        Object.assign(form, { ...toRaw(value) }) // ✅ ВОТ ТУТ
      } else {
        Object.assign(form, {
          id: crypto.randomUUID(),
          name: 'Груз',
          width: 200,
          length: 400,
          height: 200,
          color: '#9e9e9e',
          weight: '',
          fragile: false,
        })
      }
    },
    { immediate: true }
)

function save() {
  if (props.mode === 'edit' && props.item) {
    const unchanged =
        form.width === props.item.width &&
        form.length === props.item.length &&
        form.height === props.item.height &&
        form.fragile === props.item.fragile &&
        form.color === props.item.color &&
        form.name === props.item.name &&
        form.weight === props.item.weight

    if (unchanged) {
      emit('close')
      return
    }
  }

  emit('save', { ...toRaw(form) })
  emit('close')
}
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <h3>{{ item ? 'Редактировать груз' : 'Новый груз' }}</h3>

    <label>
      Название
      <input v-model="form.name" />
    </label>

    <label>
      Ширина
      <input type="number" v-model.number="form.width" />
    </label>

    <label>
      Длина
      <input type="number" v-model.number="form.length" />
    </label>

    <label>
      Высота
      <input type="number" v-model.number="form.height" />
    </label>

    <label>
      Вес, кг
      <input type="number" v-model.number="form.weight" />
    </label>

    <label>
      Цвет
      <input type="color" v-model="form.color" />
    </label>

    <label>
      <input type="checkbox" v-model="form.fragile" />
      Хрупкий (нельзя ставить сверху)
    </label>

    <div class="actions">
      <button @click="save">Сохранить</button>
      <button @click="emit('close')">Отмена</button>
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
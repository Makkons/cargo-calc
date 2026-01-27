<script setup lang="ts">
import { reactive, watch, toRaw, computed } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import type { CargoTemplate } from '@/data/templates/types'

const props = defineProps<{
  open: boolean
  item?: CargoTemplate
  showFragile?: boolean
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

const touched = reactive({
  name: false,
  width: false,
  length: false,
  height: false,
})

const errors = computed(() => ({
  name: touched.name && !form.name.trim() ? 'Введите название' : '',
  width: touched.width && form.width <= 0 ? 'Введите ширину' : '',
  length: touched.length && form.length <= 0 ? 'Введите длину' : '',
  height: touched.height && form.height <= 0 ? 'Введите высоту' : '',
}))

const isValid = computed(() =>
    form.name.trim() !== '' &&
    form.width > 0 &&
    form.length > 0 &&
    form.height > 0
)

watch(
    () => props.item,
    (value) => {
      // Сброс touched при открытии
      Object.keys(touched).forEach(k => touched[k as keyof typeof touched] = false)

      if (value) {
        Object.assign(form, { ...toRaw(value) })
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

function touchAll() {
  Object.keys(touched).forEach(k => touched[k as keyof typeof touched] = true)
}

function save() {
  touchAll()

  if (!isValid.value) return

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
  <BaseModal :open="open" @close="emit('close')" @submit="save">
    <h3>{{ item ? 'Редактировать груз' : 'Новый груз' }}</h3>

    <label>
      Название
      <input
          v-model="form.name"
          :class="{ 'input--error': errors.name }"
          @blur="touched.name = true"
      />
      <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
    </label>

    <label>
      Ширина (мм)
      <input
          type="number"
          v-model.number="form.width"
          :class="{ 'input--error': errors.width }"
          @blur="touched.width = true"
      />
      <span v-if="errors.width" class="field-error">{{ errors.width }}</span>
    </label>

    <label>
      Длина (мм)
      <input
          type="number"
          v-model.number="form.length"
          :class="{ 'input--error': errors.length }"
          @blur="touched.length = true"
      />
      <span v-if="errors.length" class="field-error">{{ errors.length }}</span>
    </label>

    <label>
      Высота (мм)
      <input
          type="number"
          v-model.number="form.height"
          :class="{ 'input--error': errors.height }"
          @blur="touched.height = true"
      />
      <span v-if="errors.height" class="field-error">{{ errors.height }}</span>
    </label>

    <label>
      Вес (кг)
      <input type="number" v-model.number="form.weight" />
    </label>

    <label>
      Цвет
      <input type="color" v-model="form.color" />
    </label>

    <label v-if="showFragile">
      <input type="checkbox" v-model="form.fragile" />
      Хрупкий (нельзя ставить сверху)
    </label>

    <div class="modal__actions">
      <button class="button--primary" @click="save">Сохранить</button>
      <button @click="emit('close')">Отмена</button>
    </div>
  </BaseModal>
</template>

<style scoped>
/* Стили наследуются из BaseModal через :deep() */
</style>

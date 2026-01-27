<script setup lang="ts">
import { reactive, watch, toRaw, computed } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import type { ContainerTemplate } from '@/data/containers/types'

const props = defineProps<{
  open: boolean
  item?: ContainerTemplate
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', value: ContainerTemplate): void
}>()

const form = reactive<ContainerTemplate>({
  id: '',
  name: '',
  container: { width: 0, length: 0, height: 0 },
  maxWeight: undefined,
})

const touched = reactive({
  name: false,
  width: false,
  length: false,
  height: false,
})

const errors = computed(() => ({
  name: touched.name && !form.name.trim() ? 'Введите название' : '',
  width: touched.width && form.container.width <= 0 ? 'Введите ширину' : '',
  length: touched.length && form.container.length <= 0 ? 'Введите длину' : '',
  height: touched.height && form.container.height <= 0 ? 'Введите высоту' : '',
}))

const isValid = computed(() =>
    form.name.trim() !== '' &&
    form.container.width > 0 &&
    form.container.length > 0 &&
    form.container.height > 0
)

function fillFromTemplate(t: ContainerTemplate) {
  form.id = t.id
  form.name = t.name
  form.container.width = t.container.width
  form.container.length = t.container.length
  form.container.height = t.container.height
  form.maxWeight = t.maxWeight
}

function fillEmpty() {
  form.id = crypto.randomUUID()
  form.name = 'Машина'
  form.container.width = 2400
  form.container.length = 7200
  form.container.height = 2000
  form.maxWeight = 3400
}

watch(
    () => [props.open, props.item],
    ([open, item]) => {
      if (!open) return

      // Сброс touched при открытии
      Object.keys(touched).forEach(k => touched[k as keyof typeof touched] = false)

      if (item) fillFromTemplate(item as ContainerTemplate)
      else fillEmpty()
    },
    { immediate: true }
)

function touchAll() {
  Object.keys(touched).forEach(k => touched[k as keyof typeof touched] = true)
}

function save() {
  touchAll()

  if (!isValid.value) return

  emit('save', structuredClone(toRaw(form)))
  emit('close')
}
</script>

<template>
  <BaseModal :open="open" @close="emit('close')" @submit="save">
    <h3>{{ props.item ? 'Редактировать машину' : 'Новая машина' }}</h3>

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
          v-model.number="form.container.width"
          :class="{ 'input--error': errors.width }"
          @blur="touched.width = true"
      />
      <span v-if="errors.width" class="field-error">{{ errors.width }}</span>
    </label>

    <label>
      Длина (мм)
      <input
          type="number"
          v-model.number="form.container.length"
          :class="{ 'input--error': errors.length }"
          @blur="touched.length = true"
      />
      <span v-if="errors.length" class="field-error">{{ errors.length }}</span>
    </label>

    <label>
      Высота (мм)
      <input
          type="number"
          v-model.number="form.container.height"
          :class="{ 'input--error': errors.height }"
          @blur="touched.height = true"
      />
      <span v-if="errors.height" class="field-error">{{ errors.height }}</span>
    </label>

    <label>
      Максимальный вес (кг)
      <input type="number" v-model.number="form.maxWeight" />
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

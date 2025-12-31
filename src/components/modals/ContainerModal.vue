<script setup lang="ts">
import { reactive, watch, toRaw } from 'vue'
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
  form.container.width = 1830
  form.container.length = 3140
  form.container.height = 1500
  form.maxWeight = 3400
}

watch(
    () => [props.open, props.item],
    ([open, item]) => {
      if (!open) return
      if (item) fillFromTemplate(item)
      else fillEmpty()
    },
    { immediate: true }
)

function save() {
  emit('save', structuredClone(toRaw(form)))
  emit('close')
}
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <h3>{{ props.item ? 'Редактировать машину' : 'Новая машина' }}</h3>

    <label>
      Название
      <input v-model="form!.name" />
    </label>

    <label>
      Ширина
      <input type="number" v-model.number="form!.container.width" />
    </label>

    <label>
      Длина
      <input type="number" v-model.number="form!.container.length" />
    </label>

    <label>
      Высота
      <input type="number" v-model.number="form!.container.height" />
    </label>

    <label>
      Максимальный вес (кг)
      <input type="number" v-model.number="form!.maxWeight" />
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
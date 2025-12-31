<script setup lang="ts">
defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
        v-if="open"
        class="backdrop"
        @click="onBackdropClick"
    >
      <div class="modal">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 18, 25, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  animation: backdrop-fade-in 0.2s ease-out;
}

.modal {
  background: #ffffff;
  color: #1f2937;

  width: 100%;
  max-width: 520px;
  margin: 0 16px;

  padding: 24px;
  border-radius: 12px;

  box-shadow:
      0 10px 25px rgba(0, 0, 0, 0.15),
      0 4px 10px rgba(0, 0, 0, 0.08);

  animation: modal-scale-in 0.2s ease-out;
}

/* ===== Animations ===== */

@keyframes backdrop-fade-in {
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
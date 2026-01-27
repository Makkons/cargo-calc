<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, remove } = useToast()

function getIcon(type: string) {
  switch (type) {
    case 'success': return '✓'
    case 'error': return '✕'
    case 'warning': return '⚠'
    case 'info': return 'ℹ'
    case 'loading': return '' // спиннер через CSS
    default: return ''
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
            v-for="toast in toasts"
            :key="toast.id"
            class="toast"
            :class="`toast--${toast.type}`"
            @click="remove(toast.id)"
        >
          <span class="toast__icon">{{ getIcon(toast.type) }}</span>
          <span class="toast__message">{{ toast.message }}</span>
          <button class="toast__close" @click.stop="remove(toast.id)">✕</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: var(--spacing-lg, 16px);
  right: var(--spacing-lg, 16px);
  z-index: 2000;

  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);

  max-width: 360px;
  width: 100%;

  pointer-events: none;
}

/* ===== Toast ===== */

.toast {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);

  padding: var(--spacing-md, 12px) var(--spacing-lg, 16px);
  border-radius: var(--radius-lg, 10px);
  border: 1px solid var(--color-border, #e5e7eb);

  background: #ffffff;
  color: var(--color-text-primary, #111827);

  box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.1),
      0 2px 4px rgba(0, 0, 0, 0.06);

  cursor: pointer;
  pointer-events: auto;

  transition:
      transform var(--transition-fast, 0.15s ease),
      opacity var(--transition-fast, 0.15s ease);
}

.toast:hover {
  transform: translateX(-4px);
}

/* ===== Icon ===== */

.toast__icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

/* ===== Message ===== */

.toast__message {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
}

/* ===== Close ===== */

.toast__close {
  flex-shrink: 0;
  width: 20px;
  height: 20px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: none;
  background: transparent;
  color: var(--color-text-muted, #9ca3af);

  font-size: 12px;
  cursor: pointer;
  border-radius: var(--radius-sm, 6px);

  transition: background var(--transition-fast, 0.15s ease),
              color var(--transition-fast, 0.15s ease);
}

.toast__close:hover {
  background: var(--color-bg-card, #fafafa);
  color: var(--color-text-secondary, #6b7280);
}

/* ===== Types ===== */

.toast--success {
  border-color: #a7f3d0;
  background: #ecfdf5;
}

.toast--success .toast__icon {
  background: #22c55e;
  color: #fff;
}

.toast--error {
  border-color: #fca5a5;
  background: #fef2f2;
}

.toast--error .toast__icon {
  background: #ef4444;
  color: #fff;
}

.toast--warning {
  border-color: #fcd34d;
  background: #fffbeb;
}

.toast--warning .toast__icon {
  background: #f59e0b;
  color: #fff;
}

.toast--info {
  border-color: #93c5fd;
  background: #eff6ff;
}

.toast--info .toast__icon {
  background: #3b82f6;
  color: #fff;
}

.toast--loading {
  border-color: #c4b5fd;
  background: #f5f3ff;
}

.toast--loading .toast__icon {
  background: transparent;
  border: 2px solid #8b5cf6;
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== Animation ===== */

.toast-enter-active,
.toast-leave-active {
  transition:
      transform 0.3s ease,
      opacity 0.3s ease;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>

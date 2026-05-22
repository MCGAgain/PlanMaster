<!-- frontend/src/components/common/GlassToast.vue -->
<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container" aria-live="polite">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="glass-toast"
        :class="toast.type"
      >
        <span class="toast-icon">{{ icons[toast.type] }}</span>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" aria-label="关闭" @click="remove(toast.id)">&times;</button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

const icons = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ'
}

const add = (message, type = 'info', duration = 3000) => {
  const id = nextId++
  toasts.value.push({ id, message, type })

  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }

  return id
}

const remove = (id) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

const success = (message, duration) => add(message, 'success', duration)
const error = (message, duration) => add(message, 'error', duration)
const warning = (message, duration) => add(message, 'warning', duration)
const info = (message, duration) => add(message, 'info', duration)

defineExpose({ add, remove, success, error, warning, info })
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.glass-toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  
  
  min-width: 300px;
  max-width: 500px;
  
}

.glass-toast.success {
  border-color: var(--success);
  background: rgba(52, 211, 153, 0.1);
}

.glass-toast.error {
  border-color: var(--danger);
  background: rgba(248, 113, 113, 0.1);
}

.glass-toast.warning {
  border-color: var(--warning);
  background: rgba(251, 191, 36, 0.1);
}

.glass-toast.info {
  border-color: var(--primary);
  background: var(--primary-light);
}

.toast-icon {
  font-size: 1.2rem;
  font-weight: bold;
}

.glass-toast.success .toast-icon { color: var(--success); }
.glass-toast.error .toast-icon { color: var(--danger); }
.glass-toast.warning .toast-icon { color: var(--warning); }
.glass-toast.info .toast-icon { color: var(--primary); }

.toast-message {
  flex: 1;
  font-size: 0.95rem;
  color: var(--text);
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.toast-close:hover {
  color: var(--text);
}

/* Transitions */
.toast-enter-active {
  transition: all var(--transition-normal) var(--ease-out);
}

.toast-leave-active {
  transition: all var(--transition-fast) var(--ease-in);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform var(--transition-normal) var(--ease-default);
}
</style>

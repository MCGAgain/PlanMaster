<!-- frontend/src/components/common/GlassButton.vue -->
<template>
  <button
    class="glass-button"
    :class="[
      variant,
      size,
      { disabled, loading, block }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="spinner" />
    <slot v-else />
  </button>
</template>

<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'success', 'text'].includes(v)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (v) => ['small', 'medium', 'large'].includes(v)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const handleClick = (e) => {
  if (!props.disabled && !props.loading) {
    emit('click', e)
  }
}
</script>

<style scoped>
.glass-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast) var(--ease-default);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.glass-button::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.3) 0%, transparent 60%);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.glass-button:hover::after {
  opacity: 1;
}

/* Sizes */
.glass-button.small {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

.glass-button.medium {
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
}

.glass-button.large {
  padding: 1rem 2rem;
  font-size: 1.05rem;
}

/* Variants */
.glass-button.primary {
  background: var(--primary-light);
  color: var(--primary);
  border: 1px solid var(--primary);
}

.glass-button.primary:hover {
  background: var(--primary);
  color: white;
  transform: scale(1.02);
}

.glass-button.secondary {
  background: var(--glass-bg);
  color: var(--text);
  border: 1px solid var(--glass-border);
}

.glass-button.secondary:hover {
  background: var(--glass-border);
}

.glass-button.danger {
  background: rgba(248, 113, 113, 0.15);
  color: var(--danger);
  border: 1px solid var(--danger);
}

.glass-button.danger:hover {
  background: var(--danger);
  color: white;
}

.glass-button.success {
  background: rgba(52, 211, 153, 0.15);
  color: var(--success);
  border: 1px solid var(--success);
}

.glass-button.success:hover {
  background: var(--success);
  color: white;
}

.glass-button.text {
  background: transparent;
  color: var(--text-soft);
  border: none;
}

.glass-button.text:hover {
  color: var(--primary);
  background: var(--primary-light);
}

/* States */
.glass-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.glass-button.loading {
  cursor: wait;
}

.glass-button.block {
  width: 100%;
}

/* Spinner */
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>

<!-- frontend/src/components/common/GlassButton.vue -->
<template>
  <button
    ref="buttonRef"
    class="glass-button"
    :class="[
      variant,
      size,
      { disabled, loading, block }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
    @mousemove="handleMouseMove"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
  >
    <span v-if="loading" class="spinner" />
    <slot v-else />
    <div class="ripple-container" ref="rippleContainer"></div>
  </button>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import gsap from 'gsap'

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
const buttonRef = ref(null)
const rippleContainer = ref(null)

const handleMouseMove = (e) => {
  if (props.disabled || props.loading) return
  const rect = buttonRef.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  buttonRef.value.style.setProperty('--x', `${x}%`)
  buttonRef.value.style.setProperty('--y', `${y}%`)
}

const handleMouseDown = () => {
  if (props.disabled || props.loading) return
  gsap.to(buttonRef.value, {
    scale: 0.95,
    duration: 0.1,
    ease: 'power2.out'
  })
}

const handleMouseUp = () => {
  if (props.disabled || props.loading) return
  gsap.to(buttonRef.value, {
    scale: 1.02,
    duration: 0.4,
    ease: 'elastic.out(1.2, 0.5)'
  })
}

const handleMouseLeave = () => {
  gsap.to(buttonRef.value, {
    scale: 1,
    duration: 0.3,
    ease: 'power2.out'
  })
}

const handleClick = (e) => {
  if (!props.disabled && !props.loading) {
    createRipple(e)
    emit('click', e)
  }
}

const createRipple = (e) => {
  if (!rippleContainer.value) return
  
  const rect = buttonRef.value.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = e.clientX - rect.left - size / 2
  const y = e.clientY - rect.top - size / 2
  
  const ripple = document.createElement('span')
  ripple.className = 'ripple'
  ripple.style.width = ripple.style.height = `${size}px`
  ripple.style.left = `${x}px`
  ripple.style.top = `${y}px`
  
  rippleContainer.value.appendChild(ripple)
  
  gsap.to(ripple, {
    scale: 4,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
    onComplete: () => {
      ripple.remove()
    }
  })
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
  transition: background var(--transition-fast), border var(--transition-fast), color var(--transition-fast);
  
  position: relative;
  overflow: hidden;
  user-select: none;
  -webkit-app-region: no-drag;
}

.glass-button::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.4) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
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
  box-shadow: 0 4px 12px rgba(124, 110, 240, 0.1);
}

.glass-button.primary:hover {
  background: var(--primary);
  color: white;
  box-shadow: 0 6px 20px rgba(124, 110, 240, 0.3);
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

/* Ripple effect */
.ripple-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

:deep(.ripple) {
  position: absolute;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  transform: scale(0);
  pointer-events: none;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>


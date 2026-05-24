<!-- frontend/src/components/common/GlassCard.vue -->
<template>
  <div
    ref="cardRef"
    class="glass-card"
    :class="{
      hoverable,
      [`variant-${variant}`]: variant
    }"
    @click="handleClick"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @mousemove="handleMouseMove"
  >
    <div v-if="$slots.header" class="glass-card-header">
      <slot name="header" />
    </div>
    <div class="glass-card-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="glass-card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import gsap from 'gsap'

const props = defineProps({
  hoverable: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary', 'success', 'warning', 'danger'].includes(v)
  }
})

const emit = defineEmits(['click'])
const cardRef = ref(null)

const handleMouseMove = (e) => {
  if (!cardRef.value) return
  const rect = cardRef.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  cardRef.value.style.setProperty('--mouse-x', `${x}%`)
  cardRef.value.style.setProperty('--mouse-y', `${y}%`)
}

const handleMouseDown = () => {
  if (!props.hoverable) return
  gsap.to(cardRef.value, {
    scale: 0.98,
    duration: 0.1,
    ease: 'power2.out'
  })
}

const handleMouseUp = () => {
  if (!props.hoverable) return
  gsap.to(cardRef.value, {
    scale: 1.01,
    duration: 0.3,
    ease: 'back.out(1.7)'
  })
}

const handleMouseLeave = () => {
  if (!props.hoverable) return
  gsap.to(cardRef.value, {
    scale: 1,
    y: 0,
    duration: 0.3,
    ease: 'power2.out'
  })
}

const handleClick = (e) => {
  if (props.hoverable) {
    emit('click', e)
  }
}
</script>

<style scoped>
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  box-shadow: var(--glass-shadow);
  
  padding: 1.5rem;
  transition: transform var(--transition-normal) var(--ease-default), 
              box-shadow var(--transition-normal) var(--ease-default),
              background var(--transition-normal) var(--ease-default);
  position: relative;
  overflow: hidden;
}

.glass-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
    rgba(255, 255, 255, 0.15) 0%, 
    transparent 60%
  );
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: 0;
}

.glass-card:hover::before {
  opacity: 1;
}

body.theme-dark .glass-card::before {
  background: radial-gradient(
    circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
    rgba(255, 255, 255, 0.08) 0%, 
    transparent 60%
  );
}

.glass-card > * {
  position: relative;
  z-index: 1;
}

.glass-card.hoverable {
  cursor: pointer;
}

.glass-card.hoverable:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(100, 80, 200, 0.15);
  background: rgba(255, 255, 255, 0.65);
}

body.theme-dark .glass-card.hoverable:hover {
  background: rgba(255, 255, 255, 0.15);
}

.glass-card.variant-primary {
  border-color: var(--primary);
  background: var(--primary-light);
}

.glass-card.variant-success {
  border-color: var(--success);
  background: rgba(52, 211, 153, 0.1);
}

.glass-card.variant-warning {
  border-color: var(--warning);
  background: rgba(251, 191, 36, 0.1);
}

.glass-card.variant-danger {
  border-color: var(--danger);
  background: rgba(248, 113, 113, 0.1);
}

.glass-card-header {
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--glass-border);
}

.glass-card-footer {
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--glass-border);
}
</style>

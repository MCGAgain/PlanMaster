<!-- frontend/src/components/common/GlassCard.vue -->
<template>
  <div
    class="glass-card"
    :class="{
      hoverable,
      [`variant-${variant}`]: variant
    }"
    @click="hoverable && $emit('click', $event)"
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
defineProps({
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

defineEmits(['click'])
</script>

<style scoped>
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  padding: 1.5rem;
  transition: all var(--transition-normal) var(--ease-default);
  will-change: backdrop-filter;
}

.glass-card.hoverable {
  cursor: pointer;
}

.glass-card.hoverable:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(100, 80, 200, 0.12);
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

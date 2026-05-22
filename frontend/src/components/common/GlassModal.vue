<!-- frontend/src/components/common/GlassModal.vue -->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="glass-modal-overlay"
        role="dialog"
        aria-modal="true"
        @click.self="handleOverlayClick"
      >
        <div
          class="glass-modal"
          :class="[size]"
          :style="{ width, ...(width ? { minWidth: 'unset', maxWidth: 'unset' } : {}) }"
        >
          <div class="glass-modal-header">
            <slot name="header">
              <h3>{{ title }}</h3>
            </slot>
            <button
              v-if="closable"
              class="glass-modal-close"
              aria-label="关闭"
              @click="close"
            >
              &times;
            </button>
          </div>
          <div class="glass-modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="glass-modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  width: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'medium',
    validator: (v) => ['small', 'medium', 'large', 'fullscreen'].includes(v)
  },
  closable: {
    type: Boolean,
    default: true
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close()
  }
}
</script>

<style scoped>
.glass-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  
  
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  
}

.glass-modal {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  
  
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  
}

.glass-modal.small {
  min-width: 300px;
  max-width: 400px;
}

.glass-modal.medium {
  min-width: 400px;
  max-width: 600px;
}

.glass-modal.large {
  min-width: 600px;
  max-width: 800px;
}

.glass-modal.fullscreen {
  min-width: 90vw;
  min-height: 90vh;
}

.glass-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--glass-border);
}

.glass-modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text);
}

.glass-modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.glass-modal-close:hover {
  background: var(--glass-bg);
  color: var(--text);
}

.glass-modal-body {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
}

.glass-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--glass-border);
}
</style>

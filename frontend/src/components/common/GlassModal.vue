<!-- frontend/src/components/common/GlassModal.vue -->
<template>
  <Teleport to="body">
    <Transition
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div
        v-if="modelValue"
        class="glass-modal-overlay"
        role="dialog"
        aria-modal="true"
        @click.self="handleOverlayClick"
      >
        <div
          ref="modalRef"
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
import { ref } from 'vue'
import gsap from 'gsap'

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
const modalRef = ref(null)

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close()
  }
}

// GSAP Animations
const onBeforeEnter = (el) => {
  gsap.set(el, { opacity: 0 })
}

const onEnter = (el, done) => {
  gsap.to(el, { opacity: 1, duration: 0.3 })
  if (modalRef.value) {
    gsap.fromTo(modalRef.value,
      { scale: 0.9, y: 20, opacity: 0 },
      { scale: 1, y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.7)', onComplete: done }
    )
  } else {
    done()
  }
}

const onLeave = (el, done) => {
  gsap.to(el, { opacity: 0, duration: 0.3, delay: 0.1 })
  if (modalRef.value) {
    gsap.to(modalRef.value, {
      scale: 0.95,
      y: 10,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: done
    })
  } else {
    done()
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
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 40px 20px;
}

.glass-modal {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.25);
  max-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  position: relative;
  margin: auto;
}

.glass-modal.small {
  min-width: 320px;
  max-width: 420px;
}

.glass-modal.medium {
  min-width: 440px;
  max-width: 640px;
}

.glass-modal.large {
  min-width: 640px;
  max-width: 840px;
}

.glass-modal.fullscreen {
  min-width: 94vw;
  min-height: 94vh;
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
  font-size: 1.3rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--text), var(--primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.glass-modal-close {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  font-size: 1.5rem;
  color: var(--text-soft);
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s var(--ease-default);
}

.glass-modal-close:hover {
  background: var(--danger);
  color: white;
  transform: rotate(90deg);
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


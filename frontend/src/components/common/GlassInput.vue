<!-- frontend/src/components/common/GlassInput.vue -->
<template>
  <div class="glass-input-wrapper" :class="{ focused, error, disabled }">
    <label v-if="label" :for="inputId" class="glass-input-label">{{ label }}</label>
    <div class="glass-input-container">
      <span v-if="$slots.prefix" class="glass-input-prefix">
        <slot name="prefix" />
      </span>
      <input
        ref="inputRef"
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :aria-describedby="error ? errorId : hint ? hintId : undefined"
        :aria-invalid="error ? 'true' : undefined"
        class="glass-input"
        @input="$emit('update:modelValue', $event.target.value)"
        @focus="handleFocus"
        @blur="handleBlur"
        @keyup.enter="$emit('enter')"
      />
      <span v-if="$slots.suffix" class="glass-input-suffix">
        <slot name="suffix" />
      </span>
    </div>
    <Transition name="fade-slide">
      <span v-if="error" :id="errorId" class="glass-input-error">{{ error }}</span>
      <span v-else-if="hint" :id="hintId" class="glass-input-hint">{{ hint }}</span>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import gsap from 'gsap'

let uid = 0

const props = defineProps({
  id: {
    type: String,
    default: ''
  },
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
  }
})

defineEmits(['update:modelValue', 'enter'])

const inputRef = ref(null)
const focused = ref(false)
const instanceId = `glass-input-${++uid}`
const inputId = computed(() => props.id || instanceId)
const errorId = `${instanceId}-error`
const hintId = `${instanceId}-hint`

const handleFocus = (e) => {
  focused.value = true
  gsap.to(e.target.parentElement, {
    scale: 1.01,
    duration: 0.3,
    ease: 'power2.out'
  })
}

const handleBlur = (e) => {
  focused.value = false
  gsap.to(e.target.parentElement, {
    scale: 1,
    duration: 0.3,
    ease: 'power2.out'
  })
}

const focus = () => inputRef.value?.focus()
const blur = () => inputRef.value?.blur()

defineExpose({ focus, blur })
</script>

<style scoped>
.glass-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.glass-input-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-soft);
  transition: color 0.3s ease;
}

.glass-input-wrapper.focused .glass-input-label {
  color: var(--primary);
}

.glass-input-container {
  display: flex;
  align-items: center;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  overflow: hidden;
}

.glass-input-wrapper.focused .glass-input-container {
  border-color: var(--primary);
  box-shadow: 0 8px 24px rgba(124, 110, 240, 0.15);
  background: rgba(255, 255, 255, 0.7);
}

body.theme-dark .glass-input-wrapper.focused .glass-input-container {
  background: rgba(255, 255, 255, 0.15);
}

.glass-input-wrapper.error .glass-input-container {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.15);
}

.glass-input-wrapper.disabled .glass-input-container {
  opacity: 0.5;
  cursor: not-allowed;
}

.glass-input {
  flex: 1;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.95rem;
  color: var(--text);
  font-family: inherit;
}

.glass-input::placeholder {
  color: var(--text-muted);
}

.glass-input:disabled {
  cursor: not-allowed;
}

.glass-input-prefix,
.glass-input-suffix {
  display: flex;
  align-items: center;
  padding: 0 0.75rem;
  color: var(--text-muted);
}

.glass-input-error {
  font-size: 0.8rem;
  color: var(--danger);
  font-weight: 500;
}

.glass-input-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Fade-slide transition */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>


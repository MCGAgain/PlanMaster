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
        @focus="focused = true"
        @blur="focused = false"
        @keyup.enter="$emit('enter')"
      />
      <span v-if="$slots.suffix" class="glass-input-suffix">
        <slot name="suffix" />
      </span>
    </div>
    <span v-if="error" :id="errorId" class="glass-input-error">{{ error }}</span>
    <span v-else-if="hint" :id="hintId" class="glass-input-hint">{{ hint }}</span>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

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
  font-weight: 500;
  color: var(--text);
}

.glass-input-container {
  display: flex;
  align-items: center;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all var(--transition-fast) var(--ease-default);
  overflow: hidden;
  will-change: backdrop-filter;
}

.glass-input-wrapper.focused .glass-input-container {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.glass-input-wrapper.error .glass-input-container {
  border-color: var(--danger);
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
}

.glass-input-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>

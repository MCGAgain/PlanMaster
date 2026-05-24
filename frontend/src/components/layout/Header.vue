<template>
  <header class="header">
    <div class="header-left">
      <h2>{{ title }}</h2>
    </div>
    <div class="header-right">
      <div v-if="searchable" class="search-wrap">
        <div class="search-icon-bg">&#128269;</div>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="searchPlaceholder"
          @input="handleSearch"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
        <Transition name="fade-scale">
          <span
            v-if="searchQuery"
            class="search-clear"
            @click="clearSearch"
          >
            &times;
          </span>
        </Transition>
      </div>
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  searchable: {
    type: Boolean,
    default: false
  },
  searchPlaceholder: {
    type: String,
    default: '搜索... (支持拼音)'
  }
})

const emit = defineEmits(['search'])

const searchQuery = ref('')
const isFocused = ref(false)
let searchTimeout = null

const handleSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    emit('search', searchQuery.value)
  }, 300)
}

const clearSearch = () => {
  searchQuery.value = ''
  emit('search', '')
}

onUnmounted(() => {
  clearTimeout(searchTimeout)
})
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--text), var(--primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon-bg {
  position: absolute;
  left: 14px;
  font-size: 14px;
  color: var(--text-muted);
  pointer-events: none;
  z-index: 1;
}

.search-input {
  width: 220px;
  padding: 10px 36px 10px 38px;
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-family: inherit;
  background: rgba(255,255,255,0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--text);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.search-input:focus {
  outline: none;
  width: 320px;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-glow);
  background: rgba(255,255,255,0.6);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-clear {
  position: absolute;
  right: 10px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(124,110,240,0.15);
  color: var(--primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s var(--ease-default);
}

.search-clear:hover {
  background: var(--primary);
  color: white;
  transform: scale(1.1);
}

/* Fade-scale transition */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

/* Dark Theme */
body.theme-dark .search-input {
  background: rgba(0,0,0,0.25);
  border-color: rgba(255,255,255,0.1);
}

body.theme-dark .search-input:focus {
  background: rgba(0,0,0,0.4);
}
</style>


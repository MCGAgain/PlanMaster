<template>
  <header class="header">
    <div class="header-left">
      <h2>{{ title }}</h2>
    </div>
    <div class="header-right">
      <div v-if="searchable" class="search-wrap">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="searchPlaceholder"
          @input="handleSearch"
        />
        <span
          v-if="searchQuery"
          class="search-clear"
          @click="clearSearch"
        >
          &times;
        </span>
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
  gap: 10px;
}

.search-wrap {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 16px;
  border: 1px solid rgba(255,255,255,.4);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-family: inherit;
  background: rgba(255,255,255,.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: var(--text);
  transition: var(--transition);
  min-width: 200px;
  will-change: backdrop-filter;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow);
  background: rgba(255,255,255,.5);
  min-width: 280px;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(124,110,240,.15);
  color: var(--primary);
  font-size: 14px;
  cursor: pointer;
  transition: var(--transition);
}

.search-clear:hover {
  background: rgba(124,110,240,.3);
}

/* Dark Theme */
body.theme-dark .search-input {
  background: rgba(0,0,0,.3);
  border-color: rgba(255,255,255,.15);
  color: var(--text);
}

body.theme-dark .search-input:focus {
  background: rgba(0,0,0,.4);
}
</style>

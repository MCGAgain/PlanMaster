<!-- frontend/src/components/layout/Header.vue -->
<template>
  <header class="header">
    <div class="header-left">
      <h2>{{ title }}</h2>
    </div>
    <div class="header-right">
      <div v-if="searchable" class="search-wrapper">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索..."
          @input="handleSearch"
        />
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

onUnmounted(() => {
  clearTimeout(searchTimeout)
})
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
}

.header-left h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.search-wrapper {
  position: relative;
}

.search-input {
  padding: 0.5rem 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  color: var(--text);
  width: 200px;
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  width: 300px;
}

.search-input::placeholder {
  color: var(--text-muted);
}
</style>

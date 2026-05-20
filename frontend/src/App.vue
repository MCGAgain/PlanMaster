<template>
  <div class="app">
    <Sidebar />
    <Content>
      <Header :title="currentTitle" />
      <router-view />
    </Content>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/layout/Sidebar.vue'
import Header from './components/layout/Header.vue'
import Content from './components/layout/Content.vue'

const route = useRoute()

const currentTitle = computed(() => {
  return route.meta?.title || 'Todo'
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
}
</style>

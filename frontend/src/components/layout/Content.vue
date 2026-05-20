<!-- frontend/src/components/layout/Content.vue -->
<template>
  <main class="content">
    <slot />
  </main>
</template>

<style scoped>
.content {
  margin-left: var(--sidebar-width);
  min-height: 100vh;
  background: var(--bg-gradient);
}
</style>

<template>
  <main class="content">
    <slot />
  </main>
</template>

<style scoped>
.content {
  flex: 1;
  margin-left: var(--sidebar-width);
  min-height: 100vh;
  overflow-y: auto;
  padding: 32px 40px;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

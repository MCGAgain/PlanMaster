# Frontend Vue.js Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate PlanMaster frontend from vanilla HTML/CSS/JS to Vue 3 with Vite, maintaining all existing functionality while improving UI quality, animation performance, and code maintainability.

**Architecture:** Vue 3 + Vite + Pinia + Vue Router. Component-based architecture with Glassmorphism design system. Backward-compatible with existing Flask backend API.

**Tech Stack:** Vue 3.4, Vite 5.x, Pinia 2.x, Vue Router 4.x, Chart.js 4.x, CSS Variables, Vue Transition

---

## File Structure

```
frontend/                          # New Vue project root
├── src/
│   ├── assets/
│   │   └── icons/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.vue
│   │   │   ├── Header.vue
│   │   │   └── Content.vue
│   │   ├── common/
│   │   │   ├── GlassCard.vue
│   │   │   ├── GlassButton.vue
│   │   │   ├── GlassModal.vue
│   │   │   ├── GlassInput.vue
│   │   │   └── GlassToast.vue
│   │   └── business/
│   │       ├── PlanCard.vue
│   │       ├── WishCard.vue
│   │       ├── CheckinItem.vue
│   │       ├── FocusTimer.vue
│   │       └── StatsChart.vue
│   ├── views/
│   │   ├── TodayView.vue
│   │   ├── WeeklyView.vue
│   │   ├── MonthlyView.vue
│   │   ├── YearlyView.vue
│   │   ├── ImportantView.vue
│   │   ├── StatsView.vue
│   │   ├── FocusView.vue
│   │   ├── WishesView.vue
│   │   ├── TransactionsView.vue
│   │   ├── RecycleView.vue
│   │   ├── ApiBalanceView.vue
│   │   ├── CheckinView.vue
│   │   └── SettingsView.vue
│   ├── stores/
│   │   ├── plans.js
│   │   ├── wishes.js
│   │   ├── checkins.js
│   │   ├── focus.js
│   │   ├── transactions.js
│   │   └── settings.js
│   ├── api/
│   │   └── index.js
│   ├── composables/
│   │   ├── useAnimation.js
│   │   ├── useTheme.js
│   │   ├── useFocus.js
│   │   └── useSearch.js
│   ├── styles/
│   │   ├── variables.css
│   │   ├── glassmorphism.css
│   │   ├── animations.css
│   │   └── transitions.css
│   ├── utils/
│   │   ├── format.js
│   │   └── validators.js
│   ├── App.vue
│   └── main.js
├── public/
│   └── favicon.ico
├── index.html
├── vite.config.js
├── package.json
├── eslint.config.js
└── .gitignore

static/                            # Modified: build output target
├── css/
│   └── style.css                  # Keep existing for fallback
├── app.js                         # Keep existing for fallback
└── [vite build output]
```

---

## Task 1: Initialize Vue Project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/.gitignore`
- Create: `frontend/src/main.js`
- Create: `frontend/src/App.vue`

- [ ] **Step 1: Create frontend directory and package.json**

```bash
mkdir -p frontend/src frontend/public
```

```json
// frontend/package.json
{
  "name": "planmaster-frontend",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .vue,.js",
    "format": "prettier --write src"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "chart.js": "^4.4.0",
    "vue-chartjs": "^5.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.4.0",
    "eslint": "^8.50.0",
    "eslint-plugin-vue": "^9.17.0",
    "prettier": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create Vite configuration**

```javascript
// frontend/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  root: '.',
  build: {
    outDir: '../static/dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          charts: ['chart.js']
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

- [ ] **Step 3: Create index.html**

```html
<!-- frontend/index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo - 计划管理</title>
  <link rel="icon" type="image/jpeg" href="/static/icon.jpg">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create .gitignore**

```gitignore
# frontend/.gitignore
node_modules
dist
.DS_Store
*.local
```

- [ ] **Step 5: Create main.js entry point**

```javascript
// frontend/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/variables.css'
import './styles/glassmorphism.css'
import './styles/animations.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
```

- [ ] **Step 6: Create App.vue root component**

```vue
<!-- frontend/src/App.vue -->
<template>
  <div class="app">
    <h1>PlanMaster Vue</h1>
    <p>Frontend initialized successfully</p>
  </div>
</template>

<script setup>
// Root component
</script>

<style>
.app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
</style>
```

- [ ] **Step 7: Install dependencies and verify**

```bash
cd frontend && npm install
```

Expected: `node_modules` created, no errors

- [ ] **Step 8: Test dev server**

```bash
cd frontend && npm run dev
```

Expected: Server starts on http://localhost:3000

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "feat: initialize Vue 3 + Vite project structure"
```

---

## Task 2: Setup CSS Variables and Theme System

**Files:**
- Create: `frontend/src/styles/variables.css`
- Create: `frontend/src/styles/glassmorphism.css`
- Create: `frontend/src/styles/animations.css`
- Create: `frontend/src/styles/transitions.css`
- Create: `frontend/src/composables/useTheme.js`

- [ ] **Step 1: Create CSS variables**

```css
/* frontend/src/styles/variables.css */
:root {
  /* Primary colors */
  --primary: #7c6ef0;
  --primary-light: rgba(124, 110, 240, 0.15);
  --primary-glow: rgba(124, 110, 240, 0.3);
  
  /* Accent colors */
  --accent: #6ee7b7;
  --accent-glow: rgba(110, 231, 183, 0.3);
  
  /* Status colors */
  --success: #34d399;
  --warning: #fbbf24;
  --danger: #f87171;
  
  /* Glass effect */
  --glass-bg: rgba(255, 255, 255, 0.45);
  --glass-border: rgba(255, 255, 255, 0.55);
  --glass-shadow: 0 8px 32px rgba(100, 80, 200, 0.08);
  --glass-blur: 20px;
  
  /* Sidebar */
  --sidebar-width: 240px;
  --sidebar-glass: rgba(255, 255, 255, 0.25);
  --sidebar-border: rgba(255, 255, 255, 0.3);
  
  /* Background */
  --bg: #f0eef8;
  --bg-gradient: linear-gradient(135deg, #f0eef8 0%, #e8e4f0 100%);
  
  /* Text */
  --text: #2d2655;
  --text-soft: #7a7494;
  --text-muted: #a8a3bf;
  
  /* Border radius */
  --radius: 16px;
  --radius-sm: 10px;
  --radius-lg: 24px;
  
  /* Transitions */
  --transition-fast: 150ms;
  --transition-normal: 300ms;
  --transition-slow: 500ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Dark theme */
body.theme-dark {
  --glass-bg: rgba(0, 0, 0, 0.35);
  --glass-border: rgba(255, 255, 255, 0.15);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  --sidebar-glass: rgba(0, 0, 0, 0.3);
  --sidebar-border: rgba(255, 255, 255, 0.1);
  --bg: #1a1625;
  --bg-gradient: linear-gradient(135deg, #1a1625 0%, #2d2655 100%);
  --text: #e8e4f0;
  --text-soft: #b8b0cc;
  --text-muted: #8a82a0;
}
```

- [ ] **Step 2: Create glassmorphism styles**

```css
/* frontend/src/styles/glassmorphism.css */
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  padding: 1.5rem;
  transition: all var(--transition-normal) var(--ease-default);
}

.glass-card.hoverable:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(100, 80, 200, 0.12);
}

.glass-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast) var(--ease-default);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.glass-button.primary {
  background: var(--primary-light);
  color: var(--primary);
  border: 1px solid var(--primary);
}

.glass-button.primary:hover {
  background: var(--primary);
  color: white;
  transform: scale(1.02);
}

.glass-button.secondary {
  background: var(--glass-bg);
  color: var(--text);
  border: 1px solid var(--glass-border);
}

.glass-button.secondary:hover {
  background: var(--glass-border);
}

.glass-button.danger {
  background: rgba(248, 113, 113, 0.15);
  color: var(--danger);
  border: 1px solid var(--danger);
}

.glass-button.danger:hover {
  background: var(--danger);
  color: white;
}

.glass-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  color: var(--text);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all var(--transition-fast) var(--ease-default);
}

.glass-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.glass-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.glass-modal {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  padding: 2rem;
  min-width: 400px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}
```

- [ ] **Step 3: Create animations styles**

```css
/* frontend/src/styles/animations.css */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-fade-in {
  animation: fadeIn var(--transition-normal) var(--ease-default);
}

.animate-slide-in-left {
  animation: slideInLeft var(--transition-normal) var(--ease-default);
}

.animate-slide-in-right {
  animation: slideInRight var(--transition-normal) var(--ease-default);
}

.animate-slide-in-up {
  animation: slideInUp var(--transition-normal) var(--ease-default);
}

.animate-scale-in {
  animation: scaleIn var(--transition-normal) var(--ease-default);
}

.animate-pulse {
  animation: pulse 2s var(--ease-in-out) infinite;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Staggered animation delays */
.stagger-1 { animation-delay: 50ms; }
.stagger-2 { animation-delay: 100ms; }
.stagger-3 { animation-delay: 150ms; }
.stagger-4 { animation-delay: 200ms; }
.stagger-5 { animation-delay: 250ms; }
```

- [ ] **Step 4: Create transitions styles**

```css
/* frontend/src/styles/transitions.css */
/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-normal) var(--ease-default);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: all var(--transition-normal) var(--ease-default);
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Scale transition */
.scale-enter-active,
.scale-leave-active {
  transition: all var(--transition-fast) var(--ease-default);
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* List transition */
.list-enter-active,
.list-leave-active {
  transition: all var(--transition-normal) var(--ease-default);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.list-move {
  transition: transform var(--transition-normal) var(--ease-default);
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: all var(--transition-normal) var(--ease-default);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .glass-modal,
.modal-leave-to .glass-modal {
  transform: translateY(20px) scale(0.95);
}
```

- [ ] **Step 5: Create theme composable**

```javascript
// frontend/src/composables/useTheme.js
import { ref, onMounted, watch } from 'vue'

const theme = ref(localStorage.getItem('theme') || 'light')

export function useTheme() {
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', theme.value)
    applyTheme()
  }

  const setTheme = (newTheme) => {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    applyTheme()
  }

  const applyTheme = () => {
    document.body.classList.toggle('theme-dark', theme.value === 'dark')
  }

  const initTheme = () => {
    // Check system preference
    if (!localStorage.getItem('theme')) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.value = prefersDark ? 'dark' : 'light'
    }
    applyTheme()

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        theme.value = e.matches ? 'dark' : 'light'
        applyTheme()
      }
    })
  }

  onMounted(() => {
    initTheme()
  })

  return {
    theme,
    toggleTheme,
    setTheme,
    initTheme
  }
}
```

- [ ] **Step 6: Test theme system**

```bash
cd frontend && npm run dev
```

Open browser, verify CSS variables are applied, test dark mode toggle in console:
```javascript
document.body.classList.toggle('theme-dark')
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/styles/ frontend/src/composables/useTheme.js
git commit -m "feat: add CSS variables and theme system"
```

---

## Task 3: Create Glassmorphism Component Library

**Files:**
- Create: `frontend/src/components/common/GlassCard.vue`
- Create: `frontend/src/components/common/GlassButton.vue`
- Create: `frontend/src/components/common/GlassModal.vue`
- Create: `frontend/src/components/common/GlassInput.vue`
- Create: `frontend/src/components/common/GlassToast.vue`

- [ ] **Step 1: Create GlassCard component**

```vue
<!-- frontend/src/components/common/GlassCard.vue -->
<template>
  <div 
    class="glass-card" 
    :class="{ 
      hoverable,
      [`variant-${variant}`]: variant 
    }"
    @click="$emit('click', $event)"
  >
    <div v-if="$slots.header" class="glass-card-header">
      <slot name="header" />
    </div>
    <div class="glass-card-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="glass-card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  hoverable: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary', 'success', 'warning', 'danger'].includes(v)
  }
})

defineEmits(['click'])
</script>

<style scoped>
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  padding: 1.5rem;
  transition: all var(--transition-normal) var(--ease-default);
}

.glass-card.hoverable {
  cursor: pointer;
}

.glass-card.hoverable:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(100, 80, 200, 0.12);
}

.glass-card.variant-primary {
  border-color: var(--primary);
  background: var(--primary-light);
}

.glass-card.variant-success {
  border-color: var(--success);
  background: rgba(52, 211, 153, 0.1);
}

.glass-card.variant-warning {
  border-color: var(--warning);
  background: rgba(251, 191, 36, 0.1);
}

.glass-card.variant-danger {
  border-color: var(--danger);
  background: rgba(248, 113, 113, 0.1);
}

.glass-card-header {
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--glass-border);
}

.glass-card-footer {
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--glass-border);
}
</style>
```

- [ ] **Step 2: Create GlassButton component**

```vue
<!-- frontend/src/components/common/GlassButton.vue -->
<template>
  <button
    class="glass-button"
    :class="[
      variant,
      size,
      { disabled, loading, block }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="spinner" />
    <slot v-else />
  </button>
</template>

<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'success', 'text'].includes(v)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (v) => ['small', 'medium', 'large'].includes(v)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const handleClick = (e) => {
  if (!props.disabled && !props.loading) {
    emit('click', e)
  }
}
</script>

<style scoped>
.glass-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast) var(--ease-default);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.glass-button::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.3) 0%, transparent 60%);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.glass-button:hover::after {
  opacity: 1;
}

/* Sizes */
.glass-button.small {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

.glass-button.medium {
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
}

.glass-button.large {
  padding: 1rem 2rem;
  font-size: 1.05rem;
}

/* Variants */
.glass-button.primary {
  background: var(--primary-light);
  color: var(--primary);
  border: 1px solid var(--primary);
}

.glass-button.primary:hover {
  background: var(--primary);
  color: white;
  transform: scale(1.02);
}

.glass-button.secondary {
  background: var(--glass-bg);
  color: var(--text);
  border: 1px solid var(--glass-border);
}

.glass-button.secondary:hover {
  background: var(--glass-border);
}

.glass-button.danger {
  background: rgba(248, 113, 113, 0.15);
  color: var(--danger);
  border: 1px solid var(--danger);
}

.glass-button.danger:hover {
  background: var(--danger);
  color: white;
}

.glass-button.success {
  background: rgba(52, 211, 153, 0.15);
  color: var(--success);
  border: 1px solid var(--success);
}

.glass-button.success:hover {
  background: var(--success);
  color: white;
}

.glass-button.text {
  background: transparent;
  color: var(--text-soft);
  border: none;
}

.glass-button.text:hover {
  color: var(--primary);
  background: var(--primary-light);
}

/* States */
.glass-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.glass-button.loading {
  cursor: wait;
}

.glass-button.block {
  width: 100%;
}

/* Spinner */
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>
```

- [ ] **Step 3: Create GlassModal component**

```vue
<!-- frontend/src/components/common/GlassModal.vue -->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="glass-modal-overlay"
        @click.self="handleOverlayClick"
      >
        <div 
          class="glass-modal" 
          :class="[size]"
          :style="{ width }"
        >
          <div class="glass-modal-header">
            <slot name="header">
              <h3>{{ title }}</h3>
            </slot>
            <button 
              v-if="closable" 
              class="glass-modal-close"
              @click="close"
            >
              ×
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
    default: '500px'
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
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
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
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
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
```

- [ ] **Step 4: Create GlassInput component**

```vue
<!-- frontend/src/components/common/GlassInput.vue -->
<template>
  <div class="glass-input-wrapper" :class="{ focused, error, disabled }">
    <label v-if="label" class="glass-input-label">{{ label }}</label>
    <div class="glass-input-container">
      <span v-if="$slots.prefix" class="glass-input-prefix">
        <slot name="prefix" />
      </span>
      <input
        ref="inputRef"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
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
    <span v-if="error" class="glass-input-error">{{ error }}</span>
    <span v-else-if="hint" class="glass-input-hint">{{ hint }}</span>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
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
```

- [ ] **Step 5: Create GlassToast component**

```vue
<!-- frontend/src/components/common/GlassToast.vue -->
<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="glass-toast"
        :class="toast.type"
      >
        <span class="toast-icon">{{ icons[toast.type] }}</span>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" @click="remove(toast.id)">×</button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

const icons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
}

const add = (message, type = 'info', duration = 3000) => {
  const id = nextId++
  toasts.value.push({ id, message, type })
  
  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }
  
  return id
}

const remove = (id) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

const success = (message, duration) => add(message, 'success', duration)
const error = (message, duration) => add(message, 'error', duration)
const warning = (message, duration) => add(message, 'warning', duration)
const info = (message, duration) => add(message, 'info', duration)

defineExpose({ add, remove, success, error, warning, info })
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.glass-toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  min-width: 300px;
  max-width: 500px;
}

.glass-toast.success {
  border-color: var(--success);
  background: rgba(52, 211, 153, 0.1);
}

.glass-toast.error {
  border-color: var(--danger);
  background: rgba(248, 113, 113, 0.1);
}

.glass-toast.warning {
  border-color: var(--warning);
  background: rgba(251, 191, 36, 0.1);
}

.glass-toast.info {
  border-color: var(--primary);
  background: var(--primary-light);
}

.toast-icon {
  font-size: 1.2rem;
  font-weight: bold;
}

.glass-toast.success .toast-icon { color: var(--success); }
.glass-toast.error .toast-icon { color: var(--danger); }
.glass-toast.warning .toast-icon { color: var(--warning); }
.glass-toast.info .toast-icon { color: var(--primary); }

.toast-message {
  flex: 1;
  font-size: 0.95rem;
  color: var(--text);
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.toast-close:hover {
  color: var(--text);
}

/* Transitions */
.toast-enter-active {
  transition: all var(--transition-normal) var(--ease-out);
}

.toast-leave-active {
  transition: all var(--transition-fast) var(--ease-in);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform var(--transition-normal) var(--ease-default);
}
</style>
```

- [ ] **Step 6: Test components**

Update `App.vue` to test components:

```vue
<!-- frontend/src/App.vue -->
<template>
  <div class="app">
    <h1>Component Library Test</h1>
    
    <section>
      <h2>GlassCard</h2>
      <GlassCard hoverable variant="primary">
        <template #header>Card Header</template>
        <p>Card content with hover effect</p>
        <template #footer>Card Footer</template>
      </GlassCard>
    </section>
    
    <section>
      <h2>GlassButton</h2>
      <div style="display: flex; gap: 1rem;">
        <GlassButton variant="primary">Primary</GlassButton>
        <GlassButton variant="secondary">Secondary</GlassButton>
        <GlassButton variant="danger">Danger</GlassButton>
        <GlassButton variant="success">Success</GlassButton>
        <GlassButton variant="text">Text</GlassButton>
      </div>
    </section>
    
    <section>
      <h2>GlassModal</h2>
      <GlassButton @click="showModal = true">Open Modal</GlassButton>
      <GlassModal v-model="showModal" title="Test Modal">
        <p>Modal content here</p>
      </GlassModal>
    </section>
    
    <section>
      <h2>GlassInput</h2>
      <GlassInput v-model="inputValue" label="Test Input" placeholder="Type something..." />
      <p>Value: {{ inputValue }}</p>
    </section>
    
    <section>
      <h2>GlassToast</h2>
      <GlassButton @click="$refs.toast.success('Success message')">Success Toast</GlassButton>
      <GlassButton @click="$refs.toast.error('Error message')">Error Toast</GlassButton>
      <GlassToast ref="toast" />
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GlassCard from './components/common/GlassCard.vue'
import GlassButton from './components/common/GlassButton.vue'
import GlassModal from './components/common/GlassModal.vue'
import GlassInput from './components/common/GlassInput.vue'
import GlassToast from './components/common/GlassToast.vue'

const showModal = ref(false)
const inputValue = ref('')
</script>

<style>
.app {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
}

section {
  margin-bottom: 3rem;
}

h2 {
  margin-bottom: 1rem;
  color: var(--text);
}
</style>
```

```bash
cd frontend && npm run dev
```

Verify all components render correctly and interactions work.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/common/
git commit -m "feat: add Glassmorphism component library"
```

---

## Task 4: Create Layout Components

**Files:**
- Create: `frontend/src/components/layout/Sidebar.vue`
- Create: `frontend/src/components/layout/Header.vue`
- Create: `frontend/src/components/layout/Content.vue`
- Create: `frontend/src/router/index.js`

- [ ] **Step 1: Install Vue Router**

```bash
cd frontend && npm install vue-router@4
```

- [ ] **Step 2: Create router configuration**

```javascript
// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'today',
    component: () => import('@/views/TodayView.vue'),
    meta: { title: '今日待办', icon: '&#9728;' }
  },
  {
    path: '/checkin',
    name: 'checkin',
    component: () => import('@/views/CheckinView.vue'),
    meta: { title: '打卡', icon: '&#9745;' }
  },
  {
    path: '/important',
    name: 'important',
    component: () => import('@/views/ImportantView.vue'),
    meta: { title: '重要事项', icon: '&#9888;' }
  },
  {
    path: '/weekly',
    name: 'weekly',
    component: () => import('@/views/WeeklyView.vue'),
    meta: { title: '周计划', icon: '&#128197;' }
  },
  {
    path: '/monthly',
    name: 'monthly',
    component: () => import('@/views/MonthlyView.vue'),
    meta: { title: '月计划', icon: '&#128197;' }
  },
  {
    path: '/yearly',
    name: 'yearly',
    component: () => import('@/views/YearlyView.vue'),
    meta: { title: '年计划', icon: '&#128197;' }
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('@/views/StatsView.vue'),
    meta: { title: '统计数据', icon: '&#128202;' }
  },
  {
    path: '/focus',
    name: 'focus',
    component: () => import('@/views/FocusView.vue'),
    meta: { title: '专注模式', icon: '&#9201;' }
  },
  {
    path: '/wishes',
    name: 'wishes',
    component: () => import('@/views/WishesView.vue'),
    meta: { title: '心愿兑换单', icon: '&#9734;' }
  },
  {
    path: '/transactions',
    name: 'transactions',
    component: () => import('@/views/TransactionsView.vue'),
    meta: { title: '价值流水', icon: '&#128200;' }
  },
  {
    path: '/recycle',
    name: 'recycle',
    component: () => import('@/views/RecycleView.vue'),
    meta: { title: '回收站', icon: '&#128465;' }
  },
  {
    path: '/apibalance',
    name: 'apibalance',
    component: () => import('@/views/ApiBalanceView.vue'),
    meta: { title: 'API余量', icon: '&#128176;' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: 'AI设置', icon: '&#9881;' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

- [ ] **Step 3: Create Sidebar component**

```vue
<!-- frontend/src/components/layout/Sidebar.vue -->
<template>
  <nav class="sidebar">
    <div class="sidebar-header">
      <h1>Todo</h1>
      <p class="subtitle">计划管理 & 心愿兑换</p>
    </div>
    
    <div class="balance-card">
      <span class="balance-label">虚拟价值余额</span>
      <span class="balance-value">{{ balance }}</span>
    </div>
    
    <ul class="nav-menu">
      <li
        v-for="item in menuItems"
        :key="item.path"
        class="nav-item"
        :class="{ active: currentRoute === item.path }"
        @click="navigate(item.path)"
      >
        <span class="nav-icon" v-html="item.icon" />
        <span>{{ item.label }}</span>
      </li>
      
      <li class="nav-group">
        <div 
          class="nav-group-header" 
          :class="{ collapsed: !plansOpen }"
          @click="plansOpen = !plansOpen"
        >
          <span class="nav-icon">&#128197;</span>
          <span>计划管理</span>
          <span class="arrow" :class="{ open: plansOpen }">&#9662;</span>
        </div>
        <ul v-show="plansOpen" class="nav-group-items">
          <li
            v-for="plan in planTypes"
            :key="plan.path"
            class="nav-item"
            :class="{ active: currentRoute === plan.path }"
            @click="navigate(plan.path)"
          >
            <span>{{ plan.label }}</span>
          </li>
        </ul>
      </li>
      
      <li
        v-for="item in bottomItems"
        :key="item.path"
        class="nav-item"
        :class="{ active: currentRoute === item.path }"
        @click="navigate(item.path)"
      >
        <span class="nav-icon" v-html="item.icon" />
        <span>{{ item.label }}</span>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const balance = ref(0)
const plansOpen = ref(true)

const currentRoute = computed(() => route.path)

const menuItems = [
  { path: '/checkin', label: '打卡', icon: '&#9745;' },
  { path: '/important', label: '重要事项', icon: '&#9888;' },
  { path: '/', label: '今日待办', icon: '&#9728;' }
]

const planTypes = [
  { path: '/weekly', label: '周计划' },
  { path: '/monthly', label: '月计划' },
  { path: '/yearly', label: '年计划' }
]

const bottomItems = [
  { path: '/stats', label: '统计数据', icon: '&#128202;' },
  { path: '/focus', label: '专注模式', icon: '&#9201;' },
  { path: '/wishes', label: '心愿兑换单', icon: '&#9734;' },
  { path: '/transactions', label: '价值流水', icon: '&#128200;' },
  { path: '/recycle', label: '回收站', icon: '&#128465;' },
  { path: '/apibalance', label: 'API余量', icon: '&#128176;' },
  { path: '/settings', label: 'AI设置', icon: '&#9881;' }
]

const navigate = (path) => {
  router.push(path)
}

const updateBalance = (newBalance) => {
  balance.value = newBalance
}

defineExpose({ updateBalance })
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  background: var(--sidebar-glass);
  border-right: 1px solid var(--sidebar-border);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  z-index: 100;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--sidebar-border);
}

.sidebar-header h1 {
  margin: 0;
  font-size: 1.5rem;
  background: linear-gradient(135deg, var(--primary), #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sidebar-header .subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.balance-card {
  margin: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, var(--primary-light), rgba(167, 139, 250, 0.2));
  border: 1px solid var(--primary);
  border-radius: var(--radius-sm);
  text-align: center;
}

.balance-label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-soft);
  margin-bottom: 0.25rem;
}

.balance-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-menu {
  list-style: none;
  padding: 0.5rem;
  margin: 0;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin: 0.25rem 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast) var(--ease-default);
  color: var(--text-soft);
}

.nav-item:hover {
  background: var(--glass-bg);
  color: var(--text);
}

.nav-item.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 500;
}

.nav-icon {
  font-size: 1.1rem;
  width: 1.5rem;
  text-align: center;
}

.nav-group {
  margin: 0.5rem 0;
}

.nav-group-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  color: var(--text-soft);
  transition: color var(--transition-fast);
}

.nav-group-header:hover {
  color: var(--text);
}

.nav-group-header .arrow {
  margin-left: auto;
  transition: transform var(--transition-fast);
}

.nav-group-header .arrow.open {
  transform: rotate(0);
}

.nav-group-header.collapsed .arrow {
  transform: rotate(-90deg);
}

.nav-group-items {
  list-style: none;
  padding: 0 0 0 2.5rem;
  margin: 0;
}

.nav-group-items .nav-item {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}
</style>
```

- [ ] **Step 4: Create Header component**

```vue
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
import { ref, watch } from 'vue'

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
```

- [ ] **Step 5: Create Content component**

```vue
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
```

- [ ] **Step 6: Update main.js with router**

```javascript
// frontend/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/variables.css'
import './styles/glassmorphism.css'
import './styles/animations.css'
import './styles/transitions.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
```

- [ ] **Step 7: Test layout**

Update `App.vue`:

```vue
<!-- frontend/src/App.vue -->
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
```

Create placeholder view components for testing:

```vue
<!-- frontend/src/views/TodayView.vue -->
<template>
  <div class="view-placeholder">
    <h3>今日待办</h3>
    <p>页面内容将在这里显示</p>
  </div>
</template>

<style scoped>
.view-placeholder {
  padding: 2rem;
}
</style>
```

```bash
cd frontend && npm run dev
```

Verify sidebar navigation works and pages switch correctly.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/layout/ frontend/src/router/ frontend/src/views/ frontend/src/main.js frontend/src/App.vue
git commit -m "feat: add layout components and router"
```

---

## Task 5: Create API Layer

**Files:**
- Create: `frontend/src/api/index.js`

- [ ] **Step 1: Create API client**

```javascript
// frontend/src/api/index.js
const BASE_URL = ''

class ApiClient {
  constructor() {
    this.baseUrl = BASE_URL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body)
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      throw error
    }
  }

  // Plans
  getPlans() {
    return this.request('/api/plans')
  }

  createPlan(plan) {
    return this.request('/api/plans', {
      method: 'POST',
      body: plan
    })
  }

  updatePlan(id, plan) {
    return this.request(`/api/plans/${id}`, {
      method: 'PUT',
      body: plan
    })
  }

  deletePlan(id) {
    return this.request(`/api/plans/${id}`, {
      method: 'DELETE'
    })
  }

  completePlan(id) {
    return this.request(`/api/plans/${id}/complete`, {
      method: 'POST'
    })
  }

  evaluatePlan(id) {
    return this.request(`/api/plans/${id}/evaluate`, {
      method: 'POST'
    })
  }

  // Wishes
  getWishes() {
    return this.request('/api/wishes')
  }

  createWish(wish) {
    return this.request('/api/wishes', {
      method: 'POST',
      body: wish
    })
  }

  updateWish(id, wish) {
    return this.request(`/api/wishes/${id}`, {
      method: 'PUT',
      body: wish
    })
  }

  deleteWish(id) {
    return this.request(`/api/wishes/${id}`, {
      method: 'DELETE'
    })
  }

  redeemWish(id) {
    return this.request(`/api/wishes/${id}/redeem`, {
      method: 'POST'
    })
  }

  // Balance
  getBalance() {
    return this.request('/api/balance')
  }

  getTransactions() {
    return this.request('/api/transactions')
  }

  // Checkins
  getCheckins() {
    return this.request('/api/checkins')
  }

  createCheckin(checkin) {
    return this.request('/api/checkins', {
      method: 'POST',
      body: checkin
    })
  }

  updateCheckin(id, checkin) {
    return this.request(`/api/checkins/${id}`, {
      method: 'PUT',
      body: checkin
    })
  }

  deleteCheckin(id) {
    return this.request(`/api/checkins/${id}`, {
      method: 'DELETE'
    })
  }

  toggleCheckin(id) {
    return this.request(`/api/checkins/${id}/toggle`, {
      method: 'POST'
    })
  }

  // Focus Sessions
  getFocusSessions() {
    return this.request('/api/focus-sessions')
  }

  createFocusSession(session) {
    return this.request('/api/focus-sessions', {
      method: 'POST',
      body: session
    })
  }

  // Stats
  getStats() {
    return this.request('/api/stats')
  }

  // Settings
  getSettings() {
    return this.request('/api/settings')
  }

  updateSettings(settings) {
    return this.request('/api/settings', {
      method: 'PUT',
      body: settings
    })
  }

  // AI
  testAI() {
    return this.request('/api/ai/test', {
      method: 'POST'
    })
  }

  getModels() {
    return this.request('/api/ai/models')
  }

  // Recycle Bin
  getRecycleBin() {
    return this.request('/api/recycle')
  }

  restorePlan(id) {
    return this.request(`/api/recycle/${id}/restore`, {
      method: 'POST'
    })
  }

  permanentDelete(id) {
    return this.request(`/api/recycle/${id}`, {
      method: 'DELETE'
    })
  }

  // Important Items
  getImportantItems() {
    return this.request('/api/important')
  }

  createImportantItem(item) {
    return this.request('/api/important', {
      method: 'POST',
      body: item
    })
  }

  updateImportantItem(id, item) {
    return this.request(`/api/important/${id}`, {
      method: 'PUT',
      body: item
    })
  }

  deleteImportantItem(id) {
    return this.request(`/api/important/${id}`, {
      method: 'DELETE'
    })
  }

  // API Balance
  getApiBalance() {
    return this.request('/api/apibalance')
  }
}

export const api = new ApiClient()
export default api
```

- [ ] **Step 2: Test API layer**

Create a simple test in browser console:

```javascript
// In browser console
import api from '@/api'

// Test getPlans
api.getPlans().then(plans => console.log('Plans:', plans))

// Test getBalance
api.getBalance().then(balance => console.log('Balance:', balance))
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/
git commit -m "feat: add API client layer"
```

---

## Task 6: Create Pinia Stores

**Files:**
- Create: `frontend/src/stores/plans.js`
- Create: `frontend/src/stores/wishes.js`
- Create: `frontend/src/stores/checkins.js`
- Create: `frontend/src/stores/focus.js`
- Create: `frontend/src/stores/transactions.js`
- Create: `frontend/src/stores/settings.js`

- [ ] **Step 1: Create plans store**

```javascript
// frontend/src/stores/plans.js
import { defineStore } from 'pinia'
import api from '@/api'

export const usePlansStore = defineStore('plans', {
  state: () => ({
    plans: [],
    loading: false,
    error: null,
    currentType: 'today'
  }),

  getters: {
    filteredPlans: (state) => {
      return state.plans.filter(p => p.plan_type === state.currentType && !p.completed)
    },

    completedPlans: (state) => {
      return state.plans.filter(p => p.completed)
    },

    todayPlans: (state) => {
      return state.plans.filter(p => p.plan_type === 'today' && !p.completed)
    },

    weeklyPlans: (state) => {
      return state.plans.filter(p => p.plan_type === 'weekly' && !p.completed)
    },

    monthlyPlans: (state) => {
      return state.plans.filter(p => p.plan_type === 'monthly' && !p.completed)
    },

    yearlyPlans: (state) => {
      return state.plans.filter(p => p.plan_type === 'yearly' && !p.completed)
    }
  },

  actions: {
    async fetchPlans() {
      this.loading = true
      this.error = null
      try {
        this.plans = await api.getPlans()
      } catch (error) {
        this.error = error.message
        console.error('Failed to fetch plans:', error)
      } finally {
        this.loading = false
      }
    },

    async createPlan(plan) {
      try {
        const newPlan = await api.createPlan(plan)
        this.plans.push(newPlan)
        return newPlan
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async updatePlan(id, updates) {
      try {
        const updated = await api.updatePlan(id, updates)
        const index = this.plans.findIndex(p => p.id === id)
        if (index !== -1) {
          this.plans[index] = updated
        }
        return updated
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async deletePlan(id) {
      try {
        await api.deletePlan(id)
        this.plans = this.plans.filter(p => p.id !== id)
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async completePlan(id) {
      try {
        const completed = await api.completePlan(id)
        const index = this.plans.findIndex(p => p.id === id)
        if (index !== -1) {
          this.plans[index] = completed
        }
        return completed
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async evaluatePlan(id) {
      try {
        const evaluated = await api.evaluatePlan(id)
        const index = this.plans.findIndex(p => p.id === id)
        if (index !== -1) {
          this.plans[index] = evaluated
        }
        return evaluated
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    setCurrentType(type) {
      this.currentType = type
    }
  }
})
```

- [ ] **Step 2: Create wishes store**

```javascript
// frontend/src/stores/wishes.js
import { defineStore } from 'pinia'
import api from '@/api'

export const useWishesStore = defineStore('wishes', {
  state: () => ({
    wishes: [],
    balance: 0,
    loading: false,
    error: null
  }),

  getters: {
    activeWishes: (state) => {
      return state.wishes.filter(w => !w.redeemed)
    },

    redeemedWishes: (state) => {
      return state.wishes.filter(w => w.redeemed)
    },

    canRedeem: (state) => {
      return (wish) => state.balance >= wish.virtual_cost
    }
  },

  actions: {
    async fetchWishes() {
      this.loading = true
      this.error = null
      try {
        const [wishes, balanceData] = await Promise.all([
          api.getWishes(),
          api.getBalance()
        ])
        this.wishes = wishes
        this.balance = balanceData.balance || 0
      } catch (error) {
        this.error = error.message
        console.error('Failed to fetch wishes:', error)
      } finally {
        this.loading = false
      }
    },

    async createWish(wish) {
      try {
        const newWish = await api.createWish(wish)
        this.wishes.push(newWish)
        return newWish
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async updateWish(id, updates) {
      try {
        const updated = await api.updateWish(id, updates)
        const index = this.wishes.findIndex(w => w.id === id)
        if (index !== -1) {
          this.wishes[index] = updated
        }
        return updated
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async deleteWish(id) {
      try {
        await api.deleteWish(id)
        this.wishes = this.wishes.filter(w => w.id !== id)
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async redeemWish(id) {
      try {
        const result = await api.redeemWish(id)
        if (result.success) {
          this.balance = result.new_balance
          await this.fetchWishes()
        }
        return result
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async refreshBalance() {
      try {
        const balanceData = await api.getBalance()
        this.balance = balanceData.balance || 0
      } catch (error) {
        console.error('Failed to refresh balance:', error)
      }
    }
  }
})
```

- [ ] **Step 3: Create checkins store**

```javascript
// frontend/src/stores/checkins.js
import { defineStore } from 'pinia'
import api from '@/api'

export const useCheckinsStore = defineStore('checkins', {
  state: () => ({
    checkins: [],
    loading: false,
    error: null
  }),

  getters: {
    todayCheckins: (state) => {
      const today = new Date().toISOString().split('T')[0]
      return state.checkins.map(checkin => ({
        ...checkin,
        checkedToday: checkin.last_checkin === today
      }))
    },

    completedToday: (state) => {
      const today = new Date().toISOString().split('T')[0]
      return state.checkins.filter(c => c.last_checkin === today).length
    },

    totalStreak: (state) => {
      return state.checkins.reduce((sum, c) => sum + (c.streak || 0), 0)
    }
  },

  actions: {
    async fetchCheckins() {
      this.loading = true
      this.error = null
      try {
        this.checkins = await api.getCheckins()
      } catch (error) {
        this.error = error.message
        console.error('Failed to fetch checkins:', error)
      } finally {
        this.loading = false
      }
    },

    async createCheckin(checkin) {
      try {
        const newCheckin = await api.createCheckin(checkin)
        this.checkins.push(newCheckin)
        return newCheckin
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async updateCheckin(id, updates) {
      try {
        const updated = await api.updateCheckin(id, updates)
        const index = this.checkins.findIndex(c => c.id === id)
        if (index !== -1) {
          this.checkins[index] = updated
        }
        return updated
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async deleteCheckin(id) {
      try {
        await api.deleteCheckin(id)
        this.checkins = this.checkins.filter(c => c.id !== id)
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async toggleCheckin(id) {
      try {
        const result = await api.toggleCheckin(id)
        await this.fetchCheckins()
        return result
      } catch (error) {
        this.error = error.message
        throw error
      }
    }
  }
})
```

- [ ] **Step 4: Create focus store**

```javascript
// frontend/src/stores/focus.js
import { defineStore } from 'pinia'
import api from '@/api'

export const useFocusStore = defineStore('focus', {
  state: () => ({
    mode: 'unlimited',
    duration: 0,
    state: 'setup',
    startTime: null,
    elapsed: 0,
    sessionId: null,
    task: '',
    sessions: [],
    loading: false,
    error: null,
    _timer: null
  }),

  getters: {
    remaining: (state) => {
      if (state.mode === 'unlimited') return 0
      return Math.max(0, state.duration - state.elapsed)
    },

    progress: (state) => {
      if (state.mode === 'unlimited' || state.duration === 0) return 0
      return (state.elapsed / state.duration) * 100
    },

    formattedTime: (state) => {
      const totalSec = state.mode === 'countdown' 
        ? Math.max(0, state.duration - state.elapsed)
        : state.elapsed
      
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    },

    isRunning: (state) => state.state === 'running',
    isPaused: (state) => state.state === 'paused',
    isComplete: (state) => state.state === 'complete',
    isSetup: (state) => state.state === 'setup'
  },

  actions: {
    setMode(mode) {
      this.mode = mode
    },

    setDuration(seconds) {
      this.duration = seconds
    },

    setTask(task) {
      this.task = task
    },

    start() {
      this.state = 'running'
      this.startTime = new Date()
      this.elapsed = 0
      this._startTimer()
    },

    pause() {
      this.state = 'paused'
      this._stopTimer()
    },

    resume() {
      this.state = 'running'
      this._startTimer()
    },

    async complete() {
      this.state = 'complete'
      this._stopTimer()

      try {
        const session = await api.createFocusSession({
          duration: this.elapsed,
          task: this.task,
          mode: this.mode
        })
        this.sessions.unshift(session)
        return session
      } catch (error) {
        this.error = error.message
        console.error('Failed to save focus session:', error)
      }
    },

    reset() {
      this.state = 'setup'
      this.elapsed = 0
      this.startTime = null
      this.sessionId = null
      this.task = ''
      this._stopTimer()
    },

    async fetchSessions() {
      this.loading = true
      this.error = null
      try {
        this.sessions = await api.getFocusSessions()
      } catch (error) {
        this.error = error.message
        console.error('Failed to fetch focus sessions:', error)
      } finally {
        this.loading = false
      }
    },

    _startTimer() {
      this._stopTimer()
      this._timer = setInterval(() => {
        this.elapsed++
        
        if (this.mode === 'countdown' && this.elapsed >= this.duration) {
          this.complete()
        }
      }, 1000)
    },

    _stopTimer() {
      if (this._timer) {
        clearInterval(this._timer)
        this._timer = null
      }
    }
  }
})
```

- [ ] **Step 5: Create transactions store**

```javascript
// frontend/src/stores/transactions.js
import { defineStore } from 'pinia'
import api from '@/api'

export const useTransactionsStore = defineStore('transactions', {
  state: () => ({
    transactions: [],
    loading: false,
    error: null
  }),

  getters: {
    recentTransactions: (state) => {
      return state.transactions.slice(0, 20)
    },

    totalEarned: (state) => {
      return state.transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0)
    },

    totalSpent: (state) => {
      return state.transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    }
  },

  actions: {
    async fetchTransactions() {
      this.loading = true
      this.error = null
      try {
        this.transactions = await api.getTransactions()
      } catch (error) {
        this.error = error.message
        console.error('Failed to fetch transactions:', error)
      } finally {
        this.loading = false
      }
    }
  }
})
```

- [ ] **Step 6: Create settings store**

```javascript
// frontend/src/stores/settings.js
import { defineStore } from 'pinia'
import api from '@/api'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: {
      base_url: '',
      api_key: '',
      model_name: '',
      extra_headers: ''
    },
    models: [],
    loading: false,
    error: null,
    testing: false
  }),

  actions: {
    async fetchSettings() {
      this.loading = true
      this.error = null
      try {
        this.settings = await api.getSettings()
      } catch (error) {
        this.error = error.message
        console.error('Failed to fetch settings:', error)
      } finally {
        this.loading = false
      }
    },

    async updateSettings(updates) {
      try {
        this.settings = await api.updateSettings(updates)
        return this.settings
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async fetchModels() {
      try {
        this.models = await api.getModels()
      } catch (error) {
        console.error('Failed to fetch models:', error)
      }
    },

    async testConnection() {
      this.testing = true
      this.error = null
      try {
        const result = await api.testAI()
        return result
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.testing = false
      }
    }
  }
})
```

- [ ] **Step 7: Test stores**

Update `App.vue` to test stores:

```vue
<!-- frontend/src/App.vue -->
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
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePlansStore } from './stores/plans'
import { useWishesStore } from './stores/wishes'
import Sidebar from './components/layout/Sidebar.vue'
import Header from './components/layout/Header.vue'
import Content from './components/layout/Content.vue'

const route = useRoute()
const plansStore = usePlansStore()
const wishesStore = useWishesStore()

const currentTitle = computed(() => {
  return route.meta?.title || 'Todo'
})

onMounted(async () => {
  await Promise.all([
    plansStore.fetchPlans(),
    wishesStore.fetchWishes()
  ])
})
</script>
```

```bash
cd frontend && npm run dev
```

Open browser console and verify stores are working:

```javascript
// In browser console
const plansStore = usePlansStore()
console.log('Plans:', plansStore.plans)
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/stores/
git commit -m "feat: add Pinia stores for state management"
```

---

## Task 7: Migrate Business Components

**Files:**
- Create: `frontend/src/components/business/PlanCard.vue`
- Create: `frontend/src/components/business/WishCard.vue`
- Create: `frontend/src/components/business/CheckinItem.vue`
- Create: `frontend/src/components/business/FocusTimer.vue`
- Create: `frontend/src/components/business/StatsChart.vue`

- [ ] **Step 1: Create PlanCard component**

```vue
<!-- frontend/src/components/business/PlanCard.vue -->
<template>
  <GlassCard class="plan-card" :class="{ completed: plan.completed }">
    <div class="plan-header">
      <div class="plan-title">
        <h3>{{ plan.title }}</h3>
        <span v-if="plan.priority" class="priority-badge" :class="priorityClass">
          {{ plan.priority }}
        </span>
      </div>
      <div class="plan-actions">
        <GlassButton 
          v-if="!plan.completed" 
          variant="success" 
          size="small"
          @click="$emit('complete', plan)"
        >
          完成
        </GlassButton>
        <GlassButton 
          variant="secondary" 
          size="small"
          @click="$emit('edit', plan)"
        >
          编辑
        </GlassButton>
        <GlassButton 
          variant="danger" 
          size="small"
          @click="$emit('delete', plan)"
        >
          删除
        </GlassButton>
      </div>
    </div>
    
    <p v-if="plan.description" class="plan-description">
      {{ plan.description }}
    </p>
    
    <div class="plan-meta">
      <div v-if="plan.virtual_value" class="meta-item">
        <span class="meta-label">虚拟价值</span>
        <span class="meta-value">{{ plan.virtual_value }}</span>
      </div>
      <div v-if="plan.suggested_time" class="meta-item">
        <span class="meta-label">建议时间</span>
        <span class="meta-value">{{ plan.suggested_time }}</span>
      </div>
      <div v-if="plan.progress !== undefined" class="meta-item">
        <span class="meta-label">进度</span>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${plan.progress}%` }"
          />
        </div>
        <span class="meta-value">{{ plan.progress }}%</span>
      </div>
    </div>
  </GlassCard>
</template>

<script setup>
import { computed } from 'vue'
import GlassCard from '../common/GlassCard.vue'
import GlassButton from '../common/GlassButton.vue'

const props = defineProps({
  plan: {
    type: Object,
    required: true
  }
})

defineEmits(['complete', 'edit', 'delete'])

const priorityClass = computed(() => {
  const priority = props.plan.priority
  if (priority >= 80) return 'high'
  if (priority >= 50) return 'medium'
  return 'low'
})
</script>

<style scoped>
.plan-card {
  margin-bottom: 1rem;
}

.plan-card.completed {
  opacity: 0.7;
}

.plan-card.completed .plan-title h3 {
  text-decoration: line-through;
  color: var(--text-muted);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.plan-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.plan-title h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text);
}

.priority-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.priority-badge.high {
  background: rgba(248, 113, 113, 0.2);
  color: var(--danger);
}

.priority-badge.medium {
  background: rgba(251, 191, 36, 0.2);
  color: var(--warning);
}

.priority-badge.low {
  background: rgba(52, 211, 153, 0.2);
  color: var(--success);
}

.plan-actions {
  display: flex;
  gap: 0.5rem;
}

.plan-description {
  margin: 0 0 1rem;
  color: var(--text-soft);
  font-size: 0.95rem;
  line-height: 1.5;
}

.plan-meta {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.meta-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.meta-value {
  font-size: 0.9rem;
  color: var(--text);
  font-weight: 500;
}

.progress-bar {
  width: 100px;
  height: 6px;
  background: var(--glass-bg);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 3px;
  transition: width var(--transition-normal);
}
</style>
```

- [ ] **Step 2: Create WishCard component**

```vue
<!-- frontend/src/components/business/WishCard.vue -->
<template>
  <GlassCard class="wish-card">
    <div class="wish-header">
      <h3>{{ wish.name }}</h3>
      <span class="wish-cost">{{ wish.virtual_cost }} 虚拟价值</span>
    </div>
    
    <div class="wish-details">
      <div v-if="wish.real_price" class="detail-item">
        <span class="detail-label">真实价格</span>
        <span class="detail-value">¥{{ wish.real_price }}</span>
      </div>
      <div v-if="wish.quantity !== null" class="detail-item">
        <span class="detail-label">剩余次数</span>
        <span class="detail-value">{{ wish.quantity }}</span>
      </div>
    </div>
    
    <div class="wish-actions">
      <GlassButton
        variant="primary"
        :disabled="!canRedeem"
        @click="$emit('redeem', wish)"
      >
        {{ canRedeem ? '兑换' : '余额不足' }}
      </GlassButton>
      <GlassButton
        variant="secondary"
        @click="$emit('edit', wish)"
      >
        编辑
      </GlassButton>
      <GlassButton
        variant="danger"
        @click="$emit('delete', wish)"
      >
        删除
      </GlassButton>
    </div>
  </GlassCard>
</template>

<script setup>
import { computed } from 'vue'
import GlassCard from '../common/GlassCard.vue'
import GlassButton from '../common/GlassButton.vue'

const props = defineProps({
  wish: {
    type: Object,
    required: true
  },
  balance: {
    type: Number,
    default: 0
  }
})

defineEmits(['redeem', 'edit', 'delete'])

const canRedeem = computed(() => {
  return props.balance >= props.wish.virtual_cost
})
</script>

<style scoped>
.wish-card {
  margin-bottom: 1rem;
}

.wish-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.wish-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text);
}

.wish-cost {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--primary);
}

.wish-details {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.detail-value {
  font-size: 0.95rem;
  color: var(--text);
}

.wish-actions {
  display: flex;
  gap: 0.5rem;
}
</style>
```

- [ ] **Step 3: Create CheckinItem component**

```vue
<!-- frontend/src/components/business/CheckinItem.vue -->
<template>
  <GlassCard class="checkin-item" :class="{ checked: checkin.checkedToday }">
    <div class="checkin-main">
      <div class="checkin-info">
        <h3>{{ checkin.name }}</h3>
        <div class="checkin-stats">
          <span class="streak">连续 {{ checkin.streak || 0 }} 天</span>
          <span class="total">累计 {{ checkin.total_count || 0 }} 次</span>
        </div>
      </div>
      
      <div class="checkin-action">
        <button
          class="checkin-button"
          :class="{ checked: checkin.checkedToday }"
          @click="$emit('toggle', checkin)"
        >
          <span class="check-icon">{{ checkin.checkedToday ? '✓' : '' }}</span>
        </button>
      </div>
    </div>
    
    <div v-if="showActions" class="checkin-actions">
      <GlassButton 
        variant="secondary" 
        size="small"
        @click="$emit('edit', checkin)"
      >
        编辑
      </GlassButton>
      <GlassButton 
        variant="danger" 
        size="small"
        @click="$emit('delete', checkin)"
      >
        删除
      </GlassButton>
    </div>
  </GlassCard>
</template>

<script setup>
import GlassCard from '../common/GlassCard.vue'
import GlassButton from '../common/GlassButton.vue'

defineProps({
  checkin: {
    type: Object,
    required: true
  },
  showActions: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle', 'edit', 'delete'])
</script>

<style scoped>
.checkin-item {
  margin-bottom: 0.75rem;
}

.checkin-item.checked {
  border-color: var(--success);
  background: rgba(52, 211, 153, 0.05);
}

.checkin-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkin-info h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  color: var(--text);
}

.checkin-stats {
  display: flex;
  gap: 1rem;
}

.streak,
.total {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.checkin-action {
  display: flex;
  align-items: center;
}

.checkin-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--glass-border);
  background: var(--glass-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast) var(--ease-default);
}

.checkin-button:hover {
  border-color: var(--primary);
  background: var(--primary-light);
}

.checkin-button.checked {
  border-color: var(--success);
  background: var(--success);
}

.check-icon {
  font-size: 1.2rem;
  color: white;
  font-weight: bold;
}

.checkin-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--glass-border);
}
</style>
```

- [ ] **Step 4: Create FocusTimer component**

```vue
<!-- frontend/src/components/business/FocusTimer.vue -->
<template>
  <div class="focus-timer">
    <!-- Setup State -->
    <div v-if="state === 'setup'" class="focus-setup">
      <div class="mode-selector">
        <button
          v-for="mode in modes"
          :key="mode.value"
          class="mode-button"
          :class="{ active: currentMode === mode.value }"
          @click="selectMode(mode.value)"
        >
          {{ mode.label }}
        </button>
      </div>
      
      <div v-if="currentMode === 'countdown'" class="duration-input">
        <GlassInput
          v-model="durationMinutes"
          type="number"
          label="专注时长（分钟）"
          placeholder="25"
        />
      </div>
      
      <GlassInput
        v-model="task"
        label="专注任务（可选）"
        placeholder="今天要完成什么？"
      />
      
      <GlassButton 
        variant="primary" 
        size="large"
        block
        @click="start"
      >
        开始专注
      </GlassButton>
    </div>
    
    <!-- Running State -->
    <div v-else-if="state === 'running' || state === 'paused'" class="focus-running">
      <div class="timer-ring">
        <svg viewBox="0 0 256 256" class="ring-svg">
          <circle
            cx="128"
            cy="128"
            r="120"
            fill="none"
            stroke="var(--glass-border)"
            stroke-width="8"
          />
          <circle
            cx="128"
            cy="128"
            r="120"
            fill="none"
            stroke="var(--primary)"
            stroke-width="8"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            transform="rotate(-90 128 128)"
            class="ring-progress"
          />
        </svg>
        <div class="timer-display">
          <span class="time">{{ formattedTime }}</span>
          <span v-if="task" class="task-label">{{ task }}</span>
        </div>
      </div>
      
      <div class="timer-controls">
        <GlassButton
          v-if="state === 'running'"
          variant="secondary"
          @click="pause"
        >
          暂停
        </GlassButton>
        <GlassButton
          v-else
          variant="primary"
          @click="resume"
        >
          继续
        </GlassButton>
        <GlassButton
          variant="success"
          @click="complete"
        >
          完成
        </GlassButton>
        <GlassButton
          variant="danger"
          @click="reset"
        >
          放弃
        </GlassButton>
      </div>
    </div>
    
    <!-- Complete State -->
    <div v-else-if="state === 'complete'" class="focus-complete">
      <div class="complete-icon">🎉</div>
      <h3>专注完成！</h3>
      <p class="complete-duration">专注时长：{{ formattedTime }}</p>
      <p v-if="task" class="complete-task">任务：{{ task }}</p>
      <GlassButton 
        variant="primary" 
        size="large"
        block
        @click="reset"
      >
        开始新的专注
      </GlassButton>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import GlassInput from '../common/GlassInput.vue'
import GlassButton from '../common/GlassButton.vue'

const props = defineProps({
  state: {
    type: String,
    default: 'setup',
    validator: (v) => ['setup', 'running', 'paused', 'complete'].includes(v)
  },
  mode: {
    type: String,
    default: 'unlimited'
  },
  elapsed: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['start', 'pause', 'resume', 'complete', 'reset', 'mode-change'])

const currentMode = ref(props.mode)
const durationMinutes = ref(25)
const task = ref('')

const modes = [
  { value: 'unlimited', label: '正计时' },
  { value: 'countdown', label: '倒计时' }
]

const circumference = 2 * Math.PI * 120

const dashOffset = computed(() => {
  if (currentMode.value === 'unlimited') {
    const segments = Math.floor(props.elapsed / 3600)
    const segProgress = (props.elapsed % 3600) / 3600
    return circumference * (1 - segProgress)
  }
  
  if (props.duration === 0) return circumference
  const progress = props.elapsed / props.duration
  return circumference * (1 - Math.min(progress, 1))
})

const formattedTime = computed(() => {
  const totalSec = currentMode.value === 'countdown'
    ? Math.max(0, props.duration - props.elapsed)
    : props.elapsed
  
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const selectMode = (mode) => {
  currentMode.value = mode
  emit('mode-change', mode)
}

const start = () => {
  emit('start', {
    mode: currentMode.value,
    duration: currentMode.value === 'countdown' ? durationMinutes.value * 60 : 0,
    task: task.value
  })
}

const pause = () => emit('pause')
const resume = () => emit('resume')
const complete = () => emit('complete')
const reset = () => {
  task.value = ''
  emit('reset')
}
</script>

<style scoped>
.focus-timer {
  max-width: 400px;
  margin: 0 auto;
}

.focus-setup {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.mode-selector {
  display: flex;
  gap: 0.5rem;
  background: var(--glass-bg);
  padding: 0.25rem;
  border-radius: var(--radius-sm);
}

.mode-button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-soft);
}

.mode-button.active {
  background: var(--primary-light);
  color: var(--primary);
}

.focus-running {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.timer-ring {
  position: relative;
  width: 256px;
  height: 256px;
}

.ring-svg {
  width: 100%;
  height: 100%;
}

.ring-progress {
  transition: stroke-dashoffset 1s linear;
}

.timer-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.time {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.task-label {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-muted);
  max-width: 200px;
}

.timer-controls {
  display: flex;
  gap: 1rem;
}

.focus-complete {
  text-align: center;
  padding: 2rem;
}

.complete-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.focus-complete h3 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  color: var(--text);
}

.complete-duration,
.complete-task {
  color: var(--text-soft);
  margin-bottom: 1rem;
}
</style>
```

- [ ] **Step 5: Create StatsChart component**

```vue
<!-- frontend/src/components/business/StatsChart.vue -->
<template>
  <div class="stats-chart">
    <canvas ref="chartCanvas" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import {
  Chart,
  BarController,
  LineController,
  PieController,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from 'chart.js'

Chart.register(
  BarController,
  LineController,
  PieController,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
)

const props = defineProps({
  type: {
    type: String,
    default: 'bar',
    validator: (v) => ['bar', 'line', 'pie'].includes(v)
  },
  data: {
    type: Object,
    required: true
  },
  options: {
    type: Object,
    default: () => ({})
  }
})

const chartCanvas = ref(null)
let chartInstance = null

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: 'var(--text-soft)',
        padding: 16,
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: 'var(--glass-bg)',
      titleColor: 'var(--text)',
      bodyColor: 'var(--text-soft)',
      borderColor: 'var(--glass-border)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12
    }
  },
  scales: props.type !== 'pie' ? {
    x: {
      grid: {
        color: 'var(--glass-border)'
      },
      ticks: {
        color: 'var(--text-muted)'
      }
    },
    y: {
      grid: {
        color: 'var(--glass-border)'
      },
      ticks: {
        color: 'var(--text-muted)'
      }
    }
  } : undefined
}

const createChart = () => {
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = chartCanvas.value.getContext('2d')
  
  chartInstance = new Chart(ctx, {
    type: props.type,
    data: props.data,
    options: {
      ...defaultOptions,
      ...props.options
    }
  })
}

const updateChart = () => {
  if (chartInstance) {
    chartInstance.data = props.data
    chartInstance.update()
  }
}

onMounted(() => {
  nextTick(() => {
    createChart()
  })
})

watch(() => props.data, updateChart, { deep: true })
watch(() => props.type, createChart)
</script>

<style scoped>
.stats-chart {
  position: relative;
  height: 300px;
  padding: 1rem;
}
</style>
```

- [ ] **Step 6: Test business components**

Update a view component to test:

```vue
<!-- frontend/src/views/TodayView.vue -->
<template>
  <div class="today-view">
    <div class="plans-list">
      <PlanCard
        v-for="plan in plans"
        :key="plan.id"
        :plan="plan"
        @complete="handleComplete"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>
    
    <GlassCard v-if="plans.length === 0" class="empty-state">
      <p>暂无今日待办，点击右上角添加</p>
    </GlassCard>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { usePlansStore } from '@/stores/plans'
import PlanCard from '@/components/business/PlanCard.vue'
import GlassCard from '@/components/common/GlassCard.vue'

const plansStore = usePlansStore()

const plans = computed(() => plansStore.todayPlans)

onMounted(() => {
  plansStore.fetchPlans()
})

const handleComplete = async (plan) => {
  await plansStore.completePlan(plan.id)
}

const handleEdit = (plan) => {
  editingPlan.value = plan
  showEditModal.value = true
}

const handleDelete = async (plan) => {
  if (confirm('确定要删除这个计划吗？')) {
    await plansStore.deletePlan(plan.id)
  }
}
</script>

<style scoped>
.today-view {
  padding: 2rem;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
}
</style>
```

```bash
cd frontend && npm run dev
```

Verify components render and interactions work.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/business/
git commit -m "feat: add business components (PlanCard, WishCard, etc.)"
```

---

## Task 8: Migrate Page Views

**Files:**
- Create: `frontend/src/views/TodayView.vue` (update)
- Create: `frontend/src/views/WeeklyView.vue`
- Create: `frontend/src/views/MonthlyView.vue`
- Create: `frontend/src/views/YearlyView.vue`
- Create: `frontend/src/views/ImportantView.vue`
- Create: `frontend/src/views/StatsView.vue`
- Create: `frontend/src/views/FocusView.vue`
- Create: `frontend/src/views/WishesView.vue`
- Create: `frontend/src/views/TransactionsView.vue`
- Create: `frontend/src/views/RecycleView.vue`
- Create: `frontend/src/views/ApiBalanceView.vue`
- Create: `frontend/src/views/CheckinView.vue`
- Create: `frontend/src/views/SettingsView.vue`

- [ ] **Step 1: Create WeeklyView**

```vue
<!-- frontend/src/views/WeeklyView.vue -->
<template>
  <div class="weekly-view">
    <Header title="周计划" searchable @search="handleSearch">
      <template #actions>
        <GlassButton variant="primary" @click="showAddModal = true">
          + 新增计划
        </GlassButton>
      </template>
    </Header>
    
    <div class="plans-list">
      <PlanCard
        v-for="plan in filteredPlans"
        :key="plan.id"
        :plan="plan"
        @complete="handleComplete"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>
    
    <GlassCard v-if="filteredPlans.length === 0" class="empty-state">
      <p>暂无周计划，点击右上角添加</p>
    </GlassCard>
    
    <!-- Add Plan Modal -->
    <GlassModal v-model="showAddModal" title="新增周计划">
      <PlanForm @submit="handleAdd" @cancel="showAddModal = false" />
    </GlassModal>
    
    <!-- Edit Plan Modal -->
    <GlassModal v-model="showEditModal" title="编辑计划">
      <PlanForm 
        :plan="editingPlan" 
        @submit="handleUpdate" 
        @cancel="showEditModal = false" 
      />
    </GlassModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlansStore } from '@/stores/plans'
import Header from '@/components/layout/Header.vue'
import PlanCard from '@/components/business/PlanCard.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassModal from '@/components/common/GlassModal.vue'
import GlassButton from '@/components/common/GlassButton.vue'
import PlanForm from '@/components/forms/PlanForm.vue'

const plansStore = usePlansStore()

const showAddModal = ref(false)
const showEditModal = ref(false)
const editingPlan = ref(null)
const searchQuery = ref('')

const plans = computed(() => plansStore.weeklyPlans)

const filteredPlans = computed(() => {
  if (!searchQuery.value) return plans.value
  const query = searchQuery.value.toLowerCase()
  return plans.value.filter(p => 
    p.title.toLowerCase().includes(query) ||
    p.description?.toLowerCase().includes(query)
  )
})

onMounted(() => {
  plansStore.setCurrentType('weekly')
  plansStore.fetchPlans()
})

const handleSearch = (query) => {
  searchQuery.value = query
}

const handleComplete = async (plan) => {
  await plansStore.completePlan(plan.id)
}

const handleEdit = (plan) => {
  editingPlan.value = plan
  showEditModal.value = true
}

const handleDelete = async (plan) => {
  if (confirm('确定要删除这个计划吗？')) {
    await plansStore.deletePlan(plan.id)
  }
}

const handleAdd = async (plan) => {
  await plansStore.createPlan({
    ...plan,
    plan_type: 'weekly'
  })
  showAddModal.value = false
}

const handleUpdate = async (plan) => {
  await plansStore.updatePlan(editingPlan.value.id, plan)
  showEditModal.value = false
  editingPlan.value = null
}
</script>

<style scoped>
.weekly-view {
  min-height: 100vh;
}

.plans-list {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-state {
  margin: 2rem;
  text-align: center;
  color: var(--text-muted);
}
</style>
```

- [ ] **Step 2: Create PlanForm component**

```vue
<!-- frontend/src/components/forms/PlanForm.vue -->
<template>
  <form class="plan-form" @submit.prevent="handleSubmit">
    <GlassInput
      v-model="form.title"
      label="计划标题"
      placeholder="输入计划标题"
      :error="errors.title"
      required
    />
    
    <GlassInput
      v-model="form.description"
      label="计划描述（可选）"
      placeholder="输入计划描述"
      type="textarea"
    />
    
    <div class="form-actions">
      <GlassButton type="submit" variant="primary">
        {{ isEditing ? '更新' : '添加' }}
      </GlassButton>
      <GlassButton type="button" variant="secondary" @click="$emit('cancel')">
        取消
      </GlassButton>
    </div>
  </form>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import GlassInput from '../common/GlassInput.vue'
import GlassButton from '../common/GlassButton.vue'

const props = defineProps({
  plan: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['submit', 'cancel'])

const isEditing = computed(() => !!props.plan)

const form = ref({
  title: '',
  description: ''
})

const errors = ref({
  title: ''
})

onMounted(() => {
  if (props.plan) {
    form.value = {
      title: props.plan.title,
      description: props.plan.description || ''
    }
  }
})

const validate = () => {
  errors.value = { title: '' }
  
  if (!form.value.title.trim()) {
    errors.value.title = '请输入计划标题'
    return false
  }
  
  return true
}

const handleSubmit = () => {
  if (validate()) {
    emit('submit', { ...form.value })
  }
}
</script>

<style scoped>
.plan-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
```

- [ ] **Step 3: Create remaining views**

Create similar views for Monthly, Yearly, etc. following the same pattern:

```vue
<!-- frontend/src/views/MonthlyView.vue -->
<template>
  <div class="monthly-view">
    <Header title="月计划" searchable @search="handleSearch">
      <template #actions>
        <GlassButton variant="primary" @click="showAddModal = true">
          + 新增计划
        </GlassButton>
      </template>
    </Header>
    
    <div class="plans-list">
      <PlanCard
        v-for="plan in filteredPlans"
        :key="plan.id"
        :plan="plan"
        @complete="handleComplete"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>
    
    <GlassCard v-if="filteredPlans.length === 0" class="empty-state">
      <p>暂无月计划，点击右上角添加</p>
    </GlassCard>
    
    <GlassModal v-model="showAddModal" title="新增月计划">
      <PlanForm @submit="handleAdd" @cancel="showAddModal = false" />
    </GlassModal>
    
    <GlassModal v-model="showEditModal" title="编辑计划">
      <PlanForm 
        :plan="editingPlan" 
        @submit="handleUpdate" 
        @cancel="showEditModal = false" 
      />
    </GlassModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlansStore } from '@/stores/plans'
import Header from '@/components/layout/Header.vue'
import PlanCard from '@/components/business/PlanCard.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassModal from '@/components/common/GlassModal.vue'
import GlassButton from '@/components/common/GlassButton.vue'
import PlanForm from '@/components/forms/PlanForm.vue'

const plansStore = usePlansStore()

const showAddModal = ref(false)
const showEditModal = ref(false)
const editingPlan = ref(null)
const searchQuery = ref('')

const plans = computed(() => plansStore.monthlyPlans)

const filteredPlans = computed(() => {
  if (!searchQuery.value) return plans.value
  const query = searchQuery.value.toLowerCase()
  return plans.value.filter(p => 
    p.title.toLowerCase().includes(query) ||
    p.description?.toLowerCase().includes(query)
  )
})

onMounted(() => {
  plansStore.setCurrentType('monthly')
  plansStore.fetchPlans()
})

const handleSearch = (query) => {
  searchQuery.value = query
}

const handleComplete = async (plan) => {
  await plansStore.completePlan(plan.id)
}

const handleEdit = (plan) => {
  editingPlan.value = plan
  showEditModal.value = true
}

const handleDelete = async (plan) => {
  if (confirm('确定要删除这个计划吗？')) {
    await plansStore.deletePlan(plan.id)
  }
}

const handleAdd = async (plan) => {
  await plansStore.createPlan({
    ...plan,
    plan_type: 'monthly'
  })
  showAddModal.value = false
}

const handleUpdate = async (plan) => {
  await plansStore.updatePlan(editingPlan.value.id, plan)
  showEditModal.value = false
  editingPlan.value = null
}
</script>

<style scoped>
.monthly-view {
  min-height: 100vh;
}

.plans-list {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-state {
  margin: 2rem;
  text-align: center;
  color: var(--text-muted);
}
</style>
```

Create similar views for YearlyView, ImportantView, etc.

- [ ] **Step 4: Create FocusView**

```vue
<!-- frontend/src/views/FocusView.vue -->
<template>
  <div class="focus-view">
    <Header title="专注模式" />
    
    <div class="focus-content">
      <FocusTimer
        :state="focusStore.state"
        :mode="focusStore.mode"
        :elapsed="focusStore.elapsed"
        :duration="focusStore.duration"
        @start="handleStart"
        @pause="focusStore.pause()"
        @resume="focusStore.resume()"
        @complete="handleComplete"
        @reset="focusStore.reset()"
        @mode-change="focusStore.setMode"
      />
      
      <div v-if="focusStore.sessions.length > 0" class="sessions-history">
        <h3>专注历史</h3>
        <div class="sessions-list">
          <GlassCard 
            v-for="session in focusStore.sessions" 
            :key="session.id"
            class="session-item"
          >
            <div class="session-info">
              <span class="session-task">{{ session.task || '无任务' }}</span>
              <span class="session-duration">{{ formatDuration(session.duration) }}</span>
            </div>
            <span class="session-time">{{ formatDate(session.created_at) }}</span>
          </GlassCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useFocusStore } from '@/stores/focus'
import Header from '@/components/layout/Header.vue'
import FocusTimer from '@/components/business/FocusTimer.vue'
import GlassCard from '@/components/common/GlassCard.vue'

const focusStore = useFocusStore()

onMounted(() => {
  focusStore.fetchSessions()
})

const handleStart = (config) => {
  focusStore.setMode(config.mode)
  if (config.duration) {
    focusStore.setDuration(config.duration)
  }
  focusStore.setTask(config.task)
  focusStore.start()
}

const handleComplete = async () => {
  await focusStore.complete()
}

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  
  if (h > 0) {
    return `${h}小时${m}分钟`
  }
  return `${m}分钟`
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.focus-view {
  min-height: 100vh;
}

.focus-content {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.sessions-history {
  margin-top: 3rem;
}

.sessions-history h3 {
  margin-bottom: 1rem;
  color: var(--text);
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.session-task {
  font-weight: 500;
  color: var(--text);
}

.session-duration {
  font-size: 0.9rem;
  color: var(--text-soft);
}

.session-time {
  font-size: 0.85rem;
  color: var(--text-muted);
}
</style>
```

- [ ] **Step 5: Create WishesView**

```vue
<!-- frontend/src/views/WishesView.vue -->
<template>
  <div class="wishes-view">
    <Header title="心愿兑换单">
      <template #actions>
        <GlassButton variant="primary" @click="showAddModal = true">
          + 新增心愿
        </GlassButton>
      </template>
    </Header>
    
    <div class="wishes-content">
      <div class="balance-summary">
        <GlassCard class="balance-card">
          <span class="balance-label">当前余额</span>
          <span class="balance-value">{{ wishesStore.balance }}</span>
        </GlassCard>
      </div>
      
      <div class="wishes-list">
        <WishCard
          v-for="wish in wishesStore.activeWishes"
          :key="wish.id"
          :wish="wish"
          :balance="wishesStore.balance"
          @redeem="handleRedeem"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>
      
      <GlassCard v-if="wishesStore.activeWishes.length === 0" class="empty-state">
        <p>暂无心愿，点击右上角添加</p>
      </GlassCard>
    </div>
    
    <GlassModal v-model="showAddModal" title="新增心愿">
      <WishForm @submit="handleAdd" @cancel="showAddModal = false" />
    </GlassModal>
    
    <GlassModal v-model="showEditModal" title="编辑心愿">
      <WishForm 
        :wish="editingWish" 
        @submit="handleUpdate" 
        @cancel="showEditModal = false" 
      />
    </GlassModal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useWishesStore } from '@/stores/wishes'
import Header from '@/components/layout/Header.vue'
import WishCard from '@/components/business/WishCard.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassModal from '@/components/common/GlassModal.vue'
import GlassButton from '@/components/common/GlassButton.vue'
import WishForm from '@/components/forms/WishForm.vue'

const wishesStore = useWishesStore()

const showAddModal = ref(false)
const showEditModal = ref(false)
const editingWish = ref(null)

onMounted(() => {
  wishesStore.fetchWishes()
})

const handleRedeem = async (wish) => {
  if (confirm(`确定要兑换"${wish.name}"吗？`)) {
    await wishesStore.redeemWish(wish.id)
  }
}

const handleEdit = (wish) => {
  editingWish.value = wish
  showEditModal.value = true
}

const handleDelete = async (wish) => {
  if (confirm('确定要删除这个心愿吗？')) {
    await wishesStore.deleteWish(wish.id)
  }
}

const handleAdd = async (wish) => {
  await wishesStore.createWish(wish)
  showAddModal.value = false
}

const handleUpdate = async (wish) => {
  await wishesStore.updateWish(editingWish.value.id, wish)
  showEditModal.value = false
  editingWish.value = null
}
</script>

<style scoped>
.wishes-view {
  min-height: 100vh;
}

.wishes-content {
  padding: 2rem;
}

.balance-summary {
  margin-bottom: 2rem;
}

.balance-card {
  text-align: center;
  padding: 2rem;
}

.balance-label {
  display: block;
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.balance-value {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.wishes-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
}
</style>
```

- [ ] **Step 6: Create remaining views**

Create similar views for:
- TransactionsView
- RecycleView
- ApiBalanceView
- CheckinView
- SettingsView

Follow the same pattern with appropriate components and stores.

- [ ] **Step 7: Test all views**

```bash
cd frontend && npm run dev
```

Navigate through all views and verify functionality.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/views/
git commit -m "feat: migrate all page views to Vue"
```

---

## Task 9: Build and Integration

**Files:**
- Modify: `frontend/vite.config.js`
- Modify: `requirements.txt`
- Modify: `build.sh`
- Modify: `.github/workflows/build.yml`

- [ ] **Step 1: Update Vite config for production**

```javascript
// frontend/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  root: '.',
  base: '/static/dist/',
  build: {
    outDir: '../static/dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          charts: ['chart.js']
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|gif|svg|ico|webp/.test(ext)) {
            return `images/[name]-[hash][extname]`
          }
          if (/woff2?|eot|ttf|otf/.test(ext)) {
            return `fonts/[name]-[hash][extname]`
          }
          return `[name]-[hash][extname]`
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

- [ ] **Step 2: Build frontend**

```bash
cd frontend && npm run build
```

Verify `static/dist/` is created with built files.

- [ ] **Step 3: Update Flask to serve Vue app**

Modify `app.py` to serve the Vue app:

```python
# In app.py, add route to serve Vue app
@app.route('/')
def serve_vue_app():
    return send_from_directory('static/dist', 'index.html')

@app.route('/static/dist/<path:path>')
def serve_static(path):
    return send_from_directory('static/dist', path)
```

- [ ] **Step 4: Update build script**

```bash
#!/bin/bash
# build.sh

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Build desktop app
echo "Building desktop app..."
pyinstaller PlanMaster.spec

# Create DMG (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Creating DMG..."
    hdiutil create -volname "PlanMaster" -srcfolder dist/PlanMaster.app -ov -format UDZO PlanMaster.dmg
fi

echo "Build complete!"
```

- [ ] **Step 5: Update GitHub Actions**

```yaml
# .github/workflows/build.yml (add frontend build step)
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '18'
    cache: 'npm'
    cache-dependency-path: frontend/package-lock.json

- name: Build Frontend
  run: |
    cd frontend
    npm ci
    npm run build
```

- [ ] **Step 6: Test full build**

```bash
./build.sh
```

Verify the application works correctly.

- [ ] **Step 7: Commit**

```bash
git add frontend/vite.config.js build.sh .github/workflows/build.yml app.py
git commit -m "feat: integrate Vue build with Flask and CI/CD"
```

---

## Task 10: Version Update and Final Testing

**Files:**
- Modify: `app.py` (version)
- Modify: `README.md`

- [ ] **Step 1: Update version to 2.0.0**

```python
# In app.py
CURRENT_VERSION = '2.0.0'
```

- [ ] **Step 2: Update README**

Update README.md to reflect new frontend technology:

```markdown
## 技术栈

- **后端**: Python 3.13 + Flask 3.x
- **数据库**: SQLite3 (WAL 模式)
- **前端**: Vue 3 + Vite + Pinia + Vue Router
- **AI**: 通过 OpenAI 兼容 `/v1/chat/completions` 和 `/v1/models` 接口调用任意 LLM
- **打包**: PyInstaller + hdiutil (macOS DMG) / Inno Setup (Windows EXE)
- **CI/CD**: GitHub Actions 自动构建双平台安装包并发布 Release
- **设计风格**: Glassmorphism (毛玻璃)，紫蓝色调渐变背景浮动光球，支持深色主题自适应
```

- [ ] **Step 3: Final comprehensive test**

Test all features:
- [ ] Create/edit/delete plans (today, weekly, monthly, yearly)
- [ ] Complete plans and verify balance update
- [ ] Create/edit/delete wishes
- [ ] Redeem wishes
- [ ] Checkin functionality
- [ ] Focus mode (start, pause, complete)
- [ ] Statistics page
- [ ] Recycle bin (restore, permanent delete)
- [ ] Settings (AI configuration)
- [ ] Dark/light theme toggle
- [ ] Search functionality
- [ ] Responsive layout

- [ ] **Step 4: Commit and tag**

```bash
git add app.py README.md
git commit -m "chore: bump version to 2.0.0 for Vue.js redesign"

git tag -a v2.0.0 -m "Version 2.0.0: Vue.js frontend redesign"
git push origin v2.0.0
```

---

## Summary

**Total Tasks:** 10
**Estimated Time:** 30-42 days
**Key Milestones:**
1. Task 1-3: Foundation (Vue setup, CSS system, components)
2. Task 4-6: Core architecture (layout, API, stores)
3. Task 7-8: Feature migration (business components, views)
4. Task 9-10: Integration and release

**Success Criteria:**
- [ ] All existing features work correctly
- [ ] UI quality improved with Glassmorphism polish
- [ ] Animations smooth at 60fps
- [ ] No platform-specific bugs
- [ ] CI/CD builds successfully
- [ ] Version updated to 2.0.0

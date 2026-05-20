<template>
  <div class="app">
    <!-- 背景光球 -->
    <div class="bg-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <Sidebar />
    <Content>
      <Header :title="currentTitle" />
      <router-view />
    </Content>

    <!-- Toast通知 -->
    <div class="toast" :class="{ show: toastVisible, error: toastIsError }">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api'
import Sidebar from './components/layout/Sidebar.vue'
import Header from './components/layout/Header.vue'
import Content from './components/layout/Content.vue'

const route = useRoute()

const currentTitle = computed(() => {
  return route.meta?.title || 'Todo'
})

// Toast通知
const toastVisible = ref(false)
const toastMessage = ref('')
const toastIsError = ref(false)
let toastTimer = null

const showToast = (msg, isError = false) => {
  toastMessage.value = msg
  toastIsError.value = isError
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, 3000)
}

// 暴露给全局
window.toast = showToast

// 背景设置
const loadBackground = async () => {
  try {
    const settings = await api.getSettings()
    const mode = settings.bg_mode || 'orb'
    const color = settings.bg_solid_color || '#f0eef8'
    const image = settings.bg_image
    applyBgMode(mode, color, image ? bgImageUrl(image) : '')
  } catch (e) {
    console.error('Failed to load background:', e)
  }
}

const bgImageUrl = (path) => {
  if (!path) return ''
  return path.replace('/static/bg_custom/', '/api/background/custom/')
}

const isColorDark = (hex) => {
  if (!hex || !hex.startsWith('#')) return false
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum < 0.5
}

const applyBgMode = (mode, color, image) => {
  document.body.classList.remove('bg-solid', 'bg-image', 'theme-dark')
  if (mode === 'solid') {
    document.body.classList.add('bg-solid')
    document.body.style.backgroundColor = color
    document.body.style.backgroundImage = ''
    if (isColorDark(color)) {
      document.body.classList.add('theme-dark')
    }
  } else if (mode === 'image') {
    document.body.classList.add('bg-image', 'theme-dark')
    document.body.style.backgroundColor = ''
    if (image) {
      document.body.style.backgroundImage = `url(${image})`
    }
  } else {
    document.body.style.backgroundColor = ''
    document.body.style.backgroundImage = ''
  }
}

// ESC关闭弹窗
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'))
  }
}

onMounted(() => {
  loadBackground()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  clearTimeout(toastTimer)
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
  min-height: 100vh;
}

/* 背景光球 */
.bg-orbs {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}

body.bg-solid .bg-orbs,
body.bg-image .bg-orbs {
  display: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  animation: float 20s ease-in-out infinite;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: #7c6ef0;
  top: -100px;
  left: -100px;
  animation-delay: 0s;
}

.orb-2 {
  width: 350px;
  height: 350px;
  background: #3b82f6;
  top: 50%;
  right: -100px;
  animation-delay: -7s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: #10b981;
  bottom: -100px;
  left: 30%;
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(50px, -50px) scale(1.1);
  }
  50% {
    transform: translate(-30px, 30px) scale(0.9);
  }
  75% {
    transform: translate(30px, 50px) scale(1.05);
  }
}

/* 背景图片模式 */
body.bg-image {
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

/* Toast通知 */
.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  padding: 0.75rem 1.5rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--text);
  font-size: 0.9rem;
  z-index: 10000;
  opacity: 0;
  transition: all 0.3s ease;
  pointer-events: none;
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.toast.error {
  border-color: var(--danger);
  color: var(--danger);
}
</style>

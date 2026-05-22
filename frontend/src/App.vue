<template>
  <div class="app">
    <div class="bg-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <nav class="sidebar" ref="sidebarRef">
      <div class="sidebar-header">
        <h1>Todo</h1>
        <p class="subtitle">计划管理</p>
      </div>
      <div class="balance-card" id="balanceCard">
        <span class="balance-label">虚拟价值余额</span>
        <span class="balance-value" id="balanceValue">{{ balance }}</span>
      </div>
      <ul class="nav-menu">
        <li class="nav-item" :class="{ active: currentRoute === '/checkin' }" @click="navigate('/checkin')">
          <span class="nav-icon">&#9745;</span><span>打卡</span>
        </li>
        <li class="nav-item" :class="{ active: currentRoute === '/important' }" @click="navigate('/important')">
          <span class="nav-icon">&#9888;</span><span>重要事项</span>
        </li>
        <li class="nav-item" :class="{ active: currentRoute === '/' }" @click="navigate('/')">
          <span class="nav-icon">&#9728;</span><span>今日待办</span>
        </li>
        <li class="nav-group">
          <div class="nav-group-header" :class="{ collapsed: !plansOpen }" @click="plansOpen = !plansOpen">
            <span class="nav-icon">&#128197;</span>
            <span>计划管理</span>
            <span class="arrow">&#9662;</span>
          </div>
          <ul class="nav-group-items" :class="{ open: plansOpen }">
            <li class="nav-item" :class="{ active: currentRoute === '/weekly' }" @click="navigate('/weekly')"><span>周计划</span></li>
            <li class="nav-item" :class="{ active: currentRoute === '/monthly' }" @click="navigate('/monthly')"><span>月计划</span></li>
            <li class="nav-item" :class="{ active: currentRoute === '/yearly' }" @click="navigate('/yearly')"><span>年计划</span></li>
          </ul>
        </li>
        <li class="nav-item" :class="{ active: currentRoute === '/stats' }" @click="navigate('/stats')">
          <span class="nav-icon">&#128202;</span><span>统计数据</span>
        </li>
        <li class="nav-item" :class="{ active: currentRoute === '/focus' }" @click="navigate('/focus')">
          <span class="nav-icon">&#9201;</span><span>专注模式</span>
        </li>
        <li class="nav-item" :class="{ active: currentRoute === '/wishes' }" @click="navigate('/wishes')">
          <span class="nav-icon">&#9734;</span><span>心愿兑换单</span>
        </li>
        <li class="nav-item" :class="{ active: currentRoute === '/transactions' }" @click="navigate('/transactions')">
          <span class="nav-icon">&#128200;</span><span>价值流水</span>
        </li>
        <li class="nav-item" :class="{ active: currentRoute === '/recycle' }" @click="navigate('/recycle')">
          <span class="nav-icon">&#128465;</span><span>回收站</span>
        </li>
        <li class="nav-item" :class="{ active: currentRoute === '/apibalance' }" @click="navigate('/apibalance')">
          <span class="nav-icon">&#128176;</span><span>API余量</span>
        </li>
        <li class="nav-item" :class="{ active: currentRoute === '/settings' }" @click="navigate('/settings')">
          <span class="nav-icon">&#9881;</span><span>AI设置</span>
        </li>
      </ul>
    </nav>

    <main class="content" ref="contentRef">
      <router-view v-slot="{ Component, route }">
        <transition
          @before-enter="onBeforeEnter"
          @enter="onEnter"
          @leave="onLeave"
          mode="out-in"
        >
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>

    <transition @enter="onToastEnter" @leave="onToastLeave">
      <div v-if="toastVisible" class="toast" :class="{ error: toastIsError }">{{ toastMessage }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import gsap from 'gsap'
import api from '@/api'

const route = useRoute()
const router = useRouter()

const balance = ref(0)
const plansOpen = ref(true)
const currentRoute = computed(() => route.path)
const navigate = (path) => router.push(path)

// Refs
const sidebarRef = ref(null)
const contentRef = ref(null)

// Toast
const toastVisible = ref(false)
const toastMessage = ref('')
const toastIsError = ref(false)
let toastTimer = null

const showToast = (msg, isError = false) => {
  toastMessage.value = msg
  toastIsError.value = isError
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 3000)
}
window.toast = showToast

const loadBalance = async () => {
  try {
    const d = await api.getBalance()
    balance.value = d.balance.toFixed(2)
  } catch (e) {}
}
window.loadBalance = loadBalance

// Background
const bgImageUrl = (path) => { if (!path) return ''; return path.replace('/static/bg_custom/', '/api/background/custom/') }
const isColorDark = (hex) => { if (!hex || !hex.startsWith('#')) return false; const c = hex.replace('#', ''); return (0.299 * parseInt(c.substring(0, 2), 16) + 0.587 * parseInt(c.substring(2, 4), 16) + 0.114 * parseInt(c.substring(4, 6), 16)) / 255 < 0.5 }
const applyBgMode = (mode, color, image) => {
  document.body.classList.remove('bg-solid', 'bg-image', 'theme-dark')
  if (mode === 'solid') { document.body.classList.add('bg-solid'); document.body.style.backgroundColor = color; document.body.style.backgroundImage = ''; if (isColorDark(color)) document.body.classList.add('theme-dark') }
  else if (mode === 'image') { document.body.classList.add('bg-image', 'theme-dark'); document.body.style.backgroundColor = ''; if (image) document.body.style.backgroundImage = `url(${image})` }
  else { document.body.style.backgroundColor = ''; document.body.style.backgroundImage = '' }
}
window.applyBgMode = applyBgMode

// Glass Style
const applyGlassStyle = (style) => {
  document.body.classList.remove('glass-liquid')
  if (style === 'liquid') {
    document.body.classList.add('glass-liquid')
  }
  localStorage.setItem('glass_style', style)
}
window.applyGlassStyle = applyGlassStyle

const loadBackground = async () => {
  try { const s = await api.getSettings(); applyBgMode(s.bg_mode || 'orb', s.bg_solid_color || '#f0eef8', s.bg_image ? bgImageUrl(s.bg_image) : '') } catch (e) {}
}

const handleKeydown = (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')) }

// GSAP Transition hooks
function onBeforeEnter(el) {
  gsap.set(el, { 
    opacity: 0, 
    scale: 0.96, 
    y: 15,
    filter: 'blur(10px)'
  })
}

function onEnter(el, done) {
  gsap.to(el, {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    duration: 0.8,
    ease: 'expo.out',
    clearProps: 'filter,transform',
    onComplete: done
  })
}

function onLeave(el, done) {
  gsap.to(el, {
    opacity: 0,
    scale: 1.02,
    y: -10,
    filter: 'blur(5px)',
    duration: 0.4,
    ease: 'power2.inOut',
    onComplete: done
  })
}

// Toast transitions
function onToastEnter(el, done) {
  gsap.fromTo(el, 
    { opacity: 0, y: 30, scale: 0.9 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.6,
      ease: 'elastic.out(1, 0.8)',
      onComplete: done
    }
  )
}

function onToastLeave(el, done) {
  gsap.to(el, {
    opacity: 0,
    scale: 0.9,
    y: 20,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: done
  })
}

onMounted(async () => {
  await loadBalance()
  await loadBackground()
  const savedGlassStyle = localStorage.getItem('glass_style') || 'default'
  applyGlassStyle(savedGlassStyle)
  document.addEventListener('keydown', handleKeydown)

  // Animate sidebar entrance with iOS-style fluid slide
  if (sidebarRef.value) {
    // Force initial visibility just in case
    sidebarRef.value.style.visibility = 'visible'
    sidebarRef.value.style.opacity = '1'

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
    
    // 1. Sidebar container slide & fade
    tl.from(sidebarRef.value, {
      x: -100,
      opacity: 0,
      duration: 1.4,
      clearProps: 'x,opacity'
    })
    
    // 2. Staggered entrance for top-level menu items
    const navItems = sidebarRef.value.querySelectorAll('.nav-menu > li')
    if (navItems.length) {
      tl.from(navItems, {
        x: -30,
        opacity: 0,
        duration: 1.0,
        stagger: 0.08,
        clearProps: 'all'
      }, '-=1.0')
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  clearTimeout(toastTimer)
})
</script>

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
      <div 
        class="balance-card" 
        id="balanceCard"
        @click="navigate('/wishes')"
        @mousedown="onBalanceMouseDown"
        @mouseup="onBalanceMouseUp"
        @mouseleave="onBalanceMouseUp"
      >
        <span class="balance-label">虚拟价值余额</span>
        <span class="balance-value" id="balanceValue">{{ balance }}</span>
      </div>
      <ul class="nav-menu" ref="navMenuRef">
        <!-- Floating Active Pill -->
        <div class="active-pill" ref="pillRef"></div>

        <li 
          class="nav-item" 
          :class="{ active: currentRoute === '/checkin' }" 
          data-path="/checkin"
          @click="navigate('/checkin')"
        >
          <span class="nav-icon">&#9745;</span><span>打卡</span>
        </li>
        <li 
          class="nav-item" 
          :class="{ active: currentRoute === '/important' }" 
          data-path="/important"
          @click="navigate('/important')"
        >
          <span class="nav-icon">&#9888;</span><span>重要事项</span>
        </li>
        <li
          class="nav-item"
          :class="{ active: currentRoute === '/' }"
          data-path="/"
          @click="navigate('/')"
        >
          <span class="nav-icon">&#9728;</span><span>今日待办</span>
        </li>
        <li
          class="nav-item"
          :class="{ active: currentRoute === '/daily-plan' }"
          data-path="/daily-plan"
          @click="navigate('/daily-plan')"
        >
          <span class="nav-icon">&#128221;</span><span>今日规划</span>
        </li>
        <li class="nav-group">
          <div 
            class="nav-group-header" 
            :class="{ collapsed: !plansOpen }" 
            @click="togglePlans"
          >
            <span class="nav-icon">&#128197;</span>
            <span>计划管理</span>
            <span class="arrow" ref="arrowRef">&#9662;</span>
          </div>
          <div class="nav-group-items-wrapper" ref="plansWrapper">
            <ul class="nav-group-items">
              <li 
                class="nav-item sub-item" 
                :class="{ active: currentRoute === '/weekly' }" 
                data-path="/weekly"
                @click="navigate('/weekly')"
              >
                <span>周计划</span>
              </li>
              <li 
                class="nav-item sub-item" 
                :class="{ active: currentRoute === '/monthly' }" 
                data-path="/monthly"
                @click="navigate('/monthly')"
              >
                <span>月计划</span>
              </li>
              <li 
                class="nav-item sub-item" 
                :class="{ active: currentRoute === '/yearly' }" 
                data-path="/yearly"
                @click="navigate('/yearly')"
              >
                <span>年计划</span>
              </li>
            </ul>
          </div>
        </li>
        <li 
          class="nav-item" 
          :class="{ active: currentRoute === '/stats' }" 
          data-path="/stats"
          @click="navigate('/stats')"
        >
          <span class="nav-icon">&#128202;</span><span>统计数据</span>
        </li>
        <li 
          class="nav-item" 
          :class="{ active: currentRoute === '/focus' }" 
          data-path="/focus"
          @click="navigate('/focus')"
        >
          <span class="nav-icon">&#9201;</span><span>专注模式</span>
        </li>
        <li 
          class="nav-item" 
          :class="{ active: currentRoute === '/wishes' }" 
          data-path="/wishes"
          @click="navigate('/wishes')"
        >
          <span class="nav-icon">&#9734;</span><span>心愿兑换单</span>
        </li>
        <li 
          class="nav-item" 
          :class="{ active: currentRoute === '/transactions' }" 
          data-path="/transactions"
          @click="navigate('/transactions')"
        >
          <span class="nav-icon">&#128200;</span><span>价值流水</span>
        </li>
        <li 
          class="nav-item" 
          :class="{ active: currentRoute === '/recycle' }" 
          data-path="/recycle"
          @click="navigate('/recycle')"
        >
          <span class="nav-icon">&#128465;</span><span>回收站</span>
        </li>
        <li 
          class="nav-item" 
          :class="{ active: currentRoute === '/apibalance' }" 
          data-path="/apibalance"
          @click="navigate('/apibalance')"
        >
          <span class="nav-icon">&#128176;</span><span>API余量</span>
        </li>
        <li 
          class="nav-item" 
          :class="{ active: currentRoute === '/settings' }" 
          data-path="/settings"
          @click="navigate('/settings')"
        >
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

    <AICommandPalette />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import gsap from 'gsap'
import api from '@/api'
import AICommandPalette from '@/components/common/AICommandPalette.vue'

const route = useRoute()
const router = useRouter()

const balance = ref(0)
const plansOpen = ref(true)
const currentRoute = computed(() => route.path)
const navigate = (path) => router.push(path)

// Refs
const sidebarRef = ref(null)
const navMenuRef = ref(null)
const pillRef = ref(null)
const contentRef = ref(null)
const plansWrapper = ref(null)
const arrowRef = ref(null)

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
  if (mode === 'solid') { 
    document.body.classList.add('bg-solid'); 
    document.body.style.backgroundColor = color; 
    document.body.style.backgroundImage = ''; 
    if (isColorDark(color)) document.body.classList.add('theme-dark') 
  }
  else if (mode === 'image') { 
    document.body.classList.add('bg-image', 'theme-dark'); 
    document.body.style.backgroundColor = ''; 
    if (image) document.body.style.backgroundImage = `url(${image})` 
  }
  else { 
    document.body.style.backgroundColor = ''; 
    document.body.style.backgroundImage = '' 
  }
}
window.applyBgMode = applyBgMode

// Glass Style
const applyGlassStyle = (style) => {
  document.body.classList.add('glass-liquid')
  localStorage.setItem('glass_style', 'liquid')
}
window.applyGlassStyle = applyGlassStyle

const loadBackground = async () => {
  try { const s = await api.getSettings(); applyBgMode(s.bg_mode || 'orb', s.bg_solid_color || '#f0eef8', s.bg_image ? bgImageUrl(s.bg_image) : '') } catch (e) {}
}

const handleKeydown = (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')) }

const togglePlans = () => {
  plansOpen.value = !plansOpen.value
  nextTick(() => {
    animatePlansMenu()
    // Re-update pill position after menu animation starts
    movePill()
    // And again after it likely finishes to be safe
    setTimeout(movePill, 450)
  })
}

const animatePlansMenu = () => {
  if (!plansWrapper.value) return
  const isOpen = plansOpen.value
  
  gsap.to(plansWrapper.value, {
    height: isOpen ? 'auto' : 0,
    opacity: isOpen ? 1 : 0,
    duration: 0.4,
    ease: 'power3.inOut',
    onUpdate: movePill // Smoothly move pill while menu is animating
  })
  
  gsap.to(arrowRef.value, {
    rotation: isOpen ? 0 : -90,
    duration: 0.3,
    ease: 'power2.out'
  })
}

const movePill = () => {
  if (!pillRef.value || !navMenuRef.value) return
  
  const activeItem = navMenuRef.value.querySelector(`.nav-item[data-path="${currentRoute.value}"]`)
  if (activeItem) {
    const itemRect = activeItem.getBoundingClientRect()
    const containerRect = navMenuRef.value.getBoundingClientRect()
    
    // Find the text span to align the underline exactly with the text
    const textSpan = activeItem.querySelector('span:not(.nav-icon)') || activeItem
    const textRect = textSpan.getBoundingClientRect()
    
    const relativeY = (textRect.bottom - containerRect.top) + navMenuRef.value.scrollTop
    const relativeX = (textRect.left - containerRect.left)
    const textWidth = textRect.width
    
    gsap.to(pillRef.value, {
      y: relativeY + 4, // Offset slightly below the text
      x: relativeX,
      width: textWidth,
      height: '3px',
      opacity: 1,
      duration: 0.4,
      ease: 'power3.out',
      overwrite: 'auto'
    })
  } else {
    gsap.to(pillRef.value, { opacity: 0, duration: 0.3 })
  }
}

watch(currentRoute, () => {
  nextTick(movePill)
})

const onBalanceMouseDown = () => {
  gsap.to('#balanceCard', {
    scale: 0.95,
    duration: 0.2,
    ease: 'power2.out'
  })
}

const onBalanceMouseUp = () => {
  gsap.to('#balanceCard', {
    scale: 1,
    duration: 0.3,
    ease: 'back.out(1.7)'
  })
}

// GSAP Transition hooks
function onBeforeEnter(el) {
  gsap.set(el, { 
    opacity: 0, 
    scale: 0.98, 
    y: 10
  })
}

function onEnter(el, done) {
  gsap.to(el, {
    opacity: 1,
    scale: 1,
    y: 0,
    duration: 0.5,
    ease: 'power3.out',
    onComplete: done
  })
}

function onLeave(el, done) {
  gsap.to(el, {
    opacity: 0,
    scale: 1.01,
    y: -5,
    duration: 0.3,
    ease: 'power2.in',
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
  applyGlassStyle('liquid')
  document.addEventListener('keydown', handleKeydown)

  // Initialize plans menu height
  if (plansWrapper.value) {
    gsap.set(plansWrapper.value, { height: plansOpen.value ? 'auto' : 0, opacity: plansOpen.value ? 1 : 0 })
  }

  // Initial pill position
  setTimeout(movePill, 100)

  // Animate sidebar entrance with iOS-style fluid slide
  if (sidebarRef.value) {
    sidebarRef.value.style.visibility = 'visible'
    sidebarRef.value.style.opacity = '1'

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
    
    tl.from(sidebarRef.value, {
      x: -100,
      opacity: 0,
      duration: 1.2,
      clearProps: 'x,opacity'
    })
    
    const navItems = sidebarRef.value.querySelectorAll('.nav-menu > li, .balance-card, .sidebar-header')
    if (navItems.length) {
      tl.from(navItems, {
        x: -20,
        opacity: 0,
        duration: 0.8,
        stagger: 0.05,
        clearProps: 'all'
      }, '-=0.8')
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  clearTimeout(toastTimer)
})
</script>

<style>
/* Global Active Underline Styles */
.active-pill {
  position: absolute;
  left: 0;
  width: 0;
  height: 3px;
  background: var(--primary);
  border-radius: 2px;
  box-shadow: 0 2px 10px var(--primary-glow);
  z-index: 10;
  pointer-events: none;
  opacity: 0;
}

.nav-group-items-wrapper {
  overflow: hidden;
}

/* Ensure smooth transitions for all interactive elements */
a, button, .nav-item, .balance-card, .glass-card {
  -webkit-tap-highlight-color: transparent;
  outline: none !important;
}

.nav-item {
  position: relative;
  z-index: 1;
}

.nav-item.active {
  color: var(--primary) !important;
  font-weight: 700 !important;
}
</style>



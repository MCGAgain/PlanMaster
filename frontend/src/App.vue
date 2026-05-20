<template>
  <div class="app">
    <div class="bg-orbs">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <nav class="sidebar">
      <div class="sidebar-header">
        <h1>Todo</h1>
        <p class="subtitle">计划管理 & 心愿兑换</p>
      </div>
      <div class="balance-card" id="balanceCard">
        <span class="balance-label">虚拟价值余额</span>
        <span class="balance-value" id="balanceValue">{{ balance }}</span>
      </div>
      <ul class="nav-menu">
        <li v-for="item in navItems" :key="item.path || item.label"
          :class="['nav-item', { active: currentRoute === item.path, 'nav-group': item.children }]"
          @click="item.path ? navigate(item.path) : null">
          <template v-if="!item.children">
            <span class="nav-icon" v-html="item.icon"></span><span>{{ item.label }}</span>
          </template>
          <template v-else>
            <div class="nav-group-header" :class="{ collapsed: !plansOpen }" @click="plansOpen = !plansOpen">
              <span class="nav-icon" v-html="item.icon"></span>
              <span>{{ item.label }}</span>
              <span class="arrow">&#9662;</span>
            </div>
            <ul class="nav-group-items" :style="{ maxHeight: plansOpen ? '200px' : '0' }">
              <li v-for="child in item.children" :key="child.path"
                class="nav-item" :class="{ active: currentRoute === child.path }"
                @click.stop="navigate(child.path)">
                <span>{{ child.label }}</span>
              </li>
            </ul>
          </template>
        </li>
      </ul>
    </nav>

    <main class="content">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <transition name="toast-slide">
      <div v-if="toastVisible" class="toast" :class="{ error: toastIsError }">{{ toastMessage }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'

const route = useRoute()
const router = useRouter()

const balance = ref(0)
const plansOpen = ref(true)
const currentRoute = computed(() => route.path)
const navigate = (path) => router.push(path)

const navItems = [
  { path: '/checkin', label: '打卡', icon: '&#9745;' },
  { path: '/important', label: '重要事项', icon: '&#9888;' },
  { path: '/', label: '今日待办', icon: '&#9728;' },
  { label: '计划管理', icon: '&#128197;', children: [
    { path: '/weekly', label: '周计划' },
    { path: '/monthly', label: '月计划' },
    { path: '/yearly', label: '年计划' }
  ]},
  { path: '/stats', label: '统计数据', icon: '&#128202;' },
  { path: '/focus', label: '专注模式', icon: '&#9201;' },
  { path: '/wishes', label: '心愿兑换单', icon: '&#9734;' },
  { path: '/transactions', label: '价值流水', icon: '&#128200;' },
  { path: '/recycle', label: '回收站', icon: '&#128465;' },
  { path: '/apibalance', label: 'API余量', icon: '&#128176;' },
  { path: '/settings', label: 'AI设置', icon: '&#9881;' }
]

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
    balance.value = d.balance.toFixed(1)
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

const loadBackground = async () => {
  try { const s = await api.getSettings(); applyBgMode(s.bg_mode || 'orb', s.bg_solid_color || '#f0eef8', s.bg_image ? bgImageUrl(s.bg_image) : '') } catch (e) {}
}

const handleKeydown = (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')) }

onMounted(async () => { await loadBalance(); await loadBackground(); document.addEventListener('keydown', handleKeydown) })
onUnmounted(() => { document.removeEventListener('keydown', handleKeydown); clearTimeout(toastTimer) })
</script>

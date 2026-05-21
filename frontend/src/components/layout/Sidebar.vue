<template>
  <nav class="sidebar" ref="sidebarRef">
    <div class="sidebar-header">
      <h1>Todo</h1>
      <p class="subtitle">计划管理 & 心愿兑换</p>
    </div>

    <div class="balance-card" @click="$router.push('/wishes')" ref="balanceCardRef">
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
        <span class="nav-icon">{{ item.icon }}</span>
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
          <span class="arrow">&#9662;</span>
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
        <span class="nav-icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import gsap from 'gsap'

const route = useRoute()
const router = useRouter()

const balance = ref(0)
const plansOpen = ref(true)
const sidebarRef = ref(null)
const balanceCardRef = ref(null)

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

// Add hover effects with GSAP
onMounted(() => {
  // Balance card hover effect
  if (balanceCardRef.value) {
    const card = balanceCardRef.value
    card.addEventListener('mouseenter', () => {
      gsap.to(card, {
        scale: 1.02,
        boxShadow: '0 4px 20px var(--primary-glow)',
        duration: 0.2,
        ease: 'power2.out'
      })
    })
    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        scale: 1,
        boxShadow: 'none',
        duration: 0.2,
        ease: 'power2.out'
      })
    })
  }

  // Nav item hover effects
  const navItems = sidebarRef.value?.querySelectorAll('.nav-item')
  if (navItems) {
    navItems.forEach(item => {
      item.addEventListener('mouseenter', () => {
        gsap.to(item, {
          x: 4,
          duration: 0.2,
          ease: 'power2.out'
        })
      })
      item.addEventListener('mouseleave', () => {
        gsap.to(item, {
          x: 0,
          duration: 0.2,
          ease: 'power2.out'
        })
      })
    })
  }
})

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
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 100;
  overflow: hidden;
}

.sidebar-header {
  padding: 28px 24px 20px;
  border-bottom: 1px solid rgba(255,255,255,.2);
}

.sidebar-header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sidebar-header .subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-soft);
}

.balance-card {
  margin: 16px 20px;
  padding: 18px;
  background: linear-gradient(135deg, rgba(124,110,240,.15), rgba(167,139,250,.1));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(124,110,240,.2);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}

.balance-label {
  font-size: 12px;
  color: var(--text-soft);
  font-weight: 500;
}

.balance-value {
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-menu {
  list-style: none;
  padding: 8px 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 24px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-soft);
  border-left: 3px solid transparent;
  position: relative;
}

.nav-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(124,110,240,.1), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.nav-item:hover::before {
  opacity: 1;
}

.nav-item:hover {
  color: var(--text);
}

.nav-item.active {
  border-left-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
}

.nav-item.active::before {
  opacity: 1;
}

.nav-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.nav-group {
  margin: 8px 0;
}

.nav-group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-soft);
  transition: var(--transition);
}

.nav-group-header:hover {
  background: rgba(124,110,240,.08);
  color: var(--primary);
}

.nav-group-header .arrow {
  margin-left: auto;
  font-size: 10px;
  transition: transform 0.3s ease;
}

.nav-group-header.collapsed .arrow {
  transform: rotate(-90deg);
}

.nav-group-items {
  list-style: none;
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.4s ease;
  padding: 0;
  margin: 0;
}

.nav-group-items[style*="display"] {
  max-height: 200px;
}

.nav-group-items .nav-item {
  padding-left: 50px;
  font-size: 13px;
}
</style>

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
      >
        <router-link :to="item.path" class="nav-link">
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </router-link>
      </li>

      <li class="nav-group">
        <div
          class="nav-group-header"
          :class="{ collapsed: !plansOpen }"
          @click="plansOpen = !plansOpen"
        >
          <span class="nav-icon">📅</span>
          <span>计划管理</span>
          <span class="arrow" :class="{ open: plansOpen }">&#9662;</span>
        </div>
        <ul v-show="plansOpen" class="nav-group-items">
          <li
            v-for="plan in planTypes"
            :key="plan.path"
            class="nav-item"
            :class="{ active: currentRoute === plan.path }"
          >
            <router-link :to="plan.path" class="nav-link">
              <span>{{ plan.label }}</span>
            </router-link>
          </li>
        </ul>
      </li>

      <li
        v-for="item in bottomItems"
        :key="item.path"
        class="nav-item"
        :class="{ active: currentRoute === item.path }"
      >
        <router-link :to="item.path" class="nav-link">
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const balance = ref(0)
const plansOpen = ref(true)

const currentRoute = computed(() => route.path)

const menuItems = [
  { path: '/checkin', label: '打卡', icon: '☑' },
  { path: '/important', label: '重要事项', icon: '⚠' },
  { path: '/', label: '今日待办', icon: '☀' }
]

const planTypes = [
  { path: '/weekly', label: '周计划' },
  { path: '/monthly', label: '月计划' },
  { path: '/yearly', label: '年计划' }
]

const bottomItems = [
  { path: '/stats', label: '统计数据', icon: '📊' },
  { path: '/focus', label: '专注模式', icon: '⏱' },
  { path: '/wishes', label: '心愿兑换单', icon: '☆' },
  { path: '/transactions', label: '价值流水', icon: '📈' },
  { path: '/recycle', label: '回收站', icon: '🗑' },
  { path: '/apibalance', label: 'API余量', icon: '💰' },
  { path: '/settings', label: 'AI设置', icon: '⚙' }
]

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
  margin: 0.25rem 0;
  border-radius: var(--radius-sm);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: all var(--transition-fast) var(--ease-default);
  color: var(--text-soft);
}

.nav-link:hover {
  background: var(--glass-bg);
  color: var(--text);
}

.nav-item.active .nav-link {
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
  font-size: 0.9rem;
}

.nav-group-items .nav-link {
  padding: 0.5rem 1rem;
}
</style>

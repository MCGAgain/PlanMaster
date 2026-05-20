# PlanMaster 前端重构设计文档

**日期**: 2026-05-20
**版本**: 1.0
**状态**: 待审批

---

## 1. 概述

### 1.1 背景

PlanMaster 当前使用原生 HTML/CSS/JavaScript 构建前端，存在以下问题：
- 视觉效果粗糙，UI细节不够精致
- 代码难以维护，组件化程度低
- 动画不流畅，交互体验有待提升

### 1.2 目标

- **跨平台一致性**：保持 macOS 和 Windows 桌面应用的统一表现
- **视觉升级**：优化 Glassmorphism 风格，提升UI精致度
- **性能提升**：实现60fps流畅动画，优化响应速度
- **可维护性**：组件化开发，提高代码可读性和可维护性
- **CI/CD友好**：构建流程稳定，不引入平台特定问题

### 1.3 技术选型

**选择方案：Vue.js 重构**

| 维度 | 选择 | 理由 |
|------|------|------|
| 核心框架 | Vue 3 (Composition API) | 渐进式框架，学习曲线平缓，中文生态完善 |
| 构建工具 | Vite | 快速热更新，构建速度快，配置简单 |
| 状态管理 | Pinia | Vue 3 官方推荐，轻量级，TypeScript友好 |
| 路由管理 | Vue Router | Vue 官方路由，与框架深度集成 |
| 样式方案 | CSS Variables | 原生支持，性能好，主题切换方便 |
| 动画方案 | Vue Transition + CSS | 原生支持，60fps，GPU加速 |

---

## 2. 项目结构

```
PlanMaster/
├── src/                          # Vue源代码
│   ├── assets/                   # 静态资源
│   │   ├── icons/                # 图标文件
│   │   └── images/               # 图片资源
│   ├── components/               # 通用组件
│   │   ├── layout/               # 布局组件
│   │   │   ├── Sidebar.vue       # 侧边栏导航
│   │   │   ├── Header.vue        # 页面头部
│   │   │   └── Content.vue       # 内容区域
│   │   ├── common/               # 基础UI组件
│   │   │   ├── GlassCard.vue     # 毛玻璃卡片
│   │   │   ├── GlassButton.vue   # 毛玻璃按钮
│   │   │   ├── GlassModal.vue    # 毛玻璃弹窗
│   │   │   ├── GlassInput.vue    # 毛玻璃输入框
│   │   │   └── GlassToast.vue    # 提示消息
│   │   └── business/             # 业务组件
│   │       ├── PlanCard.vue      # 计划卡片
│   │       ├── WishCard.vue      # 心愿卡片
│   │       ├── CheckinItem.vue   # 打卡项
│   │       ├── FocusTimer.vue    # 专注计时器
│   │       └── StatsChart.vue    # 统计图表
│   ├── views/                    # 页面视图
│   │   ├── TodayView.vue         # 今日待办
│   │   ├── WeeklyView.vue        # 周计划
│   │   ├── MonthlyView.vue       # 月计划
│   │   ├── YearlyView.vue        # 年计划
│   │   ├── ImportantView.vue     # 重要事项
│   │   ├── StatsView.vue         # 统计数据
│   │   ├── FocusView.vue         # 专注模式
│   │   ├── WishesView.vue        # 心愿清单
│   │   ├── TransactionsView.vue  # 价值流水
│   │   ├── RecycleView.vue       # 回收站
│   │   ├── ApiBalanceView.vue    # API余量
│   │   ├── CheckinView.vue       # 打卡管理
│   │   └── SettingsView.vue      # AI设置
│   ├── stores/                   # Pinia状态管理
│   │   ├── plans.js              # 计划状态
│   │   ├── wishes.js             # 心愿状态
│   │   ├── checkins.js           # 打卡状态
│   │   ├── focus.js              # 专注状态
│   │   ├── transactions.js       # 交易状态
│   │   └── settings.js           # 设置状态
│   ├── api/                      # API调用层
│   │   └── index.js              # 统一API封装
│   ├── composables/              # 组合式函数
│   │   ├── useAnimation.js       # 动画工具
│   │   ├── useTheme.js           # 主题管理
│   │   ├── useFocus.js           # 专注逻辑
│   │   └── useSearch.js          # 搜索功能
│   ├── styles/                   # 全局样式
│   │   ├── variables.css         # CSS变量定义
│   │   ├── glassmorphism.css     # 玻璃拟态样式
│   │   ├── animations.css        # 动画定义
│   │   └── transitions.css       # 过渡效果
│   ├── utils/                    # 工具函数
│   │   ├── format.js             # 格式化工具
│   │   └── validators.js         # 验证工具
│   ├── App.vue                   # 根组件
│   └── main.js                   # 入口文件
├── public/                       # 公共静态资源
│   └── favicon.ico
├── index.html                    # HTML入口
├── vite.config.js                # Vite配置
├── package.json                  # 项目依赖
├── eslint.config.js              # ESLint配置
└── .gitignore                    # Git忽略文件
```

---

## 3. 组件设计

### 3.1 布局组件

#### Sidebar.vue（侧边栏导航）
- **功能**：应用导航、余额显示、页面切换
- **Props**：无
- **Events**：`@navigate(page)` - 页面切换事件
- **样式**：毛玻璃背景，固定宽度240px

#### Header.vue（页面头部）
- **功能**：页面标题、操作按钮、搜索框
- **Props**：
  - `title` - 页面标题
  - `actions` - 操作按钮配置
- **Events**：`@search(query)` - 搜索事件

#### Content.vue（内容区域）
- **功能**：页面内容容器，处理滚动和布局
- **Slots**：默认插槽 - 页面内容

### 3.2 基础UI组件

#### GlassCard.vue（毛玻璃卡片）
```vue
<template>
  <div class="glass-card" :class="{ hoverable }">
    <slot />
  </div>
</template>

<script setup>
defineProps({
  hoverable: { type: Boolean, default: false }
})
</script>
```

**样式特征**：
- `backdrop-filter: blur(20px)`
- `background: var(--glass-bg)`
- `border: 1px solid var(--glass-border)`
- `box-shadow: var(--glass-shadow)`
- `border-radius: var(--radius)`

#### GlassButton.vue（毛玻璃按钮）
```vue
<template>
  <button 
    class="glass-button" 
    :class="[variant, size]"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: { 
    type: String, 
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'success'].includes(v)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (v) => ['small', 'medium', 'large'].includes(v)
  }
})

defineEmits(['click'])
</script>
```

**变体样式**：
- `primary`：主色调背景，白色文字
- `secondary`：半透明白色背景，深色文字
- `danger`：红色调背景，白色文字
- `success`：绿色调背景，白色文字

#### GlassModal.vue（毛玻璃弹窗）
```vue
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-content" :style="{ width }">
          <div class="modal-header">
            <slot name="header" />
            <button class="modal-close" @click="close">×</button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, required: true },
  width: { type: String, default: '500px' }
})

const emit = defineEmits(['update:modelValue'])

const close = () => emit('update:modelValue', false)
</script>
```

### 3.3 业务组件

#### PlanCard.vue（计划卡片）
- **功能**：显示计划信息、进度条、操作按钮
- **Props**：
  - `plan` - 计划数据对象
  - `showActions` - 是否显示操作按钮
- **Events**：
  - `@edit(plan)` - 编辑计划
  - `@complete(plan)` - 完成计划
  - `@delete(plan)` - 删除计划

#### WishCard.vue（心愿卡片）
- **功能**：显示心愿信息、兑换状态
- **Props**：
  - `wish` - 心愿数据对象
  - `balance` - 当前余额
- **Events**：
  - `@redeem(wish)` - 兑换心愿

#### CheckinItem.vue（打卡项）
- **功能**：显示打卡项目、今日状态
- **Props**：
  - `checkin` - 打卡数据对象
- **Events**：
  - `@toggle(checkin)` - 切换打卡状态

#### FocusTimer.vue（专注计时器）
- **功能**：专注模式计时、进度环显示
- **Props**：
  - `mode` - 模式：'unlimited' | 'countdown'
  - `duration` - 倒计时时长（秒）
  - `state` - 状态：'setup' | 'running' | 'complete'
- **Events**：
  - `@start` - 开始专注
  - `@pause` - 暂停
  - `@complete` - 完成

#### StatsChart.vue（统计图表）
- **功能**：使用Chart.js显示统计数据
- **Props**：
  - `type` - 图表类型：'bar' | 'line' | 'pie'
  - `data` - 图表数据
  - `options` - 图表配置

---

## 4. 状态管理（Pinia）

### 4.1 plans.js

```javascript
import { defineStore } from 'pinia'

export const usePlansStore = defineStore('plans', {
  state: () => ({
    plans: [],
    loading: false,
    currentType: 'today'
  }),
  
  getters: {
    filteredPlans: (state) => {
      return state.plans.filter(p => p.plan_type === state.currentType)
    },
    completedPlans: (state) => {
      return state.plans.filter(p => p.completed)
    }
  },
  
  actions: {
    async fetchPlans() {
      this.loading = true
      try {
        const response = await fetch('/api/plans')
        this.plans = await response.json()
      } finally {
        this.loading = false
      }
    },
    
    async createPlan(plan) {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan)
      })
      const newPlan = await response.json()
      this.plans.push(newPlan)
      return newPlan
    },
    
    async updatePlan(id, updates) {
      const response = await fetch(`/api/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const updated = await response.json()
      const index = this.plans.findIndex(p => p.id === id)
      if (index !== -1) this.plans[index] = updated
      return updated
    },
    
    async deletePlan(id) {
      await fetch(`/api/plans/${id}`, { method: 'DELETE' })
      this.plans = this.plans.filter(p => p.id !== id)
    }
  }
})
```

### 4.2 wishes.js

```javascript
import { defineStore } from 'pinia'

export const useWishesStore = defineStore('wishes', {
  state: () => ({
    wishes: [],
    balance: 0,
    loading: false
  }),
  
  actions: {
    async fetchWishes() {
      this.loading = true
      try {
        const [wishesRes, balanceRes] = await Promise.all([
          fetch('/api/wishes'),
          fetch('/api/balance')
        ])
        this.wishes = await wishesRes.json()
        this.balance = await balanceRes.json()
      } finally {
        this.loading = false
      }
    },
    
    async redeemWish(id) {
      const response = await fetch(`/api/wishes/${id}/redeem`, {
        method: 'POST'
      })
      const result = await response.json()
      if (result.success) {
        this.balance = result.new_balance
        await this.fetchWishes()
      }
      return result
    }
  }
})
```

### 4.3 focus.js

```javascript
import { defineStore } from 'pinia'

export const useFocusStore = defineStore('focus', {
  state: () => ({
    mode: 'unlimited',      // 'unlimited' | 'countdown'
    duration: 0,            // 倒计时总秒数
    state: 'setup',         // 'setup' | 'running' | 'complete'
    startTime: null,
    elapsed: 0,
    sessionId: null,
    task: ''
  }),
  
  getters: {
    remaining: (state) => {
      if (state.mode === 'unlimited') return 0
      return Math.max(0, state.duration - state.elapsed)
    },
    progress: (state) => {
      if (state.mode === 'unlimited') return 0
      return (state.elapsed / state.duration) * 100
    }
  },
  
  actions: {
    start(task) {
      this.task = task
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
      
      await fetch('/api/focus-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: this.elapsed,
          task: this.task
        })
      })
    },
    
    reset() {
      this.state = 'setup'
      this.elapsed = 0
      this.startTime = null
      this.sessionId = null
      this.task = ''
    },
    
    _startTimer() {
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

---

## 5. API层设计

### 5.1 api/index.js

```javascript
const BASE_URL = ''

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`
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
    
    const response = await fetch(url, config)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `HTTP ${response.status}`)
    }
    
    return response.json()
  }
  
  // Plans
  getPlans() { return this.request('/api/plans') }
  createPlan(plan) { return this.request('/api/plans', { method: 'POST', body: plan }) }
  updatePlan(id, plan) { return this.request(`/api/plans/${id}`, { method: 'PUT', body: plan }) }
  deletePlan(id) { return this.request(`/api/plans/${id}`, { method: 'DELETE' }) }
  evaluatePlan(id) { return this.request(`/api/plans/${id}/evaluate`, { method: 'POST' }) }
  
  // Wishes
  getWishes() { return this.request('/api/wishes') }
  createWish(wish) { return this.request('/api/wishes', { method: 'POST', body: wish }) }
  redeemWish(id) { return this.request(`/api/wishes/${id}/redeem`, { method: 'POST' }) }
  
  // Balance
  getBalance() { return this.request('/api/balance') }
  getTransactions() { return this.request('/api/transactions') }
  
  // Checkins
  getCheckins() { return this.request('/api/checkins') }
  createCheckin(checkin) { return this.request('/api/checkins', { method: 'POST', body: checkin }) }
  toggleCheckin(id) { return this.request(`/api/checkins/${id}/toggle`, { method: 'POST' }) }
  
  // Focus
  getFocusSessions() { return this.request('/api/focus-sessions') }
  createFocusSession(session) { return this.request('/api/focus-sessions', { method: 'POST', body: session }) }
  
  // Stats
  getStats() { return this.request('/api/stats') }
  
  // Settings
  getSettings() { return this.request('/api/settings') }
  updateSettings(settings) { return this.request('/api/settings', { method: 'PUT', body: settings }) }
  
  // AI
  testAI() { return this.request('/api/ai/test', { method: 'POST' }) }
  getModels() { return this.request('/api/ai/models') }
  
  // Recycle
  getRecycleBin() { return this.request('/api/recycle') }
  restorePlan(id) { return this.request(`/api/recycle/${id}/restore`, { method: 'POST' }) }
  permanentDelete(id) { return this.request(`/api/recycle/${id}`, { method: 'DELETE' }) }
  
  // Important
  getImportantItems() { return this.request('/api/important') }
  createImportantItem(item) { return this.request('/api/important', { method: 'POST', body: item }) }
  updateImportantItem(id, item) { return this.request(`/api/important/${id}`, { method: 'PUT', body: item }) }
  deleteImportantItem(id) { return this.request(`/api/important/${id}`, { method: 'DELETE' }) }
}

export const api = new ApiClient()
```

---

## 6. 动画系统

### 6.1 CSS变量定义

```css
:root {
  /* 过渡时间 */
  --transition-fast: 150ms;
  --transition-normal: 300ms;
  --transition-slow: 500ms;
  
  /* 缓动函数 */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  
  /* 弹性动画 */
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 6.2 Vue Transition定义

```css
/* 页面切换 */
.page-enter-active,
.page-leave-active {
  transition: all var(--transition-normal) var(--ease-default);
}

.page-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all var(--transition-normal) var(--ease-default);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: translateY(20px);
}

/* 列表项 */
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

/* 淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-fast) var(--ease-default);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 缩放 */
.scale-enter-active,
.scale-leave-active {
  transition: all var(--transition-fast) var(--ease-default);
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
```

### 6.3 动画性能优化

```css
/* GPU加速 */
.animate-gpu {
  will-change: transform, opacity;
  transform: translateZ(0);
}

/* 避免重排 */
.animate-layout-safe {
  will-change: transform;
  position: absolute;
}
```

---

## 7. 主题系统

### 7.1 CSS变量定义

```css
:root {
  /* 主色调 */
  --primary: #7c6ef0;
  --primary-light: rgba(124, 110, 240, 0.15);
  --primary-glow: rgba(124, 110, 240, 0.3);
  
  /* 强调色 */
  --accent: #6ee7b7;
  --accent-glow: rgba(110, 231, 183, 0.3);
  
  /* 状态色 */
  --success: #34d399;
  --warning: #fbbf24;
  --danger: #f87171;
  
  /* 玻璃效果 */
  --glass-bg: rgba(255, 255, 255, 0.45);
  --glass-border: rgba(255, 255, 255, 0.55);
  --glass-shadow: 0 8px 32px rgba(100, 80, 200, 0.08);
  --glass-blur: 20px;
  
  /* 侧边栏 */
  --sidebar-glass: rgba(255, 255, 255, 0.25);
  --sidebar-border: rgba(255, 255, 255, 0.3);
  
  /* 背景 */
  --bg: #f0eef8;
  
  /* 文字 */
  --text: #2d2655;
  --text-soft: #7a7494;
  --text-muted: #a8a3bf;
  
  /* 圆角 */
  --radius: 16px;
  --radius-sm: 10px;
  --radius-lg: 24px;
  
  /* 过渡 */
  --transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 深色主题 */
body.theme-dark {
  --glass-bg: rgba(0, 0, 0, 0.35);
  --glass-border: rgba(255, 255, 255, 0.15);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  --sidebar-glass: rgba(0, 0, 0, 0.3);
  --sidebar-border: rgba(255, 255, 255, 0.1);
  --text: #e8e4f0;
  --text-soft: #b8b0cc;
  --text-muted: #8a82a0;
}
```

### 7.2 主题管理组合式函数

```javascript
// composables/useTheme.js
import { ref, watch } from 'vue'

const theme = ref(localStorage.getItem('theme') || 'light')

export function useTheme() {
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', theme.value)
    applyTheme()
  }
  
  const applyTheme = () => {
    document.body.classList.toggle('theme-dark', theme.value === 'dark')
  }
  
  // 初始化
  applyTheme()
  
  // 监听系统主题变化
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        theme.value = e.matches ? 'dark' : 'light'
        applyTheme()
      }
    })
  }
  
  return {
    theme,
    toggleTheme
  }
}
```

---

## 8. 迁移策略

### 8.1 渐进式迁移计划

**阶段一：项目搭建（1-2天）**
- 初始化Vue项目
- 配置Vite构建
- 搭建基础目录结构
- 配置ESLint和Prettier

**阶段二：布局迁移（2-3天）**
- 迁移Sidebar组件
- 迁移Header组件
- 迁移Content容器
- 实现路由系统

**阶段三：基础组件（3-4天）**
- 实现GlassCard
- 实现GlassButton
- 实现GlassModal
- 实现GlassInput
- 实现GlassToast

**阶段四：业务组件（5-7天）**
- 迁移PlanCard
- 迁移WishCard
- 迁移CheckinItem
- 迁移FocusTimer
- 迁移StatsChart

**阶段五：页面视图（7-10天）**
- 迁移TodayView
- 迁移WeeklyView
- 迁移MonthlyView
- 迁移YearlyView
- 迁移StatsView
- 迁移FocusView
- 迁移WishesView
- 迁移其他页面

**阶段六：状态管理（3-4天）**
- 实现plans store
- 实现wishes store
- 实现checkins store
- 实现focus store
- 实现其他stores

**阶段七：API层（2-3天）**
- 实现API客户端
- 对接所有后端接口
- 错误处理和重试

**阶段八：动画优化（3-4天）**
- 实现页面切换动画
- 实现列表动画
- 实现弹窗动画
- 性能优化

**阶段九：测试和调试（3-5天）**
- 功能测试
- 性能测试
- 跨平台测试
- Bug修复

**总预计时间：30-42天**

### 8.2 并行迁移策略

为减少迁移风险，采用并行迁移策略：

1. **保持旧版本运行**：迁移期间，旧版本继续作为生产版本
2. **新版本开发**：Vue版本在独立分支开发
3. **功能对等验证**：每个功能迁移后，与旧版本对比验证
4. **逐步切换**：完成一个模块，切换一个模块
5. **回滚机制**：保留旧代码，必要时可快速回滚

### 8.3 数据兼容性

- **API不变**：后端API保持完全兼容，前端只是调用方式变化
- **本地存储**：如果使用localStorage，保持相同的key和数据格式
- **数据库**：无需任何数据库变更

---

## 9. CI/CD集成

### 9.1 构建流程

```yaml
# .github/workflows/build.yml（修改部分）
- name: Build Frontend
  run: |
    cd frontend
    npm install
    npm run build
    cp -r dist/* ../static/
  
- name: Build Desktop App
  run: |
    pyinstaller PlanMaster.spec
```

### 9.2 Vite配置

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../static',
    emptyOutDir: false,  // 不清空static目录，保留其他静态资源
    rollupOptions: {
      output: {
        // 分割代码
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          charts: ['chart.js']
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080'  // 开发时代理到Flask
    }
  }
})
```

### 9.3 package.json

```json
{
  "name": "planmaster-frontend",
  "version": "1.0.0",
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

---

## 10. 性能优化

### 10.1 代码分割

- **路由懒加载**：每个页面组件动态导入
- **组件异步加载**：大型组件（如图表）按需加载
- **第三方库分离**：chart.js等单独chunk

```javascript
// 路由懒加载示例
const routes = [
  { path: '/', component: () => import('./views/TodayView.vue') },
  { path: '/weekly', component: () => import('./views/WeeklyView.vue') },
  // ...
]
```

### 10.2 渲染优化

- **虚拟滚动**：长列表使用虚拟DOM（如回收站、流水列表）
- **防抖搜索**：输入延迟300ms触发搜索
- **缓存策略**：API响应缓存5分钟

### 10.3 动画性能

- **GPU加速**：使用transform和opacity，避免重排
- **will-change提示**：提前告知浏览器哪些属性会变化
- **requestAnimationFrame**：确保动画60fps

### 10.4 资源优化

- **图片懒加载**：非首屏图片延迟加载
- **字体优化**：使用font-display: swap
- **预加载关键资源**：使用<link rel="preload">

---

## 11. 测试策略

### 11.1 单元测试

- **组件测试**：使用Vitest + Vue Test Utils
- **Store测试**：测试Pinia actions和getters
- **工具函数测试**：测试format、validators等

### 11.2 集成测试

- **页面测试**：测试完整页面功能
- **API测试**：测试API调用和错误处理
- **路由测试**：测试页面切换和导航

### 11.3 E2E测试

- **关键流程测试**：创建计划、完成计划、兑换心愿
- **跨平台测试**：macOS和Windows分别测试

---

## 12. 风险和缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 迁移期间功能缺失 | 高 | 并行迁移，逐个功能验证 |
| 性能下降 | 中 | 性能测试，优化关键路径 |
| 学习曲线 | 低 | Vue学习成本低，文档完善 |
| 构建问题 | 中 | CI/CD自动化测试 |
| 样式不一致 | 中 | 统一组件库，设计规范 |

---

## 13. 成功标准

- [ ] 所有现有功能完整迁移
- [ ] UI视觉效果提升，Glassmorphism风格更精致
- [ ] 动画流畅度达到60fps
- [ ] 页面加载时间不超过2秒
- [ ] macOS和Windows表现一致
- [ ] CI/CD构建稳定，无平台特定问题
- [ ] 代码可维护性显著提升

---

## 14. 待确认事项

1. **TypeScript**：是否需要引入TypeScript？
2. **单元测试**：测试覆盖率目标是多少？
3. **国际化**：是否需要支持多语言？
4. **PWA**：是否需要支持离线访问？

---

## 附录

### A. 参考资源

- [Vue 3文档](https://vuejs.org/)
- [Vite文档](https://vitejs.dev/)
- [Pinia文档](https://pinia.vuejs.org/)
- [Vue Router文档](https://router.vuejs.org/)
- [Chart.js文档](https://www.chartjs.org/)

### B. 术语表

- **Glassmorphism**：玻璃拟态设计风格
- **Composition API**：Vue 3的组合式API
- **Pinia**：Vue的状态管理库
- **Vite**：下一代前端构建工具

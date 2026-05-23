<template>
  <div
    ref="cardRef"
    class="plan-card"
    :class="[
      { completed: plan.completed || mode === 'recycle' },
      `mode-${mode}`,
      { selected: selected }
    ]"
    :data-id="plan.id"
    @mousedown="onPress"
    @mouseup="onRelease"
    @mouseleave="onRelease"
  >
    <!-- 复选框 (仅在 recycle 模式下显示) -->
    <div v-if="mode === 'recycle'" class="card-checkbox-wrap" @click.stop>
      <input 
        type="checkbox" 
        :checked="selected" 
        @change="$emit('select', plan.id)"
        class="card-checkbox"
      >
    </div>

    <!-- 优先级圆形徽章 -->
    <div v-if="mode !== 'recycle'" class="priority-ring">
      <svg width="54" height="54" viewBox="0 0 54 54">
        <circle class="ring-bg" cx="27" cy="27" r="24" />
        <circle
          class="ring-fill"
          cx="27"
          cy="27"
          r="24"
          :stroke="ringColor"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="ringOffset"
        />
      </svg>
      <div
        class="priority-circle"
        :class="{ 'priority-none': !hasPriority }"
        :style="circleBg"
      >
        {{ hasPriority ? plan.priority : '-' }}
      </div>
    </div>

    <div class="plan-card-body">
      <!-- 标题和日期标签 -->
      <div class="plan-card-title">
        {{ plan.title }}
        <span v-if="dateLabel" class="plan-date-label">{{ dateLabel }}</span>
        <span v-if="plan.due_date" class="plan-date-label due">{{ plan.due_date }}</span>
      </div>

      <!-- 元信息 -->
      <div class="plan-card-meta">
        <span
          v-if="plan.plan_type"
          class="plan-type-tag"
          :style="{ background: typeColor }"
        >
          {{ typeLabel }}
        </span>

        <!-- 截止日期剩余天数 -->
        <span v-if="dueDaysText" class="plan-badge" :class="dueBadgeClass">
          {{ dueDaysText }}
        </span>

        <!-- 建议时间 -->
        <span v-if="plan.suggested_time && mode !== 'recycle'" class="plan-badge badge-time">
          &#128336; {{ plan.suggested_time }}
        </span>

        <!-- 计时器按钮 -->
        <button
          v-if="plan.suggested_time && mode !== 'recycle'"
          class="btn timer-btn btn-sm"
          :class="{ counting: timerRemaining !== null }"
          @click.stop="$emit('toggleTimer', plan.id, plan.suggested_time)"
        >
          {{ timerRemaining !== null ? fmtCountdown(timerRemaining) : '开始' }}
        </button>

        <!-- 专注按钮 -->
        <button
          v-if="plan.plan_type !== 'important' && mode !== 'recycle'"
          class="btn focus-btn btn-sm"
          :class="{ focusing: isFocusing }"
          @click.stop="$emit('toggleFocus', plan)"
        >
          {{ isFocusing ? '&#9632; 停止' : '&#9654; 专注' }}
        </button>

        <!-- 虚拟价值 -->
        <span v-if="plan.virtual_value > 0" class="plan-badge badge-value">
          {{ plan.virtual_value }} 价值
        </span>
      </div>

      <!-- 描述 -->
      <div v-if="plan.description" class="plan-card-desc">
        {{ plan.description }}
      </div>

      <!-- 完成时间 (针对回收站模式) -->
      <div v-if="mode === 'recycle' && plan.completed_at" class="recycle-info">
        完成于 {{ fmtLocalTime(plan.completed_at) }}
      </div>

      <!-- AI理由 -->
      <div v-if="plan.ai_reason" class="plan-card-reason">
        AI: {{ plan.ai_reason }}
      </div>

      <!-- 进度条 (非 Recycle 模式) -->
      <div v-if="mode !== 'recycle'" class="plan-progress">
        <div class="plan-progress-track">
          <div class="plan-progress-bar" :style="{ width: `${currentProgress}%` }" />
          <input
            type="range"
            class="plan-progress-input"
            min="0"
            max="100"
            step="5"
            :value="currentProgress"
            @input="onProgressInput"
            @change="onProgressChange"
          />
        </div>
        <span class="plan-progress-text">{{ currentProgress }}%</span>
      </div>

      <!-- 操作按钮 -->
      <div class="plan-card-actions">
        <template v-if="mode === 'recycle'">
          <button class="btn btn-glass btn-sm" @click.stop="$emit('restore', plan)">恢复</button>
          <button class="btn btn-danger btn-sm" @click.stop="$emit('deletePermanent', plan)">永久删除</button>
        </template>
        <template v-else>
          <button
            v-if="!plan.completed"
            class="btn btn-success btn-sm"
            @click.stop="$emit('complete', plan)"
          >
            &#10003; 完成
          </button>
          <button class="btn btn-glass btn-sm" @click.stop="$emit('edit', plan)">编辑</button>
          <button class="btn btn-danger btn-sm" @click.stop="$emit('delete', plan)">删除</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'

const props = defineProps({
  plan: { type: Object, required: true },
  isFocusing: { type: Boolean, default: false },
  timerRemaining: { type: Number, default: null },
  mode: { type: String, default: 'default' }, // 'default' | 'recycle'
  selected: { type: Boolean, default: false }
})

const emit = defineEmits([
  'complete', 'edit', 'delete', 'toggleTimer', 'toggleFocus', 
  'updateProgress', 'restore', 'deletePermanent', 'select'
])

const PLAN_TYPE_LABELS = {
  important: '重要事项',
  today: '今日待办',
  weekly: '周计划',
  monthly: '月计划',
  yearly: '年计划'
}

const PLAN_TYPE_COLORS = {
  important: '#ef4444',
  today: '#7c6ef0',
  weekly: '#3b82f6',
  monthly: '#10b981',
  yearly: '#f59e0b'
}

const circumference = 2 * Math.PI * 24
const hasPriority = computed(() => props.plan.priority > 0)
const currentProgress = ref(props.plan.progress || 0)

watch(() => props.plan.progress, (newVal) => {
  currentProgress.value = newVal || 0
})

const priColor = (p) => {
  if (!p || p <= 0) return null
  p = Math.min(100, Math.max(1, p))
  const h = 120 - (p / 100) * 120
  return `hsl(${h}, 72%, 52%)`
}

const priColorLight = (p) => {
  if (!p || p <= 0) return null
  p = Math.min(100, Math.max(1, p))
  const h = 120 - (p / 100) * 120
  return `hsl(${h}, 72%, 92%)`
}

const ringColor = computed(() => priColor(props.plan.priority) || 'rgba(168,163,191,0.4)')
const ringOffset = computed(() => circumference - (currentProgress.value / 100) * circumference)

const circleBg = computed(() => {
  if (!hasPriority.value) return {}
  const color = priColor(props.plan.priority)
  const colorLight = priColorLight(props.plan.priority)
  return { background: `radial-gradient(circle, ${colorLight} 0%, ${color} 100%)` }
})

const typeLabel = computed(() => PLAN_TYPE_LABELS[props.plan.plan_type] || props.plan.plan_type)
const typeColor = computed(() => PLAN_TYPE_COLORS[props.plan.plan_type] || '#7c6ef0')

const dueDaysText = computed(() => {
  if (!props.plan.due_date) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(props.plan.due_date + 'T00:00:00')
  const diff = Math.ceil((due - today) / 86400000)
  if (diff < 0) return '已过期'
  if (diff === 0) return '今日到期'
  return `还剩 ${diff} 天`
})

const dueBadgeClass = computed(() => {
  if (!props.plan.due_date) return ''
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(props.plan.due_date + 'T00:00:00')
  const diff = Math.ceil((due - today) / 86400000)
  if (diff <= 0) return 'badge-due-danger'
  if (diff <= 3) return 'badge-due-warning'
  return 'badge-due-info'
})

const dateLabel = computed(() => {
  const d = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const type = props.plan.plan_type
  if (type === 'today') return (d.getMonth() + 1) + '月' + d.getDate() + '日'
  if (type === 'weekly') return weekdays[d.getDay()]
  if (type === 'monthly') return (d.getMonth() + 1) + '月'
  if (type === 'yearly') return d.getFullYear() + '年'
  return ''
})

const fmtLocalTime = (ts) => {
  return ts ? new Date(ts).toLocaleString('zh-CN', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit' 
  }) : ''
}

const fmtCountdown = (s) => {
  if (s === null || s === undefined) return ''
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

const onProgressInput = (e) => {
  currentProgress.value = parseInt(e.target.value)
}

const onProgressChange = (e) => {
  emit('updateProgress', props.plan.id, parseInt(e.target.value))
}

/**
 * iOS-Style Animations & Interactions
 */
const cardRef = ref(null)

const onPress = () => {
  gsap.to(cardRef.value, {
    scale: 0.97,
    duration: 0.4,
    ease: 'expo.out'
  })
}

const onRelease = () => {
  gsap.to(cardRef.value, {
    scale: 1,
    duration: 0.35,
    ease: 'power3.out',
    onComplete: () => {
      gsap.set(cardRef.value, { clearProps: 'transform' })
    }
  })
}

const onHoverEnter = () => {
  gsap.to(cardRef.value, {
    y: -6,
    scale: 1.02,
    boxShadow: '0 20px 40px rgba(100, 80, 200, 0.15)',
    duration: 0.5,
    ease: 'expo.out'
  })
}

const onHoverLeave = () => {
  gsap.to(cardRef.value, {
    y: 0,
    scale: 1,
    boxShadow: '0 8px 32px rgba(100, 80, 200, 0.08)',
    duration: 0.4,
    ease: 'power3.out',
    onComplete: () => {
      gsap.set(cardRef.value, { clearProps: 'transform,boxShadow' })
    }
  })
}

onMounted(() => {
  if (!cardRef.value) return
  cardRef.value.addEventListener('mouseenter', onHoverEnter)
  cardRef.value.addEventListener('mouseleave', onHoverLeave)
})

onUnmounted(() => {
  if (!cardRef.value) return
  cardRef.value.removeEventListener('mouseenter', onHoverEnter)
  cardRef.value.removeEventListener('mouseleave', onHoverLeave)
})
</script>

<style scoped>
.plan-card {
  position: relative;
  display: flex;
  gap: 1.25rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  box-shadow: 0 8px 32px rgba(100, 80, 200, 0.08);
  cursor: pointer;
  z-index: 1;
  will-change: transform, box-shadow;
  /* Removed transform transition to prevent conflict with GSAP */
  transition: box-shadow 0.4s ease, opacity 0.4s ease;
}

.plan-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
}

.plan-card:hover {
  box-shadow: 0 20px 40px rgba(100, 80, 200, 0.15);
}

.plan-card.selected::before {
  border-color: var(--primary);
  background: rgba(124, 110, 240, 0.1);
}

.plan-card.completed { opacity: 0.6; }
.plan-card.completed .plan-card-title { text-decoration: line-through; color: var(--text-muted); }

/* Recycle Mode Styles */
.card-checkbox-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 0.5rem;
}

.card-checkbox {
  width: 22px;
  height: 22px;
  cursor: pointer;
  accent-color: var(--primary);
}

.recycle-info {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
  font-weight: 500;
}

/* 优先级圆形徽章 */
.priority-ring {
  position: relative;
  width: 54px;
  height: 54px;
  flex-shrink: 0;
}

.priority-ring svg {
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: rgba(168, 163, 191, 0.15);
  stroke-width: 3.5;
}

.ring-fill {
  fill: none;
  stroke-width: 3.5;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.priority-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.priority-circle.priority-none {
  background: rgba(168, 163, 191, 0.2);
  color: var(--text-muted);
  box-shadow: none;
}

/* 计划卡片内容 */
.plan-card-body {
  flex: 1;
  min-width: 0;
}

.plan-card-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.plan-date-label {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 6px;
  font-weight: 600;
}

.plan-date-label.due {
  background: rgba(168, 163, 191, 0.1);
  color: var(--text-soft);
  border: 1px solid rgba(168, 163, 191, 0.2);
}

.badge-due-danger { background: rgba(248, 113, 113, 0.15); color: var(--danger); border: 1px solid var(--danger); }
.badge-due-warning { background: rgba(251, 191, 36, 0.15); color: var(--warning); border: 1px solid var(--warning); }
.badge-due-info { background: rgba(124, 110, 240, 0.15); color: var(--primary); border: 1px solid var(--primary); }

.plan-card-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.plan-type-tag {
  font-size: 0.7rem;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  color: white;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.plan-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-weight: 500;
}

.badge-time {
  background: rgba(124, 110, 240, 0.08);
  color: var(--primary);
}

.badge-value {
  background: rgba(52, 211, 153, 0.08);
  color: var(--success);
}

.plan-card-desc {
  font-size: 0.95rem;
  color: var(--text-soft);
  margin-bottom: 1rem;
  line-height: 1.6;
}

.plan-card-reason {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  background: rgba(168, 163, 191, 0.05);
  border-left: 3px solid var(--text-muted);
  border-radius: 0 6px 6px 0;
}

/* 进度条 */
.plan-progress {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.plan-progress-track {
  flex: 1;
  height: 10px;
  background: rgba(124, 110, 240, 0.06);
  border-radius: 5px;
  overflow: hidden;
  position: relative;
}

.plan-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), #a78bfa);
  border-radius: 5px;
  transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.plan-progress-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.plan-progress-text {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary);
  min-width: 45px;
}

/* 操作按钮 */
.plan-card-actions {
  display: flex;
  gap: 0.75rem;
  opacity: 0.4;
  transition: opacity 0.3s ease;
}

.plan-card:hover .plan-card-actions {
  opacity: 1;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn:active {
  transform: scale(0.92);
}

.btn-success {
  background: var(--success);
  color: white;
  box-shadow: 0 4px 12px rgba(52, 211, 153, 0.2);
}

.btn-glass {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text);
  border: 1px solid var(--glass-border);
}

.btn-danger {
  background: rgba(248, 113, 113, 0.1);
  color: var(--danger);
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.btn-danger:hover {
  background: var(--danger);
  color: white;
}

.timer-btn {
  background: rgba(168, 163, 191, 0.1);
  color: var(--text-soft);
  border: 1px solid rgba(168, 163, 191, 0.2);
}

.timer-btn.counting {
  background: var(--warning);
  color: white;
  border-color: var(--warning);
  animation: timer-pulse 2s infinite;
}

@keyframes timer-pulse {
  0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
  100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
}

.focus-btn {
  background: var(--primary-light);
  color: var(--primary);
  border: 1px solid var(--primary);
}

.focus-btn.focusing {
  background: var(--danger);
  color: white;
  border-color: var(--danger);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.4); }
  70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(248, 113, 113, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(248, 113, 113, 0); }
}
</style>

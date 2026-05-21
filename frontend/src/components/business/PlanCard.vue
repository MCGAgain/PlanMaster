<template>
  <div
    class="plan-card"
    :class="{ completed: plan.completed }"
    :data-id="plan.id"
  >
    <!-- 优先级圆形徽章 -->
    <div class="priority-ring">
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
      </div>

      <!-- 元信息 -->
      <div class="plan-card-meta">
        <span
          class="plan-type-tag"
          :style="{ background: typeColor }"
        >
          {{ typeLabel }}
        </span>

        <!-- 建议时间 -->
        <span v-if="plan.suggested_time" class="plan-badge badge-time">
          &#128336; {{ plan.suggested_time }}
        </span>

        <!-- 倒计时器按钮 -->
        <button
          v-if="plan.suggested_time"
          class="btn timer-btn"
          :class="{ counting: isTimerRunning }"
          @click="$emit('toggleTimer', plan)"
        >
          {{ timerText }}
        </button>

        <!-- 专注按钮 -->
        <button
          class="btn focus-btn btn-sm"
          :class="{ focusing: isFocusing }"
          @click="$emit('toggleFocus', plan)"
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

      <!-- AI理由 -->
      <div v-if="plan.ai_reason" class="plan-card-reason">
        AI: {{ plan.ai_reason }}
      </div>

      <!-- 进度条 -->
      <div class="plan-progress">
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
        <button
          v-if="!plan.completed"
          class="btn btn-success btn-sm"
          @click="$emit('complete', plan)"
        >
          &#10003; 完成
        </button>
        <button class="btn btn-glass btn-sm" @click="$emit('edit', plan)">
          编辑
        </button>
        <button class="btn btn-danger btn-sm" @click="$emit('delete', plan)">
          删除
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'

const props = defineProps({
  plan: {
    type: Object,
    required: true
  },
  isFocusing: {
    type: Boolean,
    default: false
  },
  focusElapsed: {
    type: Number,
    default: 0
  },
  timerRemaining: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['complete', 'edit', 'delete', 'toggleTimer', 'toggleFocus', 'updateProgress'])

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

const ringOffset = computed(() => {
  const prog = currentProgress.value
  return circumference - (prog / 100) * circumference
})

const circleBg = computed(() => {
  if (!hasPriority.value) return {}
  const color = priColor(props.plan.priority)
  const colorLight = priColorLight(props.plan.priority)
  return {
    background: `radial-gradient(circle, ${colorLight} 0%, ${color} 100%)`
  }
})

const typeLabel = computed(() => PLAN_TYPE_LABELS[props.plan.plan_type] || props.plan.plan_type)
const typeColor = computed(() => PLAN_TYPE_COLORS[props.plan.plan_type] || '#7c6ef0')

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

const isTimerRunning = computed(() => props.timerRemaining !== null)

const timerText = computed(() => {
  if (props.timerRemaining !== null) {
    const m = Math.floor(props.timerRemaining / 60)
    const sec = Math.floor(props.timerRemaining % 60)
    return m + ':' + String(sec).padStart(2, '0')
  }
  return '开始'
})

const fmtHMS = (totalSec) => {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
}

const onProgressInput = (e) => {
  currentProgress.value = parseInt(e.target.value)
}

const onProgressChange = (e) => {
  const val = parseInt(e.target.value)
  emit('updateProgress', props.plan.id, val)
}

// GSAP hover effects
const cardRef = ref(null)

onMounted(() => {
  // Find the card element
  const card = document.querySelector(`[data-id="${props.plan.id}"]`)
  if (!card) return

  cardRef.value = card

  // Ensure backdrop-filter blur is applied from frame 1 (not animated)
  card.style.backdropFilter = 'blur(20px)'
  card.style.webkitBackdropFilter = 'blur(20px)'

  // Entrance animation
  gsap.from(card, {
    opacity: 0,
    y: 20,
    scale: 0.95,
    duration: 0.4,
    ease: 'power2.out'
  })

  // Hover effects
  card.addEventListener('mouseenter', () => {
    gsap.to(card, {
      y: -3,
      boxShadow: '0 16px 48px rgba(100,80,200,.14)',
      duration: 0.2,
      ease: 'power2.out'
    })
  })

  card.addEventListener('mouseleave', () => {
    gsap.to(card, {
      y: 0,
      boxShadow: '0 8px 32px rgba(100,80,200,.08)',
      duration: 0.2,
      ease: 'power2.out'
    })
  })
})
</script>

<style scoped>
.plan-card {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  transition: transform var(--transition-normal) var(--ease-default), box-shadow var(--transition-normal) var(--ease-default);
  will-change: transform, box-shadow;
}

.plan-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(100, 80, 200, 0.12);
}

.plan-card.completed {
  opacity: 0.7;
}

.plan-card.completed .plan-card-title {
  text-decoration: line-through;
  color: var(--text-muted);
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
  stroke: rgba(168, 163, 191, 0.2);
  stroke-width: 3;
}

.ring-fill {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.3s ease;
}

.priority-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 54px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: white;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: inset 0 2px 8px rgba(255, 255, 255, 0.3);
}

.priority-circle.priority-none {
  background: rgba(168, 163, 191, 0.3);
  color: var(--text-muted);
}

/* 计划卡片内容 */
.plan-card-body {
  flex: 1;
  min-width: 0;
}

.plan-card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.plan-date-label {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 4px;
  font-weight: 500;
}

.plan-card-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.plan-type-tag {
  font-size: 0.7rem;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  color: white;
  font-weight: 500;
}

.plan-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.badge-time {
  background: rgba(124, 110, 240, 0.1);
  color: var(--primary);
}

.badge-value {
  background: rgba(52, 211, 153, 0.1);
  color: var(--success);
}

.plan-card-desc {
  font-size: 0.9rem;
  color: var(--text-soft);
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.plan-card-reason {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
  font-style: italic;
}

/* 进度条 */
.plan-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.plan-progress-track {
  flex: 1;
  height: 8px;
  background: rgba(124, 110, 240, 0.1);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.plan-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), #a78bfa);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.plan-progress-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}

.plan-progress-text {
  font-size: 0.8rem;
  color: var(--text-soft);
  min-width: 35px;
  text-align: right;
}

/* 操作按钮 */
.plan-card-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

.btn-success {
  background: rgba(52, 211, 153, 0.15);
  color: var(--success);
  border: 1px solid var(--success);
}

.btn-success:hover {
  background: var(--success);
  color: white;
}

.btn-glass {
  background: var(--glass-bg);
  color: var(--text);
  border: 1px solid var(--glass-border);
}

.btn-glass:hover {
  background: var(--glass-border);
}

.btn-danger {
  background: rgba(248, 113, 113, 0.15);
  color: var(--danger);
  border: 1px solid var(--danger);
}

.btn-danger:hover {
  background: var(--danger);
  color: white;
}

.timer-btn {
  background: var(--primary-light);
  color: var(--primary);
  border: 1px solid var(--primary);
  font-variant-numeric: tabular-nums;
}

.timer-btn:hover {
  background: var(--primary);
  color: white;
}

.timer-btn.counting {
  background: var(--primary);
  color: white;
  animation: pulse 2s infinite;
}

.focus-btn {
  background: rgba(124, 110, 240, 0.1);
  color: var(--primary);
  border: 1px solid rgba(124, 110, 240, 0.3);
}

.focus-btn:hover {
  background: var(--primary);
  color: white;
}

.focus-btn.focusing {
  background: var(--danger);
  color: white;
  border-color: var(--danger);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>

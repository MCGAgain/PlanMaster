<template>
  <div class="focus-timer">
    <!-- Setup State -->
    <div v-show="phase === 'setup'" class="focus-setup glass-card">
      <div class="form-group">
        <label>任务名称</label>
        <input
          ref="taskInputRef"
          v-model="task"
          type="text"
          class="focus-task-input"
          placeholder="输入你要专注的任务，如：高数作业"
          @keyup.enter="start"
        />
      </div>

      <div class="focus-mode-select">
        <button
          class="focus-mode-btn"
          :class="{ active: currentMode === 'unlimited' }"
          @click="selectMode('unlimited')"
        >
          不限时
        </button>
        <button
          class="focus-mode-btn"
          :class="{ active: currentMode === 'countdown' }"
          @click="selectMode('countdown')"
        >
          倒计时
        </button>
      </div>

      <div v-show="currentMode === 'countdown'" class="focus-duration-input">
        <label>时长</label>
        <div class="duration-row">
          <input
            ref="hoursInputRef"
            v-model.number="durationHours"
            type="number"
            min="0"
            max="12"
            placeholder="0"
          />
          <span>小时</span>
          <input
            ref="minutesInputRef"
            v-model.number="durationMinutes"
            type="number"
            min="0"
            max="59"
            placeholder="30"
          />
          <span>分钟</span>
        </div>
      </div>

      <button class="btn btn-gradient focus-start-btn" @click="start">
        &#9654; 开始专注
      </button>
    </div>

    <!-- Running State -->
    <div v-show="phase === 'running'" class="focus-timer-area">
      <div class="focus-task-label">{{ task }}</div>
      <div class="focus-timer-ring">
        <svg viewBox="0 0 280 280">
          <defs>
            <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#7c6ef0" />
              <stop offset="100%" style="stop-color:#a78bfa" />
            </linearGradient>
          </defs>
          <circle class="focus-ring-bg" cx="140" cy="140" r="120" />
          <circle
            class="focus-ring-fill"
            cx="140"
            cy="140"
            r="120"
            :stroke-dasharray="FOCUS_RING_CIRCUMFERENCE"
            :stroke-dashoffset="ringOffset"
          />
        </svg>
        <div class="focus-timer-display">{{ displayTime }}</div>
      </div>
      <div class="focus-timer-info">
        <span id="focusModeLabel">{{ modeLabel }}</span>
      </div>
      <div class="focus-actions">
        <button class="btn btn-danger focus-stop-btn" @click="stop">
          &#9632; 结束专注
        </button>
        <button class="btn btn-glass focus-cancel-btn" @click="cancel">
          取消
        </button>
      </div>
    </div>

    <!-- Complete State -->
    <div v-show="phase === 'complete'" class="focus-complete">
      <div class="focus-complete-icon">&#10003;</div>
      <div class="focus-complete-title">{{ completeTitle }}</div>
      <div class="focus-complete-duration">{{ completeDuration }}</div>
      <div class="focus-complete-category">任务: {{ task }}</div>
      <button class="btn btn-gradient" @click="reset">
        继续专注
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useFocusStore } from '@/stores/focus'
import api from '@/api'

const focusStore = useFocusStore()

const FOCUS_RING_CIRCUMFERENCE = 2 * Math.PI * 120

const props = defineProps({
  phase: {
    type: String,
    default: 'setup'
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

const emit = defineEmits(['start', 'stop', 'cancel', 'reset', 'mode-change'])

const currentMode = ref(props.mode)
const durationHours = ref(0)
const durationMinutes = ref(30)
const task = ref('')
const taskInputRef = ref(null)
const hoursInputRef = ref(null)
const minutesInputRef = ref(null)

// 同步mode prop
watch(() => props.mode, (newMode) => {
  currentMode.value = newMode
})

const fmtHMS = (totalSec) => {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
}

const ringOffset = computed(() => {
  if (currentMode.value === 'unlimited') {
    const segProgress = (props.elapsed % 3600) / 3600
    return FOCUS_RING_CIRCUMFERENCE * (1 - segProgress)
  } else {
    if (props.duration === 0) return FOCUS_RING_CIRCUMFERENCE
    const progress = props.elapsed / props.duration
    return FOCUS_RING_CIRCUMFERENCE * (1 - Math.min(progress, 1))
  }
})

const displayTime = computed(() => {
  if (currentMode.value === 'countdown') {
    return fmtHMS(Math.max(0, props.duration - props.elapsed))
  }
  return fmtHMS(props.elapsed)
})

const modeLabel = computed(() => {
  if (currentMode.value === 'countdown') {
    return '倒计时 ' + fmtHMS(props.duration)
  }
  return '不限时专注中'
})

const completeTitle = computed(() => {
  if (currentMode.value === 'countdown' && props.elapsed >= props.duration) {
    return '倒计时结束'
  }
  return '专注完成'
})

const completeDuration = computed(() => fmtHMS(props.elapsed))

const selectMode = (mode) => {
  currentMode.value = mode
  emit('mode-change', mode)
}

const start = () => {
  if (!task.value.trim()) {
    alert('请输入任务名称')
    return
  }

  let totalSec = 0
  if (currentMode.value === 'countdown') {
    const h = parseInt(durationHours.value) || 0
    const m = parseInt(durationMinutes.value) || 0
    totalSec = h * 3600 + m * 60
    if (totalSec <= 0) {
      alert('请设置倒计时时长')
      return
    }
  }

  emit('start', {
    mode: currentMode.value,
    duration: totalSec,
    task: task.value
  })
}

const stop = () => emit('stop')
const cancel = () => {
  task.value = ''
  emit('cancel')
}

const reset = () => {
  task.value = ''
  emit('reset')
}

// 暴露方法供父组件调用
defineExpose({
  setTask: (t) => { task.value = t },
  getTask: () => task.value
})
</script>

<style scoped>
.focus-timer {
  max-width: 420px;
  margin: 0 auto;
}

.focus-setup {
  text-align: center;
}

.form-group {
  margin-bottom: 18px;
  text-align: left;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text-soft);
}

.focus-task-input {
  width: 100%;
  padding: 11px 16px;
  border: 1px solid rgba(255,255,255,.4);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-family: inherit;
  background: rgba(255,255,255,.35);
  backdrop-filter: blur(8px);
  color: var(--text);
  transition: var(--transition);
}

.focus-task-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow);
  background: rgba(255,255,255,.5);
}

.focus-mode-select {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin: 20px 0;
}

.focus-mode-btn {
  padding: 10px 28px;
  border: 1px solid rgba(255,255,255,.4);
  border-radius: var(--radius-sm);
  background: rgba(255,255,255,.2);
  backdrop-filter: blur(8px);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-soft);
  transition: var(--transition);
}

.focus-mode-btn:hover {
  background: rgba(124,110,240,.1);
  color: var(--primary);
}

.focus-mode-btn.active {
  background: linear-gradient(135deg, var(--primary), #a78bfa);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 16px var(--primary-glow);
}

.focus-duration-input {
  margin-bottom: 20px;
}

.focus-duration-input label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-soft);
}

.duration-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.duration-row input {
  width: 64px;
  padding: 8px 10px;
  border: 1px solid rgba(255,255,255,.4);
  border-radius: 8px;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  background: rgba(255,255,255,.3);
  color: var(--text);
}

.duration-row input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow);
}

.duration-row span {
  font-size: 14px;
  color: var(--text-soft);
}

.focus-start-btn {
  margin-top: 12px;
  padding: 14px 48px;
  font-size: 16px;
  border-radius: var(--radius);
}

/* Timer Area */
.focus-timer-area {
  text-align: center;
  padding: 40px 0;
}

.focus-task-label {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 32px;
  background: linear-gradient(135deg, var(--text), var(--primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.focus-timer-ring {
  position: relative;
  width: 280px;
  height: 280px;
  margin: 0 auto 24px;
}

.focus-timer-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.focus-ring-bg {
  fill: none;
  stroke: rgba(124,110,240,.1);
  stroke-width: 8;
}

.focus-ring-fill {
  fill: none;
  stroke: url(#focusGradient);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 753.98;
  stroke-dashoffset: 753.98;
  transition: stroke-dashoffset 0.1s linear;
}

.focus-timer-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
}

.focus-timer-info {
  font-size: 14px;
  color: var(--text-soft);
  margin-bottom: 32px;
}

.focus-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.focus-stop-btn {
  padding: 14px 36px;
  font-size: 16px;
  border-radius: var(--radius);
}

.focus-cancel-btn {
  padding: 14px 24px;
  font-size: 14px;
  border-radius: var(--radius);
}

/* Complete State */
.focus-complete {
  text-align: center;
  padding: 60px 20px;
}

.focus-complete-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.focus-complete-title {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--primary), #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.focus-complete-duration {
  font-size: 32px;
  font-weight: 800;
  color: var(--primary);
  margin-bottom: 8px;
}

.focus-complete-category {
  font-size: 14px;
  color: var(--text-soft);
  margin-bottom: 24px;
}

/* Dark Theme */
body.theme-dark .focus-task-input {
  background: rgba(0,0,0,.3);
  border-color: rgba(255,255,255,.15);
  color: var(--text);
}

body.theme-dark .focus-task-input:focus {
  background: rgba(0,0,0,.4);
}

body.theme-dark .focus-mode-btn {
  background: rgba(0,0,0,.25);
  border-color: rgba(255,255,255,.15);
  color: var(--text-soft);
}

body.theme-dark .duration-row input {
  background: rgba(0,0,0,.3);
  border-color: rgba(255,255,255,.15);
  color: var(--text);
}

/* Button Styles */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: var(--transition);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  position: relative;
  overflow: hidden;
}

.btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,.2), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.btn:hover::after {
  opacity: 1;
}

.btn-gradient {
  background: linear-gradient(135deg, var(--primary), #a78bfa);
  color: #fff;
  box-shadow: 0 4px 16px var(--primary-glow);
}

.btn-gradient:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px var(--primary-glow);
}

.btn-danger {
  background: linear-gradient(135deg, var(--danger), #fca5a5);
  color: #fff;
}

.btn-danger:hover {
  transform: translateY(-2px);
}

.btn-glass {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  color: var(--text);
  box-shadow: var(--glass-shadow);
}

.btn-glass:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(100,80,200,.12);
}
</style>

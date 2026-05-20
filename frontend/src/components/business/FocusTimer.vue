<!-- frontend/src/components/business/FocusTimer.vue -->
<template>
  <div class="focus-timer">
    <!-- Setup State -->
    <div v-if="phase === 'setup'" class="focus-setup">
      <div class="mode-selector">
        <button
          v-for="mode in modes"
          :key="mode.value"
          class="mode-button"
          :class="{ active: currentMode === mode.value }"
          @click="selectMode(mode.value)"
        >
          {{ mode.label }}
        </button>
      </div>

      <div v-if="currentMode === 'countdown'" class="duration-input">
        <GlassInput
          v-model="durationMinutes"
          type="number"
          label="专注时长（分钟）"
          placeholder="25"
        />
      </div>

      <GlassInput
        v-model="task"
        label="专注任务（可选）"
        placeholder="今天要完成什么？"
      />

      <GlassButton
        variant="primary"
        size="large"
        block
        @click="start"
      >
        开始专注
      </GlassButton>
    </div>

    <!-- Running State -->
    <div v-else-if="phase === 'running' || phase === 'paused'" class="focus-running">
      <div class="timer-ring">
        <svg viewBox="0 0 256 256" class="ring-svg">
          <circle
            cx="128"
            cy="128"
            r="120"
            fill="none"
            stroke="var(--glass-border)"
            stroke-width="8"
          />
          <circle
            cx="128"
            cy="128"
            r="120"
            fill="none"
            stroke="var(--primary)"
            stroke-width="8"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            transform="rotate(-90 128 128)"
            class="ring-progress"
          />
        </svg>
        <div class="timer-display">
          <span class="time">{{ formattedTime }}</span>
          <span v-if="task" class="task-label">{{ task }}</span>
        </div>
      </div>

      <div class="timer-controls">
        <GlassButton
          v-if="phase === 'running'"
          variant="secondary"
          @click="pause"
        >
          暂停
        </GlassButton>
        <GlassButton
          v-else
          variant="primary"
          @click="resume"
        >
          继续
        </GlassButton>
        <GlassButton
          variant="success"
          @click="complete"
        >
          完成
        </GlassButton>
        <GlassButton
          variant="danger"
          @click="reset"
        >
          放弃
        </GlassButton>
      </div>
    </div>

    <!-- Complete State -->
    <div v-else-if="phase === 'complete'" class="focus-complete">
      <div class="complete-icon">🎉</div>
      <h3>专注完成！</h3>
      <p class="complete-duration">专注时长：{{ formattedTime }}</p>
      <p v-if="task" class="complete-task">任务：{{ task }}</p>
      <GlassButton
        variant="primary"
        size="large"
        block
        @click="reset"
      >
        开始新的专注
      </GlassButton>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useFocusStore } from '@/stores/focus'
import GlassInput from '../common/GlassInput.vue'
import GlassButton from '../common/GlassButton.vue'

const focusStore = useFocusStore()

const props = defineProps({
  phase: {
    type: String,
    default: 'setup',
    validator: (v) => ['setup', 'running', 'paused', 'complete'].includes(v)
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

const emit = defineEmits(['start', 'pause', 'resume', 'complete', 'reset', 'mode-change'])

const currentMode = ref(props.mode)
const durationMinutes = ref(25)
const task = ref('')

const modes = [
  { value: 'unlimited', label: '正计时' },
  { value: 'countdown', label: '倒计时' }
]

const circumference = 2 * Math.PI * 120

const dashOffset = computed(() => {
  if (currentMode.value === 'unlimited') {
    const segments = Math.floor(props.elapsed / 3600)
    const segProgress = (props.elapsed % 3600) / 3600
    return circumference * (1 - segProgress)
  }

  if (props.duration === 0) return circumference
  const progress = props.elapsed / props.duration
  return circumference * (1 - Math.min(progress, 1))
})

const formattedTime = computed(() => {
  const totalSec = currentMode.value === 'countdown'
    ? Math.max(0, props.duration - props.elapsed)
    : props.elapsed

  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const selectMode = (mode) => {
  currentMode.value = mode
  emit('mode-change', mode)
}

const start = () => {
  emit('start', {
    mode: currentMode.value,
    duration: currentMode.value === 'countdown' ? durationMinutes.value * 60 : 0,
    task: task.value
  })
}

const pause = () => emit('pause')
const resume = () => emit('resume')
const complete = () => emit('complete')
const reset = () => {
  task.value = ''
  emit('reset')
}

// Cleanup timer on component unmount
onUnmounted(() => {
  focusStore.cleanup()
})
</script>

<style scoped>
.focus-timer {
  max-width: 400px;
  margin: 0 auto;
}

.focus-setup {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.mode-selector {
  display: flex;
  gap: 0.5rem;
  background: var(--glass-bg);
  padding: 0.25rem;
  border-radius: var(--radius-sm);
}

.mode-button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-soft);
}

.mode-button.active {
  background: var(--primary-light);
  color: var(--primary);
}

.focus-running {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.timer-ring {
  position: relative;
  width: 256px;
  height: 256px;
}

.ring-svg {
  width: 100%;
  height: 100%;
}

.ring-progress {
  transition: stroke-dashoffset 1s linear;
}

.timer-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.time {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.task-label {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-muted);
  max-width: 200px;
}

.timer-controls {
  display: flex;
  gap: 1rem;
}

.focus-complete {
  text-align: center;
  padding: 2rem;
}

.complete-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.focus-complete h3 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  color: var(--text);
}

.complete-duration,
.complete-task {
  color: var(--text-soft);
  margin-bottom: 1rem;
}
</style>

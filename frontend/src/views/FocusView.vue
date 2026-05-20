<template>
  <div class="focus-view">
    <Header title="专注模式" />

    <div class="focus-content">
      <FocusTimer
        ref="focusTimerRef"
        :phase="focusStore.phase"
        :mode="focusStore.mode"
        :elapsed="focusStore.elapsed"
        :duration="focusStore.duration"
        @start="handleStart"
        @stop="handleStop"
        @cancel="handleCancel"
        @reset="handleReset"
        @mode-change="handleModeChange"
      />

      <div v-if="focusStore.sessions.length > 0" class="sessions-history glass-card">
        <h3>专注历史</h3>
        <div class="sessions-list">
          <div
            v-for="session in focusStore.sessions"
            :key="session.id"
            class="session-item"
          >
            <div class="session-info">
              <span class="session-task">{{ session.category || session.task || '无任务' }}</span>
              <span class="session-duration">{{ formatDuration(session.duration) }}</span>
            </div>
            <span class="session-time">{{ formatDate(session.created_at || session.start_time) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useFocusStore } from '@/stores/focus'
import api from '@/api'
import Header from '@/components/layout/Header.vue'
import FocusTimer from '@/components/business/FocusTimer.vue'

const focusStore = useFocusStore()
const focusTimerRef = ref(null)

// 倒计时结束自动调用
let checkCountdownInterval = null

onMounted(async () => {
  await focusStore.fetchSessions()
  await restoreFocusSession()

  // 检查倒计时是否结束
  checkCountdownInterval = setInterval(() => {
    if (focusStore.phase === 'running' && focusStore.mode === 'countdown') {
      if (focusStore.elapsed >= focusStore.duration) {
        handleStop()
      }
    }
  }, 1000)
})

onUnmounted(() => {
  focusStore.cleanup()
  if (checkCountdownInterval) {
    clearInterval(checkCountdownInterval)
    checkCountdownInterval = null
  }
})

const handleStart = async (config) => {
  try {
    focusStore.setMode(config.mode)
    if (config.duration) {
      focusStore.setDuration(config.duration)
    }
    focusStore.setTask(config.task)
    await focusStore.start()
  } catch (e) {
    alert('启动失败: ' + e.message)
  }
}

const handleStop = async () => {
  try {
    await focusStore.complete()
  } catch (e) {
    console.error('Failed to complete focus session:', e)
    alert('完成专注失败，请稍后重试')
  }
}

const handleCancel = async () => {
  try {
    // 调用API删除未完成会话
    if (focusStore.sessionId) {
      await api.deleteSession(focusStore.sessionId).catch(() => {})
    }
    focusStore.reset()
  } catch (e) {
    console.error('Failed to cancel focus session:', e)
  }
}

const handleReset = () => {
  focusStore.reset()
}

const handleModeChange = (mode) => {
  focusStore.setMode(mode)
}

// 恢复未完成的专注会话
const restoreFocusSession = async () => {
  try {
    const sessions = await api.getSessions()
    const unfinished = sessions.find(s => !s.end_time)
    if (!unfinished) return

    const elapsed = (Date.now() - new Date(unfinished.start_time).getTime()) / 1000
    // 超过4小时自动结束
    if (elapsed > 14400) {
      await api.updateSession(unfinished.id, {
        end_time: new Date().toISOString()
      })
      return
    }

    // 恢复会话
    const now = new Date()
    await api.updateSession(unfinished.id, {
      start_time: now.toISOString()
    })

    // 恢复专注状态
    focusStore.sessionId = unfinished.id
    focusStore.task = unfinished.category || ''
    focusStore.startTime = now
    focusStore.elapsed = 0
    focusStore.phase = 'running'
    focusStore.mode = 'unlimited'
    focusStore._startTimer()
  } catch (e) {
    console.error('Failed to restore focus session:', e)
  }
}

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '0分钟'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return d + '天' + h + '小时' + m + '分钟'
  if (h > 0) return h + '小时' + m + '分钟'
  return m + '分钟'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.focus-view {
  min-height: 100vh;
}

.focus-content {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.sessions-history {
  margin-top: 3rem;
}

.sessions-history h3 {
  margin: 0 0 1rem;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--text), var(--primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255,255,255,.3);
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255,255,255,.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.session-item:hover {
  background: rgba(255,255,255,.25);
  transform: translateX(4px);
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.session-task {
  font-weight: 600;
  color: var(--text);
}

.session-duration {
  font-size: 0.9rem;
  color: var(--primary);
  font-weight: 700;
}

.session-time {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Glass Card */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  box-shadow: var(--glass-shadow);
  padding: 24px;
  transition: var(--transition);
}

.glass-card:hover {
  box-shadow: 0 12px 40px rgba(100,80,200,.12);
}

/* Dark Theme */
body.theme-dark .session-item {
  background: rgba(0,0,0,.2);
  border-color: rgba(255,255,255,.1);
}

body.theme-dark .session-item:hover {
  background: rgba(0,0,0,.3);
}
</style>

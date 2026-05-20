<template>
  <div class="focus-view">
    <Header title="专注模式" />

    <div class="focus-content">
      <FocusTimer
        :phase="focusStore.phase"
        :mode="focusStore.mode"
        :elapsed="focusStore.elapsed"
        :duration="focusStore.duration"
        @start="handleStart"
        @pause="focusStore.pause()"
        @resume="focusStore.resume()"
        @complete="handleComplete"
        @reset="focusStore.reset()"
        @mode-change="focusStore.setMode"
      />

      <div v-if="focusStore.sessions.length > 0" class="sessions-history">
        <h3>专注历史</h3>
        <div class="sessions-list">
          <GlassCard
            v-for="session in focusStore.sessions"
            :key="session.id"
            class="session-item"
          >
            <div class="session-info">
              <span class="session-task">{{ session.task || '无任务' }}</span>
              <span class="session-duration">{{ formatDuration(session.duration) }}</span>
            </div>
            <span class="session-time">{{ formatDate(session.created_at) }}</span>
          </GlassCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useFocusStore } from '@/stores/focus'
import Header from '@/components/layout/Header.vue'
import FocusTimer from '@/components/business/FocusTimer.vue'
import GlassCard from '@/components/common/GlassCard.vue'

const focusStore = useFocusStore()

onMounted(() => {
  focusStore.fetchSessions()
})

const handleStart = (config) => {
  focusStore.setMode(config.mode)
  if (config.duration) {
    focusStore.setDuration(config.duration)
  }
  focusStore.setTask(config.task)
  focusStore.start()
}

const handleComplete = async () => {
  await focusStore.complete()
}

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)

  if (h > 0) {
    return `${h}小时${m}分钟`
  }
  return `${m}分钟`
}

const formatDate = (dateStr) => {
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
  margin-bottom: 1rem;
  color: var(--text);
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
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.session-task {
  font-weight: 500;
  color: var(--text);
}

.session-duration {
  font-size: 0.9rem;
  color: var(--text-soft);
}

.session-time {
  font-size: 0.85rem;
  color: var(--text-muted);
}
</style>

import { defineStore } from 'pinia'

// Interval references stored outside reactive state (not serializable)
const intervals = {}

export const useUiStore = defineStore('ui', {
  state: () => ({
    sigIndex: 0,
    activeTimers: {},
    activeFocusSession: null
  }),

  actions: {
    startTimer(id, totalSec, onTick, onEnd) {
      id = parseInt(id)
      if (intervals[id]) return
      this.activeTimers[id] = {
        remaining: totalSec,
        total: totalSec,
        startAt: Date.now(),
        progress: 0
      }
      intervals[id] = setInterval(() => {
        const t = this.activeTimers[id]
        if (!t) { clearInterval(intervals[id]); delete intervals[id]; return }
        const elapsed = Math.floor((Date.now() - t.startAt) / 1000)
        t.remaining = Math.max(0, t.total - elapsed)
        t.progress = Math.min(100, Math.round((elapsed / t.total) * 100))
        if (onTick) onTick(id, t.progress)
        if (t.remaining <= 0) {
          this.stopTimer(id)
          if (onEnd) onEnd(id)
        }
      }, 1000)
    },

    stopTimer(id) {
      id = parseInt(id)
      if (intervals[id]) {
        clearInterval(intervals[id])
        delete intervals[id]
      }
      delete this.activeTimers[id]
    },

    getTimerRemaining(id) {
      return this.activeTimers[parseInt(id)]?.remaining ?? null
    },

    getTimerProgress(id) {
      return this.activeTimers[parseInt(id)]?.progress ?? null
    },

    restoreTimers(onTick, onEnd) {
      // Restore timers from persisted state after page navigation
      const now = Date.now()
      for (const [id, t] of Object.entries(this.activeTimers)) {
        const elapsed = Math.floor((now - t.startAt) / 1000)
        const remaining = Math.max(0, t.total - elapsed)
        if (remaining <= 0) {
          this.stopTimer(id)
          if (onEnd) onEnd(parseInt(id))
          continue
        }
        t.remaining = remaining
        t.progress = Math.min(100, Math.round((elapsed / t.total) * 100))
        // Restart interval
        const timerId = parseInt(id)
        if (intervals[timerId]) clearInterval(intervals[timerId])
        intervals[timerId] = setInterval(() => {
          const timer = this.activeTimers[timerId]
          if (!timer) { clearInterval(intervals[timerId]); delete intervals[timerId]; return }
          const el = Math.floor((Date.now() - timer.startAt) / 1000)
          timer.remaining = Math.max(0, timer.total - el)
          timer.progress = Math.min(100, Math.round((el / timer.total) * 100))
          if (onTick) onTick(timerId, timer.progress)
          if (timer.remaining <= 0) {
            this.stopTimer(timerId)
            if (onEnd) onEnd(timerId)
          }
        }, 1000)
      }
    },

    clearAllTimers() {
      for (const id of Object.keys(intervals)) {
        clearInterval(intervals[id])
        delete intervals[id]
      }
      this.activeTimers = {}
    }
  }
})

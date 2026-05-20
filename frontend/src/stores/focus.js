// frontend/src/stores/focus.js
import { defineStore } from 'pinia'
import api from '@/api'

let _timer = null

export const useFocusStore = defineStore('focus', {
  state: () => ({
    mode: 'unlimited',
    duration: 0,
    phase: 'setup',
    startTime: null,
    elapsed: 0,
    sessionId: null,
    task: '',
    sessions: [],
    loading: false,
    error: null
  }),

  getters: {
    remaining: (state) => {
      if (state.mode === 'unlimited') return 0
      return Math.max(0, state.duration - state.elapsed)
    },

    progress: (state) => {
      if (state.mode === 'unlimited' || state.duration === 0) return 0
      return (state.elapsed / state.duration) * 100
    },

    formattedTime: (state) => {
      const totalSec = state.mode === 'countdown'
        ? Math.max(0, state.duration - state.elapsed)
        : state.elapsed

      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60

      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    },

    isRunning: (state) => state.phase === 'running',
    isPaused: (state) => state.phase === 'paused',
    isComplete: (state) => state.phase === 'complete',
    isSetup: (state) => state.phase === 'setup'
  },

  actions: {
    setMode(mode) {
      this.mode = mode
    },

    setDuration(seconds) {
      this.duration = seconds
    },

    setTask(task) {
      this.task = task
    },

    async start() {
      // 先调用API创建会话
      const session = await api.createSession({
        plan_id: null,
        start_time: new Date().toISOString(),
        category: this.task
      })

      this.sessionId = session.id
      this.startTime = new Date(session.start_time)
      this.elapsed = 0
      this.phase = 'running'
      this._startTimer()
    },

    pause() {
      this.phase = 'paused'
      this._stopTimer()
    },

    resume() {
      this.phase = 'running'
      this._startTimer()
    },

    async complete() {
      this.phase = 'complete'
      this._stopTimer()

      // 调用API结束会话
      if (this.sessionId) {
        try {
          await api.endSession(this.sessionId, {
            end_time: new Date().toISOString()
          })
        } catch (error) {
          console.error('Failed to end focus session:', error)
        }
      }

      // 刷新会话列表
      await this.fetchSessions()

      return { duration: this.elapsed, task: this.task }
    },

    reset() {
      this.phase = 'setup'
      this.elapsed = 0
      this.startTime = null
      this.sessionId = null
      this.task = ''
      this._stopTimer()
    },

    cleanup() {
      this._stopTimer()
    },

    async fetchSessions() {
      this.loading = true
      this.error = null
      try {
        this.sessions = await api.getSessions()
      } catch (error) {
        this.error = error.message
        console.error('Failed to fetch focus sessions:', error)
      } finally {
        this.loading = false
      }
    },

    _startTimer() {
      this._stopTimer()
      _timer = setInterval(() => {
        this.elapsed++
      }, 1000)
    },

    _stopTimer() {
      if (_timer) {
        clearInterval(_timer)
        _timer = null
      }
    }
  }
})

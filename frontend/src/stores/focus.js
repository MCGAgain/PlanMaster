// frontend/src/stores/focus.js
import { defineStore } from 'pinia'
import api from '@/api'

export const useFocusStore = defineStore('focus', {
  state: () => ({
    mode: 'unlimited',
    duration: 0,
    state: 'setup',
    startTime: null,
    elapsed: 0,
    sessionId: null,
    task: '',
    sessions: [],
    loading: false,
    error: null,
    _timer: null
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

    isRunning: (state) => state.state === 'running',
    isPaused: (state) => state.state === 'paused',
    isComplete: (state) => state.state === 'complete',
    isSetup: (state) => state.state === 'setup'
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

    start() {
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

      try {
        const session = await api.createSession({
          duration: this.elapsed,
          task: this.task,
          mode: this.mode
        })
        this.sessions.unshift(session)
        return session
      } catch (error) {
        this.error = error.message
        console.error('Failed to save focus session:', error)
      }
    },

    reset() {
      this.state = 'setup'
      this.elapsed = 0
      this.startTime = null
      this.sessionId = null
      this.task = ''
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

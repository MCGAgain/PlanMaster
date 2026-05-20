// frontend/src/stores/checkins.js
import { defineStore } from 'pinia'
import api from '@/api'

export const useCheckinsStore = defineStore('checkins', {
  state: () => ({
    checkins: [],
    loading: false,
    error: null
  }),

  getters: {
    todayCheckins: (state) => {
      const today = new Date().toISOString().split('T')[0]
      return state.checkins.map(checkin => ({
        ...checkin,
        checkedToday: checkin.last_checkin === today
      }))
    },

    completedToday: (state) => {
      const today = new Date().toISOString().split('T')[0]
      return state.checkins.filter(c => c.last_checkin === today).length
    },

    totalStreak: (state) => {
      return state.checkins.reduce((sum, c) => sum + (c.streak || 0), 0)
    }
  },

  actions: {
    async fetchCheckins() {
      this.loading = true
      this.error = null
      try {
        this.checkins = await api.getCheckinItems()
      } catch (error) {
        this.error = error.message
        console.error('Failed to fetch checkins:', error)
      } finally {
        this.loading = false
      }
    },

    async createCheckin(name) {
      try {
        const newCheckin = await api.createCheckinItem(name)
        this.checkins.push(newCheckin)
        return newCheckin
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async deleteCheckin(id) {
      try {
        await api.deleteCheckinItem(id)
        this.checkins = this.checkins.filter(c => c.id !== id)
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async checkin(id) {
      try {
        const result = await api.checkin(id)
        await this.fetchCheckins()
        return result
      } catch (error) {
        this.error = error.message
        throw error
      }
    }
  }
})

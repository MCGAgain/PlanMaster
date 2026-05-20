// frontend/src/stores/plans.js
import { defineStore } from 'pinia'
import api from '@/api'

export const usePlansStore = defineStore('plans', {
  state: () => ({
    plans: [],
    loading: false,
    error: null,
    currentType: 'today'
  }),

  getters: {
    filteredPlans: (state) => {
      return state.plans.filter(p => p.plan_type === state.currentType && !p.completed)
    },

    completedPlans: (state) => {
      return state.plans.filter(p => p.completed)
    },

    todayPlans: (state) => {
      return state.plans.filter(p => p.plan_type === 'today' && !p.completed)
    },

    weeklyPlans: (state) => {
      return state.plans.filter(p => p.plan_type === 'weekly' && !p.completed)
    },

    monthlyPlans: (state) => {
      return state.plans.filter(p => p.plan_type === 'monthly' && !p.completed)
    },

    yearlyPlans: (state) => {
      return state.plans.filter(p => p.plan_type === 'yearly' && !p.completed)
    }
  },

  actions: {
    async fetchPlans() {
      this.loading = true
      this.error = null
      try {
        this.plans = await api.getPlans()
      } catch (error) {
        this.error = error.message
        console.error('Failed to fetch plans:', error)
      } finally {
        this.loading = false
      }
    },

    async createPlan(plan) {
      try {
        const newPlan = await api.createPlan(plan)
        this.plans.push(newPlan)
        return newPlan
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async updatePlan(id, updates) {
      try {
        const updated = await api.updatePlan(id, updates)
        const index = this.plans.findIndex(p => p.id === id)
        if (index !== -1) {
          this.plans[index] = updated
        }
        return updated
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async deletePlan(id) {
      try {
        await api.deletePlan(id)
        this.plans = this.plans.filter(p => p.id !== id)
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async completePlan(id) {
      try {
        const completed = await api.completePlan(id)
        const index = this.plans.findIndex(p => p.id === id)
        if (index !== -1) {
          this.plans[index] = completed
        }
        return completed
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    setCurrentType(type) {
      this.currentType = type
    }
  }
})

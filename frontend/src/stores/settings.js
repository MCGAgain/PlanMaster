// frontend/src/stores/settings.js
import { defineStore } from 'pinia'
import api from '@/api'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: {
      base_url: '',
      api_key: '',
      model_name: '',
      extra_headers: ''
    },
    models: [],
    loading: false,
    error: null,
    testing: false
  }),

  actions: {
    async fetchSettings() {
      this.loading = true
      this.error = null
      try {
        this.settings = await api.getSettings()
      } catch (error) {
        this.error = error.message
        console.error('Failed to fetch settings:', error)
      } finally {
        this.loading = false
      }
    },

    async updateSettings(updates) {
      try {
        this.settings = await api.updateSettings(updates)
        return this.settings
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async fetchModels() {
      try {
        const { base_url, api_key, extra_headers } = this.settings
        this.models = await api.getModels(base_url, api_key, extra_headers)
      } catch (error) {
        console.error('Failed to fetch models:', error)
      }
    },

    async testConnection() {
      this.testing = true
      this.error = null
      try {
        const result = await api.testAI()
        return result
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.testing = false
      }
    }
  }
})

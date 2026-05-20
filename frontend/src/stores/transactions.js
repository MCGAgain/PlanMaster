// frontend/src/stores/transactions.js
import { defineStore } from 'pinia'
import api from '@/api'

export const useTransactionsStore = defineStore('transactions', {
  state: () => ({
    transactions: [],
    loading: false,
    error: null
  }),

  getters: {
    recentTransactions: (state) => {
      return state.transactions.slice(0, 20)
    },

    totalEarned: (state) => {
      return state.transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0)
    },

    totalSpent: (state) => {
      return state.transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    }
  },

  actions: {
    async fetchTransactions() {
      this.loading = true
      this.error = null
      try {
        this.transactions = await api.getTransactions()
      } catch (error) {
        this.error = error.message
        console.error('Failed to fetch transactions:', error)
      } finally {
        this.loading = false
      }
    }
  }
})

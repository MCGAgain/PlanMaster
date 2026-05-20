// frontend/src/stores/wishes.js
import { defineStore } from 'pinia'
import api from '@/api'

export const useWishesStore = defineStore('wishes', {
  state: () => ({
    wishes: [],
    balance: 0,
    loading: false,
    error: null
  }),

  getters: {
    activeWishes: (state) => {
      return state.wishes.filter(w => !w.redeemed)
    },

    redeemedWishes: (state) => {
      return state.wishes.filter(w => w.redeemed)
    },

    canRedeem: (state) => {
      return (wish) => state.balance >= wish.virtual_cost
    }
  },

  actions: {
    async fetchWishes() {
      this.loading = true
      this.error = null
      try {
        const [wishes, balanceData] = await Promise.all([
          api.getWishes(),
          api.getBalance()
        ])
        this.wishes = wishes
        this.balance = balanceData.balance || 0
      } catch (error) {
        this.error = error.message
        console.error('Failed to fetch wishes:', error)
      } finally {
        this.loading = false
      }
    },

    async createWish(wish) {
      try {
        const newWish = await api.createWish(wish)
        this.wishes.push(newWish)
        return newWish
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async updateWish(id, updates) {
      try {
        const updated = await api.updateWish(id, updates)
        const index = this.wishes.findIndex(w => w.id === id)
        if (index !== -1) {
          this.wishes[index] = updated
        }
        return updated
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async deleteWish(id) {
      try {
        await api.deleteWish(id)
        this.wishes = this.wishes.filter(w => w.id !== id)
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async redeemWish(id) {
      try {
        const result = await api.redeemWish(id)
        if (result.success) {
          this.balance = result.new_balance
          await this.fetchWishes()
        }
        return result
      } catch (error) {
        this.error = error.message
        throw error
      }
    },

    async refreshBalance() {
      try {
        const balanceData = await api.getBalance()
        this.balance = balanceData.balance || 0
      } catch (error) {
        console.error('Failed to refresh balance:', error)
      }
    }
  }
})

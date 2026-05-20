const BASE_URL = ''

class ApiClient {
  constructor() {
    this.baseUrl = BASE_URL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body)
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      throw error
    }
  }

  // Plans
  getPlans() {
    return this.request('/api/plans')
  }

  createPlan(plan) {
    return this.request('/api/plans', {
      method: 'POST',
      body: plan
    })
  }

  updatePlan(id, plan) {
    return this.request(`/api/plans/${id}`, {
      method: 'PUT',
      body: plan
    })
  }

  deletePlan(id) {
    return this.request(`/api/plans/${id}`, {
      method: 'DELETE'
    })
  }

  completePlan(id) {
    return this.request(`/api/plans/${id}/complete`, {
      method: 'POST'
    })
  }

  evaluatePlan(id) {
    return this.request(`/api/plans/${id}/evaluate`, {
      method: 'POST'
    })
  }

  // Wishes
  getWishes() {
    return this.request('/api/wishes')
  }

  createWish(wish) {
    return this.request('/api/wishes', {
      method: 'POST',
      body: wish
    })
  }

  updateWish(id, wish) {
    return this.request(`/api/wishes/${id}`, {
      method: 'PUT',
      body: wish
    })
  }

  deleteWish(id) {
    return this.request(`/api/wishes/${id}`, {
      method: 'DELETE'
    })
  }

  redeemWish(id) {
    return this.request(`/api/wishes/${id}/redeem`, {
      method: 'POST'
    })
  }

  // Balance
  getBalance() {
    return this.request('/api/balance')
  }

  getTransactions() {
    return this.request('/api/transactions')
  }

  // Checkins
  getCheckins() {
    return this.request('/api/checkins')
  }

  createCheckin(checkin) {
    return this.request('/api/checkins', {
      method: 'POST',
      body: checkin
    })
  }

  updateCheckin(id, checkin) {
    return this.request(`/api/checkins/${id}`, {
      method: 'PUT',
      body: checkin
    })
  }

  deleteCheckin(id) {
    return this.request(`/api/checkins/${id}`, {
      method: 'DELETE'
    })
  }

  toggleCheckin(id) {
    return this.request(`/api/checkins/${id}/toggle`, {
      method: 'POST'
    })
  }

  // Focus Sessions
  getFocusSessions() {
    return this.request('/api/focus-sessions')
  }

  createFocusSession(session) {
    return this.request('/api/focus-sessions', {
      method: 'POST',
      body: session
    })
  }

  // Stats
  getStats() {
    return this.request('/api/stats')
  }

  // Settings
  getSettings() {
    return this.request('/api/settings')
  }

  updateSettings(settings) {
    return this.request('/api/settings', {
      method: 'PUT',
      body: settings
    })
  }

  // AI
  testAI() {
    return this.request('/api/ai/test', {
      method: 'POST'
    })
  }

  getModels() {
    return this.request('/api/ai/models')
  }

  // Recycle Bin
  getRecycleBin() {
    return this.request('/api/recycle')
  }

  restorePlan(id) {
    return this.request(`/api/recycle/${id}/restore`, {
      method: 'POST'
    })
  }

  permanentDelete(id) {
    return this.request(`/api/recycle/${id}`, {
      method: 'DELETE'
    })
  }

  // Important Items
  getImportantItems() {
    return this.request('/api/important')
  }

  createImportantItem(item) {
    return this.request('/api/important', {
      method: 'POST',
      body: item
    })
  }

  updateImportantItem(id, item) {
    return this.request(`/api/important/${id}`, {
      method: 'PUT',
      body: item
    })
  }

  deleteImportantItem(id) {
    return this.request(`/api/important/${id}`, {
      method: 'DELETE'
    })
  }

  // API Balance
  getApiBalance() {
    return this.request('/api/apibalance')
  }
}

export const api = new ApiClient()
export default api

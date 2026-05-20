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
        throw new Error(error.message || error.error || `HTTP ${response.status}`)
      }

      // Handle empty responses (e.g. 204 No Content)
      const text = await response.text()
      if (!text) return {}
      try {
        return JSON.parse(text)
      } catch {
        return {}
      }
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      throw error
    }
  }

  // Plans
  getPlans(type) {
    const qs = type ? `?type=${encodeURIComponent(type)}` : ''
    return this.request(`/api/plans${qs}`)
  }

  getAllPlans(type) {
    const qs = type ? `?type=${encodeURIComponent(type)}` : ''
    return this.request(`/api/plans/all${qs}`)
  }

  getPlanProgress(type) {
    return this.request(`/api/plans/progress?type=${encodeURIComponent(type || 'today')}`)
  }

  getCompletedPlans() {
    return this.request('/api/plans/completed')
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

  restorePlan(id) {
    return this.request(`/api/plans/${id}/restore`, {
      method: 'POST'
    })
  }

  batchDeletePlans(ids) {
    return this.request('/api/plans/batch-delete', {
      method: 'POST',
      body: { ids }
    })
  }

  sortPlans(planType) {
    return this.request('/api/plans/sort', {
      method: 'POST',
      body: { plan_type: planType }
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

  resetBalance() {
    return this.request('/api/balance/reset', {
      method: 'POST'
    })
  }

  getTransactions() {
    return this.request('/api/transactions')
  }

  // Check-in Items
  getCheckinItems() {
    return this.request('/api/checkin-items')
  }

  createCheckinItem(name) {
    return this.request('/api/checkin-items', {
      method: 'POST',
      body: { name }
    })
  }

  deleteCheckinItem(id) {
    return this.request(`/api/checkin-items/${id}`, {
      method: 'DELETE'
    })
  }

  checkin(itemId) {
    return this.request(`/api/checkin/${itemId}`, {
      method: 'POST'
    })
  }

  // Focus Sessions
  getSessions(params) {
    const qs = new URLSearchParams()
    if (params) {
      if (params.plan_id) qs.set('plan_id', params.plan_id)
      if (params.date) qs.set('date', params.date)
      if (params.category) qs.set('category', params.category)
    }
    const query = qs.toString()
    return this.request(`/api/sessions${query ? '?' + query : ''}`)
  }

  createSession(session) {
    return this.request('/api/sessions', {
      method: 'POST',
      body: session
    })
  }

  endSession(id, data) {
    return this.request(`/api/sessions/${id}`, {
      method: 'PUT',
      body: data
    })
  }

  updateSession(id, data) {
    return this.request(`/api/sessions/${id}`, {
      method: 'PATCH',
      body: data
    })
  }

  deleteSession(id) {
    return this.request(`/api/sessions/${id}`, {
      method: 'DELETE'
    })
  }

  // Stats
  getCumulativeStats() {
    return this.request('/api/stats/cumulative')
  }

  getDailyStats(dateStr) {
    const qs = dateStr ? `?date=${encodeURIComponent(dateStr)}` : ''
    return this.request(`/api/stats/daily${qs}`)
  }

  getDistributionStats(params) {
    const qs = new URLSearchParams()
    if (params) {
      if (params.period) qs.set('period', params.period)
      if (params.date) qs.set('date', params.date)
      if (params.start_date) qs.set('start_date', params.start_date)
      if (params.end_date) qs.set('end_date', params.end_date)
    }
    const query = qs.toString()
    return this.request(`/api/stats/distribution${query ? '?' + query : ''}`)
  }

  getMonthlyStats(month) {
    const qs = month ? `?month=${encodeURIComponent(month)}` : ''
    return this.request(`/api/stats/monthly${qs}`)
  }

  clearFocusSessions() {
    return this.request('/api/stats/clear', {
      method: 'POST'
    })
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

  // AI Settings
  getAISettings() {
    return this.request('/api/ai-settings')
  }

  updateAISettings(settings) {
    return this.request('/api/ai-settings', {
      method: 'PUT',
      body: settings
    })
  }

  testAI() {
    return this.request('/api/ai-settings/test', {
      method: 'POST'
    })
  }

  getModels(base_url, api_key, extra_headers) {
    return this.request('/api/ai-settings/models', {
      method: 'POST',
      body: { base_url, api_key, extra_headers }
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

  // Signatures
  getSignatures() {
    return this.request('/api/signatures')
  }

  saveSignatures(contents) {
    return this.request('/api/signatures', {
      method: 'PUT',
      body: { contents }
    })
  }

  // Background
  uploadBackground(file) {
    const formData = new FormData()
    formData.append('file', file)
    return fetch(`${this.baseUrl}/api/background/upload`, {
      method: 'POST',
      body: formData
    }).then(async response => {
      const text = await response.text()
      if (!text) return {}
      try {
        const data = JSON.parse(text)
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
        return data
      } catch (e) {
        if (!response.ok) throw e
        return {}
      }
    })
  }

  // Version & Update
  getVersion() {
    return this.request('/api/version')
  }

  checkUpdate() {
    return this.request('/api/update', {
      method: 'POST'
    })
  }

  getUpdateStatus() {
    return this.request('/api/update/status')
  }

  // DeepSeek API Balance
  getApiBalance() {
    return this.request('/api/deepseek/balance')
  }

  // Health
  getHealth() {
    return this.request('/api/health')
  }
}

export const api = new ApiClient()
export default api

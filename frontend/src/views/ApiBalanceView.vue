<template>
  <div class="api-balance-view">
    <Header title="API余量" />

    <div class="balance-content">
      <GlassCard class="balance-card">
        <div v-if="loading" class="loading-state">
          <p>加载中...</p>
        </div>

        <div v-else-if="balance" class="balance-info">
          <div class="balance-main">
            <span class="balance-label">DeepSeek API 余额</span>
            <span class="balance-value">{{ balance.balance || 0 }}</span>
            <span class="balance-unit">tokens</span>
          </div>

          <div v-if="balance.total_granted" class="balance-details">
            <div class="detail-item">
              <span class="detail-label">总授予</span>
              <span class="detail-value">{{ balance.total_granted }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">已使用</span>
              <span class="detail-value">{{ balance.total_used || 0 }}</span>
            </div>
          </div>
        </div>

        <div v-else class="error-state">
          <p>无法获取API余额信息</p>
          <GlassButton variant="primary" @click="fetchBalance">
            重试
          </GlassButton>
        </div>
      </GlassCard>

      <GlassButton variant="secondary" @click="fetchBalance" :loading="loading">
        刷新
      </GlassButton>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import Header from '@/components/layout/Header.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassButton from '@/components/common/GlassButton.vue'

const balance = ref(null)
const loading = ref(false)

onMounted(() => {
  fetchBalance()
})

const fetchBalance = async () => {
  loading.value = true
  try {
    balance.value = await api.getApiBalance()
  } catch (error) {
    console.error('Failed to fetch API balance:', error)
    balance.value = null
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.api-balance-view {
  min-height: 100vh;
}

.balance-content {
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.balance-card {
  padding: 2rem;
}

.balance-info {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.balance-main {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.balance-label {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.balance-value {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.balance-unit {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.balance-details {
  display: flex;
  gap: 2rem;
  justify-content: center;
  padding-top: 1.5rem;
  border-top: 1px solid var(--glass-border);
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.detail-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.detail-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text);
}

.loading-state,
.error-state {
  text-align: center;
  color: var(--text-muted);
  padding: 2rem;
}

.error-state {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}
</style>

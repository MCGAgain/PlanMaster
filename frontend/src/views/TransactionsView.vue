<template>
  <div class="transactions-view">
    <Header title="价值流水" />

    <div class="transactions-content">
      <GlassCard v-if="transactionsStore.transactions.length > 0" class="summary-card">
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">总收入</span>
            <span class="summary-value earned">+{{ transactionsStore.totalEarned }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">总支出</span>
            <span class="summary-value spent">-{{ transactionsStore.totalSpent }}</span>
          </div>
        </div>
      </GlassCard>

      <div class="transactions-list">
        <GlassCard
          v-for="tx in transactionsStore.transactions"
          :key="tx.id"
          class="transaction-item"
        >
          <div class="tx-main">
            <div class="tx-info">
              <span class="tx-description">{{ tx.description || '无描述' }}</span>
              <span class="tx-time">{{ formatDate(tx.created_at) }}</span>
            </div>
            <span
              class="tx-amount"
              :class="{ positive: tx.amount > 0, negative: tx.amount < 0 }"
            >
              {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}
            </span>
          </div>
        </GlassCard>
      </div>

      <GlassCard v-if="transactionsStore.transactions.length === 0 && !transactionsStore.loading" class="empty-state">
        <p>暂无交易记录</p>
      </GlassCard>

      <GlassCard v-if="transactionsStore.loading" class="loading-state">
        <p>加载中...</p>
      </GlassCard>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTransactionsStore } from '@/stores/transactions'
import Header from '@/components/layout/Header.vue'
import GlassCard from '@/components/common/GlassCard.vue'

const transactionsStore = useTransactionsStore()

onMounted(() => {
  transactionsStore.fetchTransactions()
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.transactions-view {
  min-height: 100vh;
}

.transactions-content {
  padding: 2rem;
}

.summary-card {
  margin-bottom: 2rem;
}

.summary-grid {
  display: flex;
  gap: 2rem;
  justify-content: center;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.summary-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.summary-value.earned {
  color: var(--success);
}

.summary-value.spent {
  color: var(--danger);
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.transaction-item {
  padding: 1rem 1.5rem;
}

.tx-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tx-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tx-description {
  font-weight: 500;
  color: var(--text);
}

.tx-time {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.tx-amount {
  font-size: 1.1rem;
  font-weight: 600;
}

.tx-amount.positive {
  color: var(--success);
}

.tx-amount.negative {
  color: var(--danger);
}

.empty-state,
.loading-state {
  text-align: center;
  color: var(--text-muted);
}
</style>

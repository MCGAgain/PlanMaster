<template>
  <div class="page active transactions-page">
    <div class="page-header">
      <h2>价值流水</h2>
    </div>

    <div class="transactions-container">
      <GlassCard class="balance-card-hero">
        <div class="balance-label">当前总余额</div>
        <div class="balance-value-large">{{ balance }}</div>
        <div class="balance-unit">虚拟价值</div>
      </GlassCard>

      <div class="tx-list">
        <TransitionGroup name="list">
          <GlassCard 
            v-for="(tx, idx) in transactions" 
            :key="tx.id" 
            class="tx-card" 
            :style="{ animationDelay: (idx * 0.04) + 's' }"
            @mousedown="onPress($event)"
            @mouseup="onRelease($event)"
            @mouseleave="onRelease($event)"
          >
            <div class="tx-info">
              <span class="tx-note">{{ tx.note || tx.source }}</span>
              <span class="tx-time">{{ fmtTime(tx.created_at) }}</span>
            </div>
            <span class="tx-amount" :class="{ positive: tx.amount >= 0, negative: tx.amount < 0 }">
              {{ tx.amount >= 0 ? '+' : '' }}{{ tx.amount.toFixed(2) }}
            </span>
          </GlassCard>
        </TransitionGroup>
        <div v-if="!transactions.length" class="empty-state">暂无流水记录</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import gsap from 'gsap'
import api from '@/api'
import GlassCard from '@/components/common/GlassCard.vue'

const transactions = ref([])
const balance = ref(0)

function fmtTime(ts) { 
  return ts ? new Date(ts).toLocaleString('zh-CN', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit' 
  }) : '' 
}

const loadData = async () => {
  try {
    const [txs, b] = await Promise.all([api.getTransactions(), api.getBalance()])
    transactions.value = txs
    balance.value = b.balance.toFixed(2)
  } catch (e) { 
    window.toast('加载失败: ' + e.message, true) 
  }
}

// Unified Animations
const onPress = (e) => {
  const card = e.currentTarget
  gsap.to(card, { scale: 0.98, duration: 0.2, ease: 'power2.out' })
}

const onRelease = (e) => {
  const card = e.currentTarget
  const isHovered = card.matches(':hover')
  gsap.to(card, { 
    scale: isHovered ? 1.01 : 1,
    y: isHovered ? -2 : 0,
    duration: 0.4, 
    ease: 'elastic.out(1.2, 0.6)' 
  })
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.transactions-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.balance-card-hero {
  text-align: center;
  padding: 40px;
}

.balance-label {
  font-size: 14px;
  color: var(--text-soft);
  margin-bottom: 8px;
}

.balance-value-large {
  font-size: 48px;
  font-weight: 800;
  color: var(--primary);
  line-height: 1;
}

.balance-unit {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 8px;
}

.tx-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 40px;
}

.tx-card {
  padding: 16px 24px;
}

:deep(.tx-card .glass-card-body) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.tx-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tx-note {
  font-weight: 600;
  color: var(--text);
  font-size: 15px;
}

.tx-time {
  font-size: 12px;
  color: var(--text-muted);
}

.tx-amount {
  font-size: 18px;
  font-weight: 700;
}

.tx-amount.positive { color: var(--success); }
.tx-amount.negative { color: var(--danger); }
</style>

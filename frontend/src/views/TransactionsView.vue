<template>
  <div class="page active">
    <div class="page-header">
      <h2>价值流水</h2>
    </div>
    <div class="balance-display">
      <span>总余额</span>
      <span class="balance-big">{{ balance }}</span>
      <span>虚拟价值</span>
    </div>
    <div class="tx-list">
      <TransitionGroup name="list">
        <div v-for="(tx, idx) in transactions" :key="tx.id" class="tx-card" :style="{ animationDelay: (idx * 0.04) + 's' }">
          <div class="tx-info">
            <span class="tx-note">{{ tx.note || tx.source }}</span>
            <span class="tx-time">{{ fmtTime(tx.created_at) }}</span>
          </div>
          <span class="tx-amount" :class="{ positive: tx.amount >= 0, negative: tx.amount < 0 }">{{ tx.amount >= 0 ? '+' : '' }}{{ tx.amount.toFixed(2) }}</span>
        </div>
      </TransitionGroup>
      <div v-if="!transactions.length" class="empty-state">暂无流水记录</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const transactions = ref([])
const balance = ref(0)

function fmtTime(ts) { return ts ? new Date(ts).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '' }

onMounted(async () => {
  try {
    const [txs, b] = await Promise.all([api.getTransactions(), api.getBalance()])
    transactions.value = txs
    balance.value = b.balance.toFixed(2)
  } catch (e) { window.toast('加载失败: ' + e.message, true) }
})
</script>

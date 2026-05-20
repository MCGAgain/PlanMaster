<!-- frontend/src/components/business/WishCard.vue -->
<template>
  <GlassCard class="wish-card">
    <div class="wish-header">
      <h3>{{ wish.name }}</h3>
      <span class="wish-cost">{{ wish.virtual_cost }} 虚拟价值</span>
    </div>

    <div class="wish-details">
      <div v-if="wish.real_price" class="detail-item">
        <span class="detail-label">真实价格</span>
        <span class="detail-value">¥{{ wish.real_price }}</span>
      </div>
      <div v-if="wish.quantity !== null" class="detail-item">
        <span class="detail-label">剩余次数</span>
        <span class="detail-value">{{ wish.quantity }}</span>
      </div>
    </div>

    <div class="wish-actions">
      <GlassButton
        variant="primary"
        :disabled="!canRedeem"
        @click="$emit('redeem', wish)"
      >
        {{ canRedeem ? '兑换' : '余额不足' }}
      </GlassButton>
      <GlassButton
        variant="secondary"
        @click="$emit('edit', wish)"
      >
        编辑
      </GlassButton>
      <GlassButton
        variant="danger"
        @click="$emit('delete', wish)"
      >
        删除
      </GlassButton>
    </div>
  </GlassCard>
</template>

<script setup>
import { computed } from 'vue'
import GlassCard from '../common/GlassCard.vue'
import GlassButton from '../common/GlassButton.vue'

const props = defineProps({
  wish: {
    type: Object,
    required: true
  },
  balance: {
    type: Number,
    default: 0
  }
})

defineEmits(['redeem', 'edit', 'delete'])

const canRedeem = computed(() => {
  return props.balance >= props.wish.virtual_cost
})
</script>

<style scoped>
.wish-card {
  margin-bottom: 1rem;
}

.wish-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.wish-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text);
}

.wish-cost {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--primary);
}

.wish-details {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.detail-value {
  font-size: 0.95rem;
  color: var(--text);
}

.wish-actions {
  display: flex;
  gap: 0.5rem;
}
</style>

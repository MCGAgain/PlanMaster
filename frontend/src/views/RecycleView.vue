<template>
  <div class="recycle-view">
    <Header title="回收站" />

    <div class="recycle-content">
      <div class="plans-list">
        <GlassCard
          v-for="plan in completedPlans"
          :key="plan.id"
          class="recycle-item"
        >
          <div class="item-header">
            <div class="item-info">
              <h3 :class="{ completed: plan.completed }">{{ plan.title }}</h3>
              <span class="item-type">{{ typeLabels[plan.plan_type] || plan.plan_type }}</span>
            </div>
            <div class="item-actions">
              <GlassButton
                variant="success"
                size="small"
                @click="handleRestore(plan)"
              >
                恢复
              </GlassButton>
              <GlassButton
                variant="danger"
                size="small"
                @click="handlePermanentDelete(plan)"
              >
                永久删除
              </GlassButton>
            </div>
          </div>
          <p v-if="plan.description" class="item-description">
            {{ plan.description }}
          </p>
        </GlassCard>
      </div>

      <GlassCard v-if="completedPlans.length === 0 && !loading" class="empty-state">
        <p>回收站为空</p>
      </GlassCard>

      <GlassCard v-if="loading" class="loading-state">
        <p>加载中...</p>
      </GlassCard>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import Header from '@/components/layout/Header.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassButton from '@/components/common/GlassButton.vue'

const completedPlans = ref([])
const loading = ref(false)

const typeLabels = {
  today: '今日',
  weekly: '周',
  monthly: '月',
  yearly: '年'
}

onMounted(async () => {
  await fetchCompletedPlans()
})

const fetchCompletedPlans = async () => {
  loading.value = true
  try {
    completedPlans.value = await api.getCompletedPlans()
  } catch (error) {
    console.error('Failed to fetch completed plans:', error)
  } finally {
    loading.value = false
  }
}

const handleRestore = async (plan) => {
  try {
    await api.restorePlan(plan.id)
    completedPlans.value = completedPlans.value.filter(p => p.id !== plan.id)
  } catch (error) {
    console.error('Failed to restore plan:', error)
  }
}

const handlePermanentDelete = async (plan) => {
  if (confirm(`确定要永久删除"${plan.title}"吗？此操作不可撤销。`)) {
    try {
      await api.deletePlan(plan.id)
      completedPlans.value = completedPlans.value.filter(p => p.id !== plan.id)
    } catch (error) {
      console.error('Failed to permanently delete plan:', error)
    }
  }
}
</script>

<style scoped>
.recycle-view {
  min-height: 100vh;
}

.recycle-content {
  padding: 2rem;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recycle-item {
  margin-bottom: 0;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-info h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text);
}

.item-info h3.completed {
  text-decoration: line-through;
  color: var(--text-muted);
}

.item-type {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.item-actions {
  display: flex;
  gap: 0.5rem;
}

.item-description {
  margin: 0.75rem 0 0;
  color: var(--text-soft);
  font-size: 0.95rem;
}

.empty-state,
.loading-state {
  text-align: center;
  color: var(--text-muted);
}
</style>

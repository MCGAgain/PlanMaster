<!-- frontend/src/components/business/PlanCard.vue -->
<template>
  <GlassCard class="plan-card" :class="{ completed: plan.completed }">
    <div class="plan-header">
      <div class="plan-title">
        <h3>{{ plan.title }}</h3>
        <span v-if="plan.priority" class="priority-badge" :class="priorityClass">
          {{ plan.priority }}
        </span>
      </div>
      <div class="plan-actions">
        <GlassButton
          v-if="!plan.completed"
          variant="success"
          size="small"
          @click="$emit('complete', plan)"
        >
          完成
        </GlassButton>
        <GlassButton
          variant="secondary"
          size="small"
          @click="$emit('edit', plan)"
        >
          编辑
        </GlassButton>
        <GlassButton
          variant="danger"
          size="small"
          @click="$emit('delete', plan)"
        >
          删除
        </GlassButton>
      </div>
    </div>

    <p v-if="plan.description" class="plan-description">
      {{ plan.description }}
    </p>

    <div class="plan-meta">
      <div v-if="plan.virtual_value" class="meta-item">
        <span class="meta-label">虚拟价值</span>
        <span class="meta-value">{{ plan.virtual_value }}</span>
      </div>
      <div v-if="plan.suggested_time" class="meta-item">
        <span class="meta-label">建议时间</span>
        <span class="meta-value">{{ plan.suggested_time }}</span>
      </div>
      <div v-if="plan.progress !== undefined" class="meta-item">
        <span class="meta-label">进度</span>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${plan.progress}%` }"
          />
        </div>
        <span class="meta-value">{{ plan.progress }}%</span>
      </div>
    </div>
  </GlassCard>
</template>

<script setup>
import { computed } from 'vue'
import GlassCard from '../common/GlassCard.vue'
import GlassButton from '../common/GlassButton.vue'

const props = defineProps({
  plan: {
    type: Object,
    required: true
  }
})

defineEmits(['complete', 'edit', 'delete'])

const priorityClass = computed(() => {
  const priority = props.plan.priority
  if (priority >= 80) return 'high'
  if (priority >= 50) return 'medium'
  return 'low'
})
</script>

<style scoped>
.plan-card {
  margin-bottom: 1rem;
}

.plan-card.completed {
  opacity: 0.7;
}

.plan-card.completed .plan-title h3 {
  text-decoration: line-through;
  color: var(--text-muted);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.plan-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.plan-title h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text);
}

.priority-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.priority-badge.high {
  background: rgba(248, 113, 113, 0.2);
  color: var(--danger);
}

.priority-badge.medium {
  background: rgba(251, 191, 36, 0.2);
  color: var(--warning);
}

.priority-badge.low {
  background: rgba(52, 211, 153, 0.2);
  color: var(--success);
}

.plan-actions {
  display: flex;
  gap: 0.5rem;
}

.plan-description {
  margin: 0 0 1rem;
  color: var(--text-soft);
  font-size: 0.95rem;
  line-height: 1.5;
}

.plan-meta {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.meta-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.meta-value {
  font-size: 0.9rem;
  color: var(--text);
  font-weight: 500;
}

.progress-bar {
  width: 100px;
  height: 6px;
  background: var(--glass-bg);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 3px;
  transition: width var(--transition-normal);
}
</style>

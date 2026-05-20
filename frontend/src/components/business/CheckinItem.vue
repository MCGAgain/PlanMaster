<!-- frontend/src/components/business/CheckinItem.vue -->
<template>
  <GlassCard class="checkin-item" :class="{ checked: checkin.checkedToday }">
    <div class="checkin-main">
      <div class="checkin-info">
        <h3>{{ checkin.name }}</h3>
        <div class="checkin-stats">
          <span class="streak">连续 {{ checkin.streak || 0 }} 天</span>
          <span class="total">累计 {{ checkin.total_count || 0 }} 次</span>
        </div>
      </div>

      <div class="checkin-action">
        <button
          class="checkin-button"
          :class="{ checked: checkin.checkedToday }"
          @click="$emit('toggle', checkin)"
        >
          <span class="check-icon">{{ checkin.checkedToday ? '✓' : '' }}</span>
        </button>
      </div>
    </div>

    <div v-if="showActions" class="checkin-actions">
      <GlassButton
        variant="secondary"
        size="small"
        @click="$emit('edit', checkin)"
      >
        编辑
      </GlassButton>
      <GlassButton
        variant="danger"
        size="small"
        @click="$emit('delete', checkin)"
      >
        删除
      </GlassButton>
    </div>
  </GlassCard>
</template>

<script setup>
import GlassCard from '../common/GlassCard.vue'
import GlassButton from '../common/GlassButton.vue'

defineProps({
  checkin: {
    type: Object,
    required: true
  },
  showActions: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle', 'edit', 'delete'])
</script>

<style scoped>
.checkin-item {
  margin-bottom: 0.75rem;
}

.checkin-item.checked {
  border-color: var(--success);
  background: rgba(52, 211, 153, 0.05);
}

.checkin-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkin-info h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  color: var(--text);
}

.checkin-stats {
  display: flex;
  gap: 1rem;
}

.streak,
.total {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.checkin-action {
  display: flex;
  align-items: center;
}

.checkin-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--glass-border);
  background: var(--glass-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast) var(--ease-default);
}

.checkin-button:hover {
  border-color: var(--primary);
  background: var(--primary-light);
}

.checkin-button.checked {
  border-color: var(--success);
  background: var(--success);
}

.check-icon {
  font-size: 1.2rem;
  color: white;
  font-weight: bold;
}

.checkin-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--glass-border);
}
</style>

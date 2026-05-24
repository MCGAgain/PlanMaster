<!-- frontend/src/components/business/CheckinItem.vue -->
<template>
  <GlassCard 
    class="checkin-item" 
    :class="{ checked: checkin.checkedToday }"
    :hoverable="true"
    @click="handleToggle"
  >
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
          ref="checkBtn"
          class="checkin-button"
          :class="{ checked: checkin.checkedToday }"
          @click.stop="handleToggle"
        >
          <span class="check-icon" v-if="checkin.checkedToday">✓</span>
        </button>
      </div>
    </div>

    <div v-if="showActions" class="checkin-actions" @click.stop>
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
import { ref } from 'vue'
import gsap from 'gsap'
import GlassCard from '../common/GlassCard.vue'
import GlassButton from '../common/GlassButton.vue'

const props = defineProps({
  checkin: {
    type: Object,
    required: true
  },
  showActions: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle', 'edit', 'delete'])
const checkBtn = ref(null)

const handleToggle = () => {
  const isChecking = !props.checkin.checkedToday
  
  if (isChecking && checkBtn.value) {
    gsap.fromTo(checkBtn.value, 
      { scale: 0.8 },
      { scale: 1.2, duration: 0.2, ease: 'back.out(3)', onComplete: () => {
        gsap.to(checkBtn.value, { scale: 1, duration: 0.2 })
      }}
    )
  }
  
  emit('toggle', props.checkin)
}
</script>

<style scoped>
.checkin-item {
  margin-bottom: 0.75rem;
  transition: border-color 0.4s ease, background 0.4s ease;
}

.checkin-item.checked {
  border-color: var(--success);
  background: rgba(52, 211, 153, 0.08);
}

.checkin-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkin-info h3 {
  margin: 0 0 0.25rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
}

.checkin-stats {
  display: flex;
  gap: 1rem;
}

.streak,
.total {
  font-size: 0.85rem;
  color: var(--text-soft);
  font-weight: 500;
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
  transition: all 0.3s var(--ease-default);
  position: relative;
  overflow: hidden;
}

.checkin-button:hover {
  border-color: var(--primary);
  background: var(--primary-light);
  transform: scale(1.05);
}

.checkin-button.checked {
  border-color: var(--success);
  background: var(--success);
  box-shadow: 0 0 15px rgba(52, 211, 153, 0.4);
}

.check-icon {
  font-size: 1.4rem;
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


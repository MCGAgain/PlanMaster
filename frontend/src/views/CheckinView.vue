<template>
  <div class="checkin-view">
    <Header title="打卡">
      <template #actions>
        <GlassButton variant="primary" @click="showAddModal = true">
          + 新增打卡项
        </GlassButton>
      </template>
    </Header>

    <div class="checkin-content">
      <GlassCard v-if="checkinsStore.checkins.length > 0" class="summary-card">
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">今日已打卡</span>
            <span class="summary-value">{{ checkinsStore.completedToday }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">累计连续打卡</span>
            <span class="summary-value">{{ checkinsStore.totalStreak }}</span>
          </div>
        </div>
      </GlassCard>

      <div class="checkins-list">
        <CheckinItem
          v-for="checkin in checkinsStore.todayCheckins"
          :key="checkin.id"
          :checkin="checkin"
          showActions
          @toggle="handleToggle"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </div>

      <GlassCard v-if="checkinsStore.checkins.length === 0 && !checkinsStore.loading" class="empty-state">
        <p>暂无打卡项，点击右上角添加</p>
      </GlassCard>

      <GlassCard v-if="checkinsStore.loading" class="loading-state">
        <p>加载中...</p>
      </GlassCard>
    </div>

    <GlassModal v-model="showAddModal" title="新增打卡项">
      <form class="add-form" @submit.prevent="handleAdd">
        <GlassInput
          v-model="newName"
          label="打卡项名称"
          placeholder="输入打卡项名称"
          :error="addError"
        />
        <div class="form-actions">
          <GlassButton type="submit" variant="primary">添加</GlassButton>
          <GlassButton type="button" variant="secondary" @click="showAddModal = false">取消</GlassButton>
        </div>
      </form>
    </GlassModal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCheckinsStore } from '@/stores/checkins'
import Header from '@/components/layout/Header.vue'
import CheckinItem from '@/components/business/CheckinItem.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassModal from '@/components/common/GlassModal.vue'
import GlassButton from '@/components/common/GlassButton.vue'
import GlassInput from '@/components/common/GlassInput.vue'

const checkinsStore = useCheckinsStore()

const showAddModal = ref(false)
const newName = ref('')
const addError = ref('')

onMounted(() => {
  checkinsStore.fetchCheckins()
})

const handleToggle = async (checkin) => {
  if (!checkin.checkedToday) {
    await checkinsStore.checkin(checkin.id)
  }
}

const handleEdit = (checkin) => {
  // CheckinItem doesn't have an edit form in the API, so we'll just log it
  console.log('Edit checkin:', checkin)
}

const handleDelete = async (checkin) => {
  if (confirm(`确定要删除"${checkin.name}"吗？`)) {
    await checkinsStore.deleteCheckin(checkin.id)
  }
}

const handleAdd = async () => {
  addError.value = ''
  if (!newName.value.trim()) {
    addError.value = '请输入打卡项名称'
    return
  }
  try {
    await checkinsStore.createCheckin(newName.value.trim())
    newName.value = ''
    showAddModal.value = false
  } catch (error) {
    console.error('Failed to create checkin:', error)
  }
}
</script>

<style scoped>
.checkin-view {
  min-height: 100vh;
}

.checkin-content {
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
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary);
}

.checkins-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty-state,
.loading-state {
  text-align: center;
  color: var(--text-muted);
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>

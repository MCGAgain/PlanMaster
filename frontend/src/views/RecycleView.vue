<template>
  <div class="recycle-view">
    <Header title="回收站">
      <template #actions>
        <GlassButton variant="secondary" size="small" @click="toggleSelectAll">全选</GlassButton>
        <GlassButton variant="danger" size="small" @click="handleBatchDelete">批量删除</GlassButton>
        <GlassButton variant="secondary" size="small" @click="handleBatchRestore">批量恢复</GlassButton>
      </template>
    </Header>

    <!-- 筛选栏 -->
    <div class="recycle-filter-bar">
      <div class="recycle-filter-btns">
        <button
          v-for="filter in filters"
          :key="filter.type"
          class="btn recycle-filter-btn"
          :class="{ active: activeFilter === filter.type }"
          @click="setFilter(filter.type)"
        >
          {{ filter.label }}
          <span class="filter-count">{{ filter.count }}</span>
        </button>
      </div>
      <div class="recycle-search-wrap">
        <input
          v-model="searchKeyword"
          type="text"
          class="recycle-search-input"
          placeholder="搜索计划标题... (支持拼音)"
        />
        <span
          v-if="searchKeyword"
          class="recycle-search-clear"
          @click="clearSearch"
        >
          &times;
        </span>
      </div>
    </div>

    <!-- 计划列表 -->
    <div class="plans-list">
      <div
        v-for="plan in filteredPlans"
        :key="plan.id"
        class="plan-card completed recycle-card"
      >
        <label class="recycle-check">
          <input
            type="checkbox"
            class="recycle-checkbox"
            :value="plan.id"
            v-model="selectedIds"
          />
        </label>
        <div class="plan-card-body">
          <div class="plan-card-title">{{ plan.title }}</div>
          <div class="plan-card-meta">
            <span
              class="plan-type-tag"
              :style="{ background: getTypeColor(plan.plan_type) }"
            >
              {{ getTypeLabel(plan.plan_type) }}
            </span>
            <span v-if="plan.virtual_value > 0" class="plan-badge badge-value">
              {{ plan.virtual_value }} 价值
            </span>
          </div>
          <div v-if="plan.description" class="plan-card-desc">
            {{ plan.description }}
          </div>
          <div class="recycle-info">完成于 {{ formatTime(plan.completed_at) }}</div>
          <div class="plan-card-actions">
            <GlassButton variant="secondary" size="small" @click="handleRestore(plan.id)">
              恢复
            </GlassButton>
            <GlassButton variant="danger" size="small" @click="handlePermanentDelete(plan.id)">
              永久删除
            </GlassButton>
          </div>
        </div>
      </div>
    </div>

    <GlassCard v-if="filteredPlans.length === 0" class="empty-state">
      <p>{{ allPlans.length > 0 ? '没有匹配的计划' : '回收站为空' }}</p>
    </GlassCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePinyin } from '@/composables/usePinyin'
import api from '@/api'
import Header from '@/components/layout/Header.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassButton from '@/components/common/GlassButton.vue'

const { matchPinyin } = usePinyin()

const allPlans = ref([])
const activeFilter = ref('all')
const searchKeyword = ref('')
const selectedIds = ref([])

const PLAN_TYPE_LABELS = {
  important: '重要事项',
  today: '今日待办',
  weekly: '周计划',
  monthly: '月计划',
  yearly: '年计划'
}

const PLAN_TYPE_COLORS = {
  important: '#ef4444',
  today: '#7c6ef0',
  weekly: '#3b82f6',
  monthly: '#10b981',
  yearly: '#f59e0b'
}

const filters = computed(() => {
  const counts = { all: allPlans.value.length, today: 0, weekly: 0, monthly: 0, yearly: 0 }
  allPlans.value.forEach(p => {
    if (counts[p.plan_type] !== undefined) counts[p.plan_type]++
  })
  return [
    { type: 'all', label: '全部', count: counts.all },
    { type: 'today', label: '今日待办', count: counts.today },
    { type: 'weekly', label: '周计划', count: counts.weekly },
    { type: 'monthly', label: '月计划', count: counts.monthly },
    { type: 'yearly', label: '年计划', count: counts.yearly }
  ]
})

const filteredPlans = computed(() => {
  let filtered = allPlans.value
  if (activeFilter.value !== 'all') {
    filtered = filtered.filter(p => p.plan_type === activeFilter.value)
  }
  if (searchKeyword.value) {
    filtered = filtered.filter(p => matchPinyin(p.title, searchKeyword.value))
  }
  return filtered
})

onMounted(async () => {
  await loadRecycleBin()
})

const loadRecycleBin = async () => {
  try {
    const plans = await api.getCompletedPlans()
    allPlans.value = plans
  } catch (e) {
    alert('加载失败: ' + e.message)
  }
}

const setFilter = (type) => {
  activeFilter.value = type
}

const clearSearch = () => {
  searchKeyword.value = ''
}

const toggleSelectAll = () => {
  if (selectedIds.value.length === filteredPlans.value.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredPlans.value.map(p => p.id)
  }
}

const handleRestore = async (id) => {
  try {
    await api.restorePlan(id)
    await loadRecycleBin()
    selectedIds.value = selectedIds.value.filter(sid => sid !== id)
  } catch (e) {
    alert('恢复失败: ' + e.message)
  }
}

const handlePermanentDelete = async (id) => {
  if (!confirm('确定永久删除？此操作不可撤销。')) return
  try {
    await api.deletePlan(id)
    await loadRecycleBin()
    selectedIds.value = selectedIds.value.filter(sid => sid !== id)
  } catch (e) {
    alert('删除失败: ' + e.message)
  }
}

const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) {
    alert('请先选择要删除的计划')
    return
  }
  if (!confirm(`确定永久删除 ${selectedIds.value.length} 条计划？此操作不可撤销。`)) return
  try {
    await api.batchDeletePlans(selectedIds.value)
    await loadRecycleBin()
    selectedIds.value = []
  } catch (e) {
    alert('删除失败: ' + e.message)
  }
}

const handleBatchRestore = async () => {
  if (selectedIds.value.length === 0) {
    alert('请先选择要恢复的计划')
    return
  }
  try {
    for (const id of selectedIds.value) {
      await api.restorePlan(id)
    }
    await loadRecycleBin()
    selectedIds.value = []
  } catch (e) {
    alert('恢复失败: ' + e.message)
  }
}

const getTypeLabel = (type) => PLAN_TYPE_LABELS[type] || type
const getTypeColor = (type) => PLAN_TYPE_COLORS[type] || '#7c6ef0'

const formatTime = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.recycle-view {
  min-height: 100vh;
}

.recycle-filter-bar {
  margin: 0 2rem;
  padding: 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  backdrop-filter: blur(var(--glass-blur));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.recycle-filter-btns {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.recycle-filter-btn {
  padding: 0.4rem 0.8rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 0.85rem;
}

.recycle-filter-btn.active {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
}

.filter-count {
  margin-left: 0.25rem;
  font-size: 0.75rem;
  opacity: 0.7;
}

.recycle-search-wrap {
  position: relative;
}

.recycle-search-input {
  padding: 0.5rem 2rem 0.5rem 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  color: var(--text);
  width: 200px;
}

.recycle-search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.recycle-search-clear {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: var(--text-muted);
  font-size: 1.2rem;
}

.plans-list {
  padding: 1rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.plan-card {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  backdrop-filter: blur(var(--glass-blur));
}

.plan-card.completed {
  opacity: 0.8;
}

.recycle-check {
  display: flex;
  align-items: flex-start;
  padding-top: 0.25rem;
}

.recycle-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.plan-card-body {
  flex: 1;
}

.plan-card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.plan-card-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.plan-type-tag {
  font-size: 0.7rem;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  color: white;
  font-weight: 500;
}

.plan-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.badge-value {
  background: rgba(52, 211, 153, 0.1);
  color: var(--success);
}

.plan-card-desc {
  font-size: 0.9rem;
  color: var(--text-soft);
  margin-bottom: 0.5rem;
}

.recycle-info {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.plan-card-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  margin: 2rem;
  text-align: center;
  color: var(--text-muted);
}
</style>

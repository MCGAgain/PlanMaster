<template>
  <div class="page active">
    <div class="page-header">
      <h2>回收站</h2>
      <div class="page-actions">
        <button class="btn btn-glass btn-sm" @click="toggleSelectAll">全选</button>
        <button class="btn btn-danger btn-sm" @click="batchDeleteRecycle">批量删除</button>
        <button class="btn btn-glass btn-sm" @click="batchRestoreRecycle">批量恢复</button>
      </div>
    </div>
    <div class="recycle-filter-bar">
      <div class="recycle-filter-btns">
        <button class="btn btn-sm recycle-filter-btn" :class="{ active: filterType === 'all' }" @click="setFilter('all')">全部 <span class="filter-count">{{ allPlans.length }}</span></button>
        <button class="btn btn-sm recycle-filter-btn" :class="{ active: filterType === 'today' }" @click="setFilter('today')">今日待办 <span class="filter-count">{{ filterCounts.today }}</span></button>
        <button class="btn btn-sm recycle-filter-btn" :class="{ active: filterType === 'weekly' }" @click="setFilter('weekly')">周计划 <span class="filter-count">{{ filterCounts.weekly }}</span></button>
        <button class="btn btn-sm recycle-filter-btn" :class="{ active: filterType === 'monthly' }" @click="setFilter('monthly')">月计划 <span class="filter-count">{{ filterCounts.monthly }}</span></button>
        <button class="btn btn-sm recycle-filter-btn" :class="{ active: filterType === 'yearly' }" @click="setFilter('yearly')">年计划 <span class="filter-count">{{ filterCounts.yearly }}</span></button>
      </div>
      <div class="recycle-search-wrap">
        <input type="text" class="recycle-search-input" placeholder="搜索计划标题... (支持拼音)" v-model="searchKeyword">
        <span class="recycle-search-clear" v-show="searchKeyword" @click="searchKeyword = ''">&times;</span>
      </div>
    </div>
    <div class="plan-list">
      <template v-if="filteredPlans.length">
        <div v-for="p in filteredPlans" :key="p.id" class="plan-card completed recycle-card" :data-id="p.id">
          <label class="recycle-check"><input type="checkbox" class="recycle-checkbox" :value="p.id" v-model="selectedIds"></label>
          <div class="plan-card-body">
            <div class="plan-card-title">{{ p.title }}</div>
            <div class="plan-card-meta">
              <span class="plan-type-tag" :style="{ background: PLAN_TYPE_COLORS[p.plan_type] || '#7c6ef0' }">{{ PLAN_TYPE_LABELS[p.plan_type] || p.plan_type }}</span>
              <span v-if="p.virtual_value > 0" class="plan-badge badge-value">{{ p.virtual_value }} 价值</span>
            </div>
            <div v-if="p.description" class="plan-card-desc">{{ p.description }}</div>
            <div class="recycle-info">完成于 {{ fmtTime(p.completed_at) }}</div>
            <div class="plan-card-actions">
              <button class="btn btn-glass btn-sm" @click="restorePlan(p.id)">恢复</button>
              <button class="btn btn-danger btn-sm" @click="permanentDelete(p.id)">永久删除</button>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="empty-state">{{ allPlans.length ? '没有匹配的计划' : '回收站为空' }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePinyin } from '@/composables/usePinyin'
import api from '@/api'

const { matchPinyin } = usePinyin()
const PLAN_TYPE_LABELS = { important: '重要事项', today: '今日待办', weekly: '周计划', monthly: '月计划', yearly: '年计划' }
const PLAN_TYPE_COLORS = { important: '#ef4444', today: '#7c6ef0', weekly: '#3b82f6', monthly: '#10b981', yearly: '#f59e0b' }

const allPlans = ref([])
const filterType = ref('all')
const searchKeyword = ref('')
const selectedIds = ref([])

function fmtTime(ts) { return ts ? new Date(ts).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '' }

const filterCounts = computed(() => {
  const counts = { today: 0, weekly: 0, monthly: 0, yearly: 0 }
  allPlans.value.forEach(p => { if (counts[p.plan_type] !== undefined) counts[p.plan_type]++ })
  return counts
})

const filteredPlans = computed(() => {
  let filtered = allPlans.value
  if (filterType.value !== 'all') filtered = filtered.filter(p => p.plan_type === filterType.value)
  if (searchKeyword.value) filtered = filtered.filter(p => matchPinyin(p.title, searchKeyword.value))
  return filtered
})

const setFilter = (type) => { filterType.value = type }
const toggleSelectAll = () => { const all = filteredPlans.value.map(p => p.id); selectedIds.value = selectedIds.value.length === all.length ? [] : all }

const loadRecycleBin = async () => {
  try { allPlans.value = await api.getCompletedPlans() } catch (e) { window.toast('加载失败: ' + e.message, true) }
}

const restorePlan = async (id) => {
  try { await api.restorePlan(id); window.toast('计划已恢复'); await loadRecycleBin(); window.loadBalance && window.loadBalance() }
  catch (e) { window.toast('恢复失败: ' + e.message, true) }
}

const permanentDelete = async (id) => {
  if (!confirm('确定永久删除？此操作不可撤销。')) return
  try { await api.deletePlan(id); window.toast('已永久删除'); await loadRecycleBin() }
  catch (e) { window.toast('删除失败: ' + e.message, true) }
}

const batchDeleteRecycle = async () => {
  if (!selectedIds.value.length) { window.toast('请先选择要删除的计划', true); return }
  if (!confirm(`确定永久删除 ${selectedIds.value.length} 条计划？此操作不可撤销。`)) return
  try { await api.batchDeletePlans(selectedIds.value); window.toast(`已删除 ${selectedIds.value.length} 条计划`); selectedIds.value = []; await loadRecycleBin() }
  catch (e) { window.toast('删除失败: ' + e.message, true) }
}

const batchRestoreRecycle = async () => {
  if (!selectedIds.value.length) { window.toast('请先选择要恢复的计划', true); return }
  try { for (const id of selectedIds.value) await api.restorePlan(id); window.toast(`已恢复 ${selectedIds.value.length} 条计划`); selectedIds.value = []; await loadRecycleBin(); window.loadBalance && window.loadBalance() }
  catch (e) { window.toast('恢复失败: ' + e.message, true) }
}

onMounted(() => { loadRecycleBin() })
</script>

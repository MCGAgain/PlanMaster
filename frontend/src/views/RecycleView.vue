<template>
  <div class="page active">
    <div class="page-header">
      <h2>回收站</h2>
      <div class="page-actions">
        <button class="btn btn-glass btn-sm" @click="toggleSelectAll">
          {{ selectedIds.length === filteredPlans.length && filteredPlans.length > 0 ? '取消全选' : '全选' }}
        </button>
        <button class="btn btn-danger btn-sm" @click="batchDeleteRecycle" :disabled="!selectedIds.length">批量删除</button>
        <button class="btn btn-glass btn-sm" @click="batchRestoreRecycle" :disabled="!selectedIds.length">批量恢复</button>
      </div>
    </div>

    <div class="recycle-filter-bar">
      <div class="recycle-filter-btns">
        <button 
          v-for="type in filterOptions" 
          :key="type.value"
          class="btn btn-sm recycle-filter-btn" 
          :class="{ active: filterType === type.value }" 
          @click="setFilter(type.value)"
        >
          {{ type.label }} 
          <span class="filter-count">{{ getCount(type.value) }}</span>
        </button>
      </div>
      <div class="recycle-search-wrap">
        <input 
          type="text" 
          class="recycle-search-input" 
          placeholder="搜索计划标题... (支持拼音)" 
          v-model="searchKeyword"
        >
        <span class="recycle-search-clear" v-show="searchKeyword" @click="searchKeyword = ''">&times;</span>
      </div>
    </div>

    <div class="plan-list">
      <TransitionGroup 
        name="list" 
        tag="div" 
        class="plan-list-inner"
        @before-enter="onItemBeforeEnter"
        @enter="onItemEnter"
        @leave="onItemLeave"
      >
        <div v-for="(p, idx) in filteredPlans" :key="p.id" class="plan-card-wrapper" :data-index="idx">
          <PlanCard
            :plan="p"
            mode="recycle"
            :selected="selectedIds.includes(p.id)"
            @select="toggleSelect"
            @restore="restorePlan"
            @deletePermanent="permanentDelete"
          />
        </div>
      </TransitionGroup>
      
      <Transition name="fade">
        <div v-if="!filteredPlans.length" class="empty-state">
          <div class="empty-icon">&#128465;</div>
          <p>{{ allPlans.length ? '没有匹配的计划' : '回收站为空' }}</p>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { usePinyin } from '@/composables/usePinyin'
import gsap from 'gsap'
import api from '@/api'
import PlanCard from '@/components/business/PlanCard.vue'

const { matchPinyin } = usePinyin()

const allPlans = ref([])
const filterType = ref('all')
const searchKeyword = ref('')
const selectedIds = ref([])

/**
 * GSAP Transition Group Hooks (iOS-style)
 */
function onItemBeforeEnter(el) {
  gsap.set(el, {
    opacity: 0,
    y: 30,
    scale: 0.94,
    filter: 'blur(10px)'
  })
}

function onItemEnter(el, done) {
  const delay = el.dataset.index * 0.05
  gsap.to(el, {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    duration: 0.8,
    delay: delay,
    ease: 'expo.out',
    onComplete: done
  })
}

function onItemLeave(el, done) {
  gsap.to(el, {
    opacity: 0,
    scale: 0.9,
    filter: 'blur(10px)',
    duration: 0.4,
    ease: 'power2.in',
    onComplete: done
  })
}

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '今日待办', value: 'today' },
  { label: '周计划', value: 'weekly' },
  { label: '月计划', value: 'monthly' },
  { label: '年计划', value: 'yearly' }
]

const getCount = (type) => {
  if (type === 'all') return allPlans.value.length
  return allPlans.value.filter(p => p.plan_type === type).length
}

const filteredPlans = computed(() => {
  let filtered = allPlans.value
  if (filterType.value !== 'all') filtered = filtered.filter(p => p.plan_type === filterType.value)
  if (searchKeyword.value) filtered = filtered.filter(p => matchPinyin(p.title, searchKeyword.value))
  return filtered
})

const setFilter = (type) => { filterType.value = type }

const toggleSelect = (id) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

const toggleSelectAll = () => {
  const allIds = filteredPlans.value.map(p => p.id)
  if (selectedIds.value.length === allIds.length) selectedIds.value = []
  else selectedIds.value = allIds
}

const loadRecycleBin = async () => {
  try { 
    allPlans.value = await api.getCompletedPlans()
  } catch (e) { 
    window.toast('加载失败: ' + e.message, true) 
  }
}

const restorePlan = async (p) => {
  try { 
    await api.restorePlan(p.id)
    window.toast('计划已恢复')
    await loadRecycleBin()
    window.loadBalance && window.loadBalance() 
  } catch (e) { 
    window.toast('恢复失败: ' + e.message, true) 
  }
}

const permanentDelete = async (p) => {
  if (!confirm('确定永久删除？此操作不可撤销。')) return
  try { 
    await api.deletePlan(p.id)
    window.toast('已永久删除')
    await loadRecycleBin() 
  } catch (e) { 
    window.toast('删除失败: ' + e.message, true) 
  }
}

const batchDeleteRecycle = async () => {
  if (!selectedIds.value.length) return
  if (!confirm(`确定永久删除 ${selectedIds.value.length} 条计划？`)) return
  try { 
    await api.batchDeletePlans(selectedIds.value)
    window.toast(`已永久删除 ${selectedIds.value.length} 条计划`)
    selectedIds.value = []
    await loadRecycleBin() 
  } catch (e) { 
    window.toast('操作失败: ' + e.message, true) 
  }
}

const batchRestoreRecycle = async () => {
  if (!selectedIds.value.length) return
  try { 
    for (const id of selectedIds.value) await api.restorePlan(id)
    window.toast(`已恢复 ${selectedIds.value.length} 条计划`)
    selectedIds.value = []
    await loadRecycleBin()
    window.loadBalance && window.loadBalance() 
  } catch (e) { 
    window.toast('恢复失败: ' + e.message, true) 
  }
}

onMounted(() => { loadRecycleBin() })
</script>

<style scoped>
.plan-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 2rem;
}

.plan-card-wrapper {
  will-change: transform, opacity;
}

.recycle-filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.recycle-filter-btns {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.recycle-filter-btn {
  background: var(--glass-bg);
  color: var(--text-soft);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 0.4rem 1rem;
}

.recycle-filter-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 4px 12px var(--primary-glow);
}

.filter-count {
  font-size: 0.75rem;
  opacity: 0.8;
  margin-left: 0.25rem;
}

.recycle-search-wrap {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.recycle-search-input {
  width: 100%;
  padding: 0.6rem 1rem;
  padding-right: 2.5rem;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text);
  outline: none;
  transition: all 0.3s ease;
}

.recycle-search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.recycle-search-clear {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: var(--text-muted);
  font-size: 1.2rem;
}

.empty-state {
  text-align: center;
  padding: 5rem 2rem;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.3;
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.list-move {
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.list-leave-active {
  position: absolute;
  width: 100%;
}
</style>

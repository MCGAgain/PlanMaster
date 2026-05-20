<template>
  <div class="today-view">
    <Header title="今日待办" searchable @search="handleSearch">
      <template #actions>
        <GlassButton variant="primary" @click="showAddModal = true">
          + 新增计划
        </GlassButton>
        <GlassButton variant="gradient" @click="handleAiSort">
          &#9889; AI智能排序
        </GlassButton>
      </template>
    </Header>

    <!-- 分类进度条 -->
    <div class="category-progress">
      <div class="category-progress-info">
        <span class="category-progress-label">完成进度</span>
        <span class="category-progress-text">{{ categoryProgress }}%</span>
      </div>
      <div class="category-progress-track">
        <div class="category-progress-bar" :style="{ width: `${categoryProgress}%` }" />
      </div>
    </div>

    <!-- 个性签名 -->
    <div v-if="currentSignature" class="signature-bar show">
      {{ currentSignature }}
    </div>

    <!-- 计划列表 -->
    <div class="plans-list">
      <PlanCard
        v-for="plan in filteredPlans"
        :key="plan.id"
        :plan="plan"
        :is-focusing="activeFocusSession?.plan_id === plan.id"
        :timer-remaining="timers[plan.id]?.remaining ?? null"
        @complete="handleComplete"
        @edit="handleEdit"
        @delete="handleDelete"
        @toggle-timer="handleToggleTimer"
        @toggle-focus="handleToggleFocus"
        @update-progress="handleUpdateProgress"
      />
    </div>

    <GlassCard v-if="filteredPlans.length === 0" class="empty-state">
      <p>暂无今日待办，点击右上角添加</p>
    </GlassCard>

    <!-- 新增计划弹窗 -->
    <GlassModal v-model="showAddModal" title="新增今日计划">
      <PlanForm @submit="handleAdd" @cancel="showAddModal = false" />
    </GlassModal>

    <!-- 编辑计划弹窗 -->
    <GlassModal v-model="showEditModal" title="编辑计划">
      <PlanForm
        :plan="editingPlan"
        @submit="handleUpdate"
        @cancel="showEditModal = false"
      />
    </GlassModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePlansStore } from '@/stores/plans'
import { usePinyin } from '@/composables/usePinyin'
import api from '@/api'
import Header from '@/components/layout/Header.vue'
import PlanCard from '@/components/business/PlanCard.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassModal from '@/components/common/GlassModal.vue'
import GlassButton from '@/components/common/GlassButton.vue'
import PlanForm from '@/components/forms/PlanForm.vue'

const plansStore = usePlansStore()
const { matchPinyin } = usePinyin()

const showAddModal = ref(false)
const showEditModal = ref(false)
const editingPlan = ref(null)
const searchQuery = ref('')
const categoryProgress = ref(0)
const signatures = ref([])
const sigIndex = ref(0)
const currentSignature = ref('')

// 倒计时器
const timers = ref({})

// 专注会话
const activeFocusSession = ref(null)

const plans = computed(() => plansStore.todayPlans)

const filteredPlans = computed(() => {
  if (!searchQuery.value) return plans.value
  return plans.value.filter(p =>
    matchPinyin(p.title, searchQuery.value) ||
    matchPinyin(p.description || '', searchQuery.value)
  )
})

onMounted(async () => {
  plansStore.setCurrentType('today')
  await plansStore.fetchPlans()
  await loadCategoryProgress()
  await loadSignatures()
  await restoreFocusSession()
})

onUnmounted(() => {
  // 清理所有定时器
  Object.values(timers.value).forEach(t => {
    if (t.interval) clearInterval(t.interval)
  })
})

const handleSearch = (query) => {
  searchQuery.value = query
}

const loadCategoryProgress = async () => {
  try {
    const progress = await api.getPlanProgress('today')
    categoryProgress.value = progress.percentage || 0
  } catch (e) {
    console.error('Failed to load category progress:', e)
  }
}

const loadSignatures = async () => {
  try {
    const rows = await api.getSignatures()
    signatures.value = rows.map(r => r.content).filter(c => c.trim())
    showNextSignature()
  } catch (e) {
    console.error('Failed to load signatures:', e)
  }
}

const showNextSignature = () => {
  if (signatures.value.length === 0) {
    currentSignature.value = ''
    return
  }
  currentSignature.value = signatures.value[sigIndex.value % signatures.value.length]
  sigIndex.value++
}

const handleAiSort = async () => {
  try {
    const result = await api.sortPlans('today')
    await plansStore.fetchPlans()
    await loadCategoryProgress()
    alert(`AI排序完成，已更新 ${result.length} 条计划`)
  } catch (e) {
    alert('AI排序失败: ' + e.message)
  }
}

const handleComplete = async (plan) => {
  try {
    // 停止倒计时
    if (timers.value[plan.id]) {
      stopTimer(plan.id)
    }
    // 停止专注
    if (activeFocusSession.value?.plan_id === plan.id) {
      await stopFocus()
    }
    await plansStore.completePlan(plan.id)
    await loadCategoryProgress()
    alert('计划已完成，虚拟价值已入账！')
  } catch (error) {
    console.error('Failed to complete plan:', error)
    alert('完成计划失败: ' + error.message)
  }
}

const handleEdit = (plan) => {
  editingPlan.value = plan
  showEditModal.value = true
}

const handleDelete = async (plan) => {
  if (!confirm('确定删除此计划？')) return
  try {
    // 停止倒计时
    if (timers.value[plan.id]) {
      stopTimer(plan.id)
    }
    // 停止专注
    if (activeFocusSession.value?.plan_id === plan.id) {
      await stopFocus()
    }
    await plansStore.deletePlan(plan.id)
    await loadCategoryProgress()
  } catch (error) {
    console.error('Failed to delete plan:', error)
    alert('删除计划失败: ' + error.message)
  }
}

const handleAdd = async (plan) => {
  try {
    await plansStore.createPlan({
      ...plan,
      plan_type: 'today'
    })
    showAddModal.value = false
    await loadCategoryProgress()
    showNextSignature()
  } catch (error) {
    console.error('Failed to create plan:', error)
    alert('创建计划失败: ' + error.message)
  }
}

const handleUpdate = async (plan) => {
  try {
    await plansStore.updatePlan(editingPlan.value.id, plan)
    showEditModal.value = false
    editingPlan.value = null
  } catch (error) {
    console.error('Failed to update plan:', error)
    alert('更新计划失败: ' + error.message)
  }
}

const handleUpdateProgress = async (planId, value) => {
  try {
    if (value >= 100) {
      // 停止倒计时
      if (timers.value[planId]) {
        stopTimer(planId)
      }
      // 停止专注
      if (activeFocusSession.value?.plan_id === planId) {
        await stopFocus()
      }
      await api.completePlan(planId)
      await plansStore.fetchPlans()
      await loadCategoryProgress()
      alert('计划已完成，虚拟价值已入账！')
    } else {
      await api.updatePlan(planId, { progress: value })
      await loadCategoryProgress()
    }
  } catch (e) {
    alert('更新失败: ' + e.message)
  }
}

// 倒计时器功能
const parseSuggestedTime = (str) => {
  if (!str) return 0
  const m = str.match(/([\d.]+)\s*(秒|分钟|小时)/)
  if (!m) return 0
  const v = parseFloat(m[1])
  return m[2] === '秒' ? v : m[2] === '分钟' ? v * 60 : v * 3600
}

const handleToggleTimer = (plan) => {
  const id = plan.id
  if (timers.value[id]) {
    stopTimer(id)
  } else {
    const sec = parseSuggestedTime(plan.suggested_time)
    if (sec > 0) startTimer(id, sec)
  }
}

const startTimer = (id, totalSec) => {
  if (timers.value[id]?.interval) return
  timers.value[id] = { remaining: totalSec, total: totalSec, startAt: Date.now(), interval: null }
  const t = timers.value[id]
  t.interval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - t.startAt) / 1000)
    t.remaining = Math.max(0, t.total - elapsed)
    if (t.remaining <= 0) {
      clearInterval(t.interval)
      delete timers.value[id]
    }
  }, 1000)
}

const stopTimer = (id) => {
  if (!timers.value[id]) return
  clearInterval(timers.value[id].interval)
  delete timers.value[id]
}

// 专注功能
const restoreFocusSession = async () => {
  try {
    const sessions = await api.getSessions()
    const unfinished = sessions.find(s => !s.end_time)
    if (!unfinished) return

    const elapsed = (Date.now() - new Date(unfinished.start_time).getTime()) / 1000
    if (elapsed > 14400) {
      await api.updateSession(unfinished.id, { end_time: new Date().toISOString() })
      return
    }

    if (unfinished.plan_id) {
      activeFocusSession.value = {
        id: unfinished.id,
        plan_id: unfinished.plan_id,
        start_time: new Date(unfinished.start_time)
      }
    }
  } catch (e) {
    console.error('Failed to restore focus session:', e)
  }
}

const handleToggleFocus = async (plan) => {
  if (activeFocusSession.value?.plan_id === plan.id) {
    await stopFocus()
  } else {
    if (activeFocusSession.value) await stopFocus()
    try {
      const session = await api.createSession({
        plan_id: plan.id,
        start_time: new Date().toISOString()
      })
      activeFocusSession.value = {
        id: session.id,
        plan_id: plan.id,
        start_time: new Date(session.start_time)
      }
      alert('专注已开始')
    } catch (e) {
      alert('启动失败: ' + e.message)
    }
  }
}

const stopFocus = async () => {
  if (!activeFocusSession.value) return
  try {
    await api.updateSession(activeFocusSession.value.id, {
      end_time: new Date().toISOString()
    })
    activeFocusSession.value = null
    await plansStore.fetchPlans()
  } catch (e) {
    alert('结束失败: ' + e.message)
  }
}
</script>

<style scoped>
.today-view {
  min-height: 100vh;
}

.category-progress {
  margin: 0 2rem;
  padding: 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  backdrop-filter: blur(var(--glass-blur));
}

.category-progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.category-progress-label {
  font-size: 0.85rem;
  color: var(--text-soft);
}

.category-progress-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary);
}

.category-progress-track {
  height: 8px;
  background: rgba(124, 110, 240, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.category-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), #a78bfa);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.signature-bar {
  margin: 0.5rem 2rem;
  padding: 0.5rem 1rem;
  background: var(--primary-light);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  color: var(--primary);
  text-align: center;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s ease;
}

.signature-bar.show {
  opacity: 1;
  transform: translateY(0);
}

.plans-list {
  padding: 1rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-state {
  margin: 2rem;
  text-align: center;
  color: var(--text-muted);
}

.btn-gradient {
  background: linear-gradient(135deg, var(--primary), #a78bfa);
  color: white;
  border: none;
}

.btn-gradient:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(124, 110, 240, 0.3);
}
</style>

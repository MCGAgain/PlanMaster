<template>
  <div class="page active">
    <div class="page-header">
      <h2>月计划</h2>
      <div class="page-actions">
        <button class="btn btn-glass" @click="showAddPlanModal">+ 新增计划</button>
        <button 
          class="btn btn-gradient ai-sort-btn" 
          :class="{ loading: aiSorting }"
          @click="aiSortPlans"
          :disabled="aiSorting"
        >
          <Transition name="fade-scale" mode="out-in">
            <span v-if="!aiSorting" key="text">✨ 智能排序</span>
            <div v-else class="ai-loader-dots" key="loader">
              <span></span><span></span><span></span>
            </div>
          </Transition>
        </button>
      </div>
    </div>
    <div class="search-wrap">
      <input type="text" class="search-input" placeholder="搜索计划... (支持拼音)" v-model="searchKeyword">
      <span class="search-clear" v-show="searchKeyword" @click="searchKeyword = ''">&times;</span>
    </div>
    <div class="status-group">
      <div class="category-progress-area">
        <div class="category-progress-info">
          <span class="category-progress-label">本月完成进度</span>
          <div v-if="!categoryProgress || Number(categoryProgress) <= 0" class="page-agent-hint">
            不知道如何开始？按 <kbd>Cmd + K</kbd> 召唤 Agent
          </div>
          <span class="category-progress-text">{{ categoryProgress }}%</span>
        </div>
        <div class="category-progress-track">
          <div class="category-progress-bar" :style="{ width: categoryProgress + '%' }"></div>
        </div>
      </div>
      <div v-if="currentSignature" class="signature-content">{{ currentSignature }}</div>
    </div>
    <div class="plan-list">
      <TransitionGroup 
        name="list" 
        tag="div" 
        class="plan-list-inner"
      >
        <div v-for="(p, idx) in filteredPlans" :key="p.id" class="plan-card-wrapper" :data-index="idx">
          <PlanCard
            :plan="p"
            :isFocusing="ui.activeFocusSession && ui.activeFocusSession.plan_id === p.id"
            :timerRemaining="ui.activeTimers[p.id] ? ui.activeTimers[p.id].remaining : null"
            @complete="completePlan"
            @edit="editPlan"
            @delete="deletePlan"
            @toggleTimer="toggleTimer"
            @toggleFocus="toggleFocus"
            @updateProgress="updateProgress"
          />
        </div>
      </TransitionGroup>
      
      <Transition name="fade">
        <div v-if="!loading && !filteredPlans.length" class="empty-state">
          <div class="empty-icon">📅</div>
          <p>暂无月计划，定下这个月的小目标吧</p>
        </div>
      </Transition>
    </div>

    <!-- Add/Edit Plan Modal -->
    <GlassModal
      v-model="showModal"
      :title="editingPlanId ? '编辑计划' : '新增计划'"
      @close="closeModal"
    >
      <div class="form-group">
        <label>计划标题</label>
        <input type="text" v-model="form.title" placeholder="输入计划标题">
      </div>
      <div class="form-group">
        <label>计划描述</label>
        <textarea v-model="form.description" rows="3" placeholder="详细描述你的计划..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>优先级 (1-100)</label>
          <input type="number" v-model="form.priority" min="1" max="100" step="1" placeholder="留空AI评估">
        </div>
        <div class="form-group">
          <label>虚拟价值</label>
          <input type="number" v-model="form.virtual_value" min="0" step="0.1" placeholder="留空AI评估">
        </div>
      </div>
      <div class="form-group">
        <label>完成进度: {{ form.progress }}%</label>
        <input type="range" class="progress-range-input" v-model="form.progress" min="0" max="100" step="5">
      </div>
      <small class="form-hint">优先级和价值留空时，配置AI后会自动评估</small>

      <template #footer>
        <button class="btn btn-glass" @click="closeModal">取消</button>
        <button class="btn btn-gradient" @click="savePlan">保存</button>
      </template>
    </GlassModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePinyin } from '@/composables/usePinyin'
import { useUiStore } from '@/stores/ui'
import api from '@/api'
import PlanCard from '@/components/business/PlanCard.vue'
import GlassModal from '@/components/common/GlassModal.vue'

const { matchPinyin } = usePinyin()
const ui = useUiStore()
const planType = 'monthly'

const plans = ref([])
const searchKeyword = ref('')
const categoryProgress = ref(0)
const signatures = ref([])
const currentSignature = ref('')
const showModal = ref(false)
const editingPlanId = ref(null)
const form = ref({ title: '', description: '', priority: '', virtual_value: '', progress: 0 })
const aiSorting = ref(false)
const loading = ref(true)

let planSaving = false

const filteredPlans = computed(() => {
  if (!searchKeyword.value) return plans.value
  return plans.value.filter(p => 
    matchPinyin(p.title, searchKeyword.value) || 
    matchPinyin(p.description || '', searchKeyword.value)
  )
})

function parseSuggestedTime(str) {
  if (!str) return 0
  const m = str.match(/([\d.]+)\s*(秒|分钟|小时|天|周)/)
  if (!m) return 0
  const v = parseFloat(m[1])
  const unitMap = { '秒': 1, '分钟': 60, '小时': 3600, '天': 86400, '周': 604800 }
  return v * (unitMap[m[2]] || 1)
}

const showNextSignature = () => {
  if (!signatures.value.length) { currentSignature.value = ''; return }
  currentSignature.value = signatures.value[ui.sigIndex % signatures.value.length]
  ui.sigIndex++
}

const loadPlans = async (isInitial = false) => {
  if (isInitial) loading.value = true
  try {
    const [active, progress] = await Promise.all([
      api.getPlans(planType),
      api.getPlanProgress(planType).catch(() => ({ percentage: 0 }))
    ])
    plans.value = active
    categoryProgress.value = progress.percentage || 0
  } catch (e) { 
    window.toast('加载失败: ' + e.message, true) 
  } finally {
    if (isInitial) loading.value = false
  }
}

const loadSignatures = async () => {
  try {
    const rows = await api.getSignatures()
    signatures.value = rows.map(r => r.content).filter(c => c.trim())
    if (signatures.value.length) currentSignature.value = signatures.value[ui.sigIndex % signatures.value.length]
    ui.sigIndex++
  } catch (e) {}
}

const showAddPlanModal = () => {
  editingPlanId.value = null
  form.value = { title: '', description: '', priority: '', virtual_value: '', progress: 0 }
  showModal.value = true
}

const editPlan = (p) => {
  editingPlanId.value = p.id
  form.value = { 
    title: p.title, 
    description: p.description || '', 
    priority: p.priority || '', 
    virtual_value: p.virtual_value || '', 
    progress: p.progress || 0 
  }
  showModal.value = true
}

const closeModal = () => { showModal.value = false }

const savePlan = async () => {
  if (planSaving) return
  const title = form.value.title.trim()
  if (!title) { window.toast('请输入标题', true); return }
  planSaving = true
  try {
    const body = { 
      title, 
      description: form.value.description.trim(), 
      progress: parseInt(form.value.progress) || 0 
    }
    if (form.value.priority !== '') body.priority = parseInt(form.value.priority)
    if (form.value.virtual_value !== '') body.virtual_value = parseFloat(form.value.virtual_value)
    
    if (editingPlanId.value) {
      await api.updatePlan(editingPlanId.value, body)
      window.toast('已更新')
    } else {
      body.plan_type = planType
      await api.createPlan(body)
      window.toast('已创建')
    }
    closeModal()
    await loadPlans()
    showNextSignature()
  } catch (e) { 
    window.toast('保存失败: ' + e.message, true) 
  } finally { 
    planSaving = false 
  }
}

const deletePlan = async (p) => {
  if (!confirm('确定删除此计划？')) return
  const id = p.id
  if (ui.activeTimers[id]) ui.stopTimer(id)
  if (ui.activeFocusSession && ui.activeFocusSession.plan_id === id) await stopFocus()
  try {
    await api.deletePlan(id)
    window.toast('计划已删除')
    plans.value = plans.value.filter(x => x.id !== id)
  } catch (e) { 
    window.toast('删除失败: ' + e.message, true) 
  }
}

const completePlan = async (p) => {
  const id = p.id
  if (ui.activeTimers[id]) ui.stopTimer(id)
  if (ui.activeFocusSession && ui.activeFocusSession.plan_id === id) await stopFocus()
  try {
    await api.completePlan(id)
    window.toast('计划已完成！')
    await loadPlans()
    window.loadBalance && window.loadBalance()
  } catch (e) { 
    window.toast('操作失败: ' + e.message, true) 
  }
}

const updateProgress = async (id, val) => {
  const v = parseInt(val)
  if (v >= 100) {
    const p = plans.value.find(x => x.id === id)
    if (p) completePlan(p)
    return
  }
  try { 
    await api.updatePlan(id, { progress: v })
    const p = plans.value.find(x => x.id === id)
    if (p) p.progress = v
    const progress = await api.getPlanProgress(planType)
    categoryProgress.value = progress.percentage || 0
  } catch (e) { 
    window.toast('更新失败: ' + e.message, true) 
  }
}

const aiSortPlans = async () => {
  if (aiSorting.value) return
  aiSorting.value = true
  try { 
    await api.sortPlans(planType)
    window.toast('AI排序完成')
    await loadPlans() 
  } catch (e) { 
    window.toast('AI排序失败: ' + e.message, true) 
  } finally {
    aiSorting.value = false
  }
}

// Focus Logic
const stopFocus = async () => {
  if (!ui.activeFocusSession) return
  try {
    await api.endSession(ui.activeFocusSession.id, { end_time: new Date().toISOString() })
    window.toast('专注已结束')
  } catch (e) { 
    window.toast('结束失败: ' + e.message, true) 
  }
  ui.activeFocusSession = null
  await loadPlans()
}

const toggleTimer = (id, timeStr) => {
  id = parseInt(id)
  if (ui.activeTimers[id]) { 
    // CANCEL: Restore original progress
    const originalProgress = ui.activeTimers[id].originalProgress || 0
    ui.stopTimer(id)
    updateProgress(id, originalProgress)
    return 
  }
  
  const sec = parseSuggestedTime(timeStr)
  if (sec > 0) {
    const plan = plans.value.find(p => p.id === id)
    const currentProg = plan ? plan.progress : 0
    
    // START: Immediately clear progress in UI and backend
    if (plan) plan.progress = 0
    api.updatePlan(id, { progress: 0 }).catch(() => {})
    
    ui.startTimer(id, sec, currentProg, onTimerTick, onTimerEnd)
  }
}

const toggleFocus = async (p) => {
  const planId = p.id
  if (ui.activeFocusSession && ui.activeFocusSession.plan_id === planId) {
    await stopFocus()
  } else {
    if (ui.activeFocusSession) await stopFocus()
    try {
      const session = await api.createSession({ plan_id: planId, start_time: new Date().toISOString() })
      ui.activeFocusSession = { id: session.id, plan_id: planId, start_time: new Date() }
      window.toast('专注已开始')
    } catch (e) { 
      window.toast('启动失败: ' + e.message, true) 
    }
  }
}

const onTimerTick = async (id, progress) => {
  const plan = plans.value.find(p => p.id === id)
  if (plan) plan.progress = progress
}

const onTimerEnd = async (id) => {
  window.toast('计时结束！')
  try {
    await api.updatePlan(id, { progress: 100 })
    await loadPlans()
  } catch (e) {}
}

onMounted(async () => {
  await loadPlans(true)
  await loadSignatures()
})
</script>

<style scoped>
.plan-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 2rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.ai-sort-btn {
  position: relative;
  width: 140px;
  overflow: hidden;
}

.ai-loader-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.ai-loader-dots span {
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
  animation: dot-pulse 1.4s infinite ease-in-out both;
}

.ai-loader-dots span:nth-child(1) { animation-delay: -0.32s; }
.ai-loader-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes dot-pulse {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Transitions */
.list-enter-active {
  transition: opacity 0.6s cubic-bezier(0.2, 1.2, 0.85, 1),
              transform 0.6s cubic-bezier(0.2, 1.2, 0.85, 1);
}
.list-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.96);
}
.list-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
  position: absolute;
  width: 100%;
}
.list-leave-to {
  opacity: 0;
  transform: scale(0.92);
}
.list-move {
  transition: transform 0.5s cubic-bezier(0.2, 1.2, 0.85, 1);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>

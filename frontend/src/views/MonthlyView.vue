<template>
  <div class="page active">
    <div class="page-header">
      <h2>月计划</h2>
      <div class="page-actions">
        <button class="btn btn-glass" @click="showAddPlanModal">+ 新增计划</button>
        <button class="btn btn-gradient" @click="aiSortPlans">&#9889; AI智能排序</button>
      </div>
    </div>
    <div class="search-wrap">
      <input type="text" class="search-input" placeholder="搜索计划... (支持拼音)" v-model="searchKeyword">
      <span class="search-clear" v-show="searchKeyword" @click="searchKeyword = ''">&times;</span>
    </div>
    <div class="category-progress">
      <div class="category-progress-info"><span class="category-progress-label">完成进度</span><span class="category-progress-text">{{ categoryProgress }}%</span></div>
      <div class="category-progress-track"><div class="category-progress-bar" :style="{ width: categoryProgress + '%' }"></div></div>
    </div>
    <div class="signature-bar" :class="{ show: currentSignature }">{{ currentSignature }}</div>
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
            :is-focusing="ui.activeFocusSession?.plan_id === p.id"
            :timer-remaining="ui.activeTimers[p.id]?.remaining ?? null"
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
        <div v-if="!filteredPlans.length" class="empty-state">
          <div class="empty-icon">📅</div>
          <p>暂无月计划，定下这个月的小目标吧</p>
        </div>
      </Transition>
    </div>
    <div class="modal" :class="{ show: showModal }"><div class="modal-overlay" @click="closeModal"></div><div class="modal-content glass-card"><div class="modal-header"><h3>{{ editingPlanId ? '编辑计划' : '新增计划' }}</h3><span class="modal-close" @click="closeModal">&times;</span></div><div class="modal-body"><div class="form-group"><label>计划标题</label><input type="text" v-model="form.title" placeholder="输入计划标题"></div><div class="form-group"><label>计划描述</label><textarea v-model="form.description" rows="3" placeholder="详细描述你的计划..."></textarea></div><div class="form-row"><div class="form-group"><label>优先级 (1-100)</label><input type="number" v-model="form.priority" min="1" max="100" step="1" placeholder="留空AI评估"></div><div class="form-group"><label>虚拟价值</label><input type="number" v-model="form.virtual_value" min="0" step="0.1" placeholder="留空AI评估"></div></div><div class="form-group"><label>完成进度: {{ form.progress }}%</label><input type="range" class="progress-range-input" v-model="form.progress" min="0" max="100" step="5"></div><small class="form-hint">优先级和价值留空时，配置AI后会自动评估；未配置AI则默认为0</small></div><div class="modal-footer"><button class="btn btn-glass" @click="closeModal">取消</button><button class="btn btn-gradient" @click="savePlan">保存</button></div></div></div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePinyin } from '@/composables/usePinyin'
import { useUiStore } from '@/stores/ui'
import gsap from 'gsap'
import api from '@/api'
import PlanCard from '@/components/business/PlanCard.vue'
const { matchPinyin } = usePinyin()
const ui = useUiStore()
const planType = 'monthly'
const plans = ref([]); const searchKeyword = ref(''); const categoryProgress = ref(0); const signatures = ref([]); const currentSignature = ref(''); const showModal = ref(false); const editingPlanId = ref(null); const form = ref({ title: '', description: '', priority: '', virtual_value: '', progress: 0 }); let planSaving = false;

/**
 * GSAP Transition Group Hooks (iOS-style)
 */
function onItemBeforeEnter(el) {
  gsap.set(el, {
    opacity: 0,
    y: 30,
    scale: 0.94
  })
}

function onItemEnter(el, done) {
  const delay = el.dataset.index * 0.05
  gsap.to(el, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.5,
    delay: delay,
    ease: 'power3.out',
    onComplete: () => {
      done()
    }
  })
}

function onItemLeave(el, done) {
  gsap.to(el, {
    opacity: 0,
    scale: 0.9,
    duration: 0.4,
    ease: 'power2.in',
    onComplete: done
  })
}

const filteredPlans = computed(() => { if (!searchKeyword.value) return plans.value; return plans.value.filter(p => matchPinyin(p.title, searchKeyword.value) || matchPinyin(p.description || '', searchKeyword.value)) })
function parseSuggestedTime(str) { if (!str) return 0; const m = str.match(/([\d.]+)\s*(秒|分钟|小时|天|周)/); if (!m) return 0; const v = parseFloat(m[1]); return m[2] === '秒' ? v : m[2] === '分钟' ? v * 60 : m[2] === '小时' ? v * 3600 : m[2] === '天' ? v * 86400 : v * 604800 }
const showNextSignature = () => { if (!signatures.value.length) { currentSignature.value = ''; return }; currentSignature.value = signatures.value[ui.sigIndex % signatures.value.length]; ui.sigIndex++ }
const loadPlans = async () => { try { const [active, progress] = await Promise.all([api.getPlans(planType), api.getPlanProgress(planType).catch(() => ({ percentage: 0 }))]); plans.value = active; categoryProgress.value = progress.percentage || 0; } catch (e) { window.toast('加载失败: ' + e.message, true) } }
const loadSignatures = async () => { try { const rows = await api.getSignatures(); signatures.value = rows.map(r => r.content).filter(c => c.trim()); showNextSignature() } catch (e) {} }
const showAddPlanModal = () => { editingPlanId.value = null; form.value = { title: '', description: '', priority: '', virtual_value: '', progress: 0 }; showModal.value = true }
const editPlan = (p) => { editingPlanId.value = p.id; form.value = { title: p.title, description: p.description || '', priority: p.priority || '', virtual_value: p.virtual_value || '', progress: p.progress || 0 }; showModal.value = true }
const closeModal = () => { showModal.value = false }
const savePlan = async () => { if (planSaving) return; const title = form.value.title.trim(); if (!title) { window.toast('请输入标题', true); return }; planSaving = true; try { const body = { title, description: form.value.description.trim(), progress: parseInt(form.value.progress) || 0 }; if (form.value.priority !== '') body.priority = parseInt(form.value.priority); if (form.value.virtual_value !== '') body.virtual_value = parseFloat(form.value.virtual_value); if (editingPlanId.value) { await api.updatePlan(editingPlanId.value, body); window.toast('已更新') } else { body.plan_type = planType; const newPlan = await api.createPlan(body); window.toast('已创建'); if (!form.value.priority && !form.value.virtual_value && newPlan && newPlan.id) { let polls = 0; const poll = setInterval(async () => { try { const pl = await api.getPlans(planType); const found = pl.find(x => x.id === newPlan.id); if (found && found.priority > 0) { clearInterval(poll); loadPlans() } } catch (_) {} if (++polls >= 15) clearInterval(poll) }, 1000) } }; closeModal(); await loadPlans(); showNextSignature() } catch (e) { window.toast('保存失败: ' + e.message, true) } finally { planSaving = false } }
const onTimerTick = async (id, progress) => { const plan = plans.value.find(p => p.id === id); if (plan) plan.progress = progress }
const onTimerEnd = async (id) => { window.toast('计时结束！'); try { await api.updatePlan(id, { progress: 100 }); await loadPlans() } catch (e) {} }
const deletePlan = async (p) => { const id = p.id; if (!confirm('确定删除此计划？')) return; if (ui.activeTimers[id]) ui.stopTimer(id); if (ui.activeFocusSession?.plan_id === id) await stopFocus(); try { await api.deletePlan(id); window.toast('计划已删除'); await loadPlans() } catch (e) { window.toast('删除失败: ' + e.message, true) } }
const completePlan = async (p) => { const id = p.id; if (ui.activeTimers[id]) ui.stopTimer(id); if (ui.activeFocusSession?.plan_id === id) await stopFocus(); try { await api.completePlan(id); window.toast('计划已完成，虚拟价值已入账！'); await loadPlans(); window.loadBalance && window.loadBalance() } catch (e) { window.toast('操作失败: ' + e.message, true) } }
const updateProgress = async (id, val) => { const v = parseInt(val); if (v >= 100) { if (ui.activeTimers[id]) ui.stopTimer(id); if (ui.activeFocusSession?.plan_id === id) await stopFocus(); try { await api.completePlan(id); window.toast('计划已完成！'); await loadPlans(); window.loadBalance && window.loadBalance() } catch (e) { window.toast('更新失败: ' + e.message, true) }; return }; try { await api.updatePlan(id, { progress: v }); categoryProgress.value = (await api.getPlanProgress(planType)).percentage || 0 } catch (e) { window.toast('更新失败: ' + e.message, true) } }
const aiSortPlans = async () => { try { const r = await api.sortPlans(planType); window.toast('AI排序完成，已更新 ' + r.length + ' 条计划'); await loadPlans() } catch (e) { window.toast('AI排序失败: ' + e.message, true) } }
const toggleTimer = (id, timeStr) => { id = parseInt(id); if (ui.activeTimers[id]) { ui.stopTimer(id); return }; const sec = parseSuggestedTime(timeStr); if (sec > 0) { api.updatePlan(id, { progress: 0 }).catch(() => {}); const plan = plans.value.find(p => p.id === id); if (plan) plan.progress = 0; ui.startTimer(id, sec, onTimerTick, onTimerEnd) } }
const toggleFocus = async (p) => { const planId = p.id; if (ui.activeFocusSession?.plan_id === planId) { await stopFocus() } else { if (ui.activeFocusSession) await stopFocus(); try { const session = await api.createSession({ plan_id: planId, start_time: new Date().toISOString() }); ui.activeFocusSession = { id: session.id, plan_id: planId, start_time: new Date() }; window.toast('专注已开始') } catch (e) { window.toast('启动失败: ' + e.message, true) } } }
const stopFocus = async () => { if (!ui.activeFocusSession) return; try { await api.endSession(ui.activeFocusSession.id, { end_time: new Date().toISOString() }); window.toast('专注已结束') } catch (e) { window.toast('结束失败: ' + e.message, true) }; ui.activeFocusSession = null; await loadPlans() }
const restoreFocusSession = async () => { try { const sessions = await api.getSessions(); const unfinished = sessions.find(s => !s.end_time); if (!unfinished) return; const elapsed = (Date.now() - new Date(unfinished.start_time).getTime()) / 1000; if (elapsed > 14400) { await api.endSession(unfinished.id, { end_time: new Date().toISOString() }); return }; if (unfinished.plan_id) ui.activeFocusSession = { id: unfinished.id, plan_id: unfinished.plan_id, start_time: new Date() } } catch (e) {} }
onMounted(async () => { ui.restoreTimers(onTimerTick, onTimerEnd); await loadPlans(); await loadSignatures(); await restoreFocusSession() })
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


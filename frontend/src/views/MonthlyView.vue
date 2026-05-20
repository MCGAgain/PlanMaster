<template>
  <div class="monthly-view">
    <Header title="月计划" searchable @search="handleSearch">
      <template #actions>
        <GlassButton variant="primary" @click="showAddModal = true">+ 新增计划</GlassButton>
        <GlassButton variant="gradient" @click="handleAiSort">&#9889; AI智能排序</GlassButton>
      </template>
    </Header>
    <div class="category-progress">
      <div class="category-progress-info">
        <span class="category-progress-label">完成进度</span>
        <span class="category-progress-text">{{ categoryProgress }}%</span>
      </div>
      <div class="category-progress-track"><div class="category-progress-bar" :style="{ width: `${categoryProgress}%` }" /></div>
    </div>
    <div v-if="currentSignature" class="signature-bar show">{{ currentSignature }}</div>
    <div class="plans-list">
      <PlanCard v-for="plan in filteredPlans" :key="plan.id" :plan="plan"
        :is-focusing="activeFocusSession?.plan_id === plan.id"
        :timer-remaining="timers[plan.id]?.remaining ?? null"
        @complete="handleComplete" @edit="handleEdit" @delete="handleDelete"
        @toggle-timer="handleToggleTimer" @toggle-focus="handleToggleFocus" @update-progress="handleUpdateProgress" />
    </div>
    <GlassCard v-if="filteredPlans.length === 0" class="empty-state"><p>暂无月计划</p></GlassCard>
    <GlassModal v-model="showAddModal" title="新增月计划"><PlanForm @submit="handleAdd" @cancel="showAddModal = false" /></GlassModal>
    <GlassModal v-model="showEditModal" title="编辑计划"><PlanForm :plan="editingPlan" @submit="handleUpdate" @cancel="showEditModal = false" /></GlassModal>
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
const showAddModal = ref(false); const showEditModal = ref(false); const editingPlan = ref(null); const searchQuery = ref(''); const categoryProgress = ref(0)
const signatures = ref([]); const sigIndex = ref(0); const currentSignature = ref(''); const timers = ref({}); const activeFocusSession = ref(null)
const plans = computed(() => plansStore.monthlyPlans)
const filteredPlans = computed(() => { if (!searchQuery.value) return plans.value; return plans.value.filter(p => matchPinyin(p.title, searchQuery.value) || matchPinyin(p.description || '', searchQuery.value)) })
onMounted(async () => { plansStore.setCurrentType('monthly'); await plansStore.fetchPlans(); await loadCategoryProgress(); await loadSignatures() })
onUnmounted(() => { Object.values(timers.value).forEach(t => { if (t.interval) clearInterval(t.interval) }) })
const handleSearch = (q) => { searchQuery.value = q }
const loadCategoryProgress = async () => { try { categoryProgress.value = (await api.getPlanProgress('monthly')).percentage || 0 } catch (e) {} }
const loadSignatures = async () => { try { signatures.value = (await api.getSignatures()).map(r => r.content).filter(c => c.trim()); showNextSignature() } catch (e) {} }
const showNextSignature = () => { if (!signatures.value.length) { currentSignature.value = ''; return }; currentSignature.value = signatures.value[sigIndex.value % signatures.value.length]; sigIndex.value++ }
const handleAiSort = async () => { try { await api.sortPlans('monthly'); await plansStore.fetchPlans(); await loadCategoryProgress() } catch (e) { alert('AI排序失败: ' + e.message) } }
const handleComplete = async (p) => { try { if (timers.value[p.id]) stopTimer(p.id); if (activeFocusSession.value?.plan_id === p.id) await stopFocus(); await plansStore.completePlan(p.id); await loadCategoryProgress() } catch (e) { alert(e.message) } }
const handleEdit = (p) => { editingPlan.value = p; showEditModal.value = true }
const handleDelete = async (p) => { if (!confirm('确定删除？')) return; try { if (timers.value[p.id]) stopTimer(p.id); await plansStore.deletePlan(p.id); await loadCategoryProgress() } catch (e) { alert(e.message) } }
const handleAdd = async (p) => { try { await plansStore.createPlan({ ...p, plan_type: 'monthly' }); showAddModal.value = false; await loadCategoryProgress(); showNextSignature() } catch (e) { alert(e.message) } }
const handleUpdate = async (p) => { try { await plansStore.updatePlan(editingPlan.value.id, p); showEditModal.value = false; editingPlan.value = null } catch (e) { alert(e.message) } }
const handleUpdateProgress = async (id, v) => { try { if (v >= 100) { await api.completePlan(id); await plansStore.fetchPlans(); await loadCategoryProgress() } else { await api.updatePlan(id, { progress: v }); await loadCategoryProgress() } } catch (e) { alert(e.message) } }
const parseSuggestedTime = (s) => { if (!s) return 0; const m = s.match(/([\d.]+)\s*(秒|分钟|小时)/); if (!m) return 0; const v = parseFloat(m[1]); return m[2] === '秒' ? v : m[2] === '分钟' ? v * 60 : v * 3600 }
const handleToggleTimer = (p) => { if (timers.value[p.id]) stopTimer(p.id); else { const s = parseSuggestedTime(p.suggested_time); if (s > 0) startTimer(p.id, s) } }
const startTimer = (id, total) => { if (timers.value[id]?.interval) return; timers.value[id] = { remaining: total, total, startAt: Date.now(), interval: null }; timers.value[id].interval = setInterval(() => { const e = Math.floor((Date.now() - timers.value[id].startAt) / 1000); timers.value[id].remaining = Math.max(0, timers.value[id].total - e); if (timers.value[id].remaining <= 0) { clearInterval(timers.value[id].interval); delete timers.value[id] } }, 1000) }
const stopTimer = (id) => { if (!timers.value[id]) return; clearInterval(timers.value[id].interval); delete timers.value[id] }
const handleToggleFocus = async (p) => { if (activeFocusSession.value?.plan_id === p.id) { await stopFocus() } else { if (activeFocusSession.value) await stopFocus(); try { const s = await api.createSession({ plan_id: p.id, start_time: new Date().toISOString() }); activeFocusSession.value = { id: s.id, plan_id: p.id } } catch (e) { alert(e.message) } } }
const stopFocus = async () => { if (!activeFocusSession.value) return; try { await api.updateSession(activeFocusSession.value.id, { end_time: new Date().toISOString() }); activeFocusSession.value = null; await plansStore.fetchPlans() } catch (e) {} }
</script>
<style scoped>
.monthly-view { min-height: 100vh; }
.category-progress { margin: 0 2rem; padding: 1rem; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius); }
.category-progress-info { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
.category-progress-label { font-size: 0.85rem; color: var(--text-soft); }
.category-progress-text { font-size: 0.85rem; font-weight: 600; color: var(--primary); }
.category-progress-track { height: 8px; background: rgba(124, 110, 240, 0.1); border-radius: 4px; overflow: hidden; }
.category-progress-bar { height: 100%; background: linear-gradient(90deg, var(--primary), #a78bfa); border-radius: 4px; transition: width 0.3s ease; }
.signature-bar { margin: 0.5rem 2rem; padding: 0.5rem 1rem; background: var(--primary-light); border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--primary); text-align: center; }
.plans-list { padding: 1rem 2rem; display: flex; flex-direction: column; gap: 1rem; }
.empty-state { margin: 2rem; text-align: center; color: var(--text-muted); }
.btn-gradient { background: linear-gradient(135deg, var(--primary), #a78bfa); color: white; border: none; }
</style>

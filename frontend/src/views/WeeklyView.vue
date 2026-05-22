<template>
  <div class="page active">
    <div class="page-header">
      <h2>周计划</h2>
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
      <div class="category-progress-info">
        <span class="category-progress-label">完成进度</span>
        <span class="category-progress-text">{{ categoryProgress }}%</span>
      </div>
      <div class="category-progress-track">
        <div class="category-progress-bar" :style="{ width: categoryProgress + '%' }"></div>
      </div>
    </div>
    <div class="signature-bar" :class="{ show: currentSignature }">{{ currentSignature }}</div>
    <div class="plan-list">
      <TransitionGroup name="list">
        <div v-for="(p, idx) in filteredPlans" :key="p.id" class="plan-card" :class="{ completed: p.completed }" :style="{ animationDelay: (idx * 0.04) + 's' }">
          <div class="priority-ring">
            <svg width="54" height="54" viewBox="0 0 54 54"><circle class="ring-bg" cx="27" cy="27" r="24"/><circle class="ring-fill" cx="27" cy="27" r="24" :stroke="priColor(p.priority) || 'rgba(168,163,191,0.4)'" :stroke-dasharray="2*Math.PI*24" :stroke-dashoffset="2*Math.PI*24*(1-getProgress(p)/100)"/></svg>
            <div class="priority-circle" :class="{ 'priority-none': !p.priority || p.priority <= 0 }" :style="p.priority > 0 ? `background: radial-gradient(circle, ${priColorLight(p.priority)} 0%, ${priColor(p.priority)} 100%)` : ''">{{ p.priority > 0 ? p.priority : '-' }}</div>
          </div>
          <div class="plan-card-body">
            <div class="plan-card-title">{{ p.title }}<span v-if="planDateLabel" class="plan-date-label">{{ planDateLabel }}</span></div>
            <div class="plan-card-meta">
              <span class="plan-type-tag" :style="{ background: '#3b82f6' }">周计划</span>
              <template v-if="p.suggested_time"><span class="plan-badge badge-time">&#128336; {{ p.suggested_time }}</span><button class="btn timer-btn" :class="{ counting: timers[p.id] }" @click="toggleTimer(p.id, p.suggested_time)">{{ timers[p.id] ? fmtCountdown(timers[p.id].remaining) : '开始' }}</button></template>
              <button class="btn focus-btn btn-sm" :class="{ focusing: activeFocusSession?.plan_id === p.id }" @click="toggleFocus(p.id)">{{ activeFocusSession?.plan_id === p.id ? '&#9632; 停止' : '&#9654; 专注' }}</button>
              <span v-if="p.virtual_value > 0" class="plan-badge badge-value">{{ p.virtual_value }} 价值</span>
            </div>
            <div v-if="p.description" class="plan-card-desc">{{ p.description }}</div>
            <div v-if="p.ai_reason" class="plan-card-reason">AI: {{ p.ai_reason }}</div>
            <div class="plan-progress"><div class="plan-progress-track"><div class="plan-progress-bar" :style="{ width: getProgress(p)+'%' }"></div><input type="range" class="plan-progress-input" min="0" max="100" step="5" :value="getProgress(p)" @input="previewProgress($event)" @change="updateProgress(p.id, $event.target.value)"></div><span class="plan-progress-text">{{ getProgress(p) }}%</span></div>
            <div class="plan-card-actions"><button v-if="!p.completed" class="btn btn-success btn-sm" @click="completePlan(p.id)">&#10003; 完成</button><button class="btn btn-glass btn-sm" @click="editPlan(p)">编辑</button><button class="btn btn-danger btn-sm" @click="deletePlan(p.id)">删除</button></div>
          </div>
        </div>
      </TransitionGroup>
      <div v-if="!filteredPlans.length" class="empty-state">暂无计划，点击右上角添加</div>
    </div>
    <div class="modal" :class="{ show: showModal }"><div class="modal-overlay" @click="closeModal"></div><div class="modal-content glass-card"><div class="modal-header"><h3>{{ editingPlanId ? '编辑计划' : '新增计划' }}</h3><span class="modal-close" @click="closeModal">&times;</span></div><div class="modal-body"><div class="form-group"><label>计划标题</label><input type="text" v-model="form.title" placeholder="输入计划标题"></div><div class="form-group"><label>计划描述</label><textarea v-model="form.description" rows="3" placeholder="详细描述你的计划..."></textarea></div><div class="form-row"><div class="form-group"><label>优先级 (1-100)</label><input type="number" v-model="form.priority" min="1" max="100" step="1" placeholder="留空AI评估"></div><div class="form-group"><label>虚拟价值</label><input type="number" v-model="form.virtual_value" min="0" step="0.1" placeholder="留空AI评估"></div></div><div class="form-group"><label>完成进度: {{ form.progress }}%</label><input type="range" class="progress-range-input" v-model="form.progress" min="0" max="100" step="5"></div><small class="form-hint">优先级和价值留空时，配置AI后会自动评估；未配置AI则默认为0</small></div><div class="modal-footer"><button class="btn btn-glass" @click="closeModal">取消</button><button class="btn btn-gradient" @click="savePlan">保存</button></div></div></div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePinyin } from '@/composables/usePinyin'
import api from '@/api'
const { matchPinyin } = usePinyin()
const planType = 'weekly'
const plans = ref([]); const searchKeyword = ref(''); const categoryProgress = ref(0); const signatures = ref([]); const sigIndex = ref(0); const currentSignature = ref(''); const showModal = ref(false); const editingPlanId = ref(null); const form = ref({ title: '', description: '', priority: '', virtual_value: '', progress: 0 }); const timers = ref({}); const activeFocusSession = ref(null); let planSaving = false
const planDateLabel = computed(() => { const d = new Date(); return ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()] })
const filteredPlans = computed(() => { if (!searchKeyword.value) return plans.value; return plans.value.filter(p => matchPinyin(p.title, searchKeyword.value) || matchPinyin(p.description || '', searchKeyword.value)) })
function priColor(p) { if (!p || p <= 0) return null; p = Math.min(100, Math.max(1, p)); return `hsl(${120 - (p / 100) * 120}, 72%, 52%)` }
function priColorLight(p) { if (!p || p <= 0) return null; p = Math.min(100, Math.max(1, p)); return `hsl(${120 - (p / 100) * 120}, 72%, 92%)` }
function getProgress(p) { if (timers.value[p.id]) return Math.min(99, Math.round((1 - timers.value[p.id].remaining / timers.value[p.id].total) * 100)); return Math.min(100, Math.max(0, p.progress || 0)) }
function fmtCountdown(s) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return m + ':' + String(sec).padStart(2, '0') }
function parseSuggestedTime(str) { if (!str) return 0; const m = str.match(/([\d.]+)\s*(秒|分钟|小时|天|周)/); if (!m) return 0; const v = parseFloat(m[1]); return m[2] === '秒' ? v : m[2] === '分钟' ? v * 60 : m[2] === '小时' ? v * 3600 : m[2] === '天' ? v * 86400 : v * 604800 }
function previewProgress(e) { const track = e.target.closest('.plan-progress-track'); const bar = track.querySelector('.plan-progress-bar'); const text = e.target.closest('.plan-progress').querySelector('.plan-progress-text'); bar.style.width = e.target.value + '%'; text.textContent = e.target.value + '%' }
const showNextSignature = () => { if (!signatures.value.length) { currentSignature.value = ''; return }; currentSignature.value = signatures.value[sigIndex.value % signatures.value.length]; sigIndex.value++ }
const loadPlans = async () => { try { const [active, progress] = await Promise.all([api.getPlans(planType), api.getPlanProgress(planType).catch(() => ({ percentage: 0 }))]); plans.value = active; categoryProgress.value = progress.percentage || 0 } catch (e) { window.toast('加载失败: ' + e.message, true) } }
const loadSignatures = async () => { try { const rows = await api.getSignatures(); signatures.value = rows.map(r => r.content).filter(c => c.trim()); showNextSignature() } catch (e) {} }
const showAddPlanModal = () => { editingPlanId.value = null; form.value = { title: '', description: '', priority: '', virtual_value: '', progress: 0 }; showModal.value = true }
const editPlan = (p) => { editingPlanId.value = p.id; form.value = { title: p.title, description: p.description || '', priority: p.priority || '', virtual_value: p.virtual_value || '', progress: p.progress || 0 }; showModal.value = true }
const closeModal = () => { showModal.value = false }
const savePlan = async () => { if (planSaving) return; const title = form.value.title.trim(); if (!title) { window.toast('请输入标题', true); return }; planSaving = true; try { const body = { title, description: form.value.description.trim(), progress: parseInt(form.value.progress) || 0 }; if (form.value.priority !== '') body.priority = parseInt(form.value.priority); if (form.value.virtual_value !== '') body.virtual_value = parseFloat(form.value.virtual_value); if (editingPlanId.value) { await api.updatePlan(editingPlanId.value, body); window.toast('已更新') } else { body.plan_type = planType; const newPlan = await api.createPlan(body); window.toast('已创建'); if (!form.value.priority && !form.value.virtual_value && newPlan && newPlan.id) { let polls = 0; const poll = setInterval(async () => { try { const pl = await api.getPlans(planType); const found = pl.find(x => x.id === newPlan.id); if (found && found.priority > 0) { clearInterval(poll); loadPlans() } } catch (_) {} if (++polls >= 15) clearInterval(poll) }, 1000) } }; closeModal(); await loadPlans(); showNextSignature() } catch (e) { window.toast('保存失败: ' + e.message, true) } finally { planSaving = false } }
const deletePlan = async (id) => { if (!confirm('确定删除此计划？')) return; if (timers.value[id]) stopTimer(id); if (activeFocusSession.value?.plan_id === id) await stopFocus(); try { await api.deletePlan(id); window.toast('计划已删除'); await loadPlans() } catch (e) { window.toast('删除失败: ' + e.message, true) } }
const completePlan = async (id) => { if (timers.value[id]) stopTimer(id); if (activeFocusSession.value?.plan_id === id) await stopFocus(); try { await api.completePlan(id); window.toast('计划已完成，虚拟价值已入账！'); await loadPlans(); window.loadBalance && window.loadBalance() } catch (e) { window.toast('操作失败: ' + e.message, true) } }
const updateProgress = async (id, val) => { const v = parseInt(val); if (v >= 100) { if (timers.value[id]) stopTimer(id); if (activeFocusSession.value?.plan_id === id) await stopFocus(); try { await api.completePlan(id); window.toast('计划已完成！'); await loadPlans(); window.loadBalance && window.loadBalance() } catch (e) { window.toast('更新失败: ' + e.message, true) }; return }; try { await api.updatePlan(id, { progress: v }); categoryProgress.value = (await api.getPlanProgress(planType)).percentage || 0 } catch (e) { window.toast('更新失败: ' + e.message, true) } }
const aiSortPlans = async () => { try { const r = await api.sortPlans(planType); window.toast('AI排序完成，已更新 ' + r.length + ' 条计划'); await loadPlans() } catch (e) { window.toast('AI排序失败: ' + e.message, true) } }
const toggleTimer = (id, timeStr) => { id = parseInt(id); if (timers.value[id]) { stopTimer(id); return }; const sec = parseSuggestedTime(timeStr); if (sec > 0) startTimer(id, sec) }
const startTimer = (id, totalSec) => { if (timers.value[id]?.interval) return; timers.value[id] = { remaining: totalSec, total: totalSec, startAt: Date.now(), interval: null }; timers.value[id].interval = setInterval(() => { const elapsed = Math.floor((Date.now() - timers.value[id].startAt) / 1000); timers.value[id].remaining = Math.max(0, timers.value[id].total - elapsed); if (timers.value[id].remaining <= 0) { clearInterval(timers.value[id].interval); delete timers.value[id] } }, 1000) }
const stopTimer = (id) => { if (!timers.value[id]) return; clearInterval(timers.value[id].interval); delete timers.value[id] }
const toggleFocus = async (planId) => { if (activeFocusSession.value?.plan_id === planId) { await stopFocus() } else { if (activeFocusSession.value) await stopFocus(); try { const session = await api.createSession({ plan_id: planId, start_time: new Date().toISOString() }); activeFocusSession.value = { id: session.id, plan_id: planId, start_time: new Date() }; window.toast('专注已开始') } catch (e) { window.toast('启动失败: ' + e.message, true) } } }
const stopFocus = async () => { if (!activeFocusSession.value) return; try { await api.endSession(activeFocusSession.value.id, { end_time: new Date().toISOString() }); window.toast('专注已结束') } catch (e) { window.toast('结束失败: ' + e.message, true) }; activeFocusSession.value = null; await loadPlans() }
const restoreFocusSession = async () => { try { const sessions = await api.getSessions(); const unfinished = sessions.find(s => !s.end_time); if (!unfinished) return; const elapsed = (Date.now() - new Date(unfinished.start_time).getTime()) / 1000; if (elapsed > 14400) { await api.endSession(unfinished.id, { end_time: new Date().toISOString() }); return }; if (unfinished.plan_id) activeFocusSession.value = { id: unfinished.id, plan_id: unfinished.plan_id, start_time: new Date() } } catch (e) {} }
onMounted(async () => { await loadPlans(); await loadSignatures(); await restoreFocusSession() })
onUnmounted(() => { Object.values(timers.value).forEach(t => { if (t.interval) clearInterval(t.interval) }) })
</script>

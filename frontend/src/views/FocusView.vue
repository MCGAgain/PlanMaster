<template>
  <div class="page active focus-page">
    <div class="page-header">
      <h2>专注模式</h2>
    </div>

    <div class="focus-value-bar" v-if="focusValueStats">
      <span class="fv-item">今日价值: <strong>{{ focusValueStats.today_value }}</strong></span>
      <span class="fv-divider">|</span>
      <span class="fv-item">累计价值: <strong>{{ focusValueStats.total_value }}</strong></span>
    </div>

    <div class="focus-container">
      <Transition name="focus-fade" mode="out-in">
        <GlassCard v-if="focusState === 'setup'" key="setup" class="focus-setup">
          <div class="form-group">
            <label>任务名称</label>
            <input 
              type="text" 
              v-model="focusTask" 
              placeholder="输入你要专注的任务，如：高数作业"
              class="focus-input"
            >
          </div>
          <div class="focus-mode-select">
            <button 
              class="focus-mode-btn" 
              :class="{ active: focusMode === 'unlimited' }" 
              @click="selectFocusMode('unlimited')"
              @mousedown="onSmallPress($event)"
              @mouseup="onSmallRelease($event)"
              @mouseleave="onSmallRelease($event)"
            >
              不限时
            </button>
            <button 
              class="focus-mode-btn" 
              :class="{ active: focusMode === 'countdown' }" 
              @click="selectFocusMode('countdown')"
              @mousedown="onSmallPress($event)"
              @mouseup="onSmallRelease($event)"
              @mouseleave="onSmallRelease($event)"
            >
              倒计时
            </button>
          </div>
          <div v-show="focusMode === 'countdown'" class="focus-duration-input">
            <label>时长</label>
            <div class="duration-row">
              <input type="number" v-model="focusHours" min="0" max="12" placeholder="0">
              <span>小时</span>
              <input type="number" v-model="focusMinutes" min="0" max="59" placeholder="30">
              <span>分钟</span>
            </div>
          </div>
          <button 
            class="btn btn-gradient focus-start-btn" 
            @click="startFocusTimer"
            @mousedown="onPress($event)"
            @mouseup="onRelease($event)"
            @mouseleave="onRelease($event)"
          >
            &#9654; 开始专注
          </button>
        </GlassCard>

        <div v-else-if="focusState === 'running'" key="running" class="focus-timer-area">
          <div class="focus-task-label">{{ focusCurrentTask }}</div>
          <div class="focus-timer-ring">
            <svg viewBox="0 0 280 280">
              <defs>
                <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#7c6ef0"/>
                  <stop offset="100%" style="stop-color:#a78bfa"/>
                </linearGradient>
              </defs>
              <circle class="focus-ring-bg" cx="140" cy="140" r="120"/>
              <circle class="focus-ring-fill" ref="focusRingFill" cx="140" cy="140" r="120"/>
            </svg>
            <div class="focus-timer-display">{{ focusTimerDisplay }}</div>
          </div>
          <div class="focus-timer-info">
            <span>{{ focusModeLabel }}</span>
          </div>
          <div class="focus-actions">
            <button 
              class="btn btn-danger focus-stop-btn" 
              @click="stopFocusTimer"
              @mousedown="onPress($event)"
              @mouseup="onRelease($event)"
              @mouseleave="onRelease($event)"
            >
              &#9632; 结束专注
            </button>
            <button 
              class="btn btn-glass focus-cancel-btn" 
              @click="cancelFocusTimer"
              @mousedown="onPress($event)"
              @mouseup="onRelease($event)"
              @mouseleave="onRelease($event)"
            >
              取消
            </button>
          </div>
        </div>

        <GlassCard v-else-if="focusState === 'complete'" key="complete" class="focus-complete-card">
          <div class="focus-complete-icon">&#10003;</div>
          <div class="focus-complete-title">{{ focusCompleteTitle }}</div>
          <div class="focus-complete-duration">{{ focusCompleteDuration }}</div>
          <div v-if="focusCompleteValue > 0" class="focus-complete-value">+{{ focusCompleteValue }} 价值</div>
          <div class="focus-complete-category">任务: {{ focusCurrentTask }}</div>
          <button 
            class="btn btn-gradient" 
            @click="resetFocusPage"
            @mousedown="onPress($event)"
            @mouseup="onRelease($event)"
            @mouseleave="onRelease($event)"
          >
            继续专注
          </button>
        </GlassCard>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import api from '@/api'
import { calculateFocusValue } from '@/services/focusValueService'
import GlassCard from '@/components/common/GlassCard.vue'

const FOCUS_RING_CIRCUMFERENCE = 2 * Math.PI * 120

const focusState = ref('setup')
const focusMode = ref('unlimited')
const focusTask = ref('')
const focusHours = ref(0)
const focusMinutes = ref(30)
const focusTotalSec = ref(0)
const focusElapsed = ref(0)
const focusStartTime = ref(null)
const focusCurrentSessionId = ref(null)
const focusCurrentTask = ref('')
const focusTimerDisplay = ref('00:00:00')
const focusModeLabel = ref('')
const focusCompleteTitle = ref('专注完成')
const focusCompleteDuration = ref('')
const focusCompleteValue = ref(0)
const focusValueStats = ref(null)
const focusRingFill = ref(null)
let focusTimerInterval = null

function fmtHMS(totalSec) {
  const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
}

function selectFocusMode(mode) { 
  gsap.fromTo('.focus-duration-input', { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3 })
  focusMode.value = mode 
}

// Interactive Animations
const onPress = (e) => {
  gsap.to(e.currentTarget, { scale: 0.96, duration: 0.2, ease: 'power2.out' })
}

const onRelease = (e) => {
  gsap.to(e.currentTarget, { scale: 1, duration: 0.4, ease: 'elastic.out(1.2, 0.6)' })
}

const onSmallPress = (e) => {
  gsap.to(e.currentTarget, { scale: 0.92, duration: 0.2, ease: 'power2.out' })
}

const onSmallRelease = (e) => {
  gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: 'power2.out' })
}

function updateFocusTimerRing() {
  if (!focusRingFill.value) return
  if (focusMode.value === 'unlimited') {
    const segProgress = (focusElapsed.value % 3600) / 3600
    focusRingFill.value.style.strokeDashoffset = FOCUS_RING_CIRCUMFERENCE * (1 - segProgress)
  } else {
    const progress = focusElapsed.value / focusTotalSec.value
    focusRingFill.value.style.strokeDashoffset = FOCUS_RING_CIRCUMFERENCE * (1 - progress)
  }
}

function startFocusTimerTick() {
  if (focusTimerInterval) return
  focusTimerInterval = setInterval(() => {
    focusElapsed.value = Math.floor((Date.now() - focusStartTime.value.getTime()) / 1000)
    if (focusMode.value === 'countdown' && focusElapsed.value >= focusTotalSec.value) {
      focusElapsed.value = focusTotalSec.value
      clearInterval(focusTimerInterval); focusTimerInterval = null
      finishFocusTimer(); return
    }
    if (focusMode.value === 'countdown') focusTimerDisplay.value = fmtHMS(Math.max(0, focusTotalSec.value - focusElapsed.value))
    else focusTimerDisplay.value = fmtHMS(focusElapsed.value)
    updateFocusTimerRing()
  }, 1000)
}

const startFocusTimer = async () => {
  const task = focusTask.value.trim()
  if (!task) { window.toast('请输入任务名称', true); return }
  if (focusMode.value === 'countdown') {
    focusTotalSec.value = (parseInt(focusHours.value) || 0) * 3600 + (parseInt(focusMinutes.value) || 0) * 60
    if (focusTotalSec.value <= 0) { window.toast('请设置倒计时时长', true); return }
  }
  try {
    const session = await api.createSession({ plan_id: null, start_time: new Date().toISOString(), category: task })
    focusCurrentSessionId.value = session.id; focusCurrentTask.value = task
    focusStartTime.value = new Date(session.start_time); focusElapsed.value = 0; focusState.value = 'running'
    focusModeLabel.value = focusMode.value === 'countdown' ? '倒计时 ' + fmtHMS(focusTotalSec.value) : '不限时专注中'
    if (focusMode.value === 'countdown') focusTimerDisplay.value = fmtHMS(focusTotalSec.value)
    if (focusRingFill.value) { focusRingFill.value.style.strokeDasharray = FOCUS_RING_CIRCUMFERENCE; focusRingFill.value.style.strokeDashoffset = FOCUS_RING_CIRCUMFERENCE }
    startFocusTimerTick()
  } catch (e) { window.toast('启动失败: ' + e.message, true) }
}

function finishFocusTimer() { stopFocusTimer() }

const stopFocusTimer = async () => {
  if (!focusCurrentSessionId.value) return
  if (focusTimerInterval) { clearInterval(focusTimerInterval); focusTimerInterval = null }
  try { await api.endSession(focusCurrentSessionId.value, { end_time: new Date().toISOString() }); window.toast('专注已结束') } catch (e) { window.toast('结束失败: ' + e.message, true) }
  focusState.value = 'complete'
  focusCompleteTitle.value = focusMode.value === 'countdown' && focusElapsed.value >= focusTotalSec.value ? '倒计时结束' : '专注完成'
  focusCompleteDuration.value = fmtHMS(focusElapsed.value)
  focusCompleteValue.value = calculateFocusValue(focusElapsed.value)
  focusCurrentSessionId.value = null
  loadFocusValueStats()
}

const cancelFocusTimer = async () => {
  if (focusCurrentSessionId.value) {
    if (focusTimerInterval) { clearInterval(focusTimerInterval); focusTimerInterval = null }
    try { await api.cancelSession(focusCurrentSessionId.value) } catch (e) {}
    focusCurrentSessionId.value = null
  }
  resetFocusPage()
}

const resetFocusPage = () => {
  focusState.value = 'setup'; focusElapsed.value = 0; focusStartTime.value = null; focusCurrentTask.value = ''
  if (focusTimerInterval) { clearInterval(focusTimerInterval); focusTimerInterval = null }
  if (focusRingFill.value) focusRingFill.value.style.strokeDashoffset = FOCUS_RING_CIRCUMFERENCE
}

const restoreFocusSession = async () => {
  try {
    const sessions = await api.getSessions()
    const unfinished = sessions.find(s => !s.end_time)
    if (!unfinished) return
    const elapsed = (Date.now() - new Date(unfinished.start_time).getTime()) / 1000
    if (elapsed > 14400) { await api.endSession(unfinished.id, { end_time: new Date().toISOString() }); return }
    if (!unfinished.plan_id) {
      focusCurrentSessionId.value = unfinished.id; focusCurrentTask.value = unfinished.category || ''
      focusStartTime.value = new Date(unfinished.start_time)
      focusElapsed.value = Math.floor((Date.now() - focusStartTime.value.getTime()) / 1000)
      focusState.value = 'running'
      focusMode.value = 'unlimited'
      focusModeLabel.value = '不限时专注中'
      if (focusRingFill.value) { focusRingFill.value.style.strokeDasharray = FOCUS_RING_CIRCUMFERENCE; focusRingFill.value.style.strokeDashoffset = FOCUS_RING_CIRCUMFERENCE }
      startFocusTimerTick()
    }
  } catch (e) {}
}

const loadFocusValueStats = async () => {
  try { focusValueStats.value = await api.getFocusValue() } catch (e) {}
}

onMounted(() => {
  restoreFocusSession()
  loadFocusValueStats()
})
onUnmounted(() => { if (focusTimerInterval) clearInterval(focusTimerInterval) })
</script>

<style scoped>
.focus-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.focus-setup {
  width: 100%;
  max-width: 500px;
}

.focus-complete-card {
  text-align: center;
  padding: 40px;
  width: 100%;
  max-width: 500px;
}

.focus-mode-select {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.focus-mode-btn {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
}

.focus-mode-btn:hover {
  background: var(--primary-light);
}

.focus-mode-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 4px 12px var(--primary-glow);
}

.focus-duration-input {
  margin-bottom: 20px;
}

.duration-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.duration-row input {
  width: 80px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--glass-border);
  background: rgba(255,255,255,0.2);
  text-align: center;
  color: var(--text);
}

.focus-start-btn {
  width: 100%;
  padding: 14px;
  font-size: 16px;
}

.focus-timer-area {
  text-align: center;
}

.focus-task-label {
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 30px;
}

.focus-timer-ring {
  position: relative;
  width: 280px;
  height: 280px;
  margin: 0 auto 30px;
}

.focus-ring-bg {
  fill: none;
  stroke: rgba(124, 110, 240, 0.05);
  stroke-width: 12;
}

.focus-ring-fill {
  fill: none;
  stroke: url(#focusGradient);
  stroke-width: 12;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear;
}

.focus-timer-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  font-weight: 800;
  font-family: monospace;
  color: var(--text);
}

.focus-timer-info {
  font-size: 14px;
  color: var(--text-soft);
  margin-bottom: 40px;
}

.focus-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.focus-complete-icon {
  font-size: 64px;
  color: var(--success);
  margin-bottom: 20px;
}

.focus-complete-title {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 10px;
}

.focus-complete-duration {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 10px;
}

.focus-complete-category {
  font-size: 14px;
  color: var(--text-soft);
  margin-bottom: 30px;
}

.focus-complete-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--success);
  margin-bottom: 8px;
}

.focus-value-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.6rem 1rem;
  margin-bottom: 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  font-size: 0.85rem;
  color: var(--text-soft);
}

.fv-item strong {
  color: var(--primary);
  font-weight: 700;
}

.fv-divider {
  opacity: 0.3;
}
/* Focus Transitions */
.focus-fade-enter-active,
.focus-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.focus-fade-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}

.focus-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(1.02);
}
</style>

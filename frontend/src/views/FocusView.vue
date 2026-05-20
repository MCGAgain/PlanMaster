<template>
  <div class="page active">
    <div class="page-header">
      <h2>专注模式</h2>
    </div>
    <div v-if="focusState === 'setup'" class="focus-setup glass-card">
      <div class="form-group">
        <label>任务名称</label>
        <input type="text" v-model="focusTask" placeholder="输入你要专注的任务，如：高数作业">
      </div>
      <div class="focus-mode-select">
        <button class="focus-mode-btn" :class="{ active: focusMode === 'unlimited' }" @click="selectFocusMode('unlimited')">不限时</button>
        <button class="focus-mode-btn" :class="{ active: focusMode === 'countdown' }" @click="selectFocusMode('countdown')">倒计时</button>
      </div>
      <div v-show="focusMode === 'countdown'" class="focus-duration-input">
        <label>时长</label>
        <div class="duration-row">
          <input type="number" v-model="focusHours" min="0" max="12" value="0" placeholder="0">
          <span>小时</span>
          <input type="number" v-model="focusMinutes" min="0" max="59" value="30" placeholder="30">
          <span>分钟</span>
        </div>
      </div>
      <button class="btn btn-gradient focus-start-btn" @click="startFocusTimer">&#9654; 开始专注</button>
    </div>

    <div v-if="focusState === 'running'" class="focus-timer-area">
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
        <button class="btn btn-danger focus-stop-btn" @click="stopFocusTimer">&#9632; 结束专注</button>
        <button class="btn btn-glass focus-cancel-btn" @click="cancelFocusTimer">取消</button>
      </div>
    </div>

    <div v-if="focusState === 'complete'" class="focus-complete">
      <div class="focus-complete-icon">&#10003;</div>
      <div class="focus-complete-title">{{ focusCompleteTitle }}</div>
      <div class="focus-complete-duration">{{ focusCompleteDuration }}</div>
      <div class="focus-complete-category">任务: {{ focusCurrentTask }}</div>
      <button class="btn btn-gradient" @click="resetFocusPage">继续专注</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import api from '@/api'

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
const focusRingFill = ref(null)
let focusTimerInterval = null

function fmtHMS(totalSec) {
  const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
}

function selectFocusMode(mode) { focusMode.value = mode }

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
  focusCurrentSessionId.value = null
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

onMounted(() => { restoreFocusSession() })
onUnmounted(() => { if (focusTimerInterval) clearInterval(focusTimerInterval) })
</script>

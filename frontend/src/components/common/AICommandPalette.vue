<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="visible" class="palette-overlay" @click.self="close">
        <div class="palette-box">
          <div class="palette-header">
            <span class="palette-title">AI Assistant</span>
            <span class="palette-hint">Cmd+K 打开 | Esc 关闭</span>
            <button class="palette-close" @click="close">&times;</button>
          </div>

          <div ref="chatAreaRef" class="palette-chat">
            <div v-if="!messages.length" class="palette-welcome">
              <div class="welcome-icon">
                <img :src="iconPath" class="welcome-img" />
              </div>
              <div class="welcome-text">
                <p>你好！我是你的 AI 助手。</p>
                <p>告诉我你想做什么，我来帮你操作。</p>
              </div>
            </div>

            <TransitionGroup name="msg-list">
              <div v-for="(msg, idx) in messages" :key="idx" class="chat-msg" :class="msg.role">
                <div class="msg-avatar">
                  <img v-if="msg.role === 'assistant'" :src="iconPath" class="avatar-img" />
                  <span v-else>👤</span>
                </div>
                <div class="msg-body">
                  <div class="msg-content" v-html="msg.content"></div>
                </div>
              </div>
            </TransitionGroup>

            <div v-if="streaming" class="chat-msg assistant thinking-state">
              <div class="msg-avatar thinking-glow">
                <img :src="iconPath" class="avatar-img" />
              </div>
              <div class="msg-body">
                <div class="thinking-dots">
                  <span class="dot-1"></span>
                  <span class="dot-2"></span>
                  <span class="dot-3"></span>
                </div>
              </div>
            </div>
          </div>

          <div class="palette-input-area">
            <div class="input-row">
              <input
                ref="inputRef"
                v-model="query"
                class="palette-input"
                placeholder="告诉我你想做什么..."
                @keydown.esc="close"
                @keydown.enter="onEnter"
              />
              <button class="send-btn" @click="onEnter" :disabled="!query.trim() || streaming">
                发送
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import appIcon from '@/assets/icon.jpg'

const visible = ref(false)
const query = ref('')
const messages = ref([])
const streaming = ref(false)
const inputRef = ref(null)
const chatAreaRef = ref(null)

const close = () => {
  visible.value = false
  query.value = ''
}

const show = () => {
  visible.value = true
  query.value = ''
  nextTick(() => inputRef.value?.focus())
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatAreaRef.value) chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight
  })
}

const iconPath = appIcon

const COMMANDS = {
  '/help': { desc: '查看可用命令', handler: cmdHelp },
  '/clear': { desc: '清除当前对话上下文', handler: cmdClear },
  '/new': { desc: '新建一个对话上下文', handler: cmdNew },
  '/tasks': { desc: '查看今日任务', handler: () => cmdQueryTasks('today') },
  '/week': { desc: '查看周计划', handler: () => cmdQueryTasks('weekly') },
  '/month': { desc: '查看月计划', handler: () => cmdQueryTasks('monthly') },
  '/important': { desc: '查看重要事项', handler: () => cmdQueryTasks('important') },
  '/balance': { desc: '查看当前余额', handler: cmdBalance },
  '/focus': { desc: '查看今日专注统计', handler: cmdFocus },
  '/plan': { desc: '查看今日规划', handler: cmdDailyPlan },
}

function cmdClear() { messages.value = [] }
function cmdNew() { messages.value = []; return '已开启新对话。' }

function cmdHelp() {
  const lines = Object.entries(COMMANDS).map(([cmd, info]) => `${cmd}  ${info.desc}`)
  return '可用命令：\n' + lines.join('\n')
}

async function cmdQueryTasks(type) {
  try {
    const plans = await api.getPlans(type)
    if (!plans.length) return '暂无任务。'
    return plans.map((p, i) => `${i + 1}. ${p.title}${p.progress > 0 ? ` [${p.progress}%]` : ''}`).join('\n')
  } catch (e) { return '查询失败: ' + e.message }
}

async function cmdBalance() {
  try {
    const b = await api.getBalance()
    return `当前余额: ${b} 价值`
  } catch (e) { return '查询失败: ' + e.message }
}

async function cmdFocus() {
  try {
    const stats = await api.getFocusValue()
    const daily = await api.getDailyStats()
    const mins = Math.round((daily.total_duration || 0) / 60)
    return `今日专注: ${mins} 分钟 (${daily.count || 0} 次)\n今日价值: ${stats.today_value}\n累计价值: ${stats.total_value}`
  } catch (e) { return '查询失败: ' + e.message }
}

async function cmdDailyPlan() {
  try {
    const items = await api.getDailyPlans(new Date().toISOString().slice(0, 10))
    if (!items.length) return '今日暂无规划。'
    const statusMap = { pending: '⬜', active: '🔄', done: '✅', paused: '⏸' }
    return items.map((p, i) => `${statusMap[p.status] || '⬜'} ${i + 1}. ${p.title}${p.note ? ` — ${p.note}` : ''}`).join('\n')
  } catch (e) { return '查询失败: ' + e.message }
}

const onEnter = (e) => {
  if (e.isComposing) return
  const q = query.value.trim()
  if (!q || streaming.value) return

  // Handle slash commands locally
  if (q.startsWith('/')) {
    const cmd = q.split(' ')[0].toLowerCase()
    const entry = COMMANDS[cmd]
    if (entry) {
      const result = entry.handler()
      if (result instanceof Promise) {
        streaming.value = true
        result.then(r => {
          messages.value.push({ role: 'assistant', content: r || '无结果' })
        }).catch(e => {
          messages.value.push({ role: 'assistant', content: `❌ ${e.message}` })
        }).finally(() => {
          streaming.value = false
          scrollToBottom()
        })
      } else if (result) {
        messages.value.push({ role: 'assistant', content: result })
      }
      query.value = ''
      scrollToBottom()
      return
    }
    messages.value.push({ role: 'assistant', content: `未知命令: ${cmd}\n输入 /help 查看可用命令。` })
    query.value = ''
    scrollToBottom()
    return
  }

  messages.value.push({ role: 'user', content: q })
  query.value = ''
  scrollToBottom()

  chatWithAI()
}

const chatWithAI = async () => {
  streaming.value = true

  try {
    const chatMessages = messages.value.map(m => ({ role: m.role, content: m.content }))

    const resp = await api.request('/api/ai/chat', {
      method: 'POST',
      body: { messages: chatMessages }
    })

    if (resp.error) {
      messages.value.push({ role: 'assistant', content: `❌ ${resp.error}` })
    } else {
      messages.value.push({ role: 'assistant', content: resp.content || '无响应' })
    }

    if (window.loadBalance) window.loadBalance()
  } catch (e) {
    messages.value.push({ role: 'assistant', content: `❌ ${e.message}` })
  } finally {
    streaming.value = false
    scrollToBottom()
  }
}

// Global keyboard shortcut
const onKeydown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    if (visible.value) close()
    else show()
  }
}

watch(visible, (val) => {
  if (val) nextTick(() => inputRef.value?.focus())
})

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

defineExpose({ show, close })
</script>

<style scoped>
.palette-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
}

.palette-box {
  width: 640px;
  max-width: 92vw;
  height: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: rgba(30, 28, 40, 0.97);
  border: 1px solid rgba(124, 110, 240, 0.2);
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.palette-header {
  display: flex;
  align-items: center;
  padding: 0.8rem 1rem;
  border-bottom: 1px solid rgba(124, 110, 240, 0.15);
  flex-shrink: 0;
}

.palette-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #e0dcf0;
  flex: 1;
}

.palette-hint {
  font-size: 0.72rem;
  color: rgba(224, 220, 240, 0.4);
  margin-right: 0.75rem;
}

.palette-close {
  background: none;
  border: none;
  color: rgba(224, 220, 240, 0.5);
  font-size: 1.3rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
}

.palette-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e0dcf0;
}

.palette-chat {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.palette-chat::-webkit-scrollbar {
  width: 4px;
}
.palette-chat::-webkit-scrollbar-thumb {
  background: rgba(124, 110, 240, 0.3);
  border-radius: 2px;
}

.palette-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  text-align: center;
}

.welcome-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.welcome-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.welcome-text p {
  color: rgba(224, 220, 240, 0.7);
  font-size: 0.95rem;
  margin: 0;
  line-height: 1.6;
}

.chat-msg {
  display: flex;
  gap: 0.6rem;
  max-width: 90%;
  margin-bottom: 0.8rem;
}

/* Message List Animation (Elastic Reveal) */
.msg-list-enter-active {
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.msg-list-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
  filter: blur(4px);
}
.msg-list-leave-active {
  transition: all 0.3s ease;
}
.msg-list-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.chat-msg.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  flex-shrink: 0;
  background: rgba(124, 110, 240, 0.1);
  overflow: hidden;
  position: relative;
}

.thinking-glow::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    #4285f4,
    #9b72f3,
    #d96570,
    #4285f4
  );
  filter: blur(8px);
  opacity: 0.6;
  animation: rotate-glow 3s linear infinite;
  z-index: -1;
}

@keyframes rotate-glow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: relative;
  z-index: 1;
}

.msg-body {
  flex: 1;
  min-width: 0;
}

.msg-content {
  padding: 0.6rem 0.9rem;
  border-radius: 12px;
  font-size: 0.88rem;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  position: relative;
}

.chat-msg.user .msg-content {
  background: linear-gradient(135deg, #7c6ef0, #a78bfa);
  color: white;
  border-bottom-right-radius: 4px;
}

.chat-msg.assistant .msg-content {
  background: rgba(255, 255, 255, 0.06);
  color: #e0dcf0;
  border-bottom-left-radius: 4px;
}

/* Thinking Dots Animation (Premium) */
.thinking-state .msg-body {
  display: flex;
  align-items: center;
  padding-left: 0.5rem;
}

.thinking-dots {
  display: flex;
  gap: 6px;
  align-items: center;
}

.thinking-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  filter: drop-shadow(0 0 4px currentColor);
}

.dot-1 { color: #4285f4; background: currentColor; animation: organic-pulse 1.5s infinite ease-in-out; }
.dot-2 { color: #9b72f3; background: currentColor; animation: organic-pulse 1.5s infinite ease-in-out 0.2s; }
.dot-3 { color: #d96570; background: currentColor; animation: organic-pulse 1.5s infinite ease-in-out 0.4s; }

@keyframes organic-pulse {
  0%, 100% { 
    transform: scale(0.6) translateY(0);
    opacity: 0.4;
    filter: blur(1px) drop-shadow(0 0 2px currentColor);
  }
  40% { 
    transform: scale(1.3) translateY(-4px);
    opacity: 1;
    filter: blur(0px) drop-shadow(0 0 8px currentColor);
  }
}

.streaming-cursor::after {
  content: '|';
  animation: blink 0.8s infinite;
  color: #a78bfa;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.palette-input-area {
  border-top: 1px solid rgba(124, 110, 240, 0.15);
  padding: 0.6rem;
  flex-shrink: 0;
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.palette-input {
  flex: 1;
  padding: 0.7rem 1rem;
  border: 1px solid rgba(124, 110, 240, 0.2);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: #e0dcf0;
  font-size: 0.92rem;
  outline: none;
  font-family: inherit;
}

.palette-input:focus {
  border-color: rgba(124, 110, 240, 0.5);
}

.palette-input::placeholder {
  color: rgba(224, 220, 240, 0.35);
}

.send-btn {
  padding: 0.7rem 1.2rem;
  background: linear-gradient(135deg, #7c6ef0, #a78bfa);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.send-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transition */
.palette-enter-active { 
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
}
.palette-enter-active .palette-box { 
  transition: transform 0.4s cubic-bezier(0.2, 1.2, 0.85, 1), opacity 0.3s; 
}
.palette-leave-active { 
  transition: opacity 0.2s cubic-bezier(0.4, 0, 1, 1); 
}
.palette-leave-active .palette-box { 
  transition: transform 0.2s cubic-bezier(0.4, 0, 1, 1), opacity 0.2s; 
}
.palette-enter-from { opacity: 0; }
.palette-enter-from .palette-box { opacity: 0; transform: translateY(-40px) scale(0.92); }
.palette-leave-to { opacity: 0; }
.palette-leave-to .palette-box { opacity: 0; transform: translateY(-20px) scale(0.96); }
</style>

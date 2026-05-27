<template>
  <div class="task-log-section">
    <button class="log-toggle-btn" @click.stop="expanded = !expanded" @mousedown.stop>
      <span class="log-toggle-icon">{{ expanded ? '&#9660;' : '&#9654;' }}</span>
      <span v-if="!expanded && latestLog" class="log-preview">
        {{ latestLog.content.slice(0, 40) }}{{ latestLog.content.length > 40 ? '...' : '' }}
      </span>
      <span v-else-if="!expanded" class="log-preview log-empty">暂无日志</span>
      <span v-else class="log-preview">日志记录</span>
      <span class="log-count" v-if="logs.length">({{ logs.length }})</span>
    </button>

    <div class="log-expand-wrapper" :class="{ expanded }">
      <div class="log-panel" @click.stop @mousedown.stop>
        <!-- Add new log -->
        <div class="log-add">
          <textarea
            v-model="newContent"
            class="log-input"
            placeholder="记录当前进度、学到的内容..."
            rows="2"
          ></textarea>
          <div class="log-add-row">
            <input
              v-model="newNextStep"
              class="log-input-sm"
              placeholder="下一步计划（可选）"
            />
            <button class="btn btn-gradient btn-sm" @click="addLog" :disabled="!newContent.trim()" @mousedown.stop>
              添加
            </button>
          </div>
        </div>

        <!-- Log list -->
        <div v-if="logs.length" class="log-list">
          <div v-for="log in logs" :key="log.id" class="log-item">
            <Transition name="fade-slide" mode="out-in">
              <div v-if="editingId === log.id" key="edit" class="log-edit-pane">
                <textarea v-model="editContent" class="log-input" rows="2"></textarea>
                <div class="log-add-row">
                  <input v-model="editNextStep" class="log-input-sm" placeholder="下一步计划" />
                  <div class="log-edit-actions">
                    <button class="btn btn-glass btn-sm" @click="editingId = null" @mousedown.stop>取消</button>
                    <button class="btn btn-gradient btn-sm" @click="saveEdit(log.id)" @mousedown.stop>保存</button>
                  </div>
                </div>
              </div>
              <div v-else key="view" class="log-view-pane">
                <div class="log-item-header">
                  <span class="log-time">{{ formatTime(log.created_at) }}</span>
                  <div class="log-item-actions">
                    <button class="btn-icon" @click="startEdit(log)" title="编辑" @mousedown.stop>&#9998;</button>
                    <button class="btn-icon" @click="removeLog(log.id)" title="删除" @mousedown.stop>&times;</button>
                  </div>
                </div>
                <div class="log-content">{{ log.content }}</div>
                <div v-if="log.next_step" class="log-next">
                  <span class="log-next-label">下一步：</span>{{ log.next_step }}
                </div>
              </div>
            </Transition>
          </div>
        </div>
        <div v-else class="log-empty-state">暂无日志记录</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import api from '@/api'

const props = defineProps({
  planId: { type: Number, required: true }
})

const expanded = ref(false)
const logs = ref([])
const latestLog = ref(null)
const newContent = ref('')
const newNextStep = ref('')
const editingId = ref(null)
const editContent = ref('')
const editNextStep = ref('')

const loadLogs = async () => {
  try {
    logs.value = await api.getTaskLogs(props.planId)
    latestLog.value = logs.value[0] || null
  } catch (e) {}
}

watch(expanded, (val) => {
  if (val && !logs.value.length) loadLogs()
})

const addLog = async () => {
  const content = newContent.value.trim()
  if (!content) return
  try {
    const log = await api.createTaskLog(props.planId, {
      content,
      next_step: newNextStep.value.trim()
    })
    logs.value.unshift(log)
    latestLog.value = log
    newContent.value = ''
    newNextStep.value = ''
    window.toast('日志已添加')
  } catch (e) {
    window.toast('添加失败: ' + e.message, true)
  }
}

const startEdit = (log) => {
  editingId.value = log.id
  editContent.value = log.content
  editNextStep.value = log.next_step || ''
}

const saveEdit = async (id) => {
  try {
    const updated = await api.updateTaskLog(id, {
      content: editContent.value.trim(),
      next_step: editNextStep.value.trim()
    })
    const idx = logs.value.findIndex(l => l.id === id)
    if (idx >= 0) logs.value[idx] = updated
    if (latestLog.value?.id === id) latestLog.value = updated
    editingId.value = null
    window.toast('已更新')
  } catch (e) {
    window.toast('更新失败: ' + e.message, true)
  }
}

const removeLog = async (id) => {
  if (!confirm('确定删除这条日志？')) return
  try {
    await api.deleteTaskLog(id)
    logs.value = logs.value.filter(l => l.id !== id)
    latestLog.value = logs.value[0] || null
    window.toast('已删除')
  } catch (e) {
    window.toast('删除失败: ' + e.message, true)
  }
}

const formatTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return time
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' + time
}

// Expose loadLogs for parent to refresh
defineExpose({ loadLogs })
</script>

<style scoped>
.task-log-section {
  margin-top: 0.75rem;
  border-top: 1px solid rgba(168, 163, 191, 0.12);
  padding-top: 0.5rem;
}

.log-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--text-muted);
  padding: 0.3rem 0;
  width: 100%;
  text-align: left;
}

.log-toggle-btn:hover {
  color: var(--primary);
}

.log-toggle-icon {
  font-size: 0.65rem;
  transition: transform 0.2s;
}

.log-preview {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-empty {
  font-style: italic;
}

.log-count {
  font-size: 0.75rem;
  opacity: 0.6;
}

.log-panel {
  min-height: 0;
}

.log-expand-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.log-expand-wrapper.expanded {
  grid-template-rows: 1fr;
}

/* Rest of log panel styles */
.log-add {
  padding-top: 0.5rem;
  margin-bottom: 0.75rem;
}

.log-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text);
  font-size: 0.85rem;
  resize: vertical;
  font-family: inherit;
}

.log-input:focus {
  outline: none;
  border-color: var(--primary);
}

.log-input-sm {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text);
  font-size: 0.8rem;
}

.log-input-sm:focus {
  outline: none;
  border-color: var(--primary);
}

.log-add-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.4rem;
  align-items: center;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.log-item {
  padding: 0.6rem 0.75rem;
  background: rgba(168, 163, 191, 0.05);
  border-radius: 8px;
  border-left: 3px solid var(--primary);
}

.log-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.3rem;
}

.log-time {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.log-item-actions {
  display: flex;
  gap: 0.3rem;
  opacity: 0.4;
  transition: opacity 0.2s;
}

.log-item:hover .log-item-actions {
  opacity: 1;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  min-width: 24px;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: rgba(168, 163, 191, 0.15);
  color: var(--primary);
}

.log-content {
  font-size: 0.88rem;
  color: var(--text);
  line-height: 1.5;
  white-space: pre-wrap;
}

.log-next {
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: var(--text-soft);
  padding: 0.3rem 0.5rem;
  background: rgba(124, 110, 240, 0.06);
  border-radius: 6px;
}

.log-next-label {
  font-weight: 600;
  color: var(--primary);
}

.log-edit-actions {
  display: flex;
  gap: 0.3rem;
}

.log-empty-state {
  text-align: center;
  padding: 1rem;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.btn {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-gradient {
  background: linear-gradient(135deg, var(--primary), #a78bfa);
  color: white;
}

.btn-glass {
  background: rgba(255, 255, 255, 0.15);
  color: var(--text);
  border: 1px solid var(--glass-border);
}

.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>

<template>
  <div class="page active">
    <div class="page-header">
      <h2>今日规划</h2>
      <div class="page-actions">
        <button class="btn btn-glass" @click="showAddModal = true">+ 新增规划</button>
      </div>
    </div>

    <!-- Date Navigation -->
    <div class="date-nav">
      <button class="btn btn-glass btn-sm" @click="changeDate(-1)">&laquo; 前一天</button>
      <span class="date-display" :class="{ today: isToday }">{{ dateDisplay }}</span>
      <button class="btn btn-glass btn-sm" @click="changeDate(1)">后一天 &raquo;</button>
      <button v-if="!isToday" class="btn btn-glass btn-sm" @click="goToday">回到今天</button>
    </div>

    <!-- Plan Items -->
    <div class="plan-items">
      <TransitionGroup name="list" tag="div" class="plan-items-inner">
        <div
          v-for="(item, idx) in items"
          :key="item.id"
          class="plan-item"
          :class="[`status-${item.status}`]"
          draggable="true"
          @dragstart="onDragStart(idx)"
          @dragover.prevent="onDragOver(idx)"
          @drop="onDrop(idx)"
          @dragend="dragIdx = -1"
        >
          <div class="plan-item-handle">
            <span class="item-number">{{ idx + 1 }}</span>
          </div>

          <div class="plan-item-body">
            <div class="plan-item-header">
              <span class="plan-item-title">{{ item.title }}</span>
              <span v-if="item.linked_title" class="plan-item-linked">
                &#128279; {{ item.linked_title }}
              </span>
            </div>
            <div v-if="item.note" class="plan-item-note">{{ item.note }}</div>
          </div>

          <div class="plan-item-right">
            <select
              :value="item.status"
              @change="updateStatus(item.id, $event.target.value)"
              class="status-select"
              @click.stop
            >
              <option value="pending">未开始</option>
              <option value="active">进行中</option>
              <option value="done">已完成</option>
              <option value="paused">暂缓</option>
            </select>
            <div class="plan-item-actions">
              <button class="btn-icon" @click.stop="startEdit(item)" title="编辑">&#9998;</button>
              <button class="btn-icon" @click.stop="removeItem(item.id)" title="删除">&times;</button>
            </div>
          </div>
        </div>
      </TransitionGroup>

      <Transition name="fade">
        <div v-if="!loading && !items.length" class="empty-state">
          <div class="empty-icon">&#128221;</div>
          <p>还没有今日规划，点击右上角添加</p>
        </div>
      </Transition>
    </div>

    <!-- Add Modal -->
    <GlassModal v-model="showAddModal" title="新增规划" @close="showAddModal = false">
      <div class="form-group">
        <label>规划标题</label>
        <input type="text" v-model="addForm.title" placeholder="今天要做什么">
      </div>
      <div class="form-group">
        <label>备注 / 思路</label>
        <textarea v-model="addForm.note" rows="3" placeholder="为什么要做、怎么做的思路..."></textarea>
      </div>
      <div class="form-group">
        <label>关联任务（可选）</label>
        <select v-model="addForm.linked_plan_id">
          <option :value="null">不关联</option>
          <option v-for="p in availablePlans" :key="p.id" :value="p.id">
            {{ p.title }}
          </option>
        </select>
      </div>
      <template #footer>
        <button class="btn btn-glass" @click="showAddModal = false">取消</button>
        <button class="btn btn-gradient" @click="addItem" :disabled="!addForm.title.trim()">添加</button>
      </template>
    </GlassModal>

    <!-- Edit Modal -->
    <GlassModal v-model="showEditModal" title="编辑规划" @close="showEditModal = false">
      <div class="form-group">
        <label>规划标题</label>
        <input type="text" v-model="editForm.title" placeholder="规划标题">
      </div>
      <div class="form-group">
        <label>备注 / 思路</label>
        <textarea v-model="editForm.note" rows="3" placeholder="备注..."></textarea>
      </div>
      <div class="form-group">
        <label>关联任务（可选）</label>
        <select v-model="editForm.linked_plan_id">
          <option :value="null">不关联</option>
          <option v-for="p in availablePlans" :key="p.id" :value="p.id">
            {{ p.title }}
          </option>
        </select>
      </div>
      <template #footer>
        <button class="btn btn-glass" @click="showEditModal = false">取消</button>
        <button class="btn btn-gradient" @click="saveEdit">保存</button>
      </template>
    </GlassModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/api'
import GlassModal from '@/components/common/GlassModal.vue'

const items = ref([])
const availablePlans = ref([])
const loading = ref(true)

const todayStr = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const currentDate = ref(todayStr())
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingId = ref(null)
const dragIdx = ref(-1)

const addForm = ref({ title: '', note: '', linked_plan_id: null })
const editForm = ref({ title: '', note: '', linked_plan_id: null })

const dateFromStr = (s) => {
  const p = s.split('-')
  return new Date(+p[0], +p[1] - 1, +p[2])
}

const isToday = computed(() => currentDate.value === todayStr())
const dateDisplay = computed(() => {
  const d = dateFromStr(currentDate.value)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  let label = `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
  if (currentDate.value === todayStr()) label = '今天 ' + label
  return label
})

const changeDate = (delta) => {
  const parts = currentDate.value.split('-')
  const d = new Date(+parts[0], +parts[1] - 1, +parts[2] + delta)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  currentDate.value = `${y}-${m}-${day}`
}

const goToday = () => {
  currentDate.value = todayStr()
}

const loadItems = async () => {
  loading.value = true
  try {
    items.value = await api.getDailyPlans(currentDate.value)
  } catch (e) {
    window.toast('加载失败: ' + e.message, true)
  } finally {
    loading.value = false
  }
}

const loadAvailablePlans = async () => {
  try {
    const plans = await api.getPlans('today')
    availablePlans.value = plans
  } catch (e) {}
}

const addItem = async () => {
  const title = addForm.value.title.trim()
  if (!title) return
  try {
    const item = await api.createDailyPlan({
      date: currentDate.value,
      title,
      note: addForm.value.note.trim(),
      sort_order: items.value.length,
      linked_plan_id: addForm.value.linked_plan_id
    })
    items.value.push(item)
    addForm.value = { title: '', note: '', linked_plan_id: null }
    showAddModal.value = false
    window.toast('已添加')
  } catch (e) {
    window.toast('添加失败: ' + e.message, true)
  }
}

const startEdit = (item) => {
  editingId.value = item.id
  editForm.value = {
    title: item.title,
    note: item.note || '',
    linked_plan_id: item.linked_plan_id
  }
  showEditModal.value = true
}

const saveEdit = async () => {
  try {
    const updated = await api.updateDailyPlan(editingId.value, {
      title: editForm.value.title.trim(),
      note: editForm.value.note.trim(),
      linked_plan_id: editForm.value.linked_plan_id
    })
    const idx = items.value.findIndex(i => i.id === editingId.value)
    if (idx >= 0) items.value[idx] = updated
    showEditModal.value = false
    window.toast('已更新')
  } catch (e) {
    window.toast('更新失败: ' + e.message, true)
  }
}

const updateStatus = async (id, status) => {
  try {
    const updated = await api.updateDailyPlan(id, { status })
    const idx = items.value.findIndex(i => i.id === id)
    if (idx >= 0) items.value[idx] = updated
  } catch (e) {
    window.toast('更新失败', true)
  }
}

const removeItem = async (id) => {
  if (!confirm('确定删除这条规划？')) return
  try {
    await api.deleteDailyPlan(id)
    items.value = items.value.filter(i => i.id !== id)
    window.toast('已删除')
  } catch (e) {
    window.toast('删除失败: ' + e.message, true)
  }
}

// Drag and drop reorder
const onDragStart = (idx) => { dragIdx.value = idx }
const onDragOver = (idx) => {
  if (dragIdx.value === -1 || dragIdx.value === idx) return
  const item = items.value.splice(dragIdx.value, 1)[0]
  items.value.splice(idx, 0, item)
  dragIdx.value = idx
}
const onDrop = async () => {
  dragIdx.value = -1
  const ids = items.value.map(i => i.id)
  try {
    await api.reorderDailyPlans(currentDate.value, ids)
  } catch (e) {}
}

watch(currentDate, () => loadItems())

onMounted(() => {
  loadItems()
  loadAvailablePlans()
})
</script>

<style scoped>
.date-nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.date-display {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  min-width: 180px;
  text-align: center;
}

.date-display.today {
  color: var(--primary);
}

.plan-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 2rem;
}

.plan-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  cursor: grab;
  transition: all 0.2s;
  border-left: 4px solid var(--primary);
}

.plan-item:active {
  cursor: grabbing;
}

.plan-item.status-done {
  opacity: 0.6;
  border-left-color: var(--success);
}

.plan-item.status-active {
  border-left-color: var(--warning);
  background: rgba(251, 191, 36, 0.05);
}

.plan-item.status-paused {
  border-left-color: var(--text-muted);
  opacity: 0.7;
}

.plan-item-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #a78bfa);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
}

.plan-item-body {
  flex: 1;
  min-width: 0;
}

.plan-item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.3rem;
}

.plan-item-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.plan-item-linked {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  background: rgba(124, 110, 240, 0.08);
  color: var(--primary);
  border-radius: 6px;
}

.plan-item-note {
  font-size: 0.85rem;
  color: var(--text-soft);
  line-height: 1.5;
  white-space: pre-wrap;
}

.plan-item-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.status-select {
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text);
  font-size: 0.78rem;
  cursor: pointer;
}

.status-select:focus {
  outline: none;
  border-color: var(--primary);
}

.plan-item-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0.4;
  transition: opacity 0.2s;
}

.plan-item:hover .plan-item-actions {
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
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-glass {
  background: rgba(255, 255, 255, 0.15);
  color: var(--text);
  border: 1px solid var(--glass-border);
}

.btn-gradient {
  background: linear-gradient(135deg, var(--primary), #a78bfa);
  color: white;
}

.btn-sm {
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.4rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text);
  font-size: 0.9rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
}
</style>

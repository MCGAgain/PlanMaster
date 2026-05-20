<template>
  <div class="page active">
    <div class="page-header">
      <h2>重要事项</h2>
      <div class="page-actions">
        <button class="btn btn-glass" @click="showAddImportantModal">+ 新增事项</button>
      </div>
    </div>
    <div class="search-wrap">
      <input type="text" class="search-input" placeholder="搜索重要事项... (支持拼音)" v-model="searchKeyword">
      <span class="search-clear" v-show="searchKeyword" @click="searchKeyword = ''">&times;</span>
    </div>
    <div class="plan-list">
      <TransitionGroup name="list">
        <div v-for="(p, idx) in filteredItems" :key="p.id" class="plan-card" :data-id="p.id" :style="{ animationDelay: (idx * 0.04) + 's' }">
          <div class="plan-card-body">
            <div class="plan-card-title">{{ p.title }}</div>
            <div class="plan-card-meta">
              <span v-if="p.due_date" class="plan-badge badge-due badge-due-normal">{{ p.due_date }}</span>
              <span v-if="dueBadge(p.due_date)" class="plan-badge" :class="dueBadgeClass(p.due_date)">{{ dueBadge(p.due_date) }}</span>
            </div>
            <div v-if="p.description" class="plan-card-desc">{{ p.description }}</div>
            <div class="plan-card-actions">
              <button class="btn btn-glass btn-sm" @click="editImportant(p)">编辑</button>
              <button class="btn btn-danger btn-sm" @click="deleteImportant(p.id)">删除</button>
            </div>
          </div>
        </div>
      </TransitionGroup>
      <div v-if="!filteredItems.length" class="empty-state">{{ allItems.length ? '没有匹配的事项' : '暂无重要事项，点击右上角添加' }}</div>
    </div>

    <div class="modal" :class="{ show: showModal }">
      <div class="modal-overlay" @click="closeModal"></div>
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>{{ editingId ? '编辑重要事项' : '新增重要事项' }}</h3>
          <span class="modal-close" @click="closeModal">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>计划标题</label><input type="text" v-model="form.title" placeholder="输入计划标题"></div>
          <div class="form-group"><label>计划描述</label><textarea v-model="form.description" rows="3" placeholder="详细描述你的计划..."></textarea></div>
          <div class="form-group"><label>截止日期</label><input type="date" v-model="form.due_date"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-glass" @click="closeModal">取消</button>
          <button class="btn btn-gradient" @click="saveImportant">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePinyin } from '@/composables/usePinyin'
import api from '@/api'

const { matchPinyin } = usePinyin()
const allItems = ref([])
const searchKeyword = ref('')
const showModal = ref(false)
const editingId = ref(null)
const form = ref({ title: '', description: '', due_date: '' })

const filteredItems = computed(() => {
  if (!searchKeyword.value) return allItems.value
  return allItems.value.filter(p => matchPinyin(p.title, searchKeyword.value) || matchPinyin(p.description || '', searchKeyword.value))
})

function daysUntilDue(dueDate) {
  if (!dueDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  return Math.ceil((due - today) / 86400000)
}

function dueBadge(dueDate) {
  const days = daysUntilDue(dueDate)
  if (days === null) return ''
  if (days < 0) return '已过期'
  if (days === 0) return '今日到期'
  if (days <= 3) return `还有${days}天`
  return `还有${days}天`
}

function dueBadgeClass(dueDate) {
  const days = daysUntilDue(dueDate)
  if (days === null) return ''
  if (days <= 0) return 'badge-due-today'
  if (days <= 3) return 'badge-due-soon'
  return 'badge-due-normal'
}

const loadImportantItems = async () => {
  try { allItems.value = await api.getImportantItems() } catch (e) { window.toast('加载失败: ' + e.message, true) }
}

const showAddImportantModal = () => { editingId.value = null; form.value = { title: '', description: '', due_date: '' }; showModal.value = true }
const editImportant = (p) => { editingId.value = p.id; form.value = { title: p.title, description: p.description || '', due_date: p.due_date || '' }; showModal.value = true }
const closeModal = () => { showModal.value = false }

const saveImportant = async () => {
  const title = form.value.title.trim()
  if (!title) { window.toast('请输入标题', true); return }
  if (!form.value.due_date) { window.toast('请选择截止日期', true); return }
  try {
    const body = { title, description: form.value.description.trim(), due_date: form.value.due_date }
    if (editingId.value) { await api.updateImportantItem(editingId.value, body); window.toast('已更新') }
    else { await api.createImportantItem(body); window.toast('已创建') }
    closeModal(); await loadImportantItems()
  } catch (e) { window.toast('保存失败: ' + e.message, true) }
}

const deleteImportant = async (id) => {
  if (!confirm('确定删除此重要事项？')) return
  try { await api.deleteImportantItem(id); window.toast('已删除'); await loadImportantItems() }
  catch (e) { window.toast('删除失败: ' + e.message, true) }
}

onMounted(() => { loadImportantItems() })
</script>

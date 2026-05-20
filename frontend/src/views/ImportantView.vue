<template>
  <div class="important-view">
    <Header title="重要事项" searchable @search="handleSearch">
      <template #actions>
        <GlassButton variant="primary" @click="showAddModal = true">
          + 新增事项
        </GlassButton>
      </template>
    </Header>

    <div class="items-list">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="plan-card"
      >
        <div class="plan-card-body">
          <div class="plan-card-title">{{ item.title }}</div>
          <div class="plan-card-meta">
            <span v-if="item.due_date" class="plan-badge badge-due badge-due-normal">
              {{ item.due_date }}
            </span>
            <span v-if="getDueBadge(item.due_date)" :class="getDueBadgeClass(item.due_date)">
              {{ getDueBadge(item.due_date) }}
            </span>
          </div>
          <div v-if="item.description" class="plan-card-desc">
            {{ item.description }}
          </div>
          <div class="plan-card-actions">
            <GlassButton variant="secondary" size="small" @click="handleEdit(item)">
              编辑
            </GlassButton>
            <GlassButton variant="danger" size="small" @click="handleDelete(item)">
              删除
            </GlassButton>
          </div>
        </div>
      </div>
    </div>

    <GlassCard v-if="filteredItems.length === 0" class="empty-state">
      <p>{{ items.length > 0 ? '没有匹配的事项' : '暂无重要事项，点击右上角添加' }}</p>
    </GlassCard>

    <!-- 新增弹窗 -->
    <GlassModal v-model="showAddModal" title="新增重要事项">
      <form class="item-form" @submit.prevent="handleAdd">
        <GlassInput
          v-model="form.title"
          label="事项标题"
          placeholder="输入事项标题"
          :error="formErrors.title"
        />
        <GlassInput
          v-model="form.description"
          label="事项描述（可选）"
          placeholder="输入事项描述"
        />
        <GlassInput
          v-model="form.due_date"
          label="截止日期"
          type="date"
          :error="formErrors.due_date"
        />
        <div class="form-actions">
          <GlassButton type="submit" variant="primary">添加</GlassButton>
          <GlassButton type="button" variant="secondary" @click="showAddModal = false">取消</GlassButton>
        </div>
      </form>
    </GlassModal>

    <!-- 编辑弹窗 -->
    <GlassModal v-model="showEditModal" title="编辑重要事项">
      <form class="item-form" @submit.prevent="handleUpdate">
        <GlassInput
          v-model="editForm.title"
          label="事项标题"
          placeholder="输入事项标题"
          :error="editFormErrors.title"
        />
        <GlassInput
          v-model="editForm.description"
          label="事项描述（可选）"
          placeholder="输入事项描述"
        />
        <GlassInput
          v-model="editForm.due_date"
          label="截止日期"
          type="date"
        />
        <div class="form-actions">
          <GlassButton type="submit" variant="primary">更新</GlassButton>
          <GlassButton type="button" variant="secondary" @click="showEditModal = false">取消</GlassButton>
        </div>
      </form>
    </GlassModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePinyin } from '@/composables/usePinyin'
import api from '@/api'
import Header from '@/components/layout/Header.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassModal from '@/components/common/GlassModal.vue'
import GlassButton from '@/components/common/GlassButton.vue'
import GlassInput from '@/components/common/GlassInput.vue'

const { matchPinyin } = usePinyin()

const items = ref([])
const loading = ref(false)
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingItem = ref(null)
const searchQuery = ref('')

const form = ref({ title: '', description: '', due_date: '' })
const formErrors = ref({ title: '', due_date: '' })
const editForm = ref({ title: '', description: '', due_date: '' })
const editFormErrors = ref({ title: '' })

const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value
  return items.value.filter(i =>
    matchPinyin(i.title, searchQuery.value) ||
    matchPinyin(i.description || '', searchQuery.value)
  )
})

onMounted(async () => {
  await fetchItems()
})

const fetchItems = async () => {
  loading.value = true
  try {
    items.value = await api.getImportantItems()
  } catch (error) {
    console.error('Failed to fetch important items:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = (query) => {
  searchQuery.value = query
}

const handleEdit = (item) => {
  editingItem.value = item
  editForm.value = {
    title: item.title,
    description: item.description || '',
    due_date: item.due_date || ''
  }
  showEditModal.value = true
}

const handleDelete = async (item) => {
  if (!confirm(`确定要删除"${item.title}"吗？`)) return
  try {
    await api.deleteImportantItem(item.id)
    items.value = items.value.filter(i => i.id !== item.id)
  } catch (error) {
    alert('删除失败: ' + error.message)
  }
}

const handleAdd = async () => {
  formErrors.value = { title: '', due_date: '' }
  if (!form.value.title.trim()) {
    formErrors.value.title = '请输入事项标题'
    return
  }
  if (!form.value.due_date) {
    formErrors.value.due_date = '请选择截止日期'
    return
  }
  try {
    const newItem = await api.createImportantItem(form.value)
    items.value.push(newItem)
    form.value = { title: '', description: '', due_date: '' }
    showAddModal.value = false
  } catch (error) {
    alert('创建失败: ' + error.message)
  }
}

const handleUpdate = async () => {
  editFormErrors.value = { title: '' }
  if (!editForm.value.title.trim()) {
    editFormErrors.value.title = '请输入事项标题'
    return
  }
  try {
    const updated = await api.updateImportantItem(editingItem.value.id, editForm.value)
    const index = items.value.findIndex(i => i.id === editingItem.value.id)
    if (index !== -1) {
      items.value[index] = updated
    }
    showEditModal.value = false
    editingItem.value = null
  } catch (error) {
    alert('更新失败: ' + error.message)
  }
}

const daysUntilDue = (dueDate) => {
  if (!dueDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  return Math.ceil((due - today) / 86400000)
}

const getDueBadge = (dueDate) => {
  const days = daysUntilDue(dueDate)
  if (days === null) return ''
  if (days < 0) return '已过期'
  if (days === 0) return '今日到期'
  if (days <= 3) return `还有${days}天`
  return `还有${days}天`
}

const getDueBadgeClass = (dueDate) => {
  const days = daysUntilDue(dueDate)
  if (days === null) return ''
  if (days < 0 || days === 0) return 'plan-badge badge-due badge-due-today'
  if (days <= 3) return 'plan-badge badge-due badge-due-soon'
  return 'plan-badge badge-due badge-due-normal'
}
</script>

<style scoped>
.important-view {
  min-height: 100vh;
}

.items-list {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.plan-card {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  backdrop-filter: blur(var(--glass-blur));
}

.plan-card-body {
  flex: 1;
}

.plan-card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.plan-card-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.plan-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.badge-due {
  font-weight: 500;
}

.badge-due-normal {
  background: rgba(124, 110, 240, 0.1);
  color: var(--primary);
}

.badge-due-soon {
  background: rgba(251, 191, 36, 0.1);
  color: var(--warning);
}

.badge-due-today {
  background: rgba(248, 113, 113, 0.1);
  color: var(--danger);
}

.plan-card-desc {
  font-size: 0.9rem;
  color: var(--text-soft);
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.plan-card-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  margin: 2rem;
  text-align: center;
  color: var(--text-muted);
}

.item-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>

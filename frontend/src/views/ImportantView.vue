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
      <GlassCard
        v-for="item in filteredItems"
        :key="item.id"
        class="important-item"
      >
        <div class="item-header">
          <h3>{{ item.title }}</h3>
          <div class="item-actions">
            <GlassButton
              variant="secondary"
              size="small"
              @click="handleEdit(item)"
            >
              编辑
            </GlassButton>
            <GlassButton
              variant="danger"
              size="small"
              @click="handleDelete(item)"
            >
              删除
            </GlassButton>
          </div>
        </div>
        <p v-if="item.description" class="item-description">
          {{ item.description }}
        </p>
      </GlassCard>
    </div>

    <GlassCard v-if="filteredItems.length === 0" class="empty-state">
      <p>暂无重要事项，点击右上角添加</p>
    </GlassCard>

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
        <div class="form-actions">
          <GlassButton type="submit" variant="primary">添加</GlassButton>
          <GlassButton type="button" variant="secondary" @click="showAddModal = false">取消</GlassButton>
        </div>
      </form>
    </GlassModal>

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
import api from '@/api'
import Header from '@/components/layout/Header.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassModal from '@/components/common/GlassModal.vue'
import GlassButton from '@/components/common/GlassButton.vue'
import GlassInput from '@/components/common/GlassInput.vue'

const items = ref([])
const loading = ref(false)
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingItem = ref(null)
const searchQuery = ref('')

const form = ref({ title: '', description: '' })
const formErrors = ref({ title: '' })
const editForm = ref({ title: '', description: '' })
const editFormErrors = ref({ title: '' })

const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value
  const query = searchQuery.value.toLowerCase()
  return items.value.filter(i =>
    i.title.toLowerCase().includes(query) ||
    i.description?.toLowerCase().includes(query)
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
  editForm.value = { title: item.title, description: item.description || '' }
  showEditModal.value = true
}

const handleDelete = async (item) => {
  if (confirm(`确定要删除"${item.title}"吗？`)) {
    try {
      await api.deleteImportantItem(item.id)
      items.value = items.value.filter(i => i.id !== item.id)
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }
}

const handleAdd = async () => {
  formErrors.value = { title: '' }
  if (!form.value.title.trim()) {
    formErrors.value.title = '请输入事项标题'
    return
  }
  try {
    const newItem = await api.createImportantItem(form.value)
    items.value.push(newItem)
    form.value = { title: '', description: '' }
    showAddModal.value = false
  } catch (error) {
    console.error('Failed to create item:', error)
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
    console.error('Failed to update item:', error)
  }
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

.important-item {
  margin-bottom: 0;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.item-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text);
}

.item-actions {
  display: flex;
  gap: 0.5rem;
}

.item-description {
  margin: 0.75rem 0 0;
  color: var(--text-soft);
  font-size: 0.95rem;
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

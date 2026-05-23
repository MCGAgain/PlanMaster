<template>
  <div class="page active">
    <div class="page-header">
      <h2>重要事项</h2>
      <div class="page-actions">
        <button class="btn btn-glass" @click="showAddImportantModal">+ 新增事项</button>
      </div>
    </div>
    
    <div class="search-wrap">
      <input 
        type="text" 
        class="search-input" 
        placeholder="搜索重要事项... (支持拼音)" 
        v-model="searchKeyword"
      >
      <span class="search-clear" v-show="searchKeyword" @click="searchKeyword = ''">&times;</span>
    </div>

    <div class="plan-list">
      <TransitionGroup 
        name="list" 
        tag="div" 
        class="plan-list-inner"
        @before-enter="onItemBeforeEnter"
        @enter="onItemEnter"
        @leave="onItemLeave"
      >
        <div v-for="(p, idx) in filteredItems" :key="p.id" class="plan-card-wrapper" :data-index="idx">
          <PlanCard
            :plan="{ ...p, plan_type: 'important' }"
            @edit="editImportant"
            @delete="deleteImportant"
          />
        </div>
      </TransitionGroup>
      
      <Transition name="fade">
        <div v-if="!filteredItems.length" class="empty-state">
          <div class="empty-icon">&#9888;</div>
          <p>{{ allItems.length ? '没有匹配的事项' : '暂无重要事项，点击右上角添加' }}</p>
        </div>
      </Transition>
    </div>

    <div class="modal" :class="{ show: showModal }">
      <div class="modal-overlay" @click="closeModal"></div>
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>{{ editingId ? '编辑重要事项' : '新增重要事项' }}</h3>
          <span class="modal-close" @click="closeModal">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>计划标题</label>
            <input type="text" v-model="form.title" placeholder="输入计划标题">
          </div>
          <div class="form-group">
            <label>计划描述</label>
            <textarea v-model="form.description" rows="3" placeholder="详细描述你的计划..."></textarea>
          </div>
          <div class="form-group">
            <label>截止日期</label>
            <input type="date" v-model="form.due_date">
          </div>
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { usePinyin } from '@/composables/usePinyin'
import gsap from 'gsap'
import api from '@/api'
import PlanCard from '@/components/business/PlanCard.vue'

const { matchPinyin } = usePinyin()
const allItems = ref([])
const searchKeyword = ref('')
const showModal = ref(false)
const editingId = ref(null)
const form = ref({ title: '', description: '', due_date: '' })

/**
 * GSAP Transition Group Hooks (iOS-style)
 */
function onItemBeforeEnter(el) {
  gsap.set(el, {
    opacity: 0,
    y: 30,
    scale: 0.94
  })
}

function onItemEnter(el, done) {
  const delay = el.dataset.index * 0.05
  gsap.to(el, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.5,
    delay: delay,
    ease: 'power3.out',
    onComplete: () => {
      gsap.set(el, { clearProps: 'transform' })
      done()
    }
  })
}

function onItemLeave(el, done) {
  gsap.to(el, {
    opacity: 0,
    scale: 0.9,
    duration: 0.4,
    ease: 'power2.in',
    onComplete: done
  })
}

const filteredItems = computed(() => {
  if (!searchKeyword.value) return allItems.value
  return allItems.value.filter(p => 
    matchPinyin(p.title, searchKeyword.value) || 
    matchPinyin(p.description || '', searchKeyword.value)
  )
})

const loadImportantItems = async () => {
  try { 
    allItems.value = await api.getImportantItems() 
  } catch (e) { 
    window.toast('加载失败: ' + e.message, true) 
  }
}

const showAddImportantModal = () => { 
  editingId.value = null
  form.value = { title: '', description: '', due_date: '' }
  showModal.value = true 
}

const editImportant = (p) => { 
  editingId.value = p.id
  form.value = { title: p.title, description: p.description || '', due_date: p.due_date || '' }
  showModal.value = true 
}

const closeModal = () => { showModal.value = false }

const saveImportant = async () => {
  const title = form.value.title.trim()
  if (!title) { window.toast('请输入标题', true); return }
  if (!form.value.due_date) { window.toast('请选择截止日期', true); return }
  try {
    const body = { title, description: form.value.description.trim(), due_date: form.value.due_date }
    if (editingId.value) { 
      await api.updateImportantItem(editingId.value, body)
      window.toast('已更新') 
    } else { 
      await api.createImportantItem(body)
      window.toast('已创建') 
    }
    closeModal()
    await loadImportantItems()
  } catch (e) { 
    window.toast('保存失败: ' + e.message, true) 
  }
}

const deleteImportant = async (p) => {
  if (!confirm('确定删除此重要事项？')) return
  try { 
    await api.deleteImportantItem(p.id)
    window.toast('已删除')
    await loadImportantItems() 
  } catch (e) { 
    window.toast('删除失败: ' + e.message, true) 
  }
}

onMounted(() => { loadImportantItems() })
</script>

<style scoped>
.plan-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 2rem;
}

.plan-card-wrapper {
  will-change: transform, opacity;
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
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.list-move {
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.list-leave-active {
  position: absolute;
  width: 100%;
}
</style>

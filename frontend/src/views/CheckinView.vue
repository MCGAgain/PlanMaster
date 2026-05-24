<template>
  <div class="page active checkin-page">
    <div class="page-header">
      <h2>打卡</h2>
      <div class="page-actions">
        <button class="btn btn-glass" @click="showAddCheckinModal">+ 新增打卡</button>
      </div>
    </div>

    <div class="checkin-container">
      <div v-if="loading" class="empty-state">
        <p>正在获取打卡项目...</p>
      </div>
      <div v-else class="checkin-list">
        <TransitionGroup name="list" tag="div" class="plan-list-inner">
          <div v-for="(item, idx) in items" :key="item.id" class="plan-card-wrapper">
            <GlassCard 
              class="checkin-card-item" 
              :data-id="item.id" 
              hoverable
              @mousedown="onPress($event)"
              @mouseup="onRelease($event)"
              @mouseleave="onRelease($event)"
              @mouseenter="onHoverEnter($event)"
            >
              <div class="checkin-card-content">
                <div class="checkin-icon">
                  <span class="checkin-check" :class="{ checked: item.checked_today }">
                    <span v-if="item.checked_today" class="check-mark">✓</span>
                  </span>
                </div>
                <div class="plan-card-body">
                  <div class="plan-card-title">{{ item.name }}</div>
                  <div class="plan-card-meta">
                    <span class="plan-badge badge-checkin-streak">连续 {{ item.streak }} 天</span>
                    <span v-if="item.current_value > 0" class="plan-badge badge-checkin-value">{{ item.current_value.toFixed(1) }} 价值</span>
                  </div>
                  <div class="plan-progress">
                    <div class="plan-progress-track">
                      <div class="plan-progress-bar checkin-bar" :style="{ width: Math.min(100, Math.round((item.current_value / 30) * 100)) + '%' }"></div>
                    </div>
                    <span class="plan-progress-text">{{ item.current_value.toFixed(1) }}</span>
                  </div>
                  <div class="plan-card-actions">
                    <button v-if="!item.checked_today" class="btn btn-success btn-sm" @click.stop="doCheckin(item.id)">
                      <span class="icon-check"></span> 打卡
                    </button>
                    <span v-else class="checkin-done">今日已打卡</span>
                    <button class="btn btn-danger btn-sm" @click.stop="deleteCheckinItem(item.id)">删除</button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </TransitionGroup>
        
        <Transition name="fade">
          <div v-if="!items.length" class="empty-state">暂无打卡项目，点击右上角添加</div>
        </Transition>
      </div>
    </div>

    <!-- Add Checkin Modal -->
    <GlassModal
      v-model="showModal"
      title="新增打卡"
      @close="closeModal"
    >
      <div class="form-group">
        <label>打卡名称</label>
        <input type="text" v-model="checkinName" placeholder="如：早起、运动、阅读...">
      </div>

      <template #footer>
        <button class="btn btn-glass" @click="closeModal">取消</button>
        <button class="btn btn-gradient" @click="saveCheckin">保存</button>
      </template>
    </GlassModal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import gsap from 'gsap'
import api from '@/api'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassModal from '@/components/common/GlassModal.vue'

const items = ref([])
const showModal = ref(false)
const checkinName = ref('')
const loading = ref(true)
let checkinSaving = false

const loadCheckins = async (isInitial = false) => {
  if (isInitial) loading.value = true
  try { 
    const data = await api.getCheckinItems()
    items.value = data
  } catch (e) { 
    window.toast('加载失败: ' + e.message, true) 
  } finally { 
    if (isInitial) loading.value = false 
  }
}

const showAddCheckinModal = () => { checkinName.value = ''; showModal.value = true }
const closeModal = () => { showModal.value = false }

const saveCheckin = async () => {
  const name = checkinName.value.trim()
  if (!name) { window.toast('请输入打卡名称', true); return }
  if (checkinSaving) return
  checkinSaving = true
  try { await api.createCheckinItem(name); window.toast('打卡项目已创建'); closeModal(); await loadCheckins() }
  catch (e) { window.toast('创建失败: ' + e.message, true) }
  finally { checkinSaving = false }
}

const doCheckin = async (id) => {
  try { 
    await api.checkin(id)
    window.toast('打卡成功！')
    const updatedItems = await api.getCheckinItems()
    items.value = updatedItems
    window.loadBalance && window.loadBalance() 
  }
  catch (e) { window.toast(e.message, true) }
}

const deleteCheckinItem = async (id) => {
  if (!confirm('确定删除此打卡项目？所有记录将被清除。')) return
  try { 
    await api.deleteCheckinItem(id)
    window.toast('已删除')
    items.value = items.value.filter(i => i.id !== id)
  }
  catch (e) { window.toast('删除失败: ' + e.message, true) }
}

// Interactive Animations
const onPress = (e) => {
  gsap.to(e.currentTarget, { scale: 0.96, duration: 0.2, ease: 'power2.out' })
}

const onRelease = (e) => {
  const card = e.currentTarget
  const isHovered = card.matches(':hover')
  gsap.to(card, { 
    scale: isHovered ? 1.02 : 1,
    y: isHovered ? -8 : 0,
    boxShadow: isHovered ? '0 24px 60px rgba(100, 80, 200, 0.2)' : 'var(--glass-shadow)',
    duration: 0.4, 
    ease: 'power2.out'
  })
}

const onHoverEnter = (e) => {
  gsap.to(e.currentTarget, {
    y: -8,
    scale: 1.02,
    boxShadow: '0 24px 60px rgba(100, 80, 200, 0.2)',
    duration: 0.4,
    ease: 'power2.out'
  })
}

onMounted(() => { loadCheckins(true) })
</script>

<style scoped>
.checkin-container {
  padding-bottom: 40px;
}

.checkin-card-item {
  margin-bottom: 20px;
}

.checkin-card-content {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.checkin-icon {
  padding-top: 5px;
}

.checkin-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--glass-border);
  transition: all 0.3s ease;
  background: var(--glass-bg);
}

.checkin-check.checked {
  background: var(--success);
  border-color: var(--success);
  box-shadow: 0 0 15px rgba(52, 211, 153, 0.4);
}

.check-mark {
  color: white;
  font-weight: 800;
  font-size: 16px;
  animation: check-bounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes check-bounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}

.checkin-done {
  font-size: 14px;
  color: var(--success);
  font-weight: 700;
}

.checkin-bar {
  background: linear-gradient(90deg, var(--success), #34d399) !important;
}

.plan-progress-text {
  font-weight: 700;
  color: var(--success);
  min-width: 40px;
  text-align: right;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-muted);
}

/* Deletion & List Transitions using global 'list' name pattern */
.list-enter-active {
  transition: opacity 0.6s cubic-bezier(0.2, 1.2, 0.85, 1),
              transform 0.6s cubic-bezier(0.2, 1.2, 0.85, 1);
}
.list-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.96);
}
.list-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
  position: absolute;
  width: 100%;
}
.list-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}
.list-move {
  transition: transform 0.5s cubic-bezier(0.2, 1.2, 0.85, 1);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>

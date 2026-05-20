<template>
  <div class="page active">
    <div class="page-header">
      <h2>打卡</h2>
      <div class="page-actions">
        <button class="btn btn-glass" @click="showAddCheckinModal">+ 新增打卡</button>
      </div>
    </div>
    <div class="checkin-list">
      <template v-if="items.length">
        <div v-for="item in items" :key="item.id" class="plan-card" :data-id="item.id">
          <div class="checkin-icon"><span class="checkin-check" :class="{ checked: item.checked_today }"></span></div>
          <div class="plan-card-body">
            <div class="plan-card-title">{{ item.name }}</div>
            <div class="plan-card-meta">
              <span class="plan-badge badge-checkin-streak">连续 {{ item.streak }} 天</span>
              <span v-if="item.current_value > 0" class="plan-badge badge-checkin-value">{{ item.current_value }} 价值</span>
            </div>
            <div class="plan-progress">
              <div class="plan-progress-track">
                <div class="plan-progress-bar checkin-bar" :style="{ width: Math.min(100, Math.round((item.current_value / 30) * 100)) + '%' }"></div>
              </div>
              <span class="plan-progress-text">{{ item.current_value }}</span>
            </div>
            <div class="plan-card-actions">
              <button v-if="!item.checked_today" class="btn btn-success btn-sm" @click="doCheckin(item.id)">&#9989; 打卡</button>
              <span v-else class="checkin-done">今日已打卡</span>
              <button class="btn btn-danger btn-sm" @click="deleteCheckinItem(item.id)">删除</button>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="empty-state">暂无打卡项目，点击右上角添加</div>
    </div>

    <div class="modal" :class="{ show: showModal }">
      <div class="modal-overlay" @click="closeModal"></div>
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>新增打卡</h3>
          <span class="modal-close" @click="closeModal">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>打卡名称</label>
            <input type="text" v-model="checkinName" placeholder="如：早起、运动、阅读...">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-glass" @click="closeModal">取消</button>
          <button class="btn btn-gradient" @click="saveCheckin">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const items = ref([])
const showModal = ref(false)
const checkinName = ref('')
let checkinSaving = false

const loadCheckins = async () => {
  try { items.value = await api.getCheckinItems() } catch (e) { window.toast('加载失败: ' + e.message, true) }
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
  try { await api.checkin(id); window.toast('打卡成功！'); await loadCheckins(); window.loadBalance && window.loadBalance() }
  catch (e) { window.toast(e.message, true) }
}

const deleteCheckinItem = async (id) => {
  if (!confirm('确定删除此打卡项目？所有记录将被清除。')) return
  try { await api.deleteCheckinItem(id); window.toast('已删除'); await loadCheckins() }
  catch (e) { window.toast('删除失败: ' + e.message, true) }
}

onMounted(() => { loadCheckins() })
</script>

<template>
  <div class="page active">
    <div class="page-header">
      <h2>心愿兑换单</h2>
      <div class="page-actions">
        <button class="btn btn-glass" @click="showAddWishModal">+ 新增心愿</button>
      </div>
    </div>
    <div class="balance-display">
      <span>当前余额</span>
      <span class="balance-big">{{ balance }}</span>
      <span>虚拟价值</span>
    </div>
    <div class="wish-list">
      <TransitionGroup name="list">
        <div v-for="(w, idx) in wishes" :key="w.id" class="wish-card" :class="{ redeemed: w.redeemed }" :style="{ animationDelay: (idx * 0.04) + 's' }">
          <div class="wish-info">
            <h4>{{ w.name }}</h4>
            <div class="wish-meta">{{ w.real_price > 0 ? '¥' + Number(w.real_price).toFixed(2) : '' }}{{ w.redeemed ? ' · 已兑换' : '' }} · {{ w.quantity === null ? '无限' : '剩余 ' + w.quantity }}</div>
          </div>
          <div class="wish-actions">
            <span class="wish-cost">{{ Number(w.virtual_cost).toFixed(2) }}</span>
            <template v-if="!w.redeemed">
              <button class="btn btn-success btn-sm" @click="redeemWish(w.id)" :disabled="!(w.quantity === null || w.quantity > 0) || balance < w.virtual_cost">兑换</button>
              <button class="btn btn-glass btn-sm" @click="showEditWishModal(w)">编辑</button>
            </template>
            <button class="btn btn-danger btn-sm" @click="deleteWish(w.id)">删除</button>
          </div>
        </div>
      </TransitionGroup>
      <div v-if="!wishes.length" class="empty-state">暂无心愿</div>
    </div>

    <div class="modal" :class="{ show: showModal }">
      <div class="modal-overlay" @click="closeModal"></div>
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>{{ editingWishId ? '编辑心愿' : '新增心愿' }}</h3>
          <span class="modal-close" @click="closeModal">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>心愿名称</label><input type="text" v-model="form.name" placeholder="输入心愿名称"></div>
          <div class="form-group"><label>真实价格 (元)</label><input type="number" v-model="form.real_price" min="0" step="0.01" placeholder="0.00"></div>
          <div class="form-group"><label>所需虚拟价值 (留空则AI评估)</label><input type="number" v-model="form.virtual_cost" min="0" step="0.1" placeholder="留空自动评估"><small>配置AI后留空会自动评估，否则默认等于真实价格</small></div>
          <div class="form-group">
            <label>兑换数量</label>
            <div class="qty-row">
              <input type="number" v-model="form.quantity" min="1" step="1" placeholder="输入数量" :disabled="form.infinite" style="flex:1">
              <label class="qty-infinite-label"><input type="checkbox" v-model="form.infinite" @change="toggleQtyInput"> 无限</label>
            </div>
            <small>勾选"无限"可一直兑换，否则用完自动删除</small>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-glass" @click="closeModal">取消</button>
          <button class="btn btn-gradient" @click="saveWish">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const wishes = ref([])
const balance = ref(0)
const showModal = ref(false)
const editingWishId = ref(null)
const form = ref({ name: '', real_price: '', virtual_cost: '', quantity: '', infinite: true })
let wishSaving = false

const loadWishes = async () => {
  try {
    const [w, b] = await Promise.all([api.getWishes(), api.getBalance()])
    wishes.value = w
    balance.value = b.balance.toFixed(2)
  } catch (e) { window.toast('加载失败: ' + e.message, true) }
}

const toggleQtyInput = () => { if (form.value.infinite) form.value.quantity = '' }

const showAddWishModal = () => {
  editingWishId.value = null
  form.value = { name: '', real_price: '', virtual_cost: '', quantity: '', infinite: true }
  showModal.value = true
}

const showEditWishModal = (w) => {
  editingWishId.value = w.id
  form.value = {
    name: w.name,
    real_price: w.real_price || '',
    virtual_cost: w.virtual_cost || '',
    quantity: w.quantity === null ? '' : w.quantity,
    infinite: w.quantity === null
  }
  showModal.value = true
}

const closeModal = () => { showModal.value = false }

const saveWish = async () => {
  if (wishSaving) return
  const name = form.value.name.trim()
  if (!name) { window.toast('请输入心愿名称', true); return }
  const infinite = form.value.infinite
  const qty = infinite ? null : (parseInt(form.value.quantity) || null)
  if (!infinite && (!qty || qty <= 0)) { window.toast('请输入有效数量或勾选无限', true); return }
  wishSaving = true
  try {
    const body = { name, real_price: parseFloat(form.value.real_price) || 0, virtual_cost: parseFloat(form.value.virtual_cost) || null, quantity: qty }
    if (editingWishId.value) { await api.updateWish(editingWishId.value, body); window.toast('心愿已更新') }
    else { await api.createWish(body); window.toast('心愿已添加') }
    closeModal(); await loadWishes()
  } catch (e) { window.toast('保存失败: ' + e.message, true) }
  finally { wishSaving = false; editingWishId.value = null }
}

const redeemWish = async (id) => {
  if (!confirm('确定兑换？')) return
  try {
    const r = await api.redeemWish(id)
    const qtyInfo = r.quantity === null ? '（无限）' : (r.quantity <= 1 ? '（已用完，自动删除）' : `（剩余 ${r.quantity - 1}）`)
    window.toast('兑换成功！' + qtyInfo)
    await loadWishes(); window.loadBalance && window.loadBalance()
  } catch (e) { window.toast('兑换失败: ' + e.message, true) }
}

const deleteWish = async (id) => {
  if (!confirm('确定删除？')) return
  try { await api.deleteWish(id); window.toast('已删除'); await loadWishes() }
  catch (e) { window.toast('删除失败: ' + e.message, true) }
}

onMounted(() => { loadWishes() })
</script>

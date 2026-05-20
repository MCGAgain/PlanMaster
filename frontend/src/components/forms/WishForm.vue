<template>
  <form class="wish-form" @submit.prevent="handleSubmit">
    <GlassInput
      v-model="form.name"
      label="心愿名称"
      placeholder="输入心愿名称"
      :error="errors.name"
    />

    <GlassInput
      v-model.number="form.real_price"
      label="真实价格 (元)"
      placeholder="0.00"
      type="number"
    />

    <GlassInput
      v-model.number="form.virtual_cost"
      label="所需虚拟价值 (留空则AI评估)"
      placeholder="留空自动评估"
      type="number"
    />
    <small class="form-hint">配置AI后留空会自动评估，否则默认等于真实价格</small>

    <div class="form-group">
      <label>兑换数量</label>
      <div class="qty-row">
        <input
          v-model.number="form.quantity"
          type="number"
          min="1"
          step="1"
          placeholder="输入数量"
          :disabled="isInfinite"
          class="qty-input"
        />
        <label class="qty-infinite-label">
          <input
            v-model="isInfinite"
            type="checkbox"
            @change="toggleQtyInput"
          />
          无限
        </label>
      </div>
      <small class="form-hint">勾选"无限"可一直兑换，否则用完自动删除</small>
    </div>

    <div class="form-actions">
      <GlassButton type="submit" variant="primary">
        {{ isEditing ? '更新' : '添加' }}
      </GlassButton>
      <GlassButton type="button" variant="secondary" @click="$emit('cancel')">
        取消
      </GlassButton>
    </div>
  </form>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import GlassInput from '../common/GlassInput.vue'
import GlassButton from '../common/GlassButton.vue'

const props = defineProps({
  wish: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['submit', 'cancel'])

const isEditing = computed(() => !!props.wish)

const isInfinite = ref(true)

const form = ref({
  name: '',
  virtual_cost: null,
  real_price: null,
  quantity: null
})

const errors = ref({
  name: '',
  virtual_cost: ''
})

onMounted(() => {
  if (props.wish) {
    form.value = {
      name: props.wish.name,
      virtual_cost: props.wish.virtual_cost,
      real_price: props.wish.real_price || null,
      quantity: props.wish.quantity ?? null
    }
    isInfinite.value = props.wish.quantity === null
  }
})

const toggleQtyInput = () => {
  if (isInfinite.value) {
    form.value.quantity = null
  }
}

const validate = () => {
  errors.value = { name: '', virtual_cost: '' }

  if (!form.value.name.trim()) {
    errors.value.name = '请输入心愿名称'
    return false
  }

  if (!isInfinite.value && (!form.value.quantity || form.value.quantity <= 0)) {
    alert('请输入有效数量或勾选无限')
    return false
  }

  return true
}

const handleSubmit = () => {
  if (validate()) {
    const data = { ...form.value }
    if (isInfinite.value) {
      data.quantity = null
    }
    emit('submit', data)
  }
}
</script>

<style scoped>
.wish-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.9rem;
  color: var(--text);
}

.form-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: -0.5rem;
}

.qty-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.qty-input {
  flex: 1;
  padding: 0.5rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.9rem;
}

.qty-input:focus {
  outline: none;
  border-color: var(--primary);
}

.qty-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.qty-infinite-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text);
}

.qty-infinite-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>

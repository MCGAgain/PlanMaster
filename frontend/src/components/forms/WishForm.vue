<template>
  <form class="wish-form" @submit.prevent="handleSubmit">
    <GlassInput
      v-model="form.name"
      label="心愿名称"
      placeholder="输入心愿名称"
      :error="errors.name"
    />

    <GlassInput
      v-model.number="form.virtual_cost"
      label="虚拟价值"
      placeholder="输入虚拟价值"
      type="number"
      :error="errors.virtual_cost"
    />

    <GlassInput
      v-model.number="form.real_price"
      label="真实价格（可选）"
      placeholder="输入真实价格"
      type="number"
    />

    <GlassInput
      v-model.number="form.quantity"
      label="兑换次数（可选，留空表示无限）"
      placeholder="输入兑换次数"
      type="number"
    />

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
  }
})

const validate = () => {
  errors.value = { name: '', virtual_cost: '' }

  if (!form.value.name.trim()) {
    errors.value.name = '请输入心愿名称'
    return false
  }

  if (!form.value.virtual_cost || form.value.virtual_cost <= 0) {
    errors.value.virtual_cost = '请输入有效的虚拟价值'
    return false
  }

  return true
}

const handleSubmit = () => {
  if (validate()) {
    emit('submit', { ...form.value })
  }
}
</script>

<style scoped>
.wish-form {
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

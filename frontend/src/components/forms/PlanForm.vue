<template>
  <form class="plan-form" @submit.prevent="handleSubmit">
    <GlassInput
      v-model="form.title"
      label="计划标题"
      placeholder="输入计划标题"
      :error="errors.title"
    />

    <GlassInput
      v-model="form.description"
      label="计划描述（可选）"
      placeholder="输入计划描述"
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
  plan: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['submit', 'cancel'])

const isEditing = computed(() => !!props.plan)

const form = ref({
  title: '',
  description: ''
})

const errors = ref({
  title: ''
})

onMounted(() => {
  if (props.plan) {
    form.value = {
      title: props.plan.title,
      description: props.plan.description || ''
    }
  }
})

const validate = () => {
  errors.value = { title: '' }

  if (!form.value.title.trim()) {
    errors.value.title = '请输入计划标题'
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
.plan-form {
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

<template>
  <div class="settings-view">
    <Header title="AI设置" />

    <div class="settings-content">
      <GlassCard class="settings-card">
        <form class="settings-form" @submit.prevent="handleSave">
          <GlassInput
            v-model="form.base_url"
            label="API Base URL"
            placeholder="https://api.deepseek.com"
          />

          <GlassInput
            v-model="form.api_key"
            label="API Key"
            placeholder="输入API Key"
            type="password"
          />

          <GlassInput
            v-model="form.model_name"
            label="模型名称"
            placeholder="deepseek-chat"
          />

          <GlassInput
            v-model="form.extra_headers"
            label="额外请求头（JSON格式，可选）"
            placeholder='{"X-Custom-Header": "value"}'
          />

          <div class="form-actions">
            <GlassButton type="submit" variant="primary" :loading="saving">
              保存设置
            </GlassButton>
            <GlassButton type="button" variant="secondary" @click="handleTest" :loading="testing">
              测试连接
            </GlassButton>
            <GlassButton type="button" variant="secondary" @click="handleFetchModels" :loading="fetchingModels">
              获取模型列表
            </GlassButton>
          </div>
        </form>
      </GlassCard>

      <GlassCard v-if="testResult" class="result-card" :variant="testResult.success ? 'success' : 'danger'">
        <p>{{ testResult.message || (testResult.success ? '连接成功' : '连接失败') }}</p>
      </GlassCard>

      <GlassCard v-if="models.length > 0" class="models-card">
        <h3>可用模型</h3>
        <div class="models-list">
          <div
            v-for="model in models"
            :key="model.id || model"
            class="model-item"
            @click="selectModel(model.id || model)"
          >
            {{ model.id || model }}
          </div>
        </div>
      </GlassCard>

      <GlassCard v-if="error" class="error-card" variant="danger">
        <p>{{ error }}</p>
      </GlassCard>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import Header from '@/components/layout/Header.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassButton from '@/components/common/GlassButton.vue'
import GlassInput from '@/components/common/GlassInput.vue'

const form = ref({
  base_url: '',
  api_key: '',
  model_name: '',
  extra_headers: ''
})

const saving = ref(false)
const testing = ref(false)
const fetchingModels = ref(false)
const testResult = ref(null)
const models = ref([])
const error = ref(null)

onMounted(async () => {
  await fetchSettings()
})

const fetchSettings = async () => {
  try {
    const settings = await api.getAISettings()
    form.value = {
      base_url: settings.base_url || '',
      api_key: settings.api_key || '',
      model_name: settings.model_name || '',
      extra_headers: settings.extra_headers || ''
    }
  } catch (err) {
    console.error('Failed to fetch AI settings:', err)
    error.value = err.message
  }
}

const handleSave = async () => {
  saving.value = true
  error.value = null
  try {
    await api.updateAISettings(form.value)
    testResult.value = { success: true, message: '设置已保存' }
    setTimeout(() => {
      testResult.value = null
    }, 3000)
  } catch (err) {
    console.error('Failed to save settings:', err)
    testResult.value = { success: false, message: err.message || '保存失败' }
  } finally {
    saving.value = false
  }
}

const handleTest = async () => {
  testing.value = true
  testResult.value = null
  error.value = null
  try {
    // Save first, then test
    await api.updateAISettings(form.value)
    const result = await api.testAI()
    testResult.value = {
      success: true,
      message: result?.message || '连接成功'
    }
  } catch (err) {
    testResult.value = {
      success: false,
      message: err.message || '连接失败'
    }
  } finally {
    testing.value = false
  }
}

const handleFetchModels = async () => {
  fetchingModels.value = true
  error.value = null
  try {
    const result = await api.getModels(form.value.base_url, form.value.api_key, form.value.extra_headers)
    models.value = Array.isArray(result) ? result : result.data || []
  } catch (err) {
    console.error('Failed to fetch models:', err)
    error.value = err.message
  } finally {
    fetchingModels.value = false
  }
}

const selectModel = (modelName) => {
  form.value.model_name = modelName
}
</script>

<style scoped>
.settings-view {
  min-height: 100vh;
}

.settings-content {
  padding: 2rem;
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.result-card p {
  margin: 0;
  font-size: 0.95rem;
}

.models-card h3 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  color: var(--text);
}

.models-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.model-item {
  padding: 0.75rem 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text);
  transition: all var(--transition-fast);
}

.model-item:hover {
  border-color: var(--primary);
  background: var(--primary-light);
}

.error-card p {
  margin: 0;
}
</style>

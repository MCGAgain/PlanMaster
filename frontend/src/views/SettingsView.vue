<template>
  <div class="settings-view">
    <Header title="AI设置" />

    <div class="settings-content">
      <!-- AI配置 -->
      <GlassCard class="settings-card">
        <h3>大模型API配置</h3>
        <form class="settings-form" @submit.prevent="handleSaveAi">
          <GlassInput
            v-model="form.base_url"
            label="Base URL"
            placeholder="https://api.openai.com/v1"
          />
          <small class="form-hint">OpenAI兼容接口地址</small>

          <GlassInput
            v-model="form.api_key"
            label="API Key"
            placeholder="sk-..."
            type="password"
          />

          <div class="form-group">
            <label>Model</label>
            <div class="model-select-row">
              <select v-model="form.model_name" class="model-dropdown">
                <option value="">-- 请先获取模型列表 --</option>
                <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
              </select>
              <input
                v-model="form.model_name_manual"
                type="text"
                placeholder="或手动输入模型名称"
                class="model-manual-input"
              />
              <GlassButton
                type="button"
                variant="secondary"
                size="small"
                :loading="fetchingModels"
                @click="handleFetchModels"
              >
                获取模型
              </GlassButton>
            </div>
            <small class="form-hint">从API自动获取模型列表，或手动输入</small>
          </div>

          <GlassInput
            v-model="form.extra_headers"
            label="额外请求头 (JSON)"
            placeholder='{"X-Custom-Header": "value"}'
          />

          <div class="form-actions">
            <GlassButton type="submit" variant="primary" :loading="saving">
              保存设置
            </GlassButton>
            <GlassButton type="button" variant="gradient" :loading="testing" @click="handleTest">
              测试连接
            </GlassButton>
          </div>
        </form>
        <div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
          {{ testResult.message }}
        </div>
      </GlassCard>

      <!-- 虚拟价值范围 -->
      <GlassCard class="settings-card">
        <h3>虚拟价值范围</h3>
        <div class="range-grid">
          <div class="range-item">
            <h4>今日待办</h4>
            <div class="range-inputs">
              <label>最小 <input v-model.number="valueRanges.today_min" type="number" min="0" step="1" /></label>
              <label>最大 <input v-model.number="valueRanges.today_max" type="number" min="0" step="1" /></label>
            </div>
          </div>
          <div class="range-item">
            <h4>周计划</h4>
            <div class="range-inputs">
              <label>最小 <input v-model.number="valueRanges.weekly_min" type="number" min="0" step="1" /></label>
              <label>最大 <input v-model.number="valueRanges.weekly_max" type="number" min="0" step="1" /></label>
            </div>
          </div>
          <div class="range-item">
            <h4>月计划</h4>
            <div class="range-inputs">
              <label>最小 <input v-model.number="valueRanges.monthly_min" type="number" min="0" step="1" /></label>
              <label>最大 <input v-model.number="valueRanges.monthly_max" type="number" min="0" step="1" /></label>
            </div>
          </div>
          <div class="range-item">
            <h4>年计划</h4>
            <div class="range-inputs">
              <label>最小 <input v-model.number="valueRanges.yearly_min" type="number" min="0" step="1" /></label>
              <label>最大 <input v-model.number="valueRanges.yearly_max" type="number" min="0" step="1" /></label>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <GlassButton variant="primary" @click="handleSaveValueRanges">保存范围</GlassButton>
        </div>
      </GlassCard>

      <!-- 打卡价值设置 -->
      <GlassCard class="settings-card">
        <h3>打卡价值设置</h3>
        <p class="form-hint">打卡价值 = sqrt(连续天数) × 每日增量，上限为最大价值。断签后扣除上次打卡所得价值。</p>
        <div class="range-grid">
          <div class="range-item">
            <h4>每日增量</h4>
            <div class="range-inputs">
              <label>增量 <input v-model.number="checkinSettings.checkin_daily_increment" type="number" min="0" step="0.5" /></label>
            </div>
          </div>
          <div class="range-item">
            <h4>最大价值</h4>
            <div class="range-inputs">
              <label>上限 <input v-model.number="checkinSettings.checkin_max_value" type="number" min="0" step="1" /></label>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <GlassButton variant="primary" @click="handleSaveCheckinSettings">保存</GlassButton>
        </div>
      </GlassCard>

      <!-- 数据管理 -->
      <GlassCard class="settings-card">
        <h3>数据管理</h3>
        <p class="form-hint">清零后所有虚拟价值归零，操作不可撤销（会生成一笔等额负数流水）</p>
        <div class="form-actions">
          <GlassButton variant="danger" @click="handleResetBalance">
            &#9888; 清零虚拟价值
          </GlassButton>
        </div>
      </GlassCard>

      <!-- 个性签名 -->
      <GlassCard class="settings-card">
        <h3>个性签名</h3>
        <p class="form-hint">可输入多条，切换页面时轮换显示。留空的行会被忽略。</p>
        <div class="form-group">
          <textarea
            v-model="signaturesText"
            rows="4"
            placeholder="每行一条签名，如：&#10;今天也要加油！&#10;保持专注，减少焦虑&#10;每天进步一点点"
          ></textarea>
        </div>
        <div class="form-actions">
          <GlassButton variant="primary" @click="handleSaveSignatures">保存签名</GlassButton>
        </div>
      </GlassCard>

      <!-- 背景设置 -->
      <GlassCard class="settings-card">
        <h3>背景设置</h3>
        <p class="form-hint">选择应用背景样式，支持纯色和自定义图片。</p>
        <div class="bg-mode-btns">
          <button
            v-for="mode in bgModes"
            :key="mode.value"
            class="btn bg-mode-btn"
            :class="{ active: bgSettings.mode === mode.value }"
            @click="switchBgMode(mode.value)"
          >
            {{ mode.label }}
          </button>
        </div>

        <!-- 纯色面板 -->
        <div v-if="bgSettings.mode === 'solid'" class="bg-panel">
          <div class="bg-color-grid">
            <div
              v-for="color in bgColors"
              :key="color"
              class="bg-color-swatch"
              :class="{ active: bgSettings.solidColor === color }"
              :style="{ background: color }"
              @click="pickBgColor(color)"
            ></div>
          </div>
          <div class="form-actions">
            <GlassButton variant="gradient" @click="handleSaveBg">保存</GlassButton>
          </div>
        </div>

        <!-- 自定义图片面板 -->
        <div v-if="bgSettings.mode === 'image'" class="bg-panel">
          <div class="form-group">
            <input
              ref="bgFileInput"
              type="file"
              accept="image/*"
              style="display: none;"
              @change="previewBgImage"
            />
            <GlassButton variant="secondary" @click="$refs.bgFileInput.click()">
              选择图片
            </GlassButton>
            <span v-if="bgSettings.fileName" class="bg-file-name">{{ bgSettings.fileName }}</span>
          </div>
          <div v-if="bgSettings.previewUrl" class="bg-preview">
            <img :src="bgSettings.previewUrl" alt="背景预览" />
          </div>
          <div class="form-actions">
            <GlassButton variant="secondary" @click="resetBgImage">重置为默认</GlassButton>
            <GlassButton variant="gradient" @click="handleSaveBg">保存</GlassButton>
          </div>
        </div>
      </GlassCard>

      <!-- 应用信息 -->
      <GlassCard class="settings-card">
        <h3>应用信息</h3>
        <div class="app-info">
          <span class="app-version">Todo v{{ appVersion }}</span>
        </div>
        <div class="form-actions">
          <GlassButton variant="secondary" :loading="checkingUpdate" @click="handleCheckUpdate">
            检查更新
          </GlassButton>
        </div>
        <div v-if="updateResult" class="test-result" :class="updateResult.success ? 'success' : 'error'">
          {{ updateResult.message }}
        </div>
        <div v-if="updateProgress.show" class="update-progress">
          <div class="update-progress-header">
            <span>{{ updateProgress.label }}</span>
            <span>{{ updateProgress.percent }}%</span>
          </div>
          <div class="update-progress-track">
            <div class="update-progress-bar" :style="{ width: `${updateProgress.percent}%` }" />
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/api'
import Header from '@/components/layout/Header.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassButton from '@/components/common/GlassButton.vue'
import GlassInput from '@/components/common/GlassInput.vue'

const form = reactive({
  base_url: '',
  api_key: '',
  model_name: '',
  model_name_manual: '',
  extra_headers: ''
})

const valueRanges = reactive({
  today_min: 1,
  today_max: 10,
  weekly_min: 1,
  weekly_max: 10,
  monthly_min: 10,
  monthly_max: 20,
  yearly_min: 20,
  yearly_max: 100
})

const checkinSettings = reactive({
  checkin_daily_increment: 1,
  checkin_max_value: 30
})

const bgSettings = reactive({
  mode: 'orb',
  solidColor: '#f0eef8',
  fileName: '',
  previewUrl: ''
})

const bgModes = [
  { value: 'orb', label: '动态渐变' },
  { value: 'solid', label: '纯色' },
  { value: 'image', label: '自定义图片' }
]

const bgColors = [
  '#f0eef8', '#e8e8e8', '#1a1a2e', '#16213e',
  '#0f3460', '#2d2d2d', '#1b4332', '#3c1642'
]

const saving = ref(false)
const testing = ref(false)
const fetchingModels = ref(false)
const testResult = ref(null)
const models = ref([])
const signaturesText = ref('')
const appVersion = ref('')
const checkingUpdate = ref(false)
const updateResult = ref(null)
const updateProgress = reactive({
  show: false,
  label: '下载中...',
  percent: 0
})

onMounted(async () => {
  await loadSettings()
  await loadVersion()
})

const loadSettings = async () => {
  try {
    const [ai, settings, sigs] = await Promise.all([
      api.getAISettings(),
      api.getSettings(),
      api.getSignatures()
    ])

    form.base_url = ai.base_url || ''
    form.api_key = ai.api_key || ''
    form.model_name = ai.model_name || ''
    form.model_name_manual = ai.model_name || ''
    form.extra_headers = ai.extra_headers || '{}'

    valueRanges.today_min = settings.today_min || 1
    valueRanges.today_max = settings.today_max || 10
    valueRanges.weekly_min = settings.weekly_min || 1
    valueRanges.weekly_max = settings.weekly_max || 10
    valueRanges.monthly_min = settings.monthly_min || 10
    valueRanges.monthly_max = settings.monthly_max || 20
    valueRanges.yearly_min = settings.yearly_min || 20
    valueRanges.yearly_max = settings.yearly_max || 100

    checkinSettings.checkin_daily_increment = settings.checkin_daily_increment || 1
    checkinSettings.checkin_max_value = settings.checkin_max_value || 30

    bgSettings.mode = settings.bg_mode || 'orb'
    bgSettings.solidColor = settings.bg_solid_color || '#f0eef8'
    if (settings.bg_image) {
      bgSettings.previewUrl = bgImageUrl(settings.bg_image)
    }

    signaturesText.value = sigs.map(r => r.content).join('\n')
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
}

const loadVersion = async () => {
  try {
    const d = await api.getVersion()
    appVersion.value = d.version || ''
  } catch (e) {
    console.error('Failed to load version:', e)
  }
}

const handleSaveAi = async () => {
  saving.value = true
  try {
    await api.updateAISettings({
      base_url: form.base_url,
      api_key: form.api_key,
      model_name: form.model_name_manual || form.model_name || 'gpt-4',
      extra_headers: form.extra_headers
    })
    alert('AI设置已保存')
  } catch (e) {
    alert('保存失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

const handleFetchModels = async () => {
  if (!form.base_url || !form.api_key) {
    alert('请先填写 Base URL 和 API Key')
    return
  }
  fetchingModels.value = true
  try {
    const d = await api.getModels(form.base_url, form.api_key, form.extra_headers)
    models.value = d.models || d || []
    alert('已获取 ' + models.value.length + ' 个模型')
  } catch (e) {
    alert('获取失败: ' + e.message)
  } finally {
    fetchingModels.value = false
  }
}

const handleTest = async () => {
  testing.value = true
  testResult.value = null
  try {
    await api.updateAISettings({
      base_url: form.base_url,
      api_key: form.api_key,
      model_name: form.model_name_manual || form.model_name || 'gpt-4',
      extra_headers: form.extra_headers
    })
    const d = await api.testAI()
    testResult.value = { success: true, message: d.message || '连接成功' }
  } catch (e) {
    testResult.value = { success: false, message: '失败: ' + e.message }
  } finally {
    testing.value = false
  }
}

const handleSaveValueRanges = async () => {
  try {
    await api.updateSettings(valueRanges)
    alert('价值范围已保存')
  } catch (e) {
    alert('保存失败: ' + e.message)
  }
}

const handleSaveCheckinSettings = async () => {
  try {
    await api.updateSettings(checkinSettings)
    alert('打卡设置已保存')
  } catch (e) {
    alert('保存失败: ' + e.message)
  }
}

const handleResetBalance = async () => {
  if (!confirm('确定清零所有虚拟价值？此操作不可撤销。')) return
  try {
    const d = await api.resetBalance()
    alert('已清零 ' + (d.cleared || 0).toFixed(1) + ' 虚拟价值')
  } catch (e) {
    alert('操作失败: ' + e.message)
  }
}

const handleSaveSignatures = async () => {
  try {
    const contents = signaturesText.value.split('\n')
    await api.saveSignatures(contents)
    alert('签名已保存')
  } catch (e) {
    alert('保存失败: ' + e.message)
  }
}

const bgImageUrl = (path) => {
  if (!path) return ''
  return path.replace('/static/bg_custom/', '/api/background/custom/')
}

const switchBgMode = (mode) => {
  bgSettings.mode = mode
  applyBgMode(mode, bgSettings.solidColor, bgSettings.previewUrl)
}

const pickBgColor = (color) => {
  bgSettings.solidColor = color
  applyBgMode('solid', color, '')
}

const isColorDark = (hex) => {
  if (!hex || !hex.startsWith('#')) return false
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum < 0.5
}

const applyBgMode = (mode, color, image) => {
  document.body.classList.remove('bg-solid', 'bg-image', 'theme-dark')
  if (mode === 'solid') {
    document.body.classList.add('bg-solid')
    document.body.style.backgroundColor = color
    document.body.style.backgroundImage = ''
    if (isColorDark(color)) {
      document.body.classList.add('theme-dark')
    }
  } else if (mode === 'image') {
    document.body.classList.add('bg-image', 'theme-dark')
    document.body.style.backgroundColor = ''
    if (image) {
      document.body.style.backgroundImage = `url(${image})`
    }
  } else {
    document.body.style.backgroundColor = ''
    document.body.style.backgroundImage = ''
  }
}

const previewBgImage = (e) => {
  const file = e.target.files[0]
  if (!file) return
  bgSettings.fileName = file.name
  const reader = new FileReader()
  reader.onload = (ev) => {
    bgSettings.previewUrl = ev.target.result
    applyBgMode('image', '', ev.target.result)
  }
  reader.readAsDataURL(file)
}

const resetBgImage = () => {
  bgSettings.fileName = ''
  bgSettings.previewUrl = ''
  applyBgMode('orb', '', '')
}

const handleSaveBg = async () => {
  const payload = { bg_mode: bgSettings.mode }
  if (bgSettings.mode === 'solid') {
    payload.bg_solid_color = bgSettings.solidColor
  } else if (bgSettings.mode === 'image') {
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput?.files[0]) {
      try {
        const d = await api.uploadBackground(fileInput.files[0])
        if (d.path) payload.bg_image = d.path
      } catch (e) {
        alert('上传失败: ' + e.message)
        return
      }
    }
  }
  try {
    await api.updateSettings(payload)
    alert('背景设置已保存')
  } catch (e) {
    alert('保存失败: ' + e.message)
  }
}

const handleCheckUpdate = async () => {
  checkingUpdate.value = true
  updateResult.value = null
  updateProgress.show = false
  try {
    const d = await api.checkUpdate()
    if (d.downloading) {
      updateResult.value = { success: true, message: d.message }
      updateProgress.show = true
      pollUpdateStatus()
    } else {
      updateResult.value = { success: true, message: d.message || '已是最新版本' }
    }
  } catch (e) {
    updateResult.value = { success: false, message: '检查失败: ' + e.message }
  } finally {
    checkingUpdate.value = false
  }
}

const pollUpdateStatus = () => {
  const poll = setInterval(async () => {
    try {
      const d = await api.getUpdateStatus()
      if (d.message) updateProgress.label = d.message
      if (d.percent >= 0) updateProgress.percent = d.percent
      if (d.status === 'idle') {
        clearInterval(poll)
        updateProgress.show = false
      }
      if (d.status === 'error') {
        clearInterval(poll)
        updateResult.value = { success: false, message: d.message || '更新失败' }
        updateProgress.show = false
      }
    } catch {
      clearInterval(poll)
      updateProgress.show = false
    }
  }, 1000)
}
</script>

<style scoped>
.settings-view {
  min-height: 100vh;
}

.settings-content {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-card h3 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  color: var(--text);
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: -0.5rem;
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

.form-group textarea {
  padding: 0.75rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  color: var(--text);
  resize: vertical;
  font-family: inherit;
}

.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.form-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.model-select-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.model-dropdown {
  flex: 1;
  min-width: 150px;
  padding: 0.5rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  color: var(--text);
}

.model-manual-input {
  flex: 1;
  min-width: 150px;
  padding: 0.5rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  color: var(--text);
}

.model-manual-input:focus {
  outline: none;
  border-color: var(--primary);
}

.test-result {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
}

.test-result.success {
  background: rgba(52, 211, 153, 0.1);
  color: var(--success);
  border: 1px solid var(--success);
}

.test-result.error {
  background: rgba(248, 113, 113, 0.1);
  color: var(--danger);
  border: 1px solid var(--danger);
}

.range-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.range-item {
  padding: 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
}

.range-item h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: var(--text);
}

.range-inputs {
  display: flex;
  gap: 0.5rem;
}

.range-inputs label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-soft);
}

.range-inputs input {
  width: 60px;
  padding: 0.25rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 4px;
  color: var(--text);
  text-align: center;
}

.range-inputs input:focus {
  outline: none;
  border-color: var(--primary);
}

.app-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.app-version {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary);
}

.update-progress {
  margin-top: 1rem;
}

.update-progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-soft);
}

.update-progress-track {
  height: 8px;
  background: rgba(124, 110, 240, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.update-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), #a78bfa);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.bg-mode-btns {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.bg-mode-btn {
  padding: 0.5rem 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.bg-mode-btn.active {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
}

.bg-panel {
  margin-top: 1rem;
}

.bg-color-grid {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.bg-color-swatch {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all var(--transition-fast);
}

.bg-color-swatch:hover {
  transform: scale(1.1);
}

.bg-color-swatch.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-light);
}

.bg-file-name {
  margin-left: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-soft);
}

.bg-preview {
  margin-top: 1rem;
  border-radius: 12px;
  overflow: hidden;
  max-height: 200px;
}

.bg-preview img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.btn-gradient {
  background: linear-gradient(135deg, var(--primary), #a78bfa);
  color: white;
  border: none;
}

.btn-gradient:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(124, 110, 240, 0.3);
}
</style>

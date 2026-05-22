<template>
  <div class="page active">
    <div class="page-header">
      <h2>AI设置</h2>
    </div>
    <div class="settings-form">
      <div class="glass-card">
        <h3>大模型API配置</h3>
        <div class="form-group"><label>Base URL</label><input type="text" v-model="form.base_url" placeholder="https://api.openai.com/v1"><small>OpenAI兼容接口地址</small></div>
        <div class="form-group"><label>API Key</label><input type="password" v-model="form.api_key" placeholder="sk-..."></div>
        <div class="form-group">
          <label>Model</label>
          <div class="model-select-row">
            <select v-model="form.model_name" class="model-dropdown"><option value="">-- 请先获取模型列表 --</option><option v-for="m in models" :key="m" :value="m">{{ m }}</option></select>
            <input type="text" v-model="form.model_name_manual" placeholder="或手动输入模型名称">
            <button class="btn btn-glass btn-sm" @click="fetchModels" :disabled="fetchingModels">{{ fetchingModels ? '获取中...' : '获取模型' }}</button>
          </div>
          <small>从API自动获取模型列表，或手动输入</small>
        </div>
        <div class="form-group"><label>额外请求头 (JSON)</label><textarea v-model="form.extra_headers" rows="2" placeholder='{"X-Custom-Header": "value"}'></textarea></div>
        <div class="form-actions">
          <button class="btn btn-glass" @click="saveAiSettings">保存设置</button>
          <button class="btn btn-gradient" @click="testAiConnection">测试连接</button>
        </div>
        <div class="test-result" :class="testResultClass" v-if="testResultText">{{ testResultText }}</div>
      </div>

      <div class="glass-card">
        <h3>虚拟价值范围</h3>
        <div class="range-grid">
          <div class="range-item"><h4>今日待办</h4><div class="range-inputs"><label>最小 <input type="number" v-model="form.today_min" min="0" step="1"></label><label>最大 <input type="number" v-model="form.today_max" min="0" step="1"></label></div></div>
          <div class="range-item"><h4>周计划</h4><div class="range-inputs"><label>最小 <input type="number" v-model="form.weekly_min" min="0" step="1"></label><label>最大 <input type="number" v-model="form.weekly_max" min="0" step="1"></label></div></div>
          <div class="range-item"><h4>月计划</h4><div class="range-inputs"><label>最小 <input type="number" v-model="form.monthly_min" min="0" step="1"></label><label>最大 <input type="number" v-model="form.monthly_max" min="0" step="1"></label></div></div>
          <div class="range-item"><h4>年计划</h4><div class="range-inputs"><label>最小 <input type="number" v-model="form.yearly_min" min="0" step="1"></label><label>最大 <input type="number" v-model="form.yearly_max" min="0" step="1"></label></div></div>
        </div>
        <div class="form-actions"><button class="btn btn-glass" @click="saveValueRanges">保存范围</button></div>
      </div>

      <div class="glass-card">
        <h3>打卡价值设置</h3>
        <p class="form-hint" style="margin-top:0;margin-bottom:12px;">打卡价值 = sqrt(连续天数) × 每日增量，上限为最大价值。断签后扣除上次打卡所得价值。</p>
        <div class="range-grid">
          <div class="range-item"><h4>每日增量</h4><div class="range-inputs"><label>增量 <input type="number" v-model="form.checkin_daily_inc" min="0" step="0.5"></label></div></div>
          <div class="range-item"><h4>最大价值</h4><div class="range-inputs"><label>上限 <input type="number" v-model="form.checkin_max_val" min="0" step="1"></label></div></div>
        </div>
        <div class="form-actions"><button class="btn btn-glass" @click="saveCheckinSettings">保存</button></div>
      </div>

      <div class="glass-card">
        <h3>数据管理</h3>
        <p class="form-hint" style="margin-top:0;margin-bottom:16px;">清零后所有虚拟价值归零，操作不可撤销（会生成一笔等额负数流水）</p>
        <div class="form-actions"><button class="btn btn-danger" @click="resetBalance">&#9888; 清零虚拟价值</button></div>
      </div>

      <div class="glass-card">
        <h3>个性签名</h3>
        <p class="form-hint" style="margin-top:0;margin-bottom:12px;">可输入多条，切换页面时轮换显示。留空的行会被忽略。</p>
        <div class="form-group"><textarea v-model="form.signatures" rows="4" placeholder="每行一条签名，如：&#10;今天也要加油！&#10;保持专注，减少焦虑&#10;每天进步一点点"></textarea></div>
        <div class="form-actions"><button class="btn btn-glass" @click="saveSignatures">保存签名</button></div>
      </div>

      <div class="glass-card">
        <h3>背景设置</h3>
        <p class="form-hint" style="margin-top:0;margin-bottom:16px;">选择应用背景样式，支持纯色和自定义图片。</p>
        <div class="bg-mode-btns">
          <button class="btn btn-glass bg-mode-btn" :class="{ active: bgMode === 'orb' }" @click="switchBgMode('orb')">动态渐变</button>
          <button class="btn btn-glass bg-mode-btn" :class="{ active: bgMode === 'solid' }" @click="switchBgMode('solid')">纯色</button>
          <button class="btn btn-glass bg-mode-btn" :class="{ active: bgMode === 'image' }" @click="switchBgMode('image')">自定义图片</button>
        </div>
        <div v-show="bgMode === 'solid'" style="margin-top:16px;">
          <div class="bg-color-grid">
            <div v-for="c in bgColors" :key="c" class="bg-color-swatch" :class="{ active: bgColor === c }" :style="{ background: c }" @click="pickBgColor(c)"></div>
          </div>
          <div class="form-actions" style="margin-top:12px;"><button class="btn btn-gradient" @click="saveBgSettings">保存</button></div>
        </div>
        <div v-show="bgMode === 'image'" style="margin-top:16px;">
          <div class="form-group">
            <input type="file" ref="bgFileInput" accept="image/*" @change="previewBgImage" style="display:none;">
            <button class="btn btn-glass" @click="$refs.bgFileInput.click()">选择图片</button>
            <span v-if="bgFileName" style="margin-left:12px;font-size:13px;color:var(--text-soft);">{{ bgFileName }}</span>
          </div>
          <div v-if="bgPreviewSrc" style="margin-top:12px;border-radius:12px;overflow:hidden;max-height:200px;">
            <img :src="bgPreviewSrc" style="width:100%;height:200px;object-fit:cover;">
          </div>
          <div class="form-actions" style="margin-top:12px;">
            <button class="btn btn-glass" @click="resetBgImage">重置为默认</button>
            <button class="btn btn-gradient" @click="saveBgSettings">保存</button>
          </div>
        </div>
      </div>

      <div class="glass-card">
        <h3>玻璃效果</h3>
        <p class="form-hint" style="margin-top:0;margin-bottom:16px;">选择卡片、侧边栏等元素的玻璃视觉风格。</p>
        <div class="glass-style-options">
          <div class="glass-style-card" :class="{ active: glassStyle === 'default' }" @click="switchGlassStyle('default')">
            <div class="glass-style-preview default-preview">
              <div class="preview-card"></div>
            </div>
            <span class="glass-style-label">经典毛玻璃</span>
            <span class="glass-style-desc">高斯模糊，柔和透明</span>
          </div>
          <div class="glass-style-card" :class="{ active: glassStyle === 'liquid' }" @click="switchGlassStyle('liquid')">
            <div class="glass-style-preview liquid-preview">
              <div class="preview-card"></div>
            </div>
            <span class="glass-style-label">液态玻璃</span>
            <span class="glass-style-desc">iOS 26 风格，光泽流动</span>
          </div>
        </div>
      </div>

      <div class="glass-card">
        <h3>应用信息</h3>
        <div class="app-info"><span class="app-version">Todo v{{ appVersion }}</span></div>
        <div class="form-actions" style="margin-top:12px;">
          <button class="btn btn-glass" @click="checkUpdate" :disabled="checkingUpdate">{{ checkingUpdate ? '检查中...' : '检查更新' }}</button>
        </div>
        <div class="test-result" :class="updateResultClass" v-if="updateResultText">{{ updateResultText }}</div>
        <div v-if="showUpdateProgress" style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:12px;color:var(--text-soft);">{{ updateProgressLabel }}</span>
            <span style="font-size:12px;font-weight:700;color:var(--primary);">{{ updateProgressPct }}%</span>
          </div>
          <div style="height:8px;background:rgba(124,110,240,.1);border-radius:4px;overflow:hidden;">
            <div :style="{ height: '100%', width: updateProgressPct + '%', background: 'linear-gradient(90deg,var(--primary),#a78bfa)', borderRadius: '4px', transition: 'width .3s' }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const form = ref({ base_url: '', api_key: '', model_name: '', model_name_manual: '', extra_headers: '{}', today_min: 1, today_max: 10, weekly_min: 1, weekly_max: 10, monthly_min: 10, monthly_max: 20, yearly_min: 20, yearly_max: 100, checkin_daily_inc: 1, checkin_max_val: 30, signatures: '' })
const models = ref([])
const fetchingModels = ref(false)
const testResultText = ref('')
const testResultClass = ref('')
const appVersion = ref('')
const checkingUpdate = ref(false)
const updateResultText = ref('')
const updateResultClass = ref('')
const showUpdateProgress = ref(false)
const updateProgressLabel = ref('下载中...')
const updateProgressPct = ref(0)
const bgMode = ref('orb')
const bgColor = ref('#f0eef8')
const glassStyle = ref('default')
const bgColors = ['#f0eef8', '#e8e8e8', '#1a1a2e', '#16213e', '#0f3460', '#2d2d2d', '#1b4332', '#3c1642']
const bgFileName = ref('')
const bgPreviewSrc = ref('')

function bgImageUrl(path) { if (!path) return ''; return path.replace('/static/bg_custom/', '/api/background/custom/') }

const loadSettings = async () => {
  try {
    const [a, s, sigs] = await Promise.all([api.getAISettings(), api.getSettings(), api.getSignatures()])
    form.value.base_url = a.base_url || ''
    form.value.api_key = a.api_key || ''
    form.value.model_name_manual = a.model_name || ''
    form.value.extra_headers = a.extra_headers || '{}'
    form.value.today_min = s.today_min || 1; form.value.today_max = s.today_max || 10
    form.value.weekly_min = s.weekly_min || 1; form.value.weekly_max = s.weekly_max || 10
    form.value.monthly_min = s.monthly_min || 10; form.value.monthly_max = s.monthly_max || 20
    form.value.yearly_min = s.yearly_min || 20; form.value.yearly_max = s.yearly_max || 100
    form.value.checkin_daily_inc = s.checkin_daily_increment || 1; form.value.checkin_max_val = s.checkin_max_value || 30
    form.value.signatures = sigs.map(r => r.content).join('\n')
    bgMode.value = s.bg_mode || 'orb'; bgColor.value = s.bg_solid_color || '#f0eef8'
    glassStyle.value = localStorage.getItem('glass_style') || 'default'
    if (s.bg_image) { bgPreviewSrc.value = bgImageUrl(s.bg_image); bgFileName.value = '' }
    loadVersion()
  } catch (e) { window.toast('加载失败: ' + e.message, true) }
}

const loadVersion = async () => { try { const d = await api.getVersion(); appVersion.value = d.version || '' } catch (e) {} }

const fetchModels = async () => {
  const bu = form.value.base_url.trim(), ak = form.value.api_key.trim()
  if (!bu || !ak) { window.toast('请先填写 Base URL 和 API Key', true); return }
  fetchingModels.value = true
  try {
    const d = await api.getModels(bu, ak, form.value.extra_headers.trim())
    models.value = d.models
    window.toast('已获取 ' + d.models.length + ' 个模型')
  } catch (e) { window.toast('获取失败: ' + e.message, true) }
  finally { fetchingModels.value = false }
}

const saveAiSettings = async () => {
  try {
    await api.updateAISettings({ base_url: form.value.base_url.trim(), api_key: form.value.api_key.trim(), model_name: form.value.model_name_manual.trim() || form.value.model_name || 'gpt-4', extra_headers: form.value.extra_headers.trim() })
    window.toast('AI设置已保存')
  } catch (e) { window.toast('保存失败: ' + e.message, true) }
}

const testAiConnection = async () => {
  testResultText.value = ''; testResultClass.value = ''
  try { await saveAiSettings(); const d = await api.testAI(); testResultText.value = d.message; testResultClass.value = d.ok ? 'success' : 'error' }
  catch (e) { testResultText.value = '失败: ' + e.message; testResultClass.value = 'error' }
}

const saveValueRanges = async () => {
  try { await api.updateSettings({ today_min: form.value.today_min, today_max: form.value.today_max, weekly_min: form.value.weekly_min, weekly_max: form.value.weekly_max, monthly_min: form.value.monthly_min, monthly_max: form.value.monthly_max, yearly_min: form.value.yearly_min, yearly_max: form.value.yearly_max }); window.toast('价值范围已保存') }
  catch (e) { window.toast('保存失败: ' + e.message, true) }
}

const saveCheckinSettings = async () => {
  try { await api.updateSettings({ checkin_daily_increment: form.value.checkin_daily_inc, checkin_max_value: form.value.checkin_max_val }); window.toast('打卡设置已保存') }
  catch (e) { window.toast('保存失败: ' + e.message, true) }
}

const resetBalance = async () => {
  if (!confirm('确定清零所有虚拟价值？此操作不可撤销。')) return
  try { const d = await api.resetBalance(); window.toast('已清零 ' + d.cleared.toFixed(1) + ' 虚拟价值'); window.loadBalance && window.loadBalance() }
  catch (e) { window.toast('操作失败: ' + e.message, true) }
}

const saveSignatures = async () => {
  try { await api.saveSignatures(form.value.signatures.split('\n')); window.toast('签名已保存') }
  catch (e) { window.toast('保存失败: ' + e.message, true) }
}

const switchBgMode = (mode) => {
  bgMode.value = mode
  if (window.applyBgMode) window.applyBgMode(mode, bgColor.value, bgPreviewSrc.value)
}

const pickBgColor = (color) => {
  bgColor.value = color
  if (window.applyBgMode) window.applyBgMode('solid', color, '')
}

const switchGlassStyle = (style) => {
  glassStyle.value = style
  if (window.applyGlassStyle) window.applyGlassStyle(style)
}

const previewBgImage = (e) => {
  const file = e.target.files[0]; if (!file) return
  bgFileName.value = file.name
  const reader = new FileReader()
  reader.onload = (ev) => { bgPreviewSrc.value = ev.target.result; if (window.applyBgMode) window.applyBgMode('image', '', ev.target.result) }
  reader.readAsDataURL(file)
}

const resetBgImage = () => { bgFileName.value = ''; bgPreviewSrc.value = ''; bgMode.value = 'orb'; if (window.applyBgMode) window.applyBgMode('orb', '', '') }

const saveBgSettings = async () => {
  const payload = { bg_mode: bgMode.value }
  if (bgMode.value === 'solid') payload.bg_solid_color = bgColor.value
  else if (bgMode.value === 'image') {
    const fileInput = document.querySelector('input[type="file"][accept="image/*"]')
    if (fileInput && fileInput.files && fileInput.files[0]) {
      try { const d = await api.uploadBackground(fileInput.files[0]); if (d.error) { window.toast('上传失败: ' + d.error, true); return }; payload.bg_image = d.path }
      catch (e) { window.toast('上传失败: ' + e.message, true); return }
    }
  }
  try { await api.updateSettings(payload); window.toast('背景设置已保存') }
  catch (e) { window.toast('保存失败: ' + e.message, true) }
}

window.updateDownloadProgress = (pct) => {
  showUpdateProgress.value = true
  if (pct < 0) { updateProgressLabel.value = '准备更新...'; updateProgressPct.value = 0; return }
  updateProgressPct.value = pct
  if (pct >= 100) updateProgressPct.value = 100
}

const checkUpdate = async () => {
  updateResultText.value = ''; updateResultClass.value = ''; showUpdateProgress.value = false
  checkingUpdate.value = true
  try {
    const d = await api.checkUpdate()
    if (d.downloading) { updateResultText.value = d.message; updateResultClass.value = 'success'; showUpdateProgress.value = true; pollUpdateStatus(); return }
    updateResultText.value = d.message || '已是最新版本'; updateResultClass.value = 'success'
  } catch (e) { updateResultText.value = '检查失败: ' + e.message; updateResultClass.value = 'error' }
  finally { checkingUpdate.value = false }
}

const pollUpdateStatus = () => {
  let failCount = 0
  const poll = setInterval(async () => {
    try {
      const d = await api.getUpdateStatus(); failCount = 0
      if (d.message) updateProgressLabel.value = d.message
      if (d.percent >= 0) updateProgressPct.value = d.percent
      if (d.status === 'restarting') { updateProgressLabel.value = d.message || '正在重启安装...'; return }
      if (d.status === 'idle') { clearInterval(poll); checkingUpdate.value = false; showUpdateProgress.value = false; return }
      if (d.status === 'error') { clearInterval(poll); updateResultText.value = d.message || '更新失败'; updateResultClass.value = 'error'; checkingUpdate.value = false; showUpdateProgress.value = false }
    } catch { failCount++; if (failCount > 5) { clearInterval(poll); updateProgressLabel.value = '应用即将重启...' } }
  }, 1000)
}

onMounted(() => { loadSettings() })
</script>

<style scoped>
.glass-style-options {
  display: flex;
  gap: 16px;
}

.glass-style-card {
  flex: 1;
  padding: 16px;
  border-radius: var(--radius);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  background: rgba(255, 255, 255, 0.08);
}

.glass-style-card:hover {
  border-color: rgba(124, 110, 240, 0.3);
  background: rgba(124, 110, 240, 0.05);
}

.glass-style-card.active {
  border-color: var(--primary);
  background: rgba(124, 110, 240, 0.08);
}

.glass-style-preview {
  height: 80px;
  border-radius: 10px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.default-preview {
  background: linear-gradient(135deg, #e8e4f0 0%, #d4cceb 100%);
}

.default-preview .preview-card {
  width: 70%;
  height: 50px;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(100, 80, 200, 0.08);
}

.liquid-preview {
  background: linear-gradient(135deg, #c4b5fd 0%, #a78bfa 50%, #7c6ef0 100%);
  position: relative;
}

.liquid-preview::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%);
}

.liquid-preview .preview-card {
  width: 70%;
  height: 50px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(40px) saturate(1.8);
  -webkit-backdrop-filter: blur(40px) saturate(1.8);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(100, 80, 200, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  position: relative;
  overflow: hidden;
}

.liquid-preview .preview-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.08) 100%);
  pointer-events: none;
}

.glass-style-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.glass-style-desc {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
}

body.theme-dark .glass-style-card {
  background: rgba(255, 255, 255, 0.04);
}

body.theme-dark .glass-style-card:hover {
  background: rgba(124, 110, 240, 0.08);
}

body.theme-dark .glass-style-card.active {
  background: rgba(124, 110, 240, 0.12);
}

body.theme-dark .default-preview {
  background: linear-gradient(135deg, #2d2655 0%, #1a1625 100%);
}

body.theme-dark .default-preview .preview-card {
  background: rgba(0, 0, 0, 0.35);
  border-color: rgba(255, 255, 255, 0.15);
}

body.theme-dark .liquid-preview {
  background: linear-gradient(135deg, #1a1625 0%, #2d2655 50%, #3c1642 100%);
}

body.theme-dark .liquid-preview .preview-card {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

@media (max-width: 600px) {
  .glass-style-options {
    flex-direction: column;
  }
}
</style>

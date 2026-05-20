<template>
  <div class="page active">
    <div class="page-header">
      <h2>API余量</h2>
    </div>
    <div class="apibalance-content" v-html="content"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const content = ref('<div class="empty-state">加载中...</div>')

function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML }

const loadApiBalance = async () => {
  content.value = '<div class="empty-state">加载中...</div>'
  try {
    const data = await api.getApiBalance()
    if (data.supported === false) {
      content.value = `<div class="glass-card apibalance-unsupported"><div class="apibalance-unsupported-icon">&#9888;</div><div class="apibalance-unsupported-title">功能不支持</div><div class="apibalance-unsupported-desc">${esc(data.message)}</div><div class="apibalance-unsupported-hint">请在 <strong>AI设置</strong> 中将 Base URL 切换为 DeepSeek 的 API 地址，例如：</div><div class="apibalance-url-example">https://api.deepseek.com/v1</div></div>`
      return
    }
    if (data.error) {
      content.value = `<div class="glass-card"><div class="apibalance-section-title">DeepSeek 账户</div><div class="apibalance-status apibalance-status-error"><span class="apibalance-status-icon">&#10060;</span><span>获取失败：${esc(data.error)}</span></div></div>`
      return
    }
    const bv = parseFloat(data.balance)
    const isAvail = data.is_available && bv > 0
    const statusText = !data.is_available ? '已用尽' : bv <= 0 ? '余额为零' : '正常'
    const statusType = isAvail ? 'ok' : 'warn'
    const pct = Math.min(100, Math.round(bv))
    const barColor = bv > 10 ? 'var(--success)' : bv > 1 ? 'var(--warning)' : 'var(--danger)'
    content.value = `<div class="glass-card apibalance-hero" onclick="document.querySelector('[data-v-app]').__vue_app__.config.globalProperties.loadApiBalance && document.querySelector('[data-v-app]').__vue_app__.config.globalProperties.loadApiBalance()"><div class="apibalance-section-title">DeepSeek 账户</div><div class="apibalance-hero-amount"><span class="apibalance-hero-sign">&#165;</span><span class="apibalance-hero-val ${isAvail ? '' : 'apibalance-zero'}">${bv.toFixed(4)}</span><span class="apibalance-hero-unit">${esc(data.currency)}</span></div><div class="apibalance-bar-track"><div class="apibalance-bar-fill" style="width:${pct}%;background:${barColor}"></div></div><div class="apibalance-hero-footer"><span class="apibalance-status apibalance-status-${statusType}">${statusText}</span><span class="apibalance-refresh-hint">&#128260; 点击刷新</span></div></div><div class="apibalance-info-grid"><div class="glass-card apibalance-info-card"><div class="apibalance-info-icon">&#128176;</div><div class="apibalance-info-label">充值余额</div><div class="apibalance-info-val">${bv.toFixed(2)}</div></div><div class="glass-card apibalance-info-card"><div class="apibalance-info-icon">&#128200;</div><div class="apibalance-info-label">账户状态</div><div class="apibalance-info-val apibalance-info-status-${statusType}">${statusText}</div></div><div class="glass-card apibalance-info-card"><div class="apibalance-info-icon">&#127760;</div><div class="apibalance-info-label">币种</div><div class="apibalance-info-val">${esc(data.currency)}</div></div></div>`
  } catch (e) {
    content.value = `<div class="glass-card"><div class="apibalance-status apibalance-status-error"><span class="apibalance-status-icon">&#10060;</span><span>请求失败：${esc(e.message)}</span></div></div>`
  }
}

onMounted(() => { loadApiBalance() })
</script>

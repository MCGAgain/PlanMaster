<template>
  <div class="page active api-balance-page">
    <div class="page-header">
      <h2>API余量</h2>
    </div>
    
    <div class="apibalance-content">
      <!-- Gemini-style Fluid Loading State -->
      <div v-if="loading" class="loading-area">
        <div class="gemini-loader">
          <div class="gemini-blob blob-1"></div>
          <div class="gemini-blob blob-2"></div>
          <div class="gemini-blob blob-3"></div>
        </div>
        <p class="loading-text">正在评估 API 余量...</p>
      </div>
      
      <template v-else-if="balanceData">
        <!-- Unsupported State -->
        <GlassCard v-if="balanceData.supported === false" class="apibalance-unsupported">
          <div class="apibalance-unsupported-icon">&#9888;</div>
          <div class="apibalance-unsupported-title">功能不支持</div>
          <div class="apibalance-unsupported-desc">{{ balanceData.message }}</div>
          <div class="apibalance-unsupported-hint">请在 <strong>AI设置</strong> 中将 Base URL 切换为 DeepSeek 的 API 地址，例如：</div>
          <div class="apibalance-url-example">https://api.deepseek.com/v1</div>
        </GlassCard>

        <!-- Error State -->
        <GlassCard v-else-if="balanceData.error" class="apibalance-error">
          <div class="apibalance-section-title">DeepSeek 账户</div>
          <div class="apibalance-status apibalance-status-error">
            <span class="apibalance-status-icon">&#10060;</span>
            <span>获取失败：{{ balanceData.error }}</span>
          </div>
        </GlassCard>

        <!-- Success State -->
        <template v-else>
          <GlassCard 
            class="apibalance-hero hoverable" 
            @click="loadApiBalance"
            @mousedown="onPress($event)"
            @mouseup="onRelease($event)"
            @mouseleave="onRelease($event)"
          >
            <div class="apibalance-section-title">DeepSeek 账户</div>
            <div class="apibalance-hero-amount">
              <span class="apibalance-hero-sign">&#165;</span>
              <span class="apibalance-hero-val" :class="{ 'apibalance-zero': !isAvailable }">
                {{ formattedBalance }}
              </span>
              <span class="apibalance-hero-unit">{{ balanceData.currency }}</span>
            </div>
            <div class="apibalance-bar-track">
              <div class="apibalance-bar-fill" :style="progressBarStyle"></div>
            </div>
            <div class="apibalance-hero-footer">
              <span class="apibalance-status" :class="`apibalance-status-${statusType}`">
                {{ statusText }}
              </span>
              <small class="refresh-hint">点击卡片刷新</small>
            </div>
          </GlassCard>

          <div class="apibalance-info-grid">
            <GlassCard 
              class="apibalance-info-card hoverable"
              @mousedown="onPress($event)"
              @mouseup="onRelease($event)"
              @mouseleave="onRelease($event)"
            >
              <div class="apibalance-info-icon">&#128176;</div>
              <div class="apibalance-info-label">充值余额</div>
              <div class="apibalance-info-val">{{ parseFloat(balanceData.balance).toFixed(2) }}</div>
            </GlassCard>
            <GlassCard 
              class="apibalance-info-card hoverable"
              @mousedown="onPress($event)"
              @mouseup="onRelease($event)"
              @mouseleave="onRelease($event)"
            >
              <div class="apibalance-info-icon">&#128200;</div>
              <div class="apibalance-info-label">账户状态</div>
              <div class="apibalance-info-val" :class="`apibalance-info-status-${statusType}`">
                {{ statusText }}
              </div>
            </GlassCard>
            <GlassCard 
              class="apibalance-info-card hoverable"
              @mousedown="onPress($event)"
              @mouseup="onRelease($event)"
              @mouseleave="onRelease($event)"
            >
              <div class="apibalance-info-icon">&#127760;</div>
              <div class="apibalance-info-label">币种</div>
              <div class="apibalance-info-val">{{ balanceData.currency }}</div>
            </GlassCard>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import gsap from 'gsap'
import api from '@/api'
import GlassCard from '@/components/common/GlassCard.vue'

const loading = ref(true)
const balanceData = ref(null)

const formattedBalance = computed(() => {
  if (!balanceData.value) return '0.0000'
  return parseFloat(balanceData.value.balance).toFixed(4)
})

const isAvailable = computed(() => {
  if (!balanceData.value) return false
  return balanceData.value.is_available && parseFloat(balanceData.value.balance) > 0
})

const statusText = computed(() => {
  if (!balanceData.value) return ''
  const bv = parseFloat(balanceData.value.balance)
  if (!balanceData.value.is_available) return '已用尽'
  if (bv <= 0) return '余额为零'
  return '正常'
})

const statusType = computed(() => isAvailable.value ? 'ok' : 'warn')

const progressBarStyle = computed(() => {
  if (!balanceData.value) return {}
  const bv = parseFloat(balanceData.value.balance)
  const pct = Math.min(100, Math.round(bv))
  const color = bv > 10 ? 'var(--success)' : bv > 1 ? 'var(--warning)' : 'var(--danger)'
  return {
    width: `${pct}%`,
    background: color
  }
})

const playEntranceAnimation = () => {
  nextTick(() => {
    const cards = document.querySelectorAll('.apibalance-content .glass-card')
    if (cards.length) {
      gsap.fromTo(cards, 
        { opacity: 0, y: 40, scale: 0.92 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          duration: 0.9, 
          stagger: 0.15, 
          ease: 'back.out(1.4)',
          clearProps: 'all' 
        }
      )

    }
  })
}

const loadApiBalance = async () => {
  loading.value = true
  balanceData.value = null // Clear old data to trigger re-render
  try {
    const data = await api.getApiBalance()
    balanceData.value = data
  } catch (e) {
    balanceData.value = { error: e.message }
  } finally {
    loading.value = false
    // Ensure loading is false and cards are in DOM before animating
    playEntranceAnimation()
  }
}

// Unified Animations
const onPress = (e) => {
  const card = e.currentTarget
  gsap.to(card, { scale: 0.97, duration: 0.2, ease: 'power2.out' })
}

const onRelease = (e) => {
  const card = e.currentTarget
  const isHovered = card.matches(':hover')
  gsap.to(card, { 
    scale: isHovered ? 1.02 : 1,
    y: isHovered ? -4 : 0,
    duration: 0.4, 
    ease: 'elastic.out(1.2, 0.6)' 
  })
}

onMounted(() => { loadApiBalance() })
</script>

<style scoped>
.apibalance-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Gemini-style Loading */
.loading-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
  gap: 32px;
}

.gemini-loader {
  position: relative;
  width: 120px;
  height: 120px;
  filter: blur(15px);
  animation: loader-rotate 10s infinite linear;
}

.gemini-blob {
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  mix-blend-mode: screen;
  opacity: 0.8;
}

.blob-1 {
  background: radial-gradient(circle, #4285f4 0%, transparent 70%);
  top: 10%;
  left: 10%;
  animation: blob-move-1 4s infinite ease-in-out;
}

.blob-2 {
  background: radial-gradient(circle, #9b72f3 0%, transparent 70%);
  bottom: 10%;
  right: 10%;
  animation: blob-move-2 4s infinite ease-in-out -1.3s;
}

.blob-3 {
  background: radial-gradient(circle, #ff6b6b 0%, transparent 70%);
  top: 40%;
  left: 40%;
  animation: blob-move-3 4s infinite ease-in-out -2.6s;
}

@keyframes blob-move-1 {
  0%, 100% { transform: translate(0, 0) scale(1.2); }
  33% { transform: translate(40px, 20px) scale(1); }
  66% { transform: translate(20px, 40px) scale(1.1); }
}

@keyframes blob-move-2 {
  0%, 100% { transform: translate(0, 0) scale(1.1); }
  33% { transform: translate(-40px, -20px) scale(1.3); }
  66% { transform: translate(-20px, -40px) scale(1); }
}

@keyframes blob-move-3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(20px, -30px) scale(1.2); }
  66% { transform: translate(-30px, 20px) scale(1.1); }
}

@keyframes loader-rotate {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: var(--text-soft);
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.05em;
  background: linear-gradient(90deg, var(--text-soft), var(--primary), var(--text-soft));
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 2s linear infinite;
}

@keyframes shine {
  to { background-position: 200% center; }
}

.apibalance-hero {
  cursor: pointer;
}

.refresh-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: auto;
  opacity: 0.7;
}

.apibalance-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 800px) {
  .apibalance-info-grid {
    grid-template-columns: 1fr;
  }
}
</style>

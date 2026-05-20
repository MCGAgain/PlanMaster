<template>
  <div class="stats-view">
    <Header title="统计数据" />

    <div class="stats-content">
      <!-- 累计统计 -->
      <GlassCard class="stats-cumulative">
        <div class="stats-section-header">
          <h3>统计数据 <span v-if="cumulativeData?.first_date" class="stats-since">自 {{ cumulativeData.first_date }} 起</span></h3>
          <GlassButton variant="secondary" size="small" @click="handleClearSessions">清除专注时长</GlassButton>
        </div>
        <div class="stats-cumulative-grid">
          <div class="stat-item">
            <span class="stat-value">{{ cumulativeData?.count || 0 }}</span>
            <span class="stat-label">次数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ formatDuration(cumulativeData?.total_duration) }}</span>
            <span class="stat-label">时长</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ formatDuration(cumulativeData?.daily_avg) }}</span>
            <span class="stat-label">日均时长</span>
          </div>
        </div>
      </GlassCard>

      <!-- 每日统计 -->
      <GlassCard class="stats-daily">
        <div class="stats-date-nav">
          <GlassButton variant="secondary" size="small" @click="statsDatePrev">&#9664;</GlassButton>
          <span class="stats-date-label">{{ formatDate(statsDate) }}</span>
          <GlassButton variant="secondary" size="small" @click="statsDateNext">&#9654;</GlassButton>
        </div>
        <div class="stats-daily-grid">
          <div class="stat-item">
            <span class="stat-value">{{ dailyData?.count || 0 }}</span>
            <span class="stat-label">专注次数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ formatDuration(dailyData?.duration) }}</span>
            <span class="stat-label">专注时长</span>
          </div>
        </div>
      </GlassCard>

      <!-- 专注时长分布 -->
      <GlassCard class="stats-distribution">
        <div class="stats-section-header">
          <h3>专注时长分布</h3>
          <span class="stats-date-badge">{{ formatDate(statsDate) }}</span>
        </div>
        <div class="stats-period-tabs">
          <button
            v-for="period in periods"
            :key="period.key"
            class="period-tab"
            :class="{ active: activePeriod === period.key }"
            @click="switchPeriod(period.key)"
          >
            {{ period.label }}
          </button>
        </div>
        <div class="stats-chart-container">
          <canvas ref="donutCanvas" width="280" height="280"></canvas>
        </div>
        <div class="stats-legend" v-html="donutLegendHtml"></div>
      </GlassCard>

      <!-- 月度专注时段分布 -->
      <GlassCard class="stats-monthly">
        <div class="stats-section-header">
          <h3>本月专注时段分布</h3>
          <div class="stats-date-nav" style="margin: 0">
            <GlassButton variant="secondary" size="small" @click="statsMonthPrev">&#9664;</GlassButton>
            <span>{{ formatMonth(statsMonth) }}</span>
            <GlassButton variant="secondary" size="small" @click="statsMonthNext">&#9654;</GlassButton>
          </div>
        </div>
        <div class="stats-chart-container stats-bar-container">
          <canvas ref="barCanvas" width="600" height="300"></canvas>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import {
  Chart,
  DoughnutController,
  BarController,
  ArcElement,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from 'chart.js'
import api from '@/api'
import Header from '@/components/layout/Header.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassButton from '@/components/common/GlassButton.vue'

Chart.register(DoughnutController, BarController, ArcElement, BarElement, LinearScale, CategoryScale, Tooltip, Legend)

const CHART_COLORS = [
  '#7c6ef0', '#a78bfa', '#c4b5fd', '#3b82f6', '#60a5fa',
  '#10b981', '#34d399', '#f59e0b', '#fbbf24', '#f87171',
  '#ec4899', '#8b5cf6'
]

const statsDate = ref(new Date())
const statsMonth = ref(new Date())
const activePeriod = ref('day')
const cumulativeData = ref(null)
const dailyData = ref(null)
const distributionData = ref(null)
const donutLegendHtml = ref('')

const donutCanvas = ref(null)
const barCanvas = ref(null)
let donutChart = null
let barChart = null

const periods = [
  { key: 'day', label: '日' },
  { key: 'week', label: '周' },
  { key: 'month', label: '月' }
]

onMounted(async () => {
  await loadAllStats()
})

const loadAllStats = async () => {
  await Promise.all([
    loadCumulativeStats(),
    loadDailyStats(),
    loadDistributionStats(),
    loadMonthlyStats()
  ])
}

const loadCumulativeStats = async () => {
  try {
    cumulativeData.value = await api.getCumulativeStats()
  } catch (e) {
    console.error('Failed to load cumulative stats:', e)
  }
}

const loadDailyStats = async () => {
  try {
    dailyData.value = await api.getDailyStats(formatDate(statsDate.value))
  } catch (e) {
    console.error('Failed to load daily stats:', e)
  }
}

const loadDistributionStats = async () => {
  try {
    const d = await api.getDistributionStats({
      period: activePeriod.value,
      date: formatDate(statsDate.value)
    })
    distributionData.value = d
    await nextTick()
    renderDonutChart(d.items || [], d.total_duration || 0)
  } catch (e) {
    console.error('Failed to load distribution stats:', e)
  }
}

const loadMonthlyStats = async () => {
  try {
    const d = await api.getMonthlyStats(formatMonthParam(statsMonth.value))
    await nextTick()
    renderBarChart(d || [])
  } catch (e) {
    console.error('Failed to load monthly stats:', e)
  }
}

const renderDonutChart = (items, totalDuration) => {
  if (!donutCanvas.value) return
  const ctx = donutCanvas.value.getContext('2d')
  if (donutChart) {
    donutChart.destroy()
    donutChart = null
  }

  if (!items || !items.length) {
    donutLegendHtml.value = '<div class="empty-state" style="padding:20px">暂无数据</div>'
    return
  }

  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: items.map(i => i.category),
      datasets: [{
        data: items.map(i => i.total_duration),
        backgroundColor: items.map((_, idx) => CHART_COLORS[idx % CHART_COLORS.length]),
        borderColor: 'rgba(255,255,255,.6)',
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: false,
      cutout: '60%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(255,255,255,.9)',
          titleColor: '#2d2655',
          bodyColor: '#2d2655',
          borderColor: 'rgba(124,110,240,.3)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: (ctx) => ctx.label + ': ' + formatDuration(ctx.raw)
          }
        }
      }
    }
  })

  donutLegendHtml.value = items.map((item, idx) => {
    const color = CHART_COLORS[idx % CHART_COLORS.length]
    return `<div class="legend-item" data-idx="${idx}" onclick="window.toggleDonutSector(${idx})">
      <div class="legend-left"><span class="legend-color" style="background:${color}"></span><span class="legend-name">${item.category}</span></div>
      <div class="legend-right"><span class="legend-duration">${formatDuration(item.total_duration)}</span><span class="legend-pct">${item.percentage}%</span></div>
    </div>`
  }).join('')
}

const renderBarChart = (data) => {
  if (!barCanvas.value) return
  const ctx = barCanvas.value.getContext('2d')
  if (barChart) {
    barChart.destroy()
    barChart = null
  }

  if (!data || !data.length) return

  const labels = data.map(d => d.day)
  const values = data.map(d => Math.round(d.duration / 60))
  const chartWidth = Math.max(600, data.length * 24)
  barCanvas.value.style.width = chartWidth + 'px'
  barCanvas.value.width = chartWidth

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: 'rgba(124,110,240,.6)',
        borderColor: 'rgba(124,110,240,.8)',
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: 'rgba(124,110,240,.85)'
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(255,255,255,.9)',
          titleColor: '#2d2655',
          bodyColor: '#2d2655',
          borderColor: 'rgba(124,110,240,.3)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: (ctx) => ctx.raw + ' 分钟'
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#7a7494', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(124,110,240,.08)', drawBorder: false },
          ticks: {
            color: '#7a7494',
            font: { size: 11 },
            callback: (val) => val + ' min'
          },
          beginAtZero: true
        }
      }
    }
  })
}

const switchPeriod = (period) => {
  activePeriod.value = period
  loadDistributionStats()
}

const statsDatePrev = () => {
  statsDate.value = new Date(statsDate.value.getTime() - 86400000)
  loadDailyStats()
  loadDistributionStats()
}

const statsDateNext = () => {
  statsDate.value = new Date(statsDate.value.getTime() + 86400000)
  loadDailyStats()
  loadDistributionStats()
}

const statsMonthPrev = () => {
  const d = new Date(statsMonth.value)
  d.setMonth(d.getMonth() - 1)
  statsMonth.value = d
  loadMonthlyStats()
}

const statsMonthNext = () => {
  const d = new Date(statsMonth.value)
  d.setMonth(d.getMonth() + 1)
  statsMonth.value = d
  loadMonthlyStats()
}

const handleClearSessions = async () => {
  if (!confirm('确定要清除所有专注记录吗？此操作不可撤销。')) return
  try {
    await api.clearFocusSessions()
    alert('专注记录已清除')
    await loadAllStats()
  } catch (e) {
    alert('清除失败: ' + e.message)
  }
}

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '0分钟'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return d + '天' + h + '小时' + m + '分钟'
  if (h > 0) return h + '小时' + m + '分钟'
  return m + '分钟'
}

const formatDate = (d) => {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

const formatMonth = (d) => {
  return d.getFullYear() + '年' + String(d.getMonth() + 1).padStart(2, '0') + '月'
}

const formatMonthParam = (d) => {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

// 暴露给全局用于图例点击
window.toggleDonutSector = (idx) => {
  if (!donutChart) return
  const meta = donutChart.getDatasetMeta(0)
  meta.data[idx].hidden = !meta.data[idx].hidden
  donutChart.update()
}
</script>

<style scoped>
.stats-view {
  min-height: 100vh;
}

.stats-content {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stats-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.stats-section-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text);
}

.stats-since {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-soft);
}

.stats-cumulative-grid,
.stats-daily-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-soft);
}

.stats-date-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.stats-date-label {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.stats-date-badge {
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 4px;
}

.stats-period-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.period-tab {
  padding: 0.4rem 1rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 0.9rem;
}

.period-tab.active {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
}

.stats-chart-container {
  display: flex;
  justify-content: center;
  overflow-x: auto;
}

.stats-bar-container {
  overflow-x: auto;
}

.stats-legend {
  margin-top: 1rem;
}

:deep(.legend-item) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

:deep(.legend-item:hover) {
  background: var(--glass-bg);
}

:deep(.legend-item.disabled) {
  opacity: 0.5;
}

:deep(.legend-left) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

:deep(.legend-color) {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

:deep(.legend-name) {
  font-size: 0.9rem;
  color: var(--text);
}

:deep(.legend-right) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

:deep(.legend-duration) {
  font-size: 0.85rem;
  color: var(--text-soft);
}

:deep(.legend-pct) {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary);
}
</style>

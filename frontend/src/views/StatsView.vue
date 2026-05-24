<template>
  <div class="page active stats-page">
    <div class="page-header">
      <h2>统计数据</h2>
    </div>
    
    <div class="stats-content">
      <GlassCard class="stats-cumulative">
        <div class="stats-section-header">
          <h3 class="stats-section-title">总体概览 <span v-if="cumulative.first_date" class="date-since">自 {{ cumulative.first_date }} 起</span></h3>
          <button class="btn btn-glass btn-sm stats-clear-btn" @click="clearFocusSessions">清除专注记录</button>
        </div>
        <div class="stats-cumulative-grid">
          <div class="stat-item">
            <span class="stat-value">{{ cumulative.count || 0 }}</span>
            <span class="stat-label">专注次数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ fmtDuration(cumulative.total_duration) }}</span>
            <span class="stat-label">总时长</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ fmtDuration(cumulative.daily_avg) }}</span>
            <span class="stat-label">日均时长</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard class="stats-daily">
        <template #header>
          <div class="stats-date-nav">
            <button class="nav-btn" @click="statsDatePrev">&#9664;</button>
            <span class="stats-date-label">{{ statsDateLabel }}</span>
            <button class="nav-btn" @click="statsDateNext">&#9654;</button>
          </div>
        </template>
        <div class="stats-daily-grid">
          <div class="stat-item">
            <span class="stat-value">{{ daily.count || 0 }}</span>
            <span class="stat-label">专注次数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ fmtDuration(daily.duration) }}</span>
            <span class="stat-label">专注时长</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard class="stats-distribution">
        <template #header>
          <div class="stats-section-header">
            <h3>专注时长分布</h3>
            <div class="stats-period-tabs">
              <button class="period-tab" :class="{ active: statsPeriod === 'day' }" @click="switchStatsPeriod('day')">日</button>
              <button class="period-tab" :class="{ active: statsPeriod === 'week' }" @click="switchStatsPeriod('week')">周</button>
              <button class="period-tab" :class="{ active: statsPeriod === 'month' }" @click="switchStatsPeriod('month')">月</button>
            </div>
          </div>
        </template>
        <div class="distribution-body">
          <div class="stats-chart-container">
            <canvas ref="donutCanvas" width="280" height="280"></canvas>
          </div>
          <div class="stats-legend" v-html="donutLegendHtml"></div>
        </div>
      </GlassCard>

      <GlassCard class="stats-monthly">
        <template #header>
          <div class="stats-section-header">
            <h3>月度趋势</h3>
            <div class="stats-date-nav" style="margin:0">
              <button class="nav-btn" @click="statsMonthPrev">&#9664;</button>
              <span class="month-label">{{ statsMonthLabel }}</span>
              <button class="nav-btn" @click="statsMonthNext">&#9654;</button>
            </div>
          </div>
        </template>
        <div class="stats-chart-container stats-bar-container">
          <canvas ref="barCanvas" width="600" height="300"></canvas>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import api from '@/api'
import GlassCard from '@/components/common/GlassCard.vue'
import { Chart, DoughnutController, ArcElement, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

Chart.register(DoughnutController, ArcElement, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const CHART_COLORS = ['#7c6ef0', '#a78bfa', '#c4b5fd', '#3b82f6', '#60a5fa', '#10b981', '#34d399', '#f59e0b', '#fbbf24', '#f87171', '#ec4899', '#8b5cf6']

const cumulative = ref({})
const daily = ref({})
const statsDate = ref(new Date())
const statsMonth = ref(new Date())
const statsPeriod = ref('day')
const statsDateLabel = ref('')
const statsMonthLabel = ref('')
const donutLegendHtml = ref('')
const donutCanvas = ref(null)
const barCanvas = ref(null)
let donutChart = null
let barChart = null

function fmtDuration(seconds) {
  if (!seconds || seconds <= 0) return '0分钟'
  const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return d + '天' + h + '小时' + m + '分钟'
  if (h > 0) return h + '小时' + m + '分钟'
  return m + '分钟'
}

function fmtDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
function fmtMonth(d) { return d.getFullYear() + '年' + String(d.getMonth() + 1).padStart(2, '0') + '月' }
function fmtMonthParam(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') }
function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML }

const updateDateLabels = () => { statsDateLabel.value = fmtDate(statsDate.value); statsMonthLabel.value = fmtMonth(statsMonth.value) }

const loadCumulative = async () => { try { cumulative.value = await api.getCumulativeStats() } catch (e) {} }
const loadDaily = async () => { try { daily.value = await api.getDailyStats(fmtDate(statsDate.value)) } catch (e) {} }
const statsDatePrev = () => { statsDate.value.setDate(statsDate.value.getDate() - 1); updateDateLabels(); loadDaily(); loadDistribution() }
const statsDateNext = () => { statsDate.value.setDate(statsDate.value.getDate() + 1); updateDateLabels(); loadDaily(); loadDistribution() }

const switchStatsPeriod = (period) => { statsPeriod.value = period; loadDistribution() }

const loadDistribution = async () => {
  try {
    const d = await api.getDistributionStats({ period: statsPeriod.value, date: fmtDate(statsDate.value) })
    renderDonutChart(d.items, d.total_duration)
  } catch (e) {}
}

const renderDonutChart = (items, totalDuration) => {
  if (donutChart) { donutChart.destroy(); donutChart = null }
  if (!donutCanvas.value) return
  if (!items || !items.length) { donutLegendHtml.value = '<div class="empty-state" style="padding:20px">暂无数据</div>'; return }
  donutChart = new Chart(donutCanvas.value.getContext('2d'), {
    type: 'doughnut',
    data: { labels: items.map(i => i.category), datasets: [{ data: items.map(i => i.total_duration), backgroundColor: items.map((_, idx) => CHART_COLORS[idx % CHART_COLORS.length]), borderColor: 'rgba(255,255,255,.6)', borderWidth: 2, hoverBorderWidth: 3, hoverOffset: 8 }] },
    options: { responsive: false, cutout: '60%', plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(255,255,255,.9)', titleColor: '#2d2655', bodyColor: '#2d2655', borderColor: 'rgba(124,110,240,.3)', borderWidth: 1, padding: 12, cornerRadius: 10, callbacks: { label: (ctx) => ctx.label + ': ' + fmtDuration(ctx.raw) } } } }
  })
  donutLegendHtml.value = items.map((item, idx) => {
    const color = CHART_COLORS[idx % CHART_COLORS.length]
    return `<div class="legend-item" data-idx="${idx}"><div class="legend-left"><span class="legend-color" style="background:${color}"></span><span class="legend-name">${esc(item.category)}</span></div><div class="legend-right"><span class="legend-duration">${fmtDuration(item.total_duration)}</span><span class="legend-pct">${item.percentage}%</span></div></div>`
  }).join('')
}

const statsMonthPrev = () => { statsMonth.value.setMonth(statsMonth.value.getMonth() - 1); updateDateLabels(); loadMonthly() }
const statsMonthNext = () => { statsMonth.value.setMonth(statsMonth.value.getMonth() + 1); updateDateLabels(); loadMonthly() }

const loadMonthly = async () => {
  try {
    const data = await api.getMonthlyStats(fmtMonthParam(statsMonth.value))
    renderBarChart(data)
  } catch (e) {}
}

const renderBarChart = (data) => {
  if (barChart) { barChart.destroy(); barChart = null }
  if (!barCanvas.value) return
  const labels = data.map(d => d.day), values = data.map(d => Math.round(d.duration / 60))
  const chartWidth = Math.max(600, data.length * 24)
  barCanvas.value.style.width = chartWidth + 'px'; barCanvas.value.width = chartWidth
  barChart = new Chart(barCanvas.value.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets: [{ data: values, backgroundColor: 'rgba(124,110,240,.6)', borderColor: 'rgba(124,110,240,.8)', borderWidth: 1, borderRadius: 4, hoverBackgroundColor: 'rgba(124,110,240,.85)' }] },
    options: { responsive: false, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(255,255,255,.9)', titleColor: '#2d2655', bodyColor: '#2d2655', borderColor: 'rgba(124,110,240,.3)', borderWidth: 1, padding: 12, cornerRadius: 10, callbacks: { label: (ctx) => ctx.raw + ' 分钟' } } }, scales: { x: { grid: { display: false }, ticks: { color: '#7a7494', font: { size: 11 } } }, y: { grid: { color: 'rgba(124,110,240,.08)', drawBorder: false }, ticks: { color: '#7a7494', font: { size: 11 }, callback: (val) => val + ' min' }, beginAtZero: true } } }
  })
}

const clearFocusSessions = async () => {
  if (!confirm('确定要清除所有专注记录吗？此操作不可撤销。')) return
  try { await api.clearFocusSessions(); window.toast('专注记录已清除'); await loadAll() }
  catch (e) { window.toast('清除失败: ' + e.message, true) }
}

const loadAll = async () => {
  updateDateLabels()
  await Promise.all([loadCumulative(), loadDaily(), loadDistribution(), loadMonthly()])
}

onMounted(() => { loadAll() })
</script>

<style scoped>
.stats-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.date-since {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-soft);
  margin-left: 8px;
}

.stats-cumulative-grid,
.stats-daily-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 10px;
}

.stats-daily-grid {
  grid-template-columns: repeat(2, 1fr);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  background: rgba(124, 110, 240, 0.04);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: rgba(124, 110, 240, 0.08);
  transform: translateY(-2px);
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-soft);
  margin-top: 4px;
}

.stats-date-nav {
  display: flex;
  align-items: center;
  gap: 15px;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s var(--ease-default);
}

.nav-btn:hover {
  background: var(--primary-light);
  border-color: var(--primary);
  transform: scale(1.1);
}

.stats-period-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 10px;
  gap: 4px;
}

.period-tab {
  padding: 6px 16px;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.period-tab:hover {
  color: var(--primary);
  transform: translateY(-1px);
}

.period-tab.active {
  background: white;
  color: var(--primary);
  box-shadow: 0 4px 12px rgba(124, 110, 240, 0.2);
  transform: scale(1.05);
}

body.theme-dark .period-tab.active {
  background: var(--glass-border);
  color: white;
}

.distribution-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 20px 0;
}

@media (max-width: 800px) {
  .distribution-body {
    flex-direction: column;
  }
}
</style>

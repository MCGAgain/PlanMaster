<template>
  <div class="stats-view">
    <Header title="统计数据" />

    <div class="stats-content">
      <!-- Tab Navigation -->
      <div class="stats-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-button"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Cumulative Stats -->
      <div v-if="activeTab === 'cumulative'" class="stats-section">
        <GlassCard v-if="cumulativeData" class="stats-summary">
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">总专注时长</span>
              <span class="summary-value">{{ formatDuration(cumulativeData.total_duration) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">总会话数</span>
              <span class="summary-value">{{ cumulativeData.total_sessions || 0 }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">平均时长</span>
              <span class="summary-value">{{ formatDuration(cumulativeData.avg_duration) }}</span>
            </div>
          </div>
        </GlassCard>
        <StatsChart
          v-if="cumulativeChartData"
          type="bar"
          :data="cumulativeChartData"
        />
      </div>

      <!-- Daily Stats -->
      <div v-if="activeTab === 'daily'" class="stats-section">
        <div class="date-picker">
          <GlassInput
            v-model="selectedDate"
            type="date"
            label="选择日期"
          />
        </div>
        <GlassCard v-if="dailyData" class="stats-summary">
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">当日专注时长</span>
              <span class="summary-value">{{ formatDuration(dailyData.total_duration) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">当日会话数</span>
              <span class="summary-value">{{ dailyData.total_sessions || 0 }}</span>
            </div>
          </div>
        </GlassCard>
        <StatsChart
          v-if="dailyChartData"
          type="line"
          :data="dailyChartData"
        />
      </div>

      <!-- Distribution Stats -->
      <div v-if="activeTab === 'distribution'" class="stats-section">
        <div class="period-selector">
          <button
            v-for="period in periods"
            :key="period.value"
            class="period-button"
            :class="{ active: selectedPeriod === period.value }"
            @click="selectPeriod(period.value)"
          >
            {{ period.label }}
          </button>
        </div>
        <StatsChart
          v-if="distributionChartData"
          type="pie"
          :data="distributionChartData"
        />
      </div>

      <!-- Monthly Stats -->
      <div v-if="activeTab === 'monthly'" class="stats-section">
        <div class="date-picker">
          <GlassInput
            v-model="selectedMonth"
            type="month"
            label="选择月份"
          />
        </div>
        <StatsChart
          v-if="monthlyChartData"
          type="bar"
          :data="monthlyChartData"
        />
      </div>

      <GlassCard v-if="loading" class="loading-state">
        <p>加载中...</p>
      </GlassCard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/api'
import Header from '@/components/layout/Header.vue'
import GlassCard from '@/components/common/GlassCard.vue'
import GlassInput from '@/components/common/GlassInput.vue'
import StatsChart from '@/components/business/StatsChart.vue'

const loading = ref(false)
const activeTab = ref('cumulative')

const tabs = [
  { key: 'cumulative', label: '累计统计' },
  { key: 'daily', label: '每日统计' },
  { key: 'distribution', label: '分布统计' },
  { key: 'monthly', label: '月度统计' }
]

const periods = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'year', label: '本年' }
]

// Cumulative
const cumulativeData = ref(null)
const cumulativeChartData = computed(() => {
  if (!cumulativeData.value?.by_type) return null
  const types = Object.keys(cumulativeData.value.by_type)
  return {
    labels: types.map(t => typeLabels[t] || t),
    datasets: [{
      label: '专注时长（分钟）',
      data: types.map(t => Math.round((cumulativeData.value.by_type[t] || 0) / 60)),
      backgroundColor: [
        'rgba(99, 102, 241, 0.6)',
        'rgba(139, 92, 246, 0.6)',
        'rgba(236, 72, 153, 0.6)',
        'rgba(248, 113, 113, 0.6)'
      ]
    }]
  }
})

// Daily
const selectedDate = ref(new Date().toISOString().split('T')[0])
const dailyData = ref(null)
const dailyChartData = computed(() => {
  if (!dailyData.value?.hourly) return null
  return {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{
      label: '专注时长（分钟）',
      data: dailyData.value.hourly.map(v => Math.round(v / 60)),
      borderColor: 'rgba(99, 102, 241, 0.8)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.4
    }]
  }
})

// Distribution
const selectedPeriod = ref('week')
const distributionData = ref(null)
const distributionChartData = computed(() => {
  if (!distributionData.value?.by_type) return null
  const types = Object.keys(distributionData.value.by_type)
  return {
    labels: types.map(t => typeLabels[t] || t),
    datasets: [{
      data: types.map(t => Math.round((distributionData.value.by_type[t] || 0) / 60)),
      backgroundColor: [
        'rgba(99, 102, 241, 0.6)',
        'rgba(139, 92, 246, 0.6)',
        'rgba(236, 72, 153, 0.6)',
        'rgba(248, 113, 113, 0.6)'
      ]
    }]
  }
})

// Monthly
const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const monthlyData = ref(null)
const monthlyChartData = computed(() => {
  if (!monthlyData.value?.daily) return null
  const days = Object.keys(monthlyData.value.daily).sort()
  return {
    labels: days.map(d => d.split('-')[2] + '日'),
    datasets: [{
      label: '专注时长（分钟）',
      data: days.map(d => Math.round((monthlyData.value.daily[d] || 0) / 60)),
      backgroundColor: 'rgba(99, 102, 241, 0.6)'
    }]
  }
})

const typeLabels = {
  unlimited: '正计时',
  countdown: '倒计时',
  pomodoro: '番茄钟'
}

const formatDuration = (seconds) => {
  if (!seconds) return '0分钟'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m}分钟`
  return `${m}分钟`
}

const fetchCumulative = async () => {
  loading.value = true
  try {
    cumulativeData.value = await api.getCumulativeStats()
  } catch (error) {
    console.error('Failed to fetch cumulative stats:', error)
  } finally {
    loading.value = false
  }
}

const fetchDaily = async () => {
  loading.value = true
  try {
    dailyData.value = await api.getDailyStats(selectedDate.value)
  } catch (error) {
    console.error('Failed to fetch daily stats:', error)
  } finally {
    loading.value = false
  }
}

const fetchDistribution = async () => {
  loading.value = true
  try {
    distributionData.value = await api.getDistributionStats({ period: selectedPeriod.value })
  } catch (error) {
    console.error('Failed to fetch distribution stats:', error)
  } finally {
    loading.value = false
  }
}

const fetchMonthly = async () => {
  loading.value = true
  try {
    monthlyData.value = await api.getMonthlyStats(selectedMonth.value)
  } catch (error) {
    console.error('Failed to fetch monthly stats:', error)
  } finally {
    loading.value = false
  }
}

const selectPeriod = (period) => {
  selectedPeriod.value = period
  fetchDistribution()
}

onMounted(() => {
  fetchCumulative()
})

watch(activeTab, (tab) => {
  if (tab === 'cumulative') fetchCumulative()
  else if (tab === 'daily') fetchDaily()
  else if (tab === 'distribution') fetchDistribution()
  else if (tab === 'monthly') fetchMonthly()
})

watch(selectedDate, () => {
  if (activeTab.value === 'daily') fetchDaily()
})

watch(selectedMonth, () => {
  if (activeTab.value === 'monthly') fetchMonthly()
})
</script>

<style scoped>
.stats-view {
  min-height: 100vh;
}

.stats-content {
  padding: 2rem;
}

.stats-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  background: var(--glass-bg);
  padding: 0.25rem;
  border-radius: var(--radius-sm);
}

.tab-button {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-soft);
  transition: all var(--transition-fast);
}

.tab-button.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 500;
}

.tab-button:hover:not(.active) {
  background: var(--glass-border);
}

.stats-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stats-summary {
  padding: 1.5rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
}

.date-picker {
  max-width: 300px;
}

.period-selector {
  display: flex;
  gap: 0.5rem;
}

.period-button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-soft);
  transition: all var(--transition-fast);
}

.period-button.active {
  background: var(--primary-light);
  color: var(--primary);
  border-color: var(--primary);
}

.loading-state {
  text-align: center;
  color: var(--text-muted);
}
</style>

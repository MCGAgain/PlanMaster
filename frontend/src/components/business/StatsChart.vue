<!-- frontend/src/components/business/StatsChart.vue -->
<template>
  <div class="stats-chart">
    <canvas ref="chartCanvas" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import {
  Chart,
  BarController,
  LineController,
  PieController,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from 'chart.js'

Chart.register(
  BarController,
  LineController,
  PieController,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
)

const props = defineProps({
  type: {
    type: String,
    default: 'bar',
    validator: (v) => ['bar', 'line', 'pie'].includes(v)
  },
  data: {
    type: Object,
    required: true
  },
  options: {
    type: Object,
    default: () => ({})
  }
})

const chartCanvas = ref(null)
let chartInstance = null

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: 'var(--text-soft)',
        padding: 16,
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: 'var(--glass-bg)',
      titleColor: 'var(--text)',
      bodyColor: 'var(--text-soft)',
      borderColor: 'var(--glass-border)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12
    }
  },
  scales: props.type !== 'pie' ? {
    x: {
      grid: {
        color: 'var(--glass-border)'
      },
      ticks: {
        color: 'var(--text-muted)'
      }
    },
    y: {
      grid: {
        color: 'var(--glass-border)'
      },
      ticks: {
        color: 'var(--text-muted)'
      }
    }
  } : undefined
}

const createChart = () => {
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = chartCanvas.value.getContext('2d')

  chartInstance = new Chart(ctx, {
    type: props.type,
    data: props.data,
    options: {
      ...defaultOptions,
      ...props.options
    }
  })
}

const updateChart = () => {
  if (chartInstance) {
    chartInstance.data = props.data
    chartInstance.update()
  }
}

onMounted(() => {
  nextTick(() => {
    createChart()
  })
})

watch(() => props.data, updateChart, { deep: true })
watch(() => props.type, createChart)
</script>

<style scoped>
.stats-chart {
  position: relative;
  height: 300px;
  padding: 1rem;
}
</style>

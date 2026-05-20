<!-- frontend/src/components/business/StatsChart.vue -->
<template>
  <div class="stats-chart">
    <canvas ref="chartCanvas" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
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

/**
 * Reads the computed value of a CSS variable from the document root.
 * Chart.js renders to <canvas>, which cannot resolve CSS variables,
 * so we must resolve them to concrete color strings before passing them.
 */
function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function buildDefaultOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: getCSSVar('--text-soft'),
          padding: 16,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: getCSSVar('--glass-bg'),
        titleColor: getCSSVar('--text'),
        bodyColor: getCSSVar('--text-soft'),
        borderColor: getCSSVar('--glass-border'),
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12
      }
    },
    scales: props.type !== 'pie' ? {
      x: {
        grid: {
          color: getCSSVar('--glass-border')
        },
        ticks: {
          color: getCSSVar('--text-muted')
        }
      },
      y: {
        grid: {
          color: getCSSVar('--glass-border')
        },
        ticks: {
          color: getCSSVar('--text-muted')
        }
      }
    } : undefined
  }
}

const createChart = () => {
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = chartCanvas.value.getContext('2d')

  // Build options fresh each time so that:
  // 1. CSS variables are resolved at render time (canvas can't use var())
  // 2. props.type is re-evaluated (not captured once at module scope)
  chartInstance = new Chart(ctx, {
    type: props.type,
    data: props.data,
    options: {
      ...buildDefaultOptions(),
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

// Prevent Chart instance leak when the component is unmounted
onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
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

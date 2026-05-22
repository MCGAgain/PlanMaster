<template>
  <div
    ref="containerRef"
    class="liquid-glass-container"
    :class="{ 'is-ready': isReady }"
    :style="containerStyle"
  >
    <!-- 背景底色层：增加圆角继承和过渡，修复矩形边框问题 -->
    <div class="liquid-glass-bg-placeholder"></div>

    <!-- 玻璃层：仅在背景图加载完成后显示 -->
    <div ref="glassRef" class="liquid-glass">
      <!-- 基础高光层 -->
      <div class="liquid-glass__highlight"></div>

      <!-- 流光层 -->
      <div class="liquid-glass__shimmer">
        <div class="shimmer-layer layer-1"></div>
        <div class="shimmer-layer layer-2"></div>
      </div>

      <!-- 动态有机波动 -->
      <div class="liquid-glass__blobs">
        <div class="blob"></div>
        <div class="blob"></div>
      </div>

      <!-- 内容区域：确保 z-index 最高，保护文字不被模糊 -->
      <div class="liquid-glass__content">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  /** 背景图片 URL */
  src: {
    type: String,
    required: true
  },
  /** 模糊半径 (px) */
  blur: {
    type: Number,
    default: 25
  },
  /** 背景透明度 0-1 */
  opacity: {
    type: Number,
    default: 0.2
  },
  /** 圆角半径 */
  radius: {
    type: String,
    default: '16px'
  },
  /** 是否启用入场动画 */
  animate: {
    type: Boolean,
    default: true
  }
})

const isReady = ref(false)
const containerRef = ref(null)
const glassRef = ref(null)
let entranceTl = null
let idleTl = null

/**
 * 核心修复逻辑：
 * 使用 animState 存储动画数值，通过 CSS 变量驱动 backdrop-filter。
 * 避免直接对 glassRef 使用 filter: blur()，因为那会模糊所有子元素（包括文字）。
 */
const animState = ref({
  blur: 0,
  saturate: 1,
  opacity: 0,
  scale: 0.98
})

const containerStyle = computed(() => ({
  '--glass-blur-radius': `${animState.value.blur}px`,
  '--glass-saturate': animState.value.saturate,
  '--glass-opacity': props.opacity * animState.value.opacity,
  '--glass-radius': props.radius,
  '--glass-scale': animState.value.scale,
  'background-image': isReady.value ? `url(${props.src})` : 'none'
}))

/**
 * 预加载背景图片
 */
function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * 入场动画
 */
function playEntrance() {
  if (entranceTl) entranceTl.kill()
  
  entranceTl = gsap.timeline({ defaults: { ease: 'power3.out' } })

  if (props.animate) {
    // 重置状态
    animState.value = { blur: 0, saturate: 1, opacity: 0, scale: 0.98 }

    // 同步动画数值
    entranceTl.to(animState.value, {
      blur: props.blur,
      saturate: 1.8,
      opacity: 1,
      scale: 1,
      duration: 1.2
    })

    // 内部装饰层（光影）交错入场
    const innerLayers = glassRef.value?.querySelectorAll('.liquid-glass__highlight, .liquid-glass__shimmer, .liquid-glass__blobs')
    if (innerLayers) {
      entranceTl.fromTo(innerLayers,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 1, stagger: 0.15 },
        '-=0.8'
      )
    }
  } else {
    animState.value = { blur: props.blur, saturate: 1.8, opacity: 1, scale: 1 }
  }

  // 开启闲置呼吸动画
  entranceTl.add(() => playIdleAnimation(), '-=0.2')
}

/**
 * 呼吸动画：模拟液态起伏
 */
function playIdleAnimation() {
  if (idleTl) idleTl.kill()
  idleTl = gsap.timeline({ repeat: -1, yoyo: true })

  // 模糊度和饱和度的细微波动
  idleTl.to(animState.value, {
    blur: props.blur + 3,
    saturate: 2.1,
    duration: 4,
    ease: 'sine.inOut'
  })

  // Blobs 随机位移
  const blobs = glassRef.value?.querySelectorAll('.blob')
  blobs?.forEach((blob, index) => {
    gsap.to(blob, {
      x: () => (Math.random() - 0.5) * 60,
      y: () => (Math.random() - 0.5) * 60,
      duration: 5 + index * 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    })
  })
}

onMounted(async () => {
  try {
    await preloadImage(props.src)
    isReady.value = true
    await nextTick()
    requestAnimationFrame(() => playEntrance())
  } catch {
    isReady.value = true
    playEntrance()
  }
})

onBeforeUnmount(() => {
  entranceTl?.kill()
  idleTl?.kill()
})

watch(() => props.src, async (newSrc) => {
  if (!newSrc) return
  isReady.value = false
  try {
    await preloadImage(newSrc)
  } catch { /* ignore */ }
  isReady.value = true
  await nextTick()
  playEntrance()
})
</script>

<style scoped>
/* =============================================
   Liquid Glass Container
   ============================================= */
.liquid-glass-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: background-image 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden; /* 核心：裁剪所有溢出的背景/装饰层 */
  border-radius: var(--glass-radius);
}

/* 占位背景层：修复矩形闪烁 */
.liquid-glass-bg-placeholder {
  position: absolute;
  inset: 0;
  background: #f0f2f5;
  z-index: 0;
  border-radius: inherit; /* 继承父容器圆角 */
  transition: opacity 0.5s ease;
}

:global(body.theme-dark) .liquid-glass-bg-placeholder {
  background: #151518;
}

.is-ready .liquid-glass-bg-placeholder {
  opacity: 0.4; /* 图片就绪后淡化占位层 */
}

/* =============================================
   Glass Layer (The Core)
   ============================================= */
.liquid-glass {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  
  /* 
     核心：使用 backdrop-filter 仅模糊背景
     使用 CSS 变量接收 GSAP 的动画数值
  */
  backdrop-filter: blur(var(--glass-blur-radius)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur-radius)) saturate(var(--glass-saturate));
  
  background: rgba(255, 255, 255, var(--glass-opacity));
  border-radius: var(--glass-radius);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.05),
    inset 0 1px 1px rgba(255, 255, 255, 0.4);
  
  /* 动画数值映射 */
  transform: scale(var(--glass-scale));
  opacity: var(--glass-opacity);
  
  will-change: backdrop-filter, transform, opacity;
  overflow: hidden;
}

:global(body.theme-dark) .liquid-glass {
  background: rgba(15, 15, 20, var(--glass-opacity));
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}

/* =============================================
   Decorative Layers (装饰层)
   ============================================= */
.liquid-glass__blobs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.blob {
  position: absolute;
  width: 45%;
  height: 45%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
  border-radius: 50%;
  filter: blur(30px);
}

.blob:nth-child(1) { top: -10%; left: -10%; }
.blob:nth-child(2) { bottom: -10%; right: -10%; width: 55%; height: 55%; }

.liquid-glass__shimmer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.shimmer-layer {
  position: absolute;
  top: -100%; left: -100%; width: 300%; height: 300%;
}

.layer-1 {
  background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%);
  animation: liquidMove 10s ease-in-out infinite;
}

.layer-2 {
  background: linear-gradient(135deg, transparent 45%, rgba(255,255,255,0.1) 50%, transparent 55%);
  animation: liquidMove 15s ease-in-out infinite reverse;
}

@keyframes liquidMove {
  0% { transform: translate(-5%, -5%) rotate(0deg); }
  50% { transform: translate(5%, 5%) rotate(3deg); }
  100% { transform: translate(-5%, -5%) rotate(0deg); }
}

.liquid-glass__highlight {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, transparent 45%);
  pointer-events: none;
  z-index: 2;
}

/* =============================================
   Content: 保护文字不被模糊
   ============================================= */
.liquid-glass__content {
  position: relative;
  z-index: 10; /* 确保在所有装饰层和背景之上 */
}
</style>

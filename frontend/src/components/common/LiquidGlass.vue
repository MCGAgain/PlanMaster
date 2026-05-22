<template>
  <div
    ref="containerRef"
    class="liquid-glass-container"
    :style="containerStyle"
  >
    <!-- 第一层：底色占位层 (始终存在，防止透明空洞) -->
    <div class="glass-bg-base"></div>

    <!-- 第二层：真实背景图片层 (由 isReady 控制淡入，独立于玻璃组件) -->
    <div 
      class="glass-bg-image" 
      :style="imageLayerStyle"
    ></div>

    <!-- 第三层：液态玻璃组件 -->
    <div 
      ref="glassRef" 
      class="liquid-glass" 
      :class="{ 'is-visible': animState.isVisible }"
      :style="glassStyle"
    >
      <!-- 基础高光 -->
      <div class="liquid-glass__highlight"></div>

      <!-- 流光动画 -->
      <div class="liquid-glass__shimmer">
        <div class="shimmer-layer layer-1"></div>
        <div class="shimmer-layer layer-2"></div>
      </div>

      <!-- 有机波动 (Blobs) -->
      <div class="liquid-glass__blobs">
        <div class="blob"></div>
        <div class="blob"></div>
      </div>

      <!-- 内容 -->
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
  src: { type: String, required: true },
  blur: { type: Number, default: 25 },
  opacity: { type: Number, default: 0.2 },
  radius: { type: String, default: '16px' },
  animate: { type: Boolean, default: true }
})

const isReady = ref(false)
const glassRef = ref(null)
const containerRef = ref(null)

let entranceTl = null
let idleTl = null

// 动画状态：仅控制可见度和缩放
const animState = ref({
  vOpacity: 0,
  vScale: 0.98,
  isVisible: false
})

const containerStyle = computed(() => ({
  '--glass-radius': props.radius,
  '--glass-blur': `${props.blur}px`,
  '--glass-bg-opacity': props.opacity
}))

const imageLayerStyle = computed(() => ({
  'background-image': isReady.value ? `url(${props.src})` : 'none',
  'opacity': isReady.value ? 1 : 0
}))

const glassStyle = computed(() => ({
  'opacity': animState.value.vOpacity,
  'transform': `scale(${animState.value.vScale}) translateZ(0)`,
  'visibility': animState.value.isVisible ? 'visible' : 'hidden'
}))

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * 核心逻辑：
 * 1. 背景图淡入独立于玻璃淡入。
 * 2. 玻璃组件在可见的第一秒就拥有固定的 backdrop-filter (由 CSS 类 .liquid-glass 控制)。
 * 3. 动画仅操作 opacity，由于 CSS 中已写死 blur，浏览器会在渲染首帧即应用模糊。
 */
async function initComponent() {
  try {
    // 1. 等待图片加载
    await preloadImage(props.src)
    isReady.value = true
    
    // 2. 给浏览器两帧时间渲染背景图片到 GPU
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    
    // 3. 执行入场动画
    playEntrance()
  } catch (e) {
    isReady.value = true
    playEntrance()
  }
}

function playEntrance() {
  if (entranceTl) entranceTl.kill()
  
  animState.value.vOpacity = 0
  animState.value.vScale = 0.98
  animState.value.isVisible = false

  entranceTl = gsap.timeline({ 
    defaults: { ease: 'expo.out' } 
  })

  if (props.animate) {
    entranceTl.to(animState.value, {
      vOpacity: 1,
      vScale: 1,
      duration: 0.8,
      onStart: () => {
        animState.value.isVisible = true
      }
    })
    
    // 内部装饰层淡入
    const innerLayers = glassRef.value?.querySelectorAll('.liquid-glass__highlight, .liquid-glass__shimmer, .liquid-glass__blobs')
    if (innerLayers) {
      entranceTl.fromTo(innerLayers, 
        { opacity: 0 }, 
        { opacity: 1, duration: 1, stagger: 0.1 }, 
        '-=0.5'
      )
    }
  } else {
    animState.value.vOpacity = 1
    animState.value.vScale = 1
    animState.value.isVisible = true
  }

  playIdleAnimation()
}

function playIdleAnimation() {
  if (idleTl) idleTl.kill()
  const blobs = glassRef.value?.querySelectorAll('.blob')
  blobs?.forEach((blob, index) => {
    gsap.to(blob, {
      x: () => (Math.random() - 0.5) * 80,
      y: () => (Math.random() - 0.5) * 80,
      duration: 10 + index * 5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    })
  })
}

onMounted(() => {
  initComponent()
})

onBeforeUnmount(() => {
  entranceTl?.kill()
  idleTl?.kill()
})

watch(() => props.src, async (newSrc) => {
  if (!newSrc) return
  // 更换背景时不重置 isReady，而是通过 imageLayerStyle 的 transition 实现平滑切换
  try {
    await preloadImage(newSrc)
    isReady.value = true
  } catch (e) {}
})
</script>

<style scoped>
/* =============================================
   Container & Background Layers
   ============================================= */
.liquid-glass-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden; /* 核心：裁剪所有溢出，修复方形闪烁 */
  border-radius: var(--glass-radius);
  isolation: isolate; /* 创建独立的渲染层 */
}

/* 底色层：始终填充，圆角继承 */
.glass-bg-base {
  position: absolute;
  inset: 0;
  background: #f0f2f5;
  z-index: -2;
  border-radius: inherit;
}

:global(body.theme-dark) .glass-bg-base {
  background: #141417;
}

/* 图片层：圆角继承，淡入淡出 */
.glass-bg-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  z-index: -1;
  border-radius: inherit;
  transition: opacity 0.8s ease, background-image 0.8s ease;
  will-change: opacity, background-image;
}

/* =============================================
   Glass Layer (Core)
   ============================================= */
.liquid-glass {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 1;
  
  /* 
     核心：不再通过变量动态修改模糊度。
     只要类名存在，模糊就存在。
     使用 translateZ(0) 强制开启 GPU 加速，减少首帧重绘计算。
  */
  
  
  
  background: rgba(255, 255, 255, var(--glass-bg-opacity));
  border-radius: var(--glass-radius);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 
    0 15px 45px rgba(0, 0, 0, 0.1),
    inset 0 1px 1px rgba(255, 255, 255, 0.5);
  
  opacity: 0;
  visibility: hidden;
  will-change: opacity, transform;
  overflow: hidden;
}

:global(body.theme-dark) .liquid-glass {
  background: rgba(20, 20, 25, var(--glass-bg-opacity));
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 45px rgba(0, 0, 0, 0.3);
}

/* =============================================
   Decorative Layers (弱化强度，保护文字清晰)
   ============================================= */
.liquid-glass__blobs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.blob {
  position: absolute;
  width: 60%;
  height: 60%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
  border-radius: 50%;
  filter: blur(60px);
}
.blob:nth-child(1) { top: -20%; left: -20%; }
.blob:nth-child(2) { bottom: -20%; right: -20%; width: 70%; height: 70%; }

.liquid-glass__shimmer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.shimmer-layer {
  position: absolute;
  top: -100%; left: -100%; width: 300%; height: 300%;
  opacity: 0.3;
}

.layer-1 {
  background: linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%);
  animation: liquidMove 20s ease-in-out infinite;
}

.layer-2 {
  background: linear-gradient(130deg, transparent 45%, rgba(255,255,255,0.06) 50%, transparent 55%);
  animation: liquidMove 30s ease-in-out infinite reverse;
}

@keyframes liquidMove {
  0% { transform: translate(-2%, -2%) rotate(0deg); }
  50% { transform: translate(2%, 2%) rotate(1deg); }
  100% { transform: translate(-2%, -2%) rotate(0deg); }
}

.liquid-glass__highlight {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, transparent 40%);
  pointer-events: none;
  z-index: 2;
}

/* =============================================
   Content: 绝对清晰，不受 backdrop-filter 影响
   ============================================= */
.liquid-glass__content {
  position: relative;
  z-index: 10;
}
</style>

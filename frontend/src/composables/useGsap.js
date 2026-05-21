import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import gsap from 'gsap'

export function useGsap() {
  const timelines = ref(new Map())
  const animations = ref([])

  // Create a timeline
  function createTimeline(name, options = {}) {
    const tl = gsap.timeline(options)
    timelines.value.set(name, tl)
    return tl
  }

  // Get or create timeline
  function getTimeline(name) {
    if (!timelines.value.has(name)) {
      return createTimeline(name)
    }
    return timelines.value.get(name)
  }

  // Kill a timeline
  function killTimeline(name) {
    const tl = timelines.value.get(name)
    if (tl) {
      tl.kill()
      timelines.value.delete(name)
    }
  }

  // Kill all timelines
  function killAll() {
    timelines.value.forEach(tl => tl.kill())
    timelines.value.clear()
    animations.value.forEach(anim => anim.kill())
    animations.value = []
  }

  // Animate element
  function animate(element, props, options = {}) {
    const anim = gsap.to(element, { ...props, ...options })
    animations.value.push(anim)
    return anim
  }

  // Animate from
  function animateFrom(element, props, options = {}) {
    const anim = gsap.from(element, { ...props, ...options })
    animations.value.push(anim)
    return anim
  }

  // Animate fromTo
  function animateFromTo(element, fromProps, toProps, options = {}) {
    const anim = gsap.fromTo(element, fromProps, { ...toProps, ...options })
    animations.value.push(anim)
    return anim
  }

  // Stagger animation
  function stagger(elements, props, options = {}) {
    const anim = gsap.from(elements, { ...props, ...options })
    animations.value.push(anim)
    return anim
  }

  // Fade in
  function fadeIn(element, options = {}) {
    return animateFrom(element, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      ease: 'power3.out',
      ...options
    })
  }

  // Fade out
  function fadeOut(element, options = {}) {
    return animate(element, {
      opacity: 0,
      y: -20,
      duration: 0.3,
      ease: 'power2.in',
      ...options
    })
  }

  // Slide in from left
  function slideInLeft(element, options = {}) {
    return animateFrom(element, {
      x: -40,
      opacity: 0,
      duration: 0.5,
      ease: 'power3.out',
      ...options
    })
  }

  // Slide in from right
  function slideInRight(element, options = {}) {
    return animateFrom(element, {
      x: 40,
      opacity: 0,
      duration: 0.5,
      ease: 'power3.out',
      ...options
    })
  }

  // Scale in
  function scaleIn(element, options = {}) {
    return animateFrom(element, {
      opacity: 0,
      scale: 0.9,
      duration: 0.4,
      ease: 'back.out(1.7)',
      ...options
    })
  }

  // Card entrance
  function cardIn(element, options = {}) {
    return animateFrom(element, {
      opacity: 0,
      y: 20,
      scale: 0.95,
      duration: 0.4,
      ease: 'power2.out',
      ...options
    })
  }

  // Modal entrance
  function modalIn(element, options = {}) {
    return animateFrom(element, {
      opacity: 0,
      scale: 0.8,
      y: 20,
      duration: 0.5,
      ease: 'back.out(1.7)',
      ...options
    })
  }

  // Overlay fade
  function overlayIn(element, options = {}) {
    return animateFrom(element, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.out',
      ...options
    })
  }

  // Toast slide
  function toastIn(element, options = {}) {
    return animateFrom(element, {
      opacity: 0,
      y: 50,
      x: '-50%',
      duration: 0.4,
      ease: 'back.out(1.7)',
      ...options
    })
  }

  // Stagger children
  function staggerChildren(parent, options = {}) {
    const children = parent.children
    if (!children.length) return

    return stagger(children, {
      opacity: 0,
      y: 20,
      duration: 0.4,
      ease: 'power2.out',
      stagger: 0.08,
      ...options
    })
  }

  // Hover effect
  function addHoverEffect(element, options = {}) {
    const enterProps = {
      scale: 1.02,
      y: -3,
      boxShadow: '0 16px 48px rgba(100,80,200,.14)',
      duration: 0.2,
      ease: 'power2.out',
      ...options.enter
    }

    const leaveProps = {
      scale: 1,
      y: 0,
      boxShadow: '0 8px 32px rgba(100,80,200,.08)',
      duration: 0.2,
      ease: 'power2.out',
      ...options.leave
    }

    function onEnter() {
      gsap.to(element, enterProps)
    }

    function onLeave() {
      gsap.to(element, leaveProps)
    }

    element.addEventListener('mouseenter', onEnter)
    element.addEventListener('mouseleave', onLeave)

    // Return cleanup function
    return () => {
      element.removeEventListener('mouseenter', onEnter)
      element.removeEventListener('mouseleave', onLeave)
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    killAll()
  })

  return {
    timelines,
    animations,
    createTimeline,
    getTimeline,
    killTimeline,
    killAll,
    animate,
    animateFrom,
    animateFromTo,
    stagger,
    fadeIn,
    fadeOut,
    slideInLeft,
    slideInRight,
    scaleIn,
    cardIn,
    modalIn,
    overlayIn,
    toastIn,
    staggerChildren,
    addHoverEffect,
    gsap
  }
}

import gsap from 'gsap'

// Default animation presets
export const presets = {
  // Fade in from below
  fadeInUp: {
    from: { opacity: 0, y: 30 },
    to: { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
  },

  // Fade in from left
  fadeInLeft: {
    from: { opacity: 0, x: -40 },
    to: { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' }
  },

  // Fade in from right
  fadeInRight: {
    from: { opacity: 0, x: 40 },
    to: { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' }
  },

  // Scale in
  scaleIn: {
    from: { opacity: 0, scale: 0.9 },
    to: { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
  },

  // Slide up
  slideUp: {
    from: { y: 100, opacity: 0 },
    to: { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
  },

  // Card entrance
  cardIn: {
    from: { opacity: 0, y: 20, scale: 0.95 },
    to: { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
  },

  // Modal entrance
  modalIn: {
    from: { opacity: 0, scale: 0.8, y: 20 },
    to: { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)' }
  },

  // Overlay fade
  overlayIn: {
    from: { opacity: 0 },
    to: { opacity: 1, duration: 0.3, ease: 'power2.out' }
  },

  // Toast slide in
  toastIn: {
    from: { opacity: 0, y: 50, x: '-50%' },
    to: { opacity: 1, y: 0, x: '-50%', duration: 0.4, ease: 'back.out(1.7)' }
  },

  // Stagger children
  staggerIn: {
    from: { opacity: 0, y: 20 },
    to: { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.08 }
  }
}

// Animate element with preset
export function animateWithPreset(element, presetName, options = {}) {
  const preset = presets[presetName]
  if (!preset) {
    console.warn(`Animation preset "${presetName}" not found`)
    return gsap.timeline()
  }

  const fromVars = { ...preset.from, ...options.from }
  const toVars = { ...preset.to, ...options.to }

  return gsap.fromTo(element, fromVars, toVars)
}

// Animate element entrance
export function animateIn(element, options = {}) {
  const defaults = {
    opacity: 0,
    y: 30,
    duration: 0.6,
    ease: 'power3.out',
    ...options
  }

  return gsap.from(element, defaults)
}

// Animate element exit
export function animateOut(element, options = {}) {
  const defaults = {
    opacity: 0,
    y: -20,
    duration: 0.3,
    ease: 'power2.in',
    ...options
  }

  return gsap.to(element, defaults)
}

// Stagger animation for multiple elements
export function staggerIn(elements, options = {}) {
  const defaults = {
    opacity: 0,
    y: 20,
    duration: 0.4,
    ease: 'power2.out',
    stagger: 0.08,
    ...options
  }

  return gsap.from(elements, defaults)
}

// Stagger animation out
export function staggerOut(elements, options = {}) {
  const defaults = {
    opacity: 0,
    y: -10,
    duration: 0.2,
    ease: 'power2.in',
    stagger: 0.05,
    ...options
  }

  return gsap.to(elements, defaults)
}

// Hover animation
export function hoverIn(element, options = {}) {
  const defaults = {
    scale: 1.02,
    y: -3,
    boxShadow: '0 16px 48px rgba(100,80,200,.14)',
    duration: 0.3,
    ease: 'power2.out',
    ...options
  }

  return gsap.to(element, defaults)
}

export function hoverOut(element, options = {}) {
  const defaults = {
    scale: 1,
    y: 0,
    boxShadow: '0 8px 32px rgba(100,80,200,.08)',
    duration: 0.3,
    ease: 'power2.out',
    ...options
  }

  return gsap.to(element, defaults)
}

// Page transition
export function pageTransitionIn(element, options = {}) {
  const defaults = {
    opacity: 0,
    y: 20,
    duration: 0.4,
    ease: 'power3.out',
    ...options
  }

  return gsap.from(element, defaults)
}

export function pageTransitionOut(element, options = {}) {
  const defaults = {
    opacity: 0,
    y: -10,
    duration: 0.2,
    ease: 'power2.in',
    ...options
  }

  return gsap.to(element, defaults)
}

// Sidebar animation
export function sidebarIn(element, options = {}) {
  const defaults = {
    x: -40,
    opacity: 0,
    duration: 0.6,
    ease: 'power3.out',
    ...options
  }

  return gsap.from(element, defaults)
}

// Card hover effect
export function cardHoverIn(element, options = {}) {
  const defaults = {
    y: -3,
    boxShadow: '0 16px 48px rgba(100,80,200,.14)',
    duration: 0.2,
    ease: 'power2.out',
    ...options
  }

  return gsap.to(element, defaults)
}

export function cardHoverOut(element, options = {}) {
  const defaults = {
    y: 0,
    boxShadow: '0 8px 32px rgba(100,80,200,.08)',
    duration: 0.2,
    ease: 'power2.out',
    ...options
  }

  return gsap.to(element, defaults)
}

// Pulse animation
export function pulse(element, options = {}) {
  const defaults = {
    scale: 1.05,
    duration: 0.3,
    ease: 'power2.inOut',
    yoyo: true,
    repeat: 1,
    ...options
  }

  return gsap.to(element, defaults)
}

// Shake animation
export function shake(element, options = {}) {
  const defaults = {
    x: [-5, 5, -3, 3, 0],
    duration: 0.4,
    ease: 'power2.out',
    ...options
  }

  return gsap.to(element, defaults)
}

// Background blur animation
export function blurIn(element, options = {}) {
  const defaults = {
    backdropFilter: 'blur(20px)',
    webkitBackdropFilter: 'blur(20px)',
    duration: 0.4,
    ease: 'power2.out',
    ...options
  }

  return gsap.to(element, defaults)
}

export function blurOut(element, options = {}) {
  const defaults = {
    backdropFilter: 'blur(0px)',
    webkitBackdropFilter: 'blur(0px)',
    duration: 0.3,
    ease: 'power2.in',
    ...options
  }

  return gsap.to(element, defaults)
}

// Create a reusable animation controller
export class AnimationController {
  constructor() {
    this.timelines = new Map()
  }

  // Create or get a named timeline
  getTimeline(name) {
    if (!this.timelines.has(name)) {
      this.timelines.set(name, gsap.timeline())
    }
    return this.timelines.get(name)
  }

  // Kill a timeline
  killTimeline(name) {
    const tl = this.timelines.get(name)
    if (tl) {
      tl.kill()
      this.timelines.delete(name)
    }
  }

  // Kill all timelines
  killAll() {
    this.timelines.forEach(tl => tl.kill())
    this.timelines.clear()
  }

  // Animate with auto-cleanup
  animate(element, props, options = {}) {
    const tl = this.getTimeline(options.name || 'default')
    tl.to(element, { ...props, ...options })
    return tl
  }
}

// Singleton animation controller
export const animationController = new AnimationController()

// Vue directive for GSAP animations
export const vGsap = {
  mounted(el, binding) {
    const { value, modifiers } = binding

    if (typeof value === 'string') {
      // Use preset
      animateWithPreset(el, value)
    } else if (typeof value === 'object') {
      // Custom animation
      gsap.from(el, value)
    }
  }
}

// Export GSAP for direct use
export { gsap }

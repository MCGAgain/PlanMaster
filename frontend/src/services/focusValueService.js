/**
 * Focus Value Service
 * Converts focus duration to virtual value.
 * Formula: value = minutes * baseRate * multiplier
 *
 * Multiplier rules:
 * - Single session > 50min: 1.2x bonus
 * - Single session > 120min: 1.5x bonus
 * - Default: 1.0x
 */

const DEFAULT_CONFIG = {
  baseRate: 0.005,      // base value per minute (~10 for 24h)
  deepFocusThreshold: 50,   // minutes
  deepFocusMultiplier: 1.2,
  ultraFocusThreshold: 120, // minutes
  ultraFocusMultiplier: 1.5
}

export function calculateFocusValue(durationSeconds, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const minutes = durationSeconds / 60

  let multiplier = 1.0
  if (minutes >= cfg.ultraFocusThreshold) {
    multiplier = cfg.ultraFocusMultiplier
  } else if (minutes >= cfg.deepFocusThreshold) {
    multiplier = cfg.deepFocusMultiplier
  }

  const value = minutes * cfg.baseRate * multiplier
  return Math.round(value * 10) / 10  // round to 1 decimal
}

export function formatFocusDuration(seconds) {
  if (!seconds || seconds <= 0) return '0分钟'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m > 0 ? m + '分钟' : ''}`
  return `${m}分钟`
}

export function getFocusMultiplierLabel(durationSeconds, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const minutes = durationSeconds / 60
  if (minutes >= cfg.ultraFocusThreshold) return '超深度专注 ×1.5'
  if (minutes >= cfg.deepFocusThreshold) return '深度专注 ×1.2'
  return ''
}

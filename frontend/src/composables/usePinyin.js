// 拼音搜索工具
// PINYIN_MAP 和 PINYIN_ALT 从 pinyin-map.js 加载（通过 script 标签）
// 注意: const 声明不会附加到 window 对象，需要直接访问全局变量

/* global PINYIN_MAP, PINYIN_ALT */

export function usePinyin() {
  const toPinyin = (str) => {
    let result = ''
    for (const ch of str) {
      result += (typeof PINYIN_MAP !== 'undefined' ? PINYIN_MAP[ch] : null) || ch.toLowerCase()
    }
    return result
  }

  const toPinyinInitials = (str) => {
    let result = ''
    for (const ch of str) {
      const py = typeof PINYIN_MAP !== 'undefined' ? PINYIN_MAP[ch] : null
      if (py) result += py[0]
      else if (/[a-z0-9]/i.test(ch)) result += ch.toLowerCase()
    }
    return result
  }

  const matchPinyin = (title, keyword) => {
    if (!keyword) return true
    const kw = keyword.toLowerCase()
    const titleLower = title.toLowerCase()
    if (titleLower.includes(kw)) return true

    const primary = toPinyin(title)
    if (primary.includes(kw)) return true
    const primaryInit = toPinyinInitials(title)
    if (primaryInit.includes(kw)) return true

    // 多音字备用拼音匹配
    let pyPos = 0, initPos = 0
    for (let i = 0; i < title.length; i++) {
      const ch = title[i]
      const alt = typeof PINYIN_ALT !== 'undefined' ? PINYIN_ALT[ch] : null
      if (alt) {
        const priPy = (typeof PINYIN_MAP !== 'undefined' ? PINYIN_MAP[ch] : null) || ch.toLowerCase()
        const altFull = primary.substring(0, pyPos) + alt + primary.substring(pyPos + priPy.length)
        if (altFull.includes(kw)) return true
        if ((typeof PINYIN_MAP !== 'undefined' ? PINYIN_MAP[ch] : null) || /[a-z0-9]/i.test(ch)) {
          const altInit = primaryInit.substring(0, initPos) + alt[0] + primaryInit.substring(initPos + 1)
          if (altInit.includes(kw)) return true
        }
      }
      const py = typeof PINYIN_MAP !== 'undefined' ? PINYIN_MAP[ch] : null
      if (py) { pyPos += py.length; initPos++ }
      else if (/[a-z0-9]/i.test(ch)) { pyPos++; initPos++ }
      else { pyPos++ }
    }
    return false
  }

  return {
    toPinyin,
    toPinyinInitials,
    matchPinyin
  }
}

import { ref, onMounted } from 'vue'

const theme = ref(localStorage.getItem('theme') || 'light')

let initialized = false

const applyTheme = () => {
  document.body.classList.toggle('theme-dark', theme.value === 'dark')
}

const initTheme = () => {
  if (initialized) return
  initialized = true

  if (!localStorage.getItem('theme')) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    theme.value = prefersDark ? 'dark' : 'light'
  }
  applyTheme()

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      theme.value = e.matches ? 'dark' : 'light'
      applyTheme()
    }
  })
}

export function useTheme() {
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', theme.value)
    applyTheme()
  }

  const setTheme = (newTheme) => {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    applyTheme()
  }

  onMounted(() => {
    initTheme()
  })

  return {
    theme,
    toggleTheme,
    setTheme
  }
}

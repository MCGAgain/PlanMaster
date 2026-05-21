import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/global.css'
import './styles/blur-fix.css'
import { vGsap } from './utils/animations'

const app = createApp(App)
const pinia = createPinia()

// Register GSAP directive globally
app.directive('gsap', vGsap)

app.use(pinia)
app.use(router)
app.mount('#app')

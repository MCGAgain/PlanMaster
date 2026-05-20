import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
// TODO: Uncomment after Task 2 creates these CSS files
// import './styles/variables.css'
// import './styles/glassmorphism.css'
// import './styles/animations.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')

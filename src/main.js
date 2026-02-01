import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { registerServiceWorker } from './services/serviceWorkerManager.js'

//zbog firabase db
const originalError = console.error
console.error = (...args) => {
  const message = args[0]?.toString() || ''
  if (message.includes('ERR_INTERNET_DISCONNECTED') || 
      message.includes('ERR_NETWORK') ||
      message.includes('net::ERR')) {
    return
  }
  originalError.apply(console, args)
}

registerServiceWorker()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')

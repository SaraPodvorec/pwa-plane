import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { registerServiceWorker } from './services/serviceWorkerManager.js'

//zbog firestore db
const originalError = console.error
const originalWarn = console.warn

console.error = (...args) => {
  const message = JSON.stringify(args)
  if (message.includes('ERR_INTERNET_DISCONNECTED') || 
      message.includes('ERR_NETWORK') ||
      message.includes('firestore') ||
      message.includes('net::ERR') ||
      message.includes('Failed to fetch') ||
      message.includes('NetworkError')) {
    return
  }
  originalError.apply(console, args)
}

console.warn = (...args) => {
  const message = JSON.stringify(args)
  if (message.includes('firestore') || 
      message.includes('firebase') ||
      message.includes('ERR_')) {
    return
  }
  originalWarn.apply(console, args)
}

// Suppress unhandled promise rejections from network errors
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || event.reason?.toString() || ''
  if (message.includes('Failed to fetch') || 
      message.includes('NetworkError') ||
      message.includes('network') ||
      message.includes('offline')) {
    event.preventDefault()
  }
})

registerServiceWorker()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')

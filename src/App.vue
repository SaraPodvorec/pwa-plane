<template>
  <div class="page">
    <div class="layout">
      <header class="header">
      <div class="time">
        {{ formatTime(gameStore.currentTime) }}
      </div>
      <div class="actions">
        <button @click.stop="showHighScores = !showHighScores" class="btn btn-secondary">
          {{ showHighScores ? 'Back' : 'High Scores' }}
        </button>
        <button @click.stop="testNotification" class="btn btn-secondary">
          Test Notification
        </button>
      </div>
      </header>

      <main class="content">
        <Scoreboard v-if="showHighScores" @close="showHighScores = false" />
        <GameCanvas v-else />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useGameStore } from './stores/gameStore.js'
import GameCanvas from './components/GameCanvas.vue'
import Scoreboard from './components/Scoreboard.vue'

const showHighScores = ref(false)
const gameStore = useGameStore()

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const testNotification = async () => {
  console.log('Test notification clicked')
  
  try {
    console.log('Notification permission:', Notification.permission)

    // Request permission if needed
    if (Notification.permission === 'default') {
      console.log('Requesting notification permission...')
      const permission = await Notification.requestPermission()
      console.log('Permission result:', permission)
      if (permission !== 'granted') {
        console.warn('Notification permission denied')
        return
      }
    } else if (Notification.permission === 'denied') {
      console.warn('Notification permission is blocked')
      return
    }

    console.log('Permission granted, sending to service worker...')
    const registration = await navigator.serviceWorker.ready
    console.log('Service worker ready:', registration)
    
    if (!registration.active) {
      console.warn('Service worker not active')
      return
    }

    console.log('Service worker active, posting message...')
    registration.active.postMessage({
      type: 'SHOW_NOTIFICATION',
      title: 'Plane Game - Test Notification',
      body: 'Notifications are working!',
      icon: '/assets/Fly (1).png',
      badge: '/assets/Fly (1).png',
      tag: 'test-notification'
    })

    console.log('Notification message sent to service worker')
    
  } catch (error) {
    console.error('Test notification failed:', error)
  }
}
</script>

<style scoped>
:global(html, body, #app) {
  height: 100%;
  margin: 0;
  overflow: hidden;
}

.page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: hidden;
}

.layout {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  box-sizing: border-box;
  position: relative;
  top: 50vh;
  transform: translateY(-50%);
}

.header {
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
  box-sizing: border-box;
}

.time {
  font-size: 1.8rem;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.btn {
  padding: 0.7rem 1.2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .actions {
    flex-direction: column;
  }

  .time {
    font-size: 1.5rem;
    text-align: center;
  }

  .btn {
    width: 100%;
  }
}
</style>

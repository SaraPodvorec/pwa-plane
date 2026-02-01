import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { addScore, getScores } from '../services/indexedDB'

export const useGameStore = defineStore('game', () => {
  const currentTime = ref(0)
  const isPlaying = ref(false)
  const highScores = ref([])
  const gameStartTime = ref(null)
  const timerInterval = ref(null)


  const loadHighScores = async () => {
    try {
      const allScores = await getScores()
      
      const uniqueScores = []
      const seenTimes = new Set()
      
      for (const score of allScores) {
        if (!seenTimes.has(score.time)) {
          seenTimes.add(score.time)
          uniqueScores.push(score)
        }
      }
      
      highScores.value = uniqueScores.slice(0, 10)
    } catch (error) {
    }
  }


  const saveScore = async (time) => {
    try {
      const score = {
        time,
        date: new Date().toISOString()
      }
      const savedScore = await addScore(score)
      await loadHighScores()
      return savedScore
    } catch (error) {
    }
  }

  
  const getAllScores = async () => {
    try {
      return await getScores()
    } catch (error) {
      return []
    }
  }


  const startGame = () => {
    isPlaying.value = true
    gameStartTime.value = Date.now()
    currentTime.value = 0
    
    timerInterval.value = setInterval(() => {
      if (isPlaying.value) {
        currentTime.value = Math.floor((Date.now() - gameStartTime.value) / 1000)
      }
    }, 100)
  }


  const endGame = async () => {
    isPlaying.value = false
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
    }
    
    if (currentTime.value > 0) {
      const score = await saveScore(currentTime.value)
      
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready
          await registration.sync.register('sync-high-scores')
          if (registration.active) {
            registration.active.postMessage({ type: 'SYNC_NOW' })
          }
        } catch (error) {
          try {
            const registration = await navigator.serviceWorker.ready
            if (registration.active) {
              registration.active.postMessage({ type: 'SYNC_NOW' })
            }
          } catch (e) {
          }
        }
      }
      
      return score
    }
    return null
  }


  const resetGame = () => {
    currentTime.value = 0
    isPlaying.value = false
    gameStartTime.value = null
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
    }
  }

  const isNewHighScore = computed(() => {
    if (highScores.value.length === 0) return true
    return currentTime.value > highScores.value[highScores.value.length - 1]?.time || false
  })

  return {
    currentTime,
    isPlaying,
    highScores,
    gameStartTime,
    loadHighScores,
    saveScore,
    getAllScores,
    startGame,
    endGame,
    resetGame,
    isNewHighScore
  }
})

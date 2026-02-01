<template>
  <div class="game-container">
    <canvas ref="canvas" class="canvas"></canvas>
    
    <div class="game-overlay">
      <div v-if="!gameStore.isPlaying && showGameOver" class="game-over">
        <h2>Game Over!</h2>
        <div class="score">
          <div class="label">Your Time</div>
          <div class="value">{{ formatTime(gameStore.currentTime) }}</div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" @click="handleStart">Start Game</button>
        </div>
      </div>

      <div v-if="!gameStore.isPlaying && !showGameOver && !isCountingDown && !isFalling" class="start">
        <h2>Ready to Fly?</h2>
        <p v-if="inputMode === 'voice'">
          How long can you hold your voice?
        </p>
        <p v-else>
          How fast can you click?
        </p>
        <p class="instruction" v-if="inputMode === 'voice'">
          Press Start, then hold your voice after the countdown.
        </p>
        <p class="instruction" v-else>
          Press Start, then click the left mouse button rapidly after the countdown.
        </p>
        <div class="actions">
          <button class="btn btn-primary" :disabled="isCountingDown" @click="handleStart">
            Start Game
          </button>
        </div>
      </div>

      <div v-if="isCountingDown" class="countdown">
        <div class="number">{{ countdownValue }}</div>
        <div class="text">Get Ready...</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore.js'
import { useAudioInput } from '../useInput.js'

const canvas = ref(null)
const gameStore = useGameStore()
const audioInput = useAudioInput()
const showGameOver = ref(false)
const voiceStrengthPercent = ref(0)
const hasReceivedVoice = ref(false)
const isCountingDown = ref(false)
const countdownValue = ref(3)
const isFalling = ref(false)
const inputMode = ref('voice')


let resizeCleanup = null
let controlsCleanup = null
let countdownTimerId = null

onUnmounted(() => {
  if (resizeCleanup) resizeCleanup()
  if (controlsCleanup) controlsCleanup()
  audioInput.stop()
  if (countdownTimerId) {
    clearInterval(countdownTimerId)
  }
  if (gameStore.isPlaying) {
    gameStore.endGame()
  }
})

//game state
let ctx = null
let planeX = 0
let planeY = 0
let planeVelY = 0
let gameWidth = 0
let gameHeight = 0
let spriteFlyIndex = 0
let frameCount = 0
let planeImages = []
let deadImage = null
let bgImage = null

const GRAVITY = 0.3
const LIFT = -8
const TERMINAL_VELOCITY = 8
const SPRITE_SIZE = 100
const ANIMATION_SPEED = 10

const loadImages = async () => {
  return new Promise((resolve) => {
    const images = []
    const imageSrcs = [
      '/assets/Fly (1).png',
      '/assets/Fly (2).png',
    ]

    let loaded = 0
    imageSrcs.forEach((src) => {
      const img = new Image()
      img.onload = () => {
        loaded++
        if (loaded === imageSrcs.length) {
          resolve(img)
        }
      }
      img.onerror = () => {
        console.log(`Failed to load ${src}`)
        loaded++
        if (loaded === imageSrcs.length) {
          resolve(null)
        }
      }
      img.src = src
      images.push(img)
    })

    planeImages = images

    const deadImg = new Image()
    deadImg.onload = () => {
      deadImage = deadImg
    }
    deadImg.src = '/assets/Dead (1).png'

    const bg = new Image()
    bg.onload = () => {
      bgImage = bg
    }
    bg.src = '/assets/BG.png'
  })
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const resetPlaneOnGround = () => {
  planeX = gameWidth / 2 - SPRITE_SIZE / 2
  planeY = gameHeight / 2 - SPRITE_SIZE / 2
  planeVelY = 0
  spriteFlyIndex = 0
  frameCount = 0
  render()
}

const startGame = async () => {
  showGameOver.value = false
  gameStore.resetGame()
  gameStore.startGame()

  resetPlaneOnGround()
  hasReceivedVoice.value = false

  gameLoop()
}


const gameLoop = () => {
  if (!gameStore.isPlaying) return


  voiceStrengthPercent.value = Math.round((audioInput.audioLevel.value / 255) * 100)
  if (hasReceivedVoice.value && !audioInput.isVoiceActive.value) {
    endGame()
    return
  }


  planeVelY += GRAVITY
  planeVelY = Math.min(planeVelY, TERMINAL_VELOCITY)

  //lift if voice is active
  if (audioInput.isVoiceActive.value) {
    hasReceivedVoice.value = true
    planeVelY += LIFT
    planeVelY = Math.max(planeVelY, LIFT)
  }

  //update position
  planeY += planeVelY

  //don't let plane go above canvas
  if (planeY < 0) {
    planeY = 0
    planeVelY = 0
  }

  if (planeY + SPRITE_SIZE > gameHeight) {
    endGame()
    return
  }

  if (planeX < 0) {
    planeX = 0
  } else if (planeX + SPRITE_SIZE > gameWidth) {
    planeX = gameWidth - SPRITE_SIZE
  }

  //update animation frame
  frameCount++
  if (frameCount % ANIMATION_SPEED === 0) {
    spriteFlyIndex = (spriteFlyIndex + 1) % planeImages.length
  }

  render()
  requestAnimationFrame(gameLoop)
}

const handleStart = async () => {
  showGameOver.value = false
  isFalling.value = false
  hasReceivedVoice.value = false
  if (gameStore.isPlaying) {
    gameStore.endGame()
  }
  resetPlaneOnGround()
  await audioInput.ensureMicrophoneActive()
  inputMode.value = audioInput.isMicrophoneSupported.value ? 'voice' : 'click'
  startCountdown()
}

const startCountdown = () => {
  isCountingDown.value = true
  countdownValue.value = 3

  if (countdownTimerId) {
    clearInterval(countdownTimerId)
  }

  countdownTimerId = setInterval(() => {
    countdownValue.value -= 1
    if (countdownValue.value <= 0) {
      clearInterval(countdownTimerId)
      countdownTimerId = null
      isCountingDown.value = false
      startGame()
    }
  }, 1000)
}

const render = () => {
  if (!ctx) return

  //background
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, gameWidth, gameHeight)
  } else {
    ctx.fillStyle = 'rgba(135, 206, 250, 0.5)'
    ctx.fillRect(0, 0, gameWidth, gameHeight)
  }

  //plane
  if (gameStore.isPlaying && planeImages[spriteFlyIndex]) {
    ctx.drawImage(planeImages[spriteFlyIndex], planeX, planeY, SPRITE_SIZE, SPRITE_SIZE)
  } else if (!gameStore.isPlaying && deadImage && planeY + SPRITE_SIZE >= gameHeight) {
    ctx.drawImage(deadImage, planeX, planeY, SPRITE_SIZE, SPRITE_SIZE)
  } else if (!gameStore.isPlaying && planeImages[spriteFlyIndex]) {
    ctx.drawImage(planeImages[spriteFlyIndex], planeX, planeY, SPRITE_SIZE, SPRITE_SIZE)
  }

  //voice indicator 
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(10, gameHeight - 30, 100, 20)
  ctx.fillStyle = audioInput.isVoiceActive.value ? '#22c55e' : '#ef4444'
  ctx.fillRect(10, gameHeight - 30, (audioInput.audioLevel.value / 255) * 100, 20)
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2
  ctx.strokeRect(10, gameHeight - 30, 100, 20)
}

const endGame = async () => {
  isFalling.value = true
  gameStore.endGame()

  const fallAnimation = () => {
    planeVelY += GRAVITY * 2
    planeY += planeVelY

    if (planeY + SPRITE_SIZE < gameHeight) {
      render()
      requestAnimationFrame(fallAnimation)
    } else {
      planeY = gameHeight - SPRITE_SIZE
      render()
      isFalling.value = false
      showGameOver.value = true
    }
  }

  fallAnimation()
}

const setupControls = () => {

  if (!audioInput.isMicrophoneSupported.value) {
    const fallbackCleanup = audioInput.setupFallbackControls(
      { mode: 'tap', pulseMs: 160 },
      (isActive) => {
        inputMode.value = 'click'
      },
      canvas.value
    )
    return fallbackCleanup
  }
  

  return () => {}
}

onMounted(async () => {
  const canvasEl = canvas.value
  if (!canvasEl) return

  ctx = canvasEl.getContext('2d')

  //canvas size
  const resizeCanvas = () => {
    const rect = canvasEl.parentElement.getBoundingClientRect()
    gameWidth = rect.width
    gameHeight = rect.height
    canvasEl.width = gameWidth
    canvasEl.height = gameHeight
  }

  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  
  resizeCleanup = () => {
    window.removeEventListener('resize', resizeCanvas)
  }

  await loadImages()
  await audioInput.initMicrophone()
  inputMode.value = audioInput.isMicrophoneSupported.value ? 'voice' : 'click'
  console.log('Microphone supported:', audioInput.isMicrophoneSupported.value, 'Input mode:', inputMode.value)
  const cleanupControls = setupControls()
  controlsCleanup = cleanupControls
  await gameStore.loadHighScores()

  resetPlaneOnGround()
})
</script>

<style scoped>
.game-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(180deg, #87ceeb 0%, #e0f6ff 100%);
  overflow: hidden;
}

.canvas {
  display: block;
  width: 100%;
  height: 100%;
  background: rgba(135, 206, 235, 0.8);
}

.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 75%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.75rem;
  pointer-events: none;
  box-sizing: border-box;
}

.start,
.game-over {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(65, 230, 134, 0.9);
  padding: 1.25rem;
  border-radius: 16px;
  text-align: center;
  color: white;
  pointer-events: auto;
  backdrop-filter: blur(10px);
  border: 2px solid white;
}

.start h2,
.game-over h2 {
  margin-bottom: 1rem;
  font-size: 2rem;
  text-shadow: 2px 2px 8px rgba(31, 31, 31, 0.5);
}

.start p {
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
}

.instruction {
  font-size: 0.9rem;
  color: #ffffff;
  margin-top: 0.5rem;
  font-style: italic;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.score {
  margin: 2rem 0;
}

.label {
  font-size: 1.5rem;
  color: #ffffff;
  text-shadow: 2px 2px 8px rgba(31, 31, 31, 0.5);
  margin-bottom: 0.5rem;
}

.value {
  font-size: 3rem;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 2px 2px 8px rgba(31, 31, 31, 0.5);
}

.btn {
  padding: 0.7rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-primary {
  color: black;
  border: 2px solid white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.countdown {
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: rgb(0, 0, 0);
  padding: 2rem 3rem;
  pointer-events: none;
}

.number {
  font-size: 5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.text {
  font-size: 1.5rem;
  color: #000000;
}

@media (max-width: 640px) {
  .start,
  .game-over {
    padding: 1.5rem;
    width: 90%;
  }

  .start h2 {
    font-size: 1.5rem;
  }
}
</style>

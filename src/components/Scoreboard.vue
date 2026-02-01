<template>
  <div class="scoreboard">
    <h2>High Scores</h2>
    
    <div v-if="gameStore.highScores.length === 0" class="empty">
      <p>No scores yet, or you might be offline</p>
    </div>

    <div v-else class="scores-list">
      <div v-for="(score, index) in gameStore.highScores" :key="score.id" class="score-item">
        <span class="rank">{{ index + 1 }}</span>
        <span class="time">{{ formatTime(score.time) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGameStore } from '../stores/gameStore.js'

const gameStore = useGameStore()

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

</script>

<style scoped>
.scoreboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: rgba(65, 225, 230, 0.9);
  padding: 2rem;
  color: white;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
}

.scoreboard h2 {
  margin: 0;
  font-size: 2rem;
  text-align: center;
  color: #ffffff;
  text-shadow: 2px 2px 8px rgba(31, 31, 31, 0.5);
}

.scores-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.score-item {
  display: grid;
  grid-template-columns: 3rem 1fr 1fr;
  align-items: center;
  gap: 1rem;
  background:rgba(65, 230, 134, 0.9);
  padding: 1rem;
  border: 2px solid white;
  border-radius: 8px;
}

.rank {
  font-size: 1.2rem;
  font-weight: bold;
  color: #ffffff;
  text-align: center;
  text-shadow: 2px 2px 8px rgba(31, 31, 31, 0.5);
}

.time {
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  text-shadow: 2px 2px 8px rgba(31, 31, 31, 0.5);
}

.empty {
  text-align: center;
  padding: 2rem;
  color: #d1d5db;
}

@media (max-width: 640px) {
  .scoreboard {
    padding: 1.5rem;
    max-height: 100%;
  }

  .score-item {
    grid-template-columns: 2.5rem 1fr;
    gap: 0.75rem;
  }
}
</style>

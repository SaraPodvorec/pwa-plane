const DB_NAME = 'pwa-plane-db'
const DB_VERSION = 1
const STORE_NAME = 'highScores'

let db = null

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        objectStore.createIndex('time', 'time', { unique: false })
        objectStore.createIndex('date', 'date', { unique: false })
      }
    }
  })
}

export const addScore = async (score) => {
  if (!db) await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.add(score)

    request.onsuccess = () => {
      resolve({ id: request.result, ...score })
    }
    request.onerror = () => reject(request.error)
  })
}

export const getScores = async (limitCount = null) => {
  if (!db) await initDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.getAll()

    request.onsuccess = () => {
      let scores = request.result

      scores.sort((a, b) => b.time - a.time)
      
      if (limitCount) {
        scores = scores.slice(0, limitCount)
      }
      
      resolve(scores)
    }
    request.onerror = () => reject(request.error)
  })
}

export const clearScores = async () => {
  if (!db) await initDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Initialize DB on module load
initDB()

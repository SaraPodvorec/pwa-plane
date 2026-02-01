const urlsToCache = [
    "/",
    "/manifest.json",
    "/index.html",
    "/assets/BG.png",
    "/assets/Fly (1).png",
    "/assets/Fly (2).png",
    "/assets/Dead (1).png",
];

const CACHE_NAME = "pwa-plane-cache-v4";
const RUNTIME_CACHE = "pwa-plane-runtime-v4";

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})


self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') {
    return
  }

  if (!url.protocol.startsWith('http')) {
    return
  }


  if (request.destination === 'image' || url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirstStrategy(request))
  } else {
    event.respondWith(networkFirstStrategy(request))
  }
})

const cacheFirstStrategy = async (request) => {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }
  
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      try {
        await cache.put(request, response.clone())
      } catch (cacheError) {
      }
    }
    return response
  } catch (error) {
    return new Response('Offline - image not available', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

const networkFirstStrategy = async (request) => {
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      try {
        await cache.put(request, response.clone())
      } catch (cacheError) {
      }
    }
    return response
  } catch (error) {
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }
    return new Response('Offline - content not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    })
  }
}


self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-high-scores') {
    event.waitUntil(syncHighScores())
  }
})


const syncHighScores = async () => {
  try {
    const scores = await getAllScoresFromIndexedDB()
    if (scores.length === 0) {
      return
    }

    const isNewHighScore = await checkNewHighScore(scores)

    const clients = await self.clients.matchAll()
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        scores,
        isNewHighScore
      })
    })

    if (isNewHighScore) {
      await self.registration.showNotification('Plane Game - New High Score!', {
        body: `You set a new record: ${formatTime(scores[0].time)}!`,
        icon: '/assets/Fly (1).png',
        badge: '/assets/Fly (1).png',
        tag: 'new-high-score',
        requireInteraction: false,
        actions: [
          { action: 'open', title: 'Play Again' }
        ]
      })
    } else {
      await self.registration.showNotification('Plane Game - Scores Synced', {
        body: 'Your high scores have been updated.',
        icon: '/assets/Fly (1).png',
        badge: '/assets/Fly (1).png',
        tag: 'sync-notification',
        requireInteraction: false
      })
    }

  } catch (error) {
    throw error
  }
}

const getAllScoresFromIndexedDB = async () => {
  try {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('pwa-plane-db', 1)
      
      request.onerror = () => resolve([])
      
      request.onsuccess = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('highScores')) {
          resolve([])
          return
        }
        
        const transaction = db.transaction(['highScores'], 'readonly')
        const objectStore = transaction.objectStore('highScores')
        const getAllRequest = objectStore.getAll()
        
        getAllRequest.onsuccess = () => {
          const scores = getAllRequest.result.sort((a, b) => b.time - a.time)
          resolve(scores)
        }
        
        getAllRequest.onerror = () => resolve([])
      }
    })
  } catch (error) {
    return []
  }
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const checkNewHighScore = async (scores) => {

  if (scores.length === 0) return false
  
  const sortedScores = [...scores].sort((a, b) => b.time - a.time)
  const mostRecent = [...scores].sort((a, b) => {
    const dateA = new Date(a.date || 0)
    const dateB = new Date(b.date || 0)
    return dateB - dateA
  })[0]
  
  if (!mostRecent || !mostRecent.date) return false
  

  const scoreDate = new Date(mostRecent.date)
  const now = new Date()
  const isRecent = (now - scoreDate) < 30000
  
  if (!isRecent) return false
  
  return mostRecent.time === sortedScores[0].time
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus()
      }
      return clients.openWindow('/')
    })
  )
})


self.addEventListener('message', (event) => {
  if (!event.data) return
  
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag } = event.data
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      requireInteraction: false
    })
  }
  if (event.data.type === 'SYNC_NOW') {
    event.waitUntil(syncHighScores())
  }
})

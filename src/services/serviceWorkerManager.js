export const registerServiceWorker = async () => {
  if (!navigator.serviceWorker) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
    })

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SYNC_COMPLETE') {
        handleSyncComplete(event.data)
      }
    })

  } catch (error) {
  }
}

const handleSyncComplete = async (data) => {
  const { scores, isNewHighScore } = data

  if ('Notification' in window && Notification.permission === 'granted') {
    const title = 'High Scores Synced'
    let body = 'Your high scores have been synced with the server.'
    
    if (isNewHighScore) {
      body += ` New high score: ${formatTime(scores[0]?.time || 0)}!`
    }

    navigator.serviceWorker.controller?.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      body,
      icon: '/assets/Fly (1).png',
      badge: '/assets/Fly (1).png',
      tag: 'sync-notification',
      requireInteraction: false
    })
  }
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

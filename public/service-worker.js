const CACHE_NAME = 'ai-pets-adventure-v1.0.0'
const STATIC_CACHE = 'static-v1'
const DYNAMIC_CACHE = 'dynamic-v1'
const ASSETS_CACHE = 'assets-v1'

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/_next/static/css/app.css',
  '/_next/static/js/app.js',
]

// Game assets to cache
const GAME_ASSETS = [
  '/assets/images/',
  '/assets/audio/',
  '/assets/models/',
]

// Install event - cache static files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        console.log('Static files cached successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Error caching static files:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== ASSETS_CACHE) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle different types of requests
  if (url.pathname === '/') {
    // Home page - try cache first, then network
    event.respondWith(cacheFirst(request, STATIC_CACHE))
  } else if (url.pathname.startsWith('/assets/')) {
    // Game assets - cache first strategy
    event.respondWith(cacheFirst(request, ASSETS_CACHE))
  } else if (url.pathname.startsWith('/api/')) {
    // API calls - network first strategy
    event.respondWith(networkFirst(request, DYNAMIC_CACHE))
  } else {
    // Other requests - network first
    event.respondWith(networkFirst(request, DYNAMIC_CACHE))
  }
})

// Cache first strategy
async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('Cache first strategy failed:', error)
    return new Response('Offline content not available', {
      status: 503,
      statusText: 'Service Unavailable',
    })
  }
}

// Network first strategy
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('Network first strategy failed:', error)
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    return new Response('Offline content not available', {
      status: 503,
      statusText: 'Service Unavailable',
    })
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  try {
    // Get offline actions from IndexedDB
    const offlineActions = await getOfflineActions()
    
    for (const action of offlineActions) {
      try {
        await processOfflineAction(action)
        await removeOfflineAction(action.id)
      } catch (error) {
        console.error('Failed to process offline action:', error)
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New quest available!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-72x72.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('AI Pets Adventure', options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/quests')
    )
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Helper functions for offline actions
async function getOfflineActions() {
  // This would interact with IndexedDB
  // For now, return empty array
  return []
}

async function processOfflineAction(action) {
  // Process the offline action
  // This would make the actual API call
  console.log('Processing offline action:', action)
}

async function removeOfflineAction(actionId) {
  // Remove the processed action from IndexedDB
  console.log('Removing offline action:', actionId)
} 
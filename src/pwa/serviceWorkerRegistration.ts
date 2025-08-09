export interface ServiceWorkerRegistrationOptions {
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onError?: (error: Error) => void
}

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager
  private registration: ServiceWorkerRegistration | null = null
  private options: ServiceWorkerRegistrationOptions

  constructor(options: ServiceWorkerRegistrationOptions = {}) {
    this.options = options
  }

  public static getInstance(options?: ServiceWorkerRegistrationOptions): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager(options)
    }
    return ServiceWorkerManager.instance
  }

  public async register(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported')
      this.options.onError?.(new Error('Service Worker not supported'))
      return null
    }

    try {
      // Check if we're in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Service Worker registration skipped')
        return null
      }

      this.registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      console.log('Service Worker registered successfully:', this.registration)

      // Set up event listeners
      this.setupEventListeners()

      // Check for updates
      this.checkForUpdates()

      this.options.onSuccess?.(this.registration)
      return this.registration

    } catch (error) {
      console.error('Service Worker registration failed:', error)
      this.options.onError?.(error as Error)
      return null
    }
  }

  private setupEventListeners(): void {
    if (!this.registration) return

    // Handle service worker updates
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing
      if (!newWorker) return

      console.log('Service Worker update found')

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('New Service Worker installed, update available')
          this.showUpdateNotification()
        }
      })
    })

    // Handle service worker state changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service Worker controller changed')
      window.location.reload()
    })

    // Handle service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event)
    })
  }

  private async checkForUpdates(): Promise<void> {
    if (!this.registration) return

    try {
      await this.registration.update()
    } catch (error) {
      console.error('Failed to check for updates:', error)
    }
  }

  private showUpdateNotification(): void {
    // Show a notification to the user that an update is available
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('AI Pets Adventure Update', {
        body: 'A new version is available. Click to update.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'update-available'
      })

      notification.addEventListener('click', () => {
        window.location.reload()
        notification.close()
      })

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000)
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data

    switch (type) {
      case 'CACHE_UPDATED':
        console.log('Cache updated:', data)
        break
      case 'OFFLINE_ACTION_QUEUED':
        console.log('Offline action queued:', data)
        break
      case 'BACKGROUND_SYNC_COMPLETED':
        console.log('Background sync completed:', data)
        break
      default:
        console.log('Unknown service worker message:', type, data)
    }
  }

  public async unregister(): Promise<boolean> {
    if (!this.registration) return false

    try {
      const unregistered = await this.registration.unregister()
      if (unregistered) {
        console.log('Service Worker unregistered successfully')
        this.registration = null
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to unregister Service Worker:', error)
      return false
    }
  }

  public getRegistration(): ServiceWorkerRegistration | null {
    return this.registration
  }

  public isRegistered(): boolean {
    return this.registration !== null
  }

  public async update(): Promise<void> {
    if (!this.registration) return

    try {
      await this.registration.update()
    } catch (error) {
      console.error('Failed to update Service Worker:', error)
    }
  }

  public async getUpdateInfo(): Promise<{ hasUpdate: boolean; waiting: boolean }> {
    if (!this.registration) {
      return { hasUpdate: false, waiting: false }
    }

    const hasUpdate = !!this.registration.waiting
    const waiting = !!this.registration.installing

    return { hasUpdate, waiting }
  }

  public async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) return

    try {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    } catch (error) {
      console.error('Failed to skip waiting:', error)
    }
  }

  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied'
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission()
    }

    return Notification.permission
  }

  public async showNotification(title: string, options: NotificationOptions = {}): Promise<Notification | null> {
    const permission = await this.requestNotificationPermission()
    
    if (permission !== 'granted') {
      console.warn('Notification permission not granted')
      return null
    }

    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        ...options
      })

      return notification
    } catch (error) {
      console.error('Failed to show notification:', error)
      return null
    }
  }
}

// Export a default instance
export const serviceWorkerRegistration = ServiceWorkerManager.getInstance()

// Export convenience functions
export const registerServiceWorker = (options?: ServiceWorkerRegistrationOptions) => 
  ServiceWorkerManager.getInstance(options).register()

export const unregisterServiceWorker = () => 
  serviceWorkerRegistration.unregister()

export const checkForUpdates = () => 
  serviceWorkerRegistration.update()

export const getUpdateInfo = () => 
  serviceWorkerRegistration.getUpdateInfo()

export const skipWaiting = () => 
  serviceWorkerRegistration.skipWaiting()

export const requestNotificationPermission = () => 
  serviceWorkerRegistration.requestNotificationPermission()

export const showNotification = (title: string, options?: NotificationOptions) => 
  serviceWorkerRegistration.showNotification(title, options) 
export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  tag?: string
  data?: any
  actions?: NotificationAction[]
  requireInteraction?: boolean
  silent?: boolean
  vibrate?: number[]
  sound?: string
}

export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

export interface NotificationPermission {
  permission: NotificationPermission
  granted: boolean
  canRequest: boolean
}

export class PushNotificationManager {
  private static instance: PushNotificationManager
  private subscription: PushSubscription | null = null
  private permission: NotificationPermission = 'default'
  private listeners: Array<(permission: NotificationPermission) => void> = []

  private constructor() {
    this.permission = Notification.permission
    this.initialize()
  }

  public static getInstance(): PushNotificationManager {
    if (!PushNotificationManager.instance) {
      PushNotificationManager.instance = new PushNotificationManager()
    }
    return PushNotificationManager.instance
  }

  private async initialize(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported')
      return
    }

    try {
      // Check existing subscription
      const registration = await navigator.serviceWorker.ready
      this.subscription = await registration.pushManager.getSubscription()
      
      // Listen for permission changes
      this.setupPermissionListener()
      
      console.log('Push notification manager initialized')
    } catch (error) {
      console.error('Failed to initialize push notification manager:', error)
    }
  }

  private setupPermissionListener(): void {
    // Listen for permission changes
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName })
        .then((permissionStatus) => {
          permissionStatus.addEventListener('change', () => {
            this.permission = permissionStatus.state as NotificationPermission
            this.notifyListeners()
          })
        })
        .catch(console.error)
    }
  }

  /**
   * Request notification permission
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return 'denied'
    }

    try {
      const permission = await Notification.requestPermission()
      this.permission = permission
      this.notifyListeners()
      
      if (permission === 'granted') {
        // Automatically subscribe to push notifications
        await this.subscribeToPush()
      }
      
      return permission
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return 'denied'
    }
  }

  /**
   * Subscribe to push notifications
   */
  public async subscribeToPush(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported')
      return null
    }

    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted')
      return null
    }

    try {
      const registration = await navigator.serviceWorker.ready
      
      // Check if already subscribed
      if (this.subscription) {
        console.log('Already subscribed to push notifications')
        return this.subscription
      }

      // Subscribe to push notifications
      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
      })

      console.log('Subscribed to push notifications:', this.subscription)
      
      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription)
      
      return this.subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  public async unsubscribeFromPush(): Promise<boolean> {
    if (!this.subscription) {
      console.log('Not subscribed to push notifications')
      return true
    }

    try {
      await this.subscription.unsubscribe()
      this.subscription = null
      
      // Notify server about unsubscription
      await this.removeSubscriptionFromServer()
      
      console.log('Unsubscribed from push notifications')
      return true
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
      return false
    }
  }

  /**
   * Show a local notification
   */
  public async showNotification(options: NotificationOptions): Promise<Notification | null> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return null
    }

    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted')
      return null
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/icon-72x72.png',
        image: options.image,
        tag: options.tag,
        data: options.data,
        actions: options.actions,
        requireInteraction: options.requireInteraction,
        silent: options.silent,
        vibrate: options.vibrate || [100, 50, 100],
        sound: options.sound
      })

      // Set up notification event listeners
      this.setupNotificationListeners(notification)

      return notification
    } catch (error) {
      console.error('Failed to show notification:', error)
      return null
    }
  }

  /**
   * Show a quest reminder notification
   */
  public async showQuestReminder(questName: string, worldName: string): Promise<Notification | null> {
    return this.showNotification({
      title: '🎯 Quest Reminder',
      body: `Your pet is ready for a new adventure in ${worldName}!`,
      tag: 'quest-reminder',
      data: { questName, worldName },
      actions: [
        {
          action: 'start-quest',
          title: 'Start Quest',
          icon: '/icons/icon-96x96.png'
        },
        {
          action: 'dismiss',
          title: 'Later',
          icon: '/icons/icon-96x96.png'
        }
      ],
      requireInteraction: true
    })
  }

  /**
   * Show a social interaction notification
   */
  public async showSocialNotification(type: 'friend-online' | 'quest-complete' | 'pet-level-up', data: any): Promise<Notification | null> {
    const notifications = {
      'friend-online': {
        title: '👋 Friend Online',
        body: `${data.friendName} is now online and ready to play!`
      },
      'quest-complete': {
        title: '🏆 Quest Complete!',
        body: `Congratulations! You've completed ${data.questName}`
      },
      'pet-level-up': {
        title: '🌟 Pet Level Up!',
        body: `${data.petName} has reached level ${data.newLevel}!`
      }
    }

    const notification = notifications[type]
    return this.showNotification({
      title: notification.title,
      body: notification.body,
      tag: `social-${type}`,
      data,
      icon: '/icons/icon-192x192.png'
    })
  }

  /**
   * Get current subscription
   */
  public getSubscription(): PushSubscription | null {
    return this.subscription
  }

  /**
   * Get subscription data for server
   */
  public getSubscriptionData(): PushSubscriptionData | null {
    if (!this.subscription) return null

    return {
      endpoint: this.subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(this.subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(this.subscription.getKey('auth')!)
      }
    }
  }

  /**
   * Check if push notifications are supported
   */
  public isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window
  }

  /**
   * Get current permission status
   */
  public getPermissionStatus(): NotificationPermission {
    return this.permission
  }

  /**
   * Add permission change listener
   */
  public addPermissionListener(listener: (permission: NotificationPermission) => void): void {
    this.listeners.push(listener)
  }

  /**
   * Remove permission change listener
   */
  public removePermissionListener(listener: (permission: NotificationPermission) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * Notify listeners of permission changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.permission))
  }

  /**
   * Set up notification event listeners
   */
  private setupNotificationListeners(notification: Notification): void {
    notification.addEventListener('click', (event) => {
      console.log('Notification clicked:', notification)
      // Handle notification click
      this.handleNotificationClick(notification, event)
    })

    notification.addEventListener('close', () => {
      console.log('Notification closed:', notification)
      // Handle notification close
    })

    notification.addEventListener('action', (event) => {
      console.log('Notification action clicked:', event.action)
      // Handle notification action
      this.handleNotificationAction(notification, event.action)
    })
  }

  /**
   * Handle notification click
   */
  private handleNotificationClick(notification: Notification, event: Event): void {
    // Focus the window
    window.focus()
    
    // Handle different notification types
    const tag = notification.tag
    const data = notification.data

    if (tag === 'quest-reminder') {
      // Navigate to quest selection
      window.location.href = '/quests'
    } else if (tag?.startsWith('social-')) {
      // Handle social notifications
      this.handleSocialNotificationClick(tag, data)
    }

    // Close the notification
    notification.close()
  }

  /**
   * Handle notification action
   */
  private handleNotificationAction(notification: Notification, action: string): void {
    const tag = notification.tag
    const data = notification.data

    if (action === 'start-quest' && tag === 'quest-reminder') {
      window.location.href = '/quests'
    } else if (action === 'dismiss') {
      // Just close the notification
    }

    notification.close()
  }

  /**
   * Handle social notification clicks
   */
  private handleSocialNotificationClick(tag: string, data: any): void {
    if (tag === 'social-friend-online') {
      window.location.href = '/social'
    } else if (tag === 'social-quest-complete') {
      window.location.href = '/quests'
    } else if (tag === 'social-pet-level-up') {
      window.location.href = '/pets'
    }
  }

  /**
   * Send subscription to server
   */
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: this.getSubscriptionData(),
          userId: 'current-user-id' // Replace with actual user ID
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send subscription to server')
      }

      console.log('Subscription sent to server successfully')
    } catch (error) {
      console.error('Failed to send subscription to server:', error)
    }
  }

  /**
   * Remove subscription from server
   */
  private async removeSubscriptionFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'current-user-id' // Replace with actual user ID
        })
      })

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server')
      }

      console.log('Subscription removed from server successfully')
    } catch (error) {
      console.error('Failed to remove subscription from server:', error)
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }
}

export const pushNotificationManager = PushNotificationManager.getInstance() 
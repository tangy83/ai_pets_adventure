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
  sound?: string
}

export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

export interface NotificationPermissionStatus {
  permission: 'default' | 'granted' | 'denied'
  granted: boolean
  canRequest: boolean
}

export class PushNotificationManager {
  private static instance: PushNotificationManager
  private permission: 'default' | 'granted' | 'denied' = 'default'
  private listeners: Array<(permission: 'default' | 'granted' | 'denied') => void> = []

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

  /**
   * Reset instance for testing purposes
   */
  public static resetInstance(): void {
    if (PushNotificationManager.instance) {
      PushNotificationManager.instance.permission = 'default'
      PushNotificationManager.instance.listeners = []
      PushNotificationManager.instance = null as any
    }
  }

  private async initialize(): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return
    }

    try {
      // Listen for permission changes
      this.setupPermissionListener()
      
      console.log('Notification manager initialized')
    } catch (error) {
      console.error('Failed to initialize notification manager:', error)
    }
  }

  private setupPermissionListener(): void {
    // Listen for permission changes
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName })
        .then((permissionStatus) => {
          permissionStatus.addEventListener('change', () => {
            this.permission = permissionStatus.state as 'default' | 'granted' | 'denied'
            this.notifyListeners()
          })
        })
        .catch(console.error)
    }
  }

  /**
   * Request notification permission
   */
  public async requestPermission(): Promise<'default' | 'granted' | 'denied'> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return 'denied'
    }

    try {
      const permission = await Notification.requestPermission()
      this.permission = permission
      this.notifyListeners()
      return permission
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return 'denied'
    }
  }

  /**
   * Show a basic notification
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
        badge: options.badge || '/icons/icon-96x96.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction,
        silent: options.silent
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
   * Check if notifications are supported
   */
  public isSupported(): boolean {
    return 'Notification' in window
  }

  /**
   * Get current permission status
   */
  public getPermissionStatus(): NotificationPermissionStatus {
    return {
      permission: this.permission,
      granted: this.permission === 'granted',
      canRequest: this.permission === 'default'
    }
  }

  /**
   * Add permission change listener
   */
  public addPermissionListener(listener: (permission: 'default' | 'granted' | 'denied') => void): void {
    this.listeners.push(listener)
  }

  /**
   * Remove permission change listener
   */
  public removePermissionListener(listener: (permission: 'default' | 'granted' | 'denied') => void): void {
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

    notification.addEventListener('action', (event: any) => {
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
    if (action === 'start-quest') {
      // Navigate to quest selection
      window.location.href = '/quests'
    } else if (action === 'dismiss') {
      // Just close the notification
      notification.close()
    }
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
}

export const pushNotificationManager = PushNotificationManager.getInstance() 

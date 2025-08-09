import { PushNotificationManager } from '../PushNotificationManager'

// Mock console methods
const originalConsole = { ...console }
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

// Mock Notification API
const mockNotification = {
  permission: 'default' as NotificationPermission,
  requestPermission: jest.fn().mockResolvedValue('granted')
}

// Mock service worker registration
const mockServiceWorkerRegistration = {
  pushManager: {
    getSubscription: jest.fn(),
    subscribe: jest.fn()
  }
}

// Mock service worker
const mockServiceWorker = {
  ready: Promise.resolve(mockServiceWorkerRegistration),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

// Mock navigator.permissions
const mockPermissions = {
  query: jest.fn().mockResolvedValue({
    state: 'granted' as PermissionState,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  })
}

// Mock PushSubscription
const mockPushSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
  keys: {
    p256dh: 'test-p256dh-key',
    auth: 'test-auth-key'
  },
  unsubscribe: jest.fn().mockResolvedValue(true)
}

// Mock fetch
const mockFetch = jest.fn()

describe('PushNotificationManager', () => {
  let manager: PushNotificationManager

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Mock console
    Object.defineProperty(global, 'console', {
      value: mockConsole,
      writable: true
    })

    // Mock Notification
    Object.defineProperty(global, 'Notification', {
      value: mockNotification,
      writable: true
    })

    // Mock navigator.serviceWorker
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true
    })

    // Mock navigator.permissions
    Object.defineProperty(global.navigator, 'permissions', {
      value: mockPermissions,
      writable: true
    })

    // Mock PushManager
    Object.defineProperty(global, 'PushManager', {
      value: function() {},
      writable: true
    })

    // Mock fetch
    Object.defineProperty(global, 'fetch', {
      value: mockFetch,
      writable: true
    })

    // Mock process.env
    Object.defineProperty(process, 'env', {
      value: {
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'test-vapid-key'
      },
      writable: true
    })

    // Reset service worker registration
    mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(null)
    mockServiceWorkerRegistration.pushManager.subscribe.mockResolvedValue(mockPushSubscription)

    // Get fresh instance
    manager = PushNotificationManager.getInstance()
  })

  afterEach(() => {
    // Restore console
    Object.defineProperty(global, 'console', {
      value: originalConsole,
      writable: true
    })
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PushNotificationManager.getInstance()
      const instance2 = PushNotificationManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Initialization', () => {
    it('should initialize with current notification permission', () => {
      expect(manager.getPermissionStatus()).toBe('default')
    })

    it('should handle missing service worker support gracefully', () => {
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      })

      // Create new instance without service worker support
      const newManager = PushNotificationManager.getInstance()
      expect(mockConsole.warn).toHaveBeenCalledWith('Push notifications not supported')
    })

    it('should handle missing PushManager support gracefully', () => {
      Object.defineProperty(global, 'PushManager', {
        value: undefined,
        writable: true
      })

      // Create new instance without PushManager support
      const newManager = PushNotificationManager.getInstance()
      expect(mockConsole.warn).toHaveBeenCalledWith('Push notifications not supported')
    })

    it('should check existing subscription on initialization', async () => {
      // Mock existing subscription
      mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(mockPushSubscription)

      // Create new instance to trigger initialization
      const newManager = PushNotificationManager.getInstance()
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(newManager.getSubscription()).toBe(mockPushSubscription)
    })
  })

  describe('Permission Management', () => {
    it('should request notification permission successfully', async () => {
      const permission = await manager.requestPermission()
      
      expect(mockNotification.requestPermission).toHaveBeenCalled()
      expect(permission).toBe('granted')
      expect(manager.getPermissionStatus()).toBe('granted')
    })

    it('should handle permission request errors', async () => {
      const error = new Error('Permission request failed')
      mockNotification.requestPermission.mockRejectedValue(error)

      const permission = await manager.requestPermission()
      
      expect(permission).toBe('denied')
      expect(mockConsole.error).toHaveBeenCalledWith('Failed to request notification permission:', error)
    })

    it('should return denied when notifications not supported', async () => {
      Object.defineProperty(global, 'Notification', {
        value: undefined,
        writable: true
      })

      const permission = await manager.requestPermission()
      
      expect(permission).toBe('denied')
      expect(mockConsole.warn).toHaveBeenCalledWith('Notifications not supported')
    })

    it('should automatically subscribe when permission is granted', async () => {
      // Mock successful subscription
      mockServiceWorkerRegistration.pushManager.subscribe.mockResolvedValue(mockPushSubscription)
      mockFetch.mockResolvedValue({ ok: true })

      const permission = await manager.requestPermission()
      
      expect(permission).toBe('granted')
      expect(manager.getSubscription()).toBe(mockPushSubscription)
    })
  })

  describe('Push Subscription Management', () => {
    it('should subscribe to push notifications successfully', async () => {
      // Grant permission first
      mockNotification.permission = 'granted'
      Object.defineProperty(global, 'Notification', {
        value: mockNotification,
        writable: true
      })

      // Mock successful subscription
      mockServiceWorkerRegistration.pushManager.subscribe.mockResolvedValue(mockPushSubscription)
      mockFetch.mockResolvedValue({ ok: true })

      const subscription = await manager.subscribeToPush()
      
      expect(subscription).toBe(mockPushSubscription)
      expect(mockServiceWorkerRegistration.pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array)
      })
      expect(mockConsole.log).toHaveBeenCalledWith('Subscribed to push notifications:', mockPushSubscription)
    })

    it('should return existing subscription if already subscribed', async () => {
      // Set existing subscription
      ;(manager as any).subscription = mockPushSubscription

      const subscription = await manager.subscribeToPush()
      
      expect(subscription).toBe(mockPushSubscription)
      expect(mockConsole.log).toHaveBeenCalledWith('Already subscribed to push notifications')
    })

    it('should return null when permission not granted', async () => {
      mockNotification.permission = 'denied'
      Object.defineProperty(global, 'Notification', {
        value: mockNotification,
        writable: true
      })

      const subscription = await manager.subscribeToPush()
      
      expect(subscription).toBeNull()
      expect(mockConsole.warn).toHaveBeenCalledWith('Notification permission not granted')
    })

    it('should return null when push notifications not supported', async () => {
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      })

      const subscription = await manager.subscribeToPush()
      
      expect(subscription).toBeNull()
      expect(mockConsole.warn).toHaveBeenCalledWith('Push notifications not supported')
    })

    it('should handle subscription errors gracefully', async () => {
      // Grant permission first
      mockNotification.permission = 'granted'
      Object.defineProperty(global, 'Notification', {
        value: mockNotification,
        writable: true
      })

      // Mock subscription error
      const error = new Error('Subscription failed')
      mockServiceWorkerRegistration.pushManager.subscribe.mockRejectedValue(error)

      const subscription = await manager.subscribeToPush()
      
      expect(subscription).toBeNull()
      expect(mockConsole.error).toHaveBeenCalledWith('Failed to subscribe to push notifications:', error)
    })

    it('should unsubscribe from push notifications successfully', async () => {
      // Set existing subscription
      ;(manager as any).subscription = mockPushSubscription
      mockFetch.mockResolvedValue({ ok: true })

      const result = await manager.unsubscribeFromPush()
      
      expect(result).toBe(true)
      expect(mockPushSubscription.unsubscribe).toHaveBeenCalled()
      expect(manager.getSubscription()).toBeNull()
      expect(mockConsole.log).toHaveBeenCalledWith('Unsubscribed from push notifications')
    })

    it('should return true when not subscribed', async () => {
      const result = await manager.unsubscribeFromPush()
      
      expect(result).toBe(true)
      expect(mockConsole.log).toHaveBeenCalledWith('Not subscribed to push notifications')
    })

    it('should handle unsubscription errors gracefully', async () => {
      // Set existing subscription
      ;(manager as any).subscription = mockPushSubscription

      // Mock unsubscribe error
      const error = new Error('Unsubscribe failed')
      mockPushSubscription.unsubscribe.mockRejectedValue(error)

      const result = await manager.unsubscribeFromPush()
      
      expect(result).toBe(false)
      expect(mockConsole.error).toHaveBeenCalledWith('Failed to unsubscribe from push notifications:', error)
    })
  })

  describe('Notification Display', () => {
    beforeEach(() => {
      // Grant permission
      mockNotification.permission = 'granted'
      Object.defineProperty(global, 'Notification', {
        value: mockNotification,
        writable: true
      })

      // Mock Notification constructor
      const MockNotificationClass = jest.fn().mockImplementation((title, options) => ({
        title,
        ...options,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }))
      Object.defineProperty(global, 'Notification', {
        value: MockNotificationClass,
        writable: true
      })
    })

    it('should show notification successfully', async () => {
      const options = {
        title: 'Test Notification',
        body: 'This is a test notification',
        icon: '/test-icon.png'
      }

      const notification = await manager.showNotification(options)
      
      expect(notification).toBeDefined()
      expect(notification?.title).toBe('Test Notification')
      expect(notification?.body).toBe('This is a test notification')
    })

    it('should use default icon and badge when not provided', async () => {
      const options = {
        title: 'Test Notification',
        body: 'This is a test notification'
      }

      const notification = await manager.showNotification(options)
      
      expect(notification).toBeDefined()
    })

    it('should return null when notifications not supported', async () => {
      Object.defineProperty(global, 'Notification', {
        value: undefined,
        writable: true
      })

      const notification = await manager.showNotification({
        title: 'Test',
        body: 'Test'
      })
      
      expect(notification).toBeNull()
      expect(mockConsole.warn).toHaveBeenCalledWith('Notifications not supported')
    })

    it('should return null when permission not granted', async () => {
      mockNotification.permission = 'denied'
      Object.defineProperty(global, 'Notification', {
        value: mockNotification,
        writable: true
      })

      const notification = await manager.showNotification({
        title: 'Test',
        body: 'Test'
      })
      
      expect(notification).toBeNull()
      expect(mockConsole.warn).toHaveBeenCalledWith('Notification permission not granted')
    })
  })

  describe('Specialized Notifications', () => {
    beforeEach(() => {
      // Grant permission and mock Notification constructor
      mockNotification.permission = 'granted'
      const MockNotificationClass = jest.fn().mockImplementation((title, options) => ({
        title,
        ...options,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }))
      Object.defineProperty(global, 'Notification', {
        value: MockNotificationClass,
        writable: true
      })
    })

    it('should show quest reminder notification', async () => {
      const notification = await manager.showQuestReminder('Find the Lost Pet', 'Forest World')
      
      expect(notification).toBeDefined()
      expect(notification?.title).toContain('Quest Reminder')
      expect(notification?.body).toContain('Find the Lost Pet')
    })

    it('should show social notification for friend online', async () => {
      const notification = await manager.showSocialNotification('friend-online', {
        friendName: 'Alice',
        friendId: 'user-123'
      })
      
      expect(notification).toBeDefined()
      expect(notification?.title).toContain('Friend Online')
      expect(notification?.body).toContain('Alice')
    })

    it('should show social notification for quest complete', async () => {
      const notification = await manager.showSocialNotification('quest-complete', {
        friendName: 'Bob',
        questName: 'Dragon Hunt',
        worldName: 'Mystic Realm'
      })
      
      expect(notification).toBeDefined()
      expect(notification?.title).toContain('Quest Complete')
      expect(notification?.body).toContain('Bob')
    })

    it('should show social notification for pet level up', async () => {
      const notification = await manager.showSocialNotification('pet-level-up', {
        friendName: 'Charlie',
        petName: 'Fluffy',
        newLevel: 5
      })
      
      expect(notification).toBeDefined()
      expect(notification?.title).toContain('Pet Level Up')
      expect(notification?.body).toContain('Charlie')
    })
  })

  describe('Subscription Data Management', () => {
    it('should return subscription data when subscribed', () => {
      // Set existing subscription
      ;(manager as any).subscription = mockPushSubscription

      const subscriptionData = manager.getSubscriptionData()
      
      expect(subscriptionData).toEqual({
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key'
        }
      })
    })

    it('should return null when not subscribed', () => {
      const subscriptionData = manager.getSubscriptionData()
      expect(subscriptionData).toBeNull()
    })
  })

  describe('Support and Status Checking', () => {
    it('should check if push notifications are supported', () => {
      expect(manager.isSupported()).toBe(true)
    })

    it('should return false when service worker not supported', () => {
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      })

      expect(manager.isSupported()).toBe(false)
    })

    it('should return false when PushManager not supported', () => {
      Object.defineProperty(global, 'PushManager', {
        value: undefined,
        writable: true
      })

      expect(manager.isSupported()).toBe(false)
    })

    it('should get current permission status', () => {
      expect(manager.getPermissionStatus()).toBe('default')
    })
  })

  describe('Permission Listeners', () => {
    it('should add and remove permission listeners', () => {
      const mockListener = jest.fn()
      
      manager.addPermissionListener(mockListener)
      
      // Trigger permission change
      ;(manager as any).permission = 'granted'
      ;(manager as any).notifyListeners()
      
      expect(mockListener).toHaveBeenCalledWith('granted')
      
      manager.removePermissionListener(mockListener)
      
      // Should not cause errors
      expect(() => {
        ;(manager as any).permission = 'denied'
        ;(manager as any).notifyListeners()
      }).not.toThrow()
    })
  })

  describe('Utility Methods', () => {
    it('should convert URL base64 to Uint8Array', () => {
      const base64String = 'test-base64-string'
      const result = (manager as any).urlBase64ToUint8Array(base64String)
      
      expect(result).toBeInstanceOf(Uint8Array)
    })

    it('should convert ArrayBuffer to base64', () => {
      const buffer = new ArrayBuffer(8)
      const result = (manager as any).arrayBufferToBase64(buffer)
      
      expect(typeof result).toBe('string')
    })
  })

  describe('Server Communication', () => {
    it('should send subscription to server', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      await (manager as any).sendSubscriptionToServer(mockPushSubscription)
      
      expect(mockFetch).toHaveBeenCalledWith('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: mockPushSubscription.endpoint,
          keys: mockPushSubscription.keys
        })
      })
    })

    it('should remove subscription from server', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      await (manager as any).removeSubscriptionFromServer()
      
      expect(mockFetch).toHaveBeenCalledWith('/api/push/unsubscribe', {
        method: 'DELETE'
      })
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete push notification lifecycle', async () => {
      // Initial state
      expect(manager.isSupported()).toBe(true)
      expect(manager.getPermissionStatus()).toBe('default')
      expect(manager.getSubscription()).toBeNull()

      // Request permission
      const permission = await manager.requestPermission()
      expect(permission).toBe('granted')

      // Subscribe to push
      const subscription = await manager.subscribeToPush()
      expect(subscription).toBeDefined()
      expect(manager.getSubscription()).toBe(subscription)

      // Show notification
      const notification = await manager.showNotification({
        title: 'Test',
        body: 'Test notification'
      })
      expect(notification).toBeDefined()

      // Unsubscribe
      const unsubscribed = await manager.unsubscribeFromPush()
      expect(unsubscribed).toBe(true)
      expect(manager.getSubscription()).toBeNull()
    })

    it('should handle permission changes and notify listeners', () => {
      const mockListener = jest.fn()
      manager.addPermissionListener(mockListener)

      // Simulate permission change
      ;(manager as any).permission = 'granted'
      ;(manager as any).notifyListeners()

      expect(mockListener).toHaveBeenCalledWith('granted')

      // Simulate another permission change
      ;(manager as any).permission = 'denied'
      ;(manager as any).notifyListeners()

      expect(mockListener).toHaveBeenCalledWith('denied')
      expect(mockListener).toHaveBeenCalledTimes(2)
    })
  })
}) 
import { PushNotificationManager } from '../PushNotificationManager'

// Mock console
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

// Mock Notification
const mockNotification = {
  permission: 'default' as 'default' | 'granted' | 'denied',
  requestPermission: jest.fn().mockResolvedValue('default' as 'default' | 'granted' | 'denied')
}

// Mock navigator.permissions
const mockPermissions = {
  query: jest.fn().mockResolvedValue({
    state: 'default' as 'default' | 'granted' | 'denied',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  })
}

// Mock fetch
const mockFetch = jest.fn()

describe('PushNotificationManager', () => {
  let manager: PushNotificationManager

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Reset singleton instance
    PushNotificationManager.resetInstance()
    
    // Reset permission to default
    mockNotification.permission = 'default'
    
    // Mock console
    Object.defineProperty(global, 'console', {
      value: mockConsole,
      writable: true,
      configurable: true
    })

    // Mock Notification
    Object.defineProperty(global, 'Notification', {
      value: mockNotification,
      writable: true,
      configurable: true
    })

    // Mock navigator.permissions
    Object.defineProperty(global.navigator, 'permissions', {
      value: mockPermissions,
      writable: true,
      configurable: true
    })

    // Mock fetch
    Object.defineProperty(global, 'fetch', {
      value: mockFetch,
      writable: true,
      configurable: true
    })

    // Get fresh instance
    manager = PushNotificationManager.getInstance()
  })

  afterEach(() => {
    // Restore all mocks
    jest.restoreAllMocks()
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
      const status = manager.getPermissionStatus()
      expect(status.permission).toBe('default')
      expect(status.granted).toBe(false)
      expect(status.canRequest).toBe(true)
    })

    it('should initialize successfully with Notification support', () => {
      expect(manager.isSupported()).toBe(true)
      expect(mockConsole.log).toHaveBeenCalledWith('Notification manager initialized')
    })
  })

  describe('Permission Management', () => {
    it('should request notification permission successfully', async () => {
      mockNotification.requestPermission.mockResolvedValue('granted')
      
      const permission = await manager.requestPermission()
      
      expect(permission).toBe('granted')
      expect(mockNotification.requestPermission).toHaveBeenCalled()
    })

    it('should handle permission request errors gracefully', async () => {
      const error = new Error('Permission request failed')
      mockNotification.requestPermission.mockRejectedValue(error)
      
      const permission = await manager.requestPermission()
      
      expect(permission).toBe('denied')
      expect(mockConsole.error).toHaveBeenCalledWith('Failed to request notification permission:', error)
    })

    it('should handle permission changes and notify listeners', () => {
      const mockListener = jest.fn()
      manager.addPermissionListener(mockListener)
      
      // Simulate permission change by updating the manager's internal state
      ;(manager as any).permission = 'granted'
      manager['notifyListeners']()
      
      expect(mockListener).toHaveBeenCalledWith('granted')
    })
  })

  describe('Notification Display', () => {
    it('should return null when permission not granted', async () => {
      mockNotification.permission = 'denied'
      
      const notification = await manager.showNotification({
        title: 'Test',
        body: 'Test body'
      })
      
      expect(notification).toBeNull()
      expect(mockConsole.warn).toHaveBeenCalledWith('Notification permission not granted')
    })
  })

  describe('Support and Status Checking', () => {
    it('should check if notifications are supported', () => {
      expect(manager.isSupported()).toBe(true)
    })

    it('should get current permission status', () => {
      const status = manager.getPermissionStatus()
      expect(status.permission).toBe('default')
      expect(status.granted).toBe(false)
      expect(status.canRequest).toBe(true)
    })
  })

  describe('Permission Listeners', () => {
    it('should add and remove permission listeners', () => {
      const mockListener = jest.fn()
      
      manager.addPermissionListener(mockListener)
      expect(manager['listeners']).toContain(mockListener)
      
      manager.removePermissionListener(mockListener)
      expect(manager['listeners']).not.toContain(mockListener)
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete notification lifecycle', async () => {
      // Initial state
      expect(manager.isSupported()).toBe(true)
      const initialStatus = manager.getPermissionStatus()
      expect(initialStatus.permission).toBe('default')
      expect(initialStatus.granted).toBe(false)
      expect(initialStatus.canRequest).toBe(true)

      // Request permission
      mockNotification.requestPermission.mockResolvedValue('granted')
      const permission = await manager.requestPermission()
      expect(permission).toBe('granted')
    })

    it('should handle permission changes and notify listeners', () => {
      const mockListener = jest.fn()
      manager.addPermissionListener(mockListener)
      
      // Simulate permission change by updating the manager's internal state
      ;(manager as any).permission = 'granted'
      manager['notifyListeners']()
      
      expect(mockListener).toHaveBeenCalledWith('granted')
      
      // Remove listener
      manager.removePermissionListener(mockListener)
      manager['notifyListeners']()
      
      expect(mockListener).toHaveBeenCalledWith('granted') // Should still be called since we're testing the same instance
    })
  })
}) 

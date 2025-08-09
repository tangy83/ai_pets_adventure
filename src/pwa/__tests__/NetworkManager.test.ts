import { NetworkManager } from '../NetworkManager'
import { offlineStorage } from '../OfflineStorage'
import { showNotification } from '../serviceWorkerRegistration'

// Mock dependencies
jest.mock('../OfflineStorage')
jest.mock('../serviceWorkerRegistration')

const mockOfflineStorage = offlineStorage as jest.Mocked<typeof offlineStorage>
const mockShowNotification = showNotification as jest.MockedFunction<typeof showNotification>

// Mock console methods
const originalConsole = { ...console }
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

// Mock navigator
const mockNavigator = {
  onLine: true
}

// Mock window
const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

// Mock navigator.connection
const mockConnection = {
  type: 'wifi',
  effectiveType: '4g',
  downlink: 25,
  rtt: 30,
  saveData: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

// Mock timers
const mockSetInterval = jest.fn()
const mockClearInterval = jest.fn()

// Mock fetch
const mockFetch = jest.fn()

describe('NetworkManager', () => {
  let manager: NetworkManager

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Mock console
    Object.defineProperty(global, 'console', {
      value: mockConsole,
      writable: true
    })

    // Mock navigator
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    })

    // Mock window
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true
    })

    // Mock navigator.connection
    Object.defineProperty(global.navigator, 'connection', {
      value: mockConnection,
      writable: true
    })

    // Mock setInterval and clearInterval
    Object.defineProperty(global, 'setInterval', {
      value: mockSetInterval,
      writable: true
    })

    Object.defineProperty(global, 'clearInterval', {
      value: mockClearInterval,
      writable: true
    })

    // Mock fetch
    Object.defineProperty(global, 'fetch', {
      value: mockFetch,
      writable: true
    })

    // Reset navigator.onLine
    mockNavigator.onLine = true

    // Get fresh instance
    manager = NetworkManager.getInstance()
  })

  afterEach(() => {
    // Restore console
    Object.defineProperty(global, 'console', {
      value: originalConsole,
      writable: true
    })

    // Cleanup manager
    manager.cleanup()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NetworkManager.getInstance()
      const instance2 = NetworkManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Initialization', () => {
    it('should initialize with default network status', () => {
      const status = manager.getNetworkStatus()
      
      expect(status.isOnline).toBe(true)
      expect(status.connectionType).toBe('wifi')
      expect(status.effectiveType).toBe('4g')
      expect(status.downlink).toBe(25)
      expect(status.rtt).toBe(30)
      expect(status.saveData).toBe(false)
    })

    it('should set up event listeners', () => {
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
      expect(mockConnection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('should initialize offline storage', () => {
      expect(mockOfflineStorage.initialize).toHaveBeenCalled()
    })

    it('should start periodic sync', () => {
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 30000)
    })

    it('should handle missing connection API gracefully', () => {
      Object.defineProperty(global.navigator, 'connection', {
        value: undefined,
        writable: true
      })

      // Create new instance without connection API
      const newManager = NetworkManager.getInstance()
      
      const status = newManager.getNetworkStatus()
      expect(status.connectionType).toBe('unknown')
      expect(status.effectiveType).toBe('4g')
    })
  })

  describe('Network Status Management', () => {
    it('should get current network status', () => {
      const status = manager.getNetworkStatus()
      
      expect(status).toEqual({
        isOnline: true,
        connectionType: 'wifi',
        effectiveType: '4g',
        downlink: 25,
        rtt: 30,
        saveData: false
      })
    })

    it('should check online status', () => {
      expect(manager.isOnlineStatus()).toBe(true)
      
      // Mock offline status
      mockNavigator.onLine = false
      ;(manager as any).isOnline = false
      
      expect(manager.isOnlineStatus()).toBe(false)
    })

    it('should update network status when connection changes', () => {
      // Mock connection change
      mockConnection.type = '4g'
      mockConnection.effectiveType = '3g'
      mockConnection.downlink = 15
      mockConnection.rtt = 100

      // Trigger network change
      const changeListener = mockConnection.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )?.[1]
      changeListener!()

      const status = manager.getNetworkStatus()
      expect(status.connectionType).toBe('4g')
      expect(status.effectiveType).toBe('3g')
      expect(status.downlink).toBe(15)
      expect(status.rtt).toBe(100)
    })
  })

  describe('Online/Offline Event Handling', () => {
    it('should handle online event', () => {
      // Mock offline status first
      ;(manager as any).isOnline = false
      mockNavigator.onLine = false

      // Trigger online event
      const onlineListener = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'online'
      )?.[1]
      onlineListener!()

      expect(manager.isOnlineStatus()).toBe(true)
      expect(mockShowNotification).toHaveBeenCalledWith('🌐 Back Online!', {
        body: 'Connection restored. Syncing your progress...',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png'
      })
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 30000)
    })

    it('should handle offline event', () => {
      // Mock online status first
      ;(manager as any).isOnline = true
      mockNavigator.onLine = true

      // Trigger offline event
      const offlineListener = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )?.[1]
      offlineListener!()

      expect(manager.isOnlineStatus()).toBe(false)
      expect(mockShowNotification).toHaveBeenCalledWith('📡 You\'re Offline', {
        body: 'Don\'t worry! You can still play and your progress will sync when you\'re back online.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png'
      })
      expect(mockClearInterval).toHaveBeenCalled()
    })
  })

  describe('Network Status Listeners', () => {
    it('should add and remove network status listeners', () => {
      const mockListener = jest.fn()
      
      manager.addNetworkStatusListener(mockListener)
      
      // Trigger network change to notify listeners
      const changeListener = mockConnection.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )?.[1]
      changeListener!()
      
      expect(mockListener).toHaveBeenCalledWith(expect.any(Object))
      
      manager.removeNetworkStatusListener(mockListener)
      
      // Should not cause errors
      expect(() => {
        changeListener!()
      }).not.toThrow()
    })

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error')
      })
      
      manager.addNetworkStatusListener(errorListener)
      
      // Should not throw error
      expect(() => {
        const changeListener = mockConnection.addEventListener.mock.calls.find(
          call => call[0] === 'change'
        )?.[1]
        changeListener!()
      }).not.toThrow()
      
      expect(mockConsole.error).toHaveBeenCalledWith('Error in network status listener:', expect.any(Error))
    })
  })

  describe('Offline Action Management', () => {
    const mockOfflineAction = {
      id: 'action-1',
      type: 'quest_complete',
      data: { questId: 'quest-1', questName: 'Test Quest' },
      timestamp: Date.now(),
      retryCount: 0
    }

    beforeEach(() => {
      // Mock offline storage methods
      mockOfflineStorage.queueOfflineAction.mockResolvedValue()
      mockOfflineStorage.getOfflineActions.mockResolvedValue([mockOfflineAction])
    })

    it('should queue offline action', async () => {
      await manager.queueOfflineAction(mockOfflineAction)
      
      expect(mockOfflineStorage.queueOfflineAction).toHaveBeenCalledWith(mockOfflineAction)
      expect(mockConsole.log).toHaveBeenCalledWith('Offline action queued:', mockOfflineAction)
    })

    it('should get offline actions', async () => {
      const actions = await manager.getOfflineActions()
      
      expect(actions).toEqual([mockOfflineAction])
      expect(mockOfflineStorage.getOfflineActions).toHaveBeenCalled()
    })

    it('should sync offline actions when online', async () => {
      // Mock successful sync
      mockFetch.mockResolvedValue({ ok: true })
      
      const result = await manager.syncOfflineActions()
      
      expect(result.success).toBe(true)
      expect(result.syncedActions).toBeGreaterThan(0)
      expect(result.failedActions).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle sync errors gracefully', async () => {
      // Mock sync error
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      const result = await manager.syncOfflineActions()
      
      expect(result.success).toBe(false)
      expect(result.failedActions).toBeGreaterThan(0)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should not sync when offline', async () => {
      // Mock offline status
      ;(manager as any).isOnline = false
      
      const result = await manager.syncOfflineActions()
      
      expect(result.success).toBe(false)
      expect(result.syncedActions).toBe(0)
      expect(result.failedActions).toBe(0)
    })

    it('should not sync when sync is already in progress', async () => {
      // Mock sync in progress
      ;(manager as any).syncInProgress = true
      
      const result = await manager.syncOfflineActions()
      
      expect(result.success).toBe(false)
      expect(result.syncedActions).toBe(0)
    })
  })

  describe('Action Processing', () => {
    it('should process quest complete action', async () => {
      const action = {
        id: 'action-1',
        type: 'quest_complete',
        data: { questId: 'quest-1', questName: 'Test Quest' },
        timestamp: Date.now(),
        retryCount: 0
      }

      mockFetch.mockResolvedValue({ ok: true })
      
      const result = await (manager as any).processOfflineAction(action)
      
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/quests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data)
      })
    })

    it('should process pet training action', async () => {
      const action = {
        id: 'action-2',
        type: 'pet_training',
        data: { petId: 'pet-1', skill: 'agility', duration: 300000 },
        timestamp: Date.now(),
        retryCount: 0
      }

      mockFetch.mockResolvedValue({ ok: true })
      
      const result = await (manager as any).processOfflineAction(action)
      
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/pets/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data)
      })
    })

    it('should process item collect action', async () => {
      const action = {
        id: 'action-3',
        type: 'item_collect',
        data: { itemId: 'item-1', itemName: 'Magic Crystal', quantity: 5 },
        timestamp: Date.now(),
        retryCount: 0
      }

      mockFetch.mockResolvedValue({ ok: true })
      
      const result = await (manager as any).processOfflineAction(action)
      
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/items/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data)
      })
    })

    it('should process social interaction action', async () => {
      const action = {
        id: 'action-4',
        type: 'social_interaction',
        data: { friendId: 'user-123', interactionType: 'gift', itemId: 'gift-1' },
        timestamp: Date.now(),
        retryCount: 0
      }

      mockFetch.mockResolvedValue({ ok: true })
      
      const result = await (manager as any).processOfflineAction(action)
      
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/social/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data)
      })
    })

    it('should handle unknown action types', async () => {
      const action = {
        id: 'action-5',
        type: 'unknown_action',
        data: {},
        timestamp: Date.now(),
        retryCount: 0
      }

      const result = await (manager as any).processOfflineAction(action)
      
      expect(result).toBe(false)
    })

    it('should handle action processing errors', async () => {
      const action = {
        id: 'action-6',
        type: 'quest_complete',
        data: { questId: 'quest-1' },
        timestamp: Date.now(),
        retryCount: 0
      }

      mockFetch.mockRejectedValue(new Error('API error'))
      
      const result = await (manager as any).processOfflineAction(action)
      
      expect(result).toBe(false)
    })
  })

  describe('Connectivity and Quality', () => {
    it('should check connectivity', async () => {
      mockFetch.mockResolvedValue({ ok: true })
      
      const isConnected = await manager.checkConnectivity()
      
      expect(isConnected).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/health', { method: 'HEAD' })
    })

    it('should return false when connectivity check fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      const isConnected = await manager.checkConnectivity()
      
      expect(isConnected).toBe(false)
    })

    it('should determine connection quality', () => {
      // Test excellent quality
      mockConnection.downlink = 25
      mockConnection.rtt = 30
      
      let quality = manager.getConnectionQuality()
      expect(quality).toBe('excellent')

      // Test good quality
      mockConnection.downlink = 10
      mockConnection.rtt = 100
      
      quality = manager.getConnectionQuality()
      expect(quality).toBe('good')

      // Test poor quality
      mockConnection.downlink = 2
      mockConnection.rtt = 500
      
      quality = manager.getConnectionQuality()
      expect(quality).toBe('poor')

      // Test unknown quality
      Object.defineProperty(global.navigator, 'connection', {
        value: undefined,
        writable: true
      })
      
      quality = manager.getConnectionQuality()
      expect(quality).toBe('unknown')
    })

    it('should determine low bandwidth mode', () => {
      // Test high bandwidth
      mockConnection.downlink = 25
      mockConnection.saveData = false
      
      let shouldUseLowBandwidth = manager.shouldUseLowBandwidthMode()
      expect(shouldUseLowBandwidth).toBe(false)

      // Test low bandwidth
      mockConnection.downlink = 2
      
      shouldUseLowBandwidth = manager.shouldUseLowBandwidthMode()
      expect(shouldUseLowBandwidth).toBe(true)

      // Test save data mode
      mockConnection.downlink = 25
      mockConnection.saveData = true
      
      shouldUseLowBandwidth = manager.shouldUseLowBandwidthMode()
      expect(shouldUseLowBandwidth).toBe(true)
    })
  })

  describe('Periodic Sync', () => {
    it('should start periodic sync when online', () => {
      // Mock online status
      ;(manager as any).isOnline = true
      
      // Trigger periodic sync
      const syncFunction = mockSetInterval.mock.calls[0][0]
      syncFunction()
      
      // Should attempt to sync offline actions
      expect(mockOfflineStorage.getOfflineActions).toHaveBeenCalled()
    })

    it('should not sync when offline', () => {
      // Mock offline status
      ;(manager as any).isOnline = false
      
      // Trigger periodic sync
      const syncFunction = mockSetInterval.mock.calls[0][0]
      syncFunction()
      
      // Should not attempt to sync
      expect(mockOfflineStorage.getOfflineActions).not.toHaveBeenCalled()
    })

    it('should not sync when sync is in progress', () => {
      // Mock sync in progress
      ;(manager as any).syncInProgress = true
      
      // Trigger periodic sync
      const syncFunction = mockSetInterval.mock.calls[0][0]
      syncFunction()
      
      // Should not attempt to sync
      expect(mockOfflineStorage.getOfflineActions).not.toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should clear timers on cleanup', () => {
      manager.cleanup()
      
      expect(mockClearInterval).toHaveBeenCalled()
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete network lifecycle', async () => {
      // Initial state
      expect(manager.isOnlineStatus()).toBe(true)
      expect(manager.getNetworkStatus().isOnline).toBe(true)

      // Queue offline action
      const action = {
        id: 'action-1',
        type: 'quest_complete',
        data: { questId: 'quest-1' },
        timestamp: Date.now(),
        retryCount: 0
      }
      await manager.queueOfflineAction(action)

      // Go offline
      const offlineListener = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )?.[1]
      offlineListener!()

      expect(manager.isOnlineStatus()).toBe(false)
      expect(manager.getNetworkStatus().isOnline).toBe(false)

      // Go back online
      const onlineListener = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'online'
      )?.[1]
      onlineListener!()

      expect(manager.isOnlineStatus()).toBe(true)
      expect(manager.getNetworkStatus().isOnline).toBe(true)

      // Check that sync was attempted
      expect(mockOfflineStorage.getOfflineActions).toHaveBeenCalled()
    })

    it('should handle network quality changes', () => {
      const mockListener = jest.fn()
      manager.addNetworkStatusListener(mockListener)

      // Change network quality
      mockConnection.downlink = 5
      mockConnection.rtt = 200

      const changeListener = mockConnection.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )?.[1]
      changeListener!()

      expect(mockListener).toHaveBeenCalledWith(expect.objectContaining({
        downlink: 5,
        rtt: 200
      }))

      // Check connection quality
      const quality = manager.getConnectionQuality()
      expect(quality).toBe('good')
    })
  })
}) 
import { OfflineAnalyticsManager } from '../OfflineAnalyticsManager'

// Mock console methods
const originalConsole = { ...console }
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

// Mock navigator and screen
const mockNavigator = {
  userAgent: 'test-user-agent',
  onLine: true
}

const mockScreen = {
  width: 1920,
  height: 1080
}

// Mock timers
const mockSetInterval = jest.fn()
const mockClearInterval = jest.fn()

describe('OfflineAnalyticsManager', () => {
  let manager: OfflineAnalyticsManager

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

    // Mock screen
    Object.defineProperty(global, 'screen', {
      value: mockScreen,
      writable: true
    })

    // Mock Intl.DateTimeFormat
    Object.defineProperty(global, 'Intl', {
      value: {
        DateTimeFormat: jest.fn().mockReturnValue({
          resolvedOptions: jest.fn().mockReturnValue({
            timeZone: 'UTC'
          })
        })
      },
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

    // Mock addEventListener and removeEventListener
    const mockAddEventListener = jest.fn()
    const mockRemoveEventListener = jest.fn()
    Object.defineProperty(global, 'addEventListener', {
      value: mockAddEventListener,
      writable: true
    })
    Object.defineProperty(global, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true
    })

    // Get fresh instance
    manager = OfflineAnalyticsManager.getInstance()
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
      const instance1 = OfflineAnalyticsManager.getInstance()
      const instance2 = OfflineAnalyticsManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const config = manager.getConfig()
      expect(config.enabled).toBe(true)
      expect(config.maxEvents).toBe(1000)
      expect(config.maxSessions).toBe(100)
      expect(config.flushInterval).toBe(300000)
      expect(config.enableDebug).toBe(false)
    })

    it('should start a new session on initialization', () => {
      const currentSession = manager.getCurrentSession()
      expect(currentSession).toBeDefined()
      expect(currentSession?.id).toBeDefined()
      expect(currentSession?.startTime).toBeGreaterThan(0)
    })

    it('should set up periodic flush timer', () => {
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 300000)
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        enabled: false,
        maxEvents: 500,
        enableDebug: true
      }

      manager.setConfig(newConfig)
      const updatedConfig = manager.getConfig()

      expect(updatedConfig.enabled).toBe(false)
      expect(updatedConfig.maxEvents).toBe(500)
      expect(updatedConfig.enableDebug).toBe(true)
      expect(updatedConfig.maxSessions).toBe(100) // unchanged
    })

    it('should enable/disable analytics', () => {
      manager.setEnabled(false)
      expect(manager.getConfig().enabled).toBe(false)

      manager.setEnabled(true)
      expect(manager.getConfig().enabled).toBe(true)
    })
  })

  describe('Event Tracking', () => {
    it('should track app launch event', () => {
      const currentSession = manager.getCurrentSession()
      const events = manager.getCurrentSessionEvents()
      
      const launchEvent = events.find(e => e.type === 'app_launch')
      expect(launchEvent).toBeDefined()
      expect(launchEvent?.sessionId).toBe(currentSession?.id)
      expect(launchEvent?.data.userAgent).toBe('test-user-agent')
      expect(launchEvent?.data.screenSize).toBe('1920x1080')
      expect(launchEvent?.data.timezone).toBe('UTC')
    })

    it('should track quest start event', () => {
      manager.trackQuestStart('quest-1', 'Test Quest', 'world-1')
      
      const events = manager.getCurrentSessionEvents()
      const questEvent = events.find(e => e.type === 'quest_start')
      
      expect(questEvent).toBeDefined()
      expect(questEvent?.data.questId).toBe('quest-1')
      expect(questEvent?.data.questName).toBe('Test Quest')
      expect(questEvent?.data.worldId).toBe('world-1')
    })

    it('should track quest complete event', () => {
      manager.trackQuestComplete('quest-1', 'Test Quest', 'world-1', 5000)
      
      const events = manager.getCurrentSessionEvents()
      const questEvent = events.find(e => e.type === 'quest_complete')
      
      expect(questEvent).toBeDefined()
      expect(questEvent?.data.questId).toBe('quest-1')
      expect(questEvent?.data.duration).toBe(5000)
    })

    it('should track asset access event', () => {
      manager.trackAssetAccess('/assets/image.png', 'image', true)
      
      const events = manager.getCurrentSessionEvents()
      const assetEvent = events.find(e => e.type === 'asset_access')
      
      expect(assetEvent).toBeDefined()
      expect(assetEvent?.data.assetPath).toBe('/assets/image.png')
      expect(assetEvent?.data.assetType).toBe('image')
      expect(assetEvent?.data.cached).toBe(true)
    })

    it('should track sync attempt event', () => {
      manager.trackSyncAttempt('background-sync', true)
      
      const events = manager.getCurrentSessionEvents()
      const syncEvent = events.find(e => e.type === 'sync_attempt')
      
      expect(syncEvent).toBeDefined()
      expect(syncEvent?.data.syncType).toBe('background-sync')
      expect(syncEvent?.data.success).toBe(true)
    })

    it('should track error event', () => {
      manager.trackError('network_error', 'Connection failed', { retryCount: 3 })
      
      const events = manager.getCurrentSessionEvents()
      const errorEvent = events.find(e => e.type === 'error')
      
      expect(errorEvent).toBeDefined()
      expect(errorEvent?.data.errorType).toBe('network_error')
      expect(errorEvent?.data.errorMessage).toBe('Connection failed')
      expect(errorEvent?.data.context.retryCount).toBe(3)
    })

    it('should track pet interaction event', () => {
      manager.trackPetInteraction('pet-1', 'feed', 2000)
      
      const events = manager.getCurrentSessionEvents()
      const petEvent = events.find(e => e.type === 'pet_interaction')
      
      expect(petEvent).toBeDefined()
      expect(petEvent?.data.petId).toBe('pet-1')
      expect(petEvent?.data.interactionType).toBe('feed')
      expect(petEvent?.data.duration).toBe(2000)
    })

    it('should not track events when disabled', () => {
      manager.setEnabled(false)
      const initialEventCount = manager.getCurrentSessionEvents().length
      
      manager.trackQuestStart('quest-1', 'Test Quest', 'world-1')
      
      expect(manager.getCurrentSessionEvents()).toHaveLength(initialEventCount)
    })

    it('should limit events array size', () => {
      manager.setConfig({ maxEvents: 3 })
      
      // Add more events than the limit
      manager.trackQuestStart('quest-1', 'Test Quest 1', 'world-1')
      manager.trackQuestStart('quest-2', 'Test Quest 2', 'world-1')
      manager.trackQuestStart('quest-3', 'Test Quest 3', 'world-1')
      manager.trackQuestStart('quest-4', 'Test Quest 4', 'world-1')
      
      const events = manager.getCurrentSessionEvents()
      expect(events.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Session Management', () => {
    it('should track offline actions in session', () => {
      const initialOfflineActions = manager.getCurrentSession()?.offlineActions || 0
      
      manager.trackQuestStart('quest-1', 'Test Quest', 'world-1')
      
      const updatedSession = manager.getCurrentSession()
      expect(updatedSession?.offlineActions).toBe(initialOfflineActions + 1)
    })

    it('should track quests in session', () => {
      manager.trackQuestStart('quest-1', 'Test Quest 1', 'world-1')
      manager.trackQuestStart('quest-2', 'Test Quest 2', 'world-1')
      
      const session = manager.getCurrentSession()
      expect(session?.questsStarted).toContain('quest-1')
      expect(session?.questsStarted).toContain('quest-2')
      expect(session?.questsStarted).toHaveLength(2)
    })

    it('should track completed quests in session', () => {
      manager.trackQuestComplete('quest-1', 'Test Quest 1', 'world-1', 5000)
      manager.trackQuestComplete('quest-2', 'Test Quest 2', 'world-1', 3000)
      
      const session = manager.getCurrentSession()
      expect(session?.questsCompleted).toContain('quest-1')
      expect(session?.questsCompleted).toContain('quest-2')
      expect(session?.questsCompleted).toHaveLength(2)
    })

    it('should track assets accessed in session', () => {
      manager.trackAssetAccess('/assets/image1.png', 'image', true)
      manager.trackAssetAccess('/assets/audio1.mp3', 'audio', false)
      
      const session = manager.getCurrentSession()
      expect(session?.assetsAccessed).toContain('/assets/image1.png')
      expect(session?.assetsAccessed).toContain('/assets/audio1.mp3')
      expect(session?.assetsAccessed).toHaveLength(2)
    })

    it('should track errors in session', () => {
      const initialErrors = manager.getCurrentSession()?.errors || 0
      
      manager.trackError('network_error', 'Connection failed')
      manager.trackError('validation_error', 'Invalid input')
      
      const session = manager.getCurrentSession()
      expect(session?.errors).toBe(initialErrors + 2)
    })

    it('should not duplicate quest IDs in session', () => {
      manager.trackQuestStart('quest-1', 'Test Quest', 'world-1')
      manager.trackQuestStart('quest-1', 'Test Quest', 'world-1') // Duplicate
      
      const session = manager.getCurrentSession()
      expect(session?.questsStarted).toHaveLength(1)
      expect(session?.questsStarted).toContain('quest-1')
    })
  })

  describe('Metrics Calculation', () => {
    beforeEach(() => {
      // Create some test data
      manager.trackQuestStart('quest-1', 'Test Quest 1', 'world-1')
      manager.trackQuestComplete('quest-1', 'Test Quest 1', 'world-1', 5000)
      manager.trackAssetAccess('/assets/image1.png', 'image', true)
      manager.trackAssetAccess('/assets/image2.png', 'image', false)
      manager.trackError('network_error', 'Connection failed')
    })

    it('should calculate offline metrics', () => {
      const metrics = manager.getOfflineMetrics()
      
      expect(metrics.totalOfflineTime).toBeGreaterThanOrEqual(0)
      expect(metrics.averageSessionDuration).toBeGreaterThanOrEqual(0)
      expect(metrics.mostAccessedAssets).toBeDefined()
      expect(metrics.commonOfflineActions).toBeDefined()
      expect(metrics.errorFrequency).toBeDefined()
      expect(metrics.offlineEfficiency).toBeGreaterThanOrEqual(0)
    })

    it('should calculate most accessed assets', () => {
      const metrics = manager.getOfflineMetrics()
      const imageAssets = metrics.mostAccessedAssets.filter(a => a.asset.includes('image'))
      
      expect(imageAssets).toHaveLength(2)
      expect(imageAssets[0].asset).toBe('/assets/image1.png')
      expect(imageAssets[1].asset).toBe('/assets/image2.png')
    })

    it('should calculate error frequency', () => {
      const metrics = manager.getOfflineMetrics()
      const networkErrors = metrics.errorFrequency.filter(e => e.error.includes('network'))
      
      expect(networkErrors).toHaveLength(1)
      expect(networkErrors[0].error).toBe('network_error')
      expect(networkErrors[0].count).toBe(1)
    })
  })

  describe('Data Management', () => {
    it('should export data as JSON string', () => {
      const exportedData = manager.exportData()
      
      expect(typeof exportedData).toBe('string')
      
      const parsedData = JSON.parse(exportedData)
      expect(parsedData).toHaveProperty('events')
      expect(parsedData).toHaveProperty('sessions')
      expect(parsedData).toHaveProperty('config')
    })

    it('should import data from JSON string', () => {
      const originalData = manager.exportData()
      
      // Clear current data
      manager.setConfig({ maxEvents: 0, maxSessions: 0 })
      
      const importResult = manager.importData(originalData)
      expect(importResult).toBe(true)
      
      // Verify data was imported
      const currentData = manager.exportData()
      expect(currentData).toBe(originalData)
    })

    it('should handle invalid import data', () => {
      const invalidData = 'invalid-json'
      
      const importResult = manager.importData(invalidData)
      expect(importResult).toBe(false)
    })

    it('should clear old data', () => {
      const oldTimestamp = Date.now() - (10 * 24 * 60 * 60 * 1000) // 10 days ago
      
      // Mock old events
      const oldEvent = {
        id: 'old-event',
        type: 'quest_start' as const,
        timestamp: oldTimestamp,
        data: {},
        sessionId: 'old-session',
        offline: false
      }
      
      // Add old event to events array (accessing private property for testing)
      ;(manager as any).events.push(oldEvent)
      
      const initialEventCount = manager.getCurrentSessionEvents().length
      
      manager.clearOldData(7 * 24 * 60 * 60 * 1000) // 7 days
      
      const finalEventCount = manager.getCurrentSessionEvents().length
      expect(finalEventCount).toBeLessThan(initialEventCount)
    })
  })

  describe('Network Status Handling', () => {
    it('should track offline status in events', () => {
      // Mock offline status
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        writable: true
      })
      
      manager.trackQuestStart('quest-1', 'Test Quest', 'world-1')
      
      const events = manager.getCurrentSessionEvents()
      const questEvent = events.find(e => e.type === 'quest_start')
      expect(questEvent?.offline).toBe(true)
    })
  })

  describe('Cleanup', () => {
    it('should clear timers on cleanup', () => {
      manager.cleanup()
      
      expect(mockClearInterval).toHaveBeenCalled()
    })
  })

  describe('Debug Mode', () => {
    it('should log debug messages when enabled', () => {
      manager.setConfig({ enableDebug: true })
      
      // Reinitialize to trigger debug logging
      manager = OfflineAnalyticsManager.getInstance()
      
      expect(mockConsole.log).toHaveBeenCalledWith('Offline Analytics Manager initialized')
    })

    it('should log event tracking when debug is enabled', () => {
      manager.setConfig({ enableDebug: true })
      
      manager.trackQuestStart('quest-1', 'Test Quest', 'world-1')
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        'Offline event tracked:',
        expect.objectContaining({
          type: 'quest_start',
          data: expect.objectContaining({
            questId: 'quest-1'
          })
        })
      )
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete user journey', () => {
      // User launches app
      const session = manager.getCurrentSession()
      expect(session).toBeDefined()
      
      // User starts quest
      manager.trackQuestStart('quest-1', 'Find the Lost Pet', 'forest-world')
      
      // User accesses assets
      manager.trackAssetAccess('/assets/forest.png', 'image', true)
      manager.trackAssetAccess('/assets/ambient.mp3', 'audio', false)
      
      // User completes quest
      manager.trackQuestComplete('quest-1', 'Find the Lost Pet', 'forest-world', 120000)
      
      // User interacts with pet
      manager.trackPetInteraction('pet-1', 'feed', 5000)
      
      // Check final state
      const finalSession = manager.getCurrentSession()
      expect(finalSession?.questsStarted).toContain('quest-1')
      expect(finalSession?.questsCompleted).toContain('quest-1')
      expect(finalSession?.assetsAccessed).toHaveLength(2)
      expect(finalSession?.offlineActions).toBeGreaterThan(0)
      
      const events = manager.getCurrentSessionEvents()
      expect(events.length).toBeGreaterThan(1)
      
      const metrics = manager.getOfflineMetrics()
      expect(metrics.totalOfflineTime).toBeGreaterThanOrEqual(0)
    })
  })
}) 
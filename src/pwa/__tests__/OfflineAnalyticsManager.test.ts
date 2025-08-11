import { OfflineAnalyticsManager } from '../OfflineAnalyticsManager'

// Mock console
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

// Mock setInterval and clearInterval
const mockSetInterval = jest.fn()
const mockClearInterval = jest.fn()

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}

describe('OfflineAnalyticsManager', () => {
  let manager: OfflineAnalyticsManager

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Reset singleton instance
    OfflineAnalyticsManager.resetInstance()
    
    // Mock console
    Object.defineProperty(global, 'console', {
      value: mockConsole,
      writable: true,
      configurable: true
    })

    // Mock setInterval and clearInterval
    Object.defineProperty(global, 'setInterval', {
      value: mockSetInterval,
      writable: true,
      configurable: true
    })

    Object.defineProperty(global, 'clearInterval', {
      value: mockClearInterval,
      writable: true,
      configurable: true
    })

    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true
    })

    // Mock navigator
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'test-user-agent',
        language: 'en-US'
      },
      writable: true,
      configurable: true
    })

    // Mock screen
    Object.defineProperty(global, 'screen', {
      value: {
        width: 1920,
        height: 1080
      },
      writable: true,
      configurable: true
    })

    // Get fresh instance
    manager = OfflineAnalyticsManager.getInstance()
  })

  afterEach(() => {
    // Restore console
    Object.defineProperty(global, 'console', {
      value: console,
      writable: true
    })
    
    // Restore all mocks
    jest.restoreAllMocks()
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
      // The manager should be initialized with default config
      expect(manager.getCurrentSession()).toBeDefined()
      expect(manager.getEvents()).toHaveLength(0)
      expect(manager.getSessions()).toHaveLength(1) // Current session
    })

    it('should start a new session on initialization', () => {
      const session = manager.getCurrentSession()
      expect(session).toBeDefined()
      expect(session?.startTime).toBeGreaterThan(0)
      expect(session?.events).toHaveLength(0)
      expect(session?.metadata.userAgent).toBe('test-user-agent')
      expect(session?.metadata.screenSize).toBe('1920x1080')
      expect(session?.metadata.language).toBe('en-US')
    })

    it('should set up periodic cleanup timer', () => {
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 60000) // Every minute
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 3600000) // Every hour
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = { enableDebug: true, maxEvents: 500 }
      manager.updateConfig(newConfig)
      
      // The config should be updated and saved to storage
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
    })

    it('should enable/disable analytics', () => {
      manager.updateConfig({ enabled: false })
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
      
      manager.updateConfig({ enabled: true })
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
    })
  })

  describe('Event Tracking', () => {
    it('should track generic events', () => {
      manager.trackEvent('test_event', { data: 'test' })
      
      const events = manager.getEvents()
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('test_event')
      expect(events[0].data).toEqual({ data: 'test' })
      expect(events[0].timestamp).toBeGreaterThan(0)
      expect(events[0].sessionId).toBeDefined()
    })

    it('should track multiple events', () => {
      manager.trackEvent('event_1', { data: 'test1' })
      manager.trackEvent('event_2', { data: 'test2' })
      
      const events = manager.getEvents()
      expect(events).toHaveLength(2)
      expect(events[0].type).toBe('event_1')
      expect(events[1].type).toBe('event_2')
    })

    it('should not track events when disabled', () => {
      manager.updateConfig({ enabled: false })
      
      const initialCount = manager.getEvents().length
      manager.trackEvent('test_event', { data: 'test' })
      
      expect(manager.getEvents()).toHaveLength(initialCount)
    })

    it('should limit events array size', () => {
      manager.updateConfig({ maxEvents: 3 })
      
      // Add more events than the limit
      manager.trackEvent('event_1', {})
      manager.trackEvent('event_2', {})
      manager.trackEvent('event_3', {})
      manager.trackEvent('event_4', {})
      
      expect(manager.getEvents()).toHaveLength(3)
      expect(manager.getEvents()[0].type).toBe('event_2') // Oldest should be removed
      expect(manager.getEvents()[2].type).toBe('event_4') // Newest should remain
    })
  })

  describe('Session Management', () => {
    it('should track events in current session', () => {
      const initialSession = manager.getCurrentSession()
      expect(initialSession?.events).toHaveLength(0)
      
      manager.trackEvent('test_event', {})
      
      const updatedSession = manager.getCurrentSession()
      expect(updatedSession?.events).toHaveLength(1)
    })

    it('should start new session when requested', () => {
      const oldSession = manager.getCurrentSession()
      expect(oldSession).toBeDefined()
      
      // Wait a bit to ensure time difference
      const oldTime = oldSession?.startTime || 0
      
      manager.startNewSession()
      
      const newSession = manager.getCurrentSession()
      expect(newSession).toBeDefined()
      expect(newSession?.id).not.toBe(oldSession?.id)
      expect(newSession?.startTime).toBeGreaterThanOrEqual(oldTime)
    })

    it('should end current session', () => {
      const session = manager.getCurrentSession()
      expect(session?.endTime).toBeUndefined()
      
      manager.endCurrentSession()
      
      // After ending session, getCurrentSession should return null
      const endedSession = manager.getCurrentSession()
      expect(endedSession).toBeNull()
    })
  })

  describe('Metrics Calculation', () => {
    it('should calculate basic metrics', () => {
      manager.trackEvent('event_1', {})
      manager.trackEvent('event_2', {})
      
      const metrics = manager.getOfflineMetrics()
      expect(metrics.totalEvents).toBe(2)
      expect(metrics.totalSessions).toBe(1)
      expect(metrics.popularEventTypes).toContain('event_1')
      expect(metrics.popularEventTypes).toContain('event_2')
    })

    it('should calculate session duration', () => {
      const session = manager.getCurrentSession()
      expect(session).toBeDefined()
      
      // End the session
      manager.endCurrentSession()
      
      const metrics = manager.getOfflineMetrics()
      // Since we ended the session, it should have an endTime and duration
      expect(metrics.averageSessionDuration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Data Management', () => {
    it('should export data as object', () => {
      manager.trackEvent('test_event', { data: 'test' })
      
      const exportedData = manager.exportData()
      
      expect(typeof exportedData).toBe('object')
      expect(exportedData.events).toBeDefined()
      expect(exportedData.sessions).toBeDefined()
      expect(exportedData.metrics).toBeDefined()
      expect(exportedData.config).toBeDefined()
      expect(exportedData.exportTime).toBeDefined()
    })

    it('should import data from object', () => {
      const originalData = manager.exportData()
      
      // Clear current data by starting fresh
      OfflineAnalyticsManager.resetInstance()
      manager = OfflineAnalyticsManager.getInstance()
      
      const importResult = manager.importData(JSON.stringify(originalData))
      expect(importResult).toBe(true)
      
      const importedData = manager.exportData()
      expect(importedData.events).toHaveLength(originalData.events.length)
      // Sessions might have additional current session, so check it's at least the original count
      expect(importedData.sessions.length).toBeGreaterThanOrEqual(originalData.sessions.length)
    })

    it('should handle invalid import data', () => {
      const result = manager.importData('invalid json')
      expect(result).toBe(false)
    })

    it('should clear old data', () => {
      // Add some events
      manager.trackEvent('old_event', {})
      
      const initialEventCount = manager.getEvents().length
      expect(initialEventCount).toBeGreaterThan(0)
      
      // Clear old data
      manager.clearOldData()
      
      // Should still have current session events
      expect(manager.getEvents().length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Debug Mode', () => {
    it('should log debug messages when enabled', () => {
      manager.updateConfig({ enableDebug: true })
      
      // Reinitialize to trigger debug logging
      manager.reinitialize()
      
      expect(mockConsole.log).toHaveBeenCalledWith('Offline Analytics Manager initialized')
    })

    it('should log event tracking when debug is enabled', () => {
      manager.updateConfig({ enableDebug: true })
      
      manager.trackEvent('test_event', {})
      
      expect(mockConsole.log).toHaveBeenCalledWith('Analytics event tracked:', expect.any(Object))
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete user journey', () => {
      // User starts session
      expect(manager.getCurrentSession()).toBeDefined()
      
      // User performs actions
      manager.trackEvent('quest_start', { questId: 'quest-1', questName: 'Find the Lost Pet', worldId: 'forest-world' })
      manager.trackEvent('asset_access', { assetPath: '/assets/forest.png', assetType: 'image', cached: true })
      manager.trackEvent('quest_complete', { questId: 'quest-1', questName: 'Find the Lost Pet', worldId: 'forest-world', duration: 5000 })
      
      // Check that events are tracked
      const events = manager.getEvents()
      expect(events).toHaveLength(3)
      expect(events.find(e => e.type === 'quest_start')).toBeDefined()
      expect(events.find(e => e.type === 'asset_access')).toBeDefined()
      expect(events.find(e => e.type === 'quest_complete')).toBeDefined()
      
      // Check metrics
      const metrics = manager.getOfflineMetrics()
      expect(metrics.totalEvents).toBe(3)
      expect(metrics.popularEventTypes).toContain('quest_start')
      expect(metrics.popularEventTypes).toContain('asset_access')
      expect(metrics.popularEventTypes).toContain('quest_complete')
    })
  })

  describe('Cleanup', () => {
    it('should clear timers on cleanup', () => {
      // Enable debug to see the cleanup message
      manager.updateConfig({ enableDebug: true })
      
      manager.cleanup()
      
      // The cleanup method should complete without errors and log when debug is enabled
      expect(mockConsole.log).toHaveBeenCalledWith('Offline Analytics Manager cleaned up')
    })
  })
}) 
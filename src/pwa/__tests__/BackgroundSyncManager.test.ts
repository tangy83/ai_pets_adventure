import { BackgroundSyncManager, backgroundSyncManager } from '../BackgroundSyncManager'

// Mock navigator.serviceWorker
const mockServiceWorker = {
  ready: Promise.resolve({
    sync: {
      register: jest.fn()
    }
  })
}

// Mock console methods
const originalConsole = { ...console }
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

describe('BackgroundSyncManager', () => {
  let manager: BackgroundSyncManager

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Mock console
    Object.defineProperty(global, 'console', {
      value: mockConsole,
      writable: true
    })

    // Mock navigator.serviceWorker
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true
    })

    // Mock ServiceWorkerRegistration.prototype.sync
    Object.defineProperty(window, 'ServiceWorkerRegistration', {
      value: {
        prototype: {
          sync: {}
        }
      },
      writable: true
    })

    // Get fresh instance
    manager = BackgroundSyncManager.getInstance()
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
      const instance1 = BackgroundSyncManager.getInstance()
      const instance2 = BackgroundSyncManager.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should export singleton instance', () => {
      expect(backgroundSyncManager).toBe(BackgroundSyncManager.getInstance())
    })
  })

  describe('isSupported', () => {
    it('should return true when background sync is supported', () => {
      expect(manager.isSupported()).toBe(true)
    })

    it('should return false when serviceWorker is not available', () => {
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      })
      expect(manager.isSupported()).toBe(false)
    })

    it('should return false when sync is not available', () => {
      Object.defineProperty(window, 'ServiceWorkerRegistration', {
        value: {
          prototype: {}
        },
        writable: true
      })
      expect(manager.isSupported()).toBe(false)
    })
  })

  describe('registerBackgroundSync', () => {
    const mockCallback = jest.fn().mockResolvedValue(undefined)
    const mockSyncRegister = jest.fn().mockResolvedValue(undefined)

    beforeEach(() => {
      mockServiceWorker.ready = Promise.resolve({
        sync: {
          register: mockSyncRegister
        }
      })
    })

    it('should successfully register a background sync', async () => {
      const result = await manager.registerBackgroundSync('test-sync', mockCallback)
      
      expect(result).toBe(true)
      expect(mockSyncRegister).toHaveBeenCalledWith('test-sync')
      expect(manager.isRegistered('test-sync')).toBe(true)
      expect(manager.getSyncCallback('test-sync')).toBe(mockCallback)
      expect(mockConsole.log).toHaveBeenCalledWith('Background sync registered for tag: test-sync')
    })

    it('should register with custom options', async () => {
      const options = { tag: 'custom-sync', minDelay: 1000, maxDelay: 5000 }
      const result = await manager.registerBackgroundSync('custom-sync', mockCallback, options)
      
      expect(result).toBe(true)
      expect(mockSyncRegister).toHaveBeenCalledWith('custom-sync')
    })

    it('should return false when background sync is not supported', async () => {
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      })

      const result = await manager.registerBackgroundSync('test-sync', mockCallback)
      
      expect(result).toBe(false)
      expect(mockConsole.warn).toHaveBeenCalledWith('Background Sync not supported')
    })

    it('should handle registration errors gracefully', async () => {
      const error = new Error('Registration failed')
      mockSyncRegister.mockRejectedValue(error)

      const result = await manager.registerBackgroundSync('test-sync', mockCallback)
      
      expect(result).toBe(false)
      expect(mockConsole.error).toHaveBeenCalledWith('Failed to register background sync for tag test-sync:', error)
    })

    it('should handle service worker ready rejection', async () => {
      mockServiceWorker.ready = Promise.reject(new Error('Service worker not ready'))

      const result = await manager.registerBackgroundSync('test-sync', mockCallback)
      
      expect(result).toBe(false)
      expect(mockConsole.error).toHaveBeenCalled()
    })
  })

  describe('unregisterBackgroundSync', () => {
    const mockCallback = jest.fn().mockResolvedValue(undefined)

    beforeEach(async () => {
      // Register a sync first
      await manager.registerBackgroundSync('test-sync', mockCallback)
    })

    it('should successfully unregister a background sync', async () => {
      const result = await manager.unregisterBackgroundSync('test-sync')
      
      expect(result).toBe(true)
      expect(manager.isRegistered('test-sync')).toBe(false)
      expect(manager.getSyncCallback('test-sync')).toBeUndefined()
      expect(mockConsole.log).toHaveBeenCalledWith('Background sync unregistered for tag: test-sync')
    })

    it('should handle unregistration errors gracefully', async () => {
      mockServiceWorker.ready = Promise.reject(new Error('Service worker not ready'))

      const result = await manager.unregisterBackgroundSync('test-sync')
      
      expect(result).toBe(false)
      expect(mockConsole.error).toHaveBeenCalledWith('Failed to unregister background sync for tag test-sync:', expect.any(Error))
    })

    it('should return true even if sync was not registered', async () => {
      const result = await manager.unregisterBackgroundSync('non-existent-sync')
      expect(result).toBe(true)
    })
  })

  describe('getRegistrations', () => {
    it('should return empty array when no syncs are registered', () => {
      expect(manager.getRegistrations()).toEqual([])
    })

    it('should return all registered syncs', async () => {
      const mockCallback1 = jest.fn().mockResolvedValue(undefined)
      const mockCallback2 = jest.fn().mockResolvedValue(undefined)

      await manager.registerBackgroundSync('sync-1', mockCallback1)
      await manager.registerBackgroundSync('sync-2', mockCallback2)

      const registrations = manager.getRegistrations()
      
      expect(registrations).toHaveLength(2)
      expect(registrations.find(r => r.tag === 'sync-1')).toBeDefined()
      expect(registrations.find(r => r.tag === 'sync-2')).toBeDefined()
    })
  })

  describe('isRegistered', () => {
    it('should return false for non-existent sync', () => {
      expect(manager.isRegistered('non-existent')).toBe(false)
    })

    it('should return true for registered sync', async () => {
      const mockCallback = jest.fn().mockResolvedValue(undefined)
      await manager.registerBackgroundSync('test-sync', mockCallback)
      
      expect(manager.isRegistered('test-sync')).toBe(true)
    })
  })

  describe('getSyncCallback', () => {
    it('should return undefined for non-existent sync', () => {
      expect(manager.getSyncCallback('non-existent')).toBeUndefined()
    })

    it('should return callback for registered sync', async () => {
      const mockCallback = jest.fn().mockResolvedValue(undefined)
      await manager.registerBackgroundSync('test-sync', mockCallback)
      
      expect(manager.getSyncCallback('test-sync')).toBe(mockCallback)
    })
  })

  describe('updateLastSync', () => {
    it('should update last sync time for registered sync', async () => {
      const mockCallback = jest.fn().mockResolvedValue(undefined)
      await manager.registerBackgroundSync('test-sync', mockCallback)
      
      const beforeUpdate = manager.getRegistrations().find(r => r.tag === 'test-sync')?.lastSync
      
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10))
      
      manager.updateLastSync('test-sync')
      
      const afterUpdate = manager.getRegistrations().find(r => r.tag === 'test-sync')?.lastSync
      
      expect(afterUpdate).toBeDefined()
      expect(afterUpdate!.getTime()).toBeGreaterThan(beforeUpdate!.getTime())
    })

    it('should do nothing for non-existent sync', () => {
      expect(() => manager.updateLastSync('non-existent')).not.toThrow()
    })
  })

  describe('getSyncStatus', () => {
    it('should return not_supported when background sync is not supported', () => {
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      })

      expect(manager.getSyncStatus('any-tag')).toBe('not_supported')
    })

    it('should return not_supported for non-existent sync', () => {
      expect(manager.getSyncStatus('non-existent')).toBe('not_supported')
    })

    it('should return registered for registered sync', async () => {
      const mockCallback = jest.fn().mockResolvedValue(undefined)
      await manager.registerBackgroundSync('test-sync', mockCallback)
      
      expect(manager.getSyncStatus('test-sync')).toBe('registered')
    })
  })

  describe('Integration Tests', () => {
    it('should handle multiple sync registrations and unregistrations', async () => {
      const mockCallback1 = jest.fn().mockResolvedValue(undefined)
      const mockCallback2 = jest.fn().mockResolvedValue(undefined)
      const mockCallback3 = jest.fn().mockResolvedValue(undefined)

      // Register multiple syncs
      await manager.registerBackgroundSync('sync-1', mockCallback1)
      await manager.registerBackgroundSync('sync-2', mockCallback2)
      await manager.registerBackgroundSync('sync-3', mockCallback3)

      expect(manager.getRegistrations()).toHaveLength(3)
      expect(manager.isRegistered('sync-1')).toBe(true)
      expect(manager.isRegistered('sync-2')).toBe(true)
      expect(manager.isRegistered('sync-3')).toBe(true)

      // Unregister one sync
      await manager.unregisterBackgroundSync('sync-2')

      expect(manager.getRegistrations()).toHaveLength(2)
      expect(manager.isRegistered('sync-1')).toBe(true)
      expect(manager.isRegistered('sync-2')).toBe(false)
      expect(manager.isRegistered('sync-3')).toBe(true)

      // Update last sync for remaining syncs
      manager.updateLastSync('sync-1')
      manager.updateLastSync('sync-3')

      const registrations = manager.getRegistrations()
      expect(registrations.find(r => r.tag === 'sync-1')?.lastSync).toBeDefined()
      expect(registrations.find(r => r.tag === 'sync-3')?.lastSync).toBeDefined()
    })

    it('should maintain state across multiple getInstance calls', async () => {
      const instance1 = BackgroundSyncManager.getInstance()
      const instance2 = BackgroundSyncManager.getInstance()

      const mockCallback = jest.fn().mockResolvedValue(undefined)
      await instance1.registerBackgroundSync('shared-sync', mockCallback)

      expect(instance2.isRegistered('shared-sync')).toBe(true)
      expect(instance2.getSyncCallback('shared-sync')).toBe(mockCallback)
    })
  })
}) 
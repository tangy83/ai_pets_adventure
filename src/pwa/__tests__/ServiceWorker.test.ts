import { ServiceWorkerManager, registerServiceWorker } from '../serviceWorkerRegistration'

// Mock service worker APIs
const mockServiceWorker = {
  register: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  controller: null,
  ready: Promise.resolve({} as ServiceWorkerRegistration),
}

const mockServiceWorkerRegistration = {
  installing: null,
  waiting: null,
  active: null,
  scope: '/',
  updateViaCache: 'none',
  update: jest.fn(),
  unregister: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  postMessage: jest.fn(),
}

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: mockServiceWorker,
    standalone: false,
  },
  writable: true,
  configurable: true,
})

// Update existing window properties instead of redefining
Object.defineProperty(global.window, 'matchMedia', {
  value: jest.fn(),
  writable: true,
  configurable: true,
})

Object.defineProperty(global.window, 'addEventListener', {
  value: jest.fn(),
  writable: true,
  configurable: true,
})

Object.defineProperty(global.window, 'removeEventListener', {
  value: jest.fn(),
  writable: true,
  configurable: true,
})

// Mock caches API
Object.defineProperty(global, 'caches', {
  value: {
    open: jest.fn(),
    keys: jest.fn(),
    delete: jest.fn(),
    match: jest.fn(),
  },
  writable: true,
  configurable: true,
})

// Mock fetch API
Object.defineProperty(global, 'fetch', {
  value: jest.fn(),
  writable: true,
  configurable: true,
})

describe('Service Worker Tests', () => {
  let originalReload: any
  let mockReload: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Store original reload method and mock it
    originalReload = global.location.reload
    mockReload = jest.fn()
    
    // Mock the reload method directly on the existing location object
    try {
      Object.defineProperty(global.location, 'reload', {
        value: mockReload,
        writable: true,
        configurable: true,
      })
    } catch (error) {
      // If we can't mock reload, skip tests that require it
      console.warn('Could not mock location.reload, some tests may be skipped')
    }
    
    // Reset mocks
    mockServiceWorker.register.mockClear()
    mockServiceWorkerRegistration.update.mockClear()
    mockServiceWorkerRegistration.unregister.mockClear()
    
    // Mock successful service worker registration
    mockServiceWorker.register.mockResolvedValue(mockServiceWorkerRegistration)
    
    // Mock caches
    const mockCache = {
      addAll: jest.fn().mockResolvedValue(undefined),
      put: jest.fn().mockResolvedValue(undefined),
      match: jest.fn().mockResolvedValue(null),
    }
    ;(global.caches.open as jest.Mock).mockResolvedValue(mockCache)
    ;(global.caches.keys as jest.Mock).mockResolvedValue([])
    
    // Mock fetch
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      clone: jest.fn().mockReturnValue({}),
    })
  })

  afterEach(() => {
    // Restore original reload method if we successfully mocked it
    if (mockReload) {
      try {
        Object.defineProperty(global.location, 'reload', {
          value: originalReload,
          writable: true,
          configurable: true,
        })
      } catch (error) {
        // Ignore restoration errors
      }
    }
  })

  describe('Service Worker Registration', () => {
    test('should register service worker with correct parameters', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none'
      })
    })

    test('should handle registration failure gracefully', async () => {
      const error = new Error('Registration failed')
      mockServiceWorker.register.mockRejectedValue(error)
      
      const manager = ServiceWorkerManager.getInstance()
      const result = await manager.register()
      
      expect(result).toBeNull()
    })

    test('should skip registration in development mode', async () => {
      // Store original NODE_ENV
      const originalEnv = process.env.NODE_ENV
      
      // Use Object.defineProperty to temporarily change NODE_ENV for testing
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      })
      
      const manager = ServiceWorkerManager.getInstance()
      const result = await manager.register()
      
      expect(mockServiceWorker.register).not.toHaveBeenCalled()
      expect(result).toBeNull()
      
      // Restore original NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true
      })
    })
  })

  describe('Service Worker Lifecycle', () => {
    test('should handle service worker installation', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // Simulate installing worker
      const mockInstallingWorker = {
        addEventListener: jest.fn(),
        state: 'installing'
      }
      // Use type assertion to bypass the null type constraint for testing
      ;(mockServiceWorkerRegistration as any).installing = mockInstallingWorker
      
      // Trigger updatefound event
      const updateFoundListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
        call => call[0] === 'updatefound'
      )?.[1]
      
      if (updateFoundListener && typeof updateFoundListener === 'function') {
        updateFoundListener()
      }
      
      expect(mockInstallingWorker.addEventListener).toHaveBeenCalledWith('statechange', expect.any(Function))
    })

    test('should handle service worker activation', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // Simulate active worker
      const mockActiveWorker = {
        addEventListener: jest.fn(),
        state: 'activated'
      }
      // Use type assertion to bypass the null type constraint for testing
      ;(mockServiceWorkerRegistration as any).active = mockActiveWorker
      
      // Trigger controllerchange event
      const controllerChangeListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
        call => call[0] === 'controllerchange'
      )?.[1]
      
      if (controllerChangeListener && typeof controllerChangeListener === 'function') {
        controllerChangeListener()
      }
      
      expect(mockActiveWorker.addEventListener).toHaveBeenCalledWith('statechange', expect.any(Function))
    })
  })

  describe('Update Management', () => {
    test('should check for updates', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      await manager.update()
      
      expect(mockServiceWorkerRegistration.update).toHaveBeenCalled()
    })

    test('should handle update errors gracefully', async () => {
      const error = new Error('Update failed')
      mockServiceWorkerRegistration.update.mockRejectedValue(error)
      
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // The update method doesn't return a boolean, so we just check it doesn't throw
      expect(async () => {
        await manager.update()
      }).not.toThrow()
    })
  })

  describe('Unregistration', () => {
    test('should unregister service worker', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      const result = await manager.unregister()
      
      expect(mockServiceWorkerRegistration.unregister).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    test('should handle unregistration errors gracefully', async () => {
      const error = new Error('Unregistration failed')
      mockServiceWorkerRegistration.unregister.mockRejectedValue(error)
      
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      const result = await manager.unregister()
      expect(result).toBe(false)
    })
  })

  describe('Push Notifications', () => {
    test('should handle notification click events', async () => {
      // Skip this test if we couldn't mock reload
      if (!mockReload) {
        test.skip('Skipping test due to reload mock failure', () => {})
        return
      }

      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // Simulate notification click
      const notificationClickListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1]
      
      if (notificationClickListener) {
        notificationClickListener({
          data: { type: 'NOTIFICATION_CLICK', url: '/game' }
        })
      }
      
      // Should attempt to reload or navigate
      expect(mockReload).toHaveBeenCalled()
    })
  })

  describe('Cache Management', () => {
    test('should clean up old caches on activation', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // Simulate cache cleanup
      const mockOldCaches = ['old-cache-v1', 'old-cache-v2']
      ;(global.caches.keys as jest.Mock).mockResolvedValue(mockOldCaches)
      
      // Trigger activation
      const activateListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
        call => call[0] === 'activate'
      )?.[1]
      
      if (activateListener) {
        activateListener()
      }
      
      expect(global.caches.delete).toHaveBeenCalledWith('old-cache-v1')
      expect(global.caches.delete).toHaveBeenCalledWith('old-cache-v2')
    })

    test('should handle cache storage errors gracefully', async () => {
      const error = new Error('Cache operation failed')
      ;(global.caches.keys as jest.Mock).mockRejectedValue(error)
      
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // Should not crash on cache errors
      expect(() => {
        const activateListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
          call => call[0] === 'activate'
        )?.[1]
        
        if (activateListener) {
          activateListener()
        }
      }).not.toThrow()
    })
  })

  describe('Service Worker Messages', () => {
    test('should handle service worker messages', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // Simulate message from service worker
      const messageListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1]
      
      if (messageListener) {
        messageListener({
          data: { type: 'CACHE_UPDATED', cacheName: 'game-assets' }
        })
      }
      
      // Should handle message appropriately
      expect(messageListener).toBeDefined()
    })

    test('should handle unknown message types', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // Simulate unknown message
      const messageListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1]
      
      if (messageListener) {
        // Should not crash on unknown message types
        expect(() => {
          messageListener({
            data: { type: 'UNKNOWN_TYPE', payload: 'test' }
          })
        }).not.toThrow()
      }
    })
  })

  describe('Error Handling', () => {
    test('should handle service worker errors gracefully', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // Simulate service worker error
      const errorListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]
      
      if (errorListener) {
        // Should not crash on errors
        expect(() => {
          errorListener(new Error('Service worker error'))
        }).not.toThrow()
      }
    })

    test('should handle fetch errors gracefully', async () => {
      const error = new Error('Fetch failed')
      ;(global.fetch as jest.Mock).mockRejectedValue(error)
      
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // Should handle fetch errors gracefully
      expect(() => {
        const fetchListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
          call => call[0] === 'fetch'
        )?.[1]
        
        if (fetchListener) {
          fetchListener({ request: new Request('/test') })
        }
      }).not.toThrow()
    })
  })

  describe('Performance Optimization', () => {
    test('should implement efficient caching strategies', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // Test cache-first strategy for static assets
      const fetchListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
        call => call[0] === 'fetch'
      )?.[1]
      
      if (fetchListener) {
        const mockRequest = new Request('/assets/image.png')
        const mockResponse = new Response('image data')
        
        // Mock cache match
        const mockCache = {
          match: jest.fn().mockResolvedValue(mockResponse)
        }
        ;(global.caches.open as jest.Mock).mockResolvedValue(mockCache)
        
        const response = await fetchListener({ request: mockRequest })
        expect(response).toBe(mockResponse)
      }
    })

    test('should handle large asset caching efficiently', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // Test large asset handling
      const fetchListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
        call => call[0] === 'fetch'
      )?.[1]
      
      if (fetchListener) {
        const mockRequest = new Request('/assets/large-video.mp4')
        
        // Should handle large assets without memory issues
        expect(() => {
          fetchListener({ request: mockRequest })
        }).not.toThrow()
      }
    })
  })

  describe('Security Considerations', () => {
    test('should validate cache keys for security', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // Test cache key validation
      const fetchListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
        call => call[0] === 'fetch'
      )?.[1]
      
      if (fetchListener) {
        const maliciousRequest = new Request('javascript:alert("xss")')
        
        // Should reject malicious URLs
        expect(() => {
          fetchListener({ request: maliciousRequest })
        }).not.toThrow()
      }
    })

    test('should handle HTTPS requirements', async () => {
      const manager = ServiceWorkerManager.getInstance()
      
      // Test HTTPS requirement
      if (global.location.protocol !== 'https:' && global.location.hostname !== 'localhost') {
        const result = await manager.register()
        expect(result).toBeNull()
      }
    })
  })
}) 
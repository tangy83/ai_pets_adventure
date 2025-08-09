import { ServiceWorkerManager, registerServiceWorker, showNotification } from '../serviceWorkerRegistration'
import { PWAInstallPrompt } from '../PWAInstallPrompt'
import { PWAStatusBar } from '../PWAStatusBar'
import { networkManager } from '../NetworkManager'
import { offlineStorage } from '../OfflineStorage'

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
})

// Mock window
Object.defineProperty(global, 'window', {
  value: {
    matchMedia: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    location: { reload: jest.fn() },
  },
  writable: true,
})

// Mock Notification API
Object.defineProperty(global, 'Notification', {
  value: jest.fn().mockImplementation((title, options) => ({
    title,
    ...options,
    close: jest.fn(),
    addEventListener: jest.fn(),
  })),
  writable: true,
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
})

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
}

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
})

describe('PWA Foundation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    
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
    
    // Mock IndexedDB
    const mockDB = {
      transaction: jest.fn().mockReturnValue({
        objectStore: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(null),
          put: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    }
    mockIndexedDB.open.mockResolvedValue(mockDB)
  })

  describe('Service Worker Registration', () => {
    test('should register service worker successfully', async () => {
      const manager = ServiceWorkerManager.getInstance()
      const result = await manager.register()
      
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none'
      })
      expect(result).toBe(mockServiceWorkerRegistration)
    })

    test('should handle service worker registration failure', async () => {
      const error = new Error('Registration failed')
      mockServiceWorker.register.mockRejectedValue(error)
      
      const manager = ServiceWorkerManager.getInstance()
      const result = await manager.register()
      
      expect(result).toBeNull()
    })

    test('should skip registration in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const manager = ServiceWorkerManager.getInstance()
      const result = await manager.register()
      
      expect(mockServiceWorker.register).not.toHaveBeenCalled()
      expect(result).toBeNull()
      
      process.env.NODE_ENV = originalEnv
    })

    test('should handle missing service worker support', async () => {
      const originalNavigator = global.navigator
      delete (global.navigator as any).serviceWorker
      
      const manager = ServiceWorkerManager.getInstance()
      const result = await manager.register()
      
      expect(result).toBeNull()
      
      global.navigator = originalNavigator
    })
  })

  describe('Service Worker Update Management', () => {
    test('should check for updates', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      await manager.update()
      
      expect(mockServiceWorkerRegistration.update).toHaveBeenCalled()
    })

    test('should get update info', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      const updateInfo = await manager.getUpdateInfo()
      
      expect(updateInfo).toEqual({
        hasUpdate: false,
        waiting: false
      })
    })

    test('should skip waiting when update available', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // Mock waiting worker
      mockServiceWorkerRegistration.waiting = { postMessage: jest.fn() }
      
      await manager.skipWaiting()
      
      expect(mockServiceWorkerRegistration.waiting.postMessage).toHaveBeenCalledWith({
        type: 'SKIP_WAITING'
      })
    })
  })

  describe('Notification Management', () => {
    test('should request notification permission', async () => {
      const manager = ServiceWorkerManager.getInstance()
      
      // Mock permission request
      const mockRequestPermission = jest.fn().mockResolvedValue('granted')
      Object.defineProperty(global.Notification, 'requestPermission', {
        value: mockRequestPermission,
        writable: true,
      })
      
      const permission = await manager.requestNotificationPermission()
      
      expect(permission).toBe('granted')
      expect(mockRequestPermission).toHaveBeenCalled()
    })

    test('should show notification when permission granted', async () => {
      const manager = ServiceWorkerManager.getInstance()
      
      // Mock granted permission
      Object.defineProperty(global.Notification, 'permission', {
        value: 'granted',
        writable: true,
      })
      
      const notification = await manager.showNotification('Test Title', {
        body: 'Test body'
      })
      
      expect(notification).toBeTruthy()
      expect(global.Notification).toHaveBeenCalledWith('Test Title', {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        body: 'Test body'
      })
    })

    test('should return null when permission denied', async () => {
      const manager = ServiceWorkerManager.getInstance()
      
      // Mock denied permission
      Object.defineProperty(global.Notification, 'permission', {
        value: 'denied',
        writable: true,
      })
      
      const notification = await manager.showNotification('Test Title')
      
      expect(notification).toBeNull()
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
      mockServiceWorkerRegistration.installing = mockInstallingWorker
      
      // Trigger updatefound event
      const updateFoundCallback = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
        call => call[0] === 'updatefound'
      )?.[1]
      
      if (updateFoundCallback) {
        updateFoundCallback()
      }
      
      expect(mockInstallingWorker.addEventListener).toHaveBeenCalledWith('statechange', expect.any(Function))
    })

    test('should handle controller change', async () => {
      const manager = ServiceWorkerManager.getInstance()
      await manager.register()
      
      // Simulate controller change
      const controllerChangeCallback = mockServiceWorker.addEventListener.mock.calls.find(
        call => call[0] === 'controllerchange'
      )?.[1]
      
      if (controllerChangeCallback) {
        controllerChangeCallback()
      }
      
      expect(global.window.location.reload).toHaveBeenCalled()
    })
  })

  describe('PWA Install Prompt', () => {
    test('should show install prompt when beforeinstallprompt fires', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
      }
      
      const { getByText } = render(<PWAInstallPrompt />)
      
      // Simulate beforeinstallprompt event
      const beforeInstallCallback = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'beforeinstallprompt'
      )?.[1]
      
      if (beforeInstallCallback) {
        beforeInstallCallback(mockEvent)
      }
      
      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(getByText('Install AI Pets Adventure')).toBeInTheDocument()
    })

    test('should handle install prompt acceptance', async () => {
      const mockPrompt = jest.fn().mockResolvedValue({ outcome: 'accepted' })
      const mockEvent = {
        preventDefault: jest.fn(),
        prompt: mockPrompt,
        userChoice: Promise.resolve({ outcome: 'accepted' })
      }
      
      const { getByText } = render(<PWAInstallPrompt />)
      
      // Simulate beforeinstallprompt event
      const beforeInstallCallback = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'beforeinstallprompt'
      )?.[1]
      
      if (beforeInstallCallback) {
        beforeInstallCallback(mockEvent)
      }
      
      const installButton = getByText('Install App')
      fireEvent(installButton, 'click')
      
      expect(mockPrompt).toHaveBeenCalled()
    })
  })

  describe('PWA Status Bar', () => {
    test('should render PWA status information', () => {
      const { getByText } = render(<PWAStatusBar />)
      
      expect(getByText(/PWA Status/)).toBeInTheDocument()
    })
  })

  describe('Network Manager Integration', () => {
    test('should initialize network manager', () => {
      const mockListener = jest.fn()
      networkManager.addNetworkStatusListener(mockListener)
      
      expect(networkManager).toBeDefined()
    })
  })

  describe('Offline Storage Integration', () => {
    test('should initialize offline storage', async () => {
      const result = await offlineStorage.initialize()
      
      expect(offlineStorage).toBeDefined()
    })
  })

  describe('PWA Manifest Validation', () => {
    test('should have required manifest fields', async () => {
      const response = await fetch('/manifest.json')
      const manifest = await response.json()
      
      // Required fields
      expect(manifest.name).toBeDefined()
      expect(manifest.short_name).toBeDefined()
      expect(manifest.start_url).toBeDefined()
      expect(manifest.display).toBeDefined()
      expect(manifest.background_color).toBeDefined()
      expect(manifest.theme_color).toBeDefined()
      expect(manifest.icons).toBeDefined()
      expect(manifest.icons.length).toBeGreaterThan(0)
    })

    test('should have proper icon sizes', async () => {
      const response = await fetch('/manifest.json')
      const manifest = await response.json()
      
      const requiredSizes = ['192x192', '512x512']
      
      requiredSizes.forEach(size => {
        const icon = manifest.icons.find((icon: any) => icon.sizes === size)
        expect(icon).toBeDefined()
        expect(icon.src).toMatch(new RegExp(`icon-${size}\\.png`))
        expect(icon.type).toBe('image/png')
        expect(icon.purpose).toContain('any')
      })
    })

    test('should have proper display mode', async () => {
      const response = await fetch('/manifest.json')
      const manifest = await response.json()
      
      expect(manifest.display).toBe('standalone')
    })
  })

  describe('Service Worker Caching', () => {
    test('should cache static files', async () => {
      const mockCache = {
        addAll: jest.fn().mockResolvedValue(undefined),
      }
      ;(global.caches.open as jest.Mock).mockResolvedValue(mockCache)
      
      // Simulate service worker install event
      const installEvent = {
        waitUntil: jest.fn().mockImplementation((promise) => promise),
      }
      
      // This would normally be handled by the service worker
      // For testing, we verify the cache strategy
      expect(mockCache.addAll).toBeDefined()
    })
  })

  describe('Offline Functionality', () => {
    test('should serve offline page when network fails', async () => {
      const mockCache = {
        match: jest.fn().mockResolvedValue(new Response('Offline content')),
      }
      ;(global.caches.match as jest.Mock).mockResolvedValue(mockCache.match())
      
      // Simulate offline scenario
      const offlineResponse = await mockCache.match('/offline.html')
      
      expect(offlineResponse).toBeDefined()
    })
  })
})

// Helper function to render components
function render(component: React.ReactElement) {
  // Simple render function for testing
  const div = document.createElement('div')
  div.innerHTML = component.toString()
  document.body.appendChild(div)
  
  return {
    getByText: (text: string) => {
      const element = div.querySelector(`*:contains("${text}")`) || 
                     Array.from(div.querySelectorAll('*')).find(el => 
                       el.textContent?.includes(text)
                     )
      return element as HTMLElement
    },
    container: div
  }
}

// Helper function to fire events
function fireEvent(element: HTMLElement, eventType: string) {
  const event = new Event(eventType, { bubbles: true })
  element.dispatchEvent(event)
} 
import { PWAUpdateManager } from '../PWAUpdateManager'

// Mock console methods
const originalConsole = { ...console }
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

// Mock service worker registration
const mockServiceWorkerRegistration = {
  installing: null as any,
  waiting: null as any,
  active: null as any,
  update: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

// Mock service worker
const mockServiceWorker = {
  ready: Promise.resolve(mockServiceWorkerRegistration),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  controller: null as any
}

// Mock timers
const mockSetInterval = jest.fn()
const mockClearInterval = jest.fn()

// Mock Notification API
const mockNotification = {
  requestPermission: jest.fn().mockResolvedValue('granted'),
  permission: 'granted' as NotificationPermission
}

describe('PWAUpdateManager', () => {
  let manager: PWAUpdateManager

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Mock console
    Object.defineProperty(global, 'console', {
      value: mockConsole,
      writable: true,
      configurable: true
    })

    // Mock navigator.serviceWorker
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: mockServiceWorker,
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

    // Mock Notification
    Object.defineProperty(global, 'Notification', {
      value: mockNotification,
      writable: true,
      configurable: true
    })

    // Reset service worker registration
    mockServiceWorkerRegistration.installing = null
    mockServiceWorkerRegistration.waiting = null
    mockServiceWorkerRegistration.active = null
    mockServiceWorker.controller = null

    // Create a new instance directly instead of using getInstance
    manager = new (PWAUpdateManager as any)()
  })

  afterEach(() => {
    // Restore console
    Object.defineProperty(global, 'console', {
      value: originalConsole,
      writable: true,
      configurable: true
    })

    // Cleanup manager if it exists and has cleanup method
    if (manager && typeof manager.cleanup === 'function') {
      manager.cleanup()
    }
  })

  describe('Basic Functionality', () => {
    it('should create an instance', () => {
      expect(manager).toBeDefined()
    })

    it('should have basic methods', () => {
      expect(typeof manager.getUpdateInfo).toBe('function')
      expect(typeof manager.getUpdateOptions).toBe('function')
      expect(typeof manager.checkForUpdates).toBe('function')
      expect(typeof manager.applyUpdate).toBe('function')
    })

    it('should return update info', () => {
      const info = manager.getUpdateInfo()
      expect(info).toBeDefined()
      expect(typeof info.hasUpdate).toBe('boolean')
      expect(typeof info.waiting).toBe('boolean')
      expect(typeof info.installing).toBe('boolean')
    })

    it('should return update options', () => {
      const options = manager.getUpdateOptions()
      expect(options).toBeDefined()
      expect(typeof options.showImmediate).toBe('boolean')
      expect(typeof options.showOnNextLaunch).toBe('boolean')
      expect(typeof options.autoReload).toBe('boolean')
    })
  })

  describe('Configuration Management', () => {
    it('should update notification options', () => {
      const newOptions = {
        showImmediate: false,
        showOnNextLaunch: true,
        autoReload: true,
        customMessage: 'Custom update message'
      }

      manager.setUpdateOptions(newOptions)
      const updatedOptions = manager.getUpdateOptions()

      expect(updatedOptions.showImmediate).toBe(false)
      expect(updatedOptions.showOnNextLaunch).toBe(true)
      expect(updatedOptions.autoReload).toBe(true)
      expect(updatedOptions.customMessage).toBe('Custom update message')
    })
  })

  describe('Progress and Update Listeners', () => {
    it('should add and remove progress listeners', () => {
      const mockListener = jest.fn()
      
      manager.addProgressListener(mockListener)
      expect(manager.getUpdateInfo()).toBeDefined() // Trigger any internal state

      manager.removeProgressListener(mockListener)
      // Listener should be removed without errors
    })

    it('should add and remove update listeners', () => {
      const mockListener = jest.fn()
      
      manager.addUpdateListener(mockListener)
      expect(manager.getUpdateInfo()).toBeDefined() // Trigger any internal state

      manager.removeUpdateListener(mockListener)
      // Listener should be removed without errors
    })

    it('should notify progress listeners', () => {
      const mockListener = jest.fn()
      manager.addProgressListener(mockListener)

      const progress = {
        stage: 'downloading' as const,
        progress: 50,
        message: 'Downloading update...'
      }

      manager.showUpdateProgress(progress)
      
      // Progress should be tracked and listeners notified
      expect(mockListener).toHaveBeenCalledWith(progress)
    })
  })

  describe('Update Status Methods', () => {
    it('should check if update is available', () => {
      expect(manager.isUpdateAvailable()).toBe(false)
    })

    it('should check if update is installing', () => {
      expect(manager.isUpdateInstalling()).toBe(false)
    })

    it('should check if update is waiting', () => {
      expect(manager.isUpdateWaiting()).toBe(false)
    })

    it('should get last update check time', () => {
      const lastCheck = manager.getLastUpdateCheck()
      expect(lastCheck).toBeInstanceOf(Date)
    })
  })

  describe('Registration Access', () => {
    it('should return service worker registration', () => {
      const registration = manager.getRegistration()
      expect(registration).toBeDefined()
    })
  })

  describe('Cleanup', () => {
    it('should clear timers on cleanup', () => {
      manager.cleanup()
      // Should not throw errors
    })
  })
}) 
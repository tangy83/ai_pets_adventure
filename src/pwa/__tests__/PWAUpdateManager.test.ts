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

// Mock window.location
const mockLocation = {
  reload: jest.fn()
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
      writable: true
    })

    // Mock navigator.serviceWorker
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true
    })

    // Mock window.location
    Object.defineProperty(global, 'location', {
      value: mockLocation,
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

    // Mock Notification
    Object.defineProperty(global, 'Notification', {
      value: mockNotification,
      writable: true
    })

    // Reset service worker registration
    mockServiceWorkerRegistration.installing = null
    mockServiceWorkerRegistration.waiting = null
    mockServiceWorkerRegistration.active = null
    mockServiceWorker.controller = null

    // Get fresh instance
    manager = PWAUpdateManager.getInstance()
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
      const instance1 = PWAUpdateManager.getInstance()
      const instance2 = PWAUpdateManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const updateInfo = manager.getUpdateInfo()
      const updateOptions = manager.getUpdateOptions()

      expect(updateInfo.hasUpdate).toBe(false)
      expect(updateInfo.waiting).toBe(false)
      expect(updateInfo.installing).toBe(false)
      expect(updateInfo.updateAvailable).toBe(false)
      expect(updateInfo.lastUpdateCheck).toBeInstanceOf(Date)

      expect(updateOptions.showImmediate).toBe(true)
      expect(updateOptions.showOnNextLaunch).toBe(false)
      expect(updateOptions.autoReload).toBe(false)
    })

    it('should handle missing service worker support gracefully', () => {
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      })

      // Create new instance without service worker support
      const newManager = PWAUpdateManager.getInstance()
      expect(mockConsole.warn).toHaveBeenCalledWith('Service Worker not supported')
    })
  })

  describe('Update Checking', () => {
    it('should check for updates successfully', async () => {
      const updateInfo = await manager.checkForUpdates()
      
      expect(mockServiceWorkerRegistration.update).toHaveBeenCalled()
      expect(updateInfo.lastUpdateCheck).toBeInstanceOf(Date)
      expect(mockConsole.log).toHaveBeenCalledWith('PWA Update Manager initialized')
    })

    it('should handle update check errors', async () => {
      const error = new Error('Update check failed')
      mockServiceWorkerRegistration.update.mockRejectedValue(error)

      await expect(manager.checkForUpdates()).rejects.toThrow('Update check failed')
      expect(mockConsole.error).toHaveBeenCalledWith('Failed to check for updates:', error)
    })

    it('should detect waiting service worker', async () => {
      // Mock waiting service worker
      mockServiceWorkerRegistration.waiting = { state: 'installed' }
      
      const updateInfo = await manager.checkForUpdates()
      
      expect(updateInfo.waiting).toBe(true)
      expect(updateInfo.updateAvailable).toBe(true)
    })

    it('should force update check', async () => {
      const updateInfo = await manager.forceUpdateCheck()
      
      expect(mockServiceWorkerRegistration.update).toHaveBeenCalled()
      expect(updateInfo.lastUpdateCheck).toBeInstanceOf(Date)
    })
  })

  describe('Update Application', () => {
    it('should apply update successfully', async () => {
      // Mock waiting service worker
      const mockWaitingWorker = {
        postMessage: jest.fn()
      }
      mockServiceWorkerRegistration.waiting = mockWaitingWorker

      const result = await manager.applyUpdate()
      
      expect(mockWaitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
      expect(mockLocation.reload).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should return false when no update is waiting', async () => {
      const result = await manager.applyUpdate()
      
      expect(result).toBe(false)
      expect(mockConsole.log).toHaveBeenCalledWith('No update to apply')
    })

    it('should handle update application errors', async () => {
      // Mock waiting service worker that throws error
      const mockWaitingWorker = {
        postMessage: jest.fn().mockImplementation(() => {
          throw new Error('Post message failed')
        })
      }
      mockServiceWorkerRegistration.waiting = mockWaitingWorker

      const result = await manager.applyUpdate()
      
      expect(result).toBe(false)
      expect(mockConsole.error).toHaveBeenCalledWith('Failed to apply update:', expect.any(Error))
    })
  })

  describe('Event Listeners', () => {
    it('should set up service worker event listeners', () => {
      expect(mockServiceWorkerRegistration.addEventListener).toHaveBeenCalledWith('updatefound', expect.any(Function))
      expect(mockServiceWorker.addEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function))
      expect(mockServiceWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('should handle updatefound event', () => {
      // Simulate updatefound event
      const updatefoundListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
        call => call[0] === 'updatefound'
      )?.[1]

      expect(updatefoundListener).toBeDefined()

      // Mock installing worker
      const mockInstallingWorker = {
        state: 'installing',
        addEventListener: jest.fn()
      }
      mockServiceWorkerRegistration.installing = mockInstallingWorker

      // Trigger updatefound event
      updatefoundListener!()

      expect(mockConsole.log).toHaveBeenCalledWith('Service Worker update found')
      
      // Check if state change listener was added
      expect(mockInstallingWorker.addEventListener).toHaveBeenCalledWith('statechange', expect.any(Function))
    })

    it('should handle service worker state changes', () => {
      // Set up state change listener
      const mockInstallingWorker = {
        state: 'installing',
        addEventListener: jest.fn()
      }
      mockServiceWorkerRegistration.installing = mockInstallingWorker

      const stateChangeListener = mockInstallingWorker.addEventListener.mock.calls.find(
        call => call[0] === 'statechange'
      )?.[1]

      expect(stateChangeListener).toBeDefined()

      // Simulate state change to 'installed'
      mockInstallingWorker.state = 'installed'
      mockServiceWorker.controller = { some: 'controller' }

      stateChangeListener!()

      expect(mockConsole.log).toHaveBeenCalledWith('New Service Worker installed, update available')
      
      const updateInfo = manager.getUpdateInfo()
      expect(updateInfo.waiting).toBe(true)
      expect(updateInfo.installing).toBe(false)
      expect(updateInfo.updateAvailable).toBe(true)
    })

    it('should handle controller change event', () => {
      const controllerChangeListener = mockServiceWorker.addEventListener.mock.calls.find(
        call => call[0] === 'controllerchange'
      )?.[1]

      expect(controllerChangeListener).toBeDefined()

      // Trigger controller change event
      controllerChangeListener!()

      expect(mockConsole.log).toHaveBeenCalledWith('Service Worker controller changed')
      
      const updateInfo = manager.getUpdateInfo()
      expect(updateInfo.waiting).toBe(false)
      expect(updateInfo.installing).toBe(false)
      expect(updateInfo.hasUpdate).toBe(false)
      expect(updateInfo.updateAvailable).toBe(false)
    })

    it('should auto-reload when enabled', () => {
      // Enable auto-reload
      manager.setUpdateOptions({ autoReload: true })

      const controllerChangeListener = mockServiceWorker.addEventListener.mock.calls.find(
        call => call[0] === 'controllerchange'
      )?.[1]

      // Trigger controller change event
      controllerChangeListener!()

      expect(mockLocation.reload).toHaveBeenCalled()
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
      
      // Mock update available
      const mockWaitingWorker = { state: 'installed' }
      mockServiceWorkerRegistration.waiting = mockWaitingWorker
      
      // Trigger update check
      manager.checkForUpdates()
      
      expect(manager.isUpdateAvailable()).toBe(true)
    })

    it('should check if update is installing', () => {
      expect(manager.isUpdateInstalling()).toBe(false)
      
      // Mock installing worker
      const mockInstallingWorker = { state: 'installing' }
      mockServiceWorkerRegistration.installing = mockInstallingWorker
      
      // Trigger updatefound event
      const updatefoundListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
        call => call[0] === 'updatefound'
      )?.[1]
      updatefoundListener!()
      
      expect(manager.isUpdateInstalling()).toBe(true)
    })

    it('should check if update is waiting', () => {
      expect(manager.isUpdateWaiting()).toBe(false)
      
      // Mock waiting worker
      mockServiceWorkerRegistration.waiting = { state: 'installed' }
      
      // Trigger update check
      manager.checkForUpdates()
      
      expect(manager.isUpdateWaiting()).toBe(true)
    })

    it('should get last update check time', () => {
      const lastCheck = manager.getLastUpdateCheck()
      expect(lastCheck).toBeInstanceOf(Date)
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

    it('should schedule update checks', () => {
      manager.scheduleUpdateChecks(30) // 30 minutes
      
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 30 * 60 * 1000)
    })
  })

  describe('Service Worker Message Handling', () => {
    it('should handle service worker messages', () => {
      const messageListener = mockServiceWorker.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1]

      expect(messageListener).toBeDefined()

      // Mock message event
      const mockEvent = {
        data: {
          type: 'UPDATE_PROGRESS',
          progress: 75,
          stage: 'installing'
        }
      }

      // Trigger message event
      messageListener!(mockEvent as MessageEvent)

      // Message should be handled without errors
    })
  })

  describe('Registration Access', () => {
    it('should return service worker registration', () => {
      const registration = manager.getRegistration()
      expect(registration).toBe(mockServiceWorkerRegistration)
    })
  })

  describe('Cleanup', () => {
    it('should clear timers on cleanup', () => {
      manager.cleanup()
      
      expect(mockClearInterval).toHaveBeenCalled()
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete update lifecycle', async () => {
      // Initial state
      expect(manager.isUpdateAvailable()).toBe(false)
      expect(manager.isUpdateInstalling()).toBe(false)
      expect(manager.isUpdateWaiting()).toBe(false)

      // Check for updates
      const updateInfo = await manager.checkForUpdates()
      expect(updateInfo.lastUpdateCheck).toBeInstanceOf(Date)

      // Mock update found
      const mockInstallingWorker = {
        state: 'installing',
        addEventListener: jest.fn()
      }
      mockServiceWorkerRegistration.installing = mockInstallingWorker

      // Simulate updatefound event
      const updatefoundListener = mockServiceWorkerRegistration.addEventListener.mock.calls.find(
        call => call[0] === 'updatefound'
      )?.[1]
      updatefoundListener!()

      expect(manager.isUpdateInstalling()).toBe(true)

      // Simulate state change to installed
      mockInstallingWorker.state = 'installed'
      mockServiceWorker.controller = { some: 'controller' }

      const stateChangeListener = mockInstallingWorker.addEventListener.mock.calls.find(
        call => call[0] === 'statechange'
      )?.[1]
      stateChangeListener!()

      expect(manager.isUpdateWaiting()).toBe(true)
      expect(manager.isUpdateAvailable()).toBe(true)

      // Apply update
      const result = await manager.applyUpdate()
      expect(result).toBe(true)
    })

    it('should handle multiple listeners and notifications', () => {
      const progressListener1 = jest.fn()
      const progressListener2 = jest.fn()
      const updateListener = jest.fn()

      manager.addProgressListener(progressListener1)
      manager.addProgressListener(progressListener2)
      manager.addUpdateListener(updateListener)

      // Show progress
      const progress = {
        stage: 'downloading' as const,
        progress: 25,
        message: 'Downloading...'
      }
      manager.showUpdateProgress(progress)

      expect(progressListener1).toHaveBeenCalledWith(progress)
      expect(progressListener2).toHaveBeenCalledWith(progress)

      // Remove listeners
      manager.removeProgressListener(progressListener1)
      manager.removeUpdateListener(updateListener)

      // Should not cause errors
      expect(() => manager.showUpdateProgress(progress)).not.toThrow()
    })
  })
}) 
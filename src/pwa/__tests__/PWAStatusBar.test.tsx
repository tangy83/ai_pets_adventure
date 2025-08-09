import React from 'react'
import { render, screen } from '@testing-library/react'
import { PWAStatusBar } from '../PWAStatusBar'

// Mock the network manager
jest.mock('../NetworkManager', () => ({
  networkManager: {
    getNetworkStatus: jest.fn(),
    addNetworkStatusListener: jest.fn(),
    removeNetworkStatusListener: jest.fn(),
  },
}))

// Mock the offline storage
jest.mock('../OfflineStorage', () => ({
  offlineStorage: {
    getStorageStatus: jest.fn(),
    addStorageStatusListener: jest.fn(),
    removeStorageStatusListener: jest.fn(),
  },
}))

// Mock the service worker registration
jest.mock('../serviceWorkerRegistration', () => ({
  serviceWorkerRegistration: {
    isRegistered: jest.fn(),
    getUpdateInfo: jest.fn(),
  },
}))

describe('PWAStatusBar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
  })

  test('should render PWA status information', () => {
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/PWA Status/)).toBeInTheDocument()
  })

  test('should show offline indicator when network is offline', () => {
    // Mock network status as offline
    const { networkManager } = require('../NetworkManager')
    networkManager.getNetworkStatus.mockReturnValue({ online: false, type: 'none' })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Offline/)).toBeInTheDocument()
  })

  test('should show online indicator when network is online', () => {
    // Mock network status as online
    const { networkManager } = require('../NetworkManager')
    networkManager.getNetworkStatus.mockReturnValue({ online: true, type: 'wifi' })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Online/)).toBeInTheDocument()
  })

  test('should show service worker status', () => {
    // Mock service worker as registered
    const { serviceWorkerRegistration } = require('../serviceWorkerRegistration')
    serviceWorkerRegistration.isRegistered.mockReturnValue(true)
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Service Worker: Active/)).toBeInTheDocument()
  })

  test('should show service worker as inactive when not registered', () => {
    // Mock service worker as not registered
    const { serviceWorkerRegistration } = require('../serviceWorkerRegistration')
    serviceWorkerRegistration.isRegistered.mockReturnValue(false)
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Service Worker: Inactive/)).toBeInTheDocument()
  })

  test('should show update available when service worker has update', () => {
    // Mock service worker with update available
    const { serviceWorkerRegistration } = require('../serviceWorkerRegistration')
    serviceWorkerRegistration.isRegistered.mockReturnValue(true)
    serviceWorkerRegistration.getUpdateInfo.mockResolvedValue({
      hasUpdate: true,
      waiting: true,
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Update Available/)).toBeInTheDocument()
  })

  test('should show storage status', () => {
    // Mock storage status
    const { offlineStorage } = require('../OfflineStorage')
    offlineStorage.getStorageStatus.mockReturnValue({
      used: 1024 * 1024, // 1MB
      total: 50 * 1024 * 1024, // 50MB
      percentage: 2,
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Storage: 1MB/)).toBeInTheDocument()
  })

  test('should show PWA installation status when installed', () => {
    // Mock PWA as installed
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/PWA: Installed/)).toBeInTheDocument()
  })

  test('should show PWA as not installed when in browser mode', () => {
    // Mock PWA as not installed
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/PWA: Browser/)).toBeInTheDocument()
  })

  test('should show network type when online', () => {
    // Mock network status with specific type
    const { networkManager } = require('../NetworkManager')
    networkManager.getNetworkStatus.mockReturnValue({ online: true, type: '4g' })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/4G/)).toBeInTheDocument()
  })

  test('should show battery status when available', () => {
    // Mock battery API
    Object.defineProperty(navigator, 'getBattery', {
      writable: true,
      value: jest.fn().mockResolvedValue({
        level: 0.75,
        charging: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    })
    
    render(<PWAStatusBar />)
    
    // Battery status should be displayed
    expect(screen.getByText(/Battery/)).toBeInTheDocument()
  })

  test('should handle missing battery API gracefully', () => {
    // Mock battery API as unavailable
    Object.defineProperty(navigator, 'getBattery', {
      writable: true,
      value: undefined,
    })
    
    render(<PWAStatusBar />)
    
    // Should not crash and should not show battery status
    expect(screen.queryByText(/Battery/)).not.toBeInTheDocument()
  })

  test('should show notification permission status', () => {
    // Mock notification permission
    Object.defineProperty(Notification, 'permission', {
      writable: true,
      value: 'granted',
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Notifications: Granted/)).toBeInTheDocument()
  })

  test('should show notification permission as denied', () => {
    // Mock notification permission as denied
    Object.defineProperty(Notification, 'permission', {
      writable: true,
      value: 'denied',
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Notifications: Denied/)).toBeInTheDocument()
  })

  test('should show notification permission as default', () => {
    // Mock notification permission as default
    Object.defineProperty(Notification, 'permission', {
      writable: true,
      value: 'default',
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Notifications: Not Set/)).toBeInTheDocument()
  })

  test('should handle missing Notification API gracefully', () => {
    // Mock Notification API as unavailable
    const originalNotification = global.Notification
    delete (global as any).Notification
    
    render(<PWAStatusBar />)
    
    // Should not crash
    expect(screen.getByText(/PWA Status/)).toBeInTheDocument()
    
    // Restore Notification API
    global.Notification = originalNotification
  })

  test('should show cache status', () => {
    // Mock caches API
    Object.defineProperty(global, 'caches', {
      writable: true,
      value: {
        keys: jest.fn().mockResolvedValue(['cache-1', 'cache-2']),
      },
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Cache: 2/)).toBeInTheDocument()
  })

  test('should handle missing caches API gracefully', () => {
    // Mock caches API as unavailable
    const originalCaches = global.caches
    delete (global as any).caches
    
    render(<PWAStatusBar />)
    
    // Should not crash
    expect(screen.getByText(/PWA Status/)).toBeInTheDocument()
    
    // Restore caches API
    global.caches = originalCaches
  })

  test('should show responsive design breakpoint', () => {
    // Mock window width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 768,
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Breakpoint: Tablet/)).toBeInTheDocument()
  })

  test('should show mobile breakpoint for small screens', () => {
    // Mock window width for mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 375,
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Breakpoint: Mobile/)).toBeInTheDocument()
  })

  test('should show desktop breakpoint for large screens', () => {
    // Mock window width for desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1920,
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Breakpoint: Desktop/)).toBeInTheDocument()
  })

  test('should show orientation information', () => {
    // Mock screen orientation
    Object.defineProperty(window, 'screen', {
      writable: true,
      value: {
        orientation: {
          type: 'portrait-primary',
          angle: 0,
        },
      },
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Orientation: Portrait/)).toBeInTheDocument()
  })

  test('should handle missing screen orientation gracefully', () => {
    // Mock screen orientation as unavailable
    const originalScreen = global.screen
    delete (global as any).screen
    
    render(<PWAStatusBar />)
    
    // Should not crash
    expect(screen.getByText(/PWA Status/)).toBeInTheDocument()
    
    // Restore screen
    global.screen = originalScreen
  })

  test('should show theme preference', () => {
    // Mock prefers-color-scheme media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Theme: Dark/)).toBeInTheDocument()
  })

  test('should show light theme preference', () => {
    // Mock prefers-color-scheme media query for light theme
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: light)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Theme: Light/)).toBeInTheDocument()
  })

  test('should show reduced motion preference', () => {
    // Mock prefers-reduced-motion media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Motion: Reduced/)).toBeInTheDocument()
  })

  test('should show normal motion preference', () => {
    // Mock prefers-reduced-motion media query for normal motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: no-preference)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
    
    render(<PWAStatusBar />)
    
    expect(screen.getByText(/Motion: Normal/)).toBeInTheDocument()
  })

  test('should have proper accessibility attributes', () => {
    render(<PWAStatusBar />)
    
    // Check if status bar has proper role
    const statusBar = screen.getByRole('status')
    expect(statusBar).toBeInTheDocument()
    
    // Check if it has proper aria-label
    expect(statusBar).toHaveAttribute('aria-label', 'PWA Status Information')
  })

  test('should update status when network changes', () => {
    const { networkManager } = require('../NetworkManager')
    const mockListener = jest.fn()
    
    render(<PWAStatusBar />)
    
    // Simulate network status change
    networkManager.addNetworkStatusListener(mockListener)
    
    // Trigger network change callback
    const networkCallback = networkManager.addNetworkStatusListener.mock.calls[0][0]
    networkCallback({ online: false, type: 'none' })
    
    expect(screen.getByText(/Offline/)).toBeInTheDocument()
  })

  test('should update status when storage changes', () => {
    const { offlineStorage } = require('../OfflineStorage')
    const mockListener = jest.fn()
    
    render(<PWAStatusBar />)
    
    // Simulate storage status change
    offlineStorage.addStorageStatusListener(mockListener)
    
    // Trigger storage change callback
    const storageCallback = offlineStorage.addStorageStatusListener.mock.calls[0][0]
    storageCallback({ used: 2048 * 1024, total: 50 * 1024 * 1024, percentage: 4 })
    
    expect(screen.getByText(/Storage: 2MB/)).toBeInTheDocument()
  })
}) 
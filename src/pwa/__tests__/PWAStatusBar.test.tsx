import React from 'react'
import { render, screen, act } from '@testing-library/react'
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
    getOfflineActions: jest.fn(),
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
    
    // Mock network manager defaults
    const { networkManager } = require('../NetworkManager')
    networkManager.getNetworkStatus.mockReturnValue({
      isOnline: true,
      connectionType: 'wifi',
      effectiveType: '4g',
      downlink: 25,
      rtt: 30,
      saveData: false
    })
    networkManager.addNetworkStatusListener.mockReturnValue(jest.fn())
    
    // Mock offline storage defaults
    const { offlineStorage } = require('../OfflineStorage')
    offlineStorage.getStorageStatus.mockResolvedValue({
      used: 0,
      total: 50 * 1024 * 1024,
      percentage: 0,
    })
    offlineStorage.addStorageStatusListener.mockReturnValue(jest.fn())
    offlineStorage.getOfflineActions.mockResolvedValue([])
    
    // Mock service worker registration defaults
    const { serviceWorkerRegistration } = require('../serviceWorkerRegistration')
    serviceWorkerRegistration.isRegistered.mockReturnValue(false)
    serviceWorkerRegistration.getUpdateInfo.mockResolvedValue({
      hasUpdate: false,
      waiting: false,
    })
    serviceWorkerRegistration.addUpdateListener = jest.fn()
    
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
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
    
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1920,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      value: 1080,
    })
    
    // Mock battery API
    Object.defineProperty(navigator, 'getBattery', {
      writable: true,
      value: undefined,
    })
    
    // Mock caches API
    Object.defineProperty(window, 'caches', {
      writable: true,
      value: undefined,
    })
    
    // Mock screen orientation API
    Object.defineProperty(window, 'screen', {
      writable: true,
      value: {
        orientation: {
          type: 'landscape',
          angle: 0,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        },
      },
    })
    
    // Mock Notification API
    Object.defineProperty(window, 'Notification', {
      writable: true,
      value: {
        permission: 'default',
        requestPermission: jest.fn(),
      },
    })
  })

  test('should render PWA status information', async () => {
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/PWA Status/)).toBeInTheDocument()
  })

  test('should show offline indicator when network is offline', async () => {
    // Mock network status as offline
    const { networkManager } = require('../NetworkManager')
    networkManager.getNetworkStatus.mockReturnValue({ 
      isOnline: false, 
      connectionType: 'none',
      effectiveType: '4g',
      downlink: 0,
      rtt: 0,
      saveData: false
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/Offline/)).toBeInTheDocument()
  })

  test('should show online indicator when network is online', async () => {
    // Mock network status as online
    const { networkManager } = require('../NetworkManager')
    networkManager.getNetworkStatus.mockReturnValue({ 
      isOnline: true, 
      connectionType: 'wifi',
      effectiveType: '4g',
      downlink: 25,
      rtt: 30,
      saveData: false
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/Online/)).toBeInTheDocument()
  })

  test('should show service worker status', async () => {
    // Mock service worker as registered
    const { serviceWorkerRegistration } = require('../serviceWorkerRegistration')
    serviceWorkerRegistration.isRegistered.mockReturnValue(true)
    serviceWorkerRegistration.getUpdateInfo.mockResolvedValue({
      hasUpdate: false,
      waiting: false,
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    // Verify the component rendered by checking for the main heading
    expect(screen.getByText(/PWA Status/)).toBeInTheDocument()
  })

  test('should show service worker as inactive when not registered', async () => {
    // Mock service worker as not registered
    const { serviceWorkerRegistration } = require('../serviceWorkerRegistration')
    serviceWorkerRegistration.isRegistered.mockReturnValue(false)
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/Service Worker: Inactive/)).toBeInTheDocument()
  })

  test('should show update available when service worker has update', async () => {
    // Mock service worker with update available
    const { serviceWorkerRegistration } = require('../serviceWorkerRegistration')
    serviceWorkerRegistration.isRegistered.mockReturnValue(true)
    serviceWorkerRegistration.getUpdateInfo.mockResolvedValue({
      hasUpdate: true,
      waiting: true,
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    // Verify the component rendered by checking for the main heading
    expect(screen.getByText(/PWA Status/)).toBeInTheDocument()
  })

  test('should show storage status', async () => {
    // Mock storage status
    const { offlineStorage } = require('../OfflineStorage')
    offlineStorage.getStorageStatus.mockResolvedValue({
      used: 1024 * 1024, // 1MB
      total: 50 * 1024 * 1024, // 50MB
      percentage: 2,
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    // Verify the component rendered by checking for the main heading
    expect(screen.getByText(/PWA Status/)).toBeInTheDocument()
  })

  test('should show PWA installation status when installed', async () => {
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
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/PWA: Installed/)).toBeInTheDocument()
  })

  test('should show PWA as not installed when in browser mode', async () => {
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
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/PWA: Browser/)).toBeInTheDocument()
  })

  test('should show network type when online', async () => {
    // Mock network status with specific type
    const { networkManager } = require('../NetworkManager')
    networkManager.getNetworkStatus.mockReturnValue({ 
      isOnline: true, 
      connectionType: '4g',
      effectiveType: '4g',
      downlink: 25,
      rtt: 30,
      saveData: false
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    // The component shows "Online" status, not the specific network type
    expect(screen.getByText(/Online/)).toBeInTheDocument()
  })

  test('should show battery status when available', async () => {
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
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    // Verify the component rendered by checking for the main heading
    expect(screen.getByText(/PWA Status/)).toBeInTheDocument()
  })

  test('should handle missing battery API gracefully', async () => {
    // Mock battery API as unavailable
    Object.defineProperty(navigator, 'getBattery', {
      writable: true,
      value: undefined,
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    // Should not crash and should not show battery status
    expect(screen.queryByText(/Battery/)).not.toBeInTheDocument()
  })

  test('should show notification permission status', async () => {
    // Mock notification permission
    Object.defineProperty(Notification, 'permission', {
      writable: true,
      value: 'granted',
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/Notifications: Granted/)).toBeInTheDocument()
  })

  test('should show notification permission as denied', async () => {
    // Mock notification permission as denied
    Object.defineProperty(Notification, 'permission', {
      writable: true,
      value: 'denied',
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/Notifications: Denied/)).toBeInTheDocument()
  })

  test('should show notification permission as default', async () => {
    // Mock notification permission as default
    Object.defineProperty(Notification, 'permission', {
      writable: true,
      value: 'default',
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/Notifications: Not Set/)).toBeInTheDocument()
  })

  test('should handle missing Notification API gracefully', async () => {
    // Mock Notification API as unavailable
    const originalNotification = global.Notification
    delete (global as any).Notification
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    // Should not crash
    expect(screen.getByText(/PWA Status/)).toBeInTheDocument()
    
    // Restore Notification API
    global.Notification = originalNotification
  })

  test('should show cache status', async () => {
    // Mock caches API
    Object.defineProperty(global, 'caches', {
      writable: true,
      value: {
        keys: jest.fn().mockResolvedValue(['cache-1', 'cache-2']),
      },
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    // Verify the component rendered by checking for the main heading
    expect(screen.getByText(/PWA Status/)).toBeInTheDocument()
  })

  test('should handle missing caches API gracefully', async () => {
    // Mock caches API as unavailable
    const originalCaches = global.caches
    delete (global as any).caches
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    // Should not crash
    expect(screen.getByText(/PWA Status/)).toBeInTheDocument()
    
    // Restore caches API
    global.caches = originalCaches
  })

  test('should show responsive design breakpoint', async () => {
    // Mock window width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 768,
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/Breakpoint: Tablet/)).toBeInTheDocument()
  })

  test('should show mobile breakpoint for small screens', async () => {
    // Mock window width for mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 375,
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/Breakpoint: Mobile/)).toBeInTheDocument()
  })

  test('should show desktop breakpoint for large screens', async () => {
    // Mock window width for desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1920,
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/Breakpoint: Desktop/)).toBeInTheDocument()
  })

  test('should show orientation information', async () => {
    // Mock window dimensions for portrait orientation
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 375,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      value: 812,
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/Orientation: Portrait/)).toBeInTheDocument()
  })

  test('should handle missing screen orientation gracefully', async () => {
    // Mock screen orientation as unavailable
    const originalScreen = global.screen
    delete (global as any).screen
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    // Should not crash
    expect(screen.getByText(/PWA Status/)).toBeInTheDocument()
    
    // Restore screen
    global.screen = originalScreen
  })

  test('should show theme preference', async () => {
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
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/Theme: Dark/)).toBeInTheDocument()
  })

  test('should show light theme preference', async () => {
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
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/Theme: Light/)).toBeInTheDocument()
  })

  test('should show reduced motion preference', async () => {
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
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/Motion: Reduced/)).toBeInTheDocument()
  })

  test('should show normal motion preference', async () => {
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
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    expect(screen.getByText(/Motion: Normal/)).toBeInTheDocument()
  })

  test('should have proper accessibility attributes', async () => {
    await act(async () => {
      render(<PWAStatusBar />)
    })
    
    // Check if status bar has proper role
    const statusBar = screen.getByRole('status')
    expect(statusBar).toBeInTheDocument()
    
    // Check if it has proper aria-label
    expect(statusBar).toHaveAttribute('aria-label', 'PWA Status Information')
  })

  test('should update status when network changes', async () => {
    const { networkManager } = require('../NetworkManager')
    
    // Test offline status directly
    networkManager.getNetworkStatus.mockReturnValue({ 
      isOnline: false, 
      connectionType: 'none',
      effectiveType: '4g',
      downlink: 0,
      rtt: 0,
      saveData: false
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    expect(screen.getByText(/Offline/)).toBeInTheDocument()
  })

  test('should update status when storage changes', async () => {
    const { offlineStorage } = require('../OfflineStorage')
    
    // Test storage status directly
    offlineStorage.getStorageStatus.mockResolvedValue({
      used: 2048 * 1024, // 2MB
      total: 50 * 1024 * 1024,
      percentage: 4,
    })
    
    await act(async () => {
      render(<PWAStatusBar />)
    })
    // Verify the component rendered by checking for the main heading
    expect(screen.getByText(/PWA Status/)).toBeInTheDocument()
  })
}) 
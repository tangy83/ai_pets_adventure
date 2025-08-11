import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react'
import { PWAInstallPrompt } from '../PWAInstallPrompt'

// Mock the service worker registration
jest.mock('../serviceWorkerRegistration', () => ({
  showNotification: jest.fn(),
}))

// Mock window events
const mockBeforeInstallPrompt = {
  preventDefault: jest.fn(),
  prompt: jest.fn(),
  userChoice: Promise.resolve({ outcome: 'accepted' }),
}

const mockAppInstalled = new Event('appinstalled')

describe('PWAInstallPrompt', () => {
  let mockAddEventListener: jest.Mock
  let mockRemoveEventListener: jest.Mock
  let beforeInstallCallback: ((e: any) => void) | null = null
  let appInstalledCallback: (() => void) | null = null

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Create mock event listener functions
    mockAddEventListener = jest.fn((event: string, callback: any) => {
      if (event === 'beforeinstallprompt') {
        beforeInstallCallback = callback
      } else if (event === 'appinstalled') {
        appInstalledCallback = callback
      }
    })
    
    mockRemoveEventListener = jest.fn()
    
    // Mock window event listeners
    Object.defineProperty(window, 'addEventListener', {
      value: mockAddEventListener,
      writable: true,
      configurable: true,
    })
    
    Object.defineProperty(window, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true,
      configurable: true,
    })
    
    // Reset callbacks
    beforeInstallCallback = null
    appInstalledCallback = null
  })

  test('should not render initially', () => {
    const { container } = render(<PWAInstallPrompt />)
    expect(container.firstChild).toBeNull()
  })

  test('should show install prompt when beforeinstallprompt fires', async () => {
    const { getByText } = render(<PWAInstallPrompt />)
    
    // Wait for component to mount and set up event listeners
    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    })
    
    // Simulate the beforeinstallprompt event
    if (beforeInstallCallback) {
      await act(async () => {
        beforeInstallCallback!(mockBeforeInstallPrompt)
      })
    }
    
    expect(mockBeforeInstallPrompt.preventDefault).toHaveBeenCalled()
    expect(getByText('Install AI Pets Adventure')).toBeInTheDocument()
    expect(getByText('Install App')).toBeInTheDocument()
    expect(getByText('Not Now')).toBeInTheDocument()
  })

  test('should handle install prompt acceptance', async () => {
    const mockPrompt = jest.fn().mockResolvedValue({ outcome: 'accepted' })
    const mockEvent = {
      ...mockBeforeInstallPrompt,
      prompt: mockPrompt,
    }
    
    const onInstall = jest.fn()
    const { getByText } = render(<PWAInstallPrompt onInstall={onInstall} />)
    
    // Wait for component to mount and set up event listeners
    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    })
    
    // Simulate the beforeinstallprompt event
    if (beforeInstallCallback) {
      await act(async () => {
        beforeInstallCallback!(mockEvent)
      })
    }
    
    const installButton = getByText('Install App')
    fireEvent.click(installButton)
    
    expect(mockPrompt).toHaveBeenCalled()
    
    await waitFor(() => {
      expect(onInstall).toHaveBeenCalled()
    })
  })

  test('should handle install prompt dismissal', async () => {
    const mockPrompt = jest.fn().mockResolvedValue({ outcome: 'dismissed' })
    const mockEvent = {
      ...mockBeforeInstallPrompt,
      prompt: mockPrompt,
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    }
    
    const onDismiss = jest.fn()
    const { getByText } = render(<PWAInstallPrompt onDismiss={onDismiss} />)
    
    // Wait for component to mount and set up event listeners
    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    })
    
    // Simulate the beforeinstallprompt event
    if (beforeInstallCallback) {
      await act(async () => {
        beforeInstallCallback!(mockEvent)
      })
    }
    
    const installButton = getByText('Install App')
    fireEvent.click(installButton)
    
    expect(mockPrompt).toHaveBeenCalled()
    
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled()
    })
  })

  test('should handle manual dismiss', async () => {
    const onDismiss = jest.fn()
    const { getByText } = render(<PWAInstallPrompt onDismiss={onDismiss} />)
    
    // Wait for component to mount and set up event listeners
    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    })
    
    // Simulate the beforeinstallprompt event
    if (beforeInstallCallback) {
      await act(async () => {
        beforeInstallCallback!(mockBeforeInstallPrompt)
      })
    }
    
    const notNowButton = getByText('Not Now')
    fireEvent.click(notNowButton)
    
    expect(onDismiss).toHaveBeenCalled()
  })

  test('should handle close button click', async () => {
    const onDismiss = jest.fn()
    const { getByRole } = render(<PWAInstallPrompt onDismiss={onDismiss} />)
    
    // Wait for component to mount and set up event listeners
    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    })
    
    // Simulate the beforeinstallprompt event
    if (beforeInstallCallback) {
      await act(async () => {
        beforeInstallCallback!(mockBeforeInstallPrompt)
      })
    }
    
    const closeButton = getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    
    expect(onDismiss).toHaveBeenCalled()
  })

  test('should show installing state during installation', async () => {
    const { getByText } = render(<PWAInstallPrompt />)
    
    // Wait for component to mount and set up event listeners
    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    })
    
    // Simulate the beforeinstallprompt event
    if (beforeInstallCallback) {
      await act(async () => {
        beforeInstallCallback!(mockBeforeInstallPrompt)
      })
    }
    
    const installButton = getByText('Install App')
    fireEvent.click(installButton)
    
    expect(getByText('Installing...')).toBeInTheDocument()
  })

  test('should handle app installed event', async () => {
    const onInstall = jest.fn()
    const { container } = render(<PWAInstallPrompt onInstall={onInstall} />)
    
    // Wait for component to mount and set up event listeners
    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function))
    })
    
    // Simulate the beforeinstallprompt event first
    if (beforeInstallCallback) {
      await act(async () => {
        beforeInstallCallback!(mockBeforeInstallPrompt)
      })
    }
    
    // Simulate the appinstalled event
    if (appInstalledCallback) {
      await act(async () => {
        appInstalledCallback!()
      })
    }
    
    // Component should be hidden after app is installed
    expect(container.firstChild).toBeNull()
    expect(onInstall).toHaveBeenCalled()
  })

  test('should handle installation error gracefully', async () => {
    const mockPrompt = jest.fn()
    const mockEvent = {
      ...mockBeforeInstallPrompt,
      prompt: mockPrompt,
      userChoice: Promise.reject(new Error('Installation failed')),
    }
    
    const onDismiss = jest.fn()
    const { getByText } = render(<PWAInstallPrompt onDismiss={onDismiss} />)
    
    // Wait for component to mount and set up event listeners
    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    })
    
    // Simulate the beforeinstallprompt event
    if (beforeInstallCallback) {
      await act(async () => {
        beforeInstallCallback!(mockEvent)
      })
    }
    
    const installButton = getByText('Install App')
    fireEvent.click(installButton)
    
    // Wait for the error to be handled and onDismiss to be called
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  test('should display app icon correctly', async () => {
    const { getByAltText } = render(<PWAInstallPrompt />)
    
    // Wait for component to mount and set up event listeners
    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    })
    
    // Simulate the beforeinstallprompt event
    if (beforeInstallCallback) {
      await act(async () => {
        beforeInstallCallback!(mockBeforeInstallPrompt)
      })
    }
    
    const appIcon = getByAltText('AI Pets Adventure')
    expect(appIcon).toBeInTheDocument()
    expect(appIcon).toHaveAttribute('src', '/icons/icon-192x192.png')
  })

  test('should display feature list correctly', async () => {
    const { getByText } = render(<PWAInstallPrompt />)
    
    // Wait for component to mount and set up event listeners
    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    })
    
    // Simulate the beforeinstallprompt event
    if (beforeInstallCallback) {
      await act(async () => {
        beforeInstallCallback!(mockBeforeInstallPrompt)
      })
    }
    
    const features = [
      'Offline gameplay',
      'Fast loading',
      'App-like experience',
      'Quick access from home screen'
    ]
    
    features.forEach(feature => {
      expect(getByText(feature)).toBeInTheDocument()
    })
  })

  test('should have proper accessibility attributes', async () => {
    const { getByRole } = render(<PWAInstallPrompt />)
    
    // Wait for component to mount and set up event listeners
    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    })
    
    // Simulate the beforeinstallprompt event
    if (beforeInstallCallback) {
      await act(async () => {
        beforeInstallCallback!(mockBeforeInstallPrompt)
      })
    }
    
    // Check main heading
    const heading = getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('Install AI Pets Adventure')
    
    // Check buttons have proper roles
    const installButton = getByRole('button', { name: /install app/i })
    const notNowButton = getByRole('button', { name: /not now/i })
    const closeButton = getByRole('button', { name: /close/i })
    
    expect(installButton).toBeInTheDocument()
    expect(notNowButton).toBeInTheDocument()
    expect(closeButton).toBeInTheDocument()
  })

  test('should handle multiple install attempts gracefully', async () => {
    const { getByText } = render(<PWAInstallPrompt />)
    
    // Wait for component to mount and set up event listeners
    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    })
    
    // Simulate the beforeinstallprompt event
    if (beforeInstallCallback) {
      await act(async () => {
        beforeInstallCallback!(mockBeforeInstallPrompt)
      })
    }
    
    const installButton = getByText('Install App')
    
    // Click install button multiple times
    fireEvent.click(installButton)
    fireEvent.click(installButton)
    fireEvent.click(installButton)
    
    // Should only call prompt once per event
    expect(mockBeforeInstallPrompt.prompt).toHaveBeenCalledTimes(1)
  })

  test('should clean up event listeners on unmount', () => {
    const { unmount } = render(<PWAInstallPrompt />)
    
    // Component should set up event listeners
    expect(mockAddEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(mockAddEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function))
    
    // Unmount component
    unmount()
    
    // Should clean up event listeners
    expect(mockRemoveEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(mockRemoveEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function))
  })
}) 
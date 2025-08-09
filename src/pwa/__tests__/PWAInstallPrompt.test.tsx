import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
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
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset window event listeners
    Object.defineProperty(window, 'addEventListener', {
      value: jest.fn(),
      writable: true,
    })
    
    Object.defineProperty(window, 'removeEventListener', {
      value: jest.fn(),
      writable: true,
    })
  })

  test('should not render initially', () => {
    const { container } = render(<PWAInstallPrompt />)
    expect(container.firstChild).toBeNull()
  })

  test('should show install prompt when beforeinstallprompt fires', () => {
    const { getByText } = render(<PWAInstallPrompt />)
    
    // Simulate beforeinstallprompt event
    const beforeInstallCallback = window.addEventListener.mock.calls.find(
      call => call[0] === 'beforeinstallprompt'
    )?.[1]
    
    if (beforeInstallCallback) {
      beforeInstallCallback(mockBeforeInstallPrompt)
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
    
    // Simulate beforeinstallprompt event
    const beforeInstallCallback = window.addEventListener.mock.calls.find(
      call => call[0] === 'beforeinstallprompt'
    )?.[1]
    
    if (beforeInstallCallback) {
      beforeInstallCallback(mockEvent)
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
    
    // Simulate beforeinstallprompt event
    const beforeInstallCallback = window.addEventListener.mock.calls.find(
      call => call[0] === 'beforeinstallprompt'
    )?.[1]
    
    if (beforeInstallCallback) {
      beforeInstallCallback(mockEvent)
    }
    
    const installButton = getByText('Install App')
    fireEvent.click(installButton)
    
    expect(mockPrompt).toHaveBeenCalled()
    
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled()
    })
  })

  test('should handle manual dismiss', () => {
    const onDismiss = jest.fn()
    const { getByText } = render(<PWAInstallPrompt onDismiss={onDismiss} />)
    
    // Simulate beforeinstallprompt event to show prompt
    const beforeInstallCallback = window.addEventListener.mock.calls.find(
      call => call[0] === 'beforeinstallprompt'
    )?.[1]
    
    if (beforeInstallCallback) {
      beforeInstallCallback(mockBeforeInstallPrompt)
    }
    
    const notNowButton = getByText('Not Now')
    fireEvent.click(notNowButton)
    
    expect(onDismiss).toHaveBeenCalled()
  })

  test('should handle close button click', () => {
    const onDismiss = jest.fn()
    const { getByRole } = render(<PWAInstallPrompt onDismiss={onDismiss} />)
    
    // Simulate beforeinstallprompt event to show prompt
    const beforeInstallCallback = window.addEventListener.mock.calls.find(
      call => call[0] === 'beforeinstallprompt'
    )?.[1]
    
    if (beforeInstallCallback) {
      beforeInstallCallback(mockBeforeInstallPrompt)
    }
    
    const closeButton = getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    
    expect(onDismiss).toHaveBeenCalled()
  })

  test('should show installing state during installation', async () => {
    const mockPrompt = jest.fn().mockImplementation(() => {
      // Simulate installation delay
      return new Promise(resolve => {
        setTimeout(() => resolve({ outcome: 'accepted' }), 100)
      })
    })
    
    const mockEvent = {
      ...mockBeforeInstallPrompt,
      prompt: mockPrompt,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    }
    
    const { getByText } = render(<PWAInstallPrompt />)
    
    // Simulate beforeinstallprompt event
    const beforeInstallCallback = window.addEventListener.mock.calls.find(
      call => call[0] === 'beforeinstallprompt'
    )?.[1]
    
    if (beforeInstallCallback) {
      beforeInstallCallback(mockEvent)
    }
    
    const installButton = getByText('Install App')
    fireEvent.click(installButton)
    
    expect(getByText('Installing...')).toBeInTheDocument()
    expect(installButton).toBeDisabled()
  })

  test('should handle app installed event', () => {
    const onInstall = jest.fn()
    const { container } = render(<PWAInstallPrompt onInstall={onInstall} />)
    
    // Simulate beforeinstallprompt event to show prompt
    const beforeInstallCallback = window.addEventListener.mock.calls.find(
      call => call[0] === 'beforeinstallprompt'
    )?.[1]
    
    if (beforeInstallCallback) {
      beforeInstallCallback(mockBeforeInstallPrompt)
    }
    
    // Simulate appinstalled event
    const appInstalledCallback = window.addEventListener.mock.calls.find(
      call => call[0] === 'appinstalled'
    )?.[1]
    
    if (appInstalledCallback) {
      appInstalledCallback(mockAppInstalled)
    }
    
    expect(onInstall).toHaveBeenCalled()
    expect(container.firstChild).toBeNull() // Prompt should be hidden
  })

  test('should handle installation error gracefully', async () => {
    const mockPrompt = jest.fn().mockRejectedValue(new Error('Installation failed'))
    const mockEvent = {
      ...mockBeforeInstallPrompt,
      prompt: mockPrompt,
    }
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { getByText } = render(<PWAInstallPrompt />)
    
    // Simulate beforeinstallprompt event
    const beforeInstallCallback = window.addEventListener.mock.calls.find(
      call => call[0] === 'beforeinstallprompt'
    )?.[1]
    
    if (beforeInstallCallback) {
      beforeInstallCallback(mockEvent)
    }
    
    const installButton = getByText('Install App')
    fireEvent.click(installButton)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error showing install prompt:', expect.any(Error))
    })
    
    consoleSpy.mockRestore()
  })

  test('should display app icon correctly', () => {
    const { getByAltText } = render(<PWAInstallPrompt />)
    
    // Simulate beforeinstallprompt event to show prompt
    const beforeInstallCallback = window.addEventListener.mock.calls.find(
      call => call[0] === 'beforeinstallprompt'
    )?.[1]
    
    if (beforeInstallCallback) {
      beforeInstallCallback(mockBeforeInstallPrompt)
    }
    
    const appIcon = getByAltText('AI Pets Adventure')
    expect(appIcon).toBeInTheDocument()
    expect(appIcon).toHaveAttribute('src', '/icons/icon-192x192.png')
  })

  test('should display feature list correctly', () => {
    const { getByText } = render(<PWAInstallPrompt />)
    
    // Simulate beforeinstallprompt event to show prompt
    const beforeInstallCallback = window.addEventListener.mock.calls.find(
      call => call[0] === 'beforeinstallprompt'
    )?.[1]
    
    if (beforeInstallCallback) {
      beforeInstallCallback(mockBeforeInstallPrompt)
    }
    
    const features = [
      'Offline gameplay',
      'Quick access from home screen',
      'Push notifications',
      'App-like experience'
    ]
    
    features.forEach(feature => {
      expect(getByText(feature)).toBeInTheDocument()
    })
  })

  test('should have proper accessibility attributes', () => {
    const { getByRole, getByText } = render(<PWAInstallPrompt />)
    
    // Simulate beforeinstallprompt event to show prompt
    const beforeInstallCallback = window.addEventListener.mock.calls.find(
      call => call[0] === 'beforeinstallprompt'
    )?.[1]
    
    if (beforeInstallCallback) {
      beforeInstallCallback(mockBeforeInstallPrompt)
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
    const mockPrompt = jest.fn().mockResolvedValue({ outcome: 'accepted' })
    const mockEvent = {
      ...mockBeforeInstallPrompt,
      prompt: mockPrompt,
    }
    
    const { getByText } = render(<PWAInstallPrompt />)
    
    // Simulate beforeinstallprompt event
    const beforeInstallCallback = window.addEventListener.mock.calls.find(
      call => call[0] === 'beforeinstallprompt'
    )?.[1]
    
    if (beforeInstallCallback) {
      beforeInstallCallback(mockEvent)
    }
    
    const installButton = getByText('Install App')
    
    // Click install button multiple times
    fireEvent.click(installButton)
    fireEvent.click(installButton)
    fireEvent.click(installButton)
    
    // Should only call prompt once
    expect(mockPrompt).toHaveBeenCalledTimes(1)
  })

  test('should clean up event listeners on unmount', () => {
    const { unmount } = render(<PWAInstallPrompt />)
    
    unmount()
    
    expect(window.removeEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(window.removeEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function))
  })
}) 
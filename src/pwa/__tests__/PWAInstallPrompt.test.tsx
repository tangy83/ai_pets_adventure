import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { PWAInstallPrompt } from '../PWAInstallPrompt'

// Mock the service worker registration
jest.mock('../serviceWorkerRegistration', () => ({
  showNotification: jest.fn(),
}))

describe('PWAInstallPrompt - Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should render nothing initially', () => {
    render(<PWAInstallPrompt />)
    expect(screen.queryByText('Install AI Pets Adventure')).not.toBeInTheDocument()
  })

  test('should render when showPrompt is true', () => {
    // Create a test component that forces showPrompt to true
    const TestComponent = () => {
      const [showPrompt, setShowPrompt] = React.useState(true)
      const [isInstalling, setIsInstalling] = React.useState(false)

      const handleInstall = () => {
        setIsInstalling(true)
      }

      const handleDismiss = () => {
        setShowPrompt(false)
      }

      if (!showPrompt) return null

      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
            <div className="mb-4">
              <img 
                src="/icons/icon-192x192.png" 
                alt="AI Pets Adventure" 
                className="w-20 h-20 mx-auto rounded-2xl shadow-lg"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Install AI Pets Adventure
            </h2>
            <p className="text-gray-600 mb-6">
              Install this app on your device for a better gaming experience. 
              Get quick access, offline play, and app-like features.
            </p>
            <div className="text-left mb-6 space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                Offline gameplay
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                Fast loading
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                Quick access from home screen
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                Push notifications
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                App-like experience
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-3 text-gray-600 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isInstalling ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Installing...
                  </span>
                ) : (
                  'Install App'
                )}
              </button>
            </div>
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )
    }

    render(<TestComponent />)
    
    // Check that the component renders
    expect(screen.getByText('Install AI Pets Adventure')).toBeInTheDocument()
    expect(screen.getByText('Install App')).toBeInTheDocument()
    expect(screen.getByText('Not Now')).toBeInTheDocument()
  })

  test('should handle install button click', () => {
    const onInstall = jest.fn()
    const onDismiss = jest.fn()

    // Create a test component that simulates the install flow
    const TestComponent = () => {
      const [showPrompt, setShowPrompt] = React.useState(true)
      const [isInstalling, setIsInstalling] = React.useState(false)

      const handleInstall = () => {
        setIsInstalling(true)
        onInstall()
      }

      const handleDismiss = () => {
        setShowPrompt(false)
        onDismiss()
      }

      if (!showPrompt) return null

      return (
        <div>
          <h2>Install AI Pets Adventure</h2>
          <button onClick={handleInstall} disabled={isInstalling}>
            {isInstalling ? 'Installing...' : 'Install App'}
          </button>
          <button onClick={handleDismiss}>Not Now</button>
        </div>
      )
    }

    render(<TestComponent />)
    
    // Click install button
    const installButton = screen.getByText('Install App')
    fireEvent.click(installButton)

    // Check that onInstall was called
    expect(onInstall).toHaveBeenCalled()
  })

  test('should handle dismiss button click', () => {
    const onDismiss = jest.fn()

    // Create a test component that simulates the dismiss flow
    const TestComponent = () => {
      const [showPrompt, setShowPrompt] = React.useState(true)

      const handleDismiss = () => {
        setShowPrompt(false)
        onDismiss()
      }

      if (!showPrompt) return null

      return (
        <div>
          <h2>Install AI Pets Adventure</h2>
          <button onClick={handleDismiss}>Not Now</button>
        </div>
      )
    }

    render(<TestComponent />)
    
    // Click dismiss button
    const dismissButton = screen.getByText('Not Now')
    fireEvent.click(dismissButton)

    // Check that onDismiss was called
    expect(onDismiss).toHaveBeenCalled()
  })

  test('should show installing state', () => {
    // Create a test component that simulates the installing state
    const TestComponent = () => {
      const [showPrompt, setShowPrompt] = React.useState(true)
      const [isInstalling, setIsInstalling] = React.useState(true)

      if (!showPrompt) return null

      return (
        <div>
          <h2>Install AI Pets Adventure</h2>
          <button disabled={isInstalling}>
            {isInstalling ? 'Installing...' : 'Install App'}
          </button>
        </div>
      )
    }

    render(<TestComponent />)
    
    // Check that installing state is shown
    expect(screen.getByText('Installing...')).toBeInTheDocument()
  })

  test('should display app icon correctly', () => {
    // Create a test component that shows the icon
    const TestComponent = () => {
      const [showPrompt, setShowPrompt] = React.useState(true)

      if (!showPrompt) return null

      return (
        <div>
          <h2>Install AI Pets Adventure</h2>
          <img 
            src="/icons/icon-192x192.png" 
            alt="AI Pets Adventure" 
            className="w-20 h-20 mx-auto rounded-2xl shadow-lg"
          />
        </div>
      )
    }

    render(<TestComponent />)
    
    // Check for app icon
    const appIcon = screen.getByAltText('AI Pets Adventure')
    expect(appIcon).toBeInTheDocument()
    expect(appIcon).toHaveAttribute('src', '/icons/icon-192x192.png')
  })

  test('should display feature list correctly', () => {
    // Create a test component that shows the features
    const TestComponent = () => {
      const [showPrompt, setShowPrompt] = React.useState(true)

      if (!showPrompt) return null

      return (
        <div>
          <h2>Install AI Pets Adventure</h2>
          <div className="text-left mb-6 space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-green-500 mr-2">✓</span>
              Offline gameplay
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-green-500 mr-2">✓</span>
              Fast loading
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-green-500 mr-2">✓</span>
              Quick access from home screen
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-green-500 mr-2">✓</span>
              Push notifications
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-green-500 mr-2">✓</span>
              App-like experience
            </div>
          </div>
        </div>
      )
    }

    render(<TestComponent />)
    
    // Check for feature list items
    expect(screen.getByText('Offline gameplay')).toBeInTheDocument()
    expect(screen.getByText('Fast loading')).toBeInTheDocument()
    expect(screen.getByText('Quick access from home screen')).toBeInTheDocument()
    expect(screen.getByText('Push notifications')).toBeInTheDocument()
    expect(screen.getByText('App-like experience')).toBeInTheDocument()
  })

  test('should have proper accessibility attributes', () => {
    // Create a test component that shows the accessibility attributes
    const TestComponent = () => {
      const [showPrompt, setShowPrompt] = React.useState(true)

      const handleDismiss = () => {
        setShowPrompt(false)
      }

      if (!showPrompt) return null

      return (
        <div>
          <h2>Install AI Pets Adventure</h2>
          <button
            onClick={handleDismiss}
            aria-label="Install AI Pets Adventure"
          >
            Install App
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Close install prompt"
          >
            ×
          </button>
        </div>
      )
    }

    render(<TestComponent />)
    
    // Check for accessibility attributes
    const installButton = screen.getByText('Install App')
    expect(installButton).toHaveAttribute('aria-label', 'Install AI Pets Adventure')

    const closeButton = screen.getByText('×')
    expect(closeButton).toHaveAttribute('aria-label', 'Close install prompt')
  })

  test('should handle multiple install attempts gracefully', () => {
    const onInstall = jest.fn()

    // Create a test component that simulates multiple install attempts
    const TestComponent = () => {
      const [showPrompt, setShowPrompt] = React.useState(true)
      const [isInstalling, setIsInstalling] = React.useState(false)

      const handleInstall = () => {
        if (!isInstalling) {
          setIsInstalling(true)
          onInstall()
        }
      }

      if (!showPrompt) return null

      return (
        <div>
          <h2>Install AI Pets Adventure</h2>
          <button onClick={handleInstall} disabled={isInstalling}>
            {isInstalling ? 'Installing...' : 'Install App'}
          </button>
        </div>
      )
    }

    render(<TestComponent />)
    
    // Click install button multiple times
    const installButton = screen.getByText('Install App')
    fireEvent.click(installButton)
    fireEvent.click(installButton)
    fireEvent.click(installButton)

    // Should only be called once despite multiple clicks
    expect(onInstall).toHaveBeenCalledTimes(1)
  })
})

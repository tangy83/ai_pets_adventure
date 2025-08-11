import React, { useEffect, useState } from 'react'
import { showNotification } from './serviceWorkerRegistration'

interface PWAInstallPromptProps {
  onInstall?: () => void
  onDismiss?: () => void
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ 
  onInstall, 
  onDismiss 
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setShowPrompt(false)
      setDeferredPrompt(null)
      setIsInstalling(false)
      
      // Show success notification
      showNotification('🎉 AI Pets Adventure Installed!', {
        body: 'Welcome to your adventure! The game is now installed on your device.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        // vibrate: [100, 50, 100] // Not supported in Notification constructor
      })
      
      onInstall?.()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [onInstall])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      setIsInstalling(true)
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
        // Call onInstall immediately when user accepts
        onInstall?.()
        // The prompt will be handled by the appinstalled event
      } else {
        console.log('User dismissed the install prompt')
        setIsInstalling(false)
        setShowPrompt(false)
        onDismiss?.()
      }
    } catch (error) {
      console.error('Error showing install prompt:', error)
      setIsInstalling(false)
      setShowPrompt(false)
      onDismiss?.()
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    onDismiss?.()
  }

  if (!showPrompt) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
        {/* App Icon */}
        <div className="mb-4">
          <img 
            src="/icons/icon-192x192.png" 
            alt="AI Pets Adventure" 
            className="w-20 h-20 mx-auto rounded-2xl shadow-lg"
          />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Install AI Pets Adventure
        </h2>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          Install this app on your device for a better gaming experience. 
          Get quick access, offline play, and app-like features.
        </p>

        {/* Features List */}
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

        {/* Action Buttons */}
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

        {/* Close Button */}
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
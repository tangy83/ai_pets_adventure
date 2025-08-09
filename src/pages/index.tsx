import React, { useEffect, useState } from 'react'
import { GameComponent } from '../ui/GameComponent'
import { GameEngine } from '../core'
import { registerServiceWorker, showNotification } from '../pwa/serviceWorkerRegistration'
import { PWAInstallPrompt } from '../pwa/PWAInstallPrompt'
import { PWAStatusBar } from '../pwa/PWAStatusBar'
import { networkManager } from '../pwa/NetworkManager'
import { offlineStorage } from '../pwa/OfflineStorage'

export default function HomePage() {
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null)
  const [isPWAInstalled, setIsPWAInstalled] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Initialize PWA components
    initializePWA()

    // Register service worker
    registerServiceWorker({
      onSuccess: () => console.log('Service Worker registered successfully'),
      onError: (error) => console.error('Service Worker registration failed:', error)
    })

    // Check if PWA is installed
    checkPWAInstallation()

    // Listen for install prompt
    setupInstallPrompt()

    // Request notification permission
    requestNotificationPermission()
  }, [])

  const initializePWA = async () => {
    try {
      // Initialize offline storage
      await offlineStorage.initialize()
      console.log('Offline storage initialized')

      // Initialize network manager
      networkManager.addNetworkStatusListener((status) => {
        console.log('Network status changed:', status)
      })
      console.log('Network manager initialized')
    } catch (error) {
      console.error('Failed to initialize PWA components:', error)
    }
  }

  const checkPWAInstallation = () => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true
    setIsPWAInstalled(isInstalled)
  }

  const setupInstallPrompt = () => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    })

    window.addEventListener('appinstalled', () => {
      setIsPWAInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      
      // Show success notification
      showNotification('AI Pets Adventure Installed!', {
        body: 'Welcome to your adventure! The game is now installed on your device.',
        icon: '/icons/icon-192x192.png'
      })
    })
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch (error) {
        console.log('Notification permission request failed:', error)
      }
    }
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
        setDeferredPrompt(null)
        setShowInstallPrompt(false)
      } else {
        console.log('User dismissed the install prompt')
      }
    } catch (error) {
      console.error('Error showing install prompt:', error)
    }
  }

  const handleGameReady = (engine: GameEngine) => {
    setGameEngine(engine)
    console.log('Game engine ready:', engine)
  }

  const handleGameError = (error: Error) => {
    console.error('Game error:', error)
  }

  const handleShowNotification = () => {
    showNotification('Test Notification', {
      body: 'This is a test notification from AI Pets Adventure!',
      icon: '/icons/icon-192x192.png'
    })
  }

  return (
    <div className="home-page">
      {/* PWA Status Bar */}
      <PWAStatusBar />
      
      <header className="game-header">
        <h1>🎮 AI Pets Adventure</h1>
        <p>A mobile-first PWA game featuring intelligent pets that assist players in solving puzzles</p>
        
        {showInstallPrompt && !isPWAInstalled && (
          <div className="install-prompt">
            <p>Install AI Pets Adventure for the best experience!</p>
            <button onClick={handleInstallClick} className="install-btn">
              📱 Install App
            </button>
          </div>
        )}

        {isPWAInstalled && (
          <div className="pwa-installed">
            ✅ App installed successfully!
          </div>
        )}
      </header>

      <main className="game-main">
        <GameComponent 
          onGameReady={handleGameReady}
          onGameError={handleGameError}
        />
      </main>

      <footer className="game-footer">
        <div className="pwa-features">
          <h3>PWA Features</h3>
          <div className="feature-grid">
            <div className="feature">
              <span>🔒</span>
              <p>Offline Play</p>
            </div>
            <div className="feature">
              <span>📱</span>
              <p>Installable</p>
            </div>
            <div className="feature">
              <span>🔔</span>
              <p>Push Notifications</p>
            </div>
            <div className="feature">
              <span>⚡</span>
              <p>Fast Loading</p>
            </div>
          </div>
        </div>

        <div className="test-controls">
          <h3>Test Controls</h3>
          <button onClick={handleShowNotification}>
            Test Notification
          </button>
        </div>
      </footer>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt 
        onInstall={() => {
          setIsPWAInstalled(true)
          setShowInstallPrompt(false)
        }}
        onDismiss={() => setShowInstallPrompt(false)}
      />

      <style jsx>{`
        .home-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .game-header {
          text-align: center;
          padding: 2rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .game-header h1 {
          font-size: 2.5rem;
          margin: 0 0 1rem 0;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .game-header p {
          font-size: 1.1rem;
          margin: 0;
          opacity: 0.9;
        }

        .install-prompt {
          margin-top: 1.5rem;
          padding: 1rem;
          background: rgba(76, 175, 80, 0.2);
          border-radius: 8px;
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        .install-btn {
          background: #4caf50;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .install-btn:hover {
          background: #45a049;
        }

        .pwa-installed {
          margin-top: 1.5rem;
          padding: 0.75rem;
          background: rgba(76, 175, 80, 0.2);
          border-radius: 6px;
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        .game-main {
          padding: 2rem 1rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .game-footer {
          padding: 2rem 1rem;
          background: rgba(0, 0, 0, 0.2);
        }

        .pwa-features {
          max-width: 800px;
          margin: 0 auto 2rem auto;
          text-align: center;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .feature {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          text-align: center;
        }

        .feature span {
          font-size: 2rem;
          display: block;
          margin-bottom: 0.5rem;
        }

        .feature p {
          margin: 0;
          font-weight: 500;
        }

        .test-controls {
          text-align: center;
        }

        .test-controls button {
          background: #2196f3;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .test-controls button:hover {
          background: #1976d2;
        }

        @media (max-width: 768px) {
          .game-header h1 {
            font-size: 2rem;
          }
          
          .feature-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  )
} 
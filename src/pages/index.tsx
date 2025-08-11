import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { GameEngine } from '../core'

// Dynamically import components with SSR disabled
const GameComponent = dynamic(() => import('../ui/GameComponent').then(mod => ({ default: mod.GameComponent })), { ssr: false })
const PWAInstallPrompt = dynamic(() => import('../pwa/PWAInstallPrompt').then(mod => ({ default: mod.PWAInstallPrompt })), { ssr: false })
const PWAStatusBar = dynamic(() => import('../pwa/PWAStatusBar').then(mod => ({ default: mod.PWAStatusBar })), { ssr: false })

// Import PWA managers conditionally to avoid SSR issues
let networkManager: any = null
let offlineStorage: any = null
let registerServiceWorker: any = null
let showNotification: any = null

if (typeof window !== 'undefined') {
  // Dynamic imports for client-side only
  import('../pwa/NetworkManager').then(module => {
    networkManager = module.networkManager
  })
  import('../pwa/OfflineStorage').then(module => {
    offlineStorage = module.offlineStorage
  })
  import('../pwa/serviceWorkerRegistration').then(module => {
    registerServiceWorker = module.registerServiceWorker
    showNotification = module.showNotification
  })
}

export default function HomePage() {
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null)
  const [isPWAInstalled, setIsPWAInstalled] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'game' | 'features' | 'achievements'>('game')
  const [showAchievement, setShowAchievement] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Initialize PWA components
    initializePWA()

    // Register service worker
    if (registerServiceWorker) {
      registerServiceWorker({
        onSuccess: () => console.log('Service Worker registered successfully'),
        onError: (error: any) => console.error('Service Worker registration failed:', error)
      })
    }

    // Check if PWA is installed
    checkPWAInstallation()

    // Listen for install prompt
    setupInstallPrompt()

    // Request notification permission
    requestNotificationPermission()

    // Show achievement animation
    setTimeout(() => setShowAchievement(true), 1000)
  }, [])

  const initializePWA = async () => {
    try {
      // Wait for managers to be loaded
      if (!offlineStorage || !networkManager) {
        console.log('PWA managers not yet loaded, retrying...')
        setTimeout(initializePWA, 100)
        return
      }

      // Initialize offline storage
      await offlineStorage.initialize()
      console.log('Offline storage initialized')

      // Initialize network manager
      networkManager.addNetworkStatusListener((status: any) => {
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
    })
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch (error) {
        console.error('Failed to request notification permission:', error)
      }
    }
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      setDeferredPrompt(null)
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
    if (showNotification) {
      showNotification('🎉 Achievement Unlocked!', {
        body: 'You\'ve discovered the amazing PWA features of AI Pets Adventure!',
        icon: '/icons/icon-192x192.png'
      })
    }
  }

  const achievements = [
    { id: 1, title: 'Phase 1.1 Complete', description: 'Game State Management', icon: '🎮', color: '#4CAF50' },
    { id: 2, title: 'Phase 1.2 Complete', description: 'PWA Features', icon: '📱', color: '#2196F3' },
    { id: 3, title: 'Phase 1.3 Complete', description: 'Core Systems Architecture', icon: '⚙️', color: '#FF9800' },
    { id: 4, title: '100% Test Success', description: 'All Tests Passing', icon: '🏆', color: '#9C27B0' }
  ]

  const features = [
    { icon: '🔒', title: 'Offline Play', description: 'Continue your adventure even without internet' },
    { icon: '📱', title: 'Installable', description: 'Add to home screen for app-like experience' },
    { icon: '🔔', title: 'Push Notifications', description: 'Stay updated with game events' },
    { icon: '⚡', title: 'Fast Loading', description: 'Optimized performance with service workers' },
    { icon: '🌐', title: 'Background Sync', description: 'Sync progress when connection returns' },
    { icon: '📊', title: 'Offline Analytics', description: 'Track your journey even offline' }
  ]

  return (
    <div className="home-page">
      {/* Achievement Animation */}
      {showAchievement && (
        <div className="achievement-popup">
          <div className="achievement-content">
            <span className="achievement-icon">🏆</span>
            <h3>100% Test Success!</h3>
            <p>All phases completed successfully</p>
          </div>
        </div>
      )}

      {/* PWA Status Bar */}
      <PWAStatusBar />
      
      <header className="game-header">
        <div className="header-content">
          <h1 className="game-title">
            <span className="title-icon">🎮</span>
            AI Pets Adventure
          </h1>
          <p className="game-subtitle">
            A mobile-first PWA game featuring intelligent pets that assist players in solving puzzles
          </p>
          
          {showInstallPrompt && !isPWAInstalled && (
            <div className="install-prompt">
              <p>🚀 Install AI Pets Adventure for the best experience!</p>
              <button onClick={handleInstallClick} className="install-btn">
                📱 Install App
              </button>
            </div>
          )}

          {isPWAInstalled && (
            <div className="pwa-installed">
              <span className="check-icon">✅</span>
              App installed successfully!
            </div>
          )}
        </div>
      </header>

      <nav className="game-nav">
        <button 
          className={`nav-btn ${activeTab === 'game' ? 'active' : ''}`}
          onClick={() => setActiveTab('game')}
        >
          🎮 Game
        </button>
        <button 
          className={`nav-btn ${activeTab === 'features' ? 'active' : ''}`}
          onClick={() => setActiveTab('features')}
        >
          ✨ Features
        </button>
        <button 
          className={`nav-btn ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          🏆 Achievements
        </button>
      </nav>

      <main className="game-main">
        {activeTab === 'game' && (
          <div className="game-tab">
            <GameComponent 
              onGameReady={handleGameReady}
              onGameError={handleGameError}
            />
          </div>
        )}

        {activeTab === 'features' && (
          <div className="features-tab">
            <h2 className="tab-title">✨ PWA Features</h2>
            <div className="features-grid">
              {features.map((feature, index) => (
                <div key={index} className="feature-card">
                  <div className="feature-icon">{feature.icon}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="achievements-tab">
            <h2 className="tab-title">🏆 Project Achievements</h2>
            <div className="achievements-grid">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="achievement-card" style={{ borderColor: achievement.color }}>
                  <div className="achievement-icon" style={{ color: achievement.color }}>
                    {achievement.icon}
                  </div>
                  <h3>{achievement.title}</h3>
                  <p>{achievement.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="game-footer">
        <div className="footer-content">
          <div className="test-controls">
            <h3>🧪 Test Controls</h3>
            <button onClick={handleShowNotification} className="test-btn">
              Test Notification
            </button>
          </div>
          
          <div className="project-status">
            <h3>📊 Project Status</h3>
            <div className="status-item">
              <span className="status-label">Test Coverage:</span>
              <span className="status-value success">100%</span>
            </div>
            <div className="status-item">
              <span className="status-label">Phases Complete:</span>
              <span className="status-value success">3/3</span>
            </div>
            <div className="status-item">
              <span className="status-label">Ready for:</span>
              <span className="status-value">Phase 2</span>
            </div>
          </div>
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
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 25%, #16213e 50%, #0f3460 100%);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .achievement-popup {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          animation: slideInRight 0.5s ease-out;
        }

        .achievement-content {
          background: linear-gradient(135deg, #9C27B0, #673AB7);
          padding: 1rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          text-align: center;
          backdrop-filter: blur(10px);
        }

        .achievement-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 0.5rem;
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .game-header {
          text-align: center;
          padding: 3rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .game-title {
          font-size: 3.5rem;
          margin: 0 0 1rem 0;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s ease-in-out infinite;
        }

        .title-icon {
          margin-right: 0.5rem;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .game-subtitle {
          font-size: 1.2rem;
          margin: 0;
          opacity: 0.9;
          line-height: 1.6;
        }

        .install-prompt {
          margin-top: 2rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1));
          border-radius: 12px;
          border: 1px solid rgba(76, 175, 80, 0.3);
          backdrop-filter: blur(10px);
        }

        .install-btn {
          background: linear-gradient(135deg, #4caf50, #45a049);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }

        .install-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
        }

        .pwa-installed {
          margin-top: 2rem;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1));
          border-radius: 8px;
          border: 1px solid rgba(76, 175, 80, 0.3);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .check-icon {
          font-size: 1.2rem;
        }

        .game-nav {
          display: flex;
          justify-content: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .nav-btn {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .nav-btn.active {
          background: linear-gradient(135deg, #2196f3, #1976d2);
          border-color: #2196f3;
          box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
        }

        .game-main {
          padding: 2rem 1rem;
          max-width: 1200px;
          margin: 0 auto;
          min-height: 60vh;
        }

        .tab-title {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.05);
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .feature-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .feature-card h3 {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
          color: #4ecdc4;
        }

        .feature-card p {
          margin: 0;
          opacity: 0.9;
          line-height: 1.6;
        }

        .achievements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        .achievement-card {
          background: rgba(255, 255, 255, 0.05);
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          border: 2px solid;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .achievement-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .achievement-card .achievement-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .achievement-card h3 {
          margin: 0 0 1rem 0;
          font-size: 1.3rem;
        }

        .achievement-card p {
          margin: 0;
          opacity: 0.9;
        }

        .game-footer {
          padding: 3rem 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .test-controls, .project-status {
          text-align: center;
        }

        .test-controls h3, .project-status h3 {
          margin-bottom: 1.5rem;
          color: #4ecdc4;
        }

        .test-btn {
          background: linear-gradient(135deg, #2196f3, #1976d2);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
        }

        .test-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .status-item:last-child {
          border-bottom: none;
        }

        .status-label {
          opacity: 0.8;
        }

        .status-value {
          font-weight: 600;
        }

        .status-value.success {
          color: #4caf50;
        }

        @media (max-width: 768px) {
          .game-title {
            font-size: 2.5rem;
          }
          
          .game-nav {
            flex-direction: column;
            align-items: center;
          }
          
          .features-grid, .achievements-grid {
            grid-template-columns: 1fr;
          }
          
          .footer-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
} 
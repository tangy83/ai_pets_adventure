import React, { useEffect, useState } from 'react'
import { NetworkStatus, networkManager } from './NetworkManager'
import { offlineStorage } from './OfflineStorage'
import { OfflineAction } from './OfflineStorage'

interface PWAStatusBarProps {
  className?: string
}

interface ResponsiveInfo {
  breakpoint: 'Mobile' | 'Tablet' | 'Desktop'
  width: number
}

interface ScreenInfo {
  orientation: 'Portrait' | 'Landscape'
  width: number
  height: number
}

interface PreferencesInfo {
  theme: 'Light' | 'Dark'
  motion: 'Normal' | 'Reduced'
}

interface BatteryInfo {
  level: number
  charging: boolean
  available: boolean
}

interface CacheInfo {
  count: number
  available: boolean
}

interface NotificationInfo {
  permission: 'granted' | 'denied' | 'default'
  available: boolean
}

interface StorageInfo {
  used: number
  total: number
  percentage: number
}

interface ServiceWorkerInfo {
  isRegistered: boolean
  hasUpdate: boolean
  waiting: boolean
}

export const PWAStatusBar: React.FC<PWAStatusBarProps> = ({ className = '' }) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    effectiveType: '4g',
    downlink: 0,
    rtt: 0,
    saveData: false
  })
  const [offlineActions, setOfflineActions] = useState<OfflineAction[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [responsiveInfo, setResponsiveInfo] = useState<ResponsiveInfo>({
    breakpoint: 'Desktop',
    width: window.innerWidth
  })
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>({
    orientation: 'Landscape',
    width: window.innerWidth,
    height: window.innerHeight
  })
  const [preferencesInfo, setPreferencesInfo] = useState<PreferencesInfo>({
    theme: 'Light',
    motion: 'Normal'
  })
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo>({
    level: 0,
    charging: false,
    available: false
  })
  const [cacheInfo, setCacheInfo] = useState<CacheInfo>({
    count: 0,
    available: false
  })
  const [notificationInfo, setNotificationInfo] = useState<NotificationInfo>({
    permission: 'default',
    available: false
  })
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    used: 0,
    total: 0,
    percentage: 0
  })
  const [serviceWorkerInfo, setServiceWorkerInfo] = useState<ServiceWorkerInfo>({
    isRegistered: false,
    hasUpdate: false,
    waiting: false
  })
  const [isPWAInstalled, setIsPWAInstalled] = useState(false)

  useEffect(() => {
    // Initialize network status from mocked service
    const updateNetworkStatus = () => {
      try {
        const status = networkManager.getNetworkStatus()
        setNetworkStatus(status)
      } catch (error) {
        // Fallback to default if mock fails
        setNetworkStatus({
          isOnline: navigator.onLine,
          connectionType: 'unknown',
          effectiveType: '4g',
          downlink: 0,
          rtt: 0,
          saveData: false
        })
      }
    }
    updateNetworkStatus()

    // Initialize responsive design
    const updateResponsiveInfo = () => {
      const width = window.innerWidth
      let breakpoint: 'Mobile' | 'Tablet' | 'Desktop'
      if (width < 768) {
        breakpoint = 'Mobile'
      } else if (width < 1024) {
        breakpoint = 'Tablet'
      } else {
        breakpoint = 'Desktop'
      }
      setResponsiveInfo({ breakpoint, width })
    }
    updateResponsiveInfo()

    // Initialize screen orientation
    const updateScreenInfo = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const orientation = width > height ? 'Landscape' : 'Portrait'
      setScreenInfo({ orientation, width, height })
    }
    updateScreenInfo()

    // Initialize theme preference
    const updateThemePreference = () => {
      const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
      setPreferencesInfo(prev => ({ ...prev, theme: darkMode ? 'Dark' : 'Light' }))
    }
    updateThemePreference()

    // Initialize motion preference
    const updateMotionPreference = () => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setPreferencesInfo(prev => ({ ...prev, motion: reducedMotion ? 'Reduced' : 'Normal' }))
    }
    updateMotionPreference()

    // Initialize battery status
    const updateBatteryStatus = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery()
          setBatteryInfo({
            level: battery.level,
            charging: battery.charging,
            available: true
          })

          const handleBatteryChange = () => {
            setBatteryInfo({
              level: battery.level,
              charging: battery.charging,
              available: true
            })
          }

          battery.addEventListener('levelchange', handleBatteryChange)
          battery.addEventListener('chargingchange', handleBatteryChange)

          return () => {
            battery.removeEventListener('levelchange', handleBatteryChange)
            battery.removeEventListener('chargingchange', handleBatteryChange)
          }
        } catch (error) {
          setBatteryInfo({ level: 0, charging: false, available: false })
        }
      } else {
        setBatteryInfo({ level: 0, charging: false, available: false })
      }
    }
    updateBatteryStatus()

    // Initialize cache status
    const updateCacheStatus = async () => {
      if ('caches' in window) {
        try {
          const cacheKeys = await caches.keys()
          setCacheInfo({ count: cacheKeys.length, available: true })
        } catch (error) {
          setCacheInfo({ count: 0, available: false })
        }
      } else {
        setCacheInfo({ count: 0, available: false })
      }
    }
    updateCacheStatus()

    // Initialize notification permission
    const updateNotificationPermission = () => {
      if ('Notification' in window) {
        setNotificationInfo({
          permission: Notification.permission as 'granted' | 'denied' | 'default',
          available: true
        })
      } else {
        setNotificationInfo({
          permission: 'default',
          available: false
        })
      }
    }
    updateNotificationPermission()

    // Initialize storage status from mocked service
    const updateStorageStatus = async () => {
      try {
        const status = await offlineStorage.getStorageStatus()
        setStorageInfo(status)
      } catch (error) {
        // Fallback to default if mock fails
        setStorageInfo({ used: 0, total: 0, percentage: 0 })
      }
    }
    updateStorageStatus()

    // Initialize service worker status from mocked service
    const updateServiceWorkerStatus = async () => {
      try {
        const { serviceWorkerRegistration } = require('./serviceWorkerRegistration')
        const isRegistered = serviceWorkerRegistration.isRegistered()
        let hasUpdate = false
        let waiting = false
        
        if (isRegistered) {
          try {
            const updateInfo = await serviceWorkerRegistration.getUpdateInfo()
            hasUpdate = updateInfo.hasUpdate
            waiting = updateInfo.waiting
          } catch (error) {
            // Update info not available
          }
        }
        
        setServiceWorkerInfo({ isRegistered, hasUpdate, waiting })
      } catch (error) {
        // Fallback to default if mock fails
        setServiceWorkerInfo({ isRegistered: false, hasUpdate: false, waiting: false })
      }
    }
    updateServiceWorkerStatus()

    // Check PWA installation status
    const checkPWAInstallation = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      setIsPWAInstalled(isStandalone)
    }
    checkPWAInstallation()

    // Load offline actions
    const loadOfflineActions = async () => {
      try {
        const actions = await offlineStorage.getOfflineActions()
        setOfflineActions(actions)
      } catch (error) {
        console.error('Failed to load offline actions:', error)
      }
    }
    loadOfflineActions()

    // Event listeners
    const handleOnline = () => setNetworkStatus(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setNetworkStatus(prev => ({ ...prev, isOnline: false }))
    const handleResize = () => {
      updateResponsiveInfo()
      updateScreenInfo()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('resize', handleResize)

    // Media query listeners
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    
    darkModeQuery.addEventListener('change', updateThemePreference)
    motionQuery.addEventListener('change', updateMotionPreference)
    standaloneQuery.addEventListener('change', checkPWAInstallation)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('resize', handleResize)
      darkModeQuery.removeEventListener('change', updateThemePreference)
      motionQuery.removeEventListener('change', updateMotionPreference)
      standaloneQuery.removeEventListener('change', checkPWAInstallation)
    }
  }, [])

  const handleManualSync = async () => {
    if (isSyncing || !networkStatus.isOnline || offlineActions.length === 0) return

    setIsSyncing(true)
    try {
      await networkManager.syncOfflineActions()
      setLastSync(new Date())
      const actions = await offlineStorage.getOfflineActions()
      setOfflineActions(actions)
    } catch (error) {
      console.error('Manual sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const getConnectionIcon = () => {
    if (!networkStatus.isOnline) return '📡'
    switch (networkStatus.connectionType) {
      case 'wifi': return '📶'
      case '4g': return '📱'
      case '3g': return '📱'
      case '2g': return '📱'
      default: return '🌐'
    }
  }

  const getConnectionColor = () => {
    if (!networkStatus.isOnline) return 'text-red-500'
    return 'text-green-500'
  }

  const getConnectionText = () => {
    if (!networkStatus.isOnline) return 'Offline'
    return 'Online'
  }

  const formatLastSync = () => {
    if (!lastSync) return 'Never'
    const now = new Date()
    const diff = now.getTime() - lastSync.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return lastSync.toLocaleDateString()
  }

  const formatBatteryLevel = (level: number) => {
    return `${Math.round(level * 100)}%`
  }

  const getNotificationPermissionText = () => {
    if (!notificationInfo.available) return 'Not Available'
    switch (notificationInfo.permission) {
      case 'granted': return 'Granted'
      case 'denied': return 'Denied'
      case 'default': return 'Not Set'
      default: return 'Unknown'
    }
  }

  const formatStorageSize = (bytes: number) => {
    if (bytes === 0) return '0B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
  }

  const getPWAStatusText = () => {
    return isPWAInstalled ? 'PWA: Installed' : 'PWA: Browser'
  }

  const getServiceWorkerStatusText = () => {
    if (!serviceWorkerInfo.isRegistered) return 'Service Worker: Inactive'
    if (serviceWorkerInfo.hasUpdate) return 'Update Available'
    return 'Service Worker: Active'
  }

  return (
    <div 
      className={`bg-white border-b border-gray-200 shadow-sm ${className}`}
      role="status"
      aria-label="PWA Status Information"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* PWA Status Header */}
        <div className="py-2 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700">PWA Status</h3>
        </div>

        {/* Main Status Bar */}
        <div className="flex items-center justify-between h-12">
          {/* Left side - Network Status */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className={`text-lg ${getConnectionColor()}`}>
                {getConnectionIcon()}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {getConnectionText()}
              </span>
            </div>

            {/* Offline Actions Count */}
            {offlineActions.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">
                  {offlineActions.length} pending
                </span>
              </div>
            )}
          </div>

          {/* Center - PWA Status Information */}
          <div className="hidden md:flex items-center space-x-4 text-xs text-gray-500">
            <span>{getPWAStatusText()}</span>
            <span>{getServiceWorkerStatusText()}</span>
            <span>Storage: {formatStorageSize(storageInfo.used)}</span>
            <span>Breakpoint: {responsiveInfo.breakpoint}</span>
            <span>Orientation: {screenInfo.orientation}</span>
            <span>Theme: {preferencesInfo.theme}</span>
            <span>Motion: {preferencesInfo.motion}</span>
            {batteryInfo.available && (
              <span>Battery: {formatBatteryLevel(batteryInfo.level)}</span>
            )}
            {cacheInfo.available && (
              <span>Cache: {cacheInfo.count}</span>
            )}
            {notificationInfo.available && (
              <span>Notifications: {getNotificationPermissionText()}</span>
            )}
          </div>

          {/* Right side - Sync Status and Actions */}
          <div className="flex items-center space-x-4">
            {/* Last Sync Time */}
            <div className="text-sm text-gray-500">
              Last sync: {formatLastSync()}
            </div>

            {/* Sync Button */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !networkStatus.isOnline || offlineActions.length === 0}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                isSyncing || !networkStatus.isOnline || offlineActions.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {isSyncing ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Syncing...</span>
                </span>
              ) : (
                'Sync Now'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 
import { offlineStorage } from './OfflineStorage'
import type { OfflineAction } from './OfflineStorage'
import { showNotification } from './serviceWorkerRegistration'

export interface NetworkStatus {
  isOnline: boolean
  connectionType: 'wifi' | '4g' | '3g' | '2g' | 'slow-2g' | 'unknown'
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
  downlink: number
  rtt: number
  saveData: boolean
}

export interface SyncResult {
  success: boolean
  syncedActions: number
  failedActions: number
  errors: string[]
}

export class NetworkManager {
  private static instance: NetworkManager
  private isOnline: boolean = navigator.onLine
  private networkStatus: NetworkStatus
  private syncInProgress: boolean = false
  private _offlineActionsQueue: OfflineAction[] = []
  private syncInterval: NodeJS.Timeout | null = null
  private listeners: Array<(status: NetworkStatus) => void> = []

  // Getter to ensure offlineActionsQueue is always initialized
  private get offlineActionsQueue(): OfflineAction[] {
    if (!this._offlineActionsQueue) {
      this._offlineActionsQueue = []
    }
    return this._offlineActionsQueue
  }

  // Setter to maintain the property
  private set offlineActionsQueue(value: OfflineAction[]) {
    this._offlineActionsQueue = value
  }

  private constructor() {
    this.networkStatus = this.getDefaultNetworkStatus()
    this.initialize()
  }

  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager()
    }
    return NetworkManager.instance
  }

  public static resetInstance(): void {
    if (NetworkManager.instance) {
      NetworkManager.instance.cleanup()
      NetworkManager.instance = null as any
    }
  }

  private getDefaultNetworkStatus(): NetworkStatus {
    return {
      isOnline: navigator.onLine,
      connectionType: 'unknown',
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false
    }
  }

  private initialize(): void {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))

    // Listen for network information changes
    if ('connection' in navigator && (navigator as any).connection) {
      const connection = (navigator as any).connection
      connection.addEventListener('change', this.handleNetworkChange.bind(this))
      this.updateNetworkStatus()
    }

    // Start periodic sync when online
    this.startPeriodicSync()

    // Initialize offline storage
    this.initializeOfflineStorage()
  }

  private async initializeOfflineStorage(): Promise<void> {
    try {
      await offlineStorage.initialize()
      console.log('Offline storage initialized successfully')
    } catch (error) {
      console.error('Failed to initialize offline storage:', error)
    }
  }

  private handleOnline(): void {
    this.isOnline = true
    this.updateNetworkStatus()
    this.startPeriodicSync()
    
    // Attempt to sync offline actions
    this.syncOfflineActions()
    
    // Show online notification
    showNotification('🌐 Back Online!', {
      body: 'Connection restored. Syncing your progress...',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png'
    })

    // Notify listeners
    this.notifyListeners()
  }

  private handleOffline(): void {
    this.isOnline = false
    this.updateNetworkStatus()
    this.stopPeriodicSync()
    
    // Show offline notification
    showNotification('📡 You\'re Offline', {
      body: 'Don\'t worry! You can still play and your progress will sync when you\'re back online.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png'
    })

    // Notify listeners
    this.notifyListeners()
  }

  private handleNetworkChange(): void {
    this.updateNetworkStatus()
    this.notifyListeners()
  }

  private updateNetworkStatus(): void {
    if ('connection' in navigator && (navigator as any).connection) {
      const connection = (navigator as any).connection
      this.networkStatus = {
        isOnline: this.isOnline,
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 50,
        saveData: connection.saveData || false
      }
    } else {
      this.networkStatus = {
        ...this.networkStatus,
        isOnline: this.isOnline
      }
    }
  }

  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncOfflineActions()
      }
    }, 30000)
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  // Public methods
  public getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus }
  }

  public isOnlineStatus(): boolean {
    return this.isOnline
  }

  public addNetworkStatusListener(listener: (status: NetworkStatus) => void): void {
    this.listeners.push(listener)
  }

  public removeNetworkStatusListener(listener: (status: NetworkStatus) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.networkStatus)
      } catch (error) {
        console.error('Error in network status listener:', error)
      }
    })
  }

  // Offline action management
  public async queueOfflineAction(action: OfflineAction): Promise<void> {
    try {
      // Add to local queue for immediate access
      this.offlineActionsQueue.push(action)
      
      // Store in IndexedDB for persistence
      await offlineStorage.queueOfflineAction(action)
      
      console.log('Offline action queued:', action)
      
      // If we're online, try to sync immediately
      if (this.isOnline && !this.syncInProgress) {
        this.syncOfflineActions()
      }
    } catch (error) {
      console.error('Failed to queue offline action:', error)
      throw error
    }
  }

  public async getOfflineActions(): Promise<OfflineAction[]> {
    try {
      // Get from IndexedDB for persistence
      const actions = await offlineStorage.getOfflineActions()
      
      // Update local queue
      this.offlineActionsQueue = actions
      
      return actions
    } catch (error) {
      console.error('Failed to get offline actions:', error)
      return this.offlineActionsQueue
    }
  }

  public async syncOfflineActions(): Promise<SyncResult> {
    if (this.syncInProgress || !this.isOnline) {
      return {
        success: false,
        syncedActions: 0,
        failedActions: 0,
        errors: ['Sync already in progress or offline']
      }
    }

    this.syncInProgress = true
    const result: SyncResult = {
      success: true,
      syncedActions: 0,
      failedActions: 0,
      errors: []
    }

    try {
      const actions = await this.getOfflineActions()
      
      if (actions.length === 0) {
        return result
      }

      console.log(`Syncing ${actions.length} offline actions...`)

      for (const action of actions) {
        try {
          const success = await this.processOfflineAction(action)
          
          if (success) {
            await offlineStorage.removeOfflineAction(action.id)
            result.syncedActions++
            
            // Remove from local queue
            const index = this.offlineActionsQueue.findIndex(a => a.id === action.id)
            if (index > -1) {
              this.offlineActionsQueue.splice(index, 1)
            }
          } else {
            result.failedActions++
            action.retryCount++
            
            // Remove action if max retries exceeded
            if (action.retryCount >= action.maxRetries) {
              await offlineStorage.removeOfflineAction(action.id)
              console.warn(`Action ${action.id} exceeded max retries, removing`)
            } else {
              // Update retry count in storage
              await offlineStorage.queueOfflineAction(action)
            }
          }
        } catch (error) {
          result.failedActions++
          result.errors.push(`Action ${action.id}: ${error}`)
          console.error(`Failed to process action ${action.id}:`, error)
        }
      }

      if (result.syncedActions > 0) {
        showNotification('🔄 Sync Complete', {
          body: `Successfully synced ${result.syncedActions} actions`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png'
        })
      }

    } catch (error) {
      result.success = false
      result.errors.push(`Sync failed: ${error}`)
      console.error('Offline actions sync failed:', error)
    } finally {
      this.syncInProgress = false
    }

    return result
  }

  private async processOfflineAction(action: OfflineAction): Promise<boolean> {
    try {
      switch (action.type) {
        case 'quest_complete':
          return await this.syncQuestComplete(action.data)
        case 'pet_training':
          return await this.syncPetTraining(action.data)
        case 'item_collect':
          return await this.syncItemCollect(action.data)
        case 'social_interaction':
          return await this.syncSocialInteraction(action.data)
        default:
          console.warn(`Unknown action type: ${action.type}`)
          return false
      }
    } catch (error) {
      console.error(`Failed to process action ${action.type}:`, error)
      return false
    }
  }

  // Action-specific sync methods (these would call your actual API endpoints)
  private async syncQuestComplete(data: any): Promise<boolean> {
    try {
      // Simulate API call to your backend
      const response = await fetch('/api/quests/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      
      return response.ok
    } catch (error) {
      console.error('Quest complete sync failed:', error)
      return false
    }
  }

  private async syncPetTraining(data: any): Promise<boolean> {
    try {
      const response = await fetch('/api/pets/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      
      return response.ok
    } catch (error) {
      console.error('Pet training sync failed:', error)
      return false
    }
  }

  private async syncItemCollect(data: any): Promise<boolean> {
    try {
      const response = await fetch('/api/items/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      
      return response.ok
    } catch (error) {
      console.error('Item collect sync failed:', error)
      return false
    }
  }

  private async syncSocialInteraction(data: any): Promise<boolean> {
    try {
      const response = await fetch('/api/social/interact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      
      return response.ok
    } catch (error) {
      console.error('Social interaction sync failed:', error)
      return false
    }
  }

  // Utility methods
  public async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  public getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'unknown' {
    const { effectiveType, downlink, rtt } = this.networkStatus
    
    if (effectiveType === '4g' && downlink >= 10 && rtt <= 50) return 'excellent'
    if (effectiveType === '4g' && downlink >= 5 && rtt <= 100) return 'good'
    if (effectiveType === '3g' && downlink >= 1.5) return 'good'
    if (effectiveType === '2g' || effectiveType === 'slow-2g') return 'poor'
    
    return 'unknown'
  }

  public shouldUseLowBandwidthMode(): boolean {
    const quality = this.getConnectionQuality()
    return quality === 'poor' || this.networkStatus.saveData
  }

  public cleanup(): void {
    this.stopPeriodicSync()
    this.listeners = []
    offlineStorage.close()
  }
}

// Export singleton instance
export const networkManager = NetworkManager.getInstance() 

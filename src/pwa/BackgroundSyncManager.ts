export interface SyncRegistration {
  tag: string
  timestamp: number
  lastSync: number
  status: 'registered' | 'syncing' | 'completed' | 'failed'
  data?: any
}

export interface SyncCallback {
  (data: any): Promise<void>
}

export class BackgroundSyncManager {
  private static instance: BackgroundSyncManager
  private registrations: Map<string, SyncRegistration> = new Map()
  private syncCallbacks: Map<string, SyncCallback> = new Map()

  private constructor() {
    this.initialize()
  }

  public static getInstance(): BackgroundSyncManager {
    if (!BackgroundSyncManager.instance) {
      BackgroundSyncManager.instance = new BackgroundSyncManager()
    }
    return BackgroundSyncManager.instance
  }

  /**
   * Reset instance for testing purposes
   */
  public static resetInstance(): void {
    if (BackgroundSyncManager.instance) {
      BackgroundSyncManager.instance.registrations.clear()
      BackgroundSyncManager.instance.syncCallbacks.clear()
      BackgroundSyncManager.instance = null as any
    }
  }

  private initialize(): void {
    console.log('Background Sync Manager initialized (simplified web version)')
  }

  /**
   * Check if background sync is supported
   */
  public isSupported(): boolean {
    // Simplified: just check if we're in a browser environment
    return typeof window !== 'undefined' && 'localStorage' in window
  }

  /**
   * Register a background sync for offline actions
   */
  public async registerBackgroundSync(tag: string, callback: SyncCallback, options?: any): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Background sync not supported in this environment')
      return false
    }

    try {
      const registration: SyncRegistration = {
        tag,
        timestamp: Date.now(),
        lastSync: 0,
        status: 'registered',
        data: options
      }

      this.registrations.set(tag, registration)
      this.syncCallbacks.set(tag, callback)

      console.log(`Background sync registered: ${tag}`)
      return true
    } catch (error) {
      console.error('Failed to register background sync:', error)
      return false
    }
  }

  /**
   * Unregister a background sync
   */
  public async unregisterBackgroundSync(tag: string): Promise<boolean> {
    try {
      // Remove from our tracking
      this.registrations.delete(tag)
      this.syncCallbacks.delete(tag)
      
      console.log(`Background sync unregistered: ${tag}`)
      return true
    } catch (error) {
      console.error('Failed to unregister background sync:', error)
      return false
    }
  }

  /**
   * Get all registered syncs
   */
  public getRegistrations(): SyncRegistration[] {
    return Array.from(this.registrations.values())
  }

  /**
   * Check if a sync is registered
   */
  public isRegistered(tag: string): boolean {
    return this.registrations.has(tag)
  }

  /**
   * Get sync callback for a tag
   */
  public getSyncCallback(tag: string): SyncCallback | undefined {
    return this.syncCallbacks.get(tag)
  }

  /**
   * Update last sync time for a registration
   */
  public updateLastSync(tag: string): void {
    const registration = this.registrations.get(tag)
    if (registration) {
      registration.lastSync = Date.now()
      registration.status = 'completed'
    }
  }

  /**
   * Get sync status for a tag
   */
  public getSyncStatus(tag: string): 'not_supported' | 'not_registered' | 'registered' | 'syncing' | 'completed' | 'failed' {
    if (!this.isSupported()) {
      return 'not_supported'
    }

    const registration = this.registrations.get(tag)
    if (!registration) {
      return 'not_registered'
    }

    return registration.status
  }

  /**
   * Manual sync trigger (for web version)
   */
  public async triggerSync(tag: string): Promise<boolean> {
    const registration = this.registrations.get(tag)
    const callback = this.syncCallbacks.get(tag)

    if (!registration || !callback) {
      console.warn(`No sync registration found for tag: ${tag}`)
      return false
    }

    try {
      registration.status = 'syncing'
      await callback(registration.data)
      registration.status = 'completed'
      registration.lastSync = Date.now()
      
      console.log(`Manual sync completed for: ${tag}`)
      return true
    } catch (error) {
      registration.status = 'failed'
      console.error(`Manual sync failed for ${tag}:`, error)
      return false
    }
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    this.registrations.clear()
    this.syncCallbacks.clear()
    console.log('Background Sync Manager cleaned up')
  }
}

export const backgroundSyncManager = BackgroundSyncManager.getInstance() 

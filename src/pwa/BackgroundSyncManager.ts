export interface BackgroundSyncOptions {
  tag: string
  minDelay?: number
  maxDelay?: number
}

export interface SyncRegistration {
  tag: string
  registered: boolean
  lastSync?: Date
  nextSync?: Date
}

export class BackgroundSyncManager {
  private static instance: BackgroundSyncManager
  private registrations: Map<string, SyncRegistration> = new Map()
  private syncCallbacks: Map<string, () => Promise<void>> = new Map()

  private constructor() {}

  public static getInstance(): BackgroundSyncManager {
    if (!BackgroundSyncManager.instance) {
      BackgroundSyncManager.instance = new BackgroundSyncManager()
    }
    return BackgroundSyncManager.instance
  }

  /**
   * Register a background sync for offline actions
   */
  public async registerBackgroundSync(
    tag: string, 
    callback: () => Promise<void>,
    options: BackgroundSyncOptions = { tag }
  ): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('Background Sync not supported')
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      
      // Register the sync callback
      this.syncCallbacks.set(tag, callback)
      
      // Register background sync
      await registration.sync.register(tag)
      
      // Store registration info
      this.registrations.set(tag, {
        tag,
        registered: true,
        lastSync: new Date()
      })

      console.log(`Background sync registered for tag: ${tag}`)
      return true
    } catch (error) {
      console.error(`Failed to register background sync for tag ${tag}:`, error)
      return false
    }
  }

  /**
   * Unregister a background sync
   */
  public async unregisterBackgroundSync(tag: string): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready
      
      // Remove from our tracking
      this.registrations.delete(tag)
      this.syncCallbacks.delete(tag)
      
      console.log(`Background sync unregistered for tag: ${tag}`)
      return true
    } catch (error) {
      console.error(`Failed to unregister background sync for tag ${tag}:`, error)
      return false
    }
  }

  /**
   * Get all registered background syncs
   */
  public getRegistrations(): SyncRegistration[] {
    return Array.from(this.registrations.values())
  }

  /**
   * Check if a specific sync is registered
   */
  public isRegistered(tag: string): boolean {
    return this.registrations.has(tag)
  }

  /**
   * Get sync callback for a tag
   */
  public getSyncCallback(tag: string): (() => Promise<void>) | undefined {
    return this.syncCallbacks.get(tag)
  }

  /**
   * Update sync registration with last sync time
   */
  public updateLastSync(tag: string): void {
    const registration = this.registrations.get(tag)
    if (registration) {
      registration.lastSync = new Date()
      this.registrations.set(tag, registration)
    }
  }

  /**
   * Check if background sync is supported
   */
  public isSupported(): boolean {
    return 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype
  }

  /**
   * Get sync status for display
   */
  public getSyncStatus(tag: string): 'registered' | 'pending' | 'not_supported' {
    if (!this.isSupported()) return 'not_supported'
    if (!this.isRegistered(tag)) return 'not_supported'
    
    const registration = this.registrations.get(tag)
    if (!registration) return 'not_supported'
    
    return 'registered'
  }
}

export const backgroundSyncManager = BackgroundSyncManager.getInstance() 
export interface UpdateInfo {
  hasUpdate: boolean
  waiting: boolean
  installing: boolean
  lastUpdateCheck: Date
  updateAvailable: boolean
  updateSize?: number
  updateNotes?: string
}

export interface UpdateNotificationOptions {
  showImmediate: boolean
  showOnNextLaunch: boolean
  autoReload: boolean
  customMessage?: string
}

export interface UpdateProgress {
  stage: 'checking' | 'downloading' | 'installing' | 'ready' | 'error'
  progress: number
  message: string
  error?: string
}

export class PWAUpdateManager {
  private static instance: PWAUpdateManager
  private registration: ServiceWorkerRegistration | null = null
  private updateInfo: UpdateInfo
  private updateOptions: UpdateNotificationOptions
  private progressListeners: Array<(progress: UpdateProgress) => void> = []
  private updateListeners: Array<(info: UpdateInfo) => void> = []

  private constructor() {
    this.updateInfo = {
      hasUpdate: false,
      waiting: false,
      installing: false,
      lastUpdateCheck: new Date(),
      updateAvailable: false
    }
    
    this.updateOptions = {
      showImmediate: true,
      showOnNextLaunch: false,
      autoReload: false
    }
    
    this.initialize()
  }

  public static getInstance(): PWAUpdateManager {
    if (!PWAUpdateManager.instance) {
      PWAUpdateManager.instance = new PWAUpdateManager()
    }
    return PWAUpdateManager.instance
  }

  private async initialize(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported')
      return
    }

    try {
      // Get service worker registration
      this.registration = await navigator.serviceWorker.ready
      
      // Set up event listeners
      this.setupEventListeners()
      
      // Check for updates
      await this.checkForUpdates()
      
      console.log('PWA Update Manager initialized')
    } catch (error) {
      console.error('Failed to initialize PWA Update Manager:', error)
    }
  }

  private setupEventListeners(): void {
    if (!this.registration) return

    // Listen for service worker updates
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing
      if (!newWorker) return

      console.log('Service Worker update found')
      this.updateInfo.installing = true
      this.updateInfo.hasUpdate = true
      this.notifyUpdateListeners()

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('New Service Worker installed, update available')
          this.updateInfo.waiting = true
          this.updateInfo.installing = false
          this.updateInfo.updateAvailable = true
          this.notifyUpdateListeners()
          
          // Show update notification
          this.showUpdateNotification()
        } else if (newWorker.state === 'activated') {
          console.log('New Service Worker activated')
          this.updateInfo.waiting = false
          this.updateInfo.installing = false
          this.updateInfo.hasUpdate = false
          this.updateInfo.updateAvailable = false
          this.notifyUpdateListeners()
        }
      })
    })

    // Listen for service worker controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service Worker controller changed')
      this.updateInfo.waiting = false
      this.updateInfo.installing = false
      this.updateInfo.hasUpdate = false
      this.updateInfo.updateAvailable = false
      this.notifyUpdateListeners()
      
      // Reload page if auto-reload is enabled
      if (this.updateOptions.autoReload) {
        window.location.reload()
      }
    })

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event)
    })
  }

  /**
   * Check for service worker updates
   */
  public async checkForUpdates(): Promise<UpdateInfo> {
    if (!this.registration) {
      throw new Error('Service Worker not registered')
    }

    try {
      this.updateInfo.lastUpdateCheck = new Date()
      
      // Update the service worker
      await this.registration.update()
      
      // Check if there's a waiting worker
      if (this.registration.waiting) {
        this.updateInfo.waiting = true
        this.updateInfo.updateAvailable = true
      }
      
      this.notifyUpdateListeners()
      return this.updateInfo
    } catch (error) {
      console.error('Failed to check for updates:', error)
      throw error
    }
  }

  /**
   * Apply the update immediately
   */
  public async applyUpdate(): Promise<boolean> {
    if (!this.registration || !this.registration.waiting) {
      console.log('No update to apply')
      return false
    }

    try {
      // Send message to waiting service worker to skip waiting
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // Reload the page to activate the new service worker
      window.location.reload()
      return true
    } catch (error) {
      console.error('Failed to apply update:', error)
      return false
    }
  }

  /**
   * Get current update information
   */
  public getUpdateInfo(): UpdateInfo {
    return { ...this.updateInfo }
  }

  /**
   * Set update notification options
   */
  public setUpdateOptions(options: Partial<UpdateNotificationOptions>): void {
    this.updateOptions = { ...this.updateOptions, ...options }
  }

  /**
   * Get update notification options
   */
  public getUpdateOptions(): UpdateNotificationOptions {
    return { ...this.updateOptions }
  }

  /**
   * Add update progress listener
   */
  public addProgressListener(listener: (progress: UpdateProgress) => void): void {
    this.progressListeners.push(listener)
  }

  /**
   * Remove update progress listener
   */
  public removeProgressListener(listener: (progress: UpdateProgress) => void): void {
    const index = this.progressListeners.indexOf(listener)
    if (index > -1) {
      this.progressListeners.splice(index, 1)
    }
  }

  /**
   * Add update info listener
   */
  public addUpdateListener(listener: (info: UpdateInfo) => void): void {
    this.updateListeners.push(listener)
    // Immediately notify with current info
    listener(this.updateInfo)
  }

  /**
   * Remove update info listener
   */
  public removeUpdateListener(listener: (info: UpdateInfo) => void): void {
    const index = this.updateListeners.indexOf(listener)
    if (index > -1) {
      this.updateListeners.splice(index, 1)
    }
  }

  /**
   * Show update notification
   */
  private showUpdateNotification(): void {
    if (!this.updateOptions.showImmediate) {
      return
    }

    // Create update notification
    const notification = document.createElement('div')
    notification.className = 'pwa-update-notification'
    notification.innerHTML = `
      <div class="update-content">
        <div class="update-icon">🔄</div>
        <div class="update-text">
          <h3>Update Available</h3>
          <p>A new version of AI Pets Adventure is available!</p>
        </div>
        <div class="update-actions">
          <button class="update-now-btn">Update Now</button>
          <button class="update-later-btn">Later</button>
        </div>
      </div>
    `

    // Add event listeners
    const updateNowBtn = notification.querySelector('.update-now-btn')
    const updateLaterBtn = notification.querySelector('.update-later-btn')

    updateNowBtn?.addEventListener('click', () => {
      this.applyUpdate()
      this.removeUpdateNotification()
    })

    updateLaterBtn?.addEventListener('click', () => {
      this.removeUpdateNotification()
    })

    // Add to page
    document.body.appendChild(notification)

    // Auto-remove after 10 seconds
    setTimeout(() => {
      this.removeUpdateNotification()
    }, 10000)
  }

  /**
   * Remove update notification
   */
  private removeUpdateNotification(): void {
    const notification = document.querySelector('.pwa-update-notification')
    if (notification) {
      notification.remove()
    }
  }

  /**
   * Show update progress
   */
  public showUpdateProgress(progress: UpdateProgress): void {
    this.notifyProgressListeners(progress)
  }

  /**
   * Handle service worker messages
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data

    switch (type) {
      case 'UPDATE_PROGRESS':
        this.showUpdateProgress(data)
        break
      case 'UPDATE_READY':
        this.updateInfo.updateAvailable = true
        this.notifyUpdateListeners()
        break
      case 'UPDATE_ERROR':
        console.error('Update error:', data)
        this.updateInfo.installing = false
        this.notifyUpdateListeners()
        break
    }
  }

  /**
   * Notify progress listeners
   */
  private notifyProgressListeners(progress: UpdateProgress): void {
    this.progressListeners.forEach(listener => listener(progress))
  }

  /**
   * Notify update listeners
   */
  private notifyUpdateListeners(): void {
    this.updateListeners.forEach(listener => listener(this.updateInfo))
  }

  /**
   * Check if update is available
   */
  public isUpdateAvailable(): boolean {
    return this.updateInfo.updateAvailable
  }

  /**
   * Check if update is installing
   */
  public isUpdateInstalling(): boolean {
    return this.updateInfo.installing
  }

  /**
   * Check if update is waiting
   */
  public isUpdateWaiting(): boolean {
    return this.updateInfo.waiting
  }

  /**
   * Get last update check time
   */
  public getLastUpdateCheck(): Date {
    return this.updateInfo.lastUpdateCheck
  }

  /**
   * Force update check
   */
  public async forceUpdateCheck(): Promise<UpdateInfo> {
    return this.checkForUpdates()
  }

  /**
   * Schedule periodic update checks
   */
  public scheduleUpdateChecks(intervalMinutes: number = 60): void {
    setInterval(() => {
      this.checkForUpdates()
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * Get service worker registration
   */
  public getRegistration(): ServiceWorkerRegistration | null {
    return this.registration
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.progressListeners = []
    this.updateListeners = []
  }
}

export const pwaUpdateManager = PWAUpdateManager.getInstance()

// Add CSS for update notification
const updateNotificationStyles = `
  .pwa-update-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  }

  .update-content {
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .update-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  .update-text {
    flex: 1;
  }

  .update-text h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .update-text p {
    margin: 0;
    font-size: 14px;
    color: #666;
  }

  .update-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .update-now-btn, .update-later-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .update-now-btn {
    background: #2196f3;
    color: white;
  }

  .update-now-btn:hover {
    background: #1976d2;
  }

  .update-later-btn {
    background: #f5f5f5;
    color: #666;
  }

  .update-later-btn:hover {
    background: #e0e0e0;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @media (max-width: 480px) {
    .pwa-update-notification {
      top: 10px;
      right: 10px;
      left: 10px;
      max-width: none;
    }
    
    .update-content {
      flex-direction: column;
      text-align: center;
    }
    
    .update-actions {
      flex-direction: row;
      justify-content: center;
    }
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = updateNotificationStyles
  document.head.appendChild(styleElement)
} 

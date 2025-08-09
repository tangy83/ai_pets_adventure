export interface OfflineEvent {
  id: string
  type: 'app_launch' | 'quest_start' | 'quest_complete' | 'pet_interaction' | 'asset_access' | 'sync_attempt' | 'error'
  timestamp: number
  data: any
  sessionId: string
  offline: boolean
}

export interface OfflineSession {
  id: string
  startTime: number
  endTime?: number
  duration: number
  offlineActions: number
  errors: number
  assetsAccessed: string[]
  questsStarted: string[]
  questsCompleted: string[]
}

export interface OfflineMetrics {
  totalOfflineTime: number
  averageSessionDuration: number
  mostAccessedAssets: Array<{ asset: string; count: number }>
  commonOfflineActions: Array<{ action: string; count: number }>
  errorFrequency: Array<{ error: string; count: number }>
  offlineEfficiency: number // percentage of offline actions that succeeded
}

export interface AnalyticsConfig {
  enabled: boolean
  maxEvents: number
  maxSessions: number
  flushInterval: number // milliseconds
  enableDebug: boolean
}

export class OfflineAnalyticsManager {
  private static instance: OfflineAnalyticsManager
  private events: OfflineEvent[] = []
  private sessions: Map<string, OfflineSession> = new Map()
  private currentSession: OfflineSession | null = null
  private config: AnalyticsConfig
  private flushTimer: NodeJS.Timeout | null = null

  private constructor() {
    this.config = {
      enabled: true,
      maxEvents: 1000,
      maxSessions: 100,
      flushInterval: 300000, // 5 minutes
      flushInterval: 300000, // 5 minutes
      enableDebug: false
    }
    this.initialize()
  }

  public static getInstance(): OfflineAnalyticsManager {
    if (!OfflineAnalyticsManager.instance) {
      OfflineAnalyticsManager.instance = new OfflineAnalyticsManager()
    }
    return OfflineAnalyticsManager.instance
  }

  private initialize(): void {
    if (!this.config.enabled) return

    // Start new session
    this.startSession()

    // Set up periodic flush
    this.startPeriodicFlush()

    // Listen for page visibility changes
    this.setupVisibilityListener()

    // Listen for online/offline changes
    this.setupNetworkListener()

    if (this.config.enableDebug) {
      console.log('Offline Analytics Manager initialized')
    }
  }

  /**
   * Start a new analytics session
   */
  private startSession(): void {
    const sessionId = this.generateId()
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      duration: 0,
      offlineActions: 0,
      errors: 0,
      assetsAccessed: [],
      questsStarted: [],
      questsCompleted: []
    }

    this.sessions.set(sessionId, this.currentSession)

    // Track session start
    this.trackEvent('app_launch', {
      sessionId,
      userAgent: navigator.userAgent,
      screenSize: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })

    if (this.config.enableDebug) {
      console.log('New analytics session started:', sessionId)
    }
  }

  /**
   * End current session
   */
  private endSession(): void {
    if (!this.currentSession) return

    this.currentSession.endTime = Date.now()
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime

    // Update session in map
    this.sessions.set(this.currentSession.id, this.currentSession)

    if (this.config.enableDebug) {
      console.log('Analytics session ended:', this.currentSession)
    }

    this.currentSession = null
  }

  /**
   * Track an offline event
   */
  public trackEvent(type: OfflineEvent['type'], data: any = {}): void {
    if (!this.config.enabled || !this.currentSession) return

    const event: OfflineEvent = {
      id: this.generateId(),
      type,
      timestamp: Date.now(),
      data,
      sessionId: this.currentSession.id,
      offline: !navigator.onLine
    }

    this.events.push(event)

    // Update session metrics
    this.updateSessionMetrics(type, data)

    // Limit events array size
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents)
    }

    if (this.config.enableDebug) {
      console.log('Offline event tracked:', event)
    }
  }

  /**
   * Update session metrics based on event
   */
  private updateSessionMetrics(type: OfflineEvent['type'], data: any): void {
    if (!this.currentSession) return

    switch (type) {
      case 'quest_start':
        if (data.questId && !this.currentSession.questsStarted.includes(data.questId)) {
          this.currentSession.questsStarted.push(data.questId)
        }
        break
      case 'quest_complete':
        if (data.questId && !this.currentSession.questsCompleted.includes(data.questId)) {
          this.currentSession.questsCompleted.push(data.questId)
        }
        break
      case 'asset_access':
        if (data.assetPath && !this.currentSession.assetsAccessed.includes(data.assetPath)) {
          this.currentSession.assetsAccessed.push(data.assetPath)
        }
        break
      case 'error':
        this.currentSession.errors++
        break
    }

    if (type !== 'app_launch') {
      this.currentSession.offlineActions++
    }
  }

  /**
   * Track quest start
   */
  public trackQuestStart(questId: string, questName: string, worldId: string): void {
    this.trackEvent('quest_start', {
      questId,
      questName,
      worldId,
      offline: !navigator.onLine
    })
  }

  /**
   * Track quest completion
   */
  public trackQuestComplete(questId: string, questName: string, worldId: string, duration: number): void {
    this.trackEvent('quest_complete', {
      questId,
      questName,
      worldId,
      duration,
      offline: !navigator.onLine
    })
  }

  /**
   * Track asset access
   */
  public trackAssetAccess(assetPath: string, assetType: string, cached: boolean): void {
    this.trackEvent('asset_access', {
      assetPath,
      assetType,
      cached,
      offline: !navigator.onLine
    })
  }

  /**
   * Track sync attempt
   */
  public trackSyncAttempt(syncType: string, success: boolean, error?: string): void {
    this.trackEvent('sync_attempt', {
      syncType,
      success,
      error,
      offline: !navigator.onLine
    })
  }

  /**
   * Track error
   */
  public trackError(errorType: string, errorMessage: string, context: any = {}): void {
    this.trackEvent('error', {
      errorType,
      errorMessage,
      context,
      offline: !navigator.onLine
    })
  }

  /**
   * Track pet interaction
   */
  public trackPetInteraction(petId: string, interactionType: string, duration: number): void {
    this.trackEvent('pet_interaction', {
      petId,
      interactionType,
      duration,
      offline: !navigator.onLine
    })
  }

  /**
   * Get offline metrics
   */
  public getOfflineMetrics(): OfflineMetrics {
    const now = Date.now()
    const totalOfflineTime = Array.from(this.sessions.values())
      .reduce((total, session) => total + session.duration, 0)

    const averageSessionDuration = this.sessions.size > 0 
      ? totalOfflineTime / this.sessions.size 
      : 0

    // Most accessed assets
    const assetCounts = new Map<string, number>()
    this.events
      .filter(event => event.type === 'asset_access')
      .forEach(event => {
        const asset = event.data.assetPath
        assetCounts.set(asset, (assetCounts.get(asset) || 0) + 1)
      })

    const mostAccessedAssets = Array.from(assetCounts.entries())
      .map(([asset, count]) => ({ asset, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Common offline actions
    const actionCounts = new Map<string, number>()
    this.events
      .filter(event => event.type !== 'app_launch')
      .forEach(event => {
        actionCounts.set(event.type, (actionCounts.get(event.type) || 0) + 1)
      })

    const commonOfflineActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)

    // Error frequency
    const errorCounts = new Map<string, number>()
    this.events
      .filter(event => event.type === 'error')
      .forEach(event => {
        const error = event.data.errorType
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1)
      })

    const errorFrequency = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)

    // Offline efficiency
    const totalActions = this.events.filter(event => event.type !== 'app_launch').length
    const errorActions = this.events.filter(event => event.type === 'error').length
    const offlineEfficiency = totalActions > 0 ? ((totalActions - errorActions) / totalActions) * 100 : 100

    return {
      totalOfflineTime,
      averageSessionDuration,
      mostAccessedAssets,
      commonOfflineActions,
      errorFrequency,
      offlineEfficiency
    }
  }

  /**
   * Get current session
   */
  public getCurrentSession(): OfflineSession | null {
    return this.currentSession
  }

  /**
   * Get all sessions
   */
  public getAllSessions(): OfflineSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Get events for current session
   */
  public getCurrentSessionEvents(): OfflineEvent[] {
    if (!this.currentSession) return []
    return this.events.filter(event => event.sessionId === this.currentSession!.id)
  }

  /**
   * Clear old data
   */
  public clearOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): void { // 7 days
    const cutoff = Date.now() - maxAge

    // Clear old events
    this.events = this.events.filter(event => event.timestamp > cutoff)

    // Clear old sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.endTime && session.endTime < cutoff) {
        this.sessions.delete(sessionId)
      }
    }

    if (this.config.enableDebug) {
      console.log('Old analytics data cleared')
    }
  }

  /**
   * Export analytics data
   */
  public exportData(): string {
    const data = {
      events: this.events,
      sessions: Array.from(this.sessions.values()),
      metrics: this.getOfflineMetrics(),
      exportTime: new Date().toISOString()
    }

    return JSON.stringify(data, null, 2)
  }

  /**
   * Import analytics data
   */
  public importData(data: string): boolean {
    try {
      const parsed = JSON.parse(data)
      
      if (parsed.events && Array.isArray(parsed.events)) {
        this.events = parsed.events
      }
      
      if (parsed.sessions && Array.isArray(parsed.sessions)) {
        this.sessions.clear()
        parsed.sessions.forEach((session: OfflineSession) => {
          this.sessions.set(session.id, session)
        })
      }

      if (this.config.enableDebug) {
        console.log('Analytics data imported successfully')
      }

      return true
    } catch (error) {
      console.error('Failed to import analytics data:', error)
      return false
    }
  }

  /**
   * Set configuration
   */
  public setConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get configuration
   */
  public getConfig(): AnalyticsConfig {
    return { ...this.config }
  }

  /**
   * Enable/disable analytics
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    
    if (enabled && !this.currentSession) {
      this.startSession()
    } else if (!enabled && this.currentSession) {
      this.endSession()
    }
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      this.flushData()
    }, this.config.flushInterval)
  }

  /**
   * Flush data to storage
   */
  private async flushData(): Promise<void> {
    try {
      // Save to localStorage or IndexedDB
      const data = this.exportData()
      localStorage.setItem('offline-analytics', data)

      if (this.config.enableDebug) {
        console.log('Analytics data flushed to storage')
      }
    } catch (error) {
      console.error('Failed to flush analytics data:', error)
    }
  }

  /**
   * Setup visibility listener
   */
  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.endSession()
      } else {
        this.startSession()
      }
    })
  }

  /**
   * Setup network listener
   */
  private setupNetworkListener(): void {
    window.addEventListener('online', () => {
      this.trackEvent('sync_attempt', {
        syncType: 'network_restored',
        success: true
      })
    })

    window.addEventListener('offline', () => {
      this.trackEvent('sync_attempt', {
        syncType: 'network_lost',
        success: false,
        error: 'Network connection lost'
      })
    })
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    
    this.endSession()
    this.flushData()
  }
}

export const offlineAnalyticsManager = OfflineAnalyticsManager.getInstance() 
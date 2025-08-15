export interface AnalyticsEvent {
  id: string
  type: string
  data: any
  timestamp: number
  sessionId?: string
}

export interface AnalyticsSession {
  id: string
  startTime: number
  endTime?: number
  events: string[]
  metadata: {
    userAgent: string
    screenSize: string
    language: string
  }
}

export interface AnalyticsConfig {
  enabled: boolean
  enableDebug: boolean
  maxEvents: number
  maxSessions: number
  retentionDays: number
}

export interface OfflineMetrics {
  totalEvents: number
  totalSessions: number
  averageSessionDuration: number
  mostActiveHours: number[]
  popularEventTypes: string[]
}

export class OfflineAnalyticsManager {
  private static instance: OfflineAnalyticsManager
  private config: AnalyticsConfig
  private events: AnalyticsEvent[] = []
  private sessions: Map<string, AnalyticsSession> = new Map()
  private currentSession: AnalyticsSession | null = null
  private sessionTimer: NodeJS.Timeout | null = null

  private constructor() {
    this.config = {
      enabled: true,
      enableDebug: false,
      maxEvents: 1000,
      maxSessions: 100,
      retentionDays: 30
    }
    this.initialize()
  }

  public static getInstance(): OfflineAnalyticsManager {
    if (!OfflineAnalyticsManager.instance) {
      OfflineAnalyticsManager.instance = new OfflineAnalyticsManager()
    }
    return OfflineAnalyticsManager.instance
  }

  /**
   * Reset instance for testing purposes
   */
  public static resetInstance(): void {
    if (OfflineAnalyticsManager.instance) {
      OfflineAnalyticsManager.instance.cleanup()
      OfflineAnalyticsManager.instance = null as any
    }
  }

  private initialize(): void {
    if (!this.config.enabled) return

    // Load existing data from localStorage
    this.loadFromStorage()
    
    // Start new session
    this.startNewSession()
    
    // Set up periodic cleanup
    this.setupCleanupTimer()
    
    if (this.config.enableDebug) {
      console.log('Offline Analytics Manager initialized')
    }
  }

  /**
   * Reinitialize with current config (for testing)
   */
  public reinitialize(): void {
    this.initialize()
  }

  /**
   * Start a new analytics session
   */
  public startNewSession(): void {
    if (this.currentSession) {
      this.endCurrentSession()
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      events: [],
      metadata: {
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language
      }
    }

    this.sessions.set(sessionId, this.currentSession)
    
    // Set session timer for automatic cleanup
    this.sessionTimer = setInterval(() => {
      this.clearOldData()
    }, 60000) // Check every minute

    if (this.config.enableDebug) {
      console.log('New analytics session started:', sessionId)
    }
  }

  /**
   * End the current session
   */
  public endCurrentSession(): void {
    if (!this.currentSession) return

    this.currentSession.endTime = Date.now()
    
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer)
      this.sessionTimer = null
    }

    if (this.config.enableDebug) {
      console.log('Analytics session ended:', this.currentSession.id)
    }

    this.currentSession = null
  }

  /**
   * Track an analytics event
   */
  public trackEvent(type: string, data: any = {}): void {
    if (!this.config.enabled || !this.currentSession) return

    const event: AnalyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      sessionId: this.currentSession.id
    }

    this.events.push(event)
    this.currentSession.events.push(event.id)

    // Enforce max events limit
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents)
    }

    // Save to storage
    this.saveToStorage()

    if (this.config.enableDebug) {
      console.log('Analytics event tracked:', event)
    }
  }

  /**
   * Get current session
   */
  public getCurrentSession(): AnalyticsSession | null {
    return this.currentSession
  }

  /**
   * Get all events
   */
  public getEvents(): AnalyticsEvent[] {
    return [...this.events]
  }

  /**
   * Get all sessions
   */
  public getSessions(): AnalyticsSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Get offline metrics
   */
  public getOfflineMetrics(): OfflineMetrics {
    const totalEvents = this.events.length
    const totalSessions = this.sessions.size
    
    let totalDuration = 0
    let sessionCount = 0
    
    this.sessions.forEach(session => {
      if (session.endTime) {
        totalDuration += session.endTime - session.startTime
        sessionCount++
      }
    })

    const averageSessionDuration = sessionCount > 0 ? totalDuration / sessionCount : 0

    // Calculate most active hours (simplified)
    const hourCounts = new Array(24).fill(0)
    this.events.forEach(event => {
      const hour = new Date(event.timestamp).getHours()
      hourCounts[hour]++
    })
    
    const mostActiveHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => h.hour)

    // Calculate popular event types
    const eventTypeCounts = new Map<string, number>()
    this.events.forEach(event => {
      eventTypeCounts.set(event.type, (eventTypeCounts.get(event.type) || 0) + 1)
    })
    
    const popularEventTypes = Array.from(eventTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type]) => type)

    return {
      totalEvents,
      totalSessions,
      averageSessionDuration,
      mostActiveHours,
      popularEventTypes
    }
  }

  /**
   * Export analytics data
   */
  public exportData(): any {
    return {
      events: this.events,
      sessions: Array.from(this.sessions.values()),
      metrics: this.getOfflineMetrics(),
      config: this.config,
      exportTime: new Date().toISOString()
    }
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
        parsed.sessions.forEach((session: AnalyticsSession) => {
          this.sessions.set(session.id, session)
        })
      }

      if (parsed.config && typeof parsed.config === 'object') {
        this.config = { ...this.config, ...parsed.config }
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
   * Clear old data
   */
  public clearOldData(): void {
    const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000)
    
    // Clear old events
    this.events = this.events.filter(event => event.timestamp > cutoff)
    
    // Clear old sessions (but keep current session)
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.endTime && session.endTime < cutoff && sessionId !== this.currentSession?.id) {
        this.sessions.delete(sessionId)
      }
    }

    // Save to storage
    this.saveToStorage()

    if (this.config.enableDebug) {
      console.log('Old analytics data cleared')
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.saveToStorage()
  }

  /**
   * Save data to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = this.exportData()
      localStorage.setItem('offlineAnalytics', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save analytics data to storage:', error)
    }
  }

  /**
   * Load data from localStorage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('offlineAnalytics')
      if (data) {
        this.importData(data)
      }
    } catch (error) {
      console.error('Failed to load analytics data from storage:', error)
    }
  }

  /**
   * Set up cleanup timer
   */
  private setupCleanupTimer(): void {
    // Clean up old data every hour
    setInterval(() => {
      this.clearOldData()
    }, 60 * 60 * 1000)
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer)
      this.sessionTimer = null
    }
    
    this.endCurrentSession()
    this.saveToStorage()
    
    if (this.config.enableDebug) {
      console.log('Offline Analytics Manager cleaned up')
    }
  }
}

export const offlineAnalyticsManager = OfflineAnalyticsManager.getInstance() 

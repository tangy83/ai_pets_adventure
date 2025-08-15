import { EventManager } from './EventManager'

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  systemUpdateTimes: Record<string, number>
  entityCount: number
  componentCount: number
  lastUpdate: number
}

export interface SystemPerformance {
  name: string
  updateTime: number
  updateCount: number
  averageUpdateTime: number
  lastUpdate: number
  isActive: boolean
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private eventManager: EventManager
  private metrics: PerformanceMetrics
  private systemMetrics: Map<string, SystemPerformance> = new Map()
  private frameTimes: number[] = []
  private maxFrameTimeHistory: number = 60 // Keep last 60 frames
  private isEnabled: boolean = true

  private constructor(eventManager: EventManager) {
    this.eventManager = eventManager
    this.metrics = this.createDefaultMetrics()
    this.setupEventListeners()
  }

  public static getInstance(eventManager: EventManager): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(eventManager)
    }
    return PerformanceMonitor.instance
  }

  /**
   * Start monitoring a system
   */
  public startSystemMonitoring(systemName: string): void {
    if (!this.isEnabled) return

    this.systemMetrics.set(systemName, {
      name: systemName,
      updateTime: 0,
      updateCount: 0,
      averageUpdateTime: 0,
      lastUpdate: 0,
      isActive: true
    })
  }

  /**
   * Stop monitoring a system
   */
  public stopSystemMonitoring(systemName: string): void {
    this.systemMetrics.delete(systemName)
  }

  /**
   * Record system update time
   */
  public recordSystemUpdate(systemName: string, updateTime: number): void {
    if (!this.isEnabled) return

    const system = this.systemMetrics.get(systemName)
    if (!system) return

    system.updateTime = updateTime
    system.updateCount++
    system.lastUpdate = Date.now()
    
    // Calculate rolling average
    system.averageUpdateTime = (system.averageUpdateTime * (system.updateCount - 1) + updateTime) / system.updateCount
  }

  /**
   * Record frame time
   */
  public recordFrameTime(frameTime: number): void {
    if (!this.isEnabled) return

    this.frameTimes.push(frameTime)
    if (this.frameTimes.length > this.maxFrameTimeHistory) {
      this.frameTimes.shift()
    }

    // Calculate FPS
    const averageFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length
    this.metrics.fps = 1000 / averageFrameTime
    this.metrics.frameTime = averageFrameTime
    this.metrics.lastUpdate = Date.now()
  }

  /**
   * Update entity and component counts
   */
  public updateEntityMetrics(entityCount: number, componentCount: number): void {
    if (!this.isEnabled) return

    this.metrics.entityCount = entityCount
    this.metrics.componentCount = componentCount
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Get system performance data
   */
  public getSystemPerformance(systemName: string): SystemPerformance | undefined {
    return this.systemMetrics.get(systemName)
  }

  /**
   * Get all system performance data
   */
  public getAllSystemPerformance(): SystemPerformance[] {
    return Array.from(this.systemMetrics.values())
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    overall: PerformanceMetrics
    systems: SystemPerformance[]
    recommendations: string[]
  } {
    const recommendations: string[] = []
    
    // Check FPS
    if (this.metrics.fps < 50) {
      recommendations.push('FPS is below 50 - consider optimizing rendering or reducing complexity')
    }
    
    // Check system performance
    const slowSystems = Array.from(this.systemMetrics.values())
      .filter(system => system.averageUpdateTime > 16.67) // More than 16.67ms (60fps target)
    
    if (slowSystems.length > 0) {
      recommendations.push(`Slow systems detected: ${slowSystems.map(s => s.name).join(', ')}`)
    }
    
    // Check memory usage
    if (this.metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage detected - consider implementing object pooling')
    }

    return {
      overall: { ...this.metrics },
      systems: this.getAllSystemPerformance(),
      recommendations
    }
  }

  /**
   * Enable/disable monitoring
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.metrics = this.createDefaultMetrics()
    this.systemMetrics.clear()
    this.frameTimes = []
  }

  /**
   * Export performance data for analysis
   */
  public exportData(): any {
    return {
      metrics: this.metrics,
      systems: this.getAllSystemPerformance(),
      frameTimes: this.frameTimes,
      timestamp: Date.now()
    }
  }

  private createDefaultMetrics(): PerformanceMetrics {
    return {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      systemUpdateTimes: {},
      entityCount: 0,
      componentCount: 0,
      lastUpdate: Date.now()
    }
  }

  private setupEventListeners(): void {
    // Listen for system events to automatically track performance
    this.eventManager.on('systemStarted', (data) => {
      this.startSystemMonitoring(data.systemName)
    })

    this.eventManager.on('systemStopped', (data) => {
      this.stopSystemMonitoring(data.systemName)
    })

    // Update memory usage periodically
    setInterval(() => {
      if (this.isEnabled && 'memory' in performance) {
        const memory = (performance as any).memory
        if (memory) {
          this.metrics.memoryUsage = memory.usedJSHeapSize
        }
      }
    }, 1000)
  }
} 

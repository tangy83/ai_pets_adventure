import { EventManager } from './EventManager'

export interface ErrorInfo {
  id: string
  timestamp: number
  system: string
  error: Error
  context: any
  severity: 'low' | 'medium' | 'high' | 'critical'
  recovered: boolean
  recoveryAttempts: number
}

export interface RecoveryStrategy {
  name: string
  description: string
  execute: (error: ErrorInfo) => Promise<boolean>
  maxAttempts: number
  cooldown: number // milliseconds
}

export class ErrorBoundary {
  private static instance: ErrorBoundary
  private eventManager: EventManager
  private errors: Map<string, ErrorInfo> = new Map()
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map()
  private isEnabled: boolean = true
  private maxErrors: number = 100
  private errorCounter: number = 0

  private constructor(eventManager: EventManager) {
    this.eventManager = eventManager
    this.registerDefaultRecoveryStrategies()
    this.setupEventListeners()
  }

  public static getInstance(eventManager: EventManager): ErrorBoundary {
    if (!ErrorBoundary.instance) {
      ErrorBoundary.instance = new ErrorBoundary(eventManager)
    }
    return ErrorBoundary.instance
  }

  /**
   * Handle an error from a system
   */
  public handleError(
    system: string,
    error: Error,
    context: any = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): string {
    if (!this.isEnabled) return ''

    const errorId = this.generateErrorId()
    const errorInfo: ErrorInfo = {
      id: errorId,
      timestamp: Date.now(),
      system,
      error,
      context,
      severity,
      recovered: false,
      recoveryAttempts: 0
    }

    // Store error
    this.errors.set(errorId, errorInfo)
    this.errorCounter++

    // Clean up old errors if we exceed the limit
    if (this.errors.size > this.maxErrors) {
      this.cleanupOldErrors()
    }

    // Emit error event
    this.eventManager.emit('systemError', {
      systemName: system,
      error: error.message
    })

    // Attempt recovery for high/critical errors
    if (severity === 'high' || severity === 'critical') {
      this.attemptRecovery(errorInfo)
    }

    return errorId
  }

  /**
   * Attempt to recover from an error
   */
  private async attemptRecovery(errorInfo: ErrorInfo): Promise<void> {
    const strategy = this.getBestRecoveryStrategy(errorInfo)
    if (!strategy) return

    if (errorInfo.recoveryAttempts >= strategy.maxAttempts) {
      this.eventManager.emit('recoveryFailed', {
        errorId: errorInfo.id,
        system: errorInfo.system,
        reason: 'Max recovery attempts exceeded'
      })
      return
    }

    try {
      errorInfo.recoveryAttempts++
      const success = await strategy.execute(errorInfo)
      
      if (success) {
        errorInfo.recovered = true
        this.eventManager.emit('recoverySucceeded', {
          errorId: errorInfo.id,
          system: errorInfo.system,
          strategy: strategy.name
        })
      } else {
        // Retry after cooldown
        setTimeout(() => {
          this.attemptRecovery(errorInfo)
        }, strategy.cooldown)
      }
    } catch (recoveryError) {
      console.error('Recovery strategy failed:', recoveryError)
      this.eventManager.emit('recoveryFailed', {
        errorId: errorInfo.id,
        system: errorInfo.system,
        reason: 'Recovery strategy execution failed'
      })
    }
  }

  /**
   * Get the best recovery strategy for an error
   */
  private getBestRecoveryStrategy(errorInfo: ErrorInfo): RecoveryStrategy | null {
    // For now, return the first available strategy
    // In the future, this could be more sophisticated
    return Array.from(this.recoveryStrategies.values())[0] || null
  }

  /**
   * Register a recovery strategy
   */
  public registerRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(strategy.name, strategy)
  }

  /**
   * Get error information
   */
  public getError(errorId: string): ErrorInfo | undefined {
    return this.errors.get(errorId)
  }

  /**
   * Get all errors
   */
  public getAllErrors(): ErrorInfo[] {
    return Array.from(this.errors.values())
  }

  /**
   * Get errors by system
   */
  public getErrorsBySystem(system: string): ErrorInfo[] {
    return Array.from(this.errors.values()).filter(error => error.system === system)
  }

  /**
   * Get errors by severity
   */
  public getErrorsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): ErrorInfo[] {
    return Array.from(this.errors.values()).filter(error => error.severity === severity)
  }

  /**
   * Clear resolved errors
   */
  public clearResolvedErrors(): void {
    for (const [id, error] of this.errors.entries()) {
      if (error.recovered || error.severity === 'low') {
        this.errors.delete(id)
      }
    }
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    total: number
    bySeverity: Record<string, number>
    bySystem: Record<string, number>
    recovered: number
    unresolved: number
  } {
    const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 }
    const bySystem: Record<string, number> = {}
    let recovered = 0
    let unresolved = 0

    for (const error of this.errors.values()) {
      bySeverity[error.severity]++
      bySystem[error.system] = (bySystem[error.system] || 0) + 1
      
      if (error.recovered) {
        recovered++
      } else {
        unresolved++
      }
    }

    return {
      total: this.errors.size,
      bySeverity,
      bySystem,
      recovered,
      unresolved
    }
  }

  /**
   * Enable/disable error handling
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  /**
   * Reset error boundary
   */
  public reset(): void {
    this.errors.clear()
    this.errorCounter = 0
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${this.errorCounter}`
  }

  private cleanupOldErrors(): void {
    const sortedErrors = Array.from(this.errors.values())
      .sort((a, b) => a.timestamp - b.timestamp)
    
    // Keep only the most recent errors
    const errorsToRemove = sortedErrors.slice(0, this.errors.size - this.maxErrors)
    errorsToRemove.forEach(error => this.errors.delete(error.id))
  }

  private registerDefaultRecoveryStrategies(): void {
    // System restart strategy
    this.registerRecoveryStrategy({
      name: 'systemRestart',
      description: 'Restart the failed system',
      maxAttempts: 3,
      cooldown: 5000, // 5 seconds
      execute: async (errorInfo: ErrorInfo) => {
        this.eventManager.emit('restartSystem', {
          system: errorInfo.system,
          reason: 'Error recovery'
        })
        return true
      }
    })

    // State reset strategy
    this.registerRecoveryStrategy({
      name: 'stateReset',
      description: 'Reset system state to last known good state',
      maxAttempts: 2,
      cooldown: 10000, // 10 seconds
      execute: async (errorInfo: ErrorInfo) => {
        this.eventManager.emit('resetSystemState', {
          system: errorInfo.system,
          reason: 'Error recovery'
        })
        return true
      }
    })
  }

  private setupEventListeners(): void {
    // Listen for system events to track system health
    this.eventManager.on('systemStarted', (data) => {
      // Clear errors for this system when it starts
      const systemErrors = this.getErrorsBySystem(data.systemName)
      systemErrors.forEach(error => {
        if (error.recovered) {
          this.errors.delete(error.id)
        }
      })
    })
  }
} 
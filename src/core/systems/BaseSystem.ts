import { EventManager } from '../EventManager'

export interface GameSystem {
  name: string
  update(deltaTime: number): void
  initialize(): void
  destroy(): void
  isActive: boolean
  priority: number
  dependencies?: string[]
  eventManager?: EventManager
}

export abstract class BaseSystem implements GameSystem {
  public name: string
  public isActive: boolean = true
  public priority: number = 0
  public dependencies: string[] = []
  public eventManager?: EventManager

  constructor(name: string, priority: number = 0, dependencies: string[] = []) {
    this.name = name
    this.priority = priority
    this.dependencies = dependencies
  }

  abstract update(deltaTime: number): void

  initialize(): void {
    this.log(`System ${this.name} initialized`, 'info')
  }

  destroy(): void {
    this.log(`System ${this.name} destroyed`, 'info')
  }

  pause(): void {
    this.isActive = false
    this.log(`System ${this.name} paused`, 'info')
  }

  resume(): void {
    this.isActive = true
    this.log(`System ${this.name} resumed`, 'info')
  }

  setEventManager(eventManager: EventManager): void {
    this.eventManager = eventManager
    this.log(`Event manager set for ${this.name}`, 'info')
  }

  setPriority(priority: number): void {
    this.priority = priority
    this.log(`Priority updated to ${priority}`, 'info')
  }

  setDependencies(dependencies: string[]): void {
    this.dependencies = dependencies
    this.log(`Dependencies updated: ${dependencies.join(', ')}`, 'info')
  }

  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${this.name}] ${message}`
    
    switch (level) {
      case 'info':
        console.log(logMessage)
        break
      case 'warn':
        console.warn(logMessage)
        break
      case 'error':
        console.error(logMessage)
        break
    }
  }

  protected emitEvent<T extends keyof import('../EventManager').GameEvents>(
    eventType: T, 
    data: import('../EventManager').GameEvents[T]
  ): void {
    if (this.eventManager) {
      this.eventManager.emit(eventType, data)
    } else {
      this.log(`Cannot emit event ${eventType}: no event manager set`, 'warn')
    }
  }

  protected onEvent<T extends keyof import('../EventManager').GameEvents>(
    eventType: T, 
    handler: import('../EventManager').EventHandler<T>,
    priority: number = 0
  ): string | null {
    if (this.eventManager) {
      return this.eventManager.on(eventType, handler, undefined, priority)
    } else {
      this.log(`Cannot subscribe to event ${eventType}: no event manager set`, 'warn')
      return null
    }
  }

  protected onceEvent<T extends keyof import('../EventManager').GameEvents>(
    eventType: T, 
    handler: import('../EventManager').EventHandler<T>,
    priority: number = 0
  ): string | null {
    if (this.eventManager) {
      return this.eventManager.once(eventType, handler, undefined, priority)
    } else {
      this.log(`Cannot subscribe to event ${eventType}: no event manager set`, 'warn')
      return null
    }
  }

  protected offEvent(subscriptionId: string): boolean {
    if (this.eventManager) {
      return this.eventManager.off(subscriptionId)
    } else {
      this.log(`Cannot unsubscribe from event: no event manager set`, 'warn')
      return false
    }
  }

  // Utility method to check if system should update
  protected shouldUpdate(): boolean {
    return this.isActive && this.eventManager !== undefined
  }

  // Method to get system status
  public getStatus(): { name: string; active: boolean; priority: number; dependencies: string[] } {
    return {
      name: this.name,
      active: this.isActive,
      priority: this.priority,
      dependencies: this.dependencies
    }
  }
} 

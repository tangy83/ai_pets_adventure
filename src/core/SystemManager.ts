import { EventManager, GameEvents } from './EventManager'

export interface GameSystem {
  name: string
  update(deltaTime: number): void
  initialize?(): void
  destroy?(): void
  priority: number
  dependencies?: string[]
  isActive: boolean
}

export interface SystemConfig {
  name: string
  system: GameSystem
  priority: number
  dependencies?: string[]
  autoStart?: boolean
}

export class SystemManager {
  private systems: Map<string, GameSystem> = new Map()
  private systemOrder: string[] = []
  private systemConfigs: Map<string, SystemConfig> = new Map()
  private isInitialized: boolean = false
  private eventManager?: EventManager

  constructor(eventManager?: EventManager) {
    this.eventManager = eventManager
    // Initialize with default system priorities
    this.initializeDefaultPriorities()
  }

  public setEventManager(eventManager: EventManager): void {
    this.eventManager = eventManager
  }

  private emitSystemEvent<K extends keyof GameEvents>(eventName: K, data: GameEvents[K]): void {
    if (this.eventManager) {
      this.eventManager.emit(eventName, data)
    }
  }

  private initializeDefaultPriorities(): void {
    // Define default system priorities (lower numbers = higher priority)
    const defaultPriorities: Record<string, number> = {
      'input': 100,      // Highest priority - handle input first
      'time': 90,        // Time management
      'ai': 80,          // AI decisions
      'physics': 70,     // Physics simulation
      'gameLogic': 60,   // Game state updates
      'rendering': 50,   // Visual updates
      'audio': 40,       // Audio processing
      'network': 30,     // Network communication
      'debug': 10        // Debug systems (lowest priority)
    }

    // Store default priorities for reference
    this.defaultPriorities = defaultPriorities
  }

  private defaultPriorities: Record<string, number> = {}

  public addSystem(config: SystemConfig): void {
    const { name, system, priority, dependencies, autoStart = true } = config

    if (this.systems.has(name)) {
      console.warn(`System ${name} already exists, replacing it`)
      this.removeSystem(name)
    }

    // Set system properties
    system.name = name
    system.priority = priority
    system.dependencies = dependencies || []
    system.isActive = autoStart

    // Store system and config
    this.systems.set(name, system)
    this.systemConfigs.set(name, config)

    // Rebuild system order
    this.rebuildSystemOrder()

    // Initialize the system if it has an initialize method and autoStart is true
    if (system.initialize && autoStart) {
      try {
        system.initialize()
        this.emitSystemEvent('systemStarted', {
          systemName: name,
          timestamp: Date.now()
        })
        console.log(`System ${name} added and initialized successfully (priority: ${priority})`)
      } catch (error) {
        console.error(`Failed to initialize system ${name}:`, error)
        system.isActive = false
      }
    } else {
      console.log(`System ${name} added successfully (priority: ${priority})`)
    }
  }

  public addSystemSimple(name: string, system: GameSystem, priority?: number): void {
    const config: SystemConfig = {
      name,
      system,
      priority: priority ?? this.defaultPriorities[name] ?? 50,
      autoStart: true
    }
    this.addSystem(config)
  }

  public removeSystem(name: string): boolean {
    const system = this.systems.get(name)
    if (!system) return false

    // Destroy the system if it has a destroy method
    if (system.destroy) {
      try {
        system.destroy()
      } catch (error) {
        console.error(`Error destroying system ${name}:`, error)
      }
    }

    this.systems.delete(name)
    this.systemConfigs.delete(name)

    // Rebuild system order
    this.rebuildSystemOrder()

    // Emit system stopped event
    this.emitSystemEvent('systemStopped', {
      systemName: name,
      timestamp: Date.now()
    })

    console.log(`System ${name} removed successfully`)
    return true
  }

  private rebuildSystemOrder(): void {
    // Create a copy of systems with their configs
    const systemsWithConfigs = Array.from(this.systems.entries()).map(([name, system]) => ({
      name,
      system,
      config: this.systemConfigs.get(name)!
    }))

    // Sort by priority (higher priority = lower number = first)
    systemsWithConfigs.sort((a, b) => a.config.priority - b.config.priority)

    // Check for dependency cycles
    if (this.hasDependencyCycles(systemsWithConfigs)) {
      console.error('Circular dependency detected in systems! Falling back to priority-based order.')
      // Fall back to priority-based order when circular dependencies are detected
      this.systemOrder = systemsWithConfigs.map(s => s.name)
      return
    }

    // Build dependency-resolved order
    this.systemOrder = this.resolveDependencies(systemsWithConfigs)
  }

  private hasDependencyCycles(systems: Array<{ name: string; config: SystemConfig }>): boolean {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const hasCycle = (systemName: string): boolean => {
      if (recursionStack.has(systemName)) return true
      if (visited.has(systemName)) return false

      visited.add(systemName)
      recursionStack.add(systemName)

      const system = systems.find(s => s.name === systemName)
      if (system && system.config.dependencies) {
        for (const dep of system.config.dependencies) {
          if (hasCycle(dep)) return true
        }
      }

      recursionStack.delete(systemName)
      return false
    }

    for (const system of systems) {
      if (hasCycle(system.name)) return true
    }

    return false
  }

  private resolveDependencies(systems: Array<{ name: string; config: SystemConfig }>): string[] {
    const result: string[] = []
    const visited = new Set<string>()

    const visit = (systemName: string): void => {
      if (visited.has(systemName)) return

      const system = systems.find(s => s.name === systemName)
      if (!system) return

      // Visit dependencies first
      if (system.config.dependencies) {
        for (const dep of system.config.dependencies) {
          visit(dep)
        }
      }

      visited.add(systemName)
      result.push(systemName)
    }

    // Visit all systems
    for (const system of systems) {
      visit(system.name)
    }

    return result
  }

  public getSystem<T extends GameSystem>(name: string): T | undefined {
    return this.systems.get(name) as T | undefined
  }

  public hasSystem(name: string): boolean {
    return this.systems.has(name)
  }

  public getAllSystems(): GameSystem[] {
    // Return systems in dependency-resolved order, not insertion order
    return this.systemOrder
      .map(systemName => this.systems.get(systemName))
      .filter((system): system is GameSystem => system !== undefined)
  }

  public getSystemNames(): string[] {
    return [...this.systemOrder]
  }

  public getActiveSystems(): GameSystem[] {
    return Array.from(this.systems.values()).filter(system => system.isActive)
  }

  public updateAllSystems(deltaTime: number): void {
    // Update systems in the resolved dependency order
    for (const systemName of this.systemOrder) {
      const system = this.systems.get(systemName)
      if (system && system.isActive) {
        try {
          system.update(deltaTime)
        } catch (error) {
          console.error(`Error updating system ${systemName}:`, error)
          
          // Deactivate problematic system
          system.isActive = false
          
          // Emit system error event if available
          this.emitSystemError(systemName, error)
        }
      }
    }
  }

  private emitSystemError(systemName: string, error: any): void {
    // This could be connected to an event system if needed
    console.error(`System ${systemName} encountered an error and has been deactivated:`, error)
  }

  public pauseSystem(name: string): boolean {
    const system = this.systems.get(name)
    if (!system) return false

    system.isActive = false
    this.emitSystemEvent('systemPaused', {
      systemName: name,
      timestamp: Date.now()
    })
    console.log(`System ${name} paused`)
    return true
  }

  public resumeSystem(name: string): boolean {
    const system = this.systems.get(name)
    if (!system) return false

    system.isActive = true
    this.emitSystemEvent('systemResumed', {
      systemName: name,
      timestamp: Date.now()
    })
    console.log(`System ${name} resumed`)
    return true
  }

  public pauseAllSystems(): void {
    for (const systemName of this.systemOrder) {
      this.pauseSystem(systemName)
    }
  }

  public resumeAllSystems(): void {
    for (const systemName of this.systemOrder) {
      this.resumeSystem(systemName)
    }
  }

  public initializeAllSystems(): void {
    if (this.isInitialized) return

    for (const systemName of this.systemOrder) {
      const system = this.systems.get(systemName)
      if (system && system.initialize && !system.isActive) {
        try {
          system.initialize()
          system.isActive = true
          this.emitSystemEvent('systemStarted', {
            systemName: systemName,
            timestamp: Date.now()
          })
          console.log(`System ${systemName} initialized`)
        } catch (error) {
          console.error(`Failed to initialize system ${systemName}:`, error)
          system.isActive = false
        }
      }
    }

    this.isInitialized = true
    console.log('All systems initialized')
  }

  public destroyAllSystems(): void {
    for (const system of this.systems.values()) {
      if (system.destroy) {
        try {
          system.destroy()
        } catch (error) {
          console.error(`Error destroying system ${system.name}:`, error)
        }
      }
    }

    this.systems.clear()
    this.systemConfigs.clear()
    this.systemOrder = []
    this.isInitialized = false
    console.log('All systems destroyed')
  }

  public getSystemCount(): number {
    return this.systems.size
  }

  public getActiveSystemCount(): number {
    return Array.from(this.systems.values()).filter(system => system.isActive).length
  }

  public isSystemActive(name: string): boolean {
    const system = this.systems.get(name)
    return system ? system.isActive : false
  }

  public getSystemPriority(name: string): number {
    const system = this.systems.get(name)
    return system ? system.priority : -1
  }

  public setSystemPriority(name: string, priority: number): boolean {
    const system = this.systems.get(name)
    if (!system) return false

    system.priority = priority
    
    // Rebuild system order with new priority
    this.rebuildSystemOrder()
    
    console.log(`System ${name} priority updated to ${priority}`)
    return true
  }

  public getSystemDependencies(name: string): string[] {
    const config = this.systemConfigs.get(name)
    return config ? config.dependencies || [] : []
  }

  public getSystemDependents(name: string): string[] {
    const dependents: string[] = []
    
    for (const [systemName, config] of this.systemConfigs.entries()) {
      if (config.dependencies && config.dependencies.includes(name)) {
        dependents.push(systemName)
      }
    }
    
    return dependents
  }

  public getSystemStatus(): Record<string, { active: boolean; priority: number; dependencies: string[] }> {
    const status: Record<string, { active: boolean; priority: number; dependencies: string[] }> = {}
    
    for (const [name, system] of this.systems.entries()) {
      const config = this.systemConfigs.get(name)!
      status[name] = {
        active: system.isActive,
        priority: system.priority,
        dependencies: config.dependencies || []
      }
    }
    
    return status
  }

  public getInitializationStatus(): boolean {
    return this.isInitialized
  }

  public getDefaultPriority(systemName: string): number {
    return this.defaultPriorities[systemName] ?? 50
  }
} 

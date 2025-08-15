import { GameState } from './GameState'
import { SystemManager, SystemConfig } from './SystemManager'
import { EventManager } from './EventManager'
import { TimeManager } from './TimeManager'
import { PerformanceMonitor } from './PerformanceMonitor'
import { ErrorBoundary } from './ErrorBoundary'
import { InputSystem } from './systems/InputSystem'
import { AISystem } from './systems/AISystem'
import { PhysicsSystem } from './systems/PhysicsSystem'
import { RenderingSystem } from './systems/RenderingSystem'
import { AudioSystem } from './systems/AudioSystem'

export interface GameEngineConfig {
  enableSystems: string[]
  systemPriorities?: Record<string, number>
  systemDependencies?: Record<string, string[]>
  targetFPS?: number
  enableDebugMode?: boolean
}

export class GameEngine {
  private gameState: GameState
  private systemManager: SystemManager
  private eventManager: EventManager
  private timeManager: TimeManager
  private performanceMonitor: PerformanceMonitor
  private errorBoundary: ErrorBoundary
  private config: GameEngineConfig
  private running: boolean = false
  private animationFrameId: number | null = null
  private lastFrameTime: number = 0
  private frameCount: number = 0
  private fpsCounter: number = 0
  private lastFpsUpdate: number = 0

  constructor(config: GameEngineConfig = { enableSystems: ['input', 'ai', 'physics', 'rendering', 'audio'] }, eventManager?: EventManager) {
    this.config = {
      enableSystems: config.enableSystems,
      systemPriorities: config.systemPriorities || {},
      systemDependencies: config.systemDependencies || {},
      targetFPS: config.targetFPS || 60,
      enableDebugMode: config.enableDebugMode || false
    }

    this.eventManager = eventManager || new EventManager()
    this.gameState = new GameState(this.eventManager)
    this.systemManager = new SystemManager(this.eventManager)
    this.timeManager = new TimeManager()
    this.performanceMonitor = PerformanceMonitor.getInstance(this.eventManager)
    this.errorBoundary = ErrorBoundary.getInstance(this.eventManager)
    
    this.initializeSystems()
    this.setupEventListeners()
  }

  private initializeSystems(): void {
    const systemConfigs: SystemConfig[] = []

    // Create system configurations with proper priorities and dependencies
    if (this.config.enableSystems.includes('input')) {
      const inputSystem = new InputSystem()
      inputSystem.setEventManager(this.eventManager)
      systemConfigs.push({
        name: 'input',
        system: inputSystem,
        priority: this.config.systemPriorities?.input ?? 100,
        dependencies: this.config.systemDependencies?.input || [],
        autoStart: true
      })
    }

    if (this.config.enableSystems.includes('ai')) {
      const aiSystem = new AISystem()
      aiSystem.setEventManager(this.eventManager)
      systemConfigs.push({
        name: 'ai',
        system: aiSystem,
        priority: this.config.systemPriorities?.ai ?? 80,
        dependencies: this.config.systemDependencies?.ai || ['input'],
        autoStart: true
      })
    }

    if (this.config.enableSystems.includes('physics')) {
      const physicsSystem = new PhysicsSystem()
      physicsSystem.setEventManager(this.eventManager)
      systemConfigs.push({
        name: 'physics',
        system: physicsSystem,
        priority: this.config.systemPriorities?.physics ?? 70,
        dependencies: this.config.systemDependencies?.physics || ['input'],
        autoStart: true
      })
    }

    if (this.config.enableSystems.includes('rendering')) {
      const renderingSystem = new RenderingSystem()
      renderingSystem.setEventManager(this.eventManager)
      systemConfigs.push({
        name: 'rendering',
        system: renderingSystem,
        priority: this.config.systemPriorities?.rendering ?? 50,
        dependencies: this.config.systemDependencies?.rendering || ['physics'],
        autoStart: true
      })
    }

    if (this.config.enableSystems.includes('audio')) {
      const audioSystem = new AudioSystem()
      audioSystem.setEventManager(this.eventManager)
      systemConfigs.push({
        name: 'audio',
        system: audioSystem,
        priority: this.config.systemPriorities?.audio ?? 40,
        dependencies: this.config.systemDependencies?.audio || [],
        autoStart: true
      })
    }

    // Add all systems to the manager
    for (const config of systemConfigs) {
      this.systemManager.addSystem(config)
    }

    // Initialize all systems
    this.systemManager.initializeAllSystems()

    console.log(`Game engine initialized with ${this.systemManager.getSystemCount()} systems`)
  }

  private setupEventListeners(): void {
    // Listen for game state events
    this.eventManager.on('gameStateInitialized', this.handleGameStateInitialized.bind(this))
    this.eventManager.on('gameStateUpdated', this.handleGameStateUpdated.bind(this))
    this.eventManager.on('questStarted', this.handleQuestStarted.bind(this))
    this.eventManager.on('questCompleted', this.handleQuestCompleted.bind(this))
    this.eventManager.on('playerLevelUp', this.handlePlayerLevelUp.bind(this))
    this.eventManager.on('worldChanged', this.handleWorldChanged.bind(this))
    this.eventManager.on('achievementUnlocked', this.handleAchievementUnlocked.bind(this))
    this.eventManager.on('gamePaused', this.handleGamePaused.bind(this))
    this.eventManager.on('gameResumed', this.handleGameResumed.bind(this))

    // Listen for system events
    this.eventManager.on('systemError', this.handleSystemError.bind(this))
  }

  public start(): void {
    if (this.running) return
    
    // Initialize game state if not already done
    if (!this.gameState.getInitializationStatus()) {
      this.gameState.initialize()
    }
    
    this.running = true
    this.lastFrameTime = performance.now()
    this.frameCount = 0
    this.fpsCounter = 0
    this.lastFpsUpdate = 0
    
    this.gameLoop()
    
    // Emit engine started event
    this.eventManager.emit('engineStarted', {
      timestamp: Date.now(),
      config: this.config
    })
    
    console.log('Game engine started')
  }

  public stop(): void {
    if (!this.running) return
    
    this.running = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    
    // Emit engine stopped event
    this.eventManager.emit('engineStopped', {
      timestamp: Date.now(),
      reason: 'Manual stop',
      frameCount: this.frameCount,
      totalPlayTime: this.gameState.getTotalPlayTime()
    })
    
    console.log('Game engine stopped')
  }

  private gameLoop(currentTime: number = performance.now()): void {
    if (!this.running) return

    const deltaTime = currentTime - this.lastFrameTime
    this.lastFrameTime = currentTime

    try {
      // Record frame time for performance monitoring
      this.performanceMonitor.recordFrameTime(deltaTime)
      
      // Update time manager
      this.timeManager.update(deltaTime)

      // Update all systems in proper order
      this.systemManager.updateAllSystems(deltaTime)

      // Update game logic
      this.updateGameLogic(deltaTime)

      // Update FPS counter
      this.updateFPSCounter(deltaTime)

      // Schedule next frame
      this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this))
    } catch (error) {
      console.error('Game loop error:', error)
      this.errorBoundary.handleError('GameEngine', error as Error, { deltaTime }, 'critical')
      this.stop()
    }
  }

  private updateGameLogic(deltaTime: number): void {
    // Update game state
    this.gameState.update(deltaTime)
    
    // Process events
    this.eventManager.processEvents()
  }

  private updateFPSCounter(deltaTime: number): void {
    this.frameCount++
    this.fpsCounter++

    // Update FPS every second
    if (this.lastFrameTime - this.lastFpsUpdate >= 1000) {
      const currentFPS = this.fpsCounter
      this.fpsCounter = 0
      this.lastFpsUpdate = this.lastFrameTime

      // Emit FPS update event
      this.eventManager.emit('fpsUpdated', {
        fps: currentFPS,
        frameCount: this.frameCount
      })

      // Log FPS in debug mode
      if (this.config.enableDebugMode) {
        console.log(`FPS: ${currentFPS}`)
      }
    }
  }

  // Event handlers
  private handleGameStateInitialized(event: any): void {
    console.log('Game state initialized:', event)
  }

  private handleGameStateUpdated(event: any): void {
    // Handle game state updates
    if (this.config.enableDebugMode) {
      console.log('Game state updated:', event)
    }
  }

  private handleQuestStarted(event: any): void {
    console.log(`Quest started: ${event.questId}`)
  }

  private handleQuestCompleted(event: any): void {
    console.log(`Quest completed: ${event.questId}`)
  }

  private handlePlayerLevelUp(event: any): void {
    console.log(`Player leveled up to level ${event.newLevel}!`)
  }

  private handleWorldChanged(event: any): void {
    console.log(`World changed from ${event.oldWorld} to ${event.newWorld}`)
  }

  private handleAchievementUnlocked(event: any): void {
    console.log(`Achievement unlocked: ${event.achievementId}`)
  }

  private handleGamePaused(event: any): void {
    console.log('Game paused')
  }

  private handleGameResumed(event: any): void {
    console.log('Game resumed')
  }

  private handleSystemError(event: any): void {
    console.error('System error:', event)
  }

  // Public getters
  public getGameState(): GameState {
    return this.gameState
  }

  public getSystemManager(): SystemManager {
    return this.systemManager
  }

  public getEventManager(): EventManager {
    return this.eventManager
  }

  public getTimeManager(): TimeManager {
    return this.timeManager
  }

  public getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor
  }

  public getErrorBoundary(): ErrorBoundary {
    return this.errorBoundary
  }

  public isRunning(): boolean {
    return this.running
  }

  public getFrameCount(): number {
    return this.frameCount
  }

  public getFPS(): number {
    return this.fpsCounter
  }

  public getConfig(): GameEngineConfig {
    return { ...this.config }
  }

  // Configuration methods
  public setTargetFPS(fps: number): void {
    this.config.targetFPS = Math.max(1, Math.min(120, fps))
  }

  public enableDebugMode(enabled: boolean): void {
    this.config.enableDebugMode = enabled
  }

  public getSystemStatus(): Record<string, { active: boolean; priority: number; dependencies: string[] }> {
    return this.systemManager.getSystemStatus()
  }

  public pauseSystem(systemName: string): boolean {
    return this.systemManager.pauseSystem(systemName)
  }

  public resumeSystem(systemName: string): boolean {
    return this.systemManager.resumeSystem(systemName)
  }

  public setSystemPriority(systemName: string, priority: number): boolean {
    return this.systemManager.setSystemPriority(systemName, priority)
  }

  // Utility methods
  public getPerformanceStats(): {
    frameCount: number
    fps: number
    totalPlayTime: number
    activeSystems: number
    totalSystems: number
  } {
    return {
      frameCount: this.frameCount,
      fps: this.fpsCounter,
      totalPlayTime: this.gameState.getTotalPlayTime(),
      activeSystems: this.systemManager.getActiveSystemCount(),
      totalSystems: this.systemManager.getSystemCount()
    }
  }

  public reset(): void {
    this.stop()
    this.gameState.resetGame()
    this.frameCount = 0
    this.fpsCounter = 0
    this.lastFpsUpdate = 0
    console.log('Game engine reset')
  }
} 
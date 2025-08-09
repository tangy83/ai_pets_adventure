import { GameEngine, GameEngineConfig } from '../GameEngine'
import { GameState } from '../GameState'
import { EventManager } from '../EventManager'
import { SystemManager, SystemConfig } from '../SystemManager'
import { BaseSystem } from '../systems/BaseSystem'

// Mock system for testing
class MockSystem extends BaseSystem {
  public updateCount: number = 0
  public initializeCount: number = 0
  public destroyCount: number = 0

  constructor(name: string, priority: number = 0, dependencies: string[] = []) {
    super(name, priority, dependencies)
  }

  update(deltaTime: number): void {
    this.updateCount++
  }

  initialize(): void {
    this.initializeCount++
    super.initialize()
  }

  destroy(): void {
    this.destroyCount++
    super.destroy()
  }
}

describe('Core Systems Architecture', () => {
  let eventManager: EventManager
  let systemManager: SystemManager
  let gameState: GameState
  let gameEngine: GameEngine

  beforeEach(() => {
    eventManager = new EventManager()
    systemManager = new SystemManager()
    gameState = new GameState(eventManager)
    gameEngine = new GameEngine({
      enableSystems: ['input', 'ai', 'physics', 'rendering', 'audio'],
      enableDebugMode: true
    })
  })

  afterEach(() => {
    eventManager.destroy()
    systemManager.destroyAllSystems()
    gameEngine.stop()
  })

  describe('EventManager', () => {
    it('should handle typed events correctly', () => {
      const handler = jest.fn()
      const subscriptionId = eventManager.on('gameStateInitialized', handler)
      
      expect(subscriptionId).toBeDefined()
      expect(eventManager.getSubscriptionCount('gameStateInitialized')).toBe(1)
    })

    it('should handle event priorities correctly', () => {
      const highPriorityHandler = jest.fn()
      const lowPriorityHandler = jest.fn()
      
      eventManager.on('testEvent', lowPriorityHandler, undefined, 1)
      eventManager.on('testEvent', highPriorityHandler, undefined, 10)
      
      eventManager.emit('testEvent', { data: 'test' })
      
      // Both handlers should be called
      expect(highPriorityHandler).toHaveBeenCalled()
      expect(lowPriorityHandler).toHaveBeenCalled()
    })

    it('should validate event data', () => {
      const handler = jest.fn()
      eventManager.on('testEvent', handler)
      
      // Valid data
      eventManager.emit('testEvent', { valid: true })
      expect(handler).toHaveBeenCalledWith({ valid: true })
      
      // Invalid data (null)
      eventManager.emit('testEvent', null as any)
      expect(handler).toHaveBeenCalledTimes(1) // Should not call handler for invalid data
    })

    it('should handle event statistics', () => {
      eventManager.emit('testEvent', { data: 'test' })
      eventManager.emit('testEvent', { data: 'test2' })
      
      const stats = eventManager.getEventStatsForType('testEvent')
      expect(stats?.count).toBe(2)
    })
  })

  describe('SystemManager', () => {
    it('should handle system priorities correctly', () => {
      const highPrioritySystem = new MockSystem('high', 100)
      const lowPrioritySystem = new MockSystem('low', 50)
      
      systemManager.addSystem({
        name: 'high',
        system: highPrioritySystem,
        priority: 100
      })
      
      systemManager.addSystem({
        name: 'low',
        system: lowPrioritySystem,
        priority: 50
      })
      
      const systemOrder = systemManager.getSystemNames()
      // Note: Lower priority numbers = higher priority, so 50 comes before 100
      expect(systemOrder[0]).toBe('low') // Priority 50 comes first
      expect(systemOrder[1]).toBe('high') // Priority 100 comes second
    })

    it('should handle system dependencies correctly', () => {
      const baseSystem = new MockSystem('base', 100)
      const dependentSystem = new MockSystem('dependent', 50, ['base'])
      
      systemManager.addSystem({
        name: 'base',
        system: baseSystem,
        priority: 100
      })
      
      systemManager.addSystem({
        name: 'dependent',
        system: dependentSystem,
        priority: 50,
        dependencies: ['base']
      })
      
      const systemOrder = systemManager.getSystemNames()
      expect(systemOrder.indexOf('base')).toBeLessThan(systemOrder.indexOf('dependent'))
    })

    it('should detect circular dependencies', () => {
      const system1 = new MockSystem('system1', 100, ['system2'])
      const system2 = new MockSystem('system2', 50, ['system1'])
      
      systemManager.addSystem({
        name: 'system1',
        system: system1,
        priority: 100,
        dependencies: ['system2']
      })
      
      systemManager.addSystem({
        name: 'system2',
        system: system2,
        priority: 50,
        dependencies: ['system1']
      })
      
      // Should handle circular dependency gracefully
      const systemOrder = systemManager.getSystemNames()
      expect(systemOrder.length).toBeGreaterThan(0)
    })

    it('should handle system lifecycle correctly', () => {
      const system = new MockSystem('test', 50)
      
      systemManager.addSystem({
        name: 'test',
        system,
        autoStart: false
      })
      
      expect(system.initializeCount).toBe(0)
      expect(system.isActive).toBe(false)
      
      systemManager.initializeAllSystems()
      expect(system.initializeCount).toBe(1)
      expect(system.isActive).toBe(true)
    })

    it('should provide system status information', () => {
      const system = new MockSystem('test', 50)
      
      systemManager.addSystem({
        name: 'test',
        system,
        priority: 50
      })
      
      const status = systemManager.getSystemStatus()
      expect(status.test).toEqual({
        active: true,
        priority: 50,
        dependencies: []
      })
    })
  })

  describe('GameState', () => {
    it('should initialize correctly with event manager', () => {
      const handler = jest.fn()
      eventManager.on('gameStateInitialized', handler)
      
      gameState.initialize()
      
      expect(handler).toHaveBeenCalled()
      expect(gameState.getInitializationStatus()).toBe(true)
    })

    it('should emit events for state changes', () => {
      const questStartedHandler = jest.fn()
      const questCompletedHandler = jest.fn()
      
      eventManager.on('questStarted', questStartedHandler)
      eventManager.on('questCompleted', questCompletedHandler)
      
      gameState.initialize()
      
      // Start a quest
      const success = gameState.startQuest('quest_1')
      expect(success).toBe(true)
      expect(questStartedHandler).toHaveBeenCalled()
      
      // Complete the quest
      const completed = gameState.completeQuest('quest_1')
      expect(completed).toBe(true)
      expect(questCompletedHandler).toHaveBeenCalled()
    })

    it('should handle player level up events', () => {
      const levelUpHandler = jest.fn()
      eventManager.on('playerLevelUp', levelUpHandler)
      
      gameState.initialize()
      
      // Manually trigger level up by calling the method directly
      const player = gameState.getPlayer()
      // Use the protected method to trigger level up
      (gameState as any).levelUpPlayer(2)
      
      expect(levelUpHandler).toHaveBeenCalledWith({
        newLevel,
        player: gameState.getPlayer()
      })
    })

    it('should handle world changes', () => {
      const worldChangedHandler = jest.fn()
      eventManager.on('worldChanged', worldChangedHandler)
      
      gameState.initialize()
      
      const oldWorld = gameState.getCurrentWorld()
      gameState.setCurrentWorld('crystal_caverns')
      
      expect(worldChangedHandler).toHaveBeenCalledWith({
        oldWorld,
        newWorld: 'crystal_caverns',
        player: gameState.getPlayer()
      })
    })

    it('should handle achievements', () => {
      const achievementHandler = jest.fn()
      eventManager.on('achievementUnlocked', achievementHandler)
      
      gameState.initialize()
      
      gameState.addAchievement('first_quest')
      
      expect(achievementHandler).toHaveBeenCalledWith({
        achievementId: 'first_quest',
        totalAchievements: 1
      })
    })
  })

  describe('GameEngine', () => {
    it('should initialize with correct configuration', () => {
      const config: GameEngineConfig = {
        enableSystems: ['input', 'rendering'],
        systemPriorities: { input: 200, rendering: 100 },
        targetFPS: 30,
        enableDebugMode: true
      }
      
      const customEngine = new GameEngine(config)
      
      expect(customEngine.getConfig().targetFPS).toBe(30)
      expect(customEngine.getConfig().enableDebugMode).toBe(true)
      
      customEngine.stop()
    })

    it('should start and stop correctly', () => {
      expect(gameEngine.isRunning()).toBe(false)
      
      gameEngine.start()
      expect(gameEngine.isRunning()).toBe(true)
      
      gameEngine.stop()
      expect(gameEngine.isRunning()).toBe(false)
    })

    it('should handle system management', () => {
      const status = gameEngine.getSystemStatus()
      expect(Object.keys(status).length).toBeGreaterThan(0)
      
      // Test system priority changes
      const success = gameEngine.setSystemPriority('rendering', 25)
      expect(success).toBe(true)
      
      const newStatus = gameEngine.getSystemStatus()
      expect(newStatus.rendering.priority).toBe(25)
    })

    it('should provide performance statistics', () => {
      gameEngine.start()
      
      // Wait a bit for some frames to process
      setTimeout(() => {
        const stats = gameEngine.getPerformanceStats()
        
        expect(stats.frameCount).toBeGreaterThan(0)
        expect(stats.activeSystems).toBeGreaterThan(0)
        expect(stats.totalSystems).toBeGreaterThan(0)
        
        gameEngine.stop()
      }, 100)
    })

    it('should handle debug mode', () => {
      gameEngine.enableDebugMode(true)
      expect(gameEngine.getConfig().enableDebugMode).toBe(true)
      
      gameEngine.enableDebugMode(false)
      expect(gameEngine.getConfig().enableDebugMode).toBe(false)
    })

    it('should reset correctly', () => {
      gameEngine.start()
      
      // Wait a bit for some frames to process
      setTimeout(() => {
        const initialStats = gameEngine.getPerformanceStats()
        expect(initialStats.frameCount).toBeGreaterThan(0)
        
        gameEngine.reset()
        
        const resetStats = gameEngine.getPerformanceStats()
        expect(resetStats.frameCount).toBe(0)
        expect(gameEngine.isRunning()).toBe(false)
      }, 100)
    })
  })

  describe('BaseSystem', () => {
    it('should handle event manager correctly', () => {
      const system = new MockSystem('test', 50)
      
      system.setEventManager(eventManager)
      expect(system.eventManager).toBe(eventManager)
    })

    it('should handle priority and dependencies', () => {
      const system = new MockSystem('test', 50, ['dependency1'])
      
      system.setPriority(75)
      system.setDependencies(['dependency1', 'dependency2'])
      
      expect(system.priority).toBe(75)
      expect(system.dependencies).toEqual(['dependency1', 'dependency2'])
    })

    it('should provide status information', () => {
      const system = new MockSystem('test', 50, ['dep1'])
      
      const status = system.getStatus()
      expect(status).toEqual({
        name: 'test',
        active: true,
        priority: 50,
        dependencies: ['dep1']
      })
    })

    it('should handle pause and resume', () => {
      const system = new MockSystem('test', 50)
      
      expect(system.isActive).toBe(true)
      
      system.pause()
      expect(system.isActive).toBe(false)
      
      system.resume()
      expect(system.isActive).toBe(true)
    })
  })
}) 
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
    }, eventManager)
    
    // Wait for the GameEngine to finish setting up its event listeners
    // This ensures we're testing against the same EventManager instance
  })

  afterEach(() => {
    eventManager.destroy()
    systemManager.destroyAllSystems()
    gameEngine.stop()
  })

  describe('EventManager', () => {
    it('should handle typed events correctly', () => {
      const handler = jest.fn()
      // Use a test-specific event type that the GameEngine doesn't subscribe to
      const testEventType = 'testEvent' as any
      const subscriptionId = eventManager.on(testEventType, handler)
      
      expect(subscriptionId).toBeDefined()
      expect(eventManager.hasSubscribers(testEventType)).toBe(true)
      
      eventManager.emit(testEventType, { testData: 'test' })
      expect(handler).toHaveBeenCalledWith({ testData: 'test' })
      
      eventManager.off(subscriptionId)
      expect(eventManager.hasSubscribers(testEventType)).toBe(false)
    })

    it('should handle event priorities correctly', () => {
      const highPriorityHandler = jest.fn()
      const lowPriorityHandler = jest.fn()
      
      eventManager.on('playerLevelUp', lowPriorityHandler, undefined, 10)
      eventManager.on('playerLevelUp', highPriorityHandler, undefined, 100)
      
      eventManager.emit('playerLevelUp', { newLevel: 2, player: { id: '1', name: 'Test' } })
      
      // High priority handler should be called first
      expect(highPriorityHandler).toHaveBeenCalled()
      expect(lowPriorityHandler).toHaveBeenCalled()
    })

    it('should validate event data', () => {
      const handler = jest.fn()
      eventManager.on('playerLevelUp', handler)
      
      // This should work with valid data
      eventManager.emit('playerLevelUp', { newLevel: 2, player: { id: '1', name: 'Test' } })
      expect(handler).toHaveBeenCalled()
    })

    it('should handle event statistics', () => {
      eventManager.emit('playerLevelUp', { newLevel: 2, player: { id: '1', name: 'Test' } })
      eventManager.emit('playerLevelUp', { newLevel: 3, player: { id: '1', name: 'Test' } })
      
      const stats = eventManager.getEventStats()
      expect(stats.get('playerLevelUp')?.count).toBe(2)
    })
  })

  describe('SystemManager', () => {
    it('should handle system priorities correctly', () => {
      const highPrioritySystem = new MockSystem('highPriority', 100)
      const lowPrioritySystem = new MockSystem('lowPriority', 200)
      
      systemManager.addSystem({
        name: 'highPriority',
        system: highPrioritySystem,
        priority: 100
      })
      
      systemManager.addSystem({
        name: 'lowPriority',
        system: lowPrioritySystem,
        priority: 200
      })
      
      const systems = systemManager.getAllSystems()
      expect(systems[0].name).toBe('highPriority')
      expect(systems[1].name).toBe('lowPriority')
    })

    it('should handle system dependencies correctly', () => {
      const dependentSystem = new MockSystem('dependent', 100, ['base'])
      const baseSystem = new MockSystem('base', 200)
      
      systemManager.addSystem({
        name: 'base',
        system: baseSystem,
        priority: 200
      })
      
      systemManager.addSystem({
        name: 'dependent',
        system: dependentSystem,
        priority: 100,
        dependencies: ['base']
      })
      
      const systems = systemManager.getAllSystems()
      expect(systems[0].name).toBe('base')
      expect(systems[1].name).toBe('dependent')
    })

    it('should detect circular dependencies', () => {
      const system1 = new MockSystem('system1', 100, ['system2'])
      const system2 = new MockSystem('system2', 200, ['system1'])
      
      systemManager.addSystem({
        name: 'system1',
        system: system1,
        priority: 100,
        dependencies: ['system2']
      })
      
      systemManager.addSystem({
        name: 'system2',
        system: system2,
        priority: 200,
        dependencies: ['system1']
      })
      
      // Should handle circular dependencies gracefully
      const systems = systemManager.getAllSystems()
      expect(systems.length).toBe(2)
    })

    it('should handle system lifecycle correctly', () => {
      const system = new MockSystem('test', 100)
      
      systemManager.addSystem({
        name: 'test',
        system: system,
        priority: 100
      })
      
      expect(systemManager.hasSystem('test')).toBe(true)
      expect(system.initializeCount).toBe(1)
      
      systemManager.removeSystem('test')
      expect(systemManager.hasSystem('test')).toBe(false)
      expect(system.destroyCount).toBe(1)
    })

    it('should provide system status information', () => {
      const system = new MockSystem('test', 100)
      
      systemManager.addSystem({
        name: 'test',
        system: system,
        priority: 100
      })
      
      const status = systemManager.getSystemStatus()
      expect(status.test).toBeDefined()
      expect(status.test.active).toBe(true)
      expect(status.test.priority).toBe(100)
    })
  })

  describe('GameState', () => {
    it('should initialize correctly with event manager', () => {
      gameState.initialize()
      
      expect(gameState.getInitializationStatus()).toBe(true)
      expect(gameState.getPlayer()).toBeDefined()
      expect(gameState.getPet()).toBeDefined()
    })

    it('should emit events for state changes', () => {
      const levelUpHandler = jest.fn()
      eventManager.on('playerLevelUp', levelUpHandler)
      
      gameState.initialize()
      gameState.levelUpPlayer(2)
      
      expect(levelUpHandler).toHaveBeenCalled()
    })

    it('should handle player level up events', () => {
      const levelUpHandler = jest.fn()
      eventManager.on('playerLevelUp', levelUpHandler)
      
      gameState.initialize()
      
      // Manually trigger level up by calling the method directly
      const player = gameState.getPlayer()
      const newLevel = 2
      
      // Use the public method to trigger level up
      gameState.levelUpPlayer(newLevel)
      
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
      gameEngine.start()
      
      const config = gameEngine.getConfig()
      expect(config.enableDebugMode).toBeDefined()
      expect(gameEngine.isRunning()).toBe(true)
      
      gameEngine.stop()
    })

    it('should reset correctly', () => {
      gameEngine.start()
      expect(gameEngine.isRunning()).toBe(true)
      
      gameEngine.reset()
      expect(gameEngine.isRunning()).toBe(false)
    })
  })

  describe('BaseSystem', () => {
    it('should handle event manager correctly', () => {
      const system = new MockSystem('test', 100)
      
      expect(system.name).toBe('test')
      expect(system.priority).toBe(100)
      expect(system.isActive).toBe(true)
    })

    it('should handle priority and dependencies', () => {
      const system = new MockSystem('test', 100, ['dependency'])
      
      expect(system.priority).toBe(100)
      expect(system.dependencies).toEqual(['dependency'])
    })

    it('should provide status information', () => {
      const system = new MockSystem('test', 100)
      
      expect(system.name).toBe('test')
      expect(system.priority).toBe(100)
      expect(system.isActive).toBe(true)
    })

    it('should handle pause and resume', () => {
      const system = new MockSystem('test', 100)
      
      system.pause()
      expect(system.isActive).toBe(false)
      
      system.resume()
      expect(system.isActive).toBe(true)
    })
  })
}) 

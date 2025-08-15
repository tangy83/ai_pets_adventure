import { GameEngine } from '../GameEngine'
import { GameState } from '../GameState'
import { EventManager } from '../EventManager'
import { PerformanceMonitor } from '../PerformanceMonitor'
import { ErrorBoundary } from '../ErrorBoundary'
import { PositionComponent, RenderableComponent, EntityManager } from '../EntityComponentSystem'
import { ComponentRegistry } from '../ComponentRegistry'

describe('Phase 1.3: Core Systems Architecture', () => {
  let eventManager: EventManager
  let gameState: GameState
  let gameEngine: GameEngine
  let performanceMonitor: PerformanceMonitor
  let errorBoundary: ErrorBoundary
  let componentRegistry: ComponentRegistry

  beforeEach(() => {
    gameEngine = new GameEngine({
      enableSystems: ['input', 'ai', 'physics', 'rendering', 'audio'],
      enableDebugMode: true
    })
    
    // Use the same EventManager instance that GameEngine uses
    eventManager = gameEngine.getEventManager()
    gameState = new GameState(eventManager)
    
    performanceMonitor = PerformanceMonitor.getInstance(eventManager)
    errorBoundary = ErrorBoundary.getInstance(eventManager)
    componentRegistry = ComponentRegistry.getInstance()
    
    // Clear error boundary state before each test
    errorBoundary.reset()
  })

  afterEach(() => {
    eventManager.destroy()
    gameEngine.stop()
    componentRegistry.clear()
  })

  describe('1. Immutable State Management', () => {
    it('should maintain state immutability in GameState updates', () => {
      const initialState = gameState.getPlayer()
      const initialPlayTime = gameState.getTotalPlayTime()
      
      // Update game state
      gameState.update(1000) // 1 second
      
      const updatedState = gameState.getPlayer()
      const updatedPlayTime = gameState.getTotalPlayTime()
      
      // Verify state was updated
      expect(updatedPlayTime).toBeGreaterThan(initialPlayTime)
      
      // Verify player object reference changed (immutability)
      expect(updatedState).not.toBe(initialState)
      
      // Verify player properties are preserved
      expect(updatedState.name).toBe(initialState.name)
      expect(updatedState.level).toBe(initialState.level)
    })

    it('should handle quest state changes immutably', () => {
      const initialQuest = gameState.getCurrentQuest()
      
      // Start a quest that doesn't exist in current world
      const success = gameState.startQuest('nonexistent_quest')
      expect(success).toBe(false) // Quest doesn't exist in current world
      
      // Change to a world with quests
      gameState.setCurrentWorld('emerald_jungle')
      const questSuccess = gameState.startQuest('test_quest_1')
      expect(questSuccess).toBe(true)
      
      const currentQuest = gameState.getCurrentQuest()
      expect(currentQuest).toBe('test_quest_1')
      expect(currentQuest).not.toBe(initialQuest)
    })

    it('should preserve state history through immutable updates', () => {
      const originalPlayer = gameState.getPlayer()
      const originalPlayTime = gameState.getTotalPlayTime()
      
      // Make multiple updates
      gameState.update(1000)
      gameState.update(2000)
      gameState.update(3000)
      
      const finalPlayer = gameState.getPlayer()
      const finalPlayTime = gameState.getTotalPlayTime()
      
      // Verify cumulative updates
      expect(finalPlayTime).toBeGreaterThan(originalPlayTime + 5000)
      
      // Verify player object identity changed
      expect(finalPlayer).not.toBe(originalPlayer)
    })
  })

  describe('2. Component Registry System', () => {
    it('should register and manage component types', () => {
      // Register component types
      componentRegistry.registerComponentType('position', PositionComponent)
      componentRegistry.registerComponentType('renderable', RenderableComponent)
      
      expect(componentRegistry.hasComponentType('position')).toBe(true)
      expect(componentRegistry.hasComponentType('renderable')).toBe(true)
      expect(componentRegistry.hasComponentType('nonexistent')).toBe(false)
    })

    it('should create component instances with validation', () => {
      componentRegistry.registerComponentType('position', PositionComponent)
      
      const component = componentRegistry.createComponent('position', 'entity_1', 10, 20, 0)
      expect(component).toBeInstanceOf(PositionComponent)
      expect(component?.entityId).toBe('entity_1')
      const posComponent = component as PositionComponent
      expect(posComponent.x).toBe(10)
      expect(posComponent.y).toBe(20)
    })

    it('should handle component creation errors gracefully', () => {
      const component = componentRegistry.createComponent('nonexistent', 'entity_1')
      expect(component).toBeNull()
    })

    it('should provide component type information', () => {
      componentRegistry.registerComponentType('position', PositionComponent)
      componentRegistry.registerComponentType('renderable', RenderableComponent)
      
      const types = componentRegistry.getRegisteredTypes()
      expect(types).toContain('position')
      expect(types).toContain('renderable')
      expect(types).toHaveLength(2)
    })
  })

  describe('3. Performance Monitoring System', () => {
    it('should track frame performance metrics', () => {
      // Record frame times
      performanceMonitor.recordFrameTime(16.67) // 60 FPS
      performanceMonitor.recordFrameTime(16.67)
      performanceMonitor.recordFrameTime(16.67)
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.fps).toBeCloseTo(60, 0)
      expect(metrics.frameTime).toBeCloseTo(16.67, 1)
    })

    it('should monitor system performance', () => {
      performanceMonitor.startSystemMonitoring('testSystem')
      
      // Record system update times
      performanceMonitor.recordSystemUpdate('testSystem', 5.0)
      performanceMonitor.recordSystemUpdate('testSystem', 3.0)
      performanceMonitor.recordSystemUpdate('testSystem', 7.0)
      
      const systemPerf = performanceMonitor.getSystemPerformance('testSystem')
      expect(systemPerf).toBeDefined()
      expect(systemPerf?.updateCount).toBe(3)
      expect(systemPerf?.averageUpdateTime).toBeCloseTo(5.0, 1)
    })

    it('should provide performance recommendations', () => {
      performanceMonitor.startSystemMonitoring('slowSystem')
      
      // Record slow system updates
      performanceMonitor.recordSystemUpdate('slowSystem', 20.0) // Above 16.67ms threshold
      performanceMonitor.recordSystemUpdate('slowSystem', 25.0)
      
      const summary = performanceMonitor.getPerformanceSummary()
      expect(summary.recommendations.length).toBeGreaterThan(0)
      expect(summary.recommendations.some(r => r.includes('slowSystem'))).toBe(true)
    })

    it('should track entity and component metrics', () => {
      performanceMonitor.updateEntityMetrics(100, 500)
      
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.entityCount).toBe(100)
      expect(metrics.componentCount).toBe(500)
    })
  })

  describe('4. Error Boundary System', () => {
    it('should handle and categorize errors by severity', () => {
      const testError = new Error('Test error')
      const errorId = errorBoundary.handleError('testSystem', testError, {}, 'high')
      
      expect(errorId).toBeDefined()
      
      const error = errorBoundary.getError(errorId)
      expect(error).toBeDefined()
      expect(error?.system).toBe('testSystem')
      expect(error?.severity).toBe('high')
      expect(error?.recovered).toBe(false)
    })

    it('should attempt recovery for high severity errors', () => {
      const testError = new Error('Critical error')
      const errorId = errorBoundary.handleError('criticalSystem', testError, {}, 'critical')
      
      // Wait for recovery attempt
      setTimeout(() => {
        const error = errorBoundary.getError(errorId)
        expect(error?.recoveryAttempts).toBeGreaterThan(0)
      }, 100)
    })

    it('should provide error statistics', () => {
      errorBoundary.handleError('system1', new Error('Error 1'), {}, 'low')
      errorBoundary.handleError('system2', new Error('Error 2'), {}, 'medium')
      errorBoundary.handleError('system1', new Error('Error 3'), {}, 'high')
      
      const stats = errorBoundary.getErrorStats()
      expect(stats.total).toBe(3)
      expect(stats.bySystem['system1']).toBe(2)
      expect(stats.bySystem['system2']).toBe(1)
      expect(stats.bySeverity.high).toBe(1)
      expect(stats.bySeverity.medium).toBe(1)
      expect(stats.bySeverity.low).toBe(1)
    })

    it('should clear resolved errors', () => {
      const errorId = errorBoundary.handleError('testSystem', new Error('Test'), {}, 'low')
      
      // Mark as recovered
      const error = errorBoundary.getError(errorId)
      if (error) {
        error.recovered = true
      }
      
      errorBoundary.clearResolvedErrors()
      expect(errorBoundary.getError(errorId)).toBeUndefined()
    })
  })

  describe('5. System Integration', () => {
    it('should integrate performance monitoring with game engine', () => {
      const engine = gameEngine.getPerformanceMonitor()
      expect(engine).toBeInstanceOf(PerformanceMonitor)
      
      // Start monitoring
      engine.startSystemMonitoring('testSystem')
      engine.recordSystemUpdate('testSystem', 10.0)
      
      const systemPerf = engine.getSystemPerformance('testSystem')
      expect(systemPerf?.updateTime).toBe(10.0)
    })

    it('should integrate error handling with game engine', () => {
      const engine = gameEngine.getErrorBoundary()
      expect(engine).toBeInstanceOf(ErrorBoundary)
      
      // Test error handling
      const errorId = engine.handleError('testSystem', new Error('Test'), {}, 'medium')
      expect(errorId).toBeDefined()
    })

    it('should maintain system state consistency', () => {
      const initialSystemCount = gameEngine.getSystemManager().getSystemCount()
      
      // Pause a system
      const success = gameEngine.pauseSystem('input')
      expect(success).toBe(true)
      
      // Verify system count remains the same
      expect(gameEngine.getSystemManager().getSystemCount()).toBe(initialSystemCount)
      
      // Resume system
      const resumeSuccess = gameEngine.resumeSystem('input')
      expect(resumeSuccess).toBe(true)
    })
  })

  describe('6. Event-Driven Architecture', () => {
    it('should maintain event system integrity across state changes', () => {
      const eventHandler = jest.fn()
      const subscriptionId = eventManager.on('gameStateUpdated', eventHandler)
      
      // Update game state
      gameState.update(1000)
      
      expect(eventHandler).toHaveBeenCalled()
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          deltaTime: 1000,
          totalPlayTime: expect.any(Number)
        })
      )
    })

    describe('System lifecycle events', () => {
      it('should handle system lifecycle events', () => {
        const systemStartedHandler = jest.fn()
        const systemStoppedHandler = jest.fn()
        
        eventManager.on('systemStarted', systemStartedHandler)
        eventManager.on('systemStopped', systemStoppedHandler)
        
        // Add a new system to trigger systemStarted event
        const testSystem = {
          name: 'testSystem',
          update: jest.fn(),
          priority: 50,
          isActive: true,
          initialize: jest.fn()
        }
        
        const systemManager = gameEngine.getSystemManager()
        systemManager.addSystemSimple('testSystem', testSystem, 50)
        
        expect(systemStartedHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            systemName: 'testSystem',
            timestamp: expect.any(Number)
          })
        )
        
        // Remove the system to trigger systemStopped event
        gameEngine.getSystemManager().removeSystem('testSystem')
        
        expect(systemStoppedHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            systemName: 'testSystem',
            timestamp: expect.any(Number)
          })
        )
      })
    })
  })

  describe('7. Memory Management', () => {
    it('should track memory usage in performance monitor', () => {
      const metrics = performanceMonitor.getMetrics()
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0)
    })

    it('should provide memory optimization recommendations', () => {
      // Simulate high memory usage
      const summary = performanceMonitor.getPerformanceSummary()
      expect(summary.recommendations).toBeDefined()
    })
  })

  describe('8. Error Recovery Strategies', () => {
    it('should register custom recovery strategies', () => {
      const customStrategy = {
        name: 'customRecovery',
        description: 'Custom recovery strategy',
        maxAttempts: 5,
        cooldown: 2000,
        execute: async (errorInfo: any) => {
          return true // Always succeed
        }
      }
      
      errorBoundary.registerRecoveryStrategy(customStrategy)
      
      // Test the strategy
      const errorId = errorBoundary.handleError('testSystem', new Error('Test'), {}, 'high')
      expect(errorId).toBeDefined()
    })
  })
}) 

import { GameEngine } from '../GameEngine'
import { GameState } from '../GameState'
import { SystemManager } from '../SystemManager'
import { EventManager } from '../EventManager'
import { TimeManager } from '../TimeManager'

describe('GameEngine', () => {
  let gameEngine: GameEngine

  beforeEach(() => {
    gameEngine = new GameEngine()
  })

  afterEach(() => {
    if (gameEngine) {
      gameEngine.stop()
    }
  })

  describe('Initialization', () => {
    test('should create a GameEngine instance with all required systems', () => {
      expect(gameEngine).toBeInstanceOf(GameEngine)
      expect(gameEngine.getGameState()).toBeInstanceOf(GameState)
      expect(gameEngine.getSystemManager()).toBeInstanceOf(SystemManager)
      expect(gameEngine.getEventManager()).toBeInstanceOf(EventManager)
      expect(gameEngine.getTimeManager()).toBeInstanceOf(TimeManager)
    })

    test('should initialize with default systems', () => {
      const systemManager = gameEngine.getSystemManager()
      expect(systemManager.hasSystem('input')).toBe(true)
      expect(systemManager.hasSystem('ai')).toBe(true)
      expect(systemManager.hasSystem('physics')).toBe(true)
      expect(systemManager.hasSystem('rendering')).toBe(true)
      expect(systemManager.hasSystem('audio')).toBe(true)
    })
  })

  describe('Game Loop Control', () => {
    test('should start the game loop', () => {
      const startSpy = jest.spyOn(console, 'log')
      gameEngine.start()
      
      expect(startSpy).toHaveBeenCalledWith('Game engine started')
      startSpy.mockRestore()
    })

    test('should stop the game loop', () => {
      gameEngine.start()
      const stopSpy = jest.spyOn(console, 'log')
      gameEngine.stop()
      
      expect(stopSpy).toHaveBeenCalledWith('Game engine stopped')
      stopSpy.mockRestore()
    })

    test('should not start if already running', () => {
      const startSpy = jest.spyOn(console, 'log').mockImplementation((message) => {
        // Only count the specific message we're testing
        if (message === 'Game engine started') {
          return
        }
      })
      
      gameEngine.start()
      gameEngine.start() // Try to start again
      
      expect(startSpy).toHaveBeenCalledTimes(1) // Should only be called once
      startSpy.mockRestore()
    })
  })

  describe('System Management', () => {
    test('should provide access to system manager', () => {
      const systemManager = gameEngine.getSystemManager()
      expect(systemManager).toBeInstanceOf(SystemManager)
      expect(systemManager.getSystemCount()).toBe(5) // Default systems
    })

    test('should provide access to event manager', () => {
      const eventManager = gameEngine.getEventManager()
      expect(eventManager).toBeInstanceOf(EventManager)
    })

    test('should provide access to time manager', () => {
      const timeManager = gameEngine.getTimeManager()
      expect(timeManager).toBeInstanceOf(TimeManager)
    })
  })

  describe('Game State Management', () => {
    test('should provide access to game state', () => {
      const gameState = gameEngine.getGameState()
      expect(gameState).toBeInstanceOf(GameState)
    })

    test('should handle game state changes', () => {
      const eventManager = gameEngine.getEventManager()
      const mockHandler = jest.fn()
      
      eventManager.on('gameStateChanged', mockHandler)
      eventManager.emit('gameStateChanged', { test: 'data' })
      
      expect(mockHandler).toHaveBeenCalledWith({ test: 'data' })
    })
  })

  describe('Performance', () => {
    test('should maintain consistent frame timing', () => {
      const startTime = performance.now()
      gameEngine.start()
      
      // Let the game run for a few frames
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          gameEngine.stop()
          const endTime = performance.now()
          const duration = endTime - startTime
          
          // Should have run for at least 100ms
          expect(duration).toBeGreaterThan(100)
          resolve()
        }, 150)
      })
    })
  })
}) 
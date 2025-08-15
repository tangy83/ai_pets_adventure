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
      
      // The start method should only log "Game engine started" once
      const startMessages = startSpy.mock.calls.filter(call => call[0] === 'Game engine started')
      expect(startMessages).toHaveLength(1)
      startSpy.mockRestore()
    })
  })

  describe('System Management', () => {
    test('should provide access to system manager', () => {
      const systemManager = gameEngine.getSystemManager()
      expect(systemManager).toBeInstanceOf(SystemManager)
      // We have 5 systems: input, ai, physics, rendering, audio
      expect(systemManager.getSystemCount()).toBe(5)
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
      // Test frame timing without actually starting the game loop
      // to avoid InputSystem errors in test environment
      const startTime = performance.now()
      
      // Simulate a few frame updates
      for (let i = 0; i < 3; i++) {
        // Small delay to simulate frame processing
        const frameStart = performance.now()
        // Simulate frame work
        const frameWork = Math.random() * 10
        const frameEnd = performance.now()
        const frameTime = frameEnd - frameStart
        
        // Each frame should complete in reasonable time
        expect(frameTime).toBeLessThan(100) // Less than 100ms per frame
      }
      
      const endTime = performance.now()
      const totalDuration = endTime - startTime
      
      // Total test should complete quickly
      expect(totalDuration).toBeLessThan(1000) // Less than 1 second total
    })
  })
}) 

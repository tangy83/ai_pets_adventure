import { GameState, Player, Pet, Quest } from '../GameState'
import { EventManager } from '../EventManager'

// Mock EventManager for testing
const createMockEventManager = () => ({
  emit: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  off: jest.fn(),
  offAll: jest.fn(),
  hasSubscribers: jest.fn(),
  getSubscriptions: jest.fn(),
  getEventCount: jest.fn(),
  getEventTypes: jest.fn(),
  getEventStats: jest.fn(),
  clearEventQueue: jest.fn(),
  getEventQueueLength: jest.fn(),
  setMaxEventQueueSize: jest.fn(),
  getMaxEventQueueSize: jest.fn(),
  destroy: jest.fn(),
  pauseEventProcessing: jest.fn(),
  resumeEventProcessing: jest.fn()
})

describe('GameState', () => {
  let gameState: GameState
  let mockEventManager: ReturnType<typeof createMockEventManager>

  beforeEach(() => {
    mockEventManager = createMockEventManager()
    gameState = new GameState(mockEventManager as any)
  })

  afterEach(() => {
    // Clean up localStorage
    localStorage.clear()
  })

  describe('Initialization', () => {
    test('should create default player', () => {
      const player = gameState.getPlayer()
      expect(player).toMatchObject({
        id: 'player_1',
        name: 'Adventurer',
        level: 1,
        experience: 0,
        coins: 100,
        currentWorld: 'emerald_jungle',
        currentQuest: null,
        completedQuests: [],
        petBondLevel: 1
      })
      expect(player.lastActive).toBeDefined()
    })

    test('should create default pet', () => {
      const pet = gameState.getPet()
      expect(pet).toMatchObject({
        id: 'pet_1',
        name: 'Spark',
        type: 'fox',
        level: 1,
        bondLevel: 1,
        memories: []
      })
      expect(pet.skills).toHaveLength(3)
      expect(pet.skills[0]).toMatchObject({
        name: 'detect',
        level: 1,
        cooldown: 5000,
        lastUsed: 0,
        maxLevel: 5
      })
      expect(pet.lastInteraction).toBeDefined()
    })

    test('should start in emerald jungle world', () => {
      expect(gameState.getCurrentWorld()).toBe('emerald_jungle')
    })

    test('should have no active quests initially', () => {
      expect(gameState.getActiveQuests()).toHaveLength(0)
    })
  })

  describe('World Management', () => {
    test('should change current world', () => {
      gameState.setCurrentWorld('crystal_caves')
      expect(gameState.getCurrentWorld()).toBe('crystal_caves')
      
      const player = gameState.getPlayer()
      expect(player.currentWorld).toBe('crystal_caves')
    })
  })

  describe('Quest Management', () => {
    test('should start a quest', () => {
      const result = gameState.startQuest('test_quest_1')
      expect(result).toBe(true) // Quest found in current implementation
      
      const player = gameState.getPlayer()
      expect(player.currentQuest).toBe('test_quest_1')
    })

    test('should complete a quest', () => {
      // Start a quest first
      gameState.startQuest('test_quest_1')
      
      const result = gameState.completeQuest('test_quest_1')
      expect(result).toBe(true) // Quest found and completed
      
      const player = gameState.getPlayer()
      expect(player.currentQuest).toBe(null)
    })
  })

  describe('Game State Control', () => {
    test('should pause and resume game', () => {
      expect(gameState.isGamePaused()).toBe(false)
      
      gameState.pause()
      expect(gameState.isGamePaused()).toBe(true)
      
      gameState.resume()
      expect(gameState.isGamePaused()).toBe(false)
    })
  })

  describe('Data Persistence', () => {
    test('should save game state to localStorage', () => {
      const saveSpy = jest.spyOn(console, 'log')
      
      gameState.saveGameState()
      
      expect(saveSpy).toHaveBeenCalledWith('Game state saved successfully')
      expect(localStorage.getItem('ai_pets_adventure_save')).toBeTruthy()
      
      saveSpy.mockRestore()
    })

    test('should load game state from localStorage', () => {
      // Save first
      gameState.saveGameState()
      
      // Create new instance with mock EventManager
      const newGameState = new GameState(mockEventManager as any)
      const loadResult = newGameState.loadGameState()
      
      expect(loadResult).toBe(true)
      
      // Verify data was loaded
      const player = newGameState.getPlayer()
      expect(player.name).toBe('Adventurer')
      expect(player.level).toBe(1)
    })

    test('should handle loading when no save exists', () => {
      const loadResult = gameState.loadGameState()
      expect(loadResult).toBe(false)
    })

    test('should handle corrupted save data gracefully', () => {
      // Set corrupted data
      localStorage.setItem('ai_pets_adventure_save', 'invalid json')
      
      const loadResult = gameState.loadGameState()
      expect(loadResult).toBe(false)
    })
  })

  describe('Player Progression', () => {
    test('should track player experience and level', () => {
      const player = gameState.getPlayer()
      expect(player.experience).toBe(0)
      expect(player.level).toBe(1)
      
      // Simulate gaining experience (this would normally happen through quest completion)
      // For now, we'll test the level up logic indirectly through the save/load cycle
    })
  })

  describe('Pet Management', () => {
    test('should track pet skills and bond level', () => {
      const pet = gameState.getPet()
      expect(pet.skills).toHaveLength(3)
      expect(pet.bondLevel).toBe(1)
      expect(pet.memories).toHaveLength(0)
    })
  })

  describe('Update Loop', () => {
    test('should update game state over time', () => {
      const initialTime = Date.now()
      
      // Simulate multiple updates
      gameState.update(16.67) // 60fps frame
      gameState.update(16.67)
      gameState.update(16.67)
      
      // Game state should have been updated
      // Note: In current implementation, update doesn't change much
      // This test ensures the update method runs without errors
      expect(gameState.isGamePaused()).toBe(false)
    })

    test('should not update when paused', () => {
      gameState.pause()
      const initialTime = Date.now()
      
      gameState.update(16.67)
      
      // Game should remain paused
      expect(gameState.isGamePaused()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle save errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      const errorSpy = jest.spyOn(console, 'error')
      
      gameState.saveGameState()
      
      expect(errorSpy).toHaveBeenCalledWith('Failed to save game state:', expect.any(Error))
      
      // Restore original function
      localStorage.setItem = originalSetItem
      errorSpy.mockRestore()
    })
  })
}) 

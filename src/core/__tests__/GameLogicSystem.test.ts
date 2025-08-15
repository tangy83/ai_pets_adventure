import { GameLogicSystem } from '../systems/GameLogicSystem'
import { EventManager } from '../EventManager'
import { QuestSystem } from '../../worlds/QuestSystem'

describe('GameLogicSystem', () => {
  let gameLogicSystem: GameLogicSystem
  let eventManager: EventManager
  let questSystem: QuestSystem

  beforeEach(() => {
    eventManager = EventManager.getInstance()
    gameLogicSystem = new GameLogicSystem()
    gameLogicSystem.setEventManager(eventManager)
    questSystem = QuestSystem.getInstance()
    gameLogicSystem.initialize()
  })

  afterEach(() => {
    gameLogicSystem.destroy()
    localStorage.clear()
  })

  describe('Initialization', () => {
    test('should initialize with default values', () => {
      const score = gameLogicSystem.getCurrentScore()
      const progress = gameLogicSystem.getProgress()

      expect(score.totalScore).toBe(0)
      expect(score.questScore).toBe(0)
      expect(score.explorationScore).toBe(0)
      expect(score.petBondScore).toBe(0)
      expect(score.achievementScore).toBe(0)
      expect(score.multiplier).toBe(1.0)
      expect(score.streak).toBe(0)

      expect(progress.currentLevel).toBe(1)
      expect(progress.experience).toBe(0)
      expect(progress.experienceToNext).toBe(100)
      expect(progress.petBondProgress).toBe(0)
    })

    test('should load saved progress from localStorage', () => {
      const savedData = {
        score: { totalScore: 500, streak: 3 },
        progress: { currentLevel: 5, experience: 75 },
        achievements: []
      }
      localStorage.setItem('game_progress', JSON.stringify(savedData))

      // Create new instance to trigger load
      const newSystem = new GameLogicSystem()
      newSystem.setEventManager(eventManager)
      newSystem.initialize()

      const score = newSystem.getCurrentScore()
      const progress = newSystem.getProgress()

      expect(score.totalScore).toBe(500)
      expect(score.streak).toBe(3)
      expect(progress.currentLevel).toBe(5)
      expect(progress.experience).toBe(75)

      newSystem.destroy()
    })
  })

  describe('Scoring System', () => {
    test('should add points for quest actions', () => {
      const initialScore = gameLogicSystem.getCurrentScore().totalScore
      
      // Simulate quest started event
      eventManager.emit('questStarted', { questId: 'test_quest' })
      
      const newScore = gameLogicSystem.getCurrentScore().totalScore
      expect(newScore).toBeGreaterThan(initialScore)
    })

    test('should apply streak multiplier to scoring', () => {
      // Complete multiple quests to build streak
      eventManager.emit('questCompleted', { questId: 'quest1', rewards: [] })
      eventManager.emit('questCompleted', { questId: 'quest2', rewards: [] })
      eventManager.emit('questCompleted', { questId: 'quest3', rewards: [] })

      const score = gameLogicSystem.getCurrentScore()
      expect(score.streak).toBeGreaterThan(1)
      expect(score.multiplier).toBeGreaterThan(1.0)
    })

    test('should reset streak on quest failure', () => {
      // Build streak first
      eventManager.emit('questCompleted', { questId: 'quest1', rewards: [] })
      eventManager.emit('questCompleted', { questId: 'quest2', rewards: [] })
      
      const scoreBefore = gameLogicSystem.getCurrentScore()
      expect(scoreBefore.streak).toBeGreaterThan(1)

      // Fail a quest
      eventManager.emit('questFailed', { questId: 'quest3' })
      
      const scoreAfter = gameLogicSystem.getCurrentScore()
      expect(scoreAfter.streak).toBe(0)
      expect(scoreAfter.multiplier).toBe(1.0)
    })

    test('should calculate final score with multipliers', () => {
      const initialScore = gameLogicSystem.getCurrentScore().totalScore
      
      // Complete a quest (should get base points + multiplier)
      eventManager.emit('questCompleted', { questId: 'quest1', rewards: [] })
      
      const newScore = gameLogicSystem.getCurrentScore().totalScore
      expect(newScore).toBeGreaterThan(initialScore + 100) // Base 100 + multiplier
    })
  })

  describe('Quest Progress Tracking', () => {
    test('should track quest progress updates', () => {
      const questId = 'test_quest'
      
      // Start quest
      eventManager.emit('questStarted', { questId })
      
      // Complete objective
      eventManager.emit('objectiveCompleted', { 
        questId, 
        objectiveId: 'obj1', 
        progress: 50 
      })
      
      // Complete quest
      eventManager.emit('questCompleted', { questId, rewards: [] })
      
      const progress = gameLogicSystem.getProgress()
      expect(progress.questProgress.get(questId)).toBe(100)
    })

    test('should emit quest progress events', () => {
      const questId = 'test_quest'
      const mockListener = jest.fn()
      
      eventManager.on('questProgressUpdated', mockListener)
      
      eventManager.emit('questStarted', { questId })
      
      expect(mockListener).toHaveBeenCalledWith({
        questId,
        progress: 0,
        score: expect.any(Number)
      })
    })
  })

  describe('Achievement System', () => {
    test('should unlock score-based achievements', () => {
      // Add enough points to unlock first achievement
      for (let i = 0; i < 10; i++) {
        eventManager.emit('questCompleted', { questId: `quest${i}`, rewards: [] })
      }
      
      const achievements = gameLogicSystem.getUnlockedAchievements()
      const scoreAchievement = achievements.find(a => a.id === 'score_100')
      
      expect(scoreAchievement).toBeDefined()
      expect(scoreAchievement?.isUnlocked).toBe(true)
    })

    test('should unlock quest-based achievements', () => {
      // Complete first quest
      eventManager.emit('questCompleted', { questId: 'first_quest', rewards: [] })
      
      const achievements = gameLogicSystem.getUnlockedAchievements()
      const firstQuestAchievement = achievements.find(a => a.id === 'first_quest')
      
      expect(firstQuestAchievement).toBeDefined()
      expect(firstQuestAchievement?.name).toBe('First Steps')
    })

    test('should unlock level-based achievements', () => {
      // Simulate level up to 5
      eventManager.emit('playerLevelUp', { newLevel: 5 })
      
      const achievements = gameLogicSystem.getUnlockedAchievements()
      const levelAchievement = achievements.find(a => a.id === 'level_5')
      
      expect(levelAchievement).toBeDefined()
      expect(levelAchievement?.name).toBe('Rising Star')
    })

    test('should award achievement points to total score', () => {
      const initialScore = gameLogicSystem.getCurrentScore().totalScore
      
      // Unlock an achievement
      eventManager.emit('questCompleted', { questId: 'first_quest', rewards: [] })
      
      const finalScore = gameLogicSystem.getCurrentScore().totalScore
      const achievement = gameLogicSystem.getUnlockedAchievements().find(a => a.id === 'first_quest')
      
      if (achievement) {
        expect(finalScore).toBeGreaterThan(initialScore + achievement.points)
      }
    })
  })

  describe('Player Progress Management', () => {
    test('should handle player level up events', () => {
      const initialLevel = gameLogicSystem.getProgress().currentLevel
      
      eventManager.emit('playerLevelUp', { newLevel: 3 })
      
      const progress = gameLogicSystem.getProgress()
      expect(progress.currentLevel).toBe(3)
      expect(progress.experience).toBe(0)
      expect(progress.experienceToNext).toBe(300) // 3 * 100
    })

    test('should track world changes', () => {
      const newWorld = 'crystal_caverns'
      
      eventManager.emit('worldChanged', { newWorld })
      
      const progress = gameLogicSystem.getProgress()
      expect(progress.worldProgress.get(newWorld)).toBe(0)
    })

    test('should track pet interactions', () => {
      const initialBond = gameLogicSystem.getProgress().petBondProgress
      
      eventManager.emit('petInteraction', { 
        interactionType: 'training', 
        bondIncrease: 10 
      })
      
      const progress = gameLogicSystem.getProgress()
      expect(progress.petBondProgress).toBe(initialBond + 10)
    })
  })

  describe('Exploration and Collection', () => {
    test('should track area exploration', () => {
      const areaId = 'jungle_entrance'
      const explorationValue = 15
      
      eventManager.emit('areaExplored', { areaId, explorationValue })
      
      const score = gameLogicSystem.getCurrentScore()
      expect(score.explorationScore).toBeGreaterThan(0)
    })

    test('should apply rarity multipliers to item collection', () => {
      const initialScore = gameLogicSystem.getCurrentScore().totalScore
      
      // Collect rare item
      eventManager.emit('itemCollected', { itemId: 'magic_gem', rarity: 'rare' })
      
      const newScore = gameLogicSystem.getCurrentScore().totalScore
      expect(newScore).toBeGreaterThan(initialScore + 10) // Base 10 * rarity multiplier
    })

    test('should track NPC interactions', () => {
      const initialScore = gameLogicSystem.getCurrentScore().totalScore
      
      eventManager.emit('npcInteraction', { 
        npcId: 'merchant', 
        interactionType: 'trade' 
      })
      
      const newScore = gameLogicSystem.getCurrentScore().totalScore
      expect(newScore).toBeGreaterThan(initialScore)
    })
  })

  describe('Game Progress Updates', () => {
    test('should update experience over time', () => {
      const initialExp = gameLogicSystem.getProgress().experience
      
      // Simulate time passing
      gameLogicSystem.update(1000) // 1 second
      
      const progress = gameLogicSystem.getProgress()
      expect(progress.experience).toBeGreaterThan(initialExp)
    })

    test('should trigger level up when experience threshold is reached', () => {
      const mockListener = jest.fn()
      eventManager.on('playerLevelUp', mockListener)
      
      // Add enough experience to level up
      gameLogicSystem.update(100000) // 100 seconds should add 100 exp
      
      expect(mockListener).toHaveBeenCalled()
    })
  })

  describe('Data Persistence', () => {
    test('should save progress to localStorage', () => {
      // Make some changes
      eventManager.emit('questCompleted', { questId: 'test_quest', rewards: [] })
      
      // Trigger save
      gameLogicSystem.destroy()
      
      const savedData = localStorage.getItem('game_progress')
      expect(savedData).toBeTruthy()
      
      const parsed = JSON.parse(savedData!)
      expect(parsed.score.totalScore).toBeGreaterThan(0)
    })

    test('should reset progress when requested', () => {
      // Make some changes first
      eventManager.emit('questCompleted', { questId: 'test_quest', rewards: [] })
      const initialScore = gameLogicSystem.getCurrentScore().totalScore
      expect(initialScore).toBeGreaterThan(0)
      
      // Reset
      gameLogicSystem.resetProgress()
      
      const finalScore = gameLogicSystem.getCurrentScore().totalScore
      expect(finalScore).toBe(0)
    })
  })

  describe('Public API', () => {
    test('should return immutable score data', () => {
      const score1 = gameLogicSystem.getCurrentScore()
      const score2 = gameLogicSystem.getCurrentScore()
      
      expect(score1).not.toBe(score2) // Different objects
      expect(score1.totalScore).toBe(score2.totalScore) // Same values
    })

    test('should return immutable progress data', () => {
      const progress1 = gameLogicSystem.getProgress()
      const progress2 = gameLogicSystem.getProgress()
      
      expect(progress1).not.toBe(progress2) // Different objects
      expect(progress1.currentLevel).toBe(progress2.currentLevel) // Same values
    })

    test('should return all achievements', () => {
      const achievements = gameLogicSystem.getAchievements()
      expect(Array.isArray(achievements)).toBe(true)
    })

    test('should return only unlocked achievements', () => {
      // Unlock an achievement
      eventManager.emit('questCompleted', { questId: 'first_quest', rewards: [] })
      
      const unlocked = gameLogicSystem.getUnlockedAchievements()
      expect(unlocked.length).toBeGreaterThan(0)
      expect(unlocked.every(a => a.isUnlocked)).toBe(true)
    })

    test('should return scoring rules', () => {
      const rules = gameLogicSystem.getScoringRules()
      expect(Array.isArray(rules)).toBe(true)
      expect(rules.length).toBeGreaterThan(0)
    })
  })

  describe('Event Integration', () => {
    test('should emit score update events', () => {
      const mockListener = jest.fn()
      eventManager.on('scoreUpdated', mockListener)
      
      eventManager.emit('questStarted', { questId: 'test_quest' })
      
      expect(mockListener).toHaveBeenCalledWith({
        action: 'quest_started',
        points: expect.any(Number),
        totalScore: expect.any(Number),
        streak: expect.any(Number),
        multiplier: expect.any(Number)
      })
    })

    test('should emit achievement unlocked events', () => {
      const mockListener = jest.fn()
      eventManager.on('achievementUnlocked', mockListener)
      
      eventManager.emit('questCompleted', { questId: 'first_quest', rewards: [] })
      
      expect(mockListener).toHaveBeenCalledWith({
        achievementId: 'first_quest',
        achievement: expect.any(Object),
        totalScore: expect.any(Number)
      })
    })

    test('should emit game progress events', () => {
      const mockListener = jest.fn()
      eventManager.on('gameProgressUpdated', mockListener)
      
      eventManager.emit('playerLevelUp', { newLevel: 2 })
      
      expect(mockListener).toHaveBeenCalledWith({
        type: 'level_up',
        newLevel: 2,
        score: expect.any(Number)
      })
    })
  })
})


import { RewardCalculator } from './RewardCalculator'
import { EventManager } from '../core/EventManager'

// Mock EventManager
jest.mock('../core/EventManager', () => ({
  EventManager: {
    getInstance: jest.fn(() => ({
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    }))
  }
}))

// Mock QuestManager
jest.mock('./QuestManager', () => ({
  QuestManager: {
    getInstance: jest.fn(() => ({
      getQuest: jest.fn(),
      startQuest: jest.fn(),
      completeQuest: jest.fn()
    }))
  }
}))

describe('RewardCalculator', () => {
  let rewardCalculator: RewardCalculator
  let mockEventManager: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockEventManager = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    }
    ;(EventManager.getInstance as jest.Mock).mockReturnValue(mockEventManager)
    
    // Reset singleton instance
    ;(RewardCalculator as any).instance = undefined
    rewardCalculator = RewardCalculator.getInstance()
  })

  afterEach(() => {
    ;(RewardCalculator as any).instance = undefined
  })

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = RewardCalculator.getInstance()
      const instance2 = RewardCalculator.getInstance()
      expect(instance1).toBe(instance2)
    })

    test('should initialize only once', () => {
      const instance1 = RewardCalculator.getInstance()
      instance1.initialize()
      const instance2 = RewardCalculator.getInstance()
      expect(instance2).toBe(instance1)
    })
  })

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(() => rewardCalculator.initialize()).not.toThrow()
    })

    test('should not reinitialize if already initialized', () => {
      rewardCalculator.initialize()
      expect(() => rewardCalculator.initialize()).not.toThrow()
    })
  })

  describe('Configuration', () => {
    test('should configure with default values', () => {
      const config = {
        enableDifficultyMultipliers: true,
        enableTimeBonuses: true,
        enableStreakBonuses: true,
        enablePetBondBonuses: true,
        enableSkillBonuses: true,
        enableEventBonuses: true,
        maxMultiplier: 5.0,
        orbConversionRate: 100,
        reputationScaling: true,
        skillProgressionBonus: true
      }

      expect(() => rewardCalculator.configure(config)).not.toThrow()
    })

    test('should handle custom configuration', () => {
      const customConfig = {
        enableDifficultyMultipliers: false,
        enableTimeBonuses: false,
        maxMultiplier: 2.0,
        orbConversionRate: 50
      }

      expect(() => rewardCalculator.configure(customConfig)).not.toThrow()
    })
  })

  describe('Orb Conversion', () => {
    test('should convert coins to orbs correctly', () => {
      const coins = 100
      const orbs = rewardCalculator.convertCoinsToOrbs(coins)
      expect(orbs).toBeGreaterThan(0)
      expect(typeof orbs).toBe('number')
    })

    test('should convert orbs to coins correctly', () => {
      const orbs = 1
      const coins = rewardCalculator.convertOrbsToCoins(orbs)
      expect(coins).toBeGreaterThan(0)
      expect(typeof coins).toBe('number')
    })

    test('should handle zero values', () => {
      expect(rewardCalculator.convertCoinsToOrbs(0)).toBe(0)
      expect(rewardCalculator.convertOrbsToCoins(0)).toBe(0)
    })
  })

  describe('Player Statistics', () => {
    test('should get player reward statistics', () => {
      const playerId = 'test_player'
      const stats = rewardCalculator.getPlayerRewardStats(playerId)
      expect(stats).toBeDefined()
      expect(typeof stats.totalExperience).toBe('number')
      expect(typeof stats.totalCoins).toBe('number')
      expect(typeof stats.totalOrbs).toBe('number')
    })

    test('should get player total rewards', () => {
      const playerId = 'test_player'
      const totalRewards = rewardCalculator.getPlayerTotalRewards(playerId)
      expect(totalRewards).toBeDefined()
      expect(Array.isArray(totalRewards.items)).toBe(true)
      expect(Array.isArray(totalRewards.skills)).toBe(true)
    })

    test('should get player reward history', () => {
      const playerId = 'test_player'
      const history = rewardCalculator.getPlayerRewardHistory(playerId)
      expect(Array.isArray(history)).toBe(true)
    })
  })

  describe('Reward Distribution', () => {
    test('should distribute rewards successfully', () => {
      const questId = 'test_quest'
      const playerId = 'test_player'
      const rewards = {
        experience: 100,
        coins: 50,
        orbs: 2,
        items: ['sword'],
        skills: ['combat'],
        petBond: 10,
        unlockables: ['level_2'],
        reputation: 5,
        specialRewards: [],
        totalValue: 200,
        rarity: 'common' as const
      }

      const result = rewardCalculator.distributeRewards(questId, playerId, rewards)
      expect(result).toBe(true)
    })

    test('should handle objective rewards', () => {
      const questId = 'test_quest'
      const objectiveId = 'test_objective'
      const playerId = 'test_player'
      const rewards = {
        experience: 50,
        coins: 25,
        orbs: 1,
        items: ['potion'],
        skills: ['alchemy'],
        petBond: 5,
        unlockables: [],
        reputation: 2,
        specialRewards: [],
        totalValue: 100,
        rarity: 'common' as const
      }

      const result = rewardCalculator.distributeRewards(questId, playerId, rewards, objectiveId)
      expect(result).toBe(true)
    })
  })

  describe('Utility Methods', () => {
    test('should get default configuration', () => {
      const defaultConfig = rewardCalculator.getDefaultConfig()
      expect(defaultConfig).toBeDefined()
      expect(typeof defaultConfig.maxMultiplier).toBe('number')
      expect(typeof defaultConfig.orbConversionRate).toBe('number')
    })

    test('should get current configuration', () => {
      const currentConfig = rewardCalculator.getCurrentConfig()
      expect(currentConfig).toBeDefined()
      expect(typeof currentConfig.enableDifficultyMultipliers).toBe('boolean')
    })

    test('should reset to default configuration', () => {
      expect(() => rewardCalculator.resetToDefaultConfig()).not.toThrow()
    })
  })

  describe('Event System Integration', () => {
    test('should emit reward events', () => {
      const questId = 'test_quest'
      const playerId = 'test_player'
      const rewards = {
        experience: 100,
        coins: 50,
        orbs: 2,
        items: ['sword'],
        skills: ['combat'],
        petBond: 10,
        unlockables: ['level_2'],
        reputation: 5,
        specialRewards: [],
        totalValue: 200,
        rarity: 'common' as const
      }

      rewardCalculator.distributeRewards(questId, playerId, rewards)
      expect(mockEventManager.emit).toHaveBeenCalled()
    })
  })
})




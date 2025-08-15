import { QuestManager } from '../QuestManager'
import { QuestData, QuestTemplate, QuestType, QuestCategory } from '../QuestManager'

describe('QuestManager', () => {
  let questManager: QuestManager

  beforeEach(() => {
    questManager = QuestManager.getInstance()
  })

  afterEach(() => {
    // Reset the singleton instance for clean tests
    ;(QuestManager as any).instance = undefined
  })

  describe('Quest Templates', () => {
    it('should have quest templates initialized', () => {
      const templates = [
        'emerald_jungle_main',
        'crystal_caverns_side',
        'daily_pet_training',
        'weekly_treasure_hunt',
        'challenge_arena_champion'
      ]

      templates.forEach(templateId => {
        const template = questManager.getQuestTemplate(templateId)
        expect(template).toBeDefined()
        expect(template?.id).toBe(templateId)
      })
    })

    it('should have correct quest types', () => {
      const mainQuest = questManager.getQuestTemplate('emerald_jungle_main')
      expect(mainQuest?.type).toBe('story')
      expect(mainQuest?.category).toBe('main')

      const sideQuest = questManager.getQuestTemplate('crystal_caverns_side')
      expect(sideQuest?.type).toBe('side')
      expect(sideQuest?.category).toBe('side')

      const dailyQuest = questManager.getQuestTemplate('daily_pet_training')
      expect(dailyQuest?.type).toBe('daily')
      expect(dailyQuest?.category).toBe('daily')
    })
  })

  describe('Quest Management', () => {
    it('should get available quests for a player', () => {
      const playerData = { level: 5, petBond: 30 }
      const availableQuests = questManager.getAvailableQuests('player1', playerData)

      expect(availableQuests.length).toBeGreaterThan(0)
      expect(availableQuests[0]).toHaveProperty('id')
      expect(availableQuests[0]).toHaveProperty('title')
      expect(availableQuests[0]).toHaveProperty('objectives')
    })

    it('should check if quest can be started', () => {
      const playerData = { level: 5, petBond: 30 }
      const canStart = questManager.canStartQuest('emerald_jungle_main', playerData)
      expect(canStart).toBe(true)
    })

    it('should get quest statistics', () => {
      const stats = questManager.getQuestStatistics()
      expect(stats.totalQuests).toBeGreaterThan(0)
      expect(stats.activeQuests).toBe(0)
      expect(stats.completedQuests).toBe(0)
      expect(stats.failedQuests).toBe(0)
    })
  })

  describe('Quest Objectives', () => {
    it('should have quests with multiple objectives', () => {
      const mainQuest = questManager.getQuestTemplate('emerald_jungle_main')
      expect(mainQuest?.objectives.length).toBe(3)

      const objectives = mainQuest?.objectives || []
      expect(objectives[0].type).toBe('explore')
      expect(objectives[1].type).toBe('collect')
      expect(objectives[2].type).toBe('reach')
    })

    it('should have objectives with hints', () => {
      const mainQuest = questManager.getQuestTemplate('emerald_jungle_main')
      const exploreObjective = mainQuest?.objectives.find(obj => obj.type === 'explore')
      
      expect(exploreObjective?.hints).toBeDefined()
      expect(exploreObjective?.hints.length).toBeGreaterThan(0)
    })
  })

  describe('Quest Rewards', () => {
    it('should have quests with rewards', () => {
      const mainQuest = questManager.getQuestTemplate('emerald_jungle_main')
      expect(mainQuest?.rewards.experience).toBe(100)
      expect(mainQuest?.rewards.coins).toBe(50)
      expect(mainQuest?.rewards.items).toContain('ancient_key')
      expect(mainQuest?.rewards.skills).toContain('herb_lore')
    })

    it('should have special rewards', () => {
      const mainQuest = questManager.getQuestTemplate('emerald_jungle_main')
      const specialRewards = mainQuest?.rewards.specialRewards || []
      
      expect(specialRewards.length).toBeGreaterThan(0)
      expect(specialRewards[0].type).toBe('pet_companion')
      expect(specialRewards[0].rarity).toBe('rare')
    })
  })

  describe('Quest Prerequisites', () => {
    it('should have quests with prerequisites', () => {
      const crystalQuest = questManager.getQuestTemplate('crystal_caverns_side')
      expect(crystalQuest?.metadata.prerequisites).toContain('emerald_jungle_main')

      const arenaQuest = questManager.getQuestTemplate('challenge_arena_champion')
      expect(arenaQuest?.metadata.prerequisites).toContain('emerald_jungle_main')
      expect(arenaQuest?.metadata.prerequisites).toContain('crystal_caverns_side')
    })
  })

  describe('Quest Filtering', () => {
    it('should filter quests by type', () => {
      const storyQuests = questManager.getQuestsByFilter({ type: 'story' })
      expect(storyQuests.length).toBeGreaterThan(0)
      storyQuests.forEach(quest => {
        expect(quest.type).toBe('story')
      })
    })

    it('should filter quests by category', () => {
      const mainQuests = questManager.getQuestsByFilter({ category: 'main' })
      expect(mainQuests.length).toBeGreaterThan(0)
      mainQuests.forEach(quest => {
        expect(quest.category).toBe('main')
      })
    })

    it('should filter quests by difficulty', () => {
      const easyQuests = questManager.getQuestsByFilter({ difficulty: 'easy' })
      expect(easyQuests.length).toBeGreaterThan(0)
      easyQuests.forEach(quest => {
        expect(quest.difficulty).toBe('easy')
      })
    })
  })
})




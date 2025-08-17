import { EventManager } from '../core/EventManager'
import { LevelLoader } from './LevelLoader'
import { WorldFactory } from './WorldFactory'
import { CheckpointSystem } from './CheckpointSystem'

export interface QuestData {
  id: string
  title: string
  description: string
  type: QuestType
  category: QuestCategory
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  requiredLevel: number
  requiredPetBond: number
  worldId: string
  levelId: string
  status: QuestStatus
  progress: QuestProgress
  objectives: QuestObjective[]
  rewards: QuestRewards
  timeLimit?: number
  startTime: number
  completionTime?: number
  attempts: number
  bestTime?: number
  metadata: QuestMetadata
}

export type QuestType = 'story' | 'side' | 'daily' | 'weekly' | 'event' | 'challenge' | 'collection' | 'exploration' | 'combat' | 'puzzle'

export type QuestCategory = 'main' | 'side' | 'daily' | 'weekly' | 'seasonal' | 'achievement' | 'hidden' | 'repeatable'

export type QuestStatus = 'available' | 'active' | 'completed' | 'failed' | 'expired' | 'locked' | 'abandoned'

export interface QuestProgress {
  currentStep: number
  totalSteps: number
  completedObjectives: Set<string>
  collectedItems: Set<string>
  defeatedEnemies: Set<string>
  solvedPuzzles: Set<string>
  visitedLocations: Set<string>
  timeSpent: number
  checkpoints: Set<string>
}

export interface QuestObjective {
  id: string
  type: 'collect' | 'defeat' | 'reach' | 'interact' | 'solve' | 'explore' | 'craft' | 'deliver'
  description: string
  target: string
  count: number
  current: number
  isCompleted: boolean
  isOptional: boolean
  hints: string[]
  location?: { x: number; y: number; z?: number }
  reward: ObjectiveReward
}

export interface ObjectiveReward {
  experience: number
  coins: number
  items: string[]
  skills: string[]
  petBond: number
  unlockables: string[]
}

export interface QuestRewards {
  experience: number
  coins: number
  items: string[]
  skills: string[]
  petBond: number
  unlockables: string[]
  reputation: number
  specialRewards: SpecialReward[]
}

export interface SpecialReward {
  type: 'pet_companion' | 'unique_item' | 'skill_unlock' | 'world_access' | 'npc_friendship'
  id: string
  name: string
  description: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

export interface QuestMetadata {
  version: string
  author: string
  creationDate: number
  lastModified: number
  tags: string[]
  rating: number
  playCount: number
  averageCompletionTime: number
  difficultyRating: number
  prerequisites: string[]
  dependencies: string[]
  conflicts: string[]
}

export interface QuestTemplate {
  id: string
  title: string
  description: string
  type: QuestType
  category: QuestCategory
  baseDifficulty: 'easy' | 'medium' | 'hard' | 'expert'
  requiredLevel: number
  requiredPetBond: number
  worldId: string
  levelId: string
  objectives: QuestObjective[]
  rewards: QuestRewards
  timeLimit?: number
  metadata: QuestMetadata
}

export interface QuestFilter {
  type?: QuestType
  category?: QuestCategory
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert'
  status?: QuestStatus
  worldId?: string
  requiredLevel?: number
  tags?: string[]
}

export interface QuestStatistics {
  totalQuests: number
  activeQuests: number
  completedQuests: number
  failedQuests: number
  totalExperience: number
  totalCoins: number
  totalItems: number
  averageCompletionTime: number
  questsByType: Map<QuestType, number>
  questsByCategory: Map<QuestCategory, number>
  questsByDifficulty: Map<string, number>
}

export class QuestManager {
  private static instance: QuestManager
  private eventManager: EventManager
  private levelLoader: LevelLoader
  private worldFactory: WorldFactory
  
  private quests: Map<string, QuestData> = new Map()
  private questTemplates: Map<string, QuestTemplate> = new Map()
  private activeQuests: Set<string> = new Set()
  private completedQuests: Set<string> = new Set()
  private failedQuests: Set<string> = new Set()
  
  private questChains: Map<string, string[]> = new Map()
  private questDependencies: Map<string, string[]> = new Map()
  private questConflicts: Map<string, string[]> = new Map()
  
  private playerQuests: Map<string, QuestData[]> = new Map()
  private questHistory: Map<string, QuestData[]> = new Map()
  
  private questStatistics: QuestStatistics = {
    totalQuests: 0,
    activeQuests: 0,
    completedQuests: 0,
    failedQuests: 0,
    totalExperience: 0,
    totalCoins: 0,
    totalItems: 0,
    averageCompletionTime: 0,
    questsByType: new Map(),
    questsByCategory: new Map(),
    questsByDifficulty: new Map()
  }

  private constructor() {
    this.eventManager = EventManager.getInstance()
    this.levelLoader = LevelLoader.getInstance()
    this.worldFactory = WorldFactory.getInstance()
    this.initializeQuestTemplates()
    this.setupEventListeners()
  }

  /**
   * Get the CheckpointSystem instance for quest progress management
   */
  private getCheckpointSystem(): CheckpointSystem {
    return CheckpointSystem.getInstance()
  }

  public static getInstance(): QuestManager {
    if (!QuestManager.instance) {
      QuestManager.instance = new QuestManager()
    }
    return QuestManager.instance
  }

  /**
   * Starts a quest for a player
   */
  public async startQuest(questId: string, playerId: string, playerData?: any): Promise<QuestData> {
    const template = this.questTemplates.get(questId)
    if (!template) {
      throw new Error(`Quest template '${questId}' not found`)
    }

    // Check if quest is already active
    if (this.activeQuests.has(questId)) {
      throw new Error(`Quest '${questId}' is already active`)
    }

    // Check prerequisites
    if (!this.checkPrerequisites(questId, playerData)) {
      throw new Error(`Prerequisites not met for quest '${questId}'`)
    }

    // Check conflicts
    if (this.hasConflicts(questId, playerId)) {
      throw new Error(`Quest '${questId}' conflicts with active quests`)
    }

    // Create quest instance
    const quest = this.createQuestFromTemplate(template, playerId, playerData)
    
    // Load associated level
    await this.levelLoader.loadLevel(quest.levelId, quest.id, playerData)
    
    // Add to active quests
    this.quests.set(quest.id, quest)
    this.activeQuests.add(quest.id)
    
    // Update player quests
    if (!this.playerQuests.has(playerId)) {
      this.playerQuests.set(playerId, [])
    }
    this.playerQuests.get(playerId)!.push(quest)
    
    // Update statistics
    this.updateQuestStatistics(quest, 'started')
    
    this.eventManager.emit('questStarted', { questId: quest.id, previousQuest: null, player: playerData, timestamp: Date.now() })
    return quest
  }

  /**
   * Completes a quest
   */
  public completeQuest(questId: string, playerId: string): QuestData | null {
    const quest = this.quests.get(questId)
    if (!quest || quest.status !== 'active') {
      return null
    }

    // Check if all objectives are completed
    if (!this.areAllObjectivesCompleted(quest)) {
      return null
    }

    // Update quest status
    quest.status = 'completed'
    quest.completionTime = Date.now()
    quest.progress.timeSpent = quest.completionTime - quest.startTime

    // Calculate completion time
    if (!quest.bestTime || quest.progress.timeSpent < quest.bestTime) {
      quest.bestTime = quest.progress.timeSpent
    }

    // Move from active to completed
    this.activeQuests.delete(questId)
    this.completedQuests.add(questId)

    // Update player quests
    this.updatePlayerQuestStatus(playerId, questId, 'completed')

    // Update statistics
    this.updateQuestStatistics(quest, 'completed')

    // Check for chain quests
    this.checkQuestChains(questId, playerId)

    this.eventManager.emit('questCompleted', { questId: quest.id, rewards: [quest.rewards], player: { id: playerId }, pet: null })
    return quest
  }

  /**
   * Fails a quest
   */
  public failQuest(questId: string, playerId: string, reason: string): QuestData | null {
    const quest = this.quests.get(questId)
    if (!quest || quest.status !== 'active') {
      return null
    }

    // Update quest status
    quest.status = 'failed'
    quest.attempts++

    // Move from active to failed
    this.activeQuests.delete(questId)
    this.failedQuests.add(questId)

    // Update player quests
    this.updatePlayerQuestStatus(playerId, questId, 'failed')

    // Update statistics
    this.updateQuestStatistics(quest, 'failed')

    this.eventManager.emit('questFailed', { questId: quest.id, player: { id: playerId } })
    return quest
  }

  /**
   * Abandons a quest
   */
  public abandonQuest(questId: string, playerId: string): QuestData | null {
    const quest = this.quests.get(questId)
    if (!quest || quest.status !== 'active') {
      return null
    }

    // Update quest status
    quest.status = 'abandoned'

    // Move from active to abandoned
    this.activeQuests.delete(questId)

    // Update player quests
    this.updatePlayerQuestStatus(playerId, questId, 'abandoned')

    // Update statistics
    this.updateQuestStatistics(quest, 'abandoned')

    this.eventManager.emit('questAbandoned', { questId: quest.id, player: { id: playerId } })
    return quest
  }

  /**
   * Updates quest progress
   */
  public updateQuestProgress(questId: string, objectiveId: string, progress: number, playerId: string): boolean {
    const quest = this.quests.get(questId)
    if (!quest || quest.status !== 'active') {
      return false
    }

    const objective = quest.objectives.find(obj => obj.id === objectiveId)
    if (!objective) {
      return false
    }

    // Update objective progress
    objective.current = Math.min(progress, objective.count)
    objective.isCompleted = objective.current >= objective.count

    // Update quest progress
    if (objective.isCompleted) {
      quest.progress.completedObjectives.add(objectiveId)
      
      // Check if quest is complete
      if (this.areAllObjectivesCompleted(quest)) {
        this.eventManager.emit('questReadyToComplete', { questId: quest.id, player: { id: playerId } })
      }
    }

    this.eventManager.emit('questProgressUpdated', { questId: quest.id, objectiveId: objectiveId, player: { id: playerId } })
    return true
  }

  /**
   * Gets available quests for a player
   */
  public getAvailableQuests(playerId: string, playerData?: any): QuestTemplate[] {
    const availableQuests: QuestTemplate[] = []
    
    for (const template of this.questTemplates.values()) {
      if (this.isQuestAvailable(template, playerId, playerData)) {
        availableQuests.push(template)
      }
    }
    
    return availableQuests.sort((a, b) => {
      // Sort by category priority, then by difficulty
      const categoryPriority = this.getCategoryPriority(a.category) - this.getCategoryPriority(b.category)
      if (categoryPriority !== 0) return categoryPriority
      
      const difficultyOrder = { easy: 0, medium: 1, hard: 2, expert: 3 }
      return difficultyOrder[a.baseDifficulty] - difficultyOrder[b.baseDifficulty]
    })
  }

  /**
   * Gets active quests for a player
   */
  public getActiveQuests(playerId: string): QuestData[] {
    return this.playerQuests.get(playerId)?.filter(quest => quest.status === 'active') || []
  }

  /**
   * Gets quest by ID
   */
  public getQuest(questId: string): QuestData | undefined {
    return this.quests.get(questId)
  }

  /**
   * Gets quest template by ID
   */
  public getQuestTemplate(questId: string): QuestTemplate | undefined {
    return this.questTemplates.get(questId)
  }

  /**
   * Gets quests filtered by various criteria
   */
  public getQuestsByFilter(filter: QuestFilter): QuestData[] {
    return Array.from(this.questTemplates.values()).filter(template => {
      if (filter.type && template.type !== filter.type) return false
      if (filter.category && template.category !== filter.category) return false
      if (filter.difficulty && template.baseDifficulty !== filter.difficulty) return false
      if (filter.worldId && template.worldId !== filter.worldId) return false
      if (filter.requiredLevel && template.requiredLevel > filter.requiredLevel) return false
      if (filter.tags && !filter.tags.some(tag => template.metadata.tags.includes(tag))) return false
      return true
    }).map(template => this.createQuestFromTemplate(template, 'filter_player', {}))
  }

  /**
   * Gets quest statistics
   */
  public getQuestStatistics(): QuestStatistics {
    return { ...this.questStatistics }
  }

  /**
   * Gets quest history for a player
   */
  public getQuestHistory(playerId: string): QuestData[] {
    return this.questHistory.get(playerId) || []
  }

  /**
   * Resets quest for retry
   */
  public resetQuest(questId: string, playerId: string): QuestData | null {
    const quest = this.quests.get(questId)
    if (!quest || quest.status !== 'failed') {
      return null
    }

    // Reset quest state
    quest.status = 'available'
    quest.progress = this.createInitialProgress(quest.objectives)
    quest.startTime = Date.now()
    quest.completionTime = undefined

    // Remove from failed quests
    this.failedQuests.delete(questId)

    this.eventManager.emit('questReset', { questId: quest.id, player: { id: playerId } })
    return quest
  }

  /**
   * Checks if quest can be started
   */
  public canStartQuest(questId: string, playerData?: any): boolean {
    const template = this.questTemplates.get(questId)
    if (!template) return false

    return this.isQuestAvailable(template, 'player', playerData)
  }

  private initializeQuestStatistics(): void {
    // Already initialized in the property declaration
  }

  private initializeQuestTemplates(): void {
    // Emerald Jungle - Main Story Quest
    this.questTemplates.set('emerald_jungle_main', {
      id: 'emerald_jungle_main',
      title: 'The Ancient Grove Mystery',
      description: 'Explore the mysterious grove and uncover the secrets of the ancient temple.',
      type: 'story',
      category: 'main',
      baseDifficulty: 'easy',
      requiredLevel: 1,
      requiredPetBond: 10,
      worldId: 'emerald_jungle',
      levelId: 'emerald_jungle_quest_1',
      objectives: [
        {
          id: 'explore_grove',
          type: 'explore',
          description: 'Explore the ancient grove',
          target: 'grove_area',
          count: 1,
          current: 0,
          isCompleted: false,
          isOptional: false,
          hints: ['Look for unusual rock formations', 'Your pet can sense ancient magic'],
          reward: { experience: 25, coins: 10, items: [], skills: [], petBond: 5, unlockables: [] }
        },
        {
          id: 'collect_herbs',
          type: 'collect',
          description: 'Collect mystical herbs for the temple guardian',
          target: 'jungle_herb',
          count: 3,
          current: 0,
          isCompleted: false,
          isOptional: false,
          hints: ['Herbs grow near water sources', 'Look for glowing plants'],
          reward: { experience: 15, coins: 5, items: [], skills: ['herb_lore'], petBond: 3, unlockables: [] }
        },
        {
          id: 'find_temple',
          type: 'reach',
          description: 'Find the hidden temple entrance',
          target: 'temple_entrance',
          count: 1,
          current: 0,
          isCompleted: false,
          isOptional: false,
          hints: ['Follow the ancient path', 'Look for symbols on the ground'],
          reward: { experience: 50, coins: 20, items: ['ancient_key'], skills: [], petBond: 10, unlockables: ['temple_access'] }
        }
      ],
      rewards: {
        experience: 100,
        coins: 50,
        items: ['ancient_key', 'grove_map'],
        skills: ['herb_lore', 'ancient_knowledge'],
        petBond: 25,
        unlockables: ['temple_access', 'grove_mastery'],
        reputation: 100,
        specialRewards: [
          {
            type: 'pet_companion',
            id: 'grove_spirit',
            name: 'Grove Spirit Companion',
            description: 'A mystical companion that enhances your connection to nature',
            rarity: 'rare'
          }
        ]
      },
      timeLimit: 1800, // 30 minutes
      metadata: {
        version: '1.0.0',
        author: 'AI Pets Adventure Team',
        creationDate: Date.now(),
        lastModified: Date.now(),
        tags: ['story', 'exploration', 'nature', 'mystery'],
        rating: 4.5,
        playCount: 0,
        averageCompletionTime: 1200,
        difficultyRating: 1.0,
        prerequisites: [],
        dependencies: [],
        conflicts: []
      }
    })

    // Crystal Caverns - Side Quest
    this.questTemplates.set('crystal_caverns_side', {
      id: 'crystal_caverns_side',
      title: 'Crystal Collector',
      description: 'Help the crystal merchant collect rare crystals from the depths.',
      type: 'side',
      category: 'side',
      baseDifficulty: 'medium',
      requiredLevel: 3,
      requiredPetBond: 20,
      worldId: 'crystal_caverns',
      levelId: 'crystal_caverns_quest_1',
      objectives: [
        {
          id: 'collect_crystals',
          type: 'collect',
          description: 'Collect rare crystals',
          target: 'rare_crystal',
          count: 5,
          current: 0,
          isCompleted: false,
          isOptional: false,
          hints: ['Look in dark corners', 'Use your pet\'s crystal sense'],
          reward: { experience: 30, coins: 15, items: [], skills: [], petBond: 5, unlockables: [] }
        }
      ],
      rewards: {
        experience: 75,
        coins: 40,
        items: ['crystal_pickaxe', 'cavern_map'],
        skills: ['crystal_lore'],
        petBond: 15,
        unlockables: ['crystal_merchant_friendship'],
        reputation: 50,
        specialRewards: []
      },
      metadata: {
        version: '1.0.0',
        author: 'AI Pets Adventure Team',
        creationDate: Date.now(),
        lastModified: Date.now(),
        tags: ['side', 'collection', 'cavern', 'crystals'],
        rating: 4.0,
        playCount: 0,
        averageCompletionTime: 900,
        difficultyRating: 2.0,
        prerequisites: ['emerald_jungle_main'],
        dependencies: [],
        conflicts: []
      }
    })

    // Daily Quest - Pet Training
    this.questTemplates.set('daily_pet_training', {
      id: 'daily_pet_training',
      title: 'Daily Pet Training',
      description: 'Train your pet to improve their skills and bond.',
      type: 'daily',
      category: 'daily',
      baseDifficulty: 'easy',
      requiredLevel: 1,
      requiredPetBond: 5,
      worldId: 'training_grounds',
      levelId: 'training_grounds_daily',
      objectives: [
        {
          id: 'train_pet',
          type: 'interact',
          description: 'Complete pet training exercises',
          target: 'training_equipment',
          count: 3,
          current: 0,
          isCompleted: false,
          isOptional: false,
          hints: ['Use the agility course', 'Practice obedience commands', 'Try the puzzle toys'],
          reward: { experience: 20, coins: 15, items: [], skills: ['pet_training'], petBond: 10, unlockables: [] }
        }
      ],
      rewards: {
        experience: 50,
        coins: 25,
        items: ['training_treats', 'skill_manual'],
        skills: ['pet_training', 'bond_enhancement'],
        petBond: 20,
        unlockables: ['daily_training_mastery'],
        reputation: 25,
        specialRewards: []
      },
      metadata: {
        version: '1.0.0',
        author: 'AI Pets Adventure Team',
        creationDate: Date.now(),
        lastModified: Date.now(),
        tags: ['daily', 'training', 'pet_bond', 'skills'],
        rating: 4.2,
        playCount: 0,
        averageCompletionTime: 600,
        difficultyRating: 1.0,
        prerequisites: [],
        dependencies: [],
        conflicts: []
      }
    })

    // Weekly Quest - Treasure Hunt
    this.questTemplates.set('weekly_treasure_hunt', {
      id: 'weekly_treasure_hunt',
      title: 'Weekly Treasure Hunt',
      description: 'Embark on a weekly adventure to find hidden treasures across the world.',
      type: 'weekly',
      category: 'weekly',
      baseDifficulty: 'medium',
      requiredLevel: 5,
      requiredPetBond: 25,
      worldId: 'multiple',
      levelId: 'treasure_hunt_weekly',
      objectives: [
        {
          id: 'find_treasures',
          type: 'collect',
          description: 'Find hidden treasures',
          target: 'hidden_treasure',
          count: 7,
          current: 0,
          isCompleted: false,
          isOptional: false,
          hints: ['Check behind waterfalls', 'Look in ancient ruins', 'Search underwater caves'],
          reward: { experience: 100, coins: 50, items: [], skills: ['treasure_hunting'], petBond: 15, unlockables: [] }
        },
        {
          id: 'solve_riddles',
          type: 'solve',
          description: 'Solve treasure map riddles',
          target: 'treasure_riddle',
          count: 3,
          current: 0,
          isCompleted: false,
          isOptional: false,
          hints: ['Ancient texts hold clues', 'Your pet can sense magical items', 'Combine multiple clues'],
          reward: { experience: 75, coins: 30, items: [], skills: ['riddle_solving'], petBond: 10, unlockables: [] }
        }
      ],
      rewards: {
        experience: 200,
        coins: 100,
        items: ['treasure_map', 'golden_compass', 'rare_gem'],
        skills: ['treasure_hunting', 'riddle_solving', 'exploration'],
        petBond: 35,
        unlockables: ['treasure_hunter_title', 'weekly_hunter_badge'],
        reputation: 75,
        specialRewards: [
          {
            type: 'unique_item',
            id: 'treasure_hunter_medallion',
            name: 'Treasure Hunter Medallion',
            description: 'A prestigious medallion that increases treasure find chances',
            rarity: 'epic'
          }
        ]
      },
      metadata: {
        version: '1.0.0',
        author: 'AI Pets Adventure Team',
        creationDate: Date.now(),
        lastModified: Date.now(),
        tags: ['weekly', 'treasure', 'exploration', 'riddles', 'collection'],
        rating: 4.7,
        playCount: 0,
        averageCompletionTime: 3600,
        difficultyRating: 2.5,
        prerequisites: ['emerald_jungle_main'],
        dependencies: [],
        conflicts: []
      }
    })

    // Challenge Quest - Pet Arena Champion
    this.questTemplates.set('challenge_arena_champion', {
      id: 'challenge_arena_champion',
      title: 'Pet Arena Champion',
      description: 'Prove your pet\'s strength in the competitive arena.',
      type: 'challenge',
      category: 'achievement',
      baseDifficulty: 'hard',
      requiredLevel: 8,
      requiredPetBond: 40,
      worldId: 'pet_arena',
      levelId: 'pet_arena_challenge',
      objectives: [
        {
          id: 'win_battles',
          type: 'defeat',
          description: 'Win arena battles',
          target: 'arena_opponent',
          count: 10,
          current: 0,
          isCompleted: false,
          isOptional: false,
          hints: ['Use strategic pet abilities', 'Train your pet\'s combat skills', 'Study opponent patterns'],
          reward: { experience: 150, coins: 75, items: [], skills: ['combat_strategy'], petBond: 20, unlockables: [] }
        },
        {
          id: 'reach_final',
          type: 'reach',
          description: 'Reach the arena finals',
          target: 'arena_finals',
          count: 1,
          current: 0,
          isCompleted: false,
          isOptional: false,
          hints: ['Maintain winning streak', 'Conserve energy for finals', 'Use special abilities wisely'],
          reward: { experience: 200, coins: 100, items: [], skills: ['arena_mastery'], petBond: 30, unlockables: [] }
        }
      ],
      rewards: {
        experience: 500,
        coins: 250,
        items: ['champion_crown', 'arena_trophy', 'victory_banner'],
        skills: ['combat_strategy', 'arena_mastery', 'championship_tactics'],
        petBond: 75,
        unlockables: ['arena_champion_title', 'champion_arena_access'],
        reputation: 200,
        specialRewards: [
          {
            type: 'pet_companion',
            id: 'arena_champion_pet',
            name: 'Arena Champion Pet',
            description: 'A legendary pet companion with enhanced combat abilities',
            rarity: 'legendary'
          }
        ]
      },
      metadata: {
        version: '1.0.0',
        author: 'AI Pets Adventure Team',
        creationDate: Date.now(),
        lastModified: Date.now(),
        tags: ['challenge', 'combat', 'arena', 'achievement', 'championship'],
        rating: 4.8,
        playCount: 0,
        averageCompletionTime: 7200,
        difficultyRating: 4.0,
        prerequisites: ['emerald_jungle_main', 'crystal_caverns_side'],
        dependencies: [],
        conflicts: []
      }
    })

    // Initialize quest chains
    this.initializeQuestChains()

    // Update statistics
    this.questStatistics.totalQuests = this.questTemplates.size
    this.updateStatisticsByType()
    this.updateStatisticsByCategory()
    this.updateStatisticsByDifficulty()
  }

  private initializeQuestChains(): void {
    // Main story quest chain
    this.questChains.set('emerald_jungle_main', ['crystal_caverns_side', 'challenge_arena_champion'])
    
    // Side quest chain
    this.questChains.set('crystal_caverns_side', ['challenge_arena_champion'])
    
    // Daily quest chain (leads to weekly)
    this.questChains.set('daily_pet_training', ['weekly_treasure_hunt'])
  }

  private setupEventListeners(): void {
    // Listen for level-related events
    this.eventManager.on('levelLoadCompleted', ({ level, questId }) => {
      this.handleLevelLoaded(level.id, questId)
    })
    
    this.eventManager.on('levelCompleted', ({ levelId, questId }) => {
      this.handleLevelCompleted(levelId, questId)
    })
    
    // Listen for objective completion events
    this.eventManager.on('objectiveCompleted', ({ objectiveId, questId, player }) => {
      if (player && player.id) {
        this.handleObjectiveCompleted(objectiveId, questId, player.id)
      }
    })
  }

  private createQuestFromTemplate(template: QuestTemplate, playerId: string, playerData?: any): QuestData {
    const questId = `${template.id}_${playerId}_${Date.now()}`
    
    const quest: QuestData = {
      ...template,
      id: questId,
      status: 'active',
      progress: this.createInitialProgress(template.objectives),
      startTime: Date.now(),
      attempts: 0,
      difficulty: template.baseDifficulty,
      metadata: {
        ...template.metadata,
        playCount: template.metadata.playCount + 1
      }
    }

    // Apply player-specific modifications
    if (playerData) {
      this.applyPlayerModifications(quest, playerData)
    }

    return quest
  }

  private createInitialProgress(objectives: QuestObjective[]): QuestProgress {
    return {
      currentStep: 0,
      totalSteps: objectives.length,
      completedObjectives: new Set(),
      collectedItems: new Set(),
      defeatedEnemies: new Set(),
      solvedPuzzles: new Set(),
      visitedLocations: new Set(),
      timeSpent: 0,
      checkpoints: new Set()
    }
  }

  private checkPrerequisites(questId: string, playerData?: any): boolean {
    const template = this.questTemplates.get(questId)
    if (!template) return false

    // Check level requirement
    if (playerData && playerData.level < template.requiredLevel) {
      return false
    }

    // Check pet bond requirement
    if (playerData && playerData.petBond < template.requiredPetBond) {
      return false
    }

    // Check prerequisites
    for (const prereqId of template.metadata.prerequisites) {
      if (!this.completedQuests.has(prereqId)) {
        return false
      }
    }

    return true
  }

  private hasConflicts(questId: string, playerId: string): boolean {
    const template = this.questTemplates.get(questId)
    if (!template) return false

    const activeQuests = this.getActiveQuests(playerId)
    
    for (const activeQuest of activeQuests) {
      if (template.metadata.conflicts.includes(activeQuest.id)) {
        return true
      }
    }

    return false
  }

  private isQuestAvailable(template: QuestTemplate, playerId: string, playerData?: any): boolean {
    // Check if quest is already active or completed
    if (this.activeQuests.has(template.id) || this.completedQuests.has(template.id)) {
      return false
    }

    // Check prerequisites
    return this.checkPrerequisites(template.id, playerData)
  }

  private areAllObjectivesCompleted(quest: QuestData): boolean {
    return quest.objectives.every(objective => objective.isCompleted || objective.isOptional)
  }

  private updatePlayerQuestStatus(playerId: string, questId: string, status: QuestStatus): void {
    const playerQuests = this.playerQuests.get(playerId)
    if (!playerQuests) return

    const quest = playerQuests.find(q => q.id === questId)
    if (quest) {
      quest.status = status
    }

    // Move to history if completed or failed
    if (status === 'completed' || status === 'failed') {
      if (!this.questHistory.has(playerId)) {
        this.questHistory.set(playerId, [])
      }
      this.questHistory.get(playerId)!.push(quest!)
      
      // Remove from active player quests
      this.playerQuests.set(playerId, playerQuests.filter(q => q.id !== questId))
    }
  }

  private updateQuestStatistics(quest: QuestData, action: 'started' | 'completed' | 'failed' | 'abandoned'): void {
    switch (action) {
      case 'started':
        this.questStatistics.activeQuests++
        break
      case 'completed':
        this.questStatistics.activeQuests--
        this.questStatistics.completedQuests++
        this.questStatistics.totalExperience += quest.rewards.experience
        this.questStatistics.totalCoins += quest.rewards.coins
        this.questStatistics.totalItems += quest.rewards.items.length
        if (quest.bestTime) {
          this.updateAverageCompletionTime(quest.bestTime)
        }
        break
      case 'failed':
        this.questStatistics.activeQuests--
        this.questStatistics.failedQuests++
        break
      case 'abandoned':
        this.questStatistics.activeQuests--
        break
    }

    this.updateStatisticsByType()
    this.updateStatisticsByCategory()
    this.updateStatisticsByDifficulty()
  }

  private updateAverageCompletionTime(completionTime: number): void {
    const totalTime = this.questStatistics.averageCompletionTime * this.questStatistics.completedQuests
    this.questStatistics.averageCompletionTime = (totalTime + completionTime) / (this.questStatistics.completedQuests + 1)
  }

  private updateStatisticsByType(): void {
    this.questStatistics.questsByType.clear()
    for (const quest of this.quests.values()) {
      const count = this.questStatistics.questsByType.get(quest.type) || 0
      this.questStatistics.questsByType.set(quest.type, count + 1)
    }
  }

  private updateStatisticsByCategory(): void {
    this.questStatistics.questsByCategory.clear()
    for (const quest of this.quests.values()) {
      const count = this.questStatistics.questsByCategory.get(quest.category) || 0
      this.questStatistics.questsByCategory.set(quest.category, count + 1)
    }
  }

  private updateStatisticsByDifficulty(): void {
    this.questStatistics.questsByDifficulty.clear()
    for (const quest of this.quests.values()) {
      const count = this.questStatistics.questsByDifficulty.get(quest.difficulty) || 0
      this.questStatistics.questsByDifficulty.set(quest.difficulty, count + 1)
    }
  }

  private getCategoryPriority(category: QuestCategory): number {
    const priorities: { [key in QuestCategory]: number } = {
      main: 0,
      side: 1,
      daily: 2,
      weekly: 3,
      seasonal: 4,
      achievement: 5,
      hidden: 6,
      repeatable: 7
    }
    return priorities[category]
  }

  private checkQuestChains(completedQuestId: string, playerId: string): void {
    const chain = this.questChains.get(completedQuestId)
    if (chain) {
      for (const nextQuestId of chain) {
        if (this.canStartQuest(nextQuestId)) {
          this.eventManager.emit('questChainAvailable', { questId: nextQuestId, player: { id: playerId } })
        }
      }
    }
  }

  private applyPlayerModifications(quest: QuestData, playerData: any): void {
    // Adjust difficulty based on player level
    if (playerData.level > quest.requiredLevel + 5) {
      // Reduce difficulty for over-leveled players
      quest.difficulty = 'easy'
    } else if (playerData.level < quest.requiredLevel) {
      // Increase difficulty for under-leveled players
      quest.difficulty = 'hard'
    }

    // Adjust rewards based on player progress
    if (playerData.petBond > quest.requiredPetBond * 2) {
      quest.rewards.petBond = Math.floor(quest.rewards.petBond * 1.5)
    }
  }

  private handleLevelLoaded(levelId: string, questId: string): void {
    // Quest-specific level loading logic
    this.eventManager.emit('questLevelLoaded', { levelId, questId, timestamp: Date.now() })
  }

  private handleLevelCompleted(levelId: string, questId: string): void {
    // Check if this completes the quest
    const quest = this.quests.get(questId)
    if (quest && this.areAllObjectivesCompleted(quest)) {
      this.eventManager.emit('questReadyToComplete', { questId: quest.id, player: { id: 'unknown' } })
    }
  }

  private handleObjectiveCompleted(objectiveId: string, questId: string, playerId: string): void {
    // Update quest progress when objective is completed
    this.updateQuestProgress(questId, objectiveId, 1, playerId)
  }

  // ===== CHECKPOINT SYSTEM INTEGRATION =====

  /**
   * Save current quest progress to a checkpoint
   */
  public saveQuestCheckpoint(playerId: string, checkpointName: string): string | null {
    try {
      const playerQuests = this.playerQuests.get(playerId) || []
      const activeQuests = playerQuests.filter(q => q.status === 'active')
      const completedQuests = playerQuests.filter(q => q.status === 'completed')
      const failedQuests = playerQuests.filter(q => q.status === 'failed')

      const questProgress = {
        activeQuests: activeQuests.map(q => ({
          id: q.id,
          progress: q.progress,
          objectives: q.objectives,
          startTime: q.startTime,
          attempts: q.attempts
        })),
        completedQuests: completedQuests.map(q => q.id),
        failedQuests: failedQuests.map(q => q.id),
        totalQuests: playerQuests.length,
        questChains: Array.from(this.questChains.entries()),
        questDependencies: Array.from(this.questDependencies.entries())
      }

      const checkpointSystem = this.getCheckpointSystem()
      const checkpointId = checkpointSystem.createCheckpoint(
        checkpointName,
        { id: playerId, level: 1, experience: 0, coins: 0, orbs: 0 }, // Placeholder player data
        questProgress,
        { totalAchievements: 0, achievements: [] }, // Placeholder achievements
        { currentWorld: 'default', currentLevel: 'default', gameTime: Date.now() } // Placeholder game state
      )

      this.eventManager.emit('questCheckpointSaved', { 
        playerId, 
        checkpointId, 
        checkpointName,
        questCount: activeQuests.length 
      })

      return checkpointId
    } catch (error) {
      console.error('Failed to save quest checkpoint:', error)
      return null
    }
  }

  /**
   * Restore quest progress from a checkpoint
   */
  public restoreQuestCheckpoint(playerId: string, checkpointId: string): boolean {
    try {
      const checkpointSystem = this.getCheckpointSystem()
      const checkpoint = checkpointSystem.restoreCheckpoint(checkpointId)
      
      if (!checkpoint) {
        return false
      }

      const questProgress = checkpoint.questProgress
      
      // Restore active quests
      if (questProgress.activeQuests) {
        for (const questData of questProgress.activeQuests) {
          const quest = this.quests.get(questData.id)
          if (quest) {
            quest.progress = questData.progress
            quest.objectives = questData.objectives
            // Handle optional properties gracefully
            if ('startTime' in questData) {
              (quest as any).startTime = questData.startTime
            }
            if ('attempts' in questData) {
              (quest as any).attempts = questData.attempts
            }
            quest.status = 'active'
            
            // Re-add to active quests if not already there
            if (!this.activeQuests.has(quest.id)) {
              this.activeQuests.add(quest.id)
            }
          }
        }
      }

      // Restore quest chains and dependencies
      if (questProgress.questChains) {
        this.questChains.clear()
        for (const [key, value] of questProgress.questChains) {
          this.questChains.set(key, value)
        }
      }

      if (questProgress.questDependencies) {
        this.questDependencies.clear()
        for (const [key, value] of questProgress.questDependencies) {
          this.questDependencies.set(key, value)
        }
      }

      this.eventManager.emit('questCheckpointRestored', { 
        playerId, 
        checkpointId,
        restoredQuests: questProgress.activeQuests?.length || 0
      })

      return true
    } catch (error) {
      console.error('Failed to restore quest checkpoint:', error)
      return false
    }
  }

  /**
   * Get all available checkpoints for a player
   */
  public getPlayerCheckpoints(playerId: string): any[] {
    try {
      const checkpointSystem = this.getCheckpointSystem()
      return checkpointSystem.getAllCheckpoints()
    } catch (error) {
      console.error('Failed to get player checkpoints:', error)
      return []
    }
  }

  /**
   * Delete a quest checkpoint
   */
  public deleteQuestCheckpoint(checkpointId: string): boolean {
    try {
      const checkpointSystem = this.getCheckpointSystem()
      return checkpointSystem.deleteCheckpoint(checkpointId)
    } catch (error) {
      console.error('Failed to delete quest checkpoint:', error)
      return false
    }
  }

  /**
   * Auto-save quest progress (called periodically)
   */
  public autoSaveQuestProgress(playerId: string): void {
    const activeQuests = this.playerQuests.get(playerId)?.filter(q => q.status === 'active') || []
    
    if (activeQuests.length > 0) {
      const checkpointName = `Auto-save ${new Date().toLocaleTimeString()}`
      this.saveQuestCheckpoint(playerId, checkpointName)
    }
  }
}

export interface QuestStartResult {
  success: boolean
  quest?: QuestData
  error?: string
}

export interface QuestProgressResult {
  success: boolean
  objective?: QuestObjective
  questComplete?: boolean
  error?: string
}

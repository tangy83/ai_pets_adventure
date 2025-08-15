import { DifficultyScalingSystem, DifficultyFactors } from './DifficultyScalingSystem'
import { EventManager } from '../core/EventManager'

export interface QuestObjective {
  id: string
  description: string
  type: 'collect' | 'interact' | 'defeat' | 'explore' | 'solve'
  target: string
  amount: number
  current: number
  completed: boolean
  required: boolean
}

export interface QuestReward {
  experience: number
  coins: number
  items: string[]
  petBond: number
  unlockWorld?: string
}

export interface Quest {
  id: string
  title: string
  description: string
  worldId: string
  level: number
  type: QuestType
  objectives: QuestObjective[]
  rewards: QuestReward
  timeLimit?: number
  startedAt?: number
  completedAt?: number
  isActive: boolean
  isCompleted: boolean
  isFailed: boolean
}

export type QuestType = 'main' | 'side' | 'daily' | 'weekly' | 'event'

export class QuestSystem {
  private static instance: QuestSystem
  private quests: Map<string, Quest> = new Map()
  private activeQuests: Set<string> = new Set()
  private completedQuests: Set<string> = new Set()
  private difficultyScaling: DifficultyScalingSystem | null = null
  private eventManager: EventManager | null = null

  private constructor() {
    this.initializeDefaultQuests()
  }

  public static getInstance(): QuestSystem {
    if (!QuestSystem.instance) {
      QuestSystem.instance = new QuestSystem()
    }
    return QuestSystem.instance
  }

  // Initialize difficulty scaling system and event manager
  public initializeDifficultyScaling(difficultyScaling: DifficultyScalingSystem, eventManager?: EventManager): void {
    this.difficultyScaling = difficultyScaling
    if (eventManager) {
      this.eventManager = eventManager
    }
  }

  // Quest management
  public createQuest(questData: Omit<Quest, 'id' | 'isActive' | 'isCompleted' | 'isFailed'>): Quest {
    const quest: Quest = {
      ...questData,
      id: this.generateId(),
      isActive: false,
      isCompleted: false,
      isFailed: false
    }
    
    this.quests.set(quest.id, quest)
    return quest
  }

  // Enhanced quest creation with difficulty scaling
  public createQuestWithScaling(
    questData: Omit<Quest, 'id' | 'isActive' | 'isCompleted' | 'isFailed'>, 
    playerId: string
  ): Quest {
    const quest = this.createQuest(questData)
    
    // Apply AI-based difficulty scaling if available
    if (this.difficultyScaling) {
      const adjustedDifficulty = this.difficultyScaling.calculateAdjustedDifficulty(quest.id, playerId)
      quest.level = Math.round(adjustedDifficulty)
    }
    
    return quest
  }

  // Enhanced quest start with difficulty tracking
  public startQuest(questId: string, playerId: string): boolean {
    const quest = this.quests.get(questId)
    if (!quest || quest.isActive || quest.isCompleted) return false

    // Get adjusted difficulty for this player
    let adjustedDifficulty = quest.level
    if (this.difficultyScaling) {
      adjustedDifficulty = this.difficultyScaling.calculateAdjustedDifficulty(questId, playerId)
    }

    quest.isActive = true
    quest.startedAt = Date.now()
    this.activeQuests.add(questId)
    
    // Emit quest started event with difficulty information
    if (this.eventManager) {
      this.eventManager.emit('questStarted', {
        questId,
        previousQuest: null,
        player: { id: playerId }
      })
    }
    
    return true
  }

  // Enhanced quest completion with performance tracking
  public completeQuest(questId: string, playerId: string, completionTime?: number): boolean {
    const quest = this.quests.get(questId)
    if (!quest || !quest.isActive || quest.isCompleted) return false

    // Check if all required objectives are completed
    const requiredObjectives = quest.objectives.filter(obj => obj.required)
    if (!requiredObjectives.every(obj => obj.completed)) return false

    quest.isCompleted = true
    quest.isActive = false
    quest.completedAt = Date.now()
    
    this.activeQuests.delete(questId)
    this.completedQuests.add(questId)
    
    // Emit quest completed event with performance data
    if (this.eventManager) {
      this.eventManager.emit('questCompleted', {
        questId,
        rewards: [
          { type: 'experience', amount: quest.rewards.experience },
          { type: 'coins', amount: quest.rewards.coins },
          ...quest.rewards.items.map(item => ({ type: 'item', itemId: item })),
          { type: 'petBond', amount: quest.rewards.petBond }
        ],
        player: { id: playerId },
        pet: { id: 'default_pet' }
      })
    }
    
    return true
  }

  // Enhanced quest failure with performance tracking
  public failQuest(questId: string, playerId: string, failureReason?: string): boolean {
    const quest = this.quests.get(questId)
    if (!quest || !quest.isActive) return false

    quest.isFailed = true
    quest.isActive = false
    this.activeQuests.delete(questId)
    
    // Emit quest failed event with failure data
    if (this.eventManager) {
      this.eventManager.emit('questFailed', {
        questId,
        player: { id: playerId }
      })
    }
    
    return true
  }

  // Enhanced objective update with performance tracking
  public updateObjective(questId: string, objectiveId: string, progress: number, playerId: string): boolean {
    const quest = this.quests.get(questId)
    if (!quest || !quest.isActive) return false

    const objective = quest.objectives.find(obj => obj.id === objectiveId)
    if (!objective) return false

    const previousProgress = objective.current
    objective.current = Math.min(objective.amount, objective.current + progress)
    const wasCompleted = objective.completed
    objective.completed = objective.current >= objective.amount

    // Emit objective completed event if newly completed
    if (objective.completed && !wasCompleted && this.eventManager) {
      this.eventManager.emit('objectiveCompleted', {
        objectiveId,
        questId,
        player: { id: playerId }
      })
    }

    // Check if quest can be completed
    if (this.canCompleteQuest(quest)) {
      this.completeQuest(questId, playerId)
    }

    return true
  }

  // Quest queries
  public getQuest(questId: string): Quest | undefined {
    return this.quests.get(questId)
  }

  // Get quest with adjusted difficulty for a specific player
  public getQuestWithDifficulty(questId: string, playerId: string): Quest | undefined {
    const quest = this.quests.get(questId)
    if (!quest) return undefined
    
    // Create a copy with adjusted difficulty
    const adjustedQuest = { ...quest }
    
    if (this.difficultyScaling) {
      const adjustedDifficulty = this.difficultyScaling.calculateAdjustedDifficulty(questId, playerId)
      adjustedQuest.level = Math.round(adjustedDifficulty)
    }
    
    return adjustedQuest
  }

  public getActiveQuests(): Quest[] {
    return Array.from(this.activeQuests).map(id => this.quests.get(id)!)
  }

  public getCompletedQuests(): Quest[] {
    return Array.from(this.completedQuests).map(id => this.quests.get(id)!)
  }

  public getQuestsByWorld(worldId: string): Quest[] {
    return Array.from(this.quests.values()).filter(quest => quest.worldId === worldId)
  }

  public getAvailableQuests(level: number): Quest[] {
    return Array.from(this.quests.values()).filter(quest => 
      !quest.isActive && !quest.isCompleted && !quest.isFailed && quest.level <= level
    )
  }

  // Get available quests with adjusted difficulties for a specific player
  public getAvailableQuestsWithDifficulty(level: number, playerId: string): Quest[] {
    const availableQuests = this.getAvailableQuests(level)
    
    if (!this.difficultyScaling) {
      return availableQuests
    }
    
    // Apply difficulty adjustments to each quest
    return availableQuests.map(quest => {
      const adjustedQuest = { ...quest }
      const adjustedDifficulty = this.difficultyScaling!.calculateAdjustedDifficulty(quest.id, playerId)
      adjustedQuest.level = Math.round(adjustedDifficulty)
      return adjustedQuest
    })
  }

  public getQuestsByType(type: QuestType): Quest[] {
    return Array.from(this.quests.values()).filter(quest => 
      quest.type === type
    )
  }

  // Quest validation
  private canCompleteQuest(quest: Quest): boolean {
    const requiredObjectives = quest.objectives.filter(obj => obj.required)
    return requiredObjectives.every(obj => obj.completed)
  }

  // Default quests
  private initializeDefaultQuests(): void {
    // Tutorial quest
    this.createQuest({
      title: 'Welcome to Adventure',
      description: 'Learn the basics of the game and meet your first pet',
      worldId: 'home',
      level: 1,
      type: 'main',
      objectives: [
        {
          id: 'tutorial_1',
          description: 'Create your first pet',
          type: 'interact',
          target: 'pet_creation',
          amount: 1,
          current: 0,
          completed: false,
          required: true
        },
        {
          id: 'tutorial_2',
          description: 'Complete your first quest',
          type: 'interact',
          target: 'quest_completion',
          amount: 1,
          current: 0,
          completed: false,
          required: true
        }
      ],
      rewards: {
        experience: 100,
        coins: 50,
        items: ['starter_pack'],
        petBond: 20
      }
    })

    // First world quest
    this.createQuest({
      title: 'Emerald Jungle Explorer',
      description: 'Venture into the mysterious Emerald Jungle and discover its secrets',
      worldId: 'emerald_jungle',
      level: 2,
      type: 'main',
      objectives: [
        {
          id: 'jungle_1',
          description: 'Explore the jungle entrance',
          type: 'explore',
          target: 'jungle_entrance',
          amount: 1,
          current: 0,
          completed: false,
          required: true
        },
        {
          id: 'jungle_2',
          description: 'Collect 3 jungle flowers',
          type: 'collect',
          target: 'jungle_flower',
          amount: 3,
          current: 0,
          completed: false,
          required: true
        },
        {
          id: 'jungle_3',
          description: 'Find the ancient temple',
          type: 'explore',
          target: 'ancient_temple',
          amount: 1,
          current: 0,
          completed: false,
          required: false
        }
      ],
      rewards: {
        experience: 200,
        coins: 100,
        items: ['jungle_map', 'magic_compass'],
        petBond: 30,
        unlockWorld: 'crystal_caves'
      }
    })

    // Daily quest
    this.createQuest({
      title: 'Daily Training',
      description: 'Train with your pet to strengthen your bond',
      worldId: 'home',
      level: 1,
      type: 'daily',
      objectives: [
        {
          id: 'daily_1',
          description: 'Train your pet 3 times',
          type: 'interact',
          target: 'pet_training',
          amount: 3,
          current: 0,
          completed: false,
          required: true
        }
      ],
      rewards: {
        experience: 50,
        coins: 25,
        items: [],
        petBond: 10
      },
      timeLimit: 24 * 60 * 60 * 1000 // 24 hours
    })
  }

  // Utility methods
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  // Serialization
  public toJSON(): any {
    return {
      quests: Array.from(this.quests.values()),
      activeQuests: Array.from(this.activeQuests),
      completedQuests: Array.from(this.completedQuests)
    }
  }

  public static fromJSON(data: any): QuestSystem {
    const system = QuestSystem.getInstance()
    
    // Clear existing data
    system.quests.clear()
    system.activeQuests.clear()
    system.completedQuests.clear()
    
    // Restore quests
    data.quests?.forEach((questData: any) => {
      system.quests.set(questData.id, questData)
    })
    
    // Restore active and completed quests
    data.activeQuests?.forEach((questId: string) => {
      system.activeQuests.add(questId)
    })
    
    data.completedQuests?.forEach((questId: string) => {
      system.completedQuests.add(questId)
    })
    
    return system
  }

  // Get quest difficulty factors for analysis
  public getQuestDifficultyFactors(questId: string, playerId: string): DifficultyFactors | null {
    if (!this.difficultyScaling) return null
    
    const quest = this.quests.get(questId)
    if (!quest) return null
    
    // This would return the calculated difficulty factors
    // Implementation depends on making some methods public in DifficultyScalingSystem
    return null
  }

  // Get quest difficulty history for a player
  public getQuestDifficultyHistory(questId: string): any[] {
    if (!this.difficultyScaling) return []
    
    return this.difficultyScaling.getDifficultyAdjustments(questId)
  }
} 

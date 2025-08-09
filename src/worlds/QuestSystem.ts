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

  private constructor() {
    this.initializeDefaultQuests()
  }

  public static getInstance(): QuestSystem {
    if (!QuestSystem.instance) {
      QuestSystem.instance = new QuestSystem()
    }
    return QuestSystem.instance
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

  public startQuest(questId: string): boolean {
    const quest = this.quests.get(questId)
    if (!quest || quest.isActive || quest.isCompleted) return false

    quest.isActive = true
    quest.startedAt = Date.now()
    this.activeQuests.add(questId)
    
    return true
  }

  public completeQuest(questId: string): boolean {
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
    
    return true
  }

  public failQuest(questId: string): boolean {
    const quest = this.quests.get(questId)
    if (!quest || !quest.isActive) return false

    quest.isFailed = true
    quest.isActive = false
    this.activeQuests.delete(questId)
    
    return true
  }

  public updateObjective(questId: string, objectiveId: string, progress: number): boolean {
    const quest = this.quests.get(questId)
    if (!quest || !quest.isActive) return false

    const objective = quest.objectives.find(obj => obj.id === objectiveId)
    if (!objective) return false

    objective.current = Math.min(objective.amount, objective.current + progress)
    objective.completed = objective.current >= objective.amount

    // Check if quest can be completed
    if (this.canCompleteQuest(quest)) {
      this.completeQuest(questId)
    }

    return true
  }

  // Quest queries
  public getQuest(questId: string): Quest | undefined {
    return this.quests.get(questId)
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
          type: 'complete',
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
} 
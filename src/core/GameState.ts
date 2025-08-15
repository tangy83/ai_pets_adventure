import { EventManager } from './EventManager'

export interface Player {
  id: string
  name: string
  level: number
  experience: number
  coins: number
  currentWorld: string
  currentQuest: string | null
  completedQuests: string[]
  petBondLevel: number
  lastActive: number
}

export interface Pet {
  id: string
  name: string
  type: string
  level: number
  skills: PetSkill[]
  bondLevel: number
  memories: PetMemory[]
  lastInteraction: number
}

export interface PetSkill {
  name: string
  level: number
  cooldown: number
  lastUsed: number
  maxLevel: number
}

export interface PetMemory {
  id: string
  type: 'quest' | 'interaction' | 'learning' | 'achievement'
  data: any
  timestamp: number
  importance: number // 1-10 scale
}

export interface Quest {
  id: string
  worldId: string
  name: string
  description: string
  objectives: QuestObjective[]
  rewards: QuestReward[]
  difficulty: number
  isCompleted: boolean
  progress: number
  timeLimit?: number
  startTime?: number
}

export interface QuestObjective {
  id: string
  description: string
  isCompleted: boolean
  requiredCount: number
  currentCount: number
  type: 'collect' | 'interact' | 'reach' | 'defeat'
}

export interface QuestReward {
  type: 'experience' | 'coins' | 'items' | 'petBond' | 'skillPoints'
  amount: number
  itemId?: string
  skillId?: string
}

export interface World {
  id: string
  name: string
  description: string
  quests: string[]
  unlocked: boolean
  requiredLevel: number
  backgroundImage?: string
  music?: string
}

export interface GameStateData {
  player: Player
  pet: Pet
  worlds: Map<string, World>
  isPaused: boolean
  lastSaveTime: number
  gameVersion: string
  totalPlayTime: number
  achievements: string[]
}

export class GameState {
  private state: GameStateData
  private eventManager: EventManager
  private isInitialized: boolean = false

  constructor(eventManager: EventManager) {
    this.eventManager = eventManager
    this.state = this.createDefaultState()
  }

  private createDefaultState(): GameStateData {
    return {
      player: this.createDefaultPlayer(),
      pet: this.createDefaultPet(),
      worlds: this.createDefaultWorlds(),
      isPaused: false,
      lastSaveTime: Date.now(),
      gameVersion: '1.0.0',
      totalPlayTime: 0,
      achievements: []
    }
  }

  private createDefaultPlayer(): Player {
    return {
      id: 'player_1',
      name: 'Adventurer',
      level: 1,
      experience: 0,
      coins: 100,
      currentWorld: 'emerald_jungle',
      currentQuest: null,
      completedQuests: [],
      petBondLevel: 1,
      lastActive: Date.now()
    }
  }

  private createDefaultPet(): Pet {
    return {
      id: 'pet_1',
      name: 'Spark',
      type: 'fox',
      level: 1,
      skills: [
        { name: 'detect', level: 1, cooldown: 5000, lastUsed: 0, maxLevel: 5 },
        { name: 'help', level: 1, cooldown: 10000, lastUsed: 0, maxLevel: 3 },
        { name: 'solve', level: 1, cooldown: 15000, lastUsed: 0, maxLevel: 4 }
      ],
      bondLevel: 1,
      memories: [],
      lastInteraction: Date.now()
    }
  }

  private createDefaultWorlds(): Map<string, World> {
    const worlds: Map<string, World> = new Map()
    worlds.set('emerald_jungle', {
      id: 'emerald_jungle',
      name: 'Emerald Jungle',
      description: 'A lush, emerald-colored jungle teeming with life.',
      quests: ['quest_1', 'quest_2', 'test_quest_1'],
      unlocked: true,
      requiredLevel: 1,
      backgroundImage: '/assets/images/worlds/emerald_jungle_bg.jpg',
      music: '/assets/audio/worlds/emerald_jungle_theme.mp3'
    })
    worlds.set('crystal_caverns', {
      id: 'crystal_caverns',
      name: 'Crystal Caverns',
      description: 'A network of sparkling caverns filled with crystals.',
      quests: ['quest_3'],
      unlocked: false,
      requiredLevel: 5,
      backgroundImage: '/assets/images/worlds/crystal_caverns_bg.jpg',
      music: '/assets/audio/worlds/crystal_caverns_theme.mp3'
    })
    return worlds
  }

  public initialize(): void {
    if (this.isInitialized) return
    
    // Load saved game state if available
    this.loadGameState()
    
    // Emit initialization event
    this.eventManager.emit('gameStateInitialized', {
      player: this.state.player,
      pet: this.state.pet,
      worlds: Array.from(this.state.worlds.entries())
    })
    
    this.isInitialized = true
    console.log('Game state initialized')
  }

  public update(deltaTime: number): void {
    if (this.state.isPaused) return

    // Update quest progress
    this.updateQuests(deltaTime)

    // Create new state with immutable updates
    const newState = {
      ...this.state,
      totalPlayTime: this.state.totalPlayTime + deltaTime,
      lastSaveTime: Date.now() - this.state.lastSaveTime > 30000 ? Date.now() : this.state.lastSaveTime
    }

    // Update state immutably
    this.state = newState

    // Auto-save every 30 seconds
    if (Date.now() - this.state.lastSaveTime > 30000) {
      this.saveGameState()
      this.state = {
        ...this.state,
        lastSaveTime: Date.now()
      }
    }

    // Emit update event
    this.eventManager.emit('gameStateUpdated', {
      deltaTime,
      totalPlayTime: this.state.totalPlayTime
    })
  }

  private updateQuests(deltaTime: number): void {
    // Update active quest progress
    if (this.state.player.currentQuest) {
      const quest = this.findQuest(this.state.player.currentQuest)
      if (quest && !quest.isCompleted) {
        this.updateQuestProgress(quest, deltaTime)
      }
    }
  }

  private updateQuestProgress(quest: Quest, deltaTime: number): void {
    // Check for time-based quest completion
    if (quest.timeLimit && quest.startTime) {
      const elapsed = Date.now() - quest.startTime
      if (elapsed >= quest.timeLimit) {
        this.failQuest(quest.id)
        return
      }
    }

    // Update quest objectives based on time and player actions
    // This will be expanded as quest mechanics are implemented
  }

  public startQuest(questId: string): boolean {
    // Check if quest exists in current world
    const currentWorld = this.state.player.currentWorld
    const worldQuests = this.state.worlds.get(currentWorld)?.quests || []
    
    if (worldQuests.includes(questId)) {
      const oldQuest = this.state.player.currentQuest
      
      // Update state immutably
      this.state = {
        ...this.state,
        player: {
          ...this.state.player,
          currentQuest: questId
        }
      }
      
      // Emit quest started event
      this.eventManager.emit('questStarted', {
        questId,
        previousQuest: oldQuest,
        player: this.state.player
      })
      
      return true
    }
    
    return false
  }

  public completeQuest(questId: string): boolean {
    if (this.state.player.currentQuest === questId) {
      const quest = this.findQuest(questId)
      if (quest) {
        // Award rewards
        this.awardQuestRewards(quest)
        
        // Update quest status immutably
        quest.isCompleted = true
        this.state = {
          ...this.state,
          player: {
            ...this.state.player,
            completedQuests: [...this.state.player.completedQuests, questId],
            currentQuest: null
          }
        }
        
        // Emit quest completed event
        this.eventManager.emit('questCompleted', {
          questId,
          rewards: quest.rewards,
          player: this.state.player,
          pet: this.state.pet
        })
        
        return true
      }
    }
    
    return false
  }

  public failQuest(questId: string): boolean {
    if (this.state.player.currentQuest === questId) {
      // Update state immutably
      this.state = {
        ...this.state,
        player: {
          ...this.state.player,
          currentQuest: null
        }
      }
      
      // Emit quest failed event
      this.eventManager.emit('questFailed', {
        questId,
        player: this.state.player
      })
      
      return true
    }
    
    return false
  }

  private awardQuestRewards(quest: Quest): void {
    for (const reward of quest.rewards) {
      switch (reward.type) {
        case 'experience':
          this.state.player.experience += reward.amount
          this.checkLevelUp()
          break
        case 'coins':
          this.state.player.coins += reward.amount
          break
        case 'petBond':
          this.state.pet.bondLevel = Math.min(this.state.pet.bondLevel + reward.amount, 10)
          break
        case 'skillPoints':
          // Award skill points to pet
          this.awardPetSkillPoints(reward.amount)
          break
      }
    }
  }

  private awardPetSkillPoints(points: number): void {
    // Distribute skill points among pet skills
    const availableSkills = this.state.pet.skills.filter(skill => skill.level < skill.maxLevel)
    if (availableSkills.length === 0) return
    
    const pointsPerSkill = Math.floor(points / availableSkills.length)
    for (const skill of availableSkills) {
      skill.level = Math.min(skill.level + pointsPerSkill, skill.maxLevel)
    }
  }

  private checkLevelUp(): void {
    const experienceNeeded = this.state.player.level * 100
    if (this.state.player.experience >= experienceNeeded) {
      this.state.player.level++
      this.state.player.experience -= experienceNeeded
      
      // Emit level up event
      this.eventManager.emit('playerLevelUp', {
        newLevel: this.state.player.level,
        player: this.state.player
      })
      
      console.log(`Level up! You are now level ${this.state.player.level}`)
    }
  }

  public levelUpPlayer(targetLevel: number): void {
    if (targetLevel <= this.state.player.level) {
      return
    }
    
    // Calculate total experience needed to reach target level
    let totalExperienceNeeded = 0
    for (let level = this.state.player.level + 1; level <= targetLevel; level++) {
      totalExperienceNeeded += level * 100
    }
    
    // Add experience to trigger level up
    this.state.player.experience += totalExperienceNeeded
    
    // Check for level up (this will handle multiple level ups if needed)
    while (this.state.player.experience >= this.state.player.level * 100) {
      this.checkLevelUp()
    }
  }

  private findQuest(questId: string): Quest | null {
    // This will be implemented to load quests from a quest database
    // For now, return a mock quest
    return {
      id: questId,
      worldId: this.state.player.currentWorld,
      name: `Quest ${questId}`,
      description: 'A mysterious quest awaits...',
      objectives: [],
      rewards: [
        { type: 'experience', amount: 50 },
        { type: 'coins', amount: 25 }
      ],
      difficulty: 1,
      isCompleted: false,
      progress: 0
    }
  }

  public saveGameState(): void {
    try {
      const saveData = {
        player: this.state.player,
        pet: this.state.pet,
        worlds: Array.from(this.state.worlds.entries()),
        currentWorld: this.state.player.currentWorld,
        currentQuest: this.state.player.currentQuest,
        isPaused: this.state.isPaused,
        gameVersion: this.state.gameVersion,
        totalPlayTime: this.state.totalPlayTime,
        achievements: this.state.achievements,
        lastSaveTime: Date.now()
      }
      
      localStorage.setItem('ai_pets_adventure_save', JSON.stringify(saveData))
      
      // Emit save event
      this.eventManager.emit('gameStateSaved', {
        saveData,
        timestamp: Date.now()
      })
      
      console.log('Game state saved successfully')
    } catch (error) {
      console.error('Failed to save game state:', error)
      
      // Emit save error event
      this.eventManager.emit('gameStateSaveError', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      })
    }
  }

  public loadGameState(): boolean {
    try {
      const saveData = localStorage.getItem('ai_pets_adventure_save')
      if (!saveData) {
        return false
      }

      const parsedData = JSON.parse(saveData)
      
      // Validate save data version
      if (parsedData.gameVersion !== this.state.gameVersion) {
        console.warn('Save data version mismatch, using default state')
        return false
      }
      
      // Restore game state
      this.state.player = parsedData.player
      this.state.pet = parsedData.pet
      this.state.worlds = new Map(parsedData.worlds)
      this.state.isPaused = parsedData.isPaused || false
      this.state.totalPlayTime = parsedData.totalPlayTime || 0
      this.state.achievements = parsedData.achievements || []
      
      // Emit load event
      this.eventManager.emit('gameStateLoaded', {
        saveData: parsedData,
        timestamp: Date.now()
      })
      
      return true
    } catch (error) {
      console.error('Failed to load game state:', error)
      
      // Emit load error event
      this.eventManager.emit('gameStateLoadError', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      })
      
      return false
    }
  }

  // Getters with immutable returns
  public getPlayer(): Player {
    return { ...this.state.player }
  }

  public getPet(): Pet {
    return { ...this.state.pet }
  }

  public getWorlds(): Map<string, World> {
    return new Map(this.state.worlds)
  }

  public getCurrentWorld(): string {
    return this.state.player.currentWorld
  }

  public getCurrentQuest(): string | null {
    return this.state.player.currentQuest
  }

  public getActiveQuests(): Quest[] {
    if (this.state.player.currentQuest) {
      const quest = this.findQuest(this.state.player.currentQuest)
      return quest ? [quest] : []
    }
    return []
  }

  public getCompletedQuests(): string[] {
    return [...this.state.player.completedQuests]
  }

  public getTotalPlayTime(): number {
    return this.state.totalPlayTime
  }

  public getAchievements(): string[] {
    return [...this.state.achievements]
  }

  // Setters with event emission
  public setCurrentWorld(worldId: string): void {
    const oldWorld = this.state.player.currentWorld
    this.state.player.currentWorld = worldId
    
    // Emit world changed event
    this.eventManager.emit('worldChanged', {
      oldWorld,
      newWorld: worldId,
      player: this.state.player
    })
  }

  public setPlayerName(name: string): void {
    const oldName = this.state.player.name
    this.state.player.name = name
    
    // Emit player name changed event
    this.eventManager.emit('playerNameChanged', {
      oldName,
      newName: name,
      player: this.state.player
    })
  }

  public addAchievement(achievementId: string): void {
    if (!this.state.achievements.includes(achievementId)) {
      this.state.achievements.push(achievementId)
      
      // Emit achievement unlocked event
      this.eventManager.emit('achievementUnlocked', {
        achievementId,
        totalAchievements: this.state.achievements.length
      })
    }
  }

  public pause(): void {
    this.state.isPaused = true
    
    // Emit game paused event
    this.eventManager.emit('gamePaused', {
      timestamp: Date.now()
    })
  }

  public resume(): void {
    this.state.isPaused = false
    
    // Emit game resumed event
    this.eventManager.emit('gameResumed', {
      timestamp: Date.now()
    })
  }

  public isGamePaused(): boolean {
    return this.state.isPaused
  }

  public getInitializationStatus(): boolean {
    return this.isInitialized
  }

  public getGameVersion(): string {
    return this.state.gameVersion
  }

  public resetGame(): void {
    this.state = this.createDefaultState()
    
    // Emit game reset event
    this.eventManager.emit('gameReset', {
      timestamp: Date.now()
    })
    
    console.log('Game state reset to default')
  }
} 

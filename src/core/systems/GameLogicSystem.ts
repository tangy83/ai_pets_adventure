import { BaseSystem } from './BaseSystem'
import { EventManager } from '../EventManager'
import { QuestSystem } from '../../worlds/QuestSystem'
import { GameState } from '../GameState'

export interface GameScore {
  totalScore: number
  questScore: number
  explorationScore: number
  petBondScore: number
  achievementScore: number
  multiplier: number
  streak: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  points: number
  isUnlocked: boolean
  unlockedAt?: number
  category: 'quest' | 'exploration' | 'pet' | 'social' | 'special'
}

export interface GameProgress {
  currentLevel: number
  experience: number
  experienceToNext: number
  worldProgress: Map<string, number>
  questProgress: Map<string, number>
  petBondProgress: number
}

export interface ScoringRule {
  id: string
  action: string
  basePoints: number
  multiplier: number
  conditions: ScoringCondition[]
}

export interface ScoringCondition {
  type: 'quest_active' | 'pet_bond_level' | 'world_unlocked' | 'streak_count'
  value: any
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains'
}

export class GameLogicSystem extends BaseSystem {
  private questSystem: QuestSystem
  private gameState: GameState
  private currentScore: GameScore
  private achievements: Map<string, Achievement>
  private scoringRules: Map<string, ScoringRule>
  private progress: GameProgress
  private lastUpdate: number = 0
  private updateInterval: number = 1000 // Update every second

  constructor() {
    super('GameLogicSystem')
    this.questSystem = QuestSystem.getInstance()
    this.currentScore = this.createDefaultScore()
    this.achievements = new Map()
    this.scoringRules = new Map()
    this.progress = this.createDefaultProgress()
    this.initializeAchievements()
    this.initializeScoringRules()
  }

  public setEventManager(eventManager: EventManager): void {
    super.setEventManager(eventManager)
    this.gameState = new GameState(eventManager)
  }

  public initialize(): void {
    super.initialize()
    this.loadGameProgress()
    this.setupEventListeners()
    console.log('GameLogicSystem initialized')
  }

  public update(deltaTime: number): void {
    // Update at regular intervals
    const currentTime = Date.now()
    if (currentTime - this.lastUpdate >= this.updateInterval) {
      this.updateGameProgress(deltaTime)
      this.checkAchievements()
      this.updateScoring()
      this.lastUpdate = currentTime
    }
  }

  private setupEventListeners(): void {
    if (!this.eventManager) return

    // Listen for quest events
    this.eventManager.on('questStarted', this.handleQuestStarted.bind(this))
    this.eventManager.on('questCompleted', this.handleQuestCompleted.bind(this))
    this.eventManager.on('questFailed', this.handleQuestFailed.bind(this))
    this.eventManager.on('objectiveCompleted', this.handleObjectiveCompleted.bind(this))

    // Listen for player events
    this.eventManager.on('playerLevelUp', this.handlePlayerLevelUp.bind(this))
    this.eventManager.on('worldChanged', this.handleWorldChanged.bind(this))
    this.eventManager.on('petInteraction', this.handlePetInteraction.bind(this))

    // Listen for exploration events
    this.eventManager.on('areaExplored', this.handleAreaExplored.bind(this))
    this.eventManager.on('itemCollected', this.handleItemCollected.bind(this))
    this.eventManager.on('npcInteraction', this.handleNPCInteraction.bind(this))
  }

  // Quest Progress Management
  private handleQuestStarted(event: any): void {
    const { questId } = event
    this.addScore('quest_started', 10)
    this.updateQuestProgress(questId, 0)
    
    // Emit quest progress event
    this.eventManager?.emit('questProgressUpdated', {
      questId,
      progress: 0,
      score: this.currentScore.totalScore
    })
  }

  private handleQuestCompleted(event: any): void {
    const { questId, rewards } = event
    
    // Create a mock quest object for testing if quest system doesn't have it
    const quest = this.questSystem.getQuest(questId) || {
      id: questId,
      type: 'main',
      title: `Quest ${questId}`,
      description: 'Test quest'
    }
    
    // Calculate quest completion score
    const questScore = this.calculateQuestScore(quest)
    this.addScore('quest_completed', questScore)
    
    // Update progress
    this.updateQuestProgress(questId, 100)
    this.progress.questProgress.set(questId, 100)
    
    // Check for achievements
    this.checkQuestAchievements(quest)
    
    // Emit completion event
    this.eventManager?.emit('questProgressUpdated', {
      questId,
      progress: 100,
      score: this.currentScore.totalScore,
      completed: true
    })
  }

  private handleQuestFailed(event: any): void {
    const { questId } = event
    this.addScore('quest_failed', -5)
    this.updateQuestProgress(questId, 0)
    
    // Reset streak on failure
    this.currentScore.streak = 0
    this.updateScoreMultiplier()
  }

  private handleObjectiveCompleted(event: any): void {
    const { questId, objectiveId, progress } = event
    this.addScore('objective_completed', 5)
    this.updateQuestProgress(questId, progress)
    
    // Emit progress update
    this.eventManager?.emit('questProgressUpdated', {
      questId,
      objectiveId,
      progress,
      score: this.currentScore.totalScore
    })
  }

  // Player Progress Management
  private handlePlayerLevelUp(event: any): void {
    const { newLevel } = event
    this.addScore('level_up', newLevel * 50)
    this.progress.currentLevel = newLevel
    this.progress.experience = 0
    this.progress.experienceToNext = this.calculateExperienceToNext(newLevel)
    
    // Check for level-based achievements
    this.checkLevelAchievements(newLevel)
    
    // Emit level up event
    this.eventManager?.emit('gameProgressUpdated', {
      type: 'level_up',
      newLevel,
      score: this.currentScore.totalScore
    })
  }

  private handleWorldChanged(event: any): void {
    const { newWorld } = event
    this.addScore('world_changed', 25)
    this.progress.worldProgress.set(newWorld, 0)
    
    // Check for world exploration achievements
    this.checkWorldAchievements(newWorld)
  }

  private handlePetInteraction(event: any): void {
    const { interactionType, bondIncrease } = event
    this.addScore('pet_interaction', 5)
    this.progress.petBondProgress = Math.min(100, this.progress.petBondProgress + bondIncrease)
    
    // Check for pet bond achievements
    this.checkPetBondAchievements(this.progress.petBondProgress)
  }

  // Exploration and Collection
  private handleAreaExplored(event: any): void {
    const { areaId, explorationValue } = event
    this.addScore('area_explored', explorationValue)
    this.currentScore.explorationScore += explorationValue
    
    // Update world progress
    const currentWorld = this.gameState.getCurrentWorld()
    const currentProgress = this.progress.worldProgress.get(currentWorld) || 0
    this.progress.worldProgress.set(currentWorld, currentProgress + 1)
  }

  private handleItemCollected(event: any): void {
    const { itemId, rarity } = event
    const rarityMultiplier = this.getRarityMultiplier(rarity)
    this.addScore('item_collected', 10 * rarityMultiplier)
  }

  private handleNPCInteraction(event: any): void {
    const { npcId, interactionType } = event
    this.addScore('npc_interaction', 5)
    
    // Check for social achievements
    this.checkSocialAchievements(npcId, interactionType)
  }

  // Scoring System
  private addScore(action: string, basePoints: number): void {
    const rule = this.scoringRules.get(action)
    if (rule) {
      const finalPoints = this.calculateFinalScore(rule, basePoints)
      this.currentScore.totalScore += finalPoints
      
      // Update streak
      if (finalPoints > 0) {
        this.currentScore.streak++
        this.updateScoreMultiplier()
      }
      
      // Check for score-based achievements immediately
      this.checkScoreAchievements()
      
      // Emit score update event
      this.eventManager?.emit('scoreUpdated', {
        action,
        points: finalPoints,
        totalScore: this.currentScore.totalScore,
        streak: this.currentScore.streak,
        multiplier: this.currentScore.multiplier
      })
    }
  }

  private calculateFinalScore(rule: ScoringRule, basePoints: number): number {
    let finalPoints = basePoints * rule.multiplier
    
    // Apply current multiplier
    finalPoints *= this.currentScore.multiplier
    
    // Apply streak bonus
    if (this.currentScore.streak > 0) {
      finalPoints *= (1 + (this.currentScore.streak * 0.1))
    }
    
    return Math.floor(finalPoints)
  }

  private updateScoreMultiplier(): void {
    // Multiplier increases with streak
    this.currentScore.multiplier = 1 + (this.currentScore.streak * 0.05)
    this.currentScore.multiplier = Math.min(this.currentScore.multiplier, 3.0) // Cap at 3x
  }

  // Achievement System
  private checkAchievements(): void {
    // Check for score-based achievements
    this.checkScoreAchievements()
    
    // Check for quest-based achievements
    this.checkQuestAchievements()
    
    // Check for exploration achievements
    this.checkExplorationAchievements()
  }

  private checkScoreAchievements(): void {
    const scoreThresholds = [100, 500, 1000, 2500, 5000, 10000]
    
    scoreThresholds.forEach(threshold => {
      if (this.currentScore.totalScore >= threshold && 
          !this.achievements.has(`score_${threshold}`)) {
        this.unlockAchievement(`score_${threshold}`, {
          id: `score_${threshold}`,
          name: `Score Master ${threshold}`,
          description: `Reach ${threshold} total points`,
          icon: '🏆',
          points: threshold / 10,
          category: 'special'
        })
      }
    })
  }

  private checkQuestAchievements(): void {
    // Count completed quests from our progress tracking
    const completedQuestsCount = Array.from(this.progress.questProgress.values())
      .filter(progress => progress === 100).length
    
    // First quest completion
    if (completedQuestsCount === 1 && !this.achievements.has('first_quest')) {
      this.unlockAchievement('first_quest', {
        id: 'first_quest',
        name: 'First Steps',
        description: 'Complete your first quest',
        icon: '🎯',
        points: 50,
        category: 'quest'
      })
    }
    
    // Quest master
    if (completedQuestsCount >= 10 && !this.achievements.has('quest_master')) {
      this.unlockAchievement('quest_master', {
        id: 'quest_master',
        name: 'Quest Master',
        description: 'Complete 10 quests',
        icon: '👑',
        points: 200,
        category: 'quest'
      })
    }
  }

  private checkExplorationAchievements(): void {
    const worldProgress = Array.from(this.progress.worldProgress.values())
    const totalProgress = worldProgress.reduce((sum, progress) => sum + progress, 0)
    
    if (totalProgress >= 50 && !this.achievements.has('explorer')) {
      this.unlockAchievement('explorer', {
        id: 'explorer',
        name: 'Explorer',
        description: 'Explore 50 areas',
        icon: '🗺️',
        points: 100,
        category: 'exploration'
      })
    }
  }

  private checkLevelAchievements(level: number): void {
    if (level >= 5 && !this.achievements.has('level_5')) {
      this.unlockAchievement('level_5', {
        id: 'level_5',
        name: 'Rising Star',
        description: 'Reach level 5',
        icon: '⭐',
        points: 75,
        category: 'special'
      })
    }
    
    if (level >= 10 && !this.achievements.has('level_10')) {
      this.unlockAchievement('level_10', {
        id: 'level_10',
        name: 'Veteran',
        description: 'Reach level 10',
        icon: '🌟',
        points: 150,
        category: 'special'
      })
    }
  }

  private checkWorldAchievements(worldId: string): void {
    if (worldId === 'crystal_caverns' && !this.achievements.has('crystal_explorer')) {
      this.unlockAchievement('crystal_explorer', {
        id: 'crystal_explorer',
        name: 'Crystal Explorer',
        description: 'Unlock the Crystal Caverns',
        icon: '💎',
        points: 100,
        category: 'exploration'
      })
    }
  }

  private checkPetBondAchievements(bondLevel: number): void {
    if (bondLevel >= 50 && !this.achievements.has('pet_friend')) {
      this.unlockAchievement('pet_friend', {
        id: 'pet_friend',
        name: 'Pet Friend',
        description: 'Reach 50% pet bond',
        icon: '🐾',
        points: 75,
        category: 'pet'
      })
    }
  }

  private checkSocialAchievements(npcId: string, interactionType: string): void {
    // Track NPC interactions for social achievements
    if (!this.achievements.has('social_butterfly')) {
      // This would need to track interaction counts
      // For now, just a placeholder
    }
  }

  private unlockAchievement(id: string, achievement: Achievement): void {
    achievement.isUnlocked = true
    achievement.unlockedAt = Date.now()
    this.achievements.set(id, achievement)
    
    // Add achievement points to score
    this.currentScore.achievementScore += achievement.points
    this.currentScore.totalScore += achievement.points
    
    // Emit achievement unlocked event
    this.eventManager?.emit('achievementUnlocked', {
      achievementId: id,
      achievement,
      totalScore: this.currentScore.totalScore
    })
    
    console.log(`Achievement unlocked: ${achievement.name}`)
  }

  // Progress Management
  private updateGameProgress(deltaTime: number): void {
    // Update experience
    if (this.progress.experience < this.progress.experienceToNext) {
      this.progress.experience += deltaTime * 0.001 // Convert to seconds
    }
    
    // Check for level up
    if (this.progress.experience >= this.progress.experienceToNext) {
      this.progress.currentLevel++
      this.progress.experience = 0
      this.progress.experienceToNext = this.calculateExperienceToNext(this.progress.currentLevel)
      
      // Emit level up event
      this.eventManager?.emit('playerLevelUp', {
        newLevel: this.progress.currentLevel,
        score: this.currentScore.totalScore
      })
    }
  }

  private updateQuestProgress(questId: string, progress: number): void {
    this.progress.questProgress.set(questId, progress)
    
    // If this is a quest completion, update the final progress
    if (progress === 100) {
      this.progress.questProgress.set(questId, 100)
    }
  }

  private updateScoring(): void {
    // Update score breakdown
    this.currentScore.questScore = this.calculateQuestScoreTotal()
    this.currentScore.explorationScore = this.calculateExplorationScore()
    this.currentScore.petBondScore = this.calculatePetBondScore()
    this.currentScore.achievementScore = this.calculateAchievementScore()
  }

  // Utility Methods
  private calculateQuestScore(quest: any): number {
    let baseScore = 100
    if (quest.type === 'main') baseScore *= 1.5
    if (quest.type === 'event') baseScore *= 2.0
    return Math.floor(baseScore)
  }

  private calculateQuestScoreTotal(): number {
    // Count completed quests and calculate total score
    const completedQuestsCount = Array.from(this.progress.questProgress.values())
      .filter(progress => progress === 100).length
    return completedQuestsCount * 100 // Base score per quest
  }

  private calculateExplorationScore(): number {
    const worldProgress = Array.from(this.progress.worldProgress.values())
    return worldProgress.reduce((total, progress) => total + progress, 0) * 2
  }

  private calculatePetBondScore(): number {
    return this.progress.petBondProgress * 2
  }

  private calculateAchievementScore(): number {
    return Array.from(this.achievements.values())
      .filter(achievement => achievement.isUnlocked)
      .reduce((total, achievement) => total + achievement.points, 0)
  }

  private calculateExperienceToNext(level: number): number {
    return level * 100
  }

  private getRarityMultiplier(rarity: string): number {
    const multipliers = {
      common: 1,
      uncommon: 1.5,
      rare: 2.0,
      epic: 3.0,
      legendary: 5.0
    }
    return multipliers[rarity as keyof typeof multipliers] || 1
  }

  // Data Management
  private loadGameProgress(): void {
    try {
      const savedProgress = localStorage.getItem('game_progress')
      if (savedProgress) {
        const data = JSON.parse(savedProgress)
        this.currentScore = { ...this.currentScore, ...data.score }
        this.progress = { ...this.progress, ...data.progress }
        
        // Restore achievements
        if (data.achievements) {
          data.achievements.forEach((achievement: Achievement) => {
            this.achievements.set(achievement.id, achievement)
          })
        }
      }
    } catch (error) {
      console.warn('Failed to load game progress:', error)
    }
  }

  private saveGameProgress(): void {
    try {
      const saveData = {
        score: this.currentScore,
        progress: this.progress,
        achievements: Array.from(this.achievements.values())
      }
      localStorage.setItem('game_progress', JSON.stringify(saveData))
    } catch (error) {
      console.warn('Failed to save game progress:', error)
    }
  }

  // Public API
  public getCurrentScore(): GameScore {
    return { ...this.currentScore }
  }

  public getProgress(): GameProgress {
    return { ...this.progress }
  }

  public getAchievements(): Achievement[] {
    return Array.from(this.achievements.values())
  }

  public getUnlockedAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => a.isUnlocked)
  }

  public getScoringRules(): ScoringRule[] {
    return Array.from(this.scoringRules.values())
  }

  public resetProgress(): void {
    this.currentScore = this.createDefaultScore()
    this.progress = this.createDefaultProgress()
    this.achievements.clear()
    this.initializeAchievements()
    this.saveGameProgress()
    
    this.eventManager?.emit('gameProgressReset', {
      timestamp: Date.now()
    })
  }

  // Private initialization methods
  private createDefaultScore(): GameScore {
    return {
      totalScore: 0,
      questScore: 0,
      explorationScore: 0,
      petBondScore: 0,
      achievementScore: 0,
      multiplier: 1.0,
      streak: 0
    }
  }

  private createDefaultProgress(): GameProgress {
    return {
      currentLevel: 1,
      experience: 0,
      experienceToNext: 100,
      worldProgress: new Map(),
      questProgress: new Map(),
      petBondProgress: 0
    }
  }

  private initializeAchievements(): void {
    // Basic achievements will be added here
    // More complex ones are added dynamically
  }

  private initializeScoringRules(): void {
    const rules: ScoringRule[] = [
      {
        id: 'quest_started',
        action: 'quest_started',
        basePoints: 10,
        multiplier: 1.0,
        conditions: []
      },
      {
        id: 'quest_completed',
        action: 'quest_completed',
        basePoints: 100,
        multiplier: 1.0,
        conditions: []
      },
      {
        id: 'objective_completed',
        action: 'objective_completed',
        basePoints: 5,
        multiplier: 1.0,
        conditions: []
      },
      {
        id: 'level_up',
        action: 'level_up',
        basePoints: 50,
        multiplier: 1.0,
        conditions: []
      },
      {
        id: 'world_changed',
        action: 'world_changed',
        basePoints: 25,
        multiplier: 1.0,
        conditions: []
      },
      {
        id: 'pet_interaction',
        action: 'pet_interaction',
        basePoints: 5,
        multiplier: 1.0,
        conditions: []
      },
      {
        id: 'area_explored',
        action: 'area_explored',
        basePoints: 10,
        multiplier: 1.0,
        conditions: []
      },
      {
        id: 'item_collected',
        action: 'item_collected',
        basePoints: 10,
        multiplier: 1.0,
        conditions: []
      },
      {
        id: 'npc_interaction',
        action: 'npc_interaction',
        basePoints: 5,
        multiplier: 1.0,
        conditions: []
      }
    ]

    rules.forEach(rule => {
      this.scoringRules.set(rule.id, rule)
    })
  }

  public destroy(): void {
    this.saveGameProgress()
    super.destroy()
  }
}

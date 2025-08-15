import { EventManager } from '../core/EventManager'
import { QuestSystem } from './QuestSystem'
import { AISystem } from '../core/systems/AISystem'

// Difficulty scaling factors and thresholds
export interface DifficultyFactors {
  playerSkill: number // 0-1 scale based on quest completion rate
  petIntelligence: number // 0-1 scale based on pet AI performance
  timeEfficiency: number // 0-1 scale based on quest completion speed
  failureRate: number // 0-1 scale based on quest failures
  learningCurve: number // 0-1 scale based on improvement over time
  worldComplexity: number // 0-1 scale based on world difficulty
}

export interface DifficultyAdjustment {
  questId: string
  originalDifficulty: number
  adjustedDifficulty: number
  factors: DifficultyFactors
  confidence: number // 0-1 scale indicating AI confidence in adjustment
  timestamp: number
  reasoning: string[]
}

export interface PlayerPerformanceMetrics {
  questCompletionRate: number
  averageCompletionTime: number
  failureRate: number
  skillImprovement: number
  petAssistanceEfficiency: number
  lastUpdated: number
}

export interface AdaptiveDifficultyConfig {
  minDifficulty: number
  maxDifficulty: number
  adjustmentThreshold: number
  learningRate: number
  petIntelligenceWeight: number
  playerSkillWeight: number
  timeEfficiencyWeight: number
  failureRateWeight: number
  worldComplexityWeight: number
}

export class DifficultyScalingSystem {
  private static instance: DifficultyScalingSystem
  private eventManager: EventManager
  private questSystem: QuestSystem
  private aiSystem: AISystem
  
  // Performance tracking
  private playerMetrics: Map<string, PlayerPerformanceMetrics> = new Map()
  private difficultyAdjustments: Map<string, DifficultyAdjustment[]> = new Map()
  private adaptiveConfig: AdaptiveDifficultyConfig
  
  // AI learning data
  private difficultyPredictionModel: Map<string, number> = new Map()
  private historicalAdjustments: DifficultyAdjustment[] = []
  
  // Configuration
  private readonly DEFAULT_CONFIG: AdaptiveDifficultyConfig = {
    minDifficulty: 1,
    maxDifficulty: 10,
    adjustmentThreshold: 0.1,
    learningRate: 0.05,
    petIntelligenceWeight: 0.25,
    playerSkillWeight: 0.3,
    timeEfficiencyWeight: 0.2,
    failureRateWeight: 0.15,
    worldComplexityWeight: 0.1
  }

  private constructor(eventManager: EventManager) {
    this.eventManager = eventManager
    this.questSystem = QuestSystem.getInstance()
    this.adaptiveConfig = { ...this.DEFAULT_CONFIG }
    
    this.setupEventListeners()
    this.initializeMetrics()
  }

  public static getInstance(eventManager: EventManager): DifficultyScalingSystem {
    if (!DifficultyScalingSystem.instance) {
      DifficultyScalingSystem.instance = new DifficultyScalingSystem(eventManager)
    }
    return DifficultyScalingSystem.instance
  }

  private setupEventListeners(): void {
    // Listen for quest events to update metrics
    this.eventManager.on('questStarted', this.onQuestStarted.bind(this))
    this.eventManager.on('questCompleted', this.onQuestCompleted.bind(this))
    this.eventManager.on('questFailed', this.onQuestFailed.bind(this))
    this.eventManager.on('objectiveCompleted', this.onObjectiveCompleted.bind(this))
    
    // Listen for pet AI events
    this.eventManager.on('petBehaviorChanged', this.onPetBehaviorChanged.bind(this))
    this.eventManager.on('petSkillUsed', this.onPetSkillUsed.bind(this))
    
    // Listen for player progression events
    this.eventManager.on('playerLevelUp', this.onPlayerLevelUp.bind(this))
  }

  private initializeMetrics(): void {
    // Initialize metrics for existing players
    const activeQuests = this.questSystem.getActiveQuests()
    activeQuests.forEach(quest => {
      const playerId = this.getPlayerIdFromQuest(quest.id)
      if (playerId && !this.playerMetrics.has(playerId)) {
        this.initializePlayerMetrics(playerId)
      }
    })
  }

  private initializePlayerMetrics(playerId: string): void {
    this.playerMetrics.set(playerId, {
      questCompletionRate: 0.5, // Default to 50%
      averageCompletionTime: 300000, // 5 minutes default
      failureRate: 0.1, // 10% default
      skillImprovement: 0,
      petAssistanceEfficiency: 0.5,
      lastUpdated: Date.now()
    })
  }

  // Main difficulty adjustment method
  public calculateAdjustedDifficulty(questId: string, playerId: string): number {
    const quest = this.questSystem.getQuest(questId)
    if (!quest) return 1

    const originalDifficulty = quest.level
    const playerMetrics = this.playerMetrics.get(playerId) || this.initializePlayerMetrics(playerId)
    
    // Calculate difficulty factors
    const factors = this.calculateDifficultyFactors(questId, playerId, playerMetrics)
    
    // Apply AI-based adjustment
    const adjustedDifficulty = this.applyDifficultyAdjustment(originalDifficulty, factors)
    
    // Store adjustment for learning
    this.storeDifficultyAdjustment(questId, originalDifficulty, adjustedDifficulty, factors)
    
    // Emit event for other systems
    this.eventManager.emit('difficultyAdjusted', {
      questId,
      originalDifficulty,
      adjustedDifficulty,
      factors,
      playerId
    })
    
    return Math.max(this.adaptiveConfig.minDifficulty, 
                   Math.min(this.adaptiveConfig.maxDifficulty, adjustedDifficulty))
  }

  private calculateDifficultyFactors(questId: string, playerId: string, metrics: PlayerPerformanceMetrics): DifficultyFactors {
    const quest = this.questSystem.getQuest(questId)!
    const world = this.getWorldById(quest.worldId)
    
    // Calculate player skill based on completion rate and improvement
    const playerSkill = Math.min(1, Math.max(0, 
      metrics.questCompletionRate * 0.7 + metrics.skillImprovement * 0.3
    ))
    
    // Calculate pet intelligence based on player metrics
    const petIntelligence = this.calculatePetIntelligence(playerId)
    
    // Calculate time efficiency (lower time = higher efficiency)
    const timeEfficiency = Math.max(0, 1 - (metrics.averageCompletionTime / 600000)) // 10 minutes baseline
    
    // Calculate failure rate (lower failures = higher efficiency)
    const failureRate = Math.max(0, 1 - metrics.failureRate)
    
    // Calculate learning curve based on skill improvement over time
    const learningCurve = Math.min(1, Math.max(0, metrics.skillImprovement))
    
    // Calculate world complexity based on world requirements and unlocked status
    const worldComplexity = world ? Math.min(1, world.requiredLevel / 20) : 0.5
    
    return {
      playerSkill,
      petIntelligence,
      timeEfficiency,
      failureRate,
      learningCurve,
      worldComplexity
    }
  }

  private calculatePetIntelligence(playerId: string): number {
    // Get pet behavior data from AI system
    const petBehaviors = this.getPetBehaviors(playerId) || []
    const petSkills = this.getPetSkills(playerId) || []
    
    if (petBehaviors.length === 0 && petSkills.length === 0) {
      return 0.5 // Default pet intelligence
    }
    
    // Calculate intelligence based on behavior complexity and skill usage
    const behaviorScore = petBehaviors.reduce((score, behavior) => {
      return score + (behavior.priority * 0.1) + (behavior.conditions.length * 0.05)
    }, 0) / Math.max(petBehaviors.length, 1)
    
    const skillScore = petSkills.reduce((score, skill) => {
      return score + (skill.level / 10) + (skill.cooldown > 0 ? 0.1 : 0)
    }, 0) / Math.max(petSkills.length, 1)
    
    return Math.min(1, (behaviorScore + skillScore) / 2)
  }

  private applyDifficultyAdjustment(originalDifficulty: number, factors: DifficultyFactors): number {
    // Calculate weighted adjustment factor
    const adjustmentFactor = 
      factors.playerSkill * this.adaptiveConfig.playerSkillWeight +
      factors.petIntelligence * this.adaptiveConfig.petIntelligenceWeight +
      factors.timeEfficiency * this.adaptiveConfig.timeEfficiencyWeight +
      factors.failureRate * this.adaptiveConfig.failureRateWeight +
      factors.worldComplexity * this.adaptiveConfig.worldComplexityWeight
    
    // Apply adjustment with learning rate
    const adjustment = (adjustmentFactor - 0.5) * this.adaptiveConfig.learningRate
    
    // Calculate new difficulty
    let newDifficulty = originalDifficulty + adjustment
    
    // Apply confidence-based smoothing
    const confidence = this.calculateAdjustmentConfidence(factors)
    const smoothedDifficulty = originalDifficulty + (adjustment * confidence)
    
    return Math.round(smoothedDifficulty * 10) / 10 // Round to 1 decimal place
  }

  private calculateAdjustmentConfidence(factors: DifficultyFactors): number {
    // Higher confidence when factors are more extreme (closer to 0 or 1)
    const factorConfidences = [
      Math.abs(factors.playerSkill - 0.5) * 2,
      Math.abs(factors.petIntelligence - 0.5) * 2,
      Math.abs(factors.timeEfficiency - 0.5) * 2,
      Math.abs(factors.failureRate - 0.5) * 2,
      Math.abs(factors.learningCurve - 0.5) * 2,
      Math.abs(factors.worldComplexity - 0.5) * 2
    ]
    
    return factorConfidences.reduce((sum, conf) => sum + conf, 0) / factorConfidences.length
  }

  private storeDifficultyAdjustment(
    questId: string, 
    originalDifficulty: number, 
    adjustedDifficulty: number, 
    factors: DifficultyFactors
  ): void {
    const adjustment: DifficultyAdjustment = {
      questId,
      originalDifficulty,
      adjustedDifficulty,
      factors,
      confidence: this.calculateAdjustmentConfidence(factors),
      timestamp: Date.now(),
      reasoning: this.generateAdjustmentReasoning(factors, originalDifficulty, adjustedDifficulty)
    }
    
    if (!this.difficultyAdjustments.has(questId)) {
      this.difficultyAdjustments.set(questId, [])
    }
    
    this.difficultyAdjustments.get(questId)!.push(adjustment)
    this.historicalAdjustments.push(adjustment)
    
    // Keep only recent adjustments for memory efficiency
    if (this.historicalAdjustments.length > 1000) {
      this.historicalAdjustments = this.historicalAdjustments.slice(-500)
    }
  }

  private generateAdjustmentReasoning(factors: DifficultyFactors, original: number, adjusted: number): string[] {
    const reasons: string[] = []
    
    if (factors.playerSkill > 0.7) {
      reasons.push('Player showing high skill level')
    } else if (factors.playerSkill < 0.3) {
      reasons.push('Player may need more support')
    }
    
    if (factors.petIntelligence > 0.7) {
      reasons.push('Pet AI performing well')
    } else if (factors.petIntelligence < 0.3) {
      reasons.push('Pet AI needs improvement')
    }
    
    if (factors.timeEfficiency > 0.7) {
      reasons.push('Player completing quests efficiently')
    } else if (factors.timeEfficiency < 0.3) {
      reasons.push('Player taking longer than expected')
    }
    
    if (factors.failureRate > 0.7) {
      reasons.push('Low failure rate indicates good performance')
    } else if (factors.failureRate < 0.3) {
      reasons.push('High failure rate suggests difficulty adjustment needed')
    }
    
    if (Math.abs(adjusted - original) > this.adaptiveConfig.adjustmentThreshold) {
      reasons.push(`Difficulty adjusted from ${original} to ${adjusted}`)
    } else {
      reasons.push('Difficulty within acceptable range')
    }
    
    return reasons
  }

  // Event handlers for updating metrics
  private onQuestStarted(event: any): void {
    const { questId, playerId } = event
    if (!this.playerMetrics.has(playerId)) {
      this.initializePlayerMetrics(playerId)
    }
  }

  private onQuestCompleted(event: any): void {
    const { questId, playerId, completionTime } = event
    this.updatePlayerMetrics(playerId, {
      success: true,
      completionTime,
      questId
    })
  }

  private onQuestFailed(event: any): void {
    const { questId, playerId, failureReason } = event
    this.updatePlayerMetrics(playerId, {
      success: false,
      failureReason,
      questId
    })
  }

  private onObjectiveCompleted(event: any): void {
    const { questId, playerId, objectiveId, completionTime } = event
    // Track objective completion for detailed metrics
    this.trackObjectiveCompletion(playerId, questId, objectiveId, completionTime)
  }

  private onPetBehaviorChanged(event: any): void {
    const { playerId, behaviorId, success } = event
    // Update pet assistance efficiency based on behavior success
    this.updatePetAssistanceMetrics(playerId, success)
  }

  private onPetSkillUsed(event: any): void {
    const { playerId, skillId, effectiveness } = event
    // Track pet skill effectiveness for intelligence calculation
    this.trackPetSkillEffectiveness(playerId, skillId, effectiveness)
  }

  private onPlayerLevelUp(event: any): void {
    const { playerId, newLevel } = event
    // Reset some metrics as player progresses
    this.handlePlayerProgression(playerId, newLevel)
  }

  private onWorldUnlocked(event: any): void {
    const { playerId, worldId } = event
    // Adjust difficulty expectations for new worlds
    this.handleWorldUnlock(playerId, worldId)
  }

  private updatePlayerMetrics(playerId: string, data: any): void {
    const metrics = this.playerMetrics.get(playerId)
    if (!metrics) return

    const now = Date.now()
    const timeSinceLastUpdate = now - metrics.lastUpdated
    
    if (data.success) {
      // Update completion rate with exponential moving average
      const alpha = 0.1
      metrics.questCompletionRate = 
        (1 - alpha) * metrics.questCompletionRate + alpha * 1
      
      // Update average completion time
      if (data.completionTime) {
        const timeWeight = Math.min(1, timeSinceLastUpdate / 300000) // 5 minutes
        metrics.averageCompletionTime = 
          (1 - timeWeight) * metrics.averageCompletionTime + 
          timeWeight * data.completionTime
      }
      
      // Update failure rate
      metrics.failureRate = Math.max(0, metrics.failureRate * 0.95)
      
      // Calculate skill improvement
      const expectedTime = this.getExpectedCompletionTime(data.questId)
      if (expectedTime && data.completionTime) {
        const timeEfficiency = expectedTime / data.completionTime
        metrics.skillImprovement = Math.min(1, 
          metrics.skillImprovement + (timeEfficiency - 1) * 0.1
        )
      }
    } else {
      // Update failure rate
      const alpha = 0.1
      metrics.failureRate = 
        (1 - alpha) * metrics.failureRate + alpha * 1
      
      // Slight decrease in skill improvement on failure
      metrics.skillImprovement = Math.max(0, metrics.skillImprovement * 0.95)
    }
    
    metrics.lastUpdated = now
  }

  private trackObjectiveCompletion(playerId: string, questId: string, objectiveId: string, completionTime: number): void {
    // Track individual objective completion for detailed analysis
    // This can be used for more granular difficulty adjustments
  }

  private updatePetAssistanceMetrics(playerId: string, success: boolean): void {
    const metrics = this.playerMetrics.get(playerId)
    if (!metrics) return
    
    const alpha = 0.1
    if (success) {
      metrics.petAssistanceEfficiency = 
        (1 - alpha) * metrics.petAssistanceEfficiency + alpha * 1
    } else {
      metrics.petAssistanceEfficiency = 
        (1 - alpha) * metrics.petAssistanceEfficiency + alpha * 0
    }
  }

  private trackPetSkillEffectiveness(playerId: string, skillId: string, effectiveness: number): void {
    // Track pet skill effectiveness for AI learning
    // This data can be used to improve pet behavior patterns
  }

  private handlePlayerProgression(playerId: string, newLevel: number): void {
    const metrics = this.playerMetrics.get(playerId)
    if (!metrics) return
    
    // Reset some metrics as player progresses to new level
    metrics.skillImprovement = Math.max(0, metrics.skillImprovement * 0.8)
    metrics.petAssistanceEfficiency = Math.max(0.3, metrics.petAssistanceEfficiency * 0.9)
  }

  private handleWorldUnlock(playerId: string, worldId: string): void {
    // Adjust difficulty expectations for new worlds
    // This can trigger recalibration of difficulty factors
  }

  // Utility methods
  private getPlayerIdFromQuest(questId: string): string | null {
    // This would need to be implemented based on how player-quest relationships are stored
    // For now, return a default player ID
    return 'default_player'
  }

  private getWorldById(worldId: string): any {
    // This would need to be implemented based on world management system
    // For now, return a default world
    return { requiredLevel: 1, unlocked: true }
  }

  private getExpectedCompletionTime(questId: string): number | null {
    // This would calculate expected completion time based on quest difficulty
    // For now, return a default value
    return 300000 // 5 minutes
  }

  // Public API methods
  public getPlayerMetrics(playerId: string): PlayerPerformanceMetrics | undefined {
    return this.playerMetrics.get(playerId)
  }

  public getDifficultyAdjustments(questId: string): DifficultyAdjustment[] {
    return this.difficultyAdjustments.get(questId) || []
  }

  public getHistoricalAdjustments(): DifficultyAdjustment[] {
    return [...this.historicalAdjustments]
  }

  public updateConfiguration(newConfig: Partial<AdaptiveDifficultyConfig>): void {
    this.adaptiveConfig = { ...this.adaptiveConfig, ...newConfig }
  }

  public resetPlayerMetrics(playerId: string): void {
    this.playerMetrics.delete(playerId)
    this.initializePlayerMetrics(playerId)
  }

  public getSystemStats(): any {
    return {
      totalPlayers: this.playerMetrics.size,
      totalAdjustments: this.historicalAdjustments.length,
      averageConfidence: this.historicalAdjustments.reduce((sum, adj) => sum + adj.confidence, 0) / Math.max(this.historicalAdjustments.length, 1),
      configuration: { ...this.adaptiveConfig }
    }
  }

  // Serialization methods
  public toJSON(): any {
    return {
      playerMetrics: Object.fromEntries(this.playerMetrics),
      difficultyAdjustments: Object.fromEntries(this.difficultyAdjustments),
      historicalAdjustments: this.historicalAdjustments,
      adaptiveConfig: this.adaptiveConfig
    }
  }

  public static fromJSON(data: any, eventManager: EventManager): DifficultyScalingSystem {
    const system = DifficultyScalingSystem.getInstance(eventManager)
    
    // Restore player metrics
    if (data.playerMetrics) {
      Object.entries(data.playerMetrics).forEach(([playerId, metrics]: [string, any]) => {
        system.playerMetrics.set(playerId, metrics)
      })
    }
    
    // Restore difficulty adjustments
    if (data.difficultyAdjustments) {
      Object.entries(data.difficultyAdjustments).forEach(([questId, adjustments]: [string, any]) => {
        system.difficultyAdjustments.set(questId, adjustments)
      })
    }
    
    // Restore historical adjustments
    if (data.historicalAdjustments) {
      system.historicalAdjustments = data.historicalAdjustments
    }
    
    // Restore configuration
    if (data.adaptiveConfig) {
      system.adaptiveConfig = { ...system.adaptiveConfig, ...data.adaptiveConfig }
    }
    
    return system
  }

  private getPetBehaviors(playerId: string): any[] {
    // Mock implementation - would integrate with AI system
    return [
      { priority: 1, name: 'explore' },
      { priority: 2, name: 'assist' }
    ]
  }

  private getPetSkills(playerId: string): any[] {
    // Mock implementation - would integrate with AI system
    return [
      { level: 1, name: 'sensing' },
      { level: 2, name: 'navigation' }
    ]
  }
}

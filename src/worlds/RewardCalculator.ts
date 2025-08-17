import { EventManager } from '../core/EventManager'
import { QuestManager } from './QuestManager'
import { QuestData, QuestObjective, QuestRewards, ObjectiveReward, SpecialReward } from './QuestManager'
import { CheckpointSystem } from './CheckpointSystem'

export interface PlayerRewards {
  experience: number
  coins: number
  orbs: number
  items: string[]
  skills: string[]
  petBond: number
  unlockables: string[]
  reputation: number
  specialRewards: SpecialReward[]
  totalValue: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

export interface RewardCalculation {
  baseRewards: PlayerRewards
  multipliers: RewardMultipliers
  finalRewards: PlayerRewards
  bonusRewards: BonusReward[]
  totalBonus: number
}

export interface RewardMultipliers {
  difficulty: number
  timeBonus: number
  streakBonus: number
  petBondBonus: number
  skillBonus: number
  eventBonus: number
  totalMultiplier: number
}

export interface BonusReward {
  type: 'speed' | 'perfection' | 'streak' | 'skill' | 'event' | 'first_time' | 'daily' | 'weekly'
  description: string
  value: number
  multiplier: number
}

export interface RewardCalculatorConfig {
  enableDifficultyMultipliers: boolean
  enableTimeBonuses: boolean
  enableStreakBonuses: boolean
  enablePetBondBonuses: boolean
  enableSkillBonuses: boolean
  enableEventBonuses: boolean
  maxMultiplier: number
  orbConversionRate: number
  reputationScaling: boolean
  skillProgressionBonus: boolean
}

export interface RewardEvent {
  questId: string
  objectiveId?: string
  playerId: string
  rewards: PlayerRewards
  calculation: RewardCalculation
  timestamp: number
}

export class RewardCalculator {
  private static instance: RewardCalculator
  private eventManager: EventManager
  private questManager: QuestManager

  private playerRewards: Map<string, PlayerRewards[]> = new Map()
  private rewardHistory: Map<string, RewardEvent[]> = new Map()
  private playerStats: Map<string, PlayerRewardStats> = new Map()
  private bonusCache: Map<string, BonusReward[]> = new Map()

  private config: RewardCalculatorConfig
  private isInitialized: boolean = false

  private constructor() {
    this.eventManager = EventManager.getInstance()
    this.questManager = QuestManager.getInstance()
    this.config = this.getDefaultConfig()
    this.setupEventListeners()
  }

  public static getInstance(): RewardCalculator {
    if (!RewardCalculator.instance) {
      RewardCalculator.instance = new RewardCalculator()
    }
    return RewardCalculator.instance
  }

  /**
   * Initializes the RewardCalculator
   */
  public initialize(): void {
    if (this.isInitialized) return
    this.isInitialized = true
  }

  /**
   * Calculates rewards for completing a quest
   */
  public calculateQuestRewards(
    questId: string,
    playerId: string,
    playerData: any,
    completionTime?: number,
    metadata?: {
      difficulty?: 'easy' | 'medium' | 'hard' | 'expert'
      timeSpent?: number
      attempts?: number
      perfectScore?: boolean
      firstTime?: boolean
      dailyStreak?: number
      weeklyStreak?: number
    }
  ): RewardCalculation {
    const quest = this.questManager.getQuest(questId)
    if (!quest) {
      throw new Error(`Quest '${questId}' not found`)
    }

    // Calculate base rewards from quest
    const baseRewards = this.calculateBaseQuestRewards(quest, playerData)

    // Calculate multipliers
    const multipliers = this.calculateRewardMultipliers(quest, playerData, metadata)

    // Calculate final rewards with multipliers
    const finalRewards = this.applyMultipliers(baseRewards, multipliers)

    // Calculate bonus rewards
    const bonusRewards = this.calculateBonusRewards(quest, playerData, metadata)
    const totalBonus = this.calculateTotalBonus(bonusRewards)

    // Add bonus rewards to final rewards
    this.addBonusRewards(finalRewards, bonusRewards)

    const calculation: RewardCalculation = {
      baseRewards,
      multipliers,
      finalRewards,
      bonusRewards,
      totalBonus
    }

    // Store reward calculation
    this.storeRewardCalculation(questId, playerId, calculation)

    // Emit reward calculated event
    this.eventManager.emit('rewardsCalculated', {
      questId,
      playerId,
      rewards: finalRewards,
      calculation,
      timestamp: Date.now()
    })

    return calculation
  }

  /**
   * Calculates rewards for completing an objective
   */
  public calculateObjectiveRewards(
    objectiveId: string,
    questId: string,
    playerId: string,
    playerData: any,
    metadata?: {
      timeSpent?: number
      attempts?: number
      perfectScore?: boolean
      location?: { x: number; y: number; z?: number }
    }
  ): RewardCalculation {
    const quest = this.questManager.getQuest(questId)
    if (!quest) {
      throw new Error(`Quest '${questId}' not found`)
    }

    const objective = quest.objectives.find(obj => obj.id === objectiveId)
    if (!objective) {
      throw new Error(`Objective '${objectiveId}' not found in quest '${questId}'`)
    }

    // Calculate base rewards from objective
    const baseRewards = this.calculateBaseObjectiveRewards(objective, playerData)

    // Calculate multipliers (simpler for objectives)
    const multipliers = this.calculateObjectiveMultipliers(objective, playerData, metadata)

    // Calculate final rewards with multipliers
    const finalRewards = this.applyMultipliers(baseRewards, multipliers)

    // Calculate bonus rewards
    const bonusRewards = this.calculateObjectiveBonusRewards(objective, playerData, metadata)
    const totalBonus = this.calculateTotalBonus(bonusRewards)

    // Add bonus rewards to final rewards
    this.addBonusRewards(finalRewards, bonusRewards)

    const calculation: RewardCalculation = {
      baseRewards,
      multipliers,
      finalRewards,
      bonusRewards,
      totalBonus
    }

    // Store reward calculation
    this.storeRewardCalculation(questId, playerId, calculation, objectiveId)

    // Emit objective reward calculated event
    this.eventManager.emit('objectiveRewardsCalculated', {
      objectiveId,
      questId,
      playerId,
      rewards: finalRewards,
      calculation,
      timestamp: Date.now()
    })

    return calculation
  }

  /**
   * Distributes rewards to a player
   */
  public distributeRewards(
    questId: string,
    playerId: string,
    rewards: PlayerRewards,
    objectiveId?: string
  ): boolean {
    try {
      // Store the reward distribution
      this.storeRewardDistribution(questId, playerId, rewards, objectiveId)

      // Update player statistics
      this.updatePlayerRewardStats(playerId, rewards)

      // Emit reward distributed event
      this.eventManager.emit('rewardsDistributed', {
        questId,
        objectiveId,
        playerId,
        rewards,
        timestamp: Date.now()
      })

      return true
    } catch (error) {
      console.error('Failed to distribute rewards:', error)
      return false
    }
  }

  /**
   * Gets reward history for a player
   */
  public getPlayerRewardHistory(playerId: string): RewardEvent[] {
    return this.rewardHistory.get(playerId) || []
  }

  /**
   * Gets reward statistics for a player
   */
  public getPlayerRewardStats(playerId: string): PlayerRewardStats | undefined {
    let stats = this.playerStats.get(playerId)
    if (!stats) {
      // Create default stats for new players
      stats = {
        totalExperience: 0,
        totalCoins: 0,
        totalOrbs: 0,
        totalItems: [],
        totalSkills: [],
        totalPetBond: 0,
        totalUnlockables: [],
        totalReputation: 0,
        totalSpecialRewards: [],
        totalValue: 0,
        questsCompleted: 0,
        objectivesCompleted: 0,
        averageRewardValue: 0,
        highestRewardValue: 0,
        lastRewardTimestamp: 0
      }
      this.playerStats.set(playerId, stats)
    }
    return stats
  }

  /**
   * Gets total rewards earned by a player
   */
  public getPlayerTotalRewards(playerId: string): PlayerRewards {
    const stats = this.playerStats.get(playerId)
    if (!stats) {
      return this.createEmptyRewards()
    }

    return {
      experience: stats.totalExperience,
      coins: stats.totalCoins,
      orbs: stats.totalOrbs,
      items: stats.totalItems,
      skills: stats.totalSkills,
      petBond: stats.totalPetBond,
      unlockables: stats.totalUnlockables,
      reputation: stats.totalReputation,
      specialRewards: stats.totalSpecialRewards,
      totalValue: stats.totalValue,
      rarity: this.calculateOverallRarity(stats)
    }
  }

  /**
   * Converts coins to orbs
   */
  public convertCoinsToOrbs(coins: number): number {
    return Math.floor(coins / this.config.orbConversionRate)
  }

  /**
   * Converts orbs to coins
   */
  public convertOrbsToCoins(orbs: number): number {
    return orbs * this.config.orbConversionRate
  }

  /**
   * Configures the RewardCalculator
   */
  public configure(config: Partial<RewardCalculatorConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Gets the current configuration
   */
  public getCurrentConfig(): RewardCalculatorConfig {
    return { ...this.config }
  }

  /**
   * Resets configuration to default values
   */
  public resetToDefaultConfig(): void {
    this.config = this.getDefaultConfig()
  }

  /**
   * Calculates base quest rewards
   */
  private calculateBaseQuestRewards(quest: QuestData, playerData: any): PlayerRewards {
    const rewards = quest.rewards
    const orbs = this.convertCoinsToOrbs(rewards.coins * 0.1) // 10% of coins as orbs

    return {
      experience: rewards.experience,
      coins: rewards.coins,
      orbs,
      items: [...rewards.items],
      skills: [...rewards.skills],
      petBond: rewards.petBond,
      unlockables: [...rewards.unlockables],
      reputation: rewards.reputation,
      specialRewards: [...rewards.specialRewards],
      totalValue: this.calculateTotalValue(rewards),
      rarity: this.calculateRewardRarity(rewards)
    }
  }

  /**
   * Calculates base objective rewards
   */
  private calculateBaseObjectiveRewards(objective: QuestObjective, playerData: any): PlayerRewards {
    const rewards = objective.reward
    const orbs = this.convertCoinsToOrbs(rewards.coins * 0.05) // 5% of coins as orbs

    return {
      experience: rewards.experience,
      coins: rewards.coins,
      orbs,
      items: [...rewards.items],
      skills: [...rewards.skills],
      petBond: rewards.petBond,
      unlockables: [...rewards.unlockables],
      reputation: 0, // Objectives don't give reputation
      specialRewards: [], // Objectives don't give special rewards
      totalValue: this.calculateTotalValue(rewards),
      rarity: this.calculateRewardRarity(rewards)
    }
  }

  /**
   * Calculates reward multipliers
   */
  private calculateRewardMultipliers(
    quest: QuestData,
    playerData: any,
    metadata?: any
  ): RewardMultipliers {
    let difficulty = 1.0
    let timeBonus = 1.0
    let streakBonus = 1.0
    let petBondBonus = 1.0
    let skillBonus = 1.0
    let eventBonus = 1.0

    // Difficulty multiplier
    if (this.config.enableDifficultyMultipliers) {
      difficulty = this.getDifficultyMultiplier(quest.difficulty)
    }

    // Time bonus
    if (this.config.enableTimeBonuses && metadata?.timeSpent) {
      timeBonus = this.calculateTimeBonus(metadata.timeSpent, quest.timeLimit)
    }

    // Streak bonus
    if (this.config.enableStreakBonuses && metadata?.dailyStreak) {
      streakBonus = this.calculateStreakBonus(metadata.dailyStreak, metadata.weeklyStreak)
    }

    // Pet bond bonus
    if (this.config.enablePetBondBonuses && playerData?.petBond) {
      petBondBonus = this.calculatePetBondBonus(playerData.petBond)
    }

    // Skill bonus
    if (this.config.enableSkillBonuses && playerData?.skills) {
      skillBonus = this.calculateSkillBonus(playerData.skills, quest.rewards.skills)
    }

    // Event bonus
    if (this.config.enableEventBonuses) {
      eventBonus = this.calculateEventBonus()
    }

    const totalMultiplier = Math.min(
      difficulty * timeBonus * streakBonus * petBondBonus * skillBonus * eventBonus,
      this.config.maxMultiplier
    )

    return {
      difficulty,
      timeBonus,
      streakBonus,
      petBondBonus,
      skillBonus,
      eventBonus,
      totalMultiplier
    }
  }

  /**
   * Calculates objective multipliers
   */
  private calculateObjectiveMultipliers(
    objective: QuestObjective,
    playerData: any,
    metadata?: any
  ): RewardMultipliers {
    let difficulty = 1.0
    let timeBonus = 1.0
    let streakBonus = 1.0
    let petBondBonus = 1.0
    let skillBonus = 1.0
    let eventBonus = 1.0

    // Pet bond bonus
    if (this.config.enablePetBondBonuses && playerData?.petBond) {
      petBondBonus = this.calculatePetBondBonus(playerData.petBond)
    }

    // Skill bonus
    if (this.config.enableSkillBonuses && playerData?.skills) {
      skillBonus = this.calculateSkillBonus(playerData.skills, objective.reward.skills)
    }

    // Event bonus
    if (this.config.enableEventBonuses) {
      eventBonus = this.calculateEventBonus()
    }

    const totalMultiplier = Math.min(
      difficulty * timeBonus * streakBonus * petBondBonus * skillBonus * eventBonus,
      this.config.maxMultiplier
    )

    return {
      difficulty,
      timeBonus,
      streakBonus,
      petBondBonus,
      skillBonus,
      eventBonus,
      totalMultiplier
    }
  }

  /**
   * Applies multipliers to rewards
   */
  private applyMultipliers(rewards: PlayerRewards, multipliers: RewardMultipliers): PlayerRewards {
    return {
      ...rewards,
      experience: Math.floor(rewards.experience * multipliers.totalMultiplier),
      coins: Math.floor(rewards.coins * multipliers.totalMultiplier),
      orbs: Math.floor(rewards.orbs * multipliers.totalMultiplier),
      petBond: Math.floor(rewards.petBond * multipliers.totalMultiplier),
      reputation: Math.floor(rewards.reputation * multipliers.totalMultiplier),
      totalValue: Math.floor(rewards.totalValue * multipliers.totalMultiplier)
    }
  }

  /**
   * Calculates bonus rewards
   */
  private calculateBonusRewards(
    quest: QuestData,
    playerData: any,
    metadata?: any
  ): BonusReward[] {
    const bonuses: BonusReward[] = []

    // Speed bonus
    if (metadata?.timeSpent && quest.timeLimit) {
      const speedBonus = this.calculateSpeedBonus(metadata.timeSpent, quest.timeLimit)
      if (speedBonus > 0) {
        bonuses.push({
          type: 'speed',
          description: 'Completed quickly',
          value: speedBonus,
          multiplier: 1.0
        })
      }
    }

    // Perfection bonus
    if (metadata?.perfectScore) {
      bonuses.push({
        type: 'perfection',
        description: 'Perfect completion',
        value: 50,
        multiplier: 1.2
      })
    }

    // First time bonus
    if (metadata?.firstTime) {
      bonuses.push({
        type: 'first_time',
        description: 'First time completion',
        value: 100,
        multiplier: 1.5
      })
    }

    // Streak bonuses
    if (metadata?.dailyStreak && metadata.dailyStreak > 1) {
      bonuses.push({
        type: 'streak',
        description: `Daily streak: ${metadata.dailyStreak}`,
        value: metadata.dailyStreak * 10,
        multiplier: 1.0
      })
    }

    if (metadata?.weeklyStreak && metadata.weeklyStreak > 1) {
      bonuses.push({
        type: 'streak',
        description: `Weekly streak: ${metadata.weeklyStreak}`,
        value: metadata.weeklyStreak * 25,
        multiplier: 1.0
      })
    }

    return bonuses
  }

  /**
   * Calculates objective bonus rewards
   */
  private calculateObjectiveBonusRewards(
    objective: QuestObjective,
    playerData: any,
    metadata?: any
  ): BonusReward[] {
    const bonuses: BonusReward[] = []

    // Skill bonus
    if (this.config.skillProgressionBonus && playerData?.skills) {
      const skillBonus = this.calculateSkillProgressionBonus(playerData.skills, objective.reward.skills)
      if (skillBonus > 0) {
        bonuses.push({
          type: 'skill',
          description: 'Skill progression',
          value: skillBonus,
          multiplier: 1.0
        })
      }
    }

    return bonuses
  }

  /**
   * Adds bonus rewards to final rewards
   */
  private addBonusRewards(rewards: PlayerRewards, bonusRewards: BonusReward[]): void {
    bonusRewards.forEach(bonus => {
      rewards.experience += bonus.value
      rewards.coins += Math.floor(bonus.value * 0.5)
      rewards.orbs += Math.floor(bonus.value * 0.1)
      rewards.totalValue += bonus.value
    })
  }

  /**
   * Calculates total bonus value
   */
  private calculateTotalBonus(bonusRewards: BonusReward[]): number {
    return bonusRewards.reduce((total, bonus) => total + bonus.value, 0)
  }

  /**
   * Gets difficulty multiplier
   */
  private getDifficultyMultiplier(difficulty: string): number {
    const multipliers = {
      easy: 1.0,
      medium: 1.2,
      hard: 1.5,
      expert: 2.0
    }
    return multipliers[difficulty] || 1.0
  }

  /**
   * Calculates time bonus
   */
  private calculateTimeBonus(timeSpent: number, timeLimit?: number): number {
    if (!timeLimit) return 1.0
    
    const ratio = timeSpent / timeLimit
    if (ratio <= 0.5) return 1.3  // 30% bonus for completing in half time
    if (ratio <= 0.75) return 1.1 // 10% bonus for completing in 3/4 time
    return 1.0
  }

  /**
   * Calculates streak bonus
   */
  private calculateStreakBonus(dailyStreak: number, weeklyStreak?: number): number {
    let bonus = 1.0
    
    // Daily streak bonus (max 50%)
    if (dailyStreak > 1) {
      bonus += Math.min(dailyStreak * 0.05, 0.5)
    }
    
    // Weekly streak bonus (max 30%)
    if (weeklyStreak && weeklyStreak > 1) {
      bonus += Math.min(weeklyStreak * 0.03, 0.3)
    }
    
    return bonus
  }

  /**
   * Calculates pet bond bonus
   */
  private calculatePetBondBonus(petBond: number): number {
    if (petBond >= 100) return 1.3  // 30% bonus for max bond
    if (petBond >= 75) return 1.2   // 20% bonus for high bond
    if (petBond >= 50) return 1.1   // 10% bonus for medium bond
    return 1.0
  }

  /**
   * Calculates skill bonus
   */
  private calculateSkillBonus(playerSkills: string[], questSkills: string[]): number {
    if (!this.config.skillProgressionBonus) return 1.0
    
    const matchingSkills = questSkills.filter(skill => playerSkills.includes(skill))
    if (matchingSkills.length === 0) return 1.0
    
    // 5% bonus per matching skill, max 20%
    return 1.0 + Math.min(matchingSkills.length * 0.05, 0.2)
  }

  /**
   * Calculates skill progression bonus
   */
  private calculateSkillProgressionBonus(playerSkills: string[], objectiveSkills: string[]): number {
    const matchingSkills = objectiveSkills.filter(skill => playerSkills.includes(skill))
    return matchingSkills.length * 10 // 10 points per matching skill
  }

  /**
   * Calculates speed bonus
   */
  private calculateSpeedBonus(timeSpent: number, timeLimit: number): number {
    const ratio = timeSpent / timeLimit
    if (ratio <= 0.3) return 100  // 100 bonus for completing in 30% of time
    if (ratio <= 0.5) return 50   // 50 bonus for completing in 50% of time
    if (ratio <= 0.75) return 25  // 25 bonus for completing in 75% of time
    return 0
  }

  /**
   * Calculates event bonus
   */
  private calculateEventBonus(): number {
    // Check for active events (could be expanded)
    const now = Date.now()
    const isWeekend = new Date(now).getDay() === 0 || new Date(now).getDay() === 6
    
    if (isWeekend) return 1.1 // 10% weekend bonus
    
    return 1.0
  }

  /**
   * Calculates total value of rewards
   */
  private calculateTotalValue(rewards: QuestRewards | ObjectiveReward): number {
    let total = rewards.experience + rewards.coins + rewards.petBond
    
    // Add item values (could be expanded with item rarity system)
    total += rewards.items.length * 10
    
    // Add skill values
    total += rewards.skills.length * 25
    
    // Add unlockable values
    total += rewards.unlockables.length * 50
    
    // Add special reward values if available
    if ('specialRewards' in rewards) {
      total += rewards.specialRewards.length * 100
    }
    
    if ('reputation' in rewards) {
      total += rewards.reputation
    }
    
    return total
  }

  /**
   * Calculates reward rarity
   */
  private calculateRewardRarity(rewards: QuestRewards | ObjectiveReward): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
    const totalValue = this.calculateTotalValue(rewards)
    
    if (totalValue >= 1000) return 'legendary'
    if (totalValue >= 500) return 'epic'
    if (totalValue >= 200) return 'rare'
    if (totalValue >= 100) return 'uncommon'
    return 'common'
  }

  /**
   * Calculates overall rarity for player stats
   */
  private calculateOverallRarity(stats: PlayerRewardStats): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
    const totalValue = stats.totalValue
    
    if (totalValue >= 10000) return 'legendary'
    if (totalValue >= 5000) return 'epic'
    if (totalValue >= 2000) return 'rare'
    if (totalValue >= 1000) return 'uncommon'
    return 'common'
  }

  /**
   * Creates empty rewards object
   */
  private createEmptyRewards(): PlayerRewards {
    return {
      experience: 0,
      coins: 0,
      orbs: 0,
      items: [],
      skills: [],
      petBond: 0,
      unlockables: [],
      reputation: 0,
      specialRewards: [],
      totalValue: 0,
      rarity: 'common'
    }
  }

  /**
   * Stores reward calculation
   */
  private storeRewardCalculation(
    questId: string,
    playerId: string,
    calculation: RewardCalculation,
    objectiveId?: string
  ): void {
    const event: RewardEvent = {
      questId,
      objectiveId,
      playerId,
      rewards: calculation.finalRewards,
      calculation,
      timestamp: Date.now()
    }

    if (!this.rewardHistory.has(playerId)) {
      this.rewardHistory.set(playerId, [])
    }
    this.rewardHistory.get(playerId)!.push(event)
  }

  /**
   * Stores reward distribution
   */
  private storeRewardDistribution(
    questId: string,
    playerId: string,
    rewards: PlayerRewards,
    objectiveId?: string
  ): void {
    if (!this.playerRewards.has(playerId)) {
      this.playerRewards.set(playerId, [])
    }
    this.playerRewards.get(playerId)!.push(rewards)
  }

  /**
   * Updates player reward statistics
   */
  private updatePlayerRewardStats(playerId: string, rewards: PlayerRewards): void {
    if (!this.playerStats.has(playerId)) {
      this.playerStats.set(playerId, {
        totalExperience: 0,
        totalCoins: 0,
        totalOrbs: 0,
        totalItems: [],
        totalSkills: [],
        totalPetBond: 0,
        totalUnlockables: [],
        totalReputation: 0,
        totalSpecialRewards: [],
        totalValue: 0,
        questsCompleted: 0,
        objectivesCompleted: 0,
        averageRewardValue: 0,
        highestRewardValue: 0,
        lastRewardTime: 0
      })
    }

    const stats = this.playerStats.get(playerId)!
    
    stats.totalExperience += rewards.experience
    stats.totalCoins += rewards.coins
    stats.totalOrbs += rewards.orbs
    stats.totalItems.push(...rewards.items)
    stats.totalSkills.push(...rewards.skills)
    stats.totalPetBond += rewards.petBond
    stats.totalUnlockables.push(...rewards.unlockables)
    stats.totalReputation += rewards.reputation
    stats.totalSpecialRewards.push(...rewards.specialRewards)
    stats.totalValue += rewards.totalValue
    
    if (rewards.totalValue > stats.highestRewardValue) {
      stats.highestRewardValue = rewards.totalValue
    }
    
    stats.lastRewardTime = Date.now()
    
    // Update averages
    const totalRewards = this.playerRewards.get(playerId)?.length || 0
    if (totalRewards > 0) {
      stats.averageRewardValue = stats.totalValue / totalRewards
    }
  }

  /**
   * Gets default configuration
   */
  private getDefaultConfig(): RewardCalculatorConfig {
    return {
      enableDifficultyMultipliers: true,
      enableTimeBonuses: true,
      enableStreakBonuses: true,
      enablePetBondBonuses: true,
      enableSkillBonuses: true,
      enableEventBonuses: true,
      maxMultiplier: 5.0,
      orbConversionRate: 100, // 100 coins = 1 orb
      reputationScaling: true,
      skillProgressionBonus: true
    }
  }

  /**
   * Sets up event listeners
   */
  private setupEventListeners(): void {
    // Listen for quest completion events
    this.eventManager.on('questCompleted', ({ questId, player, rewards }) => {
      // Rewards are already calculated by QuestManager, just distribute them
      if (rewards && rewards.length > 0) {
        this.distributeRewards(questId, player.id, rewards[0])
      }
    })

    // Listen for objective completion events
    this.eventManager.on('objectiveCompleted', ({ objectiveId, questId, playerId }) => {
      // Calculate and distribute objective rewards
      const quest = this.questManager.getQuest(questId)
      if (quest) {
        const objective = quest.objectives.find(obj => obj.id === objectiveId)
        if (objective) {
          const calculation = this.calculateObjectiveRewards(objectiveId, questId, playerId, {})
          this.distributeRewards(questId, playerId, calculation.finalRewards, objectiveId)
        }
      }
    })
  }

  // ===== CHECKPOINT SYSTEM INTEGRATION =====

  /**
   * Get the CheckpointSystem instance for reward data management
   */
  private getCheckpointSystem(): CheckpointSystem {
    return CheckpointSystem.getInstance()
  }

  /**
   * Save current reward calculations to a checkpoint
   */
  public saveRewardCheckpoint(playerId: string, checkpointName: string): string | null {
    try {
      const playerRewards = this.playerRewards.get(playerId) || []
      const playerStats = this.playerStats.get(playerId)
      const rewardHistory = this.rewardHistory.get(playerId) || []

      const rewardData = {
        playerRewards: playerRewards,
        playerStats: playerStats,
        rewardHistory: rewardHistory,
        totalRewards: playerRewards.length,
        totalValue: playerStats?.totalValue || 0,
        lastRewardTime: playerStats?.lastRewardTime || 0
      }

      const checkpointSystem = this.getCheckpointSystem()
      const checkpointId = checkpointSystem.createCheckpoint(
        checkpointName,
        { id: playerId, level: 1, experience: playerStats?.totalExperience || 0, coins: playerStats?.totalCoins || 0, orbs: playerStats?.totalOrbs || 0 },
        { activeQuests: [], completedQuests: [], failedQuests: [], totalQuests: 0, questChains: [], questDependencies: [] }, // Placeholder quest progress
        { totalAchievements: 0, achievements: [] }, // Placeholder achievements
        { currentWorld: 'default', currentLevel: 'default', gameTime: Date.now() } // Placeholder game state
      )

      this.eventManager.emit('rewardsCheckpointSaved', { 
        playerId, 
        checkpointId, 
        checkpointName,
        rewardCount: playerRewards.length 
      })

      return checkpointId
    } catch (error) {
      console.error('Failed to save reward checkpoint:', error)
      return null
    }
  }

  /**
   * Restore reward calculations from a checkpoint
   */
  public restoreRewardCheckpoint(playerId: string, checkpointId: string): boolean {
    try {
      const checkpointSystem = this.getCheckpointSystem()
      const checkpoint = checkpointSystem.restoreCheckpoint(checkpointId)
      
      if (!checkpoint) {
        return false
      }

      // Note: Reward data restoration would need to be implemented based on the specific structure
      // This is a placeholder for future implementation
      console.log('Reward checkpoint restored:', checkpointId)

      this.eventManager.emit('rewardsCheckpointRestored', { 
        playerId, 
        checkpointId,
        restoredRewards: 0
      })

      return true
    } catch (error) {
      console.error('Failed to restore reward checkpoint:', error)
      return false
    }
  }

  /**
   * Get all available reward checkpoints for a player
   */
  public getRewardCheckpoints(playerId: string): any[] {
    try {
      const checkpointSystem = this.getCheckpointSystem()
      return checkpointSystem.getAllCheckpoints()
    } catch (error) {
      console.error('Failed to get reward checkpoints:', error)
      return []
    }
  }

  /**
   * Auto-save reward progress (called periodically)
   */
  public autoSaveRewardProgress(playerId: string): void {
    const playerRewards = this.playerRewards.get(playerId) || []
    
    if (playerRewards.length > 0) {
      const checkpointName = `Reward Auto-save ${new Date().toLocaleTimeString()}`
      this.saveRewardCheckpoint(playerId, checkpointName)
    }
  }
}

export interface PlayerRewardStats {
  totalExperience: number
  totalCoins: number
  totalOrbs: number
  totalItems: string[]
  totalSkills: string[]
  totalPetBond: number
  totalUnlockables: string[]
  totalReputation: number
  totalSpecialRewards: SpecialReward[]
  totalValue: number
  questsCompleted: number
  objectivesCompleted: number
  averageRewardValue: number
  highestRewardValue: number
  lastRewardTime: number
}


import { EventManager } from '../core/EventManager'
import { QuestManager } from './QuestManager'
import { QuestData, QuestObjective, QuestStatus } from './QuestManager'

export interface ObjectiveProgress {
  objectiveId: string
  questId: string
  current: number
  target: number
  percentage: number
  isCompleted: boolean
  timeStarted: number
  timeCompleted?: number
  timeSpent: number
  attempts: number
  lastUpdate: number
  milestones: ObjectiveMilestone[]
  hints: string[]
  location?: { x: number; y: number; z?: number }
}

export interface ObjectiveMilestone {
  id: string
  percentage: number
  isReached: boolean
  timeReached?: number
  reward?: {
    experience: number
    coins: number
    items: string[]
    skills: string[]
    petBond: number
  }
}

export interface ObjectiveTrackerConfig {
  enableMilestones: boolean
  enableHints: boolean
  enableLocationTracking: boolean
  enableProgressHistory: boolean
  maxHistoryEntries: number
  updateInterval: number
  autoSaveInterval: number
}

export interface ObjectiveUpdateEvent {
  objectiveId: string
  questId: string
  playerId: string
  oldProgress: number
  newProgress: number
  percentage: number
  isCompleted: boolean
  timestamp: number
}

export interface ObjectiveMilestoneEvent {
  objectiveId: string
  questId: string
  playerId: string
  milestoneId: string
  percentage: number
  reward?: any
  timestamp: number
}

export interface ObjectiveHintEvent {
  objectiveId: string
  questId: string
  playerId: string
  hintIndex: number
  hint: string
  timestamp: number
}

export class ObjectiveTracker {
  private static instance: ObjectiveTracker
  private eventManager: EventManager
  private questManager: QuestManager
  
  private objectiveProgress: Map<string, ObjectiveProgress> = new Map()
  private playerObjectives: Map<string, Set<string>> = new Map()
  private progressHistory: Map<string, ObjectiveProgress[]> = new Map()
  private milestoneCache: Map<string, ObjectiveMilestone[]> = new Map()
  
  private config: ObjectiveTrackerConfig
  private updateTimer?: NodeJS.Timeout
  private saveTimer?: NodeJS.Timeout
  private isInitialized: boolean = false

  private constructor() {
    this.eventManager = EventManager.getInstance()
    this.questManager = QuestManager.getInstance()
    this.config = this.getDefaultConfig()
    this.setupEventListeners()
  }

  public static getInstance(): ObjectiveTracker {
    if (!ObjectiveTracker.instance) {
      ObjectiveTracker.instance = new ObjectiveTracker()
    }
    return ObjectiveTracker.instance
  }

  /**
   * Initializes the ObjectiveTracker
   */
  public initialize(): void {
    if (this.isInitialized) return
    
    this.startUpdateTimer()
    this.startSaveTimer()
    this.isInitialized = true
    
    this.eventManager.emit('objectiveTrackerInitialized', {
      timestamp: Date.now(),
      config: this.config
    })
  }

  /**
   * Starts tracking an objective for a player
   */
  public startTrackingObjective(
    objectiveId: string, 
    questId: string, 
    playerId: string, 
    objective: QuestObjective
  ): void {
    const progressKey = this.getProgressKey(objectiveId, questId, playerId)
    
    if (this.objectiveProgress.has(progressKey)) {
      return // Already tracking
    }

    const progress: ObjectiveProgress = {
      objectiveId,
      questId,
      current: 0,
      target: objective.count,
      percentage: 0,
      isCompleted: false,
      timeStarted: Date.now(),
      timeSpent: 0,
      attempts: 0,
      lastUpdate: Date.now(),
      milestones: this.generateMilestones(objective),
      hints: [...objective.hints]
    }

    if (objective.location) {
      progress.location = { ...objective.location }
    }

    this.objectiveProgress.set(progressKey, progress)
    this.addPlayerObjective(playerId, progressKey)
    
    this.eventManager.emit('objectiveTrackingStarted', {
      objectiveId,
      questId,
      playerId,
      progress,
      timestamp: Date.now()
    })
  }

  /**
   * Updates objective progress
   */
  public updateObjectiveProgress(
    objectiveId: string,
    questId: string,
    playerId: string,
    progress: number,
    metadata?: {
      location?: { x: number; y: number; z?: number }
      attempt?: boolean
      hint?: boolean
    }
  ): boolean {
    const progressKey = this.getProgressKey(objectiveId, questId, playerId)
    const objectiveProgress = this.objectiveProgress.get(progressKey)
    
    if (!objectiveProgress) {
      return false
    }

    const oldProgress = objectiveProgress.current
    const oldPercentage = objectiveProgress.percentage
    const wasCompleted = objectiveProgress.isCompleted

    // Update progress
    objectiveProgress.current = Math.min(progress, objectiveProgress.target)
    objectiveProgress.percentage = (objectiveProgress.current / objectiveProgress.target) * 100
    objectiveProgress.lastUpdate = Date.now()
    objectiveProgress.timeSpent = Date.now() - objectiveProgress.timeStarted

    // Check if objective is completed
    const isCompleted = objectiveProgress.current >= objectiveProgress.target
    if (isCompleted && !wasCompleted) {
      objectiveProgress.isCompleted = true
      objectiveProgress.timeCompleted = Date.now()
      this.handleObjectiveCompleted(objectiveProgress, playerId)
    }

    // Update location if provided
    if (metadata?.location) {
      objectiveProgress.location = { ...metadata.location }
    }

    // Handle attempt tracking
    if (metadata?.attempt) {
      objectiveProgress.attempts++
    }

    // Check milestones
    this.checkMilestones(objectiveProgress, playerId, oldPercentage)

    // Save to history
    this.saveToHistory(progressKey, objectiveProgress)

    // Emit progress update event
    this.eventManager.emit('objectiveProgressUpdated', {
      objectiveId,
      questId,
      playerId,
      oldProgress,
      newProgress: objectiveProgress.current,
      percentage: objectiveProgress.percentage,
      isCompleted: objectiveProgress.isCompleted,
      timestamp: Date.now()
    })

    return true
  }

  /**
   * Gets current progress for an objective
   */
  public getObjectiveProgress(
    objectiveId: string,
    questId: string,
    playerId: string
  ): ObjectiveProgress | undefined {
    const progressKey = this.getProgressKey(objectiveId, questId, playerId)
    return this.objectiveProgress.get(progressKey)
  }

  /**
   * Gets all objectives for a player
   */
  public getPlayerObjectives(playerId: string): ObjectiveProgress[] {
    const objectiveKeys = this.playerObjectives.get(playerId)
    if (!objectiveKeys) return []

    return Array.from(objectiveKeys)
      .map(key => this.objectiveProgress.get(key))
      .filter((progress): progress is ObjectiveProgress => progress !== undefined)
  }

  /**
   * Gets objectives for a specific quest
   */
  public getQuestObjectives(questId: string, playerId: string): ObjectiveProgress[] {
    return this.getPlayerObjectives(playerId).filter(
      progress => progress.questId === questId
    )
  }

  /**
   * Gets progress history for an objective
   */
  public getObjectiveHistory(
    objectiveId: string,
    questId: string,
    playerId: string
  ): ObjectiveProgress[] {
    const progressKey = this.getProgressKey(objectiveId, questId, playerId)
    return this.progressHistory.get(progressKey) || []
  }

  /**
   * Provides a hint for an objective
   */
  public getObjectiveHint(
    objectiveId: string,
    questId: string,
    playerId: string
  ): string | null {
    const progress = this.getObjectiveProgress(objectiveId, questId, playerId)
    if (!progress || progress.hints.length === 0) {
      return null
    }

    // Find the next available hint based on progress
    const hintIndex = Math.floor(progress.percentage / 25) // Show hint every 25%
    if (hintIndex >= progress.hints.length) {
      return progress.hints[progress.hints.length - 1] // Last hint
    }

    const hint = progress.hints[hintIndex]
    
    this.eventManager.emit('objectiveHintProvided', {
      objectiveId,
      questId,
      playerId,
      hintIndex,
      hint,
      timestamp: Date.now()
    })

    return hint
  }

  /**
   * Resets objective progress
   */
  public resetObjective(
    objectiveId: string,
    questId: string,
    playerId: string
  ): boolean {
    const progressKey = this.getProgressKey(objectiveId, questId, playerId)
    const progress = this.objectiveProgress.get(progressKey)
    
    if (!progress) {
      return false
    }

    // Reset progress
    progress.current = 0
    progress.percentage = 0
    progress.isCompleted = false
    progress.timeStarted = Date.now()
    progress.timeCompleted = undefined
    progress.timeSpent = 0
    progress.attempts = 0
    progress.lastUpdate = Date.now()

    // Reset milestones
    progress.milestones.forEach(milestone => {
      milestone.isReached = false
      milestone.timeReached = undefined
    })

    this.eventManager.emit('objectiveReset', {
      objectiveId,
      questId,
      playerId,
      timestamp: Date.now()
    })

    return true
  }

  /**
   * Gets objective statistics
   */
  public getObjectiveStatistics(playerId: string): {
    totalObjectives: number
    completedObjectives: number
    activeObjectives: number
    averageCompletionTime: number
    totalAttempts: number
    objectivesByQuest: Map<string, number>
  } {
    const objectives = this.getPlayerObjectives(playerId)
    const completed = objectives.filter(obj => obj.isCompleted)
    const active = objectives.filter(obj => !obj.isCompleted)
    
    const totalCompletionTime = completed.reduce((sum, obj) => {
      return sum + (obj.timeCompleted ? obj.timeCompleted - obj.timeStarted : 0)
    }, 0)
    
    const averageCompletionTime = completed.length > 0 
      ? totalCompletionTime / completed.length 
      : 0

    const totalAttempts = objectives.reduce((sum, obj) => sum + obj.attempts, 0)
    
    const objectivesByQuest = new Map<string, number>()
    objectives.forEach(obj => {
      const count = objectivesByQuest.get(obj.questId) || 0
      objectivesByQuest.set(obj.questId, count + 1)
    })

    return {
      totalObjectives: objectives.length,
      completedObjectives: completed.length,
      activeObjectives: active.length,
      averageCompletionTime,
      totalAttempts,
      objectivesByQuest
    }
  }

  /**
   * Configures the ObjectiveTracker
   */
  public configure(config: Partial<ObjectiveTrackerConfig>): void {
    this.config = { ...this.config, ...config }
    
    // Restart timers if interval changed
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.startUpdateTimer()
    }
    
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
      this.startSaveTimer()
    }
  }

  /**
   * Cleans up completed objectives
   */
  public cleanupCompletedObjectives(playerId: string, maxAge: number = 24 * 60 * 60 * 1000): void {
    const objectives = this.getPlayerObjectives(playerId)
    const now = Date.now()
    
    objectives.forEach(progress => {
      if (progress.isCompleted && progress.timeCompleted) {
        const age = now - progress.timeCompleted
        if (age > maxAge) {
          this.removeObjective(progress.objectiveId, progress.questId, playerId)
        }
      }
    })
  }

  /**
   * Exports objective data for a player
   */
  public exportPlayerData(playerId: string): {
    objectives: ObjectiveProgress[]
    history: Map<string, ObjectiveProgress[]>
    statistics: any
  } {
    const objectives = this.getPlayerObjectives(playerId)
    const history = new Map<string, ObjectiveProgress[]>()
    
    objectives.forEach(progress => {
      const key = this.getProgressKey(progress.objectiveId, progress.questId, playerId)
      history.set(key, this.getObjectiveHistory(progress.objectiveId, progress.questId, playerId))
    })

    return {
      objectives,
      history,
      statistics: this.getObjectiveStatistics(playerId)
    }
  }

  /**
   * Imports objective data for a player
   */
  public importPlayerData(
    playerId: string, 
    data: { objectives: ObjectiveProgress[] }
  ): void {
    data.objectives.forEach(progress => {
      const progressKey = this.getProgressKey(progress.objectiveId, progress.questId, playerId)
      this.objectiveProgress.set(progressKey, { ...progress })
      this.addPlayerObjective(playerId, progressKey)
    })
  }

  /**
   * Destroys the ObjectiveTracker instance
   */
  public destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
    }
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
    }
    
    this.objectiveProgress.clear()
    this.playerObjectives.clear()
    this.progressHistory.clear()
    this.milestoneCache.clear()
    
    this.isInitialized = false
    ;(ObjectiveTracker as any).instance = undefined
  }

  private getDefaultConfig(): ObjectiveTrackerConfig {
    return {
      enableMilestones: true,
      enableHints: true,
      enableLocationTracking: true,
      enableProgressHistory: true,
      maxHistoryEntries: 100,
      updateInterval: 1000, // 1 second
      autoSaveInterval: 30000 // 30 seconds
    }
  }

  private setupEventListeners(): void {
    // Listen for quest events
    this.eventManager.on('questStarted', ({ questId, player }) => {
      this.handleQuestStarted(questId, player.id)
    })

    this.eventManager.on('questCompleted', ({ questId, player }) => {
      this.handleQuestCompleted(questId, player.id)
    })

    this.eventManager.on('questFailed', ({ questId, player }) => {
      this.handleQuestFailed(questId, player.id)
    })

    this.eventManager.on('questAbandoned', ({ questId, player }) => {
      this.handleQuestAbandoned(questId, player.id)
    })
  }

  private handleQuestStarted(questId: string, playerId: string): void {
    const quest = this.questManager.getQuest(questId)
    if (!quest) return

    // Start tracking all objectives
    quest.objectives.forEach(objective => {
      this.startTrackingObjective(objective.id, questId, playerId, objective)
    })
  }

  private handleQuestCompleted(questId: string, playerId: string): void {
    // Mark all objectives as completed
    const objectives = this.getQuestObjectives(questId, playerId)
    objectives.forEach(progress => {
      if (!progress.isCompleted) {
        this.updateObjectiveProgress(
          progress.objectiveId,
          progress.questId,
          playerId,
          progress.target
        )
      }
    })
  }

  private handleQuestFailed(questId: string, playerId: string): void {
    // Keep objectives tracked but mark as failed
    const objectives = this.getQuestObjectives(questId, playerId)
    objectives.forEach(progress => {
      progress.lastUpdate = Date.now()
    })
  }

  private handleQuestAbandoned(questId: string, playerId: string): void {
    // Remove all objectives for this quest
    const objectives = this.getQuestObjectives(questId, playerId)
    objectives.forEach(progress => {
      this.removeObjective(progress.objectiveId, progress.questId, playerId)
    })
  }

  private handleObjectiveCompleted(progress: ObjectiveProgress, playerId: string): void {
    this.eventManager.emit('objectiveCompleted', {
      objectiveId: progress.objectiveId,
      questId: progress.questId,
      playerId,
      completionTime: progress.timeCompleted!,
      timeSpent: progress.timeSpent,
      attempts: progress.attempts,
      timestamp: Date.now()
    })
  }

  private checkMilestones(
    progress: ObjectiveProgress, 
    playerId: string, 
    oldPercentage: number
  ): void {
    if (!this.config.enableMilestones) return

    progress.milestones.forEach(milestone => {
      if (!milestone.isReached && progress.percentage >= milestone.percentage) {
        milestone.isReached = true
        milestone.timeReached = Date.now()
        
        this.eventManager.emit('objectiveMilestoneReached', {
          objectiveId: progress.objectiveId,
          questId: progress.questId,
          playerId,
          milestoneId: milestone.id,
          percentage: milestone.percentage,
          reward: milestone.reward,
          timestamp: Date.now()
        })
      }
    })
  }

  private generateMilestones(objective: QuestObjective): ObjectiveMilestone[] {
    if (!this.config.enableMilestones) return []

    const milestones: ObjectiveMilestone[] = []
    
    // 25% milestone
    milestones.push({
      id: `${objective.id}_25`,
      percentage: 25,
      isReached: false,
      reward: {
        experience: Math.floor(objective.reward.experience * 0.25),
        coins: Math.floor(objective.reward.coins * 0.25),
        items: [],
        skills: [],
        petBond: Math.floor(objective.reward.petBond * 0.25)
      }
    })

    // 50% milestone
    milestones.push({
      id: `${objective.id}_50`,
      percentage: 50,
      isReached: false,
      reward: {
        experience: Math.floor(objective.reward.experience * 0.5),
        coins: Math.floor(objective.reward.coins * 0.5),
        items: [],
        skills: [],
        petBond: Math.floor(objective.reward.petBond * 0.5)
      }
    })

    // 75% milestone
    milestones.push({
      id: `${objective.id}_75`,
      percentage: 75,
      isReached: false,
      reward: {
        experience: Math.floor(objective.reward.experience * 0.75),
        coins: Math.floor(objective.reward.coins * 0.75),
        items: [],
        skills: [],
        petBond: Math.floor(objective.reward.petBond * 0.75)
      }
    })

    return milestones
  }

  private saveToHistory(progressKey: string, progress: ObjectiveProgress): void {
    if (!this.config.enableProgressHistory) return

    if (!this.progressHistory.has(progressKey)) {
      this.progressHistory.set(progressKey, [])
    }

    const history = this.progressHistory.get(progressKey)!
    history.push({ ...progress })

    // Keep only the most recent entries
    if (history.length > this.config.maxHistoryEntries) {
      history.splice(0, history.length - this.config.maxHistoryEntries)
    }
  }

  private getProgressKey(objectiveId: string, questId: string, playerId: string): string {
    return `${playerId}_${questId}_${objectiveId}`
  }

  private addPlayerObjective(playerId: string, progressKey: string): void {
    if (!this.playerObjectives.has(playerId)) {
      this.playerObjectives.set(playerId, new Set())
    }
    this.playerObjectives.get(playerId)!.add(progressKey)
  }

  private removeObjective(objectiveId: string, questId: string, playerId: string): void {
    const progressKey = this.getProgressKey(objectiveId, questId, playerId)
    
    this.objectiveProgress.delete(progressKey)
    this.progressHistory.delete(progressKey)
    
    const playerObjectives = this.playerObjectives.get(playerId)
    if (playerObjectives) {
      playerObjectives.delete(progressKey)
      if (playerObjectives.size === 0) {
        this.playerObjectives.delete(playerId)
      }
    }
  }

  private startUpdateTimer(): void {
    this.updateTimer = setInterval(() => {
      this.updateAllProgress()
    }, this.config.updateInterval)
  }

  private startSaveTimer(): void {
    this.saveTimer = setInterval(() => {
      this.autoSave()
    }, this.config.autoSaveInterval)
  }

  private updateAllProgress(): void {
    const now = Date.now()
    
    this.objectiveProgress.forEach(progress => {
      if (!progress.isCompleted) {
        progress.timeSpent = now - progress.timeStarted
      }
    })
  }

  private autoSave(): void {
    // Auto-save functionality can be implemented here
    // For now, just emit an event
    this.eventManager.emit('objectiveTrackerAutoSave', {
      timestamp: Date.now(),
      objectiveCount: this.objectiveProgress.size,
      playerCount: this.playerObjectives.size
    })
  }
}

export default ObjectiveTracker



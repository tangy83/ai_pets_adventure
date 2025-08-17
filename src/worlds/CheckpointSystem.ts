import { EventManager } from '../core/EventManager'

export interface CheckpointData {
  id: string
  name: string
  timestamp: number
  playerData: {
    level: number
    experience: number
    coins: number
    orbs: number
    reputation: number
    petBond: number
  }
  questProgress: {
    activeQuests: Array<{
      id: string
      name: string
      progress: number
      objectives: Array<{
        id: string
        description: string
        completed: boolean
        progress: number
      }>
    }>
    completedQuests: string[]
    questPoints: number
    questChains: Array<[string, string[]]>
    questDependencies: Array<[string, string[]]>
  }
  achievements: {
    unlocked: string[]
    progress: Record<string, number>
  }
  gameState: {
    currentWorld: string
    unlockedAreas: string[]
    inventory: Record<string, number>
    skills: Record<string, number>
  }
  metadata: {
    version: string
    playTime: number
    lastSave: number
    checksum: string
  }
}

export interface CheckpointSummary {
  id: string
  name: string
  timestamp: number
  playerLevel: number
  totalPoints: number
  questsCompleted: number
  playTime: string
}

export class CheckpointSystem {
  private static instance: CheckpointSystem
  private eventManager: EventManager
  private checkpoints: Map<string, CheckpointData> = new Map()
  private currentCheckpointId: string | null = null
  private autoSaveInterval: NodeJS.Timeout | null = null
  private readonly STORAGE_KEY = 'ai_pets_checkpoints'
  private readonly MAX_CHECKPOINTS = 10
  private readonly AUTO_SAVE_INTERVAL = 5 * 60 * 1000 // 5 minutes

  private constructor() {
    this.eventManager = EventManager.getInstance()
    this.loadCheckpoints()
    this.startAutoSave()
  }

  public static getInstance(): CheckpointSystem {
    if (!CheckpointSystem.instance) {
      CheckpointSystem.instance = new CheckpointSystem()
    }
    return CheckpointSystem.instance
  }

  /**
   * Get the event manager for external event listening
   */
  public getEventManager(): EventManager {
    return this.eventManager
  }

  /**
   * Create a new checkpoint with current game state
   */
  public createCheckpoint(
    name: string,
    playerData: any,
    questProgress: any,
    achievements: any,
    gameState: any
  ): string {
    const id = this.generateCheckpointId()
    const timestamp = Date.now()
    
    const checkpoint: CheckpointData = {
      id,
      name,
      timestamp,
      playerData: {
        level: playerData.level || 1,
        experience: playerData.experience || 0,
        coins: playerData.coins || 0,
        orbs: playerData.orbs || 0,
        reputation: playerData.reputation || 0,
        petBond: playerData.petBond || 0
      },
      questProgress: {
        activeQuests: questProgress.activeQuests || [],
        completedQuests: questProgress.completedQuests || [],
        questPoints: questProgress.questPoints || 0,
        questChains: questProgress.questChains || [],
        questDependencies: questProgress.questDependencies || []
      },
      achievements: {
        unlocked: achievements.unlocked || [],
        progress: achievements.progress || {}
      },
      gameState: {
        currentWorld: gameState.currentWorld || 'default',
        unlockedAreas: gameState.unlockedAreas || [],
        inventory: gameState.inventory || {},
        skills: gameState.skills || {}
      },
      metadata: {
        version: '1.0.0',
        playTime: gameState.playTime || 0,
        lastSave: timestamp,
        checksum: this.generateChecksum(playerData, questProgress, achievements, gameState)
      }
    }

    this.checkpoints.set(id, checkpoint)
    this.currentCheckpointId = id
    
    // Debug logging
    console.log(`Created checkpoint: ${id} - "${name}"`)
    console.log(`Total checkpoints: ${this.checkpoints.size}`)
    
    // Limit total checkpoints
    this.enforceCheckpointLimit()
    
    // Save to storage
    this.saveCheckpoints()
    
    // Emit event
    this.eventManager.emit('checkpoint:created', { 
      checkpoint: checkpoint, 
      id: id, 
      timestamp: Date.now() 
    })
    
    return id
  }

  /**
   * Restore game state from a checkpoint
   */
  public restoreCheckpoint(checkpointId: string): CheckpointData | null {
    const checkpoint = this.checkpoints.get(checkpointId)
    
    if (!checkpoint) {
      this.eventManager.emit('checkpoint:restore:failed', { 
        checkpointId, 
        error: 'Checkpoint not found',
        timestamp: Date.now()
      })
      return null
    }

    // Validate checksum
    if (!this.validateCheckpoint(checkpoint)) {
      this.eventManager.emit('checkpoint:restore:failed', { 
        checkpointId, 
        error: 'Checkpoint data corrupted',
        timestamp: Date.now()
      })
      return null
    }

    this.currentCheckpointId = checkpointId
    
    // Emit event
    this.eventManager.emit('checkpoint:restored', { checkpoint, id: checkpointId, timestamp: Date.now() })
    
    return checkpoint
  }

  /**
   * Get current checkpoint data
   */
  public getCurrentCheckpoint(): CheckpointData | null {
    if (!this.currentCheckpointId) return null
    return this.checkpoints.get(this.currentCheckpointId) || null
  }

  /**
   * Get all available checkpoints
   */
  public getAllCheckpoints(): CheckpointSummary[] {
    return Array.from(this.checkpoints.values()).map(checkpoint => ({
      id: checkpoint.id,
      name: checkpoint.name,
      timestamp: checkpoint.timestamp,
      playerLevel: checkpoint.playerData.level,
      totalPoints: this.calculateTotalPoints(checkpoint),
      questsCompleted: checkpoint.questProgress.completedQuests?.length || 0,
      playTime: this.formatPlayTime(checkpoint.metadata.playTime)
    }))
  }

  /**
   * Delete a checkpoint
   */
  public deleteCheckpoint(checkpointId: string): boolean {
    if (checkpointId === this.currentCheckpointId) {
      this.currentCheckpointId = null
    }
    
    const deleted = this.checkpoints.delete(checkpointId)
    
    if (deleted) {
      this.saveCheckpoints()
      this.eventManager.emit('checkpoint:deleted', { checkpointId, timestamp: Date.now() })
    }
    
    return deleted
  }

  /**
   * Update existing checkpoint
   */
  public updateCheckpoint(
    checkpointId: string,
    updates: Partial<CheckpointData>
  ): boolean {
    const checkpoint = this.checkpoints.get(checkpointId)
    
    if (!checkpoint) return false
    
    const updatedCheckpoint = {
      ...checkpoint,
      ...updates,
      metadata: {
        ...checkpoint.metadata,
        lastSave: Date.now()
      }
    }
    
    this.checkpoints.set(checkpointId, updatedCheckpoint)
    this.saveCheckpoints()
    
    this.eventManager.emit('checkpoint:updated', { 
      checkpointId, 
      updates,
      timestamp: Date.now()
    })
    
    return true
  }

  /**
   * Export checkpoint data for backup
   */
  public exportCheckpoint(checkpointId: string): string | null {
    const checkpoint = this.checkpoints.get(checkpointId)
    
    if (!checkpoint) return null
    
    try {
      return JSON.stringify(checkpoint, null, 2)
    } catch (error) {
      console.error('Failed to export checkpoint:', error)
      return null
    }
  }

  /**
   * Import checkpoint from backup data
   */
  public importCheckpoint(backupData: string): string | null {
    try {
      const checkpoint: CheckpointData = JSON.parse(backupData)
      
      // Validate imported data
      if (!this.validateCheckpointStructure(checkpoint)) {
        throw new Error('Invalid checkpoint structure')
      }
      
      // Generate new ID to avoid conflicts
      const newId = this.generateCheckpointId()
      checkpoint.id = newId
      checkpoint.timestamp = Date.now()
      checkpoint.metadata.lastSave = Date.now()
      
      this.checkpoints.set(newId, checkpoint)
      this.saveCheckpoints()
      
      this.eventManager.emit('checkpoint:imported', { checkpoint, id: newId, timestamp: Date.now() })
      
      return newId
    } catch (error) {
      console.error('Failed to import checkpoint:', error)
      return null
    }
  }

  /**
   * Clear all checkpoints
   */
  public clearAllCheckpoints(): void {
    this.checkpoints.clear()
    this.currentCheckpointId = null
    this.saveCheckpoints()
    
    this.eventManager.emit('checkpoint:cleared', {})
  }

  /**
   * Get checkpoint statistics
   */
  public getCheckpointStats(): {
    total: number
    totalPlayTime: number
    averageLevel: number
    totalPoints: number
    mostRecent: CheckpointSummary | null
  } {
    const checkpoints = Array.from(this.checkpoints.values())
    
    if (checkpoints.length === 0) {
      return {
        total: 0,
        totalPlayTime: 0,
        averageLevel: 0,
        totalPoints: 0,
        mostRecent: null
      }
    }
    
    const totalPlayTime = checkpoints.reduce((sum, cp) => sum + cp.metadata.playTime, 0)
    const averageLevel = checkpoints.reduce((sum, cp) => sum + cp.playerData.level, 0) / checkpoints.length
    const totalPoints = checkpoints.reduce((sum, cp) => sum + this.calculateTotalPoints(cp), 0)
    
    const mostRecent = checkpoints.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    )
    
    return {
      total: checkpoints.length,
      totalPlayTime,
      averageLevel: Math.round(averageLevel * 100) / 100,
      totalPoints,
      mostRecent: {
        id: mostRecent.id,
        name: mostRecent.name,
        timestamp: mostRecent.timestamp,
        playerLevel: mostRecent.playerData.level,
        totalPoints: this.calculateTotalPoints(mostRecent),
        questsCompleted: mostRecent.questProgress.completedQuests.length,
        playTime: this.formatPlayTime(mostRecent.metadata.playTime)
      }
    }
  }

  // Private helper methods

  private generateCheckpointId(): string {
    return `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateChecksum(data: any, ...otherData: any[]): string {
    const combined = JSON.stringify([data, ...otherData])
    let hash = 0
    
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return hash.toString(16)
  }

  private validateCheckpoint(checkpoint: CheckpointData): boolean {
    const expectedChecksum = this.generateChecksum(
      checkpoint.playerData,
      checkpoint.questProgress,
      checkpoint.achievements,
      checkpoint.gameState
    )
    
    return checkpoint.metadata.checksum === expectedChecksum
  }

  private validateCheckpointStructure(checkpoint: any): boolean {
    const requiredFields = [
      'playerData', 'questProgress', 'achievements', 
      'gameState', 'metadata'
    ]
    
    return requiredFields.every(field => 
      checkpoint.hasOwnProperty(field) && 
      typeof checkpoint[field] === 'object'
    )
  }

  private calculateTotalPoints(checkpoint: CheckpointData): number {
    return (
      checkpoint.playerData.experience +
      checkpoint.playerData.coins * 10 +
      checkpoint.playerData.orbs * 100 +
      checkpoint.playerData.reputation * 5 +
      checkpoint.playerData.petBond * 2 +
      checkpoint.questProgress.questPoints
    )
  }

  private formatPlayTime(playTimeMs: number): string {
    const hours = Math.floor(playTimeMs / (1000 * 60 * 60))
    const minutes = Math.floor((playTimeMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  private enforceCheckpointLimit(): void {
    if (this.checkpoints.size <= this.MAX_CHECKPOINTS) return
    
    // Remove oldest checkpoints
    const sortedCheckpoints = Array.from(this.checkpoints.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
    
    const toRemove = sortedCheckpoints.slice(0, this.checkpoints.size - this.MAX_CHECKPOINTS)
    
    toRemove.forEach(([id]) => {
      this.checkpoints.delete(id)
      if (id === this.currentCheckpointId) {
        this.currentCheckpointId = null
      }
    })
  }

  private loadCheckpoints(): void {
    try {
      if (typeof window === 'undefined') return
      
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        
        // Safely reconstruct the Map from stored data
        if (data.checkpoints && Array.isArray(data.checkpoints)) {
          this.checkpoints = new Map()
          data.checkpoints.forEach(([id, checkpoint]) => {
            if (id && checkpoint && checkpoint.name) {
              this.checkpoints.set(id, checkpoint)
            }
          })
        }
        
        this.currentCheckpointId = data.currentCheckpointId || null
        
        // Log loaded checkpoints for debugging
        console.log(`Loaded ${this.checkpoints.size} checkpoints from localStorage`)
        this.checkpoints.forEach((checkpoint, id) => {
          console.log(`Loaded checkpoint: ${id} - "${checkpoint.name}"`)
        })
      }
    } catch (error) {
      console.error('Failed to load checkpoints:', error)
      // Clear corrupted data
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }

  private saveCheckpoints(): void {
    try {
      if (typeof window === 'undefined') return
      
      const data = {
        checkpoints: Array.from(this.checkpoints.entries()),
        currentCheckpointId: this.currentCheckpointId
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
      
      // Debug logging
      console.log(`Saved ${this.checkpoints.size} checkpoints to localStorage`)
      console.log('Checkpoint names:', Array.from(this.checkpoints.values()).map(cp => cp.name))
    } catch (error) {
      console.error('Failed to save checkpoints:', error)
    }
  }

  private startAutoSave(): void {
    if (typeof window === 'undefined') return
    
    this.autoSaveInterval = setInterval(() => {
      if (this.currentCheckpointId) {
        this.eventManager.emit('checkpoint:autoSave:triggered', {})
      }
    }, this.AUTO_SAVE_INTERVAL)
  }

  public stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = null
    }
  }

  public destroy(): void {
    this.stopAutoSave()
    this.checkpoints.clear()
    this.currentCheckpointId = null
  }
}

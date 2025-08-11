import { BaseSystem } from './BaseSystem'

export interface AIBehavior {
  id: string
  name: string
  priority: number
  conditions: BehaviorCondition[]
  actions: AIAction[]
  isActive: boolean
}

export interface BehaviorCondition {
  type: 'proximity' | 'time' | 'state' | 'input' | 'memory'
  data: any
  operator: 'equals' | 'greater' | 'less' | 'contains' | 'not'
}

export interface AIAction {
  type: 'move' | 'interact' | 'emote' | 'learn' | 'communicate'
  data: any
  duration: number
  priority: number
}

export interface PetMemory {
  id: string
  type: 'interaction' | 'location' | 'event' | 'skill'
  data: any
  timestamp: number
  importance: number
  decayRate: number
}

export interface LearningData {
  input: any
  output: any
  reward: number
  timestamp: number
}

export class AISystem extends BaseSystem {
  private behaviors: Map<string, AIBehavior> = new Map()
  private activeBehaviors: AIBehavior[] = []
  private petMemories: PetMemory[] = []
  private learningData: LearningData[] = []
  private currentAction: AIAction | null = null
  private behaviorTree: BehaviorNode | null = null
  private isLearningEnabled: boolean = true
  private config: AIConfig

  constructor() {
    super('AISystem', 2) // Added priority 2 for AI system
    this.config = {
      maxMemories: 100,
      memoryDecayRate: 0.1,
      learningRate: 0.01,
      behaviorUpdateInterval: 100,
      maxActiveBehaviors: 5
    }
    this.initializeDefaultBehaviors()
  }

  public update(deltaTime: number): void {
    // Update behavior tree
    this.updateBehaviorTree(deltaTime)
    
    // Process current action
    this.processCurrentAction(deltaTime)
    
    // Update memories
    this.updateMemories(deltaTime)
    
    // Learn from recent experiences
    this.processLearning(deltaTime)
  }

  private initializeDefaultBehaviors(): void {
    // Idle behavior
    this.addBehavior({
      id: 'idle',
      name: 'Idle',
      priority: 1,
      conditions: [
        {
          type: 'state',
          data: { state: 'idle' },
          operator: 'equals'
        }
      ],
      actions: [
        {
          type: 'emote',
          data: { emotion: 'content', animation: 'idle' },
          duration: 5000,
          priority: 1
        }
      ],
      isActive: true
    })

    // Exploration behavior
    this.addBehavior({
      id: 'explore',
      name: 'Explore',
      priority: 3,
      conditions: [
        {
          type: 'time',
          data: { minIdleTime: 10000 },
          operator: 'greater'
        }
      ],
      actions: [
        {
          type: 'move',
          data: { direction: 'random', distance: 100 },
          duration: 3000,
          priority: 2
        },
        {
          type: 'emote',
          data: { emotion: 'curious', animation: 'look_around' },
          duration: 2000,
          priority: 1
        }
      ],
      isActive: true
    })

    // Player interaction behavior
    this.addBehavior({
      id: 'player_interaction',
      name: 'Player Interaction',
      priority: 5,
      conditions: [
        {
          type: 'proximity',
          data: { target: 'player', distance: 50 },
          operator: 'less'
        }
      ],
      actions: [
        {
          type: 'emote',
          data: { emotion: 'happy', animation: 'wag_tail' },
          duration: 2000,
          priority: 3
        },
        {
          type: 'interact',
          data: { target: 'player', action: 'greet' },
          duration: 1000,
          priority: 2
        }
      ],
      isActive: true
    })

    // Puzzle solving behavior
    this.addBehavior({
      id: 'puzzle_solving',
      name: 'Puzzle Solving',
      priority: 4,
      conditions: [
        {
          type: 'state',
          data: { state: 'puzzle_active' },
          operator: 'equals'
        }
      ],
      actions: [
        {
          type: 'interact',
          data: { target: 'puzzle', action: 'analyze' },
          duration: 3000,
          priority: 4
        },
        {
          type: 'emote',
          data: { emotion: 'focused', animation: 'think' },
          duration: 2000,
          priority: 3
        }
      ],
      isActive: true
    })
  }

  private updateBehaviorTree(deltaTime: number): void {
    // Evaluate all behaviors
    const validBehaviors = this.evaluateBehaviors()
    
    // Sort by priority
    validBehaviors.sort((a, b) => b.priority - a.priority)
    
    // Limit active behaviors
    this.activeBehaviors = validBehaviors.slice(0, this.config.maxActiveBehaviors)
    
    // Select highest priority behavior if no current action
    if (!this.currentAction && this.activeBehaviors.length > 0) {
      const topBehavior = this.activeBehaviors[0]
      this.selectBehavior(topBehavior)
    }
  }

  private evaluateBehaviors(): AIBehavior[] {
    const validBehaviors: AIBehavior[] = []
    
    for (const behavior of this.behaviors.values()) {
      if (!behavior.isActive) continue
      
      if (this.evaluateBehaviorConditions(behavior)) {
        validBehaviors.push(behavior)
      }
    }
    
    return validBehaviors
  }

  private evaluateBehaviorConditions(behavior: AIBehavior): boolean {
    for (const condition of behavior.conditions) {
      if (!this.evaluateCondition(condition)) {
        return false
      }
    }
    return true
  }

  private evaluateCondition(condition: BehaviorCondition): boolean {
    switch (condition.type) {
      case 'proximity':
        return this.evaluateProximityCondition(condition)
      case 'time':
        return this.evaluateTimeCondition(condition)
      case 'state':
        return this.evaluateStateCondition(condition)
      case 'input':
        return this.evaluateInputCondition(condition)
      case 'memory':
        return this.evaluateMemoryCondition(condition)
      default:
        return false
    }
  }

  private evaluateProximityCondition(condition: BehaviorCondition): boolean {
    // This would check actual game world proximity
    // For now, return true as placeholder
    return true
  }

  private evaluateTimeCondition(condition: BehaviorCondition): boolean {
    // This would check time-based conditions
    // For now, return true as placeholder
    return true
  }

  private evaluateStateCondition(condition: BehaviorCondition): boolean {
    // This would check game state conditions
    // For now, return true as placeholder
    return true
  }

  private evaluateInputCondition(condition: BehaviorCondition): boolean {
    // This would check input-based conditions
    // For now, return true as placeholder
    return true
  }

  private evaluateMemoryCondition(condition: BehaviorCondition): boolean {
    // This would check memory-based conditions
    // For now, return true as placeholder
    return true
  }

  private selectBehavior(behavior: AIBehavior): void {
    if (behavior.actions.length === 0) return
    
    // Sort actions by priority
    const sortedActions = [...behavior.actions].sort((a, b) => b.priority - a.priority)
    
    // Select highest priority action
    this.currentAction = sortedActions[0]
    
    // Emit behavior selection event
    if (this.eventManager) {
      this.eventManager.emit('ai_behavior_selected', {
        behaviorId: behavior.id,
        behaviorName: behavior.name,
        action: this.currentAction,
        entityId: 'pet_1', // TODO: Get actual entity ID
        timestamp: Date.now()
      })
    }
  }

  private processCurrentAction(deltaTime: number): void {
    if (!this.currentAction) return
    
    // Reduce action duration
    this.currentAction.duration -= deltaTime
    
    // Execute action
    this.executeAction(this.currentAction)
    
    // Check if action is complete
    if (this.currentAction.duration <= 0) {
      this.completeAction()
    }
  }

  private executeAction(action: AIAction): void {
    switch (action.type) {
      case 'move':
        this.executeMoveAction(action)
        break
      case 'interact':
        this.executeInteractAction(action)
        break
      case 'emote':
        this.executeEmoteAction(action)
        break
      case 'learn':
        this.executeLearnAction(action)
        break
      case 'communicate':
        this.executeCommunicateAction(action)
        break
    }
  }

  private executeMoveAction(action: AIAction): void {
    // Emit move event
    if (this.eventManager) {
      this.eventManager.emit('ai_move', action.data)
    }
  }

  private executeInteractAction(action: AIAction): void {
    // Emit interaction event
    if (this.eventManager) {
      this.eventManager.emit('ai_interact', action.data)
    }
  }

  private executeEmoteAction(action: AIAction): void {
    // Emit emote event
    if (this.eventManager) {
      this.eventManager.emit('ai_emote', action.data)
    }
  }

  private executeLearnAction(action: AIAction): void {
    // Process learning data
    if (action.data.learningData) {
      this.addLearningData(action.data.learningData)
    }
  }

  private executeCommunicateAction(action: AIAction): void {
    // Emit communication event
    if (this.eventManager) {
      this.eventManager.emit('ai_communicate', action.data)
    }
  }

  private completeAction(): void {
    if (!this.currentAction) return
    
    // Emit action completion event
    if (this.eventManager) {
      this.eventManager.emit('ai_action_completed', {
        action: this.currentAction
      })
    }
    
    this.currentAction = null
  }

  private updateMemories(deltaTime: number): void {
    const now = Date.now()
    
    // Update memory importance and remove old memories
    this.petMemories = this.petMemories
      .map(memory => ({
        ...memory,
        importance: memory.importance * (1 - memory.decayRate * deltaTime / 1000)
      }))
      .filter(memory => memory.importance > 0.1)
      .slice(0, this.config.maxMemories)
  }

  private processLearning(deltaTime: number): void {
    if (!this.isLearningEnabled || this.learningData.length === 0) return
    
    // Process recent learning data
    const recentData = this.learningData
      .filter(data => Date.now() - data.timestamp < 60000) // Last minute
      .sort((a, b) => b.reward - a.reward)
    
    if (recentData.length > 0) {
      // Update behavior priorities based on learning
      this.updateBehaviorPriorities(recentData)
      
      // Clear processed learning data
      this.learningData = this.learningData.filter(data => 
        Date.now() - data.timestamp >= 60000
      )
    }
  }

  private updateBehaviorPriorities(learningData: LearningData[]): void {
    // Simple learning algorithm to adjust behavior priorities
    for (const data of learningData) {
      if (data.reward > 0) {
        // Positive reward - increase priority of related behaviors
        this.adjustBehaviorPriority(data, 0.1)
      } else if (data.reward < 0) {
        // Negative reward - decrease priority of related behaviors
        this.adjustBehaviorPriority(data, -0.1)
      }
    }
  }

  private adjustBehaviorPriority(learningData: LearningData, adjustment: number): void {
    // This is a simplified version - in a real implementation,
    // you would analyze the learning data to determine which behaviors to adjust
    
    // For now, adjust a random behavior
    const behaviors = Array.from(this.behaviors.values())
    if (behaviors.length > 0) {
      const randomBehavior = behaviors[Math.floor(Math.random() * behaviors.length)]
      randomBehavior.priority = Math.max(1, randomBehavior.priority + adjustment)
    }
  }

  public addBehavior(behavior: AIBehavior): void {
    this.behaviors.set(behavior.id, behavior)
    
    if (this.eventManager) {
      this.eventManager.emit('ai_behavior_added', behavior)
    }
  }

  public removeBehavior(behaviorId: string): void {
    const behavior = this.behaviors.get(behaviorId)
    if (behavior) {
      this.behaviors.delete(behaviorId)
      
      if (this.eventManager) {
        this.eventManager.emit('ai_behavior_removed', behavior)
      }
    }
  }

  public addMemory(memory: Omit<PetMemory, 'timestamp'>): void {
    const newMemory: PetMemory = {
      ...memory,
      timestamp: Date.now()
    }
    
    this.petMemories.push(newMemory)
    
    // Sort by importance and limit total memories
    this.petMemories.sort((a, b) => b.importance - a.importance)
    this.petMemories = this.petMemories.slice(0, this.config.maxMemories)
  }

  public addLearningData(data: Omit<LearningData, 'timestamp'>): void {
    const newLearningData: LearningData = {
      ...data,
      timestamp: Date.now()
    }
    
    this.learningData.push(newLearningData)
  }

  public getActiveBehaviors(): AIBehavior[] {
    return [...this.activeBehaviors]
  }

  public getCurrentAction(): AIAction | null {
    return this.currentAction
  }

  public getMemories(): PetMemory[] {
    return [...this.petMemories]
  }

  public setLearningEnabled(enabled: boolean): void {
    this.isLearningEnabled = enabled
  }

  public setConfig(config: Partial<AIConfig>): void {
    this.config = { ...this.config, ...config }
  }

  public getConfig(): AIConfig {
    return { ...this.config }
  }
}

export interface AIConfig {
  maxMemories: number
  memoryDecayRate: number
  learningRate: number
  behaviorUpdateInterval: number
  maxActiveBehaviors: number
}

interface BehaviorNode {
  type: 'sequence' | 'selector' | 'action'
  children?: BehaviorNode[]
  action?: AIAction
} 
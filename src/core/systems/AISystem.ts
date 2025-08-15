import { BaseSystem } from './BaseSystem'

export interface AIBehavior {
  id: string
  name: string
  priority: number
  conditions: BehaviorCondition[]
  actions: AIAction[]
  isActive: boolean
  personality: string[] // Personality traits that influence this behavior
  cooldown: number // Cooldown period between executions
  lastExecuted: number // Timestamp of last execution
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

// NPC System Interfaces
export interface NPC {
  id: string
  name: string
  type: 'merchant' | 'quest_giver' | 'trainer' | 'companion' | 'enemy'
  personality: string[]
  behaviors: AIBehavior[]
  currentBehavior: AIBehavior | null
  position: { x: number; y: number }
  state: NPCState
  interactions: NPCInteraction[]
}

export interface NPCState {
  mood: 'happy' | 'neutral' | 'sad' | 'angry' | 'excited'
  energy: number
  busy: boolean
  lastInteraction: number
  relationshipWithPlayer: number // -100 to 100
}

export interface NPCInteraction {
  type: 'greeting' | 'quest' | 'trade' | 'training' | 'conversation'
  data: any
  timestamp: number
  success: boolean
}

// Enhanced Pet Behavior Interfaces
export interface PetBehaviorState {
  currentMood: 'happy' | 'curious' | 'playful' | 'tired' | 'hungry' | 'scared'
  energyLevel: number
  hungerLevel: number
  socialNeed: number
  explorationDesire: number
  lastAction: string
  actionCooldown: number
}

export interface BehaviorNode {
  type: 'sequence' | 'selector' | 'action' | 'condition'
  name: string
  children?: BehaviorNode[]
  action?: () => boolean
  condition?: () => boolean
  priority: number
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
  
  // NPC Management
  private npcs: Map<string, NPC> = new Map()
  private npcBehaviors: Map<string, AIBehavior[]> = new Map()
  
  // Enhanced Pet Behavior
  private petBehaviorStates: Map<string, PetBehaviorState> = new Map()
  private petPersonalities: Map<string, string[]> = new Map()
  
  // Behavior Tree Management
  private behaviorTrees: Map<string, BehaviorNode> = new Map()
  private lastBehaviorUpdate: number = 0

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
    this.initializeDefaultNPCs()
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
    
    // Update NPC behaviors
    this.updateNPCBehaviors(deltaTime)
    
    // Update enhanced pet behaviors
    this.updatePetBehaviors(deltaTime)
    
    // Update behavior trees
    this.updateBehaviorTrees(deltaTime)
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
      isActive: true,
      personality: ['calm', 'patient'],
      cooldown: 2000,
      lastExecuted: 0
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
      isActive: true,
      personality: ['curious', 'adventurous'],
      cooldown: 5000,
      lastExecuted: 0
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
      isActive: true,
      personality: ['friendly', 'social'],
      cooldown: 3000,
      lastExecuted: 0
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
      isActive: true,
      personality: ['intelligent', 'focused'],
      cooldown: 8000,
      lastExecuted: 0
    })

    // Rest behavior for tired pets
    this.addBehavior({
      id: 'rest',
      name: 'Rest',
      priority: 2,
      conditions: [
        {
          type: 'state',
          data: { state: 'tired' },
          operator: 'equals'
        }
      ],
      actions: [
        {
          type: 'emote',
          data: { emotion: 'tired', animation: 'sleep' },
          duration: 10000,
          priority: 2
        }
      ],
      isActive: true,
      personality: ['calm', 'patient'],
      cooldown: 15000,
      lastExecuted: 0
    })

    // Play behavior for energetic pets
    this.addBehavior({
      id: 'play',
      name: 'Play',
      priority: 4,
      conditions: [
        {
          type: 'state',
          data: { state: 'playful' },
          operator: 'equals'
        }
      ],
      actions: [
        {
          type: 'emote',
          data: { emotion: 'excited', animation: 'bounce' },
          duration: 4000,
          priority: 3
        },
        {
          type: 'move',
          data: { direction: 'random', distance: 50 },
          duration: 2000,
          priority: 2
        }
      ],
      isActive: true,
      personality: ['playful', 'energetic'],
      cooldown: 4000,
      lastExecuted: 0
    })

    // Eat behavior for hungry pets
    this.addBehavior({
      id: 'eat',
      name: 'Eat',
      priority: 3,
      conditions: [
        {
          type: 'state',
          data: { state: 'hungry' },
          operator: 'equals'
        }
      ],
      actions: [
        {
          type: 'emote',
          data: { emotion: 'hungry', animation: 'search' },
          duration: 3000,
          priority: 3
        },
        {
          type: 'interact',
          data: { target: 'food', action: 'consume' },
          duration: 2000,
          priority: 2
        }
      ],
      isActive: true,
      personality: ['survival', 'focused'],
      cooldown: 10000,
      lastExecuted: 0
    })
  }

  private initializeDefaultNPCs(): void {
    // Merchant NPC
    const merchant: NPC = {
      id: 'merchant_001',
      name: 'Old Tom the Merchant',
      type: 'merchant',
      personality: ['friendly', 'business-minded', 'helpful'],
      behaviors: [
        {
          id: 'merchant_greet',
          name: 'Merchant Greeting',
          priority: 3,
          conditions: [
            {
              type: 'proximity',
              data: { target: 'player', distance: 30 },
              operator: 'less'
            }
          ],
          actions: [
            {
              type: 'emote',
              data: { emotion: 'friendly', animation: 'wave' },
              duration: 2000,
              priority: 2
            },
            {
              type: 'interact',
              data: { target: 'player', action: 'offer_trade' },
              duration: 3000,
              priority: 3
            }
          ],
          isActive: true,
          personality: ['friendly', 'business-minded'],
          cooldown: 10000,
          lastExecuted: 0
        }
      ],
      currentBehavior: null,
      position: { x: 100, y: 100 },
      state: {
        mood: 'happy',
        energy: 100,
        busy: false,
        lastInteraction: 0,
        relationshipWithPlayer: 50
      },
      interactions: []
    }

    // Quest Giver NPC
    const questGiver: NPC = {
      id: 'quest_giver_001',
      name: 'Sage Elena',
      type: 'quest_giver',
      personality: ['wise', 'mysterious', 'helpful'],
      behaviors: [
        {
          id: 'quest_offer',
          name: 'Offer Quest',
          priority: 4,
          conditions: [
            {
              type: 'proximity',
              data: { target: 'player', distance: 25 },
              operator: 'less'
            }
          ],
          actions: [
            {
              type: 'emote',
              data: { emotion: 'wise', animation: 'ponder' },
              duration: 2000,
              priority: 2
            },
            {
              type: 'interact',
              data: { target: 'player', action: 'offer_quest' },
              duration: 5000,
              priority: 4
            }
          ],
          isActive: true,
          personality: ['wise', 'mysterious'],
          cooldown: 15000,
          lastExecuted: 0
        }
      ],
      currentBehavior: null,
      position: { x: 200, y: 150 },
      state: {
        mood: 'neutral',
        energy: 80,
        busy: false,
        lastInteraction: 0,
        relationshipWithPlayer: 30
      },
      interactions: []
    }

    // Add NPCs to the system
    this.addNPC(merchant)
    this.addNPC(questGiver)
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
      
      if (this.evaluateBehaviorConditions(behavior, {})) {
        validBehaviors.push(behavior)
      }
    }
    
    return validBehaviors
  }

  // evaluateBehaviorConditions and evaluateCondition methods are defined below

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

  // NPC Management Methods
  public addNPC(npc: NPC): void {
    this.npcs.set(npc.id, npc)
    this.npcBehaviors.set(npc.id, npc.behaviors)
    
          if (this.eventManager) {
        this.eventManager.emit('input', { type: 'npc_added', data: npc, timestamp: Date.now() })
      }
  }

  public removeNPC(npcId: string): void {
    this.npcs.delete(npcId)
    this.npcBehaviors.delete(npcId)
    
          if (this.eventManager) {
        this.eventManager.emit('input', { type: 'npc_removed', data: { npcId } })
      }
  }

  public updateNPCBehaviors(deltaTime: number): void {
    for (const [npcId, npc] of this.npcs) {
      if (npc.state.busy) continue
      
      // Evaluate NPC behaviors based on current state
      const validBehaviors = this.evaluateNPCBehaviors(npc)
      
      if (validBehaviors.length > 0) {
        // Select behavior based on personality and current state
        const selectedBehavior = this.selectNPCBehavior(npc, validBehaviors)
        if (selectedBehavior) {
          this.executeNPCBehavior(npc, selectedBehavior)
        }
      }
    }
  }

  private evaluateNPCBehaviors(npc: NPC): AIBehavior[] {
    const validBehaviors: AIBehavior[] = []
    const now = Date.now()
    
    for (const behavior of npc.behaviors) {
      if (!behavior.isActive) continue
      if (now - behavior.lastExecuted < behavior.cooldown) continue
      
      // Check if behavior conditions are met
      if (this.evaluateBehaviorConditions(behavior, npc)) {
        validBehaviors.push(behavior)
      }
    }
    
    return validBehaviors
  }

  private selectNPCBehavior(npc: NPC, validBehaviors: AIBehavior[]): AIBehavior | null {
    if (validBehaviors.length === 0) return null
    
    // Sort by priority and personality match
    validBehaviors.sort((a, b) => {
      const priorityDiff = b.priority - a.priority
      if (Math.abs(priorityDiff) > 1) return priorityDiff
      
      // If priorities are similar, consider personality match
      const personalityMatchA = this.calculatePersonalityMatch(a.personality, npc.personality)
      const personalityMatchB = this.calculatePersonalityMatch(b.personality, npc.personality)
      return personalityMatchB - personalityMatchA
    })
    
    return validBehaviors[0]
  }

  private executeNPCBehavior(npc: NPC, behavior: AIBehavior): void {
    npc.currentBehavior = behavior
    npc.state.busy = true
    behavior.lastExecuted = Date.now()
    
    // Execute the first action
    if (behavior.actions.length > 0) {
      this.currentAction = behavior.actions[0]
    }
    
    if (this.eventManager) {
      this.eventManager.emit('input', { type: 'npc_behavior_executed', data: { npcId: npc.id, behavior: behavior.id } })
    }
  }

  // Enhanced Pet Behavior Methods
  public addPetBehaviorState(petId: string, personality: string[]): void {
    this.petPersonalities.set(petId, personality)
    this.petBehaviorStates.set(petId, {
      currentMood: 'happy',
      energyLevel: 100,
      hungerLevel: 0,
      socialNeed: 50,
      explorationDesire: 50,
      lastAction: 'idle',
      actionCooldown: 0
    })
  }

  public updatePetBehaviors(deltaTime: number): void {
    for (const [petId, state] of this.petBehaviorStates) {
      // Update pet state over time
      this.updatePetState(petId, state, deltaTime)
      
      // Select behavior based on current state
      const selectedBehavior = this.selectPetBehavior(petId, state)
      if (selectedBehavior) {
        this.executePetBehavior(petId, selectedBehavior, state)
      }
    }
  }

  private updatePetState(petId: string, state: PetBehaviorState, deltaTime: number): void {
    // Natural state changes over time
    state.energyLevel = Math.max(0, state.energyLevel - deltaTime * 0.01) // Energy decreases over time
    state.hungerLevel = Math.min(100, state.hungerLevel + deltaTime * 0.005) // Hunger increases over time
    state.socialNeed = Math.min(100, state.socialNeed + deltaTime * 0.003) // Social need increases over time
    state.explorationDesire = Math.min(100, state.explorationDesire + deltaTime * 0.002) // Exploration desire increases
    
    // Update mood based on state
    state.currentMood = this.calculatePetMood(state)
    
    // Reduce action cooldown
    state.actionCooldown = Math.max(0, state.actionCooldown - deltaTime)
  }

  private calculatePetMood(state: PetBehaviorState): PetBehaviorState['currentMood'] {
    if (state.energyLevel < 20) return 'tired'
    if (state.hungerLevel > 80) return 'hungry'
    if (state.socialNeed > 80) return 'scared'
    if (state.explorationDesire > 70) return 'curious'
    if (state.energyLevel > 70 && state.hungerLevel < 30) return 'playful'
    return 'happy'
  }

  private selectPetBehavior(petId: string, state: PetBehaviorState): AIBehavior | null {
    const personality = this.petPersonalities.get(petId) || []
    const validBehaviors = this.getValidPetBehaviors(state)
    
    if (validBehaviors.length === 0) return null
    
    // Sort by priority, mood match, and personality
    validBehaviors.sort((a, b) => {
      const priorityDiff = b.priority - a.priority
      if (Math.abs(priorityDiff) > 2) return priorityDiff
      
      const moodMatchA = this.calculateMoodMatch(a, state.currentMood)
      const moodMatchB = this.calculateMoodMatch(b, state.currentMood)
      if (Math.abs(moodMatchA - moodMatchB) > 0.1) return moodMatchB - moodMatchA
      
      const personalityMatchA = this.calculatePersonalityMatch(a.personality, personality)
      const personalityMatchB = this.calculatePersonalityMatch(b.personality, personality)
      return personalityMatchB - personalityMatchA
    })
    
    return validBehaviors[0]
  }

  private getValidPetBehaviors(state: PetBehaviorState): AIBehavior[] {
    const validBehaviors: AIBehavior[] = []
    const now = Date.now()
    
    for (const behavior of this.behaviors.values()) {
      if (!behavior.isActive) continue
      if (now - behavior.lastExecuted < behavior.cooldown) continue
      
      // Check if behavior is appropriate for current pet state
      if (this.isBehaviorAppropriateForPetState(behavior, state)) {
        validBehaviors.push(behavior)
      }
    }
    
    return validBehaviors
  }

  private isBehaviorAppropriateForPetState(behavior: AIBehavior, state: PetBehaviorState): boolean {
    // Check if behavior matches current mood and state
    if (state.currentMood === 'tired' && behavior.name.toLowerCase().includes('play')) return false
    if (state.currentMood === 'hungry' && !behavior.name.toLowerCase().includes('eat')) return false
    if (state.currentMood === 'scared' && behavior.name.toLowerCase().includes('explore')) return false
    
    return true
  }

  private executePetBehavior(petId: string, behavior: AIBehavior, state: PetBehaviorState): void {
    if (state.actionCooldown > 0) return
    
    state.lastAction = behavior.name
    state.actionCooldown = 5000 // 5 second cooldown
    
    // Execute the first action
    if (behavior.actions.length > 0) {
      this.currentAction = behavior.actions[0]
    }
    
    if (this.eventManager) {
      this.eventManager.emit('input', { type: 'pet_behavior_executed', data: { petId, behavior: behavior.id } })
    }
  }

  // Behavior Tree Methods
  public addBehaviorTree(id: string, tree: BehaviorNode): void {
    this.behaviorTrees.set(id, tree)
  }

  public updateBehaviorTrees(deltaTime: number): void {
    const now = Date.now()
    if (now - this.lastBehaviorUpdate < this.config.behaviorUpdateInterval) return
    
    this.lastBehaviorUpdate = now
    
    for (const [id, tree] of this.behaviorTrees) {
      this.evaluateBehaviorTree(tree)
    }
  }

  private evaluateBehaviorTree(node: BehaviorNode): boolean {
    switch (node.type) {
      case 'sequence':
        // All children must succeed
        if (node.children) {
          for (const child of node.children) {
            if (!this.evaluateBehaviorTree(child)) return false
          }
        }
        return true
        
      case 'selector':
        // At least one child must succeed
        if (node.children) {
          for (const child of node.children) {
            if (this.evaluateBehaviorTree(child)) return true
          }
        }
        return false
        
      case 'condition':
        return node.condition ? node.condition() : false
        
      case 'action':
        return node.action ? node.action() : false
        
      default:
        return false
    }
  }

  // Utility Methods
  private calculatePersonalityMatch(behaviorPersonality: string[], entityPersonality: string[]): number {
    if (behaviorPersonality.length === 0 || entityPersonality.length === 0) return 0
    
    const matches = behaviorPersonality.filter(trait => entityPersonality.includes(trait))
    return matches.length / Math.max(behaviorPersonality.length, entityPersonality.length)
  }

  private calculateMoodMatch(behavior: AIBehavior, mood: string): number {
    // Simple mood matching - could be enhanced with more sophisticated logic
    const moodKeywords = {
      'happy': ['play', 'happy', 'content'],
      'curious': ['explore', 'investigate', 'look'],
      'playful': ['play', 'chase', 'fetch'],
      'tired': ['rest', 'sleep', 'idle'],
      'hungry': ['eat', 'search', 'hunt'],
      'scared': ['hide', 'comfort', 'protect']
    }
    
    const keywords = moodKeywords[mood as keyof typeof moodKeywords] || []
    const behaviorName = behavior.name.toLowerCase()
    
    return keywords.some(keyword => behaviorName.includes(keyword)) ? 1.0 : 0.0
  }

  private evaluateBehaviorConditions(behavior: AIBehavior, context: any): boolean {
    for (const condition of behavior.conditions) {
      if (!this.evaluateCondition(condition, context)) return false
    }
    return true
  }

  private evaluateCondition(condition: BehaviorCondition, context: any): boolean {
    // Implementation of condition evaluation
    // This would check proximity, time, state, etc.
    return true // Simplified for now
  }

  // Public API for external systems
  public getNPCs(): NPC[] {
    return Array.from(this.npcs.values())
  }

  public getPetBehaviorState(petId: string): PetBehaviorState | undefined {
    return this.petBehaviorStates.get(petId)
  }

  public getBehaviorTrees(): Map<string, BehaviorNode> {
    return new Map(this.behaviorTrees)
  }
}

export interface AIConfig {
  maxMemories: number
  memoryDecayRate: number
  learningRate: number
  behaviorUpdateInterval: number
  maxActiveBehaviors: number
}

// BehaviorNode interface is defined above 

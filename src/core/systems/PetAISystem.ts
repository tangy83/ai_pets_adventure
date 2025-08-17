import { BaseSystem } from './BaseSystem'
import { EventManager } from '../EventManager'

// ============================================================================
// PET AI ARCHITECTURE - PHASE 3.1 IMPLEMENTATION
// ============================================================================

export interface PetAIState {
  id: string
  currentBehavior: string
  mood: 'idle' | 'exploration' | 'puzzle_solving' | 'combat' | 'social'
  energy: number
  hunger: number
  socialNeed: number
  explorationDesire: number
  lastAction: string
  actionCooldown: number
  personality: PetPersonality
  skills: PetSkills
  memory: PetMemory[]
  context: EnvironmentContext
}

export interface PetPersonality {
  traits: string[]
  adaptability: number // 0-100
  curiosity: number // 0-100
  sociability: number // 0-100
  independence: number // 0-100
  learningRate: number // 0-100
}

export interface PetSkills {
  abilities: Map<string, SkillAbility>
  cooldowns: Map<string, number>
  experience: Map<string, number>
  maxLevel: number
}

export interface SkillAbility {
  id: string
  name: string
  type: 'combat' | 'puzzle' | 'social' | 'exploration' | 'utility'
  cooldown: number
  energyCost: number
  successRate: number
  level: number
  description: string
}

export interface PetMemory {
  id: string
  type: 'interaction' | 'location' | 'event' | 'skill' | 'player_preference'
  data: any
  timestamp: number
  importance: number // 0-100
  decayRate: number // How fast memory fades
  context: string
  emotionalValue: number // -100 to 100
}

export interface EnvironmentContext {
  currentLocation: string
  nearbyEntities: string[]
  availableInteractions: string[]
  dangerLevel: number // 0-100
  resourceAvailability: number // 0-100
  socialOpportunities: number // 0-100
  puzzleComplexity: number // 0-100
}

// ============================================================================
// BEHAVIOR TREE SYSTEM
// ============================================================================

export interface BehaviorTreeNode {
  id: string
  type: 'sequence' | 'selector' | 'action' | 'condition' | 'decorator'
  name: string
  children?: BehaviorTreeNode[]
  action?: () => Promise<BehaviorResult>
  condition?: () => Promise<boolean>
  decorator?: (node: BehaviorTreeNode) => BehaviorResult
  priority: number
  isActive: boolean
  lastExecuted: number
  cooldown: number
}

export interface BehaviorResult {
  success: boolean
  status: 'running' | 'success' | 'failure' | 'error'
  data?: any
  message?: string
}

export enum BehaviorStatus {
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILURE = 'failure',
  ERROR = 'error'
}

// ============================================================================
// MEMORY SYSTEM
// ============================================================================

export interface MemorySystem {
  addMemory(memory: PetMemory): void
  getMemories(type?: string, context?: string): PetMemory[]
  getRelevantMemories(context: string, limit?: number): PetMemory[]
  updateMemory(id: string, updates: Partial<PetMemory>): void
  decayMemories(): void
  getMemoryByImportance(limit?: number): PetMemory[]
}

// ============================================================================
// SKILL MANAGER
// ============================================================================

export interface SkillManager {
  addSkill(skill: SkillAbility): void
  getSkill(id: string): SkillAbility | undefined
  canUseSkill(skillId: string): boolean
  useSkill(skillId: string): boolean
  updateSkillExperience(skillId: string, experience: number): void
  getAvailableSkills(): SkillAbility[]
  getSkillsByType(type: string): SkillAbility[]
}

// ============================================================================
// CONTEXT ANALYZER
// ============================================================================

export interface ContextAnalyzer {
  analyzeEnvironment(petState: PetAIState): EnvironmentContext
  getBestAction(context: EnvironmentContext, petState: PetAIState): string
  calculateDangerLevel(location: string, entities: string[]): number
  identifyOpportunities(context: EnvironmentContext): string[]
  assessSocialSituations(context: EnvironmentContext): string[]
}

// ============================================================================
// LEARNING MODULE
// ============================================================================

export interface LearningModule {
  recordExperience(input: any, output: any, reward: number): void
  learnFromSuccess(action: string, context: string): void
  learnFromFailure(action: string, context: string): void
  adaptBehavior(petState: PetAIState, context: EnvironmentContext): void
  getLearningProgress(): LearningProgress
  resetLearning(): void
}

export interface LearningProgress {
  totalExperiences: number
  successRate: number
  adaptationLevel: number
  recentImprovements: string[]
  learningEfficiency: number
}

// ============================================================================
// MAIN PET AI SYSTEM
// ============================================================================

export class PetAISystem extends BaseSystem {
  private pets: Map<string, PetAIState> = new Map()
  private behaviorTrees: Map<string, BehaviorTreeNode> = new Map()
  private memorySystems: Map<string, MemorySystem> = new Map()
  private skillManagers: Map<string, SkillManager> = new Map()
  private contextAnalyzers: Map<string, ContextAnalyzer> = new Map()
  private learningModules: Map<string, LearningModule> = new Map()
  
  private defaultBehaviors: Map<string, BehaviorTreeNode> = new Map()
  private globalConfig: PetAIConfig

  constructor(eventManager: EventManager, config?: Partial<PetAIConfig>) {
    super('pet-ai', 80)
    this.eventManager = eventManager
    this.globalConfig = {
      maxMemorySize: 1000,
      memoryDecayRate: 0.1,
      learningEnabled: true,
      behaviorUpdateInterval: 100,
      skillCooldownMultiplier: 1.0,
      ...config
    }
    
    this.initializeDefaultBehaviors()
  }

  // ============================================================================
  // INITIALIZATION & SETUP
  // ============================================================================

  private initializeDefaultBehaviors(): void {
    // Idle Behavior
    this.defaultBehaviors.set('idle', {
      id: 'idle',
      type: 'selector',
      name: 'Idle Behavior',
      priority: 1,
      isActive: true,
      lastExecuted: 0,
      cooldown: 0,
      children: [
        {
          id: 'respond_to_player',
          type: 'action',
          name: 'Respond to Player',
          priority: 10,
          isActive: true,
          lastExecuted: 0,
          cooldown: 0,
          action: async () => ({ success: true, status: BehaviorStatus.SUCCESS, data: 'responded_to_player' })
        },
        {
          id: 'rest_and_recover',
          type: 'action',
          name: 'Rest and Recover',
          priority: 5,
          isActive: true,
          lastExecuted: 0,
          cooldown: 5000,
          action: async () => ({ success: true, status: BehaviorStatus.SUCCESS, data: 'rested' })
        }
      ]
    })

    // Exploration Behavior
    this.defaultBehaviors.set('exploration', {
      id: 'exploration',
      type: 'sequence',
      name: 'Exploration Behavior',
      priority: 8,
      isActive: true,
      lastExecuted: 0,
      cooldown: 0,
      children: [
        {
          id: 'scan_environment',
          type: 'action',
          name: 'Scan Environment',
          priority: 9,
          isActive: true,
          lastExecuted: 0,
          cooldown: 0,
          action: async () => ({ success: true, status: BehaviorStatus.SUCCESS, data: 'environment_scanned' })
        },
        {
          id: 'move_to_interesting_location',
          type: 'action',
          name: 'Move to Interesting Location',
          priority: 8,
          isActive: true,
          lastExecuted: 0,
          cooldown: 0,
          action: async () => ({ success: true, status: BehaviorStatus.SUCCESS, data: 'moved_to_location' })
        }
      ]
    })

    // Puzzle Solving Behavior
    this.defaultBehaviors.set('puzzle_solving', {
      id: 'puzzle_solving',
      type: 'sequence',
      name: 'Puzzle Solving Behavior',
      priority: 9,
      isActive: true,
      lastExecuted: 0,
      cooldown: 0,
      children: [
        {
          id: 'analyze_puzzle',
          type: 'action',
          name: 'Analyze Puzzle',
          priority: 10,
          isActive: true,
          lastExecuted: 0,
          cooldown: 0,
          action: async () => ({ success: true, status: BehaviorStatus.SUCCESS, data: 'puzzle_analyzed' })
        },
        {
          id: 'attempt_solution',
          type: 'action',
          name: 'Attempt Solution',
          priority: 9,
          isActive: true,
          lastExecuted: 0,
          cooldown: 0,
          action: async () => ({ success: true, status: BehaviorStatus.SUCCESS, data: 'solution_attempted' })
        }
      ]
    })

    // Combat Behavior
    this.defaultBehaviors.set('combat', {
      id: 'combat',
      type: 'selector',
      name: 'Combat Behavior',
      priority: 10,
      isActive: true,
      lastExecuted: 0,
      cooldown: 0,
      children: [
        {
          id: 'assess_threat',
          type: 'action',
          name: 'Assess Threat',
          priority: 10,
          isActive: true,
          lastExecuted: 0,
          cooldown: 0,
          action: async () => ({ success: true, status: BehaviorStatus.SUCCESS, data: 'threat_assessed' })
        },
        {
          id: 'engage_combat',
          type: 'action',
          name: 'Engage Combat',
          priority: 9,
          isActive: true,
          lastExecuted: 0,
          cooldown: 0,
          action: async () => ({ success: true, status: BehaviorStatus.SUCCESS, data: 'combat_engaged' })
        },
        {
          id: 'retreat_if_needed',
          type: 'action',
          name: 'Retreat if Needed',
          priority: 8,
          isActive: true,
          lastExecuted: 0,
          cooldown: 0,
          action: async () => ({ success: true, status: BehaviorStatus.SUCCESS, data: 'retreated' })
        }
      ]
    })

    // Social Behavior
    this.defaultBehaviors.set('social', {
      id: 'social',
      type: 'sequence',
      name: 'Social Behavior',
      priority: 7,
      isActive: true,
      lastExecuted: 0,
      cooldown: 0,
      children: [
        {
          id: 'identify_social_opportunities',
          type: 'action',
          name: 'Identify Social Opportunities',
          priority: 8,
          isActive: true,
          lastExecuted: 0,
          cooldown: 0,
          action: async () => ({ success: true, status: BehaviorStatus.SUCCESS, data: 'social_opportunities_identified' })
        },
        {
          id: 'initiate_interaction',
          type: 'action',
          name: 'Initiate Interaction',
          priority: 7,
          isActive: true,
          lastExecuted: 0,
          cooldown: 0,
          action: async () => ({ success: true, status: BehaviorStatus.SUCCESS, data: 'interaction_initiated' })
        }
      ]
    })
  }

  // ============================================================================
  // PET MANAGEMENT
  // ============================================================================

  public registerPet(petId: string, config: Partial<PetAIState>): void {
    const defaultState: PetAIState = {
      id: petId,
      currentBehavior: 'idle',
      mood: 'idle',
      energy: 100,
      hunger: 0,
      socialNeed: 50,
      explorationDesire: 50,
      lastAction: '',
      actionCooldown: 0,
      personality: {
        traits: ['friendly', 'curious'],
        adaptability: 70,
        curiosity: 80,
        sociability: 75,
        independence: 60,
        learningRate: 75
      },
      skills: {
        abilities: new Map(),
        cooldowns: new Map(),
        experience: new Map(),
        maxLevel: 10
      },
      memory: [],
      context: {
        currentLocation: 'unknown',
        nearbyEntities: [],
        availableInteractions: [],
        dangerLevel: 0,
        resourceAvailability: 50,
        socialOpportunities: 50,
        puzzleComplexity: 30
      },
      ...config
    }

    this.pets.set(petId, defaultState)
    this.memorySystems.set(petId, new PetMemorySystem(petId, this.globalConfig))
    this.skillManagers.set(petId, new PetSkillManager(petId, this.globalConfig))
    this.contextAnalyzers.set(petId, new PetContextAnalyzer(petId, this.globalConfig))
    this.learningModules.set(petId, new PetLearningModule(petId, this.globalConfig))
    
    // Set default behavior tree
    this.behaviorTrees.set(petId, this.createPetBehaviorTree(petId))

    this.log('info', `Pet ${petId} registered with AI system`)
    this.eventManager.emit('pet:ai:registered', { petId, timestamp: Date.now() })
  }

  private createPetBehaviorTree(petId: string): BehaviorTreeNode {
    const pet = this.pets.get(petId)
    if (!pet) throw new Error(`Pet ${petId} not found`)

    // Create a root selector that chooses the best behavior based on context
    return {
      id: 'root',
      type: 'selector',
      name: 'Root Behavior Selector',
      priority: 0,
      isActive: true,
      lastExecuted: 0,
      cooldown: 0,
      children: [
        this.defaultBehaviors.get('combat')!,
        this.defaultBehaviors.get('puzzle_solving')!,
        this.defaultBehaviors.get('exploration')!,
        this.defaultBehaviors.get('social')!,
        this.defaultBehaviors.get('idle')!
      ]
    }
  }

  // ============================================================================
  // BEHAVIOR TREE EXECUTION
  // ============================================================================

  public async executeBehaviorTree(petId: string): Promise<BehaviorResult> {
    const pet = this.pets.get(petId)
    const behaviorTree = this.behaviorTrees.get(petId)
    
    if (!pet || !behaviorTree) {
      return { success: false, status: BehaviorStatus.ERROR, message: 'Pet or behavior tree not found' }
    }

    try {
      // Update context before execution
      const contextAnalyzer = this.contextAnalyzers.get(petId)
      if (contextAnalyzer) {
        pet.context = contextAnalyzer.analyzeEnvironment(pet)
      }

      // Execute the behavior tree
      const result = await this.executeNode(behaviorTree, pet)
      
      // Update pet state based on result
      if (result.success) {
        pet.lastAction = result.data || 'unknown'
        pet.actionCooldown = 0
      }

      // Emit behavior execution event
      this.eventManager.emit('pet:ai:behavior:executed', {
        petId,
        behavior: result.data,
        success: result.success,
        timestamp: Date.now()
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log('error', `Error executing behavior tree for pet ${petId}: ${errorMessage}`)
      return { success: false, status: BehaviorStatus.ERROR, message: errorMessage }
    }
  }

  private async executeNode(node: BehaviorTreeNode, pet: PetAIState): Promise<BehaviorResult> {
    // Check cooldown
    if (Date.now() - node.lastExecuted < node.cooldown) {
      return { success: false, status: BehaviorStatus.FAILURE, message: 'Node on cooldown' }
    }

    // Update last executed
    node.lastExecuted = Date.now()

    switch (node.type) {
      case 'sequence':
        return await this.executeSequence(node, pet)
      case 'selector':
        return await this.executeSelector(node, pet)
      case 'action':
        return await this.executeAction(node, pet)
      case 'condition':
        return await this.executeCondition(node, pet)
      case 'decorator':
        return await this.executeDecorator(node, pet)
      default:
        return { success: false, status: BehaviorStatus.ERROR, message: 'Unknown node type' }
    }
  }

  private async executeSequence(node: BehaviorTreeNode, pet: PetAIState): Promise<BehaviorResult> {
    if (!node.children) {
      return { success: false, status: BehaviorStatus.ERROR, message: 'Sequence node has no children' }
    }

    for (const child of node.children) {
      const result = await this.executeNode(child, pet)
      if (!result.success) {
        return result
      }
    }

    return { success: true, status: BehaviorStatus.SUCCESS, data: 'sequence_completed' }
  }

  private async executeSelector(node: BehaviorTreeNode, pet: PetAIState): Promise<BehaviorResult> {
    if (!node.children) {
      return { success: false, status: BehaviorStatus.ERROR, message: 'Selector node has no children' }
    }

    // Sort children by priority
    const sortedChildren = [...node.children].sort((a, b) => b.priority - a.priority)

    for (const child of sortedChildren) {
      const result = await this.executeNode(child, pet)
      if (result.success) {
        return result
      }
    }

    return { success: false, status: BehaviorStatus.FAILURE, message: 'All selector children failed' }
  }

  private async executeAction(node: BehaviorTreeNode, pet: PetAIState): Promise<BehaviorResult> {
    if (!node.action) {
      return { success: false, status: BehaviorStatus.ERROR, message: 'Action node has no action' }
    }

    try {
      return await node.action()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, status: BehaviorStatus.ERROR, message: errorMessage }
    }
  }

  private async executeCondition(node: BehaviorTreeNode, pet: PetAIState): Promise<BehaviorResult> {
    if (!node.condition) {
      return { success: false, status: BehaviorStatus.ERROR, message: 'Condition node has no condition' }
    }

    try {
      const result = await node.condition()
      return { 
        success: result, 
        status: result ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE,
        data: result ? 'condition_met' : 'condition_failed'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, status: BehaviorStatus.ERROR, message: errorMessage }
    }
  }

  private async executeDecorator(node: BehaviorTreeNode, pet: PetAIState): Promise<BehaviorResult> {
    if (!node.decorator) {
      return { success: false, status: BehaviorStatus.ERROR, message: 'Decorator node has no decorator' }
    }

    try {
      return node.decorator(node)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, status: BehaviorStatus.ERROR, message: errorMessage }
    }
  }

  // ============================================================================
  // SYSTEM UPDATE
  // ============================================================================

  public update(deltaTime: number): void {
    // Update all pets
    for (const [petId, pet] of this.pets) {
      try {
        // Update pet state
        this.updatePetState(pet, deltaTime)
        
        // Execute behavior tree if ready
        if (Date.now() - pet.actionCooldown > 0) {
          this.executeBehaviorTree(petId).catch(error => {
            this.log('error', `Error updating pet ${petId}: ${error}`)
          })
        }
      } catch (error) {
        this.log('error', `Error updating pet ${petId}: ${error}`)
      }
    }
  }

  private updatePetState(pet: PetAIState, deltaTime: number): void {
    // Natural state changes
    pet.energy = Math.max(0, pet.energy - deltaTime * 0.1) // Energy decreases over time
    pet.hunger = Math.min(100, pet.hunger + deltaTime * 0.05) // Hunger increases over time
    pet.socialNeed = Math.min(100, pet.socialNeed + deltaTime * 0.03) // Social need increases
    pet.explorationDesire = Math.min(100, pet.explorationDesire + deltaTime * 0.02) // Exploration desire increases

    // Update action cooldown
    if (pet.actionCooldown > 0) {
      pet.actionCooldown = Math.max(0, pet.actionCooldown - deltaTime)
    }

    // Emit state update event
    this.eventManager.emit('pet:ai:state:updated', {
      petId: pet.id,
      state: pet,
      timestamp: Date.now()
    })
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  public getPetState(petId: string): PetAIState | undefined {
    return this.pets.get(petId)
  }

  public updatePetBehavior(petId: string, behavior: string): void {
    const pet = this.pets.get(petId)
    if (pet) {
      pet.currentBehavior = behavior
      this.eventManager.emit('pet:ai:behavior:changed', {
        petId,
        behavior,
        timestamp: Date.now()
      })
    }
  }

  public addPetSkill(petId: string, skill: SkillAbility): void {
    const skillManager = this.skillManagers.get(petId)
    if (skillManager) {
      skillManager.addSkill(skill)
      this.eventManager.emit('pet:ai:skill:added', {
        petId,
        skill,
        timestamp: Date.now()
      })
    }
  }

  public getPetMemories(petId: string, type?: string): PetMemory[] {
    const memorySystem = this.memorySystems.get(petId)
    return memorySystem ? memorySystem.getMemories(type) : []
  }

  public forceBehaviorExecution(petId: string): void {
    this.executeBehaviorTree(petId).catch(error => {
      this.log('error', `Error in forced behavior execution for pet ${petId}: ${error}`)
    })
  }

  // ============================================================================
  // SYSTEM CLEANUP
  // ============================================================================

  public destroy(): void {
    // Clean up all pets
    for (const petId of this.pets.keys()) {
      this.eventManager.emit('pet:ai:destroyed', { petId, timestamp: Date.now() })
    }

    this.pets.clear()
    this.behaviorTrees.clear()
    this.memorySystems.clear()
    this.skillManagers.clear()
    this.contextAnalyzers.clear()
    this.learningModules.clear()

    super.destroy()
  }
}

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

export interface PetAIConfig {
  maxMemorySize: number
  memoryDecayRate: number
  learningEnabled: boolean
  behaviorUpdateInterval: number
  skillCooldownMultiplier: number
}

// ============================================================================
// IMPLEMENTATION CLASSES (to be implemented in separate files)
// ============================================================================

export class PetMemorySystem implements MemorySystem {
  constructor(private petId: string, private config: PetAIConfig) {}
  
  addMemory(memory: PetMemory): void { /* Implementation */ }
  getMemories(type?: string, context?: string): PetMemory[] { return [] }
  getRelevantMemories(context: string, limit?: number): PetMemory[] { return [] }
  updateMemory(id: string, updates: Partial<PetMemory>): void { /* Implementation */ }
  decayMemories(): void { /* Implementation */ }
  getMemoryByImportance(limit?: number): PetMemory[] { return [] }
}

export class PetSkillManager implements SkillManager {
  constructor(private petId: string, private config: PetAIConfig) {}
  
  addSkill(skill: SkillAbility): void { /* Implementation */ }
  getSkill(id: string): SkillAbility | undefined { return undefined }
  canUseSkill(skillId: string): boolean { return false }
  useSkill(skillId: string): boolean { return false }
  updateSkillExperience(skillId: string, experience: number): void { /* Implementation */ }
  getAvailableSkills(): SkillAbility[] { return [] }
  getSkillsByType(type: string): SkillAbility[] { return [] }
}

export class PetContextAnalyzer implements ContextAnalyzer {
  constructor(private petId: string, private config: PetAIConfig) {}
  
  analyzeEnvironment(petState: PetAIState): EnvironmentContext { return petState.context }
  getBestAction(context: EnvironmentContext, petState: PetAIState): string { return 'idle' }
  calculateDangerLevel(location: string, entities: string[]): number { return 0 }
  identifyOpportunities(context: EnvironmentContext): string[] { return [] }
  assessSocialSituations(context: EnvironmentContext): string[] { return [] }
}

export class PetLearningModule implements LearningModule {
  constructor(private petId: string, private config: PetAIConfig) {}
  
  recordExperience(input: any, output: any, reward: number): void { /* Implementation */ }
  learnFromSuccess(action: string, context: string): void { /* Implementation */ }
  learnFromFailure(action: string, context: string): void { /* Implementation */ }
  adaptBehavior(petState: PetAIState, context: EnvironmentContext): void { /* Implementation */ }
  getLearningProgress(): LearningProgress { return { totalExperiences: 0, successRate: 0, adaptationLevel: 0, recentImprovements: [], learningEfficiency: 0 } }
  resetLearning(): void { /* Implementation */ }
}

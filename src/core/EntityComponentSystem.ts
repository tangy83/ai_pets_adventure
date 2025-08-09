import { EventManager } from './EventManager'

// Component interface - all components must implement this
export interface Component {
  readonly type: string
  entityId: string
}

// Entity interface - represents a game object
export interface Entity {
  id: string
  name: string
  active: boolean
  tags: string[]
  components: Map<string, Component>
}

// System interface for ECS
export interface ECSSystem {
  name: string
  priority: number
  requiredComponents: string[]
  update(entities: Entity[], deltaTime: number): void
  initialize?(): void
  destroy?(): void
}

// Component types for common game objects
export class PositionComponent implements Component {
  readonly type = 'position'
  entityId: string
  x: number
  y: number
  z: number

  constructor(entityId: string, x: number = 0, y: number = 0, z: number = 0) {
    this.entityId = entityId
    this.x = x
    this.y = y
    this.z = z
  }
}

export class RenderableComponent implements Component {
  readonly type = 'renderable'
  entityId: string
  spriteId: string
  visible: boolean
  layer: number
  alpha: number

  constructor(entityId: string, spriteId: string, layer: number = 0) {
    this.entityId = entityId
    this.spriteId = spriteId
    this.visible = true
    this.layer = layer
    this.alpha = 1.0
  }
}

export class HealthComponent implements Component {
  readonly type = 'health'
  entityId: string
  current: number
  maximum: number
  regeneration: number

  constructor(entityId: string, maximum: number = 100, regeneration: number = 0) {
    this.entityId = entityId
    this.current = maximum
    this.maximum = maximum
    this.regeneration = regeneration
  }
}

export class AIComponent implements Component {
  readonly type = 'ai'
  entityId: string
  behaviorTree: string
  memory: Map<string, any>
  lastDecision: number

  constructor(entityId: string, behaviorTree: string = 'default') {
    this.entityId = entityId
    this.behaviorTree = behaviorTree
    this.memory = new Map()
    this.lastDecision = 0
  }
}

export class PhysicsComponent implements Component {
  readonly type = 'physics'
  entityId: string
  velocity: { x: number; y: number; z: number }
  acceleration: { x: number; y: number; z: number }
  mass: number
  friction: number
  gravity: boolean

  constructor(entityId: string, mass: number = 1.0) {
    this.entityId = entityId
    this.velocity = { x: 0, y: 0, z: 0 }
    this.acceleration = { x: 0, y: 0, z: 0 }
    this.mass = mass
    this.friction = 0.1
    this.gravity = true
  }
}

export class QuestComponent implements Component {
  readonly type = 'quest'
  entityId: string
  questId: string
  objectives: string[]
  progress: Map<string, number>
  completed: boolean

  constructor(entityId: string, questId: string, objectives: string[] = []) {
    this.entityId = entityId
    this.questId = questId
    this.objectives = objectives
    this.progress = new Map()
    this.completed = false
  }
}

export class InventoryComponent implements Component {
  readonly type = 'inventory'
  entityId: string
  items: Map<string, number> // itemId -> quantity
  maxCapacity: number
  weight: number
  maxWeight: number

  constructor(entityId: string, maxCapacity: number = 20, maxWeight: number = 100) {
    this.entityId = entityId
    this.items = new Map()
    this.maxCapacity = maxCapacity
    this.weight = 0
    this.maxWeight = maxWeight
  }

  addItem(itemId: string, quantity: number = 1): boolean {
    const currentQuantity = this.items.get(itemId) || 0
    const newQuantity = currentQuantity + quantity
    
    if (this.items.size >= this.maxCapacity && !this.items.has(itemId)) {
      return false // Inventory full
    }
    
    this.items.set(itemId, newQuantity)
    return true
  }

  removeItem(itemId: string, quantity: number = 1): boolean {
    const currentQuantity = this.items.get(itemId) || 0
    if (currentQuantity < quantity) return false
    
    const newQuantity = currentQuantity - quantity
    if (newQuantity <= 0) {
      this.items.delete(itemId)
    } else {
      this.items.set(itemId, newQuantity)
    }
    return true
  }

  hasItem(itemId: string, quantity: number = 1): boolean {
    const currentQuantity = this.items.get(itemId) || 0
    return currentQuantity >= quantity
  }

  getItemCount(itemId: string): number {
    return this.items.get(itemId) || 0
  }

  getTotalItems(): number {
    return Array.from(this.items.values()).reduce((sum, count) => sum + count, 0)
  }
}

export class SkillComponent implements Component {
  readonly type = 'skill'
  entityId: string
  skills: Map<string, SkillData>
  skillPoints: number
  maxSkillPoints: number

  constructor(entityId: string, maxSkillPoints: number = 100) {
    this.entityId = entityId
    this.skills = new Map()
    this.skillPoints = maxSkillPoints
    this.maxSkillPoints = maxSkillPoints
  }

  addSkill(skillId: string, level: number = 1, maxLevel: number = 10): boolean {
    if (this.skills.has(skillId)) return false
    
    this.skills.set(skillId, {
      id: skillId,
      level,
      maxLevel,
      experience: 0,
      experienceToNext: 100,
      cooldown: 0,
      lastUsed: 0
    })
    return true
  }

  levelUpSkill(skillId: string): boolean {
    const skill = this.skills.get(skillId)
    if (!skill || skill.level >= skill.maxLevel) return false
    
    skill.level++
    skill.experience = 0
    skill.experienceToNext = Math.floor(skill.experienceToNext * 1.5)
    return true
  }

  useSkill(skillId: string): boolean {
    const skill = this.skills.get(skillId)
    if (!skill) return false
    
    const now = Date.now()
    if (now - skill.lastUsed < skill.cooldown) return false
    
    skill.lastUsed = now
    return true
  }

  getSkillLevel(skillId: string): number {
    const skill = this.skills.get(skillId)
    return skill ? skill.level : 0
  }
}

interface SkillData {
  id: string
  level: number
  maxLevel: number
  experience: number
  experienceToNext: number
  cooldown: number
  lastUsed: number
}

export class AnimationComponent implements Component {
  readonly type = 'animation'
  entityId: string
  currentAnimation: string | null
  animations: Map<string, AnimationData>
  frameRate: number
  currentFrame: number
  frameTime: number
  elapsedTime: number
  isLooping: boolean
  isPlaying: boolean

  constructor(entityId: string, frameRate: number = 12) {
    this.entityId = entityId
    this.currentAnimation = null
    this.animations = new Map()
    this.frameRate = frameRate
    this.currentFrame = 0
    this.frameTime = 1000 / frameRate
    this.elapsedTime = 0
    this.isLooping = true
    this.isPlaying = false
  }

  addAnimation(name: string, frames: string[], duration: number, loop: boolean = true): void {
    this.animations.set(name, {
      name,
      frames,
      duration,
      loop,
      frameCount: frames.length
    })
  }

  playAnimation(name: string, loop?: boolean): boolean {
    const animation = this.animations.get(name)
    if (!animation) return false
    
    this.currentAnimation = name
    this.currentFrame = 0
    this.elapsedTime = 0
    // Use the loop parameter if provided, otherwise use the animation's loop setting
    this.isLooping = loop !== undefined ? loop : animation.loop
    this.isPlaying = true
    return true
  }

  stopAnimation(): void {
    this.isPlaying = false
    this.currentFrame = 0
    this.elapsedTime = 0
    this.currentAnimation = null
  }

  pauseAnimation(): void {
    this.isPlaying = false
  }

  resumeAnimation(): void {
    this.isPlaying = true
  }

  getCurrentFrame(): string | null {
    if (!this.currentAnimation) return null
    const animation = this.animations.get(this.currentAnimation)
    if (!animation) return null
    return animation.frames[this.currentFrame] || null
  }

  update(deltaTime: number): void {
    if (!this.isPlaying || !this.currentAnimation) return
    
    const animation = this.animations.get(this.currentAnimation)
    if (!animation) return
    
    this.elapsedTime += deltaTime
    
    if (this.elapsedTime >= this.frameTime) {
      this.currentFrame++
      this.elapsedTime = 0
      
      if (this.currentFrame >= animation.frameCount) {
        if (this.isLooping) {
          this.currentFrame = 0
        } else {
          this.stopAnimation()
        }
      }
    }
  }
}

interface AnimationData {
  name: string
  frames: string[]
  duration: number
  loop: boolean
  frameCount: number
}

export class InteractionComponent implements Component {
  readonly type = 'interaction'
  entityId: string
  interactable: boolean
  interactionRange: number
  interactionType: string
  interactionData: Map<string, any>
  cooldown: number
  lastInteraction: number

  constructor(entityId: string, interactionType: string = 'basic', interactionRange: number = 50) {
    this.entityId = entityId
    this.interactable = true
    this.interactionRange = interactionRange
    this.interactionType = interactionType
    this.interactionData = new Map()
    this.cooldown = 1000
    this.lastInteraction = 0
  }

  canInteract(): boolean {
    if (!this.interactable) return false
    const now = Date.now()
    return now - this.lastInteraction >= this.cooldown
  }

  interact(interactorId: string, data?: any): boolean {
    if (!this.canInteract()) return false
    
    this.lastInteraction = Date.now()
    this.interactionData.set('lastInteractor', interactorId)
    this.interactionData.set('lastInteractionTime', this.lastInteraction)
    
    if (data) {
      this.interactionData.set('lastInteractionData', data)
    }
    
    return true
  }

  setInteractionData(key: string, value: any): void {
    this.interactionData.set(key, value)
  }

  getInteractionData(key: string): any {
    return this.interactionData.get(key)
  }

  setInteractable(interactable: boolean): void {
    this.interactable = interactable
  }

  setInteractionRange(range: number): void {
    this.interactionRange = range
  }

  setCooldown(cooldown: number): void {
    this.cooldown = cooldown
  }
}

// Entity Manager - manages all entities in the game
export class EntityManager {
  private entities: Map<string, Entity> = new Map()
  private entityCounter: number = 0
  private eventManager: EventManager

  constructor(eventManager: EventManager) {
    this.eventManager = eventManager
  }

  public createEntity(name: string, tags: string[] = []): Entity {
    const id = `entity_${++this.entityCounter}`
    const entity: Entity = {
      id,
      name,
      active: true,
      tags,
      components: new Map()
    }
    
    this.entities.set(id, entity)
    this.eventManager.emit('entityCreated', { entityId: id, name, tags })
    
    return entity
  }

  public destroyEntity(entityId: string): boolean {
    const entity = this.entities.get(entityId)
    if (!entity) return false

    // Clean up components
    entity.components.clear()
    this.entities.delete(entityId)
    
    this.eventManager.emit('entityDestroyed', { entityId })
    return true
  }

  public getEntity(entityId: string): Entity | undefined {
    return this.entities.get(entityId)
  }

  public getAllEntities(): Entity[] {
    return Array.from(this.entities.values())
  }

  public getEntitiesWithComponent(componentType: string): Entity[] {
    return Array.from(this.entities.values()).filter(entity => 
      entity.components.has(componentType)
    )
  }

  public getEntitiesWithTag(tag: string): Entity[] {
    return Array.from(this.entities.values()).filter(entity => 
      entity.tags.includes(tag)
    )
  }

  public addComponent(entityId: string, component: Component): boolean {
    const entity = this.entities.get(entityId)
    if (!entity) return false

    entity.components.set(component.type, component)
    this.eventManager.emit('componentAdded', { entityId, componentType: component.type })
    return true
  }

  public removeComponent(entityId: string, componentType: string): boolean {
    const entity = this.entities.get(entityId)
    if (!entity) return false

    const removed = entity.components.delete(componentType)
    if (removed) {
      this.eventManager.emit('componentRemoved', { entityId, componentType })
    }
    return removed
  }

  public getComponent<T extends Component>(entityId: string, componentType: string): T | undefined {
    const entity = this.entities.get(entityId)
    return entity?.components.get(componentType) as T | undefined
  }

  public hasComponent(entityId: string, componentType: string): boolean {
    const entity = this.entities.get(entityId)
    return entity?.components.has(componentType) || false
  }

  public getEntityCount(): number {
    return this.entities.size
  }

  public getActiveEntityCount(): number {
    return Array.from(this.entities.values()).filter(e => e.active).length
  }

  public clear(): void {
    this.entities.clear()
    this.entityCounter = 0
    this.eventManager.emit('entitiesCleared', {})
  }
}

// ECS System Manager - manages all ECS systems
export class ECSSystemManager {
  private systems: Map<string, ECSSystem> = new Map()
  private systemOrder: string[] = []
  private entityManager: EntityManager
  private eventManager: EventManager

  constructor(entityManager: EntityManager, eventManager: EventManager) {
    this.entityManager = entityManager
    this.eventManager = eventManager
  }

  public addSystem(system: ECSSystem): void {
    if (this.systems.has(system.name)) {
      console.warn(`System ${system.name} already exists, replacing it`)
      this.removeSystem(system.name)
    }

    this.systems.set(system.name, system)
    this.rebuildSystemOrder()

    if (system.initialize) {
      system.initialize()
    }

    this.eventManager.emit('systemAdded', { systemName: system.name })
  }

  public removeSystem(systemName: string): boolean {
    const system = this.systems.get(systemName)
    if (!system) return false

    if (system.destroy) {
      system.destroy()
    }

    this.systems.delete(systemName)
    this.rebuildSystemOrder()
    
    this.eventManager.emit('systemRemoved', { systemName })
    return true
  }

  public getSystem(systemName: string): ECSSystem | undefined {
    return this.systems.get(systemName)
  }

  public getAllSystems(): ECSSystem[] {
    return Array.from(this.systems.values())
  }

  public updateSystems(deltaTime: number): void {
    for (const systemName of this.systemOrder) {
      const system = this.systems.get(systemName)
      if (!system) continue

      try {
        const entities = this.getEntitiesForSystem(system)
        system.update(entities, deltaTime)
      } catch (error) {
        console.error(`Error updating system ${systemName}:`, error)
        this.eventManager.emit('systemError', { systemName, error: error.message })
      }
    }
  }

  private getEntitiesForSystem(system: ECSSystem): Entity[] {
    if (system.requiredComponents.length === 0) {
      return this.entityManager.getAllEntities()
    }

    return this.entityManager.getAllEntities().filter(entity => 
      system.requiredComponents.every(componentType => 
        this.entityManager.hasComponent(entity.id, componentType)
      )
    )
  }

  private rebuildSystemOrder(): void {
    const systems = Array.from(this.systems.values())
    
    // Sort by priority (higher priority = lower number = runs first)
    systems.sort((a, b) => a.priority - b.priority)
    
    this.systemOrder = systems.map(s => s.name)
  }

  public getSystemCount(): number {
    return this.systems.size
  }

  public clear(): void {
    for (const system of this.systems.values()) {
      if (system.destroy) {
        system.destroy()
      }
    }
    
    this.systems.clear()
    this.systemOrder = []
    this.eventManager.emit('systemsCleared', {})
  }
}

// Factory for creating common entity types
export class EntityFactory {
  private entityManager: EntityManager

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager
  }

  public createPlayer(name: string, x: number = 0, y: number = 0): Entity {
    const entity = this.entityManager.createEntity(name, ['player', 'controllable'])
    
    this.entityManager.addComponent(entity.id, new PositionComponent(entity.id, x, y))
    this.entityManager.addComponent(entity.id, new RenderableComponent(entity.id, 'player_sprite', 1))
    this.entityManager.addComponent(entity.id, new HealthComponent(entity.id, 100, 1))
    this.entityManager.addComponent(entity.id, new PhysicsComponent(entity.id, 1.0))
    this.entityManager.addComponent(entity.id, new InventoryComponent(entity.id, 30, 150))
    this.entityManager.addComponent(entity.id, new SkillComponent(entity.id, 100))
    this.entityManager.addComponent(entity.id, new AnimationComponent(entity.id, 12))
    this.entityManager.addComponent(entity.id, new InteractionComponent(entity.id, 'player', 80))
    
    return entity
  }

  public createPet(name: string, type: string, x: number = 0, y: number = 0): Entity {
    const entity = this.entityManager.createEntity(name, ['pet', 'ai_controlled'])
    
    this.entityManager.addComponent(entity.id, new PositionComponent(entity.id, x, y))
    this.entityManager.addComponent(entity.id, new RenderableComponent(entity.id, `${type}_sprite`, 2))
    this.entityManager.addComponent(entity.id, new HealthComponent(entity.id, 50, 0.5))
    this.entityManager.addComponent(entity.id, new AIComponent(entity.id, 'pet_behavior'))
    this.entityManager.addComponent(entity.id, new PhysicsComponent(entity.id, 0.5))
    this.entityManager.addComponent(entity.id, new AnimationComponent(entity.id, 8))
    this.entityManager.addComponent(entity.id, new InteractionComponent(entity.id, 'pet', 40))
    
    return entity
  }

  public createQuestGiver(name: string, questId: string, x: number = 0, y: number = 0): Entity {
    const entity = this.entityManager.createEntity(name, ['npc', 'quest_giver'])
    
    this.entityManager.addComponent(entity.id, new PositionComponent(entity.id, x, y))
    this.entityManager.addComponent(entity.id, new RenderableComponent(entity.id, 'npc_sprite', 1))
    this.entityManager.addComponent(entity.id, new QuestComponent(entity.id, questId))
    
    return entity
  }

  public createCollectible(name: string, x: number = 0, y: number = 0): Entity {
    const entity = this.entityManager.createEntity(name, ['collectible', 'interactive'])
    
    this.entityManager.addComponent(entity.id, new PositionComponent(entity.id, x, y))
    this.entityManager.addComponent(entity.id, new RenderableComponent(entity.id, 'collectible_sprite', 3))
    
    return entity
  }
} 
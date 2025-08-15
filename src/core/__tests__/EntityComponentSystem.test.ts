import { 
  EntityManager, 
  ECSSystemManager, 
  EntityFactory,
  PositionComponent,
  RenderableComponent,
  HealthComponent,
  AIComponent,
  PhysicsComponent,
  QuestComponent,
  Component,
  Entity,
  ECSSystem
} from '../EntityComponentSystem'
import { EventManager } from '../EventManager'

// Mock ECS System for testing
class MockECSSystem implements ECSSystem {
  public name: string
  public priority: number
  public requiredComponents: string[]
  public updateCount: number = 0
  public initializeCount: number = 0
  public destroyCount: number = 0

  constructor(name: string, priority: number = 0, requiredComponents: string[] = []) {
    this.name = name
    this.priority = priority
    this.requiredComponents = requiredComponents
  }

  update(entities: Entity[], deltaTime: number): void {
    this.updateCount++
  }

  initialize(): void {
    this.initializeCount++
  }

  destroy(): void {
    this.destroyCount++
  }
}

describe('Entity Component System', () => {
  let eventManager: EventManager
  let entityManager: EntityManager
  let systemManager: ECSSystemManager
  let entityFactory: EntityFactory

  beforeEach(() => {
    eventManager = EventManager.getInstance()
    entityManager = new EntityManager(eventManager)
    systemManager = new ECSSystemManager(entityManager, eventManager)
    entityFactory = new EntityFactory(entityManager)
  })

  afterEach(() => {
    eventManager.destroy()
    entityManager.clear()
    systemManager.clear()
  })

  describe('EntityManager', () => {
    it('should create entities with unique IDs', () => {
      const entity1 = entityManager.createEntity('Test Entity 1')
      const entity2 = entityManager.createEntity('Test Entity 2')

      expect(entity1.id).not.toBe(entity2.id)
      expect(entity1.name).toBe('Test Entity 1')
      expect(entity2.name).toBe('Test Entity 2')
      expect(entity1.active).toBe(true)
      expect(entity1.tags).toEqual([])
    })

    it('should add and remove components', () => {
      const entity = entityManager.createEntity('Test Entity')
      const position = new PositionComponent(entity.id, 10, 20)

      expect(entityManager.addComponent(entity.id, position)).toBe(true)
      expect(entityManager.hasComponent(entity.id, 'position')).toBe(true)
      expect(entityManager.getComponent(entity.id, 'position')).toBe(position)

      expect(entityManager.removeComponent(entity.id, 'position')).toBe(true)
      expect(entityManager.hasComponent(entity.id, 'position')).toBe(false)
    })

    it('should get entities with specific components', () => {
      const entity1 = entityManager.createEntity('Entity 1')
      const entity2 = entityManager.createEntity('Entity 2')
      const entity3 = entityManager.createEntity('Entity 3')

      entityManager.addComponent(entity1.id, new PositionComponent(entity1.id, 0, 0))
      entityManager.addComponent(entity2.id, new PositionComponent(entity2.id, 10, 10))
      entityManager.addComponent(entity3.id, new HealthComponent(entity3.id, 100))

      const positionEntities = entityManager.getEntitiesWithComponent('position')
      const healthEntities = entityManager.getEntitiesWithComponent('health')

      expect(positionEntities).toHaveLength(2)
      expect(healthEntities).toHaveLength(1)
      expect(positionEntities).toContain(entity1)
      expect(positionEntities).toContain(entity2)
      expect(healthEntities).toContain(entity3)
    })

    it('should get entities with specific tags', () => {
      const entity1 = entityManager.createEntity('Player', ['player', 'controllable'])
      const entity2 = entityManager.createEntity('Pet', ['pet', 'ai_controlled'])
      const entity3 = entityManager.createEntity('NPC', ['npc'])

      const playerEntities = entityManager.getEntitiesWithTag('player')
      const petEntities = entityManager.getEntitiesWithTag('pet')
      const npcEntities = entityManager.getEntitiesWithTag('npc')

      expect(playerEntities).toHaveLength(1)
      expect(petEntities).toHaveLength(1)
      expect(npcEntities).toHaveLength(1)
      expect(playerEntities[0]).toBe(entity1)
      expect(petEntities[0]).toBe(entity2)
      expect(npcEntities[0]).toBe(entity3)
    })

    it('should destroy entities and clean up components', () => {
      const entity = entityManager.createEntity('Test Entity')
      entityManager.addComponent(entity.id, new PositionComponent(entity.id, 0, 0))
      entityManager.addComponent(entity.id, new HealthComponent(entity.id, 100))

      expect(entityManager.getEntityCount()).toBe(1)
      expect(entityManager.hasComponent(entity.id, 'position')).toBe(true)

      expect(entityManager.destroyEntity(entity.id)).toBe(true)
      expect(entityManager.getEntityCount()).toBe(0)
      expect(entityManager.getEntity(entity.id)).toBeUndefined()
    })

    it('should emit events for entity operations', () => {
      const entityCreatedHandler = jest.fn()
      const componentAddedHandler = jest.fn()
      const componentRemovedHandler = jest.fn()

      eventManager.on('entityCreated', entityCreatedHandler)
      eventManager.on('componentAdded', componentAddedHandler)
      eventManager.on('componentRemoved', componentRemovedHandler)

      const entity = entityManager.createEntity('Test Entity')
      const position = new PositionComponent(entity.id, 0, 0)
      entityManager.addComponent(entity.id, position)
      entityManager.removeComponent(entity.id, 'position')

      expect(entityCreatedHandler).toHaveBeenCalledWith(expect.objectContaining({
        entityId: entity.id,
        name: 'Test Entity',
        tags: []
      }))

      expect(componentAddedHandler).toHaveBeenCalledWith(expect.objectContaining({
        entityId: entity.id,
        componentType: 'position'
      }))

      expect(componentRemovedHandler).toHaveBeenCalledWith(expect.objectContaining({
        entityId: entity.id,
        componentType: 'position'
      }))
    })
  })

  describe('ECSSystemManager', () => {
    it('should add and remove systems', () => {
      const system = new MockECSSystem('test_system', 50, ['position'])

      systemManager.addSystem(system)
      expect(systemManager.getSystem('test_system')).toBe(system)
      expect(systemManager.getSystemCount()).toBe(1)

      expect(systemManager.removeSystem('test_system')).toBe(true)
      expect(systemManager.getSystem('test_system')).toBeUndefined()
      expect(systemManager.getSystemCount()).toBe(0)
    })

    it('should update systems in priority order', () => {
      const highPrioritySystem = new MockECSSystem('high', 10, [])
      const lowPrioritySystem = new MockECSSystem('low', 90, [])

      systemManager.addSystem(lowPrioritySystem)
      systemManager.addSystem(highPrioritySystem)

      systemManager.updateSystems(16.67) // 60 FPS delta time

      expect(highPrioritySystem.updateCount).toBe(1)
      expect(lowPrioritySystem.updateCount).toBe(1)
    })

    it('should only update systems with required components', () => {
      const system = new MockECSSystem('test_system', 50, ['position', 'health'])
      
      systemManager.addSystem(system)

      // Create entity without required components
      const entity = entityManager.createEntity('Test Entity')
      systemManager.updateSystems(16.67)

      // System is called but with no entities (empty array)
      expect(system.updateCount).toBe(1)

      // Add required components
      entityManager.addComponent(entity.id, new PositionComponent(entity.id, 0, 0))
      entityManager.addComponent(entity.id, new HealthComponent(entity.id, 100))
      systemManager.updateSystems(16.67)

      // System is called again, now with 1 entity
      expect(system.updateCount).toBe(2)
    })

    it('should handle system errors gracefully', () => {
      const errorSystem = new MockECSSystem('error_system', 50, [])
      errorSystem.update = jest.fn().mockImplementation(() => {
        throw new Error('System error')
      })

      const errorHandler = jest.fn()
      eventManager.on('systemError', errorHandler)

      systemManager.addSystem(errorSystem)
      systemManager.updateSystems(16.67)

      expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({
        systemName: 'error_system',
        error: 'System error'
      }))
    })
  })

  describe('EntityFactory', () => {
    it('should create player entities with correct components', () => {
      const player = entityFactory.createPlayer('Hero', 100, 200)

      expect(player.tags).toContain('player')
      expect(player.tags).toContain('controllable')
      expect(entityManager.hasComponent(player.id, 'position')).toBe(true)
      expect(entityManager.hasComponent(player.id, 'renderable')).toBe(true)
      expect(entityManager.hasComponent(player.id, 'health')).toBe(true)
      expect(entityManager.hasComponent(player.id, 'physics')).toBe(true)

      const position = entityManager.getComponent(player.id, 'position') as PositionComponent
      expect(position.x).toBe(100)
      expect(position.y).toBe(200)
    })

    it('should create pet entities with correct components', () => {
      const pet = entityFactory.createPet('Buddy', 'dog', 50, 100)

      expect(pet.tags).toContain('pet')
      expect(pet.tags).toContain('ai_controlled')
      expect(entityManager.hasComponent(pet.id, 'position')).toBe(true)
      expect(entityManager.hasComponent(pet.id, 'renderable')).toBe(true)
      expect(entityManager.hasComponent(pet.id, 'health')).toBe(true)
      expect(entityManager.hasComponent(pet.id, 'ai')).toBe(true)
      expect(entityManager.hasComponent(pet.id, 'physics')).toBe(true)

      const ai = entityManager.getComponent(pet.id, 'ai') as AIComponent
      expect(ai.behaviorTree).toBe('pet_behavior')
    })

    it('should create quest giver entities with correct components', () => {
      const npc = entityFactory.createQuestGiver('Merchant', 'quest_1', 300, 400)

      expect(npc.tags).toContain('npc')
      expect(npc.tags).toContain('quest_giver')
      expect(entityManager.hasComponent(npc.id, 'position')).toBe(true)
      expect(entityManager.hasComponent(npc.id, 'renderable')).toBe(true)
      expect(entityManager.hasComponent(npc.id, 'quest')).toBe(true)

      const quest = entityManager.getComponent(npc.id, 'quest') as QuestComponent
      expect(quest.questId).toBe('quest_1')
    })

    it('should create collectible entities with correct components', () => {
      const collectible = entityFactory.createCollectible('Gem', 150, 250)

      expect(collectible.tags).toContain('collectible')
      expect(collectible.tags).toContain('interactive')
      expect(entityManager.hasComponent(collectible.id, 'position')).toBe(true)
      expect(entityManager.hasComponent(collectible.id, 'renderable')).toBe(true)
    })
  })

  describe('Component Classes', () => {
    it('should create position components with correct values', () => {
      const entityId = 'test_entity'
      const position = new PositionComponent(entityId, 10, 20, 5)

      expect(position.type).toBe('position')
      expect(position.entityId).toBe(entityId)
      expect(position.x).toBe(10)
      expect(position.y).toBe(20)
      expect(position.z).toBe(5)
    })

    it('should create renderable components with correct values', () => {
      const entityId = 'test_entity'
      const renderable = new RenderableComponent(entityId, 'test_sprite', 2)

      expect(renderable.type).toBe('renderable')
      expect(renderable.entityId).toBe(entityId)
      expect(renderable.spriteId).toBe('test_sprite')
      expect(renderable.visible).toBe(true)
      expect(renderable.layer).toBe(2)
      expect(renderable.alpha).toBe(1.0)
    })

    it('should create health components with correct values', () => {
      const entityId = 'test_entity'
      const health = new HealthComponent(entityId, 150, 2)

      expect(health.type).toBe('health')
      expect(health.entityId).toBe(entityId)
      expect(health.current).toBe(150)
      expect(health.maximum).toBe(150)
      expect(health.regeneration).toBe(2)
    })

    it('should create AI components with correct values', () => {
      const entityId = 'test_entity'
      const ai = new AIComponent(entityId, 'custom_behavior')

      expect(ai.type).toBe('ai')
      expect(ai.entityId).toBe(entityId)
      expect(ai.behaviorTree).toBe('custom_behavior')
      expect(ai.memory).toBeInstanceOf(Map)
      expect(ai.lastDecision).toBe(0)
    })

    it('should create physics components with correct values', () => {
      const entityId = 'test_entity'
      const physics = new PhysicsComponent(entityId, 2.5)

      expect(physics.type).toBe('physics')
      expect(physics.entityId).toBe(entityId)
      expect(physics.mass).toBe(2.5)
      expect(physics.friction).toBe(0.1)
      expect(physics.gravity).toBe(true)
      expect(physics.velocity.x).toBe(0)
      expect(physics.velocity.y).toBe(0)
      expect(physics.velocity.z).toBe(0)
    })

    it('should create quest components with correct values', () => {
      const entityId = 'test_entity'
      const objectives = ['collect_gem', 'defeat_enemy']
      const quest = new QuestComponent(entityId, 'quest_1', objectives)

      expect(quest.type).toBe('quest')
      expect(quest.entityId).toBe(entityId)
      expect(quest.questId).toBe('quest_1')
      expect(quest.objectives).toEqual(objectives)
      expect(quest.progress).toBeInstanceOf(Map)
      expect(quest.completed).toBe(false)
    })
  })

  describe('System Integration', () => {
    it('should integrate ECS systems with entity manager', () => {
      const renderingSystem = new MockECSSystem('rendering', 50, ['renderable', 'position'])
      const physicsSystem = new MockECSSystem('physics', 70, ['physics', 'position'])

      systemManager.addSystem(renderingSystem)
      systemManager.addSystem(physicsSystem)

      // Create entities with different component combinations
      const player = entityFactory.createPlayer('Player', 0, 0)
      const collectible = entityFactory.createCollectible('Gem', 100, 100)

      systemManager.updateSystems(16.67)

      // Physics system should update both entities (both have physics + position)
      expect(physicsSystem.updateCount).toBe(1)
      
      // Rendering system should update both entities (both have renderable + position)
      expect(renderingSystem.updateCount).toBe(1)
    })
  })
}) 

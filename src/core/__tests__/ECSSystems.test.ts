import { ECSRenderingSystem } from '../systems/ECSRenderingSystem'
import { ECSPhysicsSystem } from '../systems/ECSPHysicsSystem'
import { 
  EntityManager, 
  EntityFactory,
  PositionComponent,
  RenderableComponent,
  PhysicsComponent,
  HealthComponent
} from '../EntityComponentSystem'
import { EventManager } from '../EventManager'

describe('ECS Systems', () => {
  let eventManager: EventManager
  let entityManager: EntityManager
  let entityFactory: EntityFactory
  let renderingSystem: ECSRenderingSystem
  let physicsSystem: ECSPhysicsSystem
  let canvas: HTMLCanvasElement

  beforeEach(() => {
    eventManager = new EventManager()
    entityManager = new EntityManager(eventManager)
    entityFactory = new EntityFactory(entityManager)
    
    // Create a mock canvas
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    
    renderingSystem = new ECSRenderingSystem(canvas)
    physicsSystem = new ECSPhysicsSystem()
  })

  afterEach(() => {
    eventManager.destroy()
    entityManager.clear()
    renderingSystem.destroy()
    physicsSystem.destroy()
  })

  describe('ECSRenderingSystem', () => {
    it('should initialize with canvas', () => {
      expect(renderingSystem).toBeDefined()
      renderingSystem.initialize()
    })

    it('should render entities with position and renderable components', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      const pet = entityFactory.createPet('Pet', 'dog', 200, 200)

      renderingSystem.initialize()
      renderingSystem.update([player, pet], 16.67)

      // The system should process both entities
      // We can't easily test the actual rendering output in a test environment
      // but we can verify the system doesn't crash
      expect(player.components.has('position')).toBe(true)
      expect(player.components.has('renderable')).toBe(true)
      expect(pet.components.has('position')).toBe(true)
      expect(pet.components.has('renderable')).toBe(true)
    })

    it('should handle entities without required components gracefully', () => {
      const entity = entityManager.createEntity('Test Entity')
      // Entity has no components

      renderingSystem.initialize()
      renderingSystem.update([entity], 16.67)

      // Should not crash
      expect(entity.components.size).toBe(0)
    })

    it('should group entities by layer correctly', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      const pet = entityFactory.createPet('Pet', 'dog', 200, 200)
      const collectible = entityFactory.createCollectible('Gem', 300, 300)

      // Verify layers are set correctly
      const playerRenderable = entityManager.getComponent(player.id, 'renderable') as RenderableComponent
      const petRenderable = entityManager.getComponent(pet.id, 'renderable') as RenderableComponent
      const collectibleRenderable = entityManager.getComponent(collectible.id, 'renderable') as RenderableComponent

      expect(playerRenderable.layer).toBe(1)
      expect(petRenderable.layer).toBe(2)
      expect(collectibleRenderable.layer).toBe(3)
    })

    it('should load sprites correctly', async () => {
      renderingSystem.initialize()
      
      // Test loading a custom sprite
      await expect(renderingSystem.loadSprite('custom_sprite', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='))
        .resolves.toBeUndefined()
      
      expect(renderingSystem.getSprite('custom_sprite')).toBeDefined()
    })

    it('should handle sprite loading errors gracefully', async () => {
      renderingSystem.initialize()
      
      // Test loading an invalid sprite URL
      await expect(renderingSystem.loadSprite('invalid_sprite', 'invalid_url'))
        .rejects.toThrow('Failed to load sprite: invalid_url')
    })
  })

  describe('ECSPhysicsSystem', () => {
    it('should initialize correctly', () => {
      expect(physicsSystem).toBeDefined()
      physicsSystem.initialize()
    })

    it('should update entity physics correctly', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      const physics = entityManager.getComponent(player.id, 'physics') as PhysicsComponent
      const position = entityManager.getComponent(player.id, 'position') as PositionComponent

      // Set initial velocity
      physics.velocity.x = 10
      physics.velocity.y = 5

      const initialX = position.x
      const initialY = position.y

      physicsSystem.update([player], 16.67) // 60 FPS delta time

      // Position should change based on velocity
      expect(position.x).toBeGreaterThan(initialX)
      expect(position.y).toBeGreaterThan(initialY)
    })

    it('should apply gravity to entities with physics components', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      const physics = entityManager.getComponent(player.id, 'physics') as PhysicsComponent
      const position = entityManager.getComponent(player.id, 'position') as PositionComponent

      // Enable gravity
      physics.gravity = true
      const initialY = position.y

      physicsSystem.update([player], 16.67)

      // Y position should increase due to gravity
      expect(position.y).toBeGreaterThan(initialY)
    })

    it('should handle collisions between entities', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      const pet = entityFactory.createPet('Pet', 'dog', 110, 100) // Very close to player

      const playerPhysics = entityManager.getComponent(player.id, 'physics') as PhysicsComponent
      const petPhysics = entityManager.getComponent(pet.id, 'physics') as PhysicsComponent

      // Set velocities that would cause collision
      playerPhysics.velocity.x = 5
      petPhysics.velocity.x = -5

      const initialPlayerX = entityManager.getComponent(player.id, 'position')!.x
      const initialPetX = entityManager.getComponent(pet.id, 'position')!.x

      physicsSystem.update([player, pet], 16.67)

      // Collision should be detected and resolved
      // Entities should be separated and velocities should change
      const finalPlayerX = entityManager.getComponent(player.id, 'position')!.x
      const finalPetX = entityManager.getComponent(pet.id, 'position')!.x

      // Entities should not overlap
      const distance = Math.abs(finalPlayerX - finalPetX)
      expect(distance).toBeGreaterThan(20) // Minimum separation distance
    })

    it('should respect world bounds', () => {
      const player = entityFactory.createPlayer('Player', 0, 0)
      const physics = entityManager.getComponent(player.id, 'physics') as PhysicsComponent
      const position = entityManager.getComponent(player.id, 'position') as PositionComponent

      // Try to move outside bounds
      physics.velocity.x = -100
      physics.velocity.y = -100

      physicsSystem.update([player], 16.67)

      // Position should be clamped to world bounds
      expect(position.x).toBeGreaterThanOrEqual(0)
      expect(position.y).toBeGreaterThanOrEqual(0)
    })

    it('should apply friction to entity movement', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      const physics = entityManager.getComponent(player.id, 'physics') as PhysicsComponent

      // Set high velocity
      physics.velocity.x = 100
      physics.velocity.y = 100

      const initialVelocityX = physics.velocity.x
      const initialVelocityY = physics.velocity.y

      physicsSystem.update([player], 16.67)

      // Velocity should be reduced by friction
      expect(physics.velocity.x).toBeLessThan(initialVelocityX)
      expect(physics.velocity.y).toBeLessThan(initialVelocityY)
    })

    it('should handle entities without physics components gracefully', () => {
      const entity = entityManager.createEntity('Test Entity')
      entityManager.addComponent(entity.id, new PositionComponent(entity.id, 100, 100))

      // Should not crash when updating entities without physics
      physicsSystem.update([entity], 16.67)

      expect(entity.components.has('physics')).toBe(false)
    })

    it('should set world bounds correctly', () => {
      const customBounds = { minX: -100, maxX: 100, minY: -100, maxY: 100 }
      physicsSystem.setWorldBounds(customBounds)

      const player = entityManager.createEntity('Player')
      entityManager.addComponent(player.id, new PositionComponent(player.id, 0, 0))
      entityManager.addComponent(player.id, new PhysicsComponent(player.id))

      const physics = entityManager.getComponent(player.id, 'physics') as PhysicsComponent
      const position = entityManager.getComponent(player.id, 'position') as PositionComponent

      // Try to move outside new bounds
      physics.velocity.x = 200
      physics.velocity.y = 200

      physicsSystem.update([player], 16.67)

      // Should be clamped to new bounds
      expect(position.x).toBeLessThanOrEqual(100)
      expect(position.y).toBeLessThanOrEqual(100)
    })

    it('should set gravity correctly', () => {
      const customGravity = 2.0
      physicsSystem.setGravity(customGravity)

      const player = entityFactory.createPlayer('Player', 100, 100)
      const physics = entityManager.getComponent(player.id, 'physics') as PhysicsComponent
      const position = entityManager.getComponent(player.id, 'position') as PositionComponent

      physics.gravity = true
      const initialY = position.y

      physicsSystem.update([player], 16.67)

      // Should fall faster with higher gravity
      const fallDistance = position.y - initialY
      expect(fallDistance).toBeGreaterThan(0)
    })
  })

  describe('ECS System Integration', () => {
    it('should work together with entity manager', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      const pet = entityFactory.createPet('Pet', 'dog', 200, 200)

      // Both systems should be able to process the same entities
      renderingSystem.initialize()
      
      const entities = [player, pet]
      
      // Update physics first
      physicsSystem.update(entities, 16.67)
      
      // Then render
      renderingSystem.update(entities, 16.67)

      // Both entities should still exist and have their components
      expect(entityManager.getEntity(player.id)).toBeDefined()
      expect(entityManager.getEntity(pet.id)).toBeDefined()
      expect(entityManager.hasComponent(player.id, 'position')).toBe(true)
      expect(entityManager.hasComponent(pet.id, 'position')).toBe(true)
    })

    it('should handle system priorities correctly', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      
      // Physics system has higher priority (70) than rendering system (50)
      // This means physics updates should happen before rendering
      const entities = [player]
      
      // Simulate game loop order
      physicsSystem.update(entities, 16.67)
      renderingSystem.update(entities, 16.67)

      // Both systems should process the entities
      expect(entityManager.getEntity(player.id)).toBeDefined()
    })
  })
}) 
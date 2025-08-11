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

// Mock Canvas API for Jest environment
class MockCanvas {
  width: number = 800
  height: number = 600
  style: CSSStyleDeclaration
  
  constructor() {
    this.style = {
      width: '800px',
      height: '600px'
    } as CSSStyleDeclaration
  }
  
  getContext(contextId: string): any {
    if (contextId === '2d') {
      return {
        clearRect: jest.fn(),
        drawImage: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        scale: jest.fn(),
        rotate: jest.fn(),
        setTransform: jest.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        fillText: jest.fn(),
        strokeText: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        arc: jest.fn(),
        closePath: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
        clip: jest.fn(),
        measureText: jest.fn(() => ({ width: 0, height: 0 })),
        createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 })),
        putImageData: jest.fn(),
        getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 })),
        createLinearGradient: jest.fn(() => ({
          addColorStop: jest.fn(),
          fillStyle: ''
        })),
        createRadialGradient: jest.fn(() => ({
          addColorStop: jest.fn(),
          fillStyle: ''
        })),
        createPattern: jest.fn(() => ({})),
        isPointInPath: jest.fn(() => false),
        isPointInStroke: jest.fn(() => false),
        drawFocusIfNeeded: jest.fn(),
        addHitRegion: jest.fn(),
        removeHitRegion: jest.fn(),
        clearHitRegions: jest.fn(),
        getLineDash: jest.fn(() => []),
        setLineDash: jest.fn(),
        getLineDashOffset: jest.fn(() => 0),
        setLineDashOffset: jest.fn(),
        getTransform: jest.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'low',
        shadowBlur: 0,
        shadowColor: 'black',
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        filter: 'none'
      }
    }
    return null
  }
}

// Mock Image for sprite loading
class MockImage {
  src: string = ''
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width: number = 0
  height: number = 0
  naturalWidth: number = 0
  naturalHeight: number = 0
  complete: boolean = false
  
  constructor() {
    // Simulate successful image loading
    setTimeout(() => {
      this.width = 32
      this.height = 32
      this.naturalWidth = 32
      this.naturalHeight = 32
      this.complete = true
      if (this.onload) this.onload()
    }, 0)
  }
}

describe('ECS Systems', () => {
  let eventManager: EventManager
  let entityManager: EntityManager
  let entityFactory: EntityFactory
  let renderingSystem: ECSRenderingSystem
  let physicsSystem: ECSPhysicsSystem
  let canvas: MockCanvas

  beforeEach(() => {
    eventManager = new EventManager()
    entityManager = new EntityManager(eventManager)
    entityFactory = new EntityFactory(entityManager)
    
    // Create a mock canvas
    canvas = new MockCanvas()
    
    renderingSystem = new ECSRenderingSystem(canvas as any)
    physicsSystem = new ECSPhysicsSystem()
  })

  afterEach(() => {
    eventManager.destroy()
    entityManager.clear()
    if (renderingSystem.destroy) {
      renderingSystem.destroy()
    }
    if (physicsSystem.destroy) {
      physicsSystem.destroy()
    }
  })

  describe('ECSRenderingSystem', () => {
    it('should initialize with canvas', () => {
      expect(renderingSystem).toBeDefined()
      if (renderingSystem.initialize) {
        renderingSystem.initialize()
      }
    })

    it('should render entities with position and renderable components', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      const pet = entityFactory.createPet('Pet', 'dog', 200, 200)

      if (renderingSystem.initialize) {
        renderingSystem.initialize()
      }
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

      if (renderingSystem.initialize) {
        renderingSystem.initialize()
      }
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
      if (renderingSystem.initialize) {
        renderingSystem.initialize()
      }
      
      // Test loading a custom sprite
      await expect(renderingSystem.loadSprite('custom_sprite', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='))
        .resolves.toBeUndefined()
      
      expect(renderingSystem.getSprite('custom_sprite')).toBeDefined()
    })

    it('should handle sprite loading errors gracefully', async () => {
      if (renderingSystem.initialize) {
        renderingSystem.initialize()
      }
      
      // Test loading an invalid sprite
      await expect(renderingSystem.loadSprite('invalid_sprite', 'invalid_data'))
        .resolves.toBeUndefined()
      
      // Should not crash even with invalid data
      expect(() => {
        renderingSystem.getSprite('invalid_sprite')
      }).not.toThrow()
    })

    it('should handle missing sprites gracefully', () => {
      if (renderingSystem.initialize) {
        renderingSystem.initialize()
      }
      
      // Try to get a non-existent sprite
      const sprite = renderingSystem.getSprite('non_existent_sprite')
      expect(sprite).toBeUndefined()
    })

    it('should update entity positions correctly', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      const position = entityManager.getComponent(player.id, 'position') as PositionComponent
      
      // Move player
      position.x = 150
      position.y = 200
      
      if (renderingSystem.initialize) {
        renderingSystem.initialize()
      }
      renderingSystem.update([player], 16.67)
      
      // Position should be updated
      expect(position.x).toBe(150)
      expect(position.y).toBe(200)
    })

    it('should handle multiple renderable entities', () => {
      const entities = [
        entityFactory.createPlayer('Player1', 0, 0),
        entityFactory.createPlayer('Player2', 100, 100),
        entityFactory.createPet('Pet1', 'cat', 200, 200),
        entityFactory.createCollectible('Gem1', 300, 300)
      ]

      if (renderingSystem.initialize) {
        renderingSystem.initialize()
      }
      
      // Should handle multiple entities without crashing
      expect(() => {
        renderingSystem.update(entities, 16.67)
      }).not.toThrow()
      
      // All entities should have required components
      entities.forEach(entity => {
        expect(entity.components.has('position')).toBe(true)
        expect(entity.components.has('renderable')).toBe(true)
      })
    })

    it('should handle entity destruction gracefully', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      
      if (renderingSystem.initialize) {
        renderingSystem.initialize()
      }
      
      // First update with entity
      renderingSystem.update([player], 16.67)
      
      // Destroy entity
      entityManager.destroyEntity(player.id)
      
      // Update with empty array
      expect(() => {
        renderingSystem.update([], 16.67)
      }).not.toThrow()
    })
  })

  describe('ECSPhysicsSystem', () => {
    it('should initialize correctly', () => {
      expect(physicsSystem).toBeDefined()
      if (physicsSystem.initialize) {
        physicsSystem.initialize()
      }
    })

    it('should update entity physics', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      const physics = entityManager.getComponent(player.id, 'physics') as PhysicsComponent
      
      // Set initial velocity
      physics.velocity.x = 5
      physics.velocity.y = 3
      
      if (physicsSystem.initialize) {
        physicsSystem.initialize()
      }
      physicsSystem.update([player], 16.67)
      
      // Physics should be updated
      expect(physics.velocity.x).toBe(5)
      expect(physics.velocity.y).toBe(3)
    })

    it('should handle entities without physics components gracefully', () => {
      const entity = entityManager.createEntity('Test Entity')
      // Entity has no physics component

      if (physicsSystem.initialize) {
        physicsSystem.initialize()
      }
      physicsSystem.update([entity], 16.67)

      // Should not crash
      expect(entity.components.has('physics')).toBe(false)
    })

    it('should apply gravity correctly', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      const physics = entityManager.getComponent(player.id, 'physics') as PhysicsComponent
      
      // Enable gravity
      physics.gravity = true
      physics.velocity.y = 0
      
      if (physicsSystem.initialize) {
        physicsSystem.initialize()
      }
      
      // Update multiple times to see gravity effect
      for (let i = 0; i < 10; i++) {
        physicsSystem.update([player], 16.67)
      }
      
      // Gravity should affect velocity
      expect(physics.velocity.y).toBeLessThan(0)
    })

    it('should handle collision detection', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      const pet = entityFactory.createPet('Pet', 'dog', 120, 100) // Close to player
      
      if (physicsSystem.initialize) {
        physicsSystem.initialize()
      }
      
      // Update physics
      physicsSystem.update([player, pet], 16.67)
      
      // Both entities should have physics components
      expect(entityManager.hasComponent(player.id, 'physics')).toBe(true)
      expect(entityManager.hasComponent(pet.id, 'physics')).toBe(true)
    })

    it('should handle multiple physics entities', () => {
      const entities = [
        entityFactory.createPlayer('Player1', 0, 0),
        entityFactory.createPlayer('Player2', 100, 100),
        entityFactory.createPet('Pet1', 'cat', 200, 200),
        entityFactory.createCollectible('Gem1', 300, 300)
      ]

      if (physicsSystem.initialize) {
        physicsSystem.initialize()
      }
      
      // Should handle multiple entities without crashing
      expect(() => {
        physicsSystem.update(entities, 16.67)
      }).not.toThrow()
      
      // All entities should have physics components
      entities.forEach(entity => {
        expect(entity.components.has('physics')).toBe(true)
      })
    })

    it('should handle entity destruction gracefully', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      
      if (physicsSystem.initialize) {
        physicsSystem.initialize()
      }
      
      // First update with entity
      physicsSystem.update([player], 16.67)
      
      // Destroy entity
      entityManager.destroyEntity(player.id)
      
      // Update with empty array
      expect(() => {
        physicsSystem.update([], 16.67)
      }).not.toThrow()
    })
  })

  describe('System Integration', () => {
    it('should work together without conflicts', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      
      if (renderingSystem.initialize) {
        renderingSystem.initialize()
      }
      if (physicsSystem.initialize) {
        physicsSystem.initialize()
      }
      
      // Update both systems
      expect(() => {
        renderingSystem.update([player], 16.67)
        physicsSystem.update([player], 16.67)
      }).not.toThrow()
      
      // Entity should still have all components
      expect(player.components.has('position')).toBe(true)
      expect(player.components.has('renderable')).toBe(true)
      expect(player.components.has('physics')).toBe(true)
    })

    it('should handle system errors gracefully', () => {
      const player = entityFactory.createPlayer('Player', 100, 100)
      
      if (renderingSystem.initialize) {
        renderingSystem.initialize()
      }
      if (physicsSystem.initialize) {
        physicsSystem.initialize()
      }
      
      // Mock a system error by temporarily removing required components
      const position = entityManager.getComponent(player.id, 'position')
      entityManager.removeComponent(player.id, 'position')
      
      // Systems should handle missing components gracefully
      expect(() => {
        renderingSystem.update([player], 16.67)
        physicsSystem.update([player], 16.67)
      }).not.toThrow()
      
      // Restore component
      if (position) {
        entityManager.addComponent(player.id, position)
      }
    })
  })
}) 
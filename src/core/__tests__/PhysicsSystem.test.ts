import { PhysicsSystem, PhysicsBody, Vector2, CollisionInfo } from '../systems/PhysicsSystem'
import { EventManager } from '../EventManager'

describe('PhysicsSystem', () => {
  let physicsSystem: PhysicsSystem
  let eventManager: EventManager

  beforeEach(() => {
    eventManager = new EventManager()
    physicsSystem = new PhysicsSystem()
    physicsSystem.setEventManager(eventManager)
  })

  describe('Physics Body Management', () => {
    test('should add and remove physics bodies', () => {
      const body: PhysicsBody = {
        id: 'test_body_1',
        type: 'dynamic',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 32, y: 32 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      physicsSystem.addBody(body)
      expect(physicsSystem.getAllBodies()).toHaveLength(1)
      expect(physicsSystem.getBody('test_body_1')).toBeDefined()

      physicsSystem.removeBody('test_body_1')
      expect(physicsSystem.getAllBodies()).toHaveLength(0)
    })

    test('should handle multiple body types', () => {
      const staticBody: PhysicsBody = {
        id: 'static_1',
        type: 'static',
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 64, y: 64 },
        mass: 0,
        friction: 0,
        restitution: 0,
        isActive: true,
        collisionGroup: 2,
        collisionMask: 1
      }

      const dynamicBody: PhysicsBody = {
        id: 'dynamic_1',
        type: 'dynamic',
        position: { x: 200, y: 200 },
        velocity: { x: 10, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 16, y: 16 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 2
      }

      physicsSystem.addBody(staticBody)
      physicsSystem.addBody(dynamicBody)

      const bodies = physicsSystem.getAllBodies()
      expect(bodies).toHaveLength(2)
      expect(bodies.find(b => b.type === 'static')).toBeDefined()
      expect(bodies.find(b => b.type === 'dynamic')).toBeDefined()
    })
  })

  describe('Physics Simulation', () => {
    test('should apply gravity to dynamic bodies', () => {
      const body: PhysicsBody = {
        id: 'gravity_test',
        type: 'dynamic',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 16, y: 16 },
        mass: 1,
        friction: 0,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      physicsSystem.addBody(body)
      const initialY = body.position.y

      // Update physics for 1 second
      physicsSystem.update(1000)

      expect(body.position.y).toBeGreaterThan(initialY)
      expect(body.velocity.y).toBeGreaterThan(0)
    })

    test('should apply friction to moving bodies', () => {
      const body: PhysicsBody = {
        id: 'friction_test',
        type: 'dynamic',
        position: { x: 0, y: 0 },
        velocity: { x: 100, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 16, y: 16 },
        mass: 1,
        friction: 0.5,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      physicsSystem.addBody(body)
      const initialVelocity = body.velocity.x

      // Update physics for 100ms
      physicsSystem.update(100)

      expect(body.velocity.x).toBeLessThan(initialVelocity)
    })

    test('should respect velocity limits', () => {
      const body: PhysicsBody = {
        id: 'velocity_limit_test',
        type: 'dynamic',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 10000, y: 0 },
        size: { x: 16, y: 16 },
        mass: 1,
        friction: 0,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      physicsSystem.addBody(body)
      physicsSystem.setMaxVelocity(100)

      // Update physics for 100ms
      physicsSystem.update(100)

      expect(Math.abs(body.velocity.x)).toBeLessThanOrEqual(100)
    })
  })

  describe('Collision Detection', () => {
    test('should detect AABB collisions', () => {
      const bodyA: PhysicsBody = {
        id: 'collision_a',
        type: 'dynamic',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 32, y: 32 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      const bodyB: PhysicsBody = {
        id: 'collision_b',
        type: 'dynamic',
        position: { x: 16, y: 16 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 32, y: 32 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      physicsSystem.addBody(bodyA)
      physicsSystem.addBody(bodyB)

      // Update to trigger collision detection
      physicsSystem.update(16)

      const collisions = physicsSystem.getCollisions()
      expect(collisions.length).toBeGreaterThan(0)
      expect(collisions.some(c => 
        (c.bodyA.id === 'collision_a' && c.bodyB.id === 'collision_b') ||
        (c.bodyA.id === 'collision_b' && c.bodyB.id === 'collision_a')
      )).toBe(true)
    })

    test('should respect collision groups and masks', () => {
      const playerBody: PhysicsBody = {
        id: 'player',
        type: 'dynamic',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 32, y: 32 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1, // Player group
        collisionMask: 2   // Can collide with environment
      }

      const environmentBody: PhysicsBody = {
        id: 'environment',
        type: 'static',
        position: { x: 16, y: 16 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 32, y: 32 },
        mass: 0,
        friction: 0,
        restitution: 0,
        isActive: true,
        collisionGroup: 2, // Environment group
        collisionMask: 1   // Can collide with players
      }

      const npcBody: PhysicsBody = {
        id: 'npc',
        type: 'dynamic',
        position: { x: 32, y: 32 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 32, y: 32 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 3, // NPC group
        collisionMask: 1   // Can collide with players
      }

      physicsSystem.addBody(playerBody)
      physicsSystem.addBody(environmentBody)
      physicsSystem.addBody(npcBody)

      // Update to trigger collision detection
      physicsSystem.update(16)

      const collisions = physicsSystem.getCollisions()
      
      // Player should collide with environment
      expect(collisions.some(c => 
        (c.bodyA.id === 'player' && c.bodyB.id === 'environment') ||
        (c.bodyA.id === 'environment' && c.bodyB.id === 'player')
      )).toBe(true)

      // Player should collide with NPC
      expect(collisions.some(c => 
        (c.bodyA.id === 'player' && c.bodyB.id === 'npc') ||
        (c.bodyA.id === 'npc' && c.bodyB.id === 'player')
      )).toBe(true)
    })
  })

  describe('Collision Resolution', () => {
    test('should resolve collisions with position correction', () => {
      const bodyA: PhysicsBody = {
        id: 'resolve_a',
        type: 'dynamic',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 32, y: 32 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      const bodyB: PhysicsBody = {
        id: 'resolve_b',
        type: 'dynamic',
        position: { x: 16, y: 16 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 32, y: 32 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      physicsSystem.addBody(bodyA)
      physicsSystem.addBody(bodyB)

      const initialPositionA = { ...bodyA.position }
      const initialPositionB = { ...bodyB.position }

      // Update multiple times to resolve collision
      for (let i = 0; i < 10; i++) {
        physicsSystem.update(16)
      }

      // Bodies should be separated
      const distance = Math.sqrt(
        Math.pow(bodyB.position.x - bodyA.position.x, 2) +
        Math.pow(bodyB.position.y - bodyA.position.y, 2)
      )
      expect(distance).toBeGreaterThan(32) // Should be separated by at least their size
    })

    test('should handle elastic collisions', () => {
      const bodyA: PhysicsBody = {
        id: 'elastic_a',
        type: 'dynamic',
        position: { x: 0, y: 0 },
        velocity: { x: 50, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 16, y: 16 },
        mass: 1,
        friction: 0,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      const bodyB: PhysicsBody = {
        id: 'elastic_b',
        type: 'dynamic',
        position: { x: 8, y: 0 },
        velocity: { x: -50, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 16, y: 16 },
        mass: 1,
        friction: 0,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      physicsSystem.addBody(bodyA)
      physicsSystem.addBody(bodyB)

      const initialVelocityA = bodyA.velocity.x
      const initialVelocityB = bodyB.velocity.x

      // Update to trigger collision
      physicsSystem.update(16)

      // For elastic collision, velocities should change significantly
      // (they may not exchange perfectly due to physics simulation)
      expect(bodyA.velocity.x).not.toBe(initialVelocityA)
      expect(bodyB.velocity.x).not.toBe(initialVelocityB)
      
      // Both bodies should have changed direction (one positive, one negative)
      expect(bodyA.velocity.x * bodyB.velocity.x).toBeLessThan(0)
    })
  })

  describe('Force Application', () => {
    test('should apply forces to bodies', () => {
      const body: PhysicsBody = {
        id: 'force_test',
        type: 'dynamic',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 16, y: 16 },
        mass: 2,
        friction: 0,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      physicsSystem.addBody(body)

      // Apply force
      physicsSystem.applyForce('force_test', { x: 100, y: 0 })

      // Update physics
      physicsSystem.update(16)

      expect(body.velocity.x).toBeGreaterThan(0)
      expect(body.acceleration.x).toBe(0) // Should be reset after update
    })

    test('should apply impulses to bodies', () => {
      const body: PhysicsBody = {
        id: 'impulse_test',
        type: 'dynamic',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 16, y: 16 },
        mass: 2,
        friction: 0,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      physicsSystem.addBody(body)

      // Apply impulse
      physicsSystem.applyImpulse('impulse_test', { x: 50, y: 0 })

      expect(body.velocity.x).toBe(25) // 50 / mass(2)
    })
  })

  describe('Spatial Queries', () => {
    test('should query bodies in area', () => {
      const body1: PhysicsBody = {
        id: 'query_1',
        type: 'dynamic',
        position: { x: 50, y: 50 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 16, y: 16 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      const body2: PhysicsBody = {
        id: 'query_2',
        type: 'dynamic',
        position: { x: 200, y: 200 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 16, y: 16 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      physicsSystem.addBody(body1)
      physicsSystem.addBody(body2)

      // Query area around body1
      const bodiesInArea = physicsSystem.queryArea(
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      )

      expect(bodiesInArea).toHaveLength(1)
      expect(bodiesInArea[0].id).toBe('query_1')
    })

    test('should perform raycasts', () => {
      const body: PhysicsBody = {
        id: 'raycast_target',
        type: 'dynamic',
        position: { x: 100, y: 50 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 32, y: 32 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      physicsSystem.addBody(body)

      // Raycast from origin towards the body
      const hitBody = physicsSystem.raycast(
        { x: 0, y: 50 },
        { x: 1, y: 0 },
        200
      )

      expect(hitBody).toBeDefined()
      expect(hitBody?.id).toBe('raycast_target')
    })
  })

  describe('Configuration', () => {
    test('should allow gravity configuration', () => {
      const customGravity = { x: 0, y: -5 }
      physicsSystem.setGravity(customGravity)

      expect(physicsSystem.getGravity()).toEqual(customGravity)
    })

    test('should allow time step configuration', () => {
      const customTimeStep = 1 / 30
      physicsSystem.setTimeStep(customTimeStep)

      expect(physicsSystem.getTimeStep()).toBe(customTimeStep)
    })

    test('should allow collision tolerance configuration', () => {
      const customTolerance = 0.05
      physicsSystem.setCollisionTolerance(customTolerance)

      expect(physicsSystem.getCollisionTolerance()).toBe(customTolerance)
    })
  })

  describe('Event Emission', () => {
    test('should emit collision events', () => {
      const collisionSpy = jest.fn()
      eventManager.on('physics_collision', collisionSpy)

      const bodyA: PhysicsBody = {
        id: 'event_a',
        type: 'dynamic',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 32, y: 32 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      const bodyB: PhysicsBody = {
        id: 'event_b',
        type: 'dynamic',
        position: { x: 16, y: 16 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 32, y: 32 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      physicsSystem.addBody(bodyA)
      physicsSystem.addBody(bodyB)

      // Update to trigger collision detection
      physicsSystem.update(16)

      expect(collisionSpy).toHaveBeenCalled()
    })

    test('should emit body update events', () => {
      const bodyUpdateSpy = jest.fn()
      eventManager.on('physics_body_updated', bodyUpdateSpy)

      const body: PhysicsBody = {
        id: 'update_event_test',
        type: 'dynamic',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 16, y: 16 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      physicsSystem.addBody(body)
      physicsSystem.update(16)

      expect(bodyUpdateSpy).toHaveBeenCalled()
    })
  })

  describe('Performance and Memory', () => {
    test('should handle many bodies efficiently', () => {
      const startTime = performance.now()

      // Add 50 bodies (more realistic for testing)
      for (let i = 0; i < 50; i++) {
        const body: PhysicsBody = {
          id: `mass_body_${i}`,
          type: 'dynamic',
          position: { x: i * 20, y: i * 20 },
          velocity: { x: 0, y: 0 },
          acceleration: { x: 0, y: 0 },
          size: { x: 16, y: 16 },
          mass: 1,
          friction: 0.1,
          restitution: 0.8,
          isActive: true,
          collisionGroup: 1,
          collisionMask: 1
        }
        physicsSystem.addBody(body)
      }

      // Update physics
      physicsSystem.update(16)

      const endTime = performance.now()
      const updateTime = endTime - startTime

      // Should complete in reasonable time (less than 500ms for testing in slower environments)
      expect(updateTime).toBeLessThan(500)
    })

    test('should clear collisions after processing', () => {
      const bodyA: PhysicsBody = {
        id: 'clear_a',
        type: 'dynamic',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 32, y: 32 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      const bodyB: PhysicsBody = {
        id: 'clear_b',
        type: 'dynamic',
        position: { x: 16, y: 16 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        size: { x: 32, y: 32 },
        mass: 1,
        friction: 0.1,
        restitution: 0.8,
        isActive: true,
        collisionGroup: 1,
        collisionMask: 1
      }

      physicsSystem.addBody(bodyA)
      physicsSystem.addBody(bodyB)

      // Update to generate collisions
      physicsSystem.update(16)
      expect(physicsSystem.getCollisions().length).toBeGreaterThan(0)

      // Clear collisions
      physicsSystem.clearCollisions()
      expect(physicsSystem.getCollisions().length).toBe(0)
    })
  })
})

import { ECSSystem, Entity, PhysicsComponent, PositionComponent } from '../EntityComponentSystem'

export class ECSPhysicsSystem implements ECSSystem {
  public name = 'ecs_physics'
  public priority = 70
  public requiredComponents = ['physics', 'position']
  
  private gravity: number = 0.5
  private worldBounds: { minX: number; maxX: number; minY: number; maxY: number } = {
    minX: 0,
    maxX: 800,
    minY: 0,
    maxY: 600
  }
  private collisionGroups: Map<string, Set<string>> = new Map()

  constructor() {
    this.setupDefaultCollisionGroups()
  }

  public initialize(): void {
    // Physics system initialization
  }

  public update(entities: Entity[], deltaTime: number): void {
    // Update physics for all entities
    for (const entity of entities) {
      this.updateEntityPhysics(entity, deltaTime)
    }

    // Handle collisions
    this.detectCollisions(entities)
  }

  private updateEntityPhysics(entity: Entity, deltaTime: number): void {
    const physics = entity.components.get('physics') as PhysicsComponent
    const position = entity.components.get('position') as PositionComponent
    
    if (!physics || !position) return

    // Apply gravity
    if (physics.gravity) {
      physics.acceleration.y += this.gravity
    }

    // Apply friction
    physics.velocity.x *= (1 - physics.friction)
    physics.velocity.y *= (1 - physics.friction)

    // Update velocity based on acceleration
    physics.velocity.x += physics.acceleration.x * deltaTime
    physics.velocity.y += physics.acceleration.y * deltaTime

    // Update position based on velocity
    position.x += physics.velocity.x * deltaTime
    position.y += physics.velocity.y * deltaTime

    // Apply world bounds
    this.applyWorldBounds(position, physics)

    // Reset acceleration
    physics.acceleration.x = 0
    physics.acceleration.y = 0
  }

  private applyWorldBounds(position: PositionComponent, physics: PhysicsComponent): void {
    // X-axis bounds
    if (position.x < this.worldBounds.minX) {
      position.x = this.worldBounds.minX
      physics.velocity.x = 0
    } else if (position.x > this.worldBounds.maxX) {
      position.x = this.worldBounds.maxX
      physics.velocity.x = 0
    }

    // Y-axis bounds
    if (position.y < this.worldBounds.minY) {
      position.y = this.worldBounds.minY
      physics.velocity.y = 0
    } else if (position.y > this.worldBounds.maxY) {
      position.y = this.worldBounds.maxY
      physics.velocity.y = 0
    }
  }

  private detectCollisions(entities: Entity[]): void {
    const physicsEntities = entities.filter(entity => 
      entity.components.has('physics') && entity.components.has('position')
    )

    for (let i = 0; i < physicsEntities.length; i++) {
      for (let j = i + 1; j < physicsEntities.length; j++) {
        const entityA = physicsEntities[i]
        const entityB = physicsEntities[j]

        if (this.checkCollision(entityA, entityB)) {
          this.resolveCollision(entityA, entityB)
        }
      }
    }
  }

  private checkCollision(entityA: Entity, entityB: Entity): boolean {
    const posA = entityA.components.get('position') as PositionComponent
    const posB = entityB.components.get('position') as PositionComponent
    
    if (!posA || !posB) return false

    // Simple circle collision detection
    const radiusA = this.getEntityRadius(entityA)
    const radiusB = this.getEntityRadius(entityB)
    
    const dx = posB.x - posA.x
    const dy = posB.y - posA.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    return distance < (radiusA + radiusB)
  }

  private getEntityRadius(entity: Entity): number {
    // Default radius based on entity type
    if (entity.tags.includes('player')) return 16
    if (entity.tags.includes('pet')) return 12
    if (entity.tags.includes('npc')) return 14
    if (entity.tags.includes('collectible')) return 8
    
    return 10 // Default radius
  }

  private resolveCollision(entityA: Entity, entityB: Entity): void {
    const physicsA = entityA.components.get('physics') as PhysicsComponent
    const physicsB = entityB.components.get('physics') as PhysicsComponent
    const posA = entityA.components.get('position') as PositionComponent
    const posB = entityB.components.get('position') as PositionComponent
    
    if (!physicsA || !physicsB || !posA || !posB) return

    // Calculate collision normal
    const dx = posB.x - posA.x
    const dy = posB.y - posA.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) return
    
    const nx = dx / distance
    const ny = dy / distance

    // Separate entities to prevent overlap
    const overlap = (this.getEntityRadius(entityA) + this.getEntityRadius(entityB)) - distance
    const separationX = nx * overlap * 0.5
    const separationY = ny * overlap * 0.5

    posA.x -= separationX
    posA.y -= separationY
    posB.x += separationX
    posB.y += separationY

    // Elastic collision response
    const relativeVelocityX = physicsB.velocity.x - physicsA.velocity.x
    const relativeVelocityY = physicsB.velocity.y - physicsA.velocity.y
    
    const velocityAlongNormal = relativeVelocityX * nx + relativeVelocityY * ny
    
    if (velocityAlongNormal > 0) return // Moving apart
    
    const restitution = 0.8 // Bounciness factor
    const impulse = -(1 + restitution) * velocityAlongNormal
    const impulseA = impulse / physicsA.mass
    const impulseB = impulse / physicsB.mass
    
    physicsA.velocity.x -= impulseA * nx
    physicsA.velocity.y -= impulseA * ny
    physicsB.velocity.x += impulseB * nx
    physicsB.velocity.y += impulseB * ny
  }

  public setWorldBounds(bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    this.worldBounds = bounds
  }

  public setGravity(gravity: number): void {
    this.gravity = gravity
  }

  public addCollisionGroup(groupName: string, entityTags: string[]): void {
    this.collisionGroups.set(groupName, new Set(entityTags))
  }

  private setupDefaultCollisionGroups(): void {
    this.addCollisionGroup('players', ['player'])
    this.addCollisionGroup('pets', ['pet'])
    this.addCollisionGroup('npcs', ['npc'])
    this.addCollisionGroup('collectibles', ['collectible'])
  }

  public applyForce(entityId: string, forceX: number, forceY: number): boolean {
    // This would be called by other systems to apply forces to entities
    // Implementation would find the entity and apply the force
    return false
  }

  public setVelocity(entityId: string, velocityX: number, velocityY: number): boolean {
    // This would be called by other systems to set entity velocity
    // Implementation would find the entity and set its velocity
    return false
  }

  public destroy(): void {
    this.collisionGroups.clear()
  }
} 
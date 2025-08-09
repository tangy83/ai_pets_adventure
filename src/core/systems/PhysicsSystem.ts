import { BaseSystem } from './BaseSystem'

export interface PhysicsBody {
  id: string
  type: 'static' | 'dynamic' | 'kinematic'
  position: Vector2
  velocity: Vector2
  acceleration: Vector2
  size: Vector2
  mass: number
  friction: number
  restitution: number
  isActive: boolean
  collisionGroup: number
  collisionMask: number
}

export interface Vector2 {
  x: number
  y: number
}

export interface CollisionInfo {
  bodyA: PhysicsBody
  bodyB: PhysicsBody
  normal: Vector2
  penetration: number
  contactPoint: Vector2
}

export interface PhysicsConfig {
  gravity: Vector2
  timeStep: number
  maxVelocity: number
  maxAcceleration: number
  collisionTolerance: number
  maxIterations: number
}

export class PhysicsSystem extends BaseSystem {
  private bodies: Map<string, PhysicsBody> = new Map()
  private collisions: CollisionInfo[] = []
  private gravity: Vector2 = { x: 0, y: 9.8 }
  private timeStep: number = 1 / 60
  private maxVelocity: number = 1000
  private maxAcceleration: number = 5000
  private collisionTolerance: number = 0.01
  private maxIterations: number = 10
  private spatialHash: Map<string, string[]> = new Map()
  private cellSize: number = 100

  constructor() {
    super('PhysicsSystem', 3) // Added priority 3 for physics system
  }

  public update(deltaTime: number): void {
    // Update physics simulation
    this.updatePhysics(deltaTime)
    
    // Detect collisions
    this.detectCollisions()
    
    // Resolve collisions
    this.resolveCollisions()
    
    // Update spatial hash
    this.updateSpatialHash()
    
    // Emit physics events
    this.emitPhysicsEvents()
  }

  private updatePhysics(deltaTime: number): void {
    const dt = Math.min(deltaTime / 1000, this.timeStep)
    
    for (const body of this.bodies.values()) {
      if (!body.isActive || body.type === 'static') continue
      
      // Apply gravity
      if (body.type === 'dynamic') {
        body.acceleration.x += this.gravity.x
        body.acceleration.y += this.gravity.y
      }
      
      // Update velocity
      body.velocity.x += body.acceleration.x * dt
      body.velocity.y += body.acceleration.y * dt
      
      // Apply velocity limits
      body.velocity.x = Math.max(-this.maxVelocity, Math.min(this.maxVelocity, body.velocity.x))
      body.velocity.y = Math.max(-this.maxVelocity, Math.min(this.maxVelocity, body.velocity.y))
      
      // Update position
      body.position.x += body.velocity.x * dt
      body.position.y += body.velocity.y * dt
      
      // Reset acceleration
      body.acceleration.x = 0
      body.acceleration.y = 0
      
      // Apply friction
      if (body.friction > 0) {
        body.velocity.x *= (1 - body.friction * dt)
        body.velocity.y *= (1 - body.friction * dt)
      }
    }
  }

  private detectCollisions(): void {
    this.collisions = []
    
    // Use spatial hashing for broad phase collision detection
    const potentialCollisions = this.getPotentialCollisions()
    
    for (const pair of potentialCollisions) {
      const bodyA = this.bodies.get(pair[0])
      const bodyB = this.bodies.get(pair[1])
      
      if (!bodyA || !bodyB) continue
      
      // Check collision groups and masks
      if (!this.canCollide(bodyA, bodyB)) continue
      
      // Narrow phase collision detection
      const collision = this.checkCollision(bodyA, bodyB)
      if (collision) {
        this.collisions.push(collision)
      }
    }
  }

  private getPotentialCollisions(): string[][] {
    const pairs: string[][] = []
    const checked = new Set<string>()
    
    for (const [cellKey, bodyIds] of this.spatialHash.entries()) {
      if (bodyIds.length < 2) continue
      
      // Check all pairs in the same cell
      for (let i = 0; i < bodyIds.length; i++) {
        for (let j = i + 1; j < bodyIds.length; j++) {
          const pairKey = bodyIds[i] < bodyIds[j] 
            ? `${bodyIds[i]}-${bodyIds[j]}`
            : `${bodyIds[j]}-${bodyIds[i]}`
          
          if (!checked.has(pairKey)) {
            checked.add(pairKey)
            pairs.push([bodyIds[i], bodyIds[j]])
          }
        }
      }
    }
    
    return pairs
  }

  private canCollide(bodyA: PhysicsBody, bodyB: PhysicsBody): boolean {
    // Check collision groups and masks
    return (bodyA.collisionGroup & bodyB.collisionMask) !== 0 ||
           (bodyB.collisionGroup & bodyA.collisionMask) !== 0
  }

  private checkCollision(bodyA: PhysicsBody, bodyB: PhysicsBody): CollisionInfo | null {
    // AABB collision detection
    const aMin = { x: bodyA.position.x - bodyA.size.x / 2, y: bodyA.position.y - bodyA.size.y / 2 }
    const aMax = { x: bodyA.position.x + bodyA.size.x / 2, y: bodyA.position.y + bodyA.size.y / 2 }
    const bMin = { x: bodyB.position.x - bodyB.size.x / 2, y: bodyB.position.y - bodyB.size.y / 2 }
    const bMax = { x: bodyB.position.x + bodyB.size.x / 2, y: bodyB.position.y + bodyB.size.y / 2 }
    
    // Check for overlap
    if (aMax.x < bMin.x || aMin.x > bMax.x || aMax.y < bMin.y || aMin.y > bMax.y) {
      return null
    }
    
    // Calculate collision normal and penetration
    const overlapX = Math.min(aMax.x - bMin.x, bMax.x - aMin.x)
    const overlapY = Math.min(aMax.y - bMin.y, bMax.y - aMin.y)
    
    let normal: Vector2
    let penetration: number
    
    if (overlapX < overlapY) {
      normal = { x: aMax.x < bMax.x ? -1 : 1, y: 0 }
      penetration = overlapX
    } else {
      normal = { x: 0, y: aMax.y < bMax.y ? -1 : 1 }
      penetration = overlapY
    }
    
    // Calculate contact point
    const contactPoint: Vector2 = {
      x: (aMin.x + aMax.x + bMin.x + bMax.x) / 4,
      y: (aMin.y + aMax.y + bMin.y + bMax.y) / 4
    }
    
    return {
      bodyA,
      bodyB,
      normal,
      penetration,
      contactPoint
    }
  }

  private resolveCollisions(): void {
    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      let maxPenetration = 0
      
      for (const collision of this.collisions) {
        if (collision.penetration > maxPenetration) {
          maxPenetration = collision.penetration
        }
        
        this.resolveCollision(collision)
      }
      
      // If no significant penetration, we can stop
      if (maxPenetration < this.collisionTolerance) {
        break
      }
    }
  }

  private resolveCollision(collision: CollisionInfo): void {
    const { bodyA, bodyB, normal, penetration } = collision
    
    // Skip if both bodies are static
    if (bodyA.type === 'static' && bodyB.type === 'static') {
      return
    }
    
    // Calculate relative velocity
    const relativeVelocity = {
      x: bodyB.velocity.x - bodyA.velocity.x,
      y: bodyB.velocity.y - bodyA.velocity.y
    }
    
    // Calculate velocity along normal
    const velocityAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y
    
    // Don't resolve if objects are moving apart
    if (velocityAlongNormal > 0) {
      return
    }
    
    // Calculate restitution
    const restitution = Math.min(bodyA.restitution, bodyB.restitution)
    
    // Calculate impulse
    let impulse = -(1 + restitution) * velocityAlongNormal
    let invMassA = bodyA.type === 'static' ? 0 : 1 / bodyA.mass
    let invMassB = bodyB.type === 'static' ? 0 : 1 / bodyB.mass
    impulse /= invMassA + invMassB
    
    // Apply impulse
    if (bodyA.type !== 'static') {
      bodyA.velocity.x -= impulse * normal.x * invMassA
      bodyA.velocity.y -= impulse * normal.y * invMassA
    }
    
    if (bodyB.type !== 'static') {
      bodyB.velocity.x += impulse * normal.x * invMassB
      bodyB.velocity.y += impulse * normal.y * invMassB
    }
    
    // Positional correction
    const percent = 0.8
    const slop = 0.01
    const correction = Math.max(penetration - slop, 0) / (invMassA + invMassB) * percent
    
    if (bodyA.type !== 'static') {
      bodyA.position.x -= normal.x * correction * invMassA
      bodyA.position.y -= normal.y * correction * invMassA
    }
    
    if (bodyB.type !== 'static') {
      bodyB.position.x += normal.x * correction * invMassB
      bodyB.position.y += normal.y * correction * invMassB
    }
  }

  private updateSpatialHash(): void {
    this.spatialHash.clear()
    
    for (const body of this.bodies.values()) {
      if (!body.isActive) continue
      
      // Calculate cell coordinates
      const cellX = Math.floor(body.position.x / this.cellSize)
      const cellY = Math.floor(body.position.y / this.cellSize)
      
      // Add body to all cells it might occupy
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const cellKey = `${cellX + dx},${cellY + dy}`
          
          if (!this.spatialHash.has(cellKey)) {
            this.spatialHash.set(cellKey, [])
          }
          
          this.spatialHash.get(cellKey)!.push(body.id)
        }
      }
    }
  }

  private emitPhysicsEvents(): void {
    if (!this.eventManager) return
    
    // Emit collision events
    for (const collision of this.collisions) {
      this.eventManager.emit('physics_collision', collision)
    }
    
    // Emit body update events
    for (const body of this.bodies.values()) {
      if (body.isActive) {
        this.eventManager.emit('physics_body_updated', body)
      }
    }
  }

  public addBody(body: PhysicsBody): void {
    this.bodies.set(body.id, body)
    
    if (this.eventManager) {
      this.eventManager.emit('physics_body_added', body)
    }
  }

  public removeBody(bodyId: string): boolean {
    const body = this.bodies.get(bodyId)
    if (body) {
      this.bodies.delete(bodyId)
      
      if (this.eventManager) {
        this.eventManager.emit('physics_body_removed', body)
      }
      return true
    }
    return false
  }

  public getBody(bodyId: string): PhysicsBody | undefined {
    return this.bodies.get(bodyId)
  }

  public getAllBodies(): PhysicsBody[] {
    return Array.from(this.bodies.values())
  }

  public applyForce(bodyId: string, force: Vector2): void {
    const body = this.bodies.get(bodyId)
    if (body && body.type !== 'static') {
      body.acceleration.x += force.x / body.mass
      body.acceleration.y += force.y / body.mass
    }
  }

  public applyImpulse(bodyId: string, impulse: Vector2): void {
    const body = this.bodies.get(bodyId)
    if (body && body.type !== 'static') {
      body.velocity.x += impulse.x / body.mass
      body.velocity.y += impulse.y / body.mass
    }
  }

  public setGravity(gravity: Vector2): void {
    this.gravity = { ...gravity }
  }

  public getGravity(): Vector2 {
    return { ...this.gravity }
  }

  public setTimeStep(timeStep: number): void {
    this.timeStep = timeStep
  }

  public getTimeStep(): number {
    return this.timeStep
  }

  public setMaxVelocity(maxVelocity: number): void {
    this.maxVelocity = maxVelocity
  }

  public getMaxVelocity(): number {
    return this.maxVelocity
  }

  public setMaxAcceleration(maxAcceleration: number): void {
    this.maxAcceleration = maxAcceleration
  }

  public getMaxAcceleration(): number {
    return this.maxAcceleration
  }

  public setCollisionTolerance(tolerance: number): void {
    this.collisionTolerance = tolerance
  }

  public getCollisionTolerance(): number {
    return this.collisionTolerance
  }

  public setMaxIterations(maxIterations: number): void {
    this.maxIterations = maxIterations
  }

  public getMaxIterations(): number {
    return this.maxIterations
  }

  public getCollisions(): CollisionInfo[] {
    return [...this.collisions]
  }

  public clearCollisions(): void {
    this.collisions = []
  }

  public queryArea(min: Vector2, max: Vector2): PhysicsBody[] {
    const bodies: PhysicsBody[] = []
    
    for (const body of this.bodies.values()) {
      if (!body.isActive) continue
      
      const bodyMin = { 
        x: body.position.x - body.size.x / 2, 
        y: body.position.y - body.size.y / 2 
      }
      const bodyMax = { 
        x: body.position.x + body.size.x / 2, 
        y: body.position.y + body.size.y / 2 
      }
      
      if (bodyMax.x >= min.x && bodyMin.x <= max.x && 
          bodyMax.y >= min.y && bodyMin.y <= max.y) {
        bodies.push(body)
      }
    }
    
    return bodies
  }

  public raycast(origin: Vector2, direction: Vector2, maxDistance: number): PhysicsBody | null {
    let closestBody: PhysicsBody | null = null
    let closestDistance = maxDistance
    
    for (const body of this.bodies.values()) {
      if (!body.isActive) continue
      
      // Simple ray-AABB intersection
      const intersection = this.rayAABBIntersection(origin, direction, body)
      if (intersection && intersection < closestDistance) {
        closestDistance = intersection
        closestBody = body
      }
    }
    
    return closestBody
  }

  private rayAABBIntersection(origin: Vector2, direction: Vector2, body: PhysicsBody): number | null {
    const bodyMin = { 
      x: body.position.x - body.size.x / 2, 
      y: body.position.y - body.size.y / 2 
    }
    const bodyMax = { 
      x: body.position.x + body.size.x / 2, 
      y: body.position.y + body.size.y / 2 
    }
    
    let tMin = (bodyMin.x - origin.x) / direction.x
    let tMax = (bodyMax.x - origin.x) / direction.x
    
    if (tMin > tMax) [tMin, tMax] = [tMax, tMin]
    
    let tyMin = (bodyMin.y - origin.y) / direction.y
    let tyMax = (bodyMax.y - origin.y) / direction.y
    
    if (tyMin > tyMax) [tyMin, tyMax] = [tyMax, tyMin]
    
    if (tMin > tyMax || tyMin > tMax) return null
    
    tMin = Math.max(tMin, tyMin)
    
    return tMin > 0 ? tMin : null
  }
} 
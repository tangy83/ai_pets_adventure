import { BaseSystem } from './BaseSystem'
import { Entity, InteractionComponent, PositionComponent } from '../EntityComponentSystem'

export class InteractionSystem extends BaseSystem {
  constructor() {
    super('interaction', 70) // Higher priority than physics
  }

  update(deltaTime: number): void {
    if (!this.shouldUpdate()) return

    // Get all entities with interaction components
    const entities = this.getEntitiesWithInteractionComponent()
    
    // Check for potential interactions between entities
    this.checkForInteractions(entities)
  }

  private checkForInteractions(entities: Entity[]): void {
    for (let i = 0; i < entities.length; i++) {
      const entity1 = entities[i]
      const interaction1 = entity1.components.get('interaction') as InteractionComponent
      const position1 = entity1.components.get('position') as PositionComponent
      
      if (!interaction1 || !position1 || !interaction1.interactable) continue

      for (let j = i + 1; j < entities.length; j++) {
        const entity2 = entities[j]
        const interaction2 = entity2.components.get('interaction') as InteractionComponent
        const position2 = entity2.components.get('position') as PositionComponent
        
        if (!interaction2 || !position2) continue

        // Check if entities are within interaction range
        const distance = this.calculateDistance(position1, position2)
        const canInteract1 = distance <= interaction1.interactionRange
        const canInteract2 = distance <= interaction2.interactionRange

        // Emit interaction events if entities are close enough
        if (canInteract1 && interaction1.canInteract()) {
          this.emitEvent('entityInteractionAvailable', {
            entityId: entity1.id,
            targetId: entity2.id,
            distance,
            interactionType: interaction1.interactionType
          })
        }

        if (canInteract2 && interaction2.canInteract()) {
          this.emitEvent('entityInteractionAvailable', {
            entityId: entity2.id,
            targetId: entity1.id,
            distance,
            interactionType: interaction2.interactionType
          })
        }
      }
    }
  }

  private calculateDistance(pos1: PositionComponent, pos2: PositionComponent): number {
    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    const dz = pos1.z - pos2.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  private getEntitiesWithInteractionComponent(): Entity[] {
    // This would typically come from the entity manager
    // For now, we'll return an empty array and let the system manager handle this
    return []
  }

  initialize(): void {
    super.initialize()
    this.log('Interaction system initialized')
  }

  destroy(): void {
    super.destroy()
    this.log('Interaction system destroyed')
  }
} 
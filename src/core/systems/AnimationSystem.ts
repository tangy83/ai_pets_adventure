import { BaseSystem } from './BaseSystem'
import { Entity, AnimationComponent } from '../EntityComponentSystem'

export class AnimationSystem extends BaseSystem {
  constructor() {
    super('animation', 60) // Lower priority than rendering
  }

  update(deltaTime: number): void {
    if (!this.shouldUpdate()) return

    // Get all entities with animation components
    const entities = this.getEntitiesWithAnimationComponent()
    
    for (const entity of entities) {
      const animationComponent = entity.components.get('animation') as AnimationComponent
      if (animationComponent) {
        animationComponent.update(deltaTime)
      }
    }
  }

  private getEntitiesWithAnimationComponent(): Entity[] {
    // This would typically come from the entity manager
    // For now, we'll return an empty array and let the system manager handle this
    return []
  }

  initialize(): void {
    super.initialize()
    this.log('Animation system initialized')
  }

  destroy(): void {
    super.destroy()
    this.log('Animation system destroyed')
  }
} 
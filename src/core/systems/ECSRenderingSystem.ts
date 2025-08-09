import { ECSSystem, Entity, RenderableComponent, PositionComponent } from '../EntityComponentSystem'

export class ECSRenderingSystem implements ECSSystem {
  public name = 'ecs_rendering'
  public priority = 50
  public requiredComponents = ['renderable', 'position']
  
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private sprites: Map<string, HTMLImageElement> = new Map()
  private layers: Map<number, Entity[]> = new Map()

  constructor(canvas?: HTMLCanvasElement) {
    if (canvas) {
      this.setCanvas(canvas)
    }
  }

  public setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    if (!this.ctx) {
      throw new Error('Could not get 2D context from canvas')
    }
  }

  public initialize(): void {
    this.loadDefaultSprites()
  }

  public update(entities: Entity[], deltaTime: number): void {
    if (!this.ctx || !this.canvas) return

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Group entities by layer
    this.groupEntitiesByLayer(entities)

    // Render each layer in order
    const sortedLayers = Array.from(this.layers.keys()).sort((a, b) => a - b)
    
    for (const layer of sortedLayers) {
      const layerEntities = this.layers.get(layer) || []
      for (const entity of layerEntities) {
        this.renderEntity(entity)
      }
    }
  }

  private groupEntitiesByLayer(entities: Entity[]): void {
    this.layers.clear()
    
    for (const entity of entities) {
      const renderable = entity.components.get('renderable') as RenderableComponent
      const position = entity.components.get('position') as PositionComponent
      
      if (renderable && position && renderable.visible) {
        const layer = renderable.layer
        if (!this.layers.has(layer)) {
          this.layers.set(layer, [])
        }
        this.layers.get(layer)!.push(entity)
      }
    }
  }

  private renderEntity(entity: Entity): void {
    const renderable = entity.components.get('renderable') as RenderableComponent
    const position = entity.components.get('position') as PositionComponent
    
    if (!renderable || !position || !this.ctx) return

    const sprite = this.sprites.get(renderable.spriteId)
    if (!sprite) {
      // Fallback: render a colored rectangle
      this.renderFallback(entity, renderable, position)
      return
    }

    // Apply alpha
    this.ctx.globalAlpha = renderable.alpha
    
    // Draw sprite
    this.ctx.drawImage(
      sprite,
      position.x - sprite.width / 2,
      position.y - sprite.height / 2
    )
    
    // Reset alpha
    this.ctx.globalAlpha = 1.0
  }

  private renderFallback(entity: Entity, renderable: RenderableComponent, position: PositionComponent): void {
    if (!this.ctx) return

    // Generate a consistent color based on entity name
    const hash = entity.name.split('').reduce((a, b) => {
      a = ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff
      return a
    }, 0)
    
    const hue = Math.abs(hash) % 360
    this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
    
    // Draw a simple shape
    this.ctx.fillRect(position.x - 15, position.y - 15, 30, 30)
    
    // Draw entity name
    this.ctx.fillStyle = 'white'
    this.ctx.font = '12px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(entity.name, position.x, position.y + 25)
  }

  private loadDefaultSprites(): void {
    // Create default sprites for testing
    this.createDefaultSprite('player_sprite', '#4CAF50', 32, 32)
    this.createDefaultSprite('pet_sprite', '#FF9800', 24, 24)
    this.createDefaultSprite('npc_sprite', '#2196F3', 28, 28)
    this.createDefaultSprite('collectible_sprite', '#FFD700', 16, 16)
  }

  private createDefaultSprite(id: string, color: string, width: number, height: number): void {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.fillStyle = color
    ctx.fillRect(0, 0, width, height)
    
    // Add a border
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, width - 2, height - 2)
    
    // Convert to image
    const img = new Image()
    img.src = canvas.toDataURL()
    
    this.sprites.set(id, img)
  }

  public loadSprite(id: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        this.sprites.set(id, img)
        resolve()
      }
      img.onerror = () => reject(new Error(`Failed to load sprite: ${url}`))
      img.src = url
    })
  }

  public getSprite(id: string): HTMLImageElement | undefined {
    return this.sprites.get(id)
  }

  public destroy(): void {
    this.sprites.clear()
    this.layers.clear()
    this.canvas = null
    this.ctx = null
  }
} 
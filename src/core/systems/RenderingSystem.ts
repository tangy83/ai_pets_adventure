import { BaseSystem } from './BaseSystem'

export interface Renderable {
  id: string
  position: Vector2
  rotation: number
  scale: Vector2
  visible: boolean
  layer: number
  sprite?: Sprite
  animation?: Animation
}

export interface Vector2 {
  x: number
  y: number
}

export interface Sprite {
  id: string
  texture: string
  width: number
  height: number
  pivot: Vector2
  tint: number
  alpha: number
}

export interface Animation {
  id: string
  frames: string[]
  frameRate: number
  currentFrame: number
  isLooping: boolean
  isPlaying: boolean
  frameTime: number
  elapsedTime: number
}

export interface Camera {
  position: Vector2
  zoom: number
  target?: Renderable
  bounds?: Bounds
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export class RenderingSystem extends BaseSystem {
  private renderables: Map<string, Renderable> = new Map()
  private camera: Camera
  private canvas: HTMLCanvasElement | null = null
  private context: CanvasRenderingContext2D | null = null
  private renderQueue: Renderable[] = []
  private isInitialized: boolean = false
  private frameCount: number = 0
  private lastFrameTime: number = 0
  private fps: number = 0

  constructor() {
    super('RenderingSystem', 4) // Lower priority than physics
    
    this.camera = {
      position: { x: 0, y: 0 },
      zoom: 1
    }
  }

  initialize(): void {
    super.initialize()
    this.setupCanvas()
    this.isInitialized = true
    this.log('Rendering system initialized')
  }

  destroy(): void {
    super.destroy()
    this.cleanupCanvas()
    this.isInitialized = false
    this.log('Rendering system destroyed')
  }

  update(deltaTime: number): void {
    if (!this.isActive || !this.isInitialized) return

    try {
      // Update animations
      this.updateAnimations(deltaTime)
      
      // Sort renderables by layer
      this.sortRenderQueue()
      
      // Render frame
      this.renderFrame()
      
      // Update FPS counter
      this.updateFPS(deltaTime)
      
    } catch (error) {
      this.log(`Error updating rendering system: ${error}`, 'error')
    }
  }

  private setupCanvas(): void {
    // Create canvas if it doesn't exist
    if (!this.canvas) {
      this.canvas = document.createElement('canvas')
      this.canvas.id = 'game-canvas'
      this.canvas.style.position = 'absolute'
      this.canvas.style.top = '0'
      this.canvas.style.left = '0'
      this.canvas.style.width = '100%'
      this.canvas.style.height = '100%'
      this.canvas.style.display = 'block'
      
      document.body.appendChild(this.canvas)
    }

    // Get rendering context
    this.context = this.canvas.getContext('2d')
    if (!this.context) {
      throw new Error('Could not get 2D rendering context')
    }

    // Set canvas size
    this.resizeCanvas()
    
    // Set up event listeners
    window.addEventListener('resize', this.resizeCanvas.bind(this))
    
    this.log('Canvas setup complete')
  }

  private cleanupCanvas(): void {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }
    this.canvas = null
    this.context = null
    
    window.removeEventListener('resize', this.resizeCanvas.bind(this))
  }

  private resizeCanvas(): void {
    if (!this.canvas) return
    
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * window.devicePixelRatio
    this.canvas.height = rect.height * window.devicePixelRatio
    
    if (this.context) {
      this.context.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
  }

  private updateAnimations(deltaTime: number): void {
    this.renderables.forEach(renderable => {
      if (renderable.animation && renderable.animation.isPlaying) {
        const animation = renderable.animation
        animation.elapsedTime += deltaTime
        
        if (animation.elapsedTime >= animation.frameTime) {
          animation.currentFrame++
          animation.elapsedTime = 0
          
          if (animation.currentFrame >= animation.frames.length) {
            if (animation.isLooping) {
              animation.currentFrame = 0
            } else {
              animation.isPlaying = false
              animation.currentFrame = animation.frames.length - 1
            }
          }
        }
      }
    })
  }

  private sortRenderQueue(): void {
    this.renderQueue = Array.from(this.renderables.values())
      .filter(renderable => renderable.visible)
      .sort((a, b) => a.layer - b.layer)
  }

  private renderFrame(): void {
    if (!this.context || !this.canvas) return
    
    // Clear canvas
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Apply camera transform
    this.context.save()
    this.context.translate(-this.camera.position.x, -this.camera.position.y)
    this.context.scale(this.camera.zoom, this.camera.zoom)
    
    // Render all visible objects
    this.renderQueue.forEach(renderable => {
      this.renderRenderable(renderable)
    })
    
    // Restore context
    this.context.restore()
    
    // Render UI elements (not affected by camera)
    this.renderUI()
  }

  private renderRenderable(renderable: Renderable): void {
    if (!this.context || !renderable.sprite) return
    
    const sprite = renderable.sprite
    
    // Calculate world position
    const worldX = renderable.position.x - sprite.pivot.x * renderable.scale.x
    const worldY = renderable.position.y - sprite.pivot.y * renderable.scale.y
    
    // Apply transformations
    this.context.save()
    this.context.translate(worldX, worldY)
    this.context.rotate(renderable.rotation)
    this.context.scale(renderable.scale.x, renderable.scale.y)
    
    // Set sprite properties
    this.context.globalAlpha = sprite.alpha
    this.context.globalCompositeOperation = 'source-over'
    
    // For now, render a placeholder rectangle
    // In a real implementation, this would load and render actual textures
    this.renderPlaceholder(sprite, renderable)
    
    this.context.restore()
  }

  private renderPlaceholder(sprite: Sprite, renderable: Renderable): void {
    if (!this.context) return
    
    // Create a colored rectangle as a placeholder
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3']
    const colorIndex = parseInt(renderable.id) % colors.length
    
    this.context.fillStyle = colors[colorIndex]
    this.context.fillRect(0, 0, sprite.width, sprite.height)
    
    // Add a border
    this.context.strokeStyle = '#2c3e50'
    this.context.lineWidth = 2
    this.context.strokeRect(0, 0, sprite.width, sprite.height)
    
    // Add ID text
    this.context.fillStyle = '#2c3e50'
    this.context.font = '12px Arial'
    this.context.textAlign = 'center'
    this.context.fillText(renderable.id, sprite.width / 2, sprite.height / 2)
  }

  private renderUI(): void {
    if (!this.context || !this.canvas) return
    
    // Render FPS counter
    this.context.fillStyle = '#ffffff'
    this.context.font = '16px Arial'
    this.context.textAlign = 'left'
    this.context.fillText(`FPS: ${this.fps}`, 10, 30)
    
    // Render object count
    this.context.fillText(`Objects: ${this.renderables.size}`, 10, 50)
    
    // Render camera info
    this.context.fillText(`Camera: (${Math.round(this.camera.position.x)}, ${Math.round(this.camera.position.y)})`, 10, 70)
    this.context.fillText(`Zoom: ${this.camera.zoom.toFixed(2)}x`, 10, 90)
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++
    
    if (Date.now() - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastFrameTime = Date.now()
    }
  }

  public addRenderable(renderable: Renderable): void {
    this.renderables.set(renderable.id, renderable)
    this.log(`Added renderable: ${renderable.id}`)
  }

  public removeRenderable(renderableId: string): boolean {
    const renderable = this.renderables.get(renderableId)
    if (renderable) {
      this.renderables.delete(renderableId)
      this.log(`Removed renderable: ${renderableId}`)
      return true
    }
    return false
  }

  public getRenderable(renderableId: string): Renderable | undefined {
    return this.renderables.get(renderableId)
  }

  public getAllRenderables(): Renderable[] {
    return Array.from(this.renderables.values())
  }

  public setCameraPosition(position: Vector2): void {
    this.camera.position = position
  }

  public setCameraZoom(zoom: number): void {
    this.camera.zoom = Math.max(0.1, Math.min(5, zoom)) // Clamp zoom between 0.1x and 5x
  }

  public followTarget(target: Renderable): void {
    this.camera.target = target
  }

  public stopFollowingTarget(): void {
    this.camera.target = undefined
  }

  public setCameraBounds(bounds: Bounds): void {
    this.camera.bounds = bounds
  }

  public getCamera(): Camera {
    return { ...this.camera }
  }

  public getCanvas(): HTMLCanvasElement | null {
    return this.canvas
  }

  public getContext(): CanvasRenderingContext2D | null {
    return this.context
  }

  public getFPS(): number {
    return this.fps
  }

  public setLayer(renderableId: string, layer: number): void {
    const renderable = this.renderables.get(renderableId)
    if (renderable) {
      renderable.layer = layer
    }
  }

  public setVisible(renderableId: string, visible: boolean): void {
    const renderable = this.renderables.get(renderableId)
    if (renderable) {
      renderable.visible = visible
    }
  }

  public playAnimation(renderableId: string, animationId: string): void {
    const renderable = this.renderables.get(renderableId)
    if (renderable && renderable.animation) {
      renderable.animation.isPlaying = true
      renderable.animation.currentFrame = 0
      renderable.animation.elapsedTime = 0
    }
  }

  public stopAnimation(renderableId: string): void {
    const renderable = this.renderables.get(renderableId)
    if (renderable && renderable.animation) {
      renderable.animation.isPlaying = false
    }
  }

  public setAnimationFrame(renderableId: string, frame: number): void {
    const renderable = this.renderables.get(renderableId)
    if (renderable && renderable.animation) {
      renderable.animation.currentFrame = Math.max(0, Math.min(frame, renderable.animation.frames.length - 1))
    }
  }
} 

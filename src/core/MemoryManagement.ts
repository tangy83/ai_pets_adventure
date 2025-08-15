import { EventManager } from './EventManager'

export interface TextureAtlasConfig {
  maxAtlasSize: number
  padding: number
  powerOfTwo: boolean
  format: 'webp' | 'png' | 'jpg'
  quality: number
}

export interface ObjectPoolConfig {
  initialSize: number
  maxSize: number
  growthFactor: number
  shrinkThreshold: number
  enableAutoResize: boolean
}

export interface MemoryStats {
  totalMemoryUsage: number
  textureMemoryUsage: number
  objectPoolMemoryUsage: number
  cacheMemoryUsage: number
  atlasCount: number
  poolCount: number
  cacheHitRate: number
  memoryEfficiency: number
}

export interface TextureAtlas {
  id: string
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  textures: Map<string, { x: number; y: number; width: number; height: number }>
  currentX: number
  currentY: number
  rowHeight: number
  isFull: boolean
  memoryUsage: number
}

export interface ObjectPool<T> {
  type: string
  available: T[]
  inUse: Set<T>
  factory: () => T
  reset: (obj: T) => void
  config: ObjectPoolConfig
  stats: {
    totalCreated: number
    totalReused: number
    currentSize: number
    peakSize: number
  }
}

export class MemoryManagement {
  private eventManager: EventManager
  private textureAtlases: Map<string, TextureAtlas> = new Map()
  private objectPools: Map<string, ObjectPool<any>> = new Map()
  private textureCache: Map<string, HTMLImageElement> = new Map()
  private memoryThreshold: number = 0.8 // 80% memory usage threshold
  
  private atlasConfig: TextureAtlasConfig
  private poolConfig: ObjectPoolConfig
  
  private isEnabled: boolean = true
  private memoryMonitorInterval?: number

  static readonly EVENTS = {
    TEXTURE_ATLAS_CREATED: 'textureAtlas:created',
    TEXTURE_ATLAS_FULL: 'textureAtlas:full',
    TEXTURE_ADDED: 'texture:added',
    OBJECT_POOL_CREATED: 'objectPool:created',
    OBJECT_POOL_RESIZED: 'objectPool:resized',
    MEMORY_WARNING: 'memory:warning',
    MEMORY_OPTIMIZED: 'memory:optimized',
    TEXTURE_ATLAS_OPTIMIZED: 'textureAtlas:optimized'
  }

  constructor(eventManager: EventManager) {
    this.eventManager = eventManager
    
    this.atlasConfig = {
      maxAtlasSize: 2048,
      padding: 2,
      powerOfTwo: true,
      format: 'webp',
      quality: 0.9
    }
    
    this.poolConfig = {
      initialSize: 50,
      maxSize: 1000,
      growthFactor: 1.5,
      shrinkThreshold: 0.3,
      enableAutoResize: true
    }

    this.startMemoryMonitoring()
    this.setupEventListeners()
  }

  // Texture Atlasing Methods
  public createTextureAtlas(id: string, size?: number): TextureAtlas {
    const atlasSize = size !== undefined ? size : this.atlasConfig.maxAtlasSize
    
    // Ensure power of two if required
    const finalSize = this.atlasConfig.powerOfTwo ? this.getNextPowerOfTwo(atlasSize) : atlasSize
    
    const canvas = document.createElement('canvas')
    canvas.width = finalSize
    canvas.height = finalSize
    
    const context = canvas.getContext('2d')!
    context.imageSmoothingEnabled = false // Pixel art friendly
    
    const atlas: TextureAtlas = {
      id,
      canvas,
      context,
      textures: new Map(),
      currentX: 0,
      currentY: 0,
      rowHeight: 0,
      isFull: false,
      memoryUsage: 0
    }
    
    this.textureAtlases.set(id, atlas)
    
    this.eventManager.emit(MemoryManagement.EVENTS.TEXTURE_ATLAS_CREATED, {
      atlasId: id,
      size: finalSize,
      timestamp: Date.now()
    })
    
    return atlas
  }

  public addTextureToAtlas(atlasId: string, textureId: string, image: HTMLImageElement): boolean {
    const atlas = this.textureAtlases.get(atlasId)
    if (!atlas || atlas.isFull) {
      return false
    }

    const padding = this.atlasConfig.padding
    const textureWidth = image.naturalWidth + padding * 2
    const textureHeight = image.naturalHeight + padding * 2

    // Check if texture fits in current row
    if (atlas.currentX + textureWidth > atlas.canvas.width) {
      // Move to next row
      atlas.currentX = 0
      atlas.currentY += atlas.rowHeight + padding
      atlas.rowHeight = 0
    }

    // Check if texture fits in canvas
    if (atlas.currentY + textureHeight > atlas.canvas.height) {
      atlas.isFull = true
      this.eventManager.emit(MemoryManagement.EVENTS.TEXTURE_ATLAS_FULL, {
        atlasId,
        timestamp: Date.now()
      })
      return false
    }

    // Draw texture to atlas
    atlas.context.drawImage(
      image,
      atlas.currentX + padding,
      atlas.currentY + padding,
      image.naturalWidth,
      image.naturalHeight
    )

    // Store texture coordinates
    atlas.textures.set(textureId, {
      x: atlas.currentX + padding,
      y: atlas.currentY + padding,
      width: image.naturalWidth,
      height: image.naturalHeight
    })

    // Update atlas state
    atlas.currentX += textureWidth
    atlas.rowHeight = Math.max(atlas.rowHeight, textureHeight)
    atlas.memoryUsage += image.naturalWidth * image.naturalHeight * 4 // RGBA bytes

    // Cache the texture
    this.textureCache.set(textureId, image)

    this.eventManager.emit(MemoryManagement.EVENTS.TEXTURE_ADDED, {
      atlasId,
      textureId,
      coordinates: atlas.textures.get(textureId),
      timestamp: Date.now()
    })

    return true
  }

  public getTextureFromAtlas(atlasId: string, textureId: string): { atlas: TextureAtlas; coords: any } | null {
    const atlas = this.textureAtlases.get(atlasId)
    if (!atlas) return null

    const coords = atlas.textures.get(textureId)
    if (!coords) return null

    return { atlas, coords }
  }

  public optimizeTextureAtlases(): void {
    let totalSaved = 0
    
    for (const [atlasId, atlas] of this.textureAtlases) {
      if (atlas.isFull && atlas.textures.size > 0) {
        // Create new optimized atlas
        const newAtlas = this.createTextureAtlas(`${atlasId}_optimized`, this.atlasConfig.maxAtlasSize)
        
        // Re-add textures to new atlas
        for (const [textureId, coords] of atlas.textures) {
          const texture = this.textureCache.get(textureId)
          if (texture) {
            this.addTextureToAtlas(newAtlas.id, textureId, texture)
          }
        }
        
        // Remove old atlas
        this.textureAtlases.delete(atlasId)
        totalSaved += atlas.memoryUsage
      }
    }

    if (totalSaved > 0) {
      this.eventManager.emit(MemoryManagement.EVENTS.TEXTURE_ATLAS_OPTIMIZED, {
        memorySaved: totalSaved,
        timestamp: Date.now()
      })
    }
  }

  // Enhanced Object Pooling Methods
  public createObjectPool<T>(
    type: string,
    factory: () => T,
    reset: (obj: T) => void,
    config?: Partial<ObjectPoolConfig>
  ): ObjectPool<T> {
    const finalConfig = { ...this.poolConfig, ...config }
    
    const pool: ObjectPool<T> = {
      type,
      available: [],
      inUse: new Set(),
      factory,
      reset,
      config: finalConfig,
      stats: {
        totalCreated: 0,
        totalReused: 0,
        currentSize: 0,
        peakSize: 0
      }
    }

    // Pre-populate pool
    for (let i = 0; i < finalConfig.initialSize; i++) {
      const obj = factory()
      pool.available.push(obj)
      pool.stats.totalCreated++
    }
    
    pool.stats.currentSize = pool.available.length
    pool.stats.peakSize = pool.available.length

    this.objectPools.set(type, pool)
    
    this.eventManager.emit(MemoryManagement.EVENTS.OBJECT_POOL_CREATED, {
      poolType: type,
      initialSize: finalConfig.initialSize,
      timestamp: Date.now()
    })

    return pool
  }

  public getObjectFromPool<T>(type: string): T {
    const pool = this.objectPools.get(type) as ObjectPool<T>
    if (!pool) {
      throw new Error(`Object pool '${type}' not found`)
    }

    let obj: T

    if (pool.available.length > 0) {
      obj = pool.available.pop()!
      pool.stats.totalReused++
    } else {
      obj = pool.factory()
      pool.stats.totalCreated++
      
      // Auto-resize if enabled
      if (pool.config.enableAutoResize && pool.stats.currentSize < pool.config.maxSize) {
        const newSize = Math.min(
          pool.config.maxSize,
          Math.floor(pool.stats.currentSize * pool.config.growthFactor)
        )
        this.resizeObjectPool(type, newSize)
      }
    }

    pool.inUse.add(obj)
    pool.stats.currentSize = pool.inUse.size

    return obj
  }

  public returnObjectToPool<T>(type: string, obj: T): void {
    const pool = this.objectPools.get(type) as ObjectPool<T>
    if (!pool) return

    // Reset object state
    pool.reset(obj)
    
    // Remove from in-use set
    pool.inUse.delete(obj)
    
    // Add back to available pool
    pool.available.push(obj)
    
    pool.stats.currentSize = pool.inUse.size

    // Auto-shrink if enabled and below threshold
    if (pool.config.enableAutoResize && 
        pool.available.length > pool.config.initialSize &&
        pool.inUse.size < pool.available.length * pool.config.shrinkThreshold) {
      this.shrinkObjectPool(type)
    }
  }

  public resizeObjectPool(type: string, newSize: number): void {
    const pool = this.objectPools.get(type)
    if (!pool) return

    const currentSize = pool.available.length + pool.inUse.size
    
    if (newSize > currentSize) {
      // Grow pool
      const toAdd = newSize - currentSize
      for (let i = 0; i < toAdd; i++) {
        const obj = pool.factory()
        pool.available.push(obj)
        pool.stats.totalCreated++
      }
    } else if (newSize < currentSize) {
      // Shrink pool (only available objects)
      const toRemove = Math.min(pool.available.length, currentSize - newSize)
      pool.available.splice(0, toRemove)
    }

    pool.stats.currentSize = pool.available.length + pool.inUse.size
    pool.stats.peakSize = Math.max(pool.stats.peakSize, pool.stats.currentSize)

    this.eventManager.emit(MemoryManagement.EVENTS.OBJECT_POOL_RESIZED, {
      poolType: type,
      newSize: pool.stats.currentSize,
      timestamp: Date.now()
    })
  }

  private shrinkObjectPool(type: string): void {
    const pool = this.objectPools.get(type)
    if (!pool) return

    const targetSize = Math.max(
      pool.config.initialSize,
      Math.floor(pool.available.length * 0.7), // Reduce by 30%
      pool.inUse.size
    )

    this.resizeObjectPool(type, targetSize)
  }

  // Memory Management Methods
  public getMemoryStats(): MemoryStats {
    const totalMemoryUsage = this.getTotalMemoryUsage()
    const textureMemoryUsage = this.getTextureMemoryUsage()
    const objectPoolMemoryUsage = this.getObjectPoolMemoryUsage()
    const cacheMemoryUsage = this.getCacheMemoryUsage()
    
    const atlasCount = this.textureAtlases.size
    const poolCount = this.objectPools.size
    const cacheHitRate = this.calculateCacheHitRate()
    const memoryEfficiency = this.calculateMemoryEfficiency()

    return {
      totalMemoryUsage,
      textureMemoryUsage,
      objectPoolMemoryUsage,
      cacheMemoryUsage,
      atlasCount,
      poolCount,
      cacheHitRate,
      memoryEfficiency
    }
  }

  public optimizeMemory(): void {
    const stats = this.getMemoryStats()
    
    if (stats.totalMemoryUsage > this.memoryThreshold) {
      // Optimize texture atlases
      this.optimizeTextureAtlases()
      
      // Clear old texture cache entries
      this.clearOldTextureCache()
      
      // Optimize object pools
      this.optimizeObjectPools()
      
      this.eventManager.emit(MemoryManagement.EVENTS.MEMORY_OPTIMIZED, {
        previousUsage: stats.totalMemoryUsage,
        currentUsage: this.getTotalMemoryUsage(),
        timestamp: Date.now()
      })
    }
  }

  public clearOldTextureCache(): void {
    const maxCacheSize = 100
    if (this.textureCache.size > maxCacheSize) {
      const entries = Array.from(this.textureCache.entries())
      const toRemove = entries.slice(0, entries.size - maxCacheSize)
      
      toRemove.forEach(([key]) => {
        this.textureCache.delete(key)
      })
    }
  }

  public optimizeObjectPools(): void {
    for (const [type, pool] of this.objectPools) {
      if (pool.config.enableAutoResize) {
        const utilization = pool.inUse.size / (pool.available.length + pool.inUse.size)
        
        if (utilization < 0.3) { // Less than 30% utilization
          this.shrinkObjectPool(type)
        }
      }
    }
  }

  // Utility Methods
  private getNextPowerOfTwo(value: number): number {
    if (value <= 0) return 1
    return Math.pow(2, Math.ceil(Math.log2(value)))
  }

  private getTotalMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / (performance as any).memory.jsHeapSizeLimit
    }
    return 0
  }

  private getTextureMemoryUsage(): number {
    let total = 0
    for (const atlas of this.textureAtlases.values()) {
      total += atlas.memoryUsage
    }
    return total
  }

  private getObjectPoolMemoryUsage(): number {
    let total = 0
    for (const pool of this.objectPools.values()) {
      total += pool.stats.currentSize * 64 // Estimate 64 bytes per object
    }
    return total
  }

  private getCacheMemoryUsage(): number {
    let total = 0
    for (const texture of this.textureCache.values()) {
      total += texture.naturalWidth * texture.naturalHeight * 4 // RGBA bytes
    }
    return total
  }

  private calculateCacheHitRate(): number {
    // This would need to be implemented with actual cache hit tracking
    return 0.85 // Placeholder
  }

  private calculateMemoryEfficiency(): number {
    const totalMemory = this.getTotalMemoryUsage()
    if (totalMemory === 0) return 1
    
    const usedMemory = this.getTextureMemoryUsage() + this.getObjectPoolMemoryUsage()
    return Math.max(0, 1 - (usedMemory / totalMemory))
  }

  // Memory Monitoring
  private startMemoryMonitoring(): void {
    if (typeof window !== 'undefined') {
      this.memoryMonitorInterval = window.setInterval(() => {
        const memoryUsage = this.getTotalMemoryUsage()
        
        if (memoryUsage > this.memoryThreshold) {
          this.eventManager.emit(MemoryManagement.EVENTS.MEMORY_WARNING, {
            usage: memoryUsage,
            threshold: this.memoryThreshold,
            timestamp: Date.now()
          })
          
          this.optimizeMemory()
        }
      }, 5000) // Check every 5 seconds
    }
  }

  private setupEventListeners(): void {
    this.eventManager.on('memoryWarning', this.handleMemoryWarning.bind(this))
  }

  private handleMemoryWarning(event: any): void {
    if (this.isEnabled) {
      this.optimizeMemory()
    }
  }

  // Configuration Methods
  public setAtlasConfig(config: Partial<TextureAtlasConfig>): void {
    this.atlasConfig = { ...this.atlasConfig, ...config }
  }

  public setPoolConfig(config: Partial<ObjectPoolConfig>): void {
    this.poolConfig = { ...this.poolConfig, ...config }
  }

  public getAtlasConfig(): TextureAtlasConfig {
    return { ...this.atlasConfig }
  }

  public getPoolConfig(): ObjectPoolConfig {
    return { ...this.poolConfig }
  }

  // Lifecycle Methods
  public enable(): void {
    this.isEnabled = true
  }

  public disable(): void {
    this.isEnabled = false
  }

  public destroy(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval)
    }
    
    this.textureAtlases.clear()
    this.objectPools.clear()
    this.textureCache.clear()
  }
}

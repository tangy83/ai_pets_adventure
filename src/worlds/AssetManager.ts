import { EventManager } from '../core/EventManager'
import { ChunkManager } from './ChunkManager'
import { AssetCompressionSystem } from './AssetCompressionSystem'

export interface AssetData {
  id: string
  type: AssetType
  path: string
  size: number
  format: string
  quality: 'low' | 'medium' | 'high' | 'ultra'
  isLoaded: boolean
  isCached: boolean
  lastAccessed: number
  accessCount: number
  memoryUsage: number
  metadata: AssetMetadata
  dependencies: string[]
  tags: string[]
}

export type AssetType = 'texture' | 'sprite' | 'audio' | 'model' | 'animation' | 'effect' | 'ui' | 'font' | 'shader' | 'data'

export interface AssetMetadata {
  version: string
  author: string
  creationDate: number
  lastModified: number
  description: string
  category: string
  subcategory: string
  tags: string[]
  dimensions?: { width: number; height: number; depth?: number }
  duration?: number
  frameCount?: number
  compression?: string
  mipmaps?: boolean
  anisotropy?: number
}

export interface AssetCache {
  id: string
  assets: Map<string, AssetData>
  maxSize: number
  currentSize: number
  hitCount: number
  missCount: number
  lastAccess: number
}

export interface AssetLoadRequest {
  assetId: string
  priority: 'critical' | 'high' | 'normal' | 'low'
  requester: string
  timestamp: number
  callback?: (asset: AssetData) => void
}

export interface AssetUnloadRequest {
  assetId: string
  reason: 'memory' | 'unused' | 'manual' | 'error'
  timestamp: number
}

export interface AssetBatch {
  id: string
  assets: string[]
  type: AssetType
  priority: 'critical' | 'high' | 'normal' | 'low'
  isLoaded: boolean
  loadProgress: number
  totalSize: number
  estimatedLoadTime: number
}

export interface TextureAtlas {
  id: string
  name: string
  size: { width: number; height: number }
  sprites: Map<string, SpriteData>
  texture: HTMLImageElement | ImageBitmap
  isGenerated: boolean
  memoryUsage: number
  lastUsed: number
}

export interface SpriteData {
  id: string
  name: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  pivot: { x: number; y: number }
  uv: { u1: number; v1: number; u2: number; v2: number }
  tags: string[]
}

export interface AssetPool {
  id: string
  type: AssetType
  assets: AssetData[]
  maxPoolSize: number
  currentPoolSize: number
  isActive: boolean
  lastUsed: number
}

export interface AssetPerformanceMetrics {
  loadTime: number
  unloadTime: number
  memoryUsage: number
  cacheHitRate: number
  networkRequests: number
  compressionRatio: number
  lastUpdate: number
}

export interface AssetConfig {
  maxMemoryUsage: number
  maxCacheSize: number
  maxPoolSize: number
  loadTimeout: number
  retryAttempts: number
  compressionLevel: number
  enableAtlasing: boolean
  enableBatching: boolean
  enablePooling: boolean
  enableCompression: boolean
  enableMipmaps: boolean
  enableAnisotropy: boolean
}

export class AssetManager {
  private static instance: AssetManager
  private eventManager: EventManager
  private chunkManager: ChunkManager
  private compressionSystem: AssetCompressionSystem
  
  private assets: Map<string, AssetData> = new Map()
  private assetCache: Map<string, AssetCache> = new Map()
  private assetPools: Map<string, AssetPool> = new Map()
  private textureAtlases: Map<string, TextureAtlas> = new Map()
  
  private loadQueue: AssetLoadRequest[] = []
  private unloadQueue: AssetUnloadRequest[] = []
  private loadingAssets: Set<string> = new Set()
  private failedAssets: Set<string> = new Set()
  
  private batches: Map<string, AssetBatch> = new Map()
  private performanceMetrics: Map<string, AssetPerformanceMetrics> = new Map()
  
  private config!: AssetConfig
  private totalMemoryUsage: number = 0
  private lastCleanupTime: number = Date.now()

  private constructor() {
    this.eventManager = EventManager.getInstance()
    this.chunkManager = ChunkManager.getInstance()
    this.compressionSystem = AssetCompressionSystem.getInstance()
    this.initializeConfig()
    this.initializeAssetCaches()
    this.setupEventListeners()
  }

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager()
    }
    return AssetManager.instance
  }

  /**
   * Loads an asset with specified priority
   */
  public async loadAsset(assetId: string, priority: 'critical' | 'high' | 'normal' | 'low' = 'normal', requester: string = 'system'): Promise<AssetData> {
    // Check if asset is already loaded
    if (this.assets.has(assetId)) {
      const asset = this.assets.get(assetId)!
      asset.lastAccessed = Date.now()
      asset.accessCount++
      return asset
    }

    // Check if asset is in cache
    const cachedAsset = this.getCachedAsset(assetId)
    if (cachedAsset) {
      this.restoreAssetFromCache(assetId, cachedAsset)
      return cachedAsset
    }

    // Add to load queue
    this.addToLoadQueue(assetId, priority, requester)
    
    // If critical priority, load immediately
    if (priority === 'critical') {
      return this.loadAssetImmediately(assetId)
    }

    // Return placeholder asset
    return this.createPlaceholderAsset(assetId)
  }

  /**
   * Loads multiple assets as a batch
   */
  public async loadAssetBatch(assetIds: string[], type: AssetType, priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'): Promise<AssetBatch> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const batch: AssetBatch = {
      id: batchId,
      assets: assetIds,
      type,
      priority,
      isLoaded: false,
      loadProgress: 0,
      totalSize: 0,
      estimatedLoadTime: 0
    }
    
    this.batches.set(batchId, batch)
    
    // Calculate total size and estimated load time
    for (const assetId of assetIds) {
      const asset = this.assets.get(assetId)
      if (asset) {
        batch.totalSize += asset.size
      }
    }
    
    batch.estimatedLoadTime = this.estimateBatchLoadTime(batch)
    
    // Load assets in parallel based on priority
    if (priority === 'critical' || priority === 'high') {
      await this.loadBatchImmediately(batch)
    } else {
      this.loadBatchInBackground(batch)
    }
    
    return batch
  }

  /**
   * Unloads an asset and moves it to cache
   */
  public unloadAsset(assetId: string, reason: 'memory' | 'unused' | 'manual' | 'error' = 'unused'): void {
    const asset = this.assets.get(assetId)
    if (!asset) return

    // Save asset to cache
    this.cacheAsset(assetId, asset)
    this.assets.delete(assetId)
    
    // Update asset state
    asset.isLoaded = false
    asset.isCached = true
    
    // Update memory usage
    this.totalMemoryUsage -= asset.memoryUsage
    
    this.eventManager.emit('assetUnloaded', { 
      assetId, 
      reason, 
      timestamp: Date.now()
    })
  }

  /**
   * Gets asset by ID
   */
  public getAsset(assetId: string): AssetData | undefined {
    const asset = this.assets.get(assetId)
    if (asset) {
      asset.lastAccessed = Date.now()
      asset.accessCount++
    }
    return asset
  }

  /**
   * Gets assets by type
   */
  public getAssetsByType(type: AssetType): AssetData[] {
    return Array.from(this.assets.values()).filter(asset => asset.type === type)
  }

  /**
   * Gets assets by tag
   */
  public getAssetsByTag(tag: string): AssetData[] {
    return Array.from(this.assets.values()).filter(asset => asset.tags.includes(tag))
  }

  /**
   * Creates a texture atlas from multiple sprites
   */
  public async createTextureAtlas(atlasId: string, spriteIds: string[], size: { width: number; height: number }): Promise<TextureAtlas> {
    const atlas: TextureAtlas = {
      id: atlasId,
      name: `atlas_${atlasId}`,
      size,
      sprites: new Map(),
      texture: new Image(),
      isGenerated: false,
      memoryUsage: 0,
      lastUsed: Date.now()
    }
    
    // Load all sprites first
    const sprites = await Promise.all(spriteIds.map(id => this.loadAsset(id, 'high')))
    
    // Generate atlas layout
    const layout = this.generateAtlasLayout(sprites, size)
    
    // Create atlas texture
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const ctx = canvas.getContext('2d')!
    
    // Draw sprites to atlas
    for (const sprite of sprites) {
      if (sprite.type === 'sprite') {
        const spriteData = layout.get(sprite.id)
        if (spriteData) {
          // Load sprite image and draw to atlas
          const img = await this.loadImage(sprite.path)
          ctx.drawImage(img, spriteData.position.x, spriteData.position.y)
          
          atlas.sprites.set(sprite.id, spriteData)
        }
      }
    }
    
    // Convert canvas to image
    atlas.texture = await this.canvasToImage(canvas)
    atlas.isGenerated = true
    atlas.memoryUsage = size.width * size.height * 4 // RGBA bytes
    
    this.textureAtlases.set(atlasId, atlas)
    this.eventManager.emit('textureAtlasCreated', { 
      atlasId, 
      size: atlas.size,
      timestamp: Date.now()
    })
    
    return atlas
  }

  /**
   * Gets sprite data from texture atlas
   */
  public getSpriteFromAtlas(atlasId: string, spriteId: string): SpriteData | undefined {
    const atlas = this.textureAtlases.get(atlasId)
    return atlas?.sprites.get(spriteId)
  }

  /**
   * Preloads assets for a specific area or context
   */
  public async preloadAssets(assetIds: string[], priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    for (const assetId of assetIds) {
      if (!this.assets.has(assetId) && !this.loadingAssets.has(assetId)) {
        this.addToLoadQueue(assetId, priority, 'preload')
      }
    }
    
    // Process high priority assets immediately
    if (priority === 'high') {
      await this.processHighPriorityAssets()
    }
  }

  /**
   * Gets asset statistics
   */
  public getAssetStats(): {
    totalAssets: number
    loadedAssets: number
    cachedAssets: number
    loadingAssets: number
    failedAssets: number
    totalMemoryUsage: number
    cacheHitRate: number
    averageLoadTime: number
  } {
    const totalAssets = this.assets.size
    const loadedAssets = Array.from(this.assets.values()).filter(asset => asset.isLoaded).length
    const cachedAssets = this.getTotalCachedAssets()
    const loadingAssets = this.loadingAssets.size
    const failedAssets = this.failedAssets.size
    
    let totalMemoryUsage = 0
    let totalLoadTime = 0
    let loadTimeCount = 0
    
    for (const asset of this.assets.values()) {
      totalMemoryUsage += asset.memoryUsage
    }
    
    for (const metrics of this.performanceMetrics.values()) {
      if (metrics.loadTime > 0) {
        totalLoadTime += metrics.loadTime
        loadTimeCount++
      }
    }
    
    const averageLoadTime = loadTimeCount > 0 ? totalLoadTime / loadTimeCount : 0
    const cacheHitRate = this.calculateCacheHitRate()
    
    return {
      totalAssets,
      loadedAssets,
      cachedAssets,
      loadingAssets,
      failedAssets,
      totalMemoryUsage,
      cacheHitRate,
      averageLoadTime
    }
  }

  /**
   * Cleans up unused assets based on memory threshold
   */
  public cleanupAssets(): void {
    const stats = this.getAssetStats()
    
    if (stats.totalMemoryUsage > this.config.maxMemoryUsage * 0.8) {
      // Sort assets by last accessed time and memory usage
      const sortedAssets = Array.from(this.assets.values())
        .sort((a, b) => {
          const timeDiff = a.lastAccessed - b.lastAccessed
          if (Math.abs(timeDiff) < 1000) {
            return b.memoryUsage - a.memoryUsage
          }
          return timeDiff
        })
      
      const assetsToUnload = sortedAssets.slice(0, Math.ceil(sortedAssets.length * 0.2)) // Unload 20% of assets
      
      for (const asset of assetsToUnload) {
        this.unloadAsset(asset.id, 'memory')
      }
    }
    
    // Clean up old performance metrics
    this.cleanupPerformanceMetrics()
    
    this.lastCleanupTime = Date.now()
  }

  /**
   * Compresses an asset with specified quality
   */
  public async compressAsset(
    assetId: string,
    quality: 'low' | 'medium' | 'high' | 'ultra' | 'lossless' = 'medium'
  ): Promise<any> {
    const asset = this.assets.get(assetId)
    if (!asset) {
      throw new Error(`Asset '${assetId}' not found`)
    }

    try {
      let result: any
      
      switch (asset.type) {
        case 'texture':
        case 'sprite':
          result = await this.compressionSystem.compressImage(asset.path, quality)
          break
        case 'audio':
          result = await this.compressionSystem.compressAudio(asset.path, quality)
          break
        case 'data':
          result = await this.compressionSystem.compressData(asset.path, quality)
          break
        default:
          throw new Error(`Compression not supported for asset type: ${asset.type}`)
      }

      // Update asset with compression info
      asset.metadata.compression = result.format
      asset.size = result.compressedSize
      
      this.eventManager.emit('assetCompressed', {
        assetId,
        result,
        timestamp: Date.now()
      })

      return result
    } catch (error) {
      console.error(`Failed to compress asset ${assetId}:`, error)
      throw error
    }
  }

  /**
   * Creates progressive quality tiers for an asset
   */
  public async createProgressiveTiers(assetId: string): Promise<Map<string, any>> {
    const asset = this.assets.get(assetId)
    if (!asset) {
      throw new Error(`Asset '${assetId}' not found`)
    }

    try {
      let assetType: 'image' | 'texture' | 'audio' | 'data'
      
      switch (asset.type) {
        case 'texture':
        case 'sprite':
          assetType = 'image'
          break
        case 'audio':
          assetType = 'audio'
          break
        case 'data':
          assetType = 'data'
          break
        default:
          throw new Error(`Progressive tiers not supported for asset type: ${asset.type}`)
      }

      const tiers = await this.compressionSystem.createProgressiveTiers(asset.path, assetType)
      
      this.eventManager.emit('progressiveTiersCreated', {
        assetId,
        tiers: Array.from(tiers.entries()),
        timestamp: Date.now()
      })

      return tiers
    } catch (error) {
      console.error(`Failed to create progressive tiers for asset ${assetId}:`, error)
      throw error
    }
  }

  /**
   * Gets compression statistics
   */
  public getCompressionStats(): any {
    return this.compressionSystem.getCompressionStats()
  }

  /**
   * Optimizes asset loading based on compression
   */
  public async optimizeAssetLoading(assetIds: string[]): Promise<void> {
    const optimizationPromises = assetIds.map(async (assetId) => {
      try {
        const asset = this.assets.get(assetId)
        if (!asset) return

        // Create progressive tiers for critical assets
        if (asset.tags.includes('critical')) {
          await this.createProgressiveTiers(assetId)
        }

        // Compress non-critical assets to medium quality
        if (!asset.tags.includes('critical') && asset.size > 1024 * 1024) { // > 1MB
          await this.compressAsset(assetId, 'medium')
        }
      } catch (error) {
        console.warn(`Failed to optimize asset ${assetId}:`, error)
      }
    })

    await Promise.all(optimizationPromises)
    
    this.eventManager.emit('assetLoadingOptimized', {
      assetIds,
      timestamp: Date.now()
    })
  }

  /**
   * Gets asset performance metrics
   */
  public getAssetPerformance(assetId: string): AssetPerformanceMetrics | undefined {
    return this.performanceMetrics.get(assetId)
  }

  /**
   * Gets all texture atlases
   */
  public getTextureAtlases(): TextureAtlas[] {
    return Array.from(this.textureAtlases.values())
  }

  /**
   * Gets all asset batches
   */
  public getAssetBatches(): AssetBatch[] {
    return Array.from(this.batches.values())
  }

  private initializeConfig(): void {
    this.config = {
      maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
      maxCacheSize: 512 * 1024 * 1024,     // 512MB
      maxPoolSize: 100,                     // 100 assets per pool
      loadTimeout: 30000,                   // 30 seconds
      retryAttempts: 3,
      compressionLevel: 6,
      enableAtlasing: true,
      enableBatching: true,
      enablePooling: true,
      enableCompression: true,
      enableMipmaps: true,
      enableAnisotropy: true
    }
  }

  private initializeAssetCaches(): void {
    // Initialize caches for different asset types
    const cacheTypes: AssetType[] = ['texture', 'sprite', 'audio', 'model', 'animation', 'effect', 'ui', 'font', 'shader', 'data']
    
    for (const type of cacheTypes) {
      const cache: AssetCache = {
        id: `${type}_cache`,
        assets: new Map(),
        maxSize: this.config.maxCacheSize / cacheTypes.length,
        currentSize: 0,
        hitCount: 0,
        missCount: 0,
        lastAccess: Date.now()
      }
      
      this.assetCache.set(type, cache)
    }
  }

  private setupEventListeners(): void {
    // Listen for chunk-related events
    this.eventManager.on('chunkLoaded', ({ chunkId }) => {
      this.handleChunkLoaded(chunkId)
    })
    
    this.eventManager.on('chunkUnloaded', ({ chunkId }) => {
      this.handleChunkUnloaded(chunkId)
    })
    
    // Listen for world events
    this.eventManager.on('worldCreated', ({ worldId }) => {
      this.preloadWorldAssets(worldId)
    })
    
    this.eventManager.on('worldUnloaded', ({ worldId }) => {
      this.unloadWorldAssets(worldId)
    })
  }

  private async loadAssetImmediately(assetId: string): Promise<AssetData> {
    const asset = this.assets.get(assetId)
    if (!asset) {
      throw new Error(`Asset '${assetId}' not found`)
    }
    
    if (asset.isLoaded) return asset
    
    this.loadingAssets.add(assetId)
    const startTime = Date.now()
    
    try {
      // Load asset based on type
      await this.loadAssetByType(asset)
      
      asset.isLoaded = true
      asset.lastAccessed = Date.now()
      
      // Update memory usage
      this.totalMemoryUsage += asset.memoryUsage
      
      // Update performance metrics
      const loadTime = Date.now() - startTime
      this.updateAssetPerformance(assetId, { loadTime, unloadTime: 0, memoryUsage: asset.memoryUsage, cacheHitRate: 0, networkRequests: 1, compressionRatio: 1.0, lastUpdate: Date.now() })
      
      this.eventManager.emit('assetLoaded', { 
        assetId, 
        size: asset.size,
        loadTime, 
        timestamp: Date.now()
      })
      return asset
    } catch (error) {
      this.failedAssets.add(assetId)
      this.eventManager.emit('assetLoadFailed', { 
        assetId, 
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      })
      throw error
    } finally {
      this.loadingAssets.delete(assetId)
    }
  }

  private async loadAssetByType(asset: AssetData): Promise<void> {
    switch (asset.type) {
      case 'texture':
      case 'sprite':
        await this.loadImageAsset(asset)
        break
      case 'audio':
        await this.loadAudioAsset(asset)
        break
      case 'model':
        await this.loadModelAsset(asset)
        break
      case 'animation':
        await this.loadAnimationAsset(asset)
        break
      case 'effect':
        await this.loadEffectAsset(asset)
        break
      case 'ui':
        await this.loadUIAsset(asset)
        break
      case 'font':
        await this.loadFontAsset(asset)
        break
      case 'shader':
        await this.loadShaderAsset(asset)
        break
      case 'data':
        await this.loadDataAsset(asset)
        break
      default:
        throw new Error(`Unsupported asset type: ${asset.type}`)
    }
  }

  private async loadImageAsset(asset: AssetData): Promise<void> {
    const img = await this.loadImage(asset.path)
    asset.memoryUsage = img.width * img.height * 4 // RGBA bytes
  }

  private async loadAudioAsset(asset: AssetData): Promise<void> {
    const audio = await this.loadAudio(asset.path)
    asset.memoryUsage = audio.duration * 44100 * 2 // 44.1kHz, 16-bit stereo
  }

  private async loadModelAsset(asset: AssetData): Promise<void> {
    // Simulate 3D model loading
    asset.memoryUsage = 1024 * 1024 // 1MB placeholder
  }

  private async loadAnimationAsset(asset: AssetData): Promise<void> {
    // Simulate animation loading
    asset.memoryUsage = 512 * 1024 // 512KB placeholder
  }

  private async loadEffectAsset(asset: AssetData): Promise<void> {
    // Simulate effect loading
    asset.memoryUsage = 256 * 1024 // 256KB placeholder
  }

  private async loadUIAsset(asset: AssetData): Promise<void> {
    const img = await this.loadImage(asset.path)
    asset.memoryUsage = img.width * img.height * 4 // RGBA bytes
  }

  private async loadFontAsset(asset: AssetData): Promise<void> {
    // Simulate font loading
    asset.memoryUsage = 128 * 1024 // 128KB placeholder
  }

  private async loadShaderAsset(asset: AssetData): Promise<void> {
    // Simulate shader loading
    asset.memoryUsage = 64 * 1024 // 64KB placeholder
  }

  private async loadDataAsset(asset: AssetData): Promise<void> {
    // Simulate data loading
    asset.memoryUsage = asset.size
  }

  private async loadImage(path: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load image: ${path}`))
      img.src = path
    })
  }

  private async loadAudio(path: string): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      audio.oncanplaythrough = () => resolve(audio)
      audio.onerror = () => reject(new Error(`Failed to load audio: ${path}`))
      audio.src = path
    })
  }

  private async canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.src = canvas.toDataURL()
    })
  }

  private generateAtlasLayout(sprites: AssetData[], size: { width: number; height: number }): Map<string, SpriteData> {
    const layout = new Map<string, SpriteData>()
    let currentX = 0
    let currentY = 0
    let maxHeightInRow = 0
    
    for (const sprite of sprites) {
      // Simple packing algorithm (can be improved with more sophisticated algorithms)
      const spriteWidth = 64 // Placeholder dimensions
      const spriteHeight = 64
      
      if (currentX + spriteWidth > size.width) {
        currentX = 0
        currentY += maxHeightInRow
        maxHeightInRow = 0
      }
      
      const spriteData: SpriteData = {
        id: sprite.id,
        name: sprite.id,
        position: { x: currentX, y: currentY },
        size: { width: spriteWidth, height: spriteHeight },
        pivot: { x: spriteWidth / 2, y: spriteHeight / 2 },
        uv: {
          u1: currentX / size.width,
          v1: currentY / size.height,
          u2: (currentX + spriteWidth) / size.width,
          v2: (currentY + spriteHeight) / size.height
        },
        tags: sprite.tags
      }
      
      layout.set(sprite.id, spriteData)
      
      currentX += spriteWidth
      maxHeightInRow = Math.max(maxHeightInRow, spriteHeight)
    }
    
    return layout
  }

  private async loadBatchImmediately(batch: AssetBatch): Promise<void> {
    const loadPromises = batch.assets.map(async (assetId, index) => {
      try {
        await this.loadAsset(assetId, batch.priority)
        batch.loadProgress = ((index + 1) / batch.assets.length) * 100
        this.eventManager.emit('batchProgress', { 
          batchId: batch.id, 
          progress: batch.loadProgress,
          timestamp: Date.now()
        })
      } catch (error) {
        console.error(`Failed to load asset ${assetId} in batch ${batch.id}:`, error)
      }
    })
    
    await Promise.all(loadPromises)
    batch.isLoaded = true
    
    this.eventManager.emit('batchLoaded', { 
      batchId: batch.id,
      timestamp: Date.now()
    })
  }

  private loadBatchInBackground(batch: AssetBatch): void {
    // Load batch in background with lower priority
    this.loadBatchImmediately(batch).catch(error => {
      console.error(`Background batch loading failed for ${batch.id}:`, error)
    })
  }

  private estimateBatchLoadTime(batch: AssetBatch): number {
    // Estimate based on total size and network conditions
    const estimatedBandwidth = 10 * 1024 * 1024 // 10MB/s
    return Math.ceil(batch.totalSize / estimatedBandwidth * 1000) // Convert to milliseconds
  }

  private addToLoadQueue(assetId: string, priority: 'critical' | 'high' | 'normal' | 'low', requester: string): void {
    // Remove existing request for this asset
    this.removeFromLoadQueue(assetId)
    
    // Add new request
    this.loadQueue.push({
      assetId,
      priority,
      requester,
      timestamp: Date.now()
    })
  }

  private removeFromLoadQueue(assetId: string): void {
    this.loadQueue = this.loadQueue.filter(req => req.assetId !== assetId)
  }

  private processLoadQueue(): void {
    // Sort load queue by priority and timestamp
    this.loadQueue.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      
      if (priorityDiff !== 0) return priorityDiff
      return a.timestamp - b.timestamp
    })
    
    // Process high priority assets first
    const highPriorityAssets = this.loadQueue.filter(req => req.priority === 'critical' || req.priority === 'high')
    
    for (const request of highPriorityAssets) {
      if (this.canLoadAsset(request.assetId)) {
        this.loadAssetImmediately(request.assetId)
        this.removeFromLoadQueue(request.assetId)
      }
    }
  }

  private canLoadAsset(assetId: string): boolean {
    const stats = this.getAssetStats()
    
    // Check memory threshold
    if (stats.totalMemoryUsage > this.config.maxMemoryUsage * 0.8) {
      return false
    }
    
    // Check if asset is already loading
    if (this.loadingAssets.has(assetId)) {
      return false
    }
    
    return true
  }

  private createPlaceholderAsset(assetId: string): AssetData {
    // Create a minimal placeholder asset
    const [type, name] = assetId.split('_')
    
    return {
      id: assetId,
      type: (type as AssetType) || 'data',
      path: '',
      size: 0,
      format: 'unknown',
      quality: 'low',
      isLoaded: false,
      isCached: false,
      lastAccessed: Date.now(),
      accessCount: 0,
      memoryUsage: 0,
      metadata: {
        version: '1.0.0',
        author: 'AI Pets Adventure Team',
        creationDate: Date.now(),
        lastModified: Date.now(),
        description: 'Placeholder asset',
        category: 'placeholder',
        subcategory: 'unknown',
        tags: ['placeholder']
      },
      dependencies: [],
      tags: ['placeholder']
    }
  }

  private getCachedAsset(assetId: string): AssetData | undefined {
    for (const cache of this.assetCache.values()) {
      const asset = cache.assets.get(assetId)
      if (asset) {
        cache.hitCount++
        cache.lastAccess = Date.now()
        return asset
      }
    }
    
    // Update miss count for all caches
    for (const cache of this.assetCache.values()) {
      cache.missCount++
    }
    
    return undefined
  }

  private cacheAsset(assetId: string, asset: AssetData): void {
    const cache = this.assetCache.get(asset.type)
    if (!cache) return
    
    // Check if cache has space
    if (cache.currentSize + asset.memoryUsage > cache.maxSize) {
      // Remove oldest assets to make space
      this.cleanupCache(cache)
    }
    
    cache.assets.set(assetId, asset)
    cache.currentSize += asset.memoryUsage
    cache.lastAccess = Date.now()
  }

  private restoreAssetFromCache(assetId: string, asset: AssetData): void {
    const cache = this.assetCache.get(asset.type)
    if (!cache) return
    
    // Remove from cache
    cache.assets.delete(assetId)
    cache.currentSize -= asset.memoryUsage
    
    // Add to active assets
    this.assets.set(assetId, asset)
    asset.isCached = false
    asset.isLoaded = true
    
    // Update memory usage
    this.totalMemoryUsage += asset.memoryUsage
    
    this.eventManager.emit('assetRestoredFromCache', { 
      assetId,
      timestamp: Date.now()
    })
  }

  private cleanupCache(cache: AssetCache): void {
    // Remove oldest assets until we have enough space
    const assetsToRemove = Array.from(cache.assets.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed)
    
    for (const asset of assetsToRemove) {
      if (cache.currentSize <= cache.maxSize * 0.8) break
      
      cache.assets.delete(asset.id)
      cache.currentSize -= asset.memoryUsage
    }
  }

  private getTotalCachedAssets(): number {
    let total = 0
    for (const cache of this.assetCache.values()) {
      total += cache.assets.size
    }
    return total
  }

  private calculateCacheHitRate(): number {
    let totalHits = 0
    let totalRequests = 0
    
    for (const cache of this.assetCache.values()) {
      totalHits += cache.hitCount
      totalRequests += cache.hitCount + cache.missCount
    }
    
    return totalRequests > 0 ? totalHits / totalRequests : 0
  }

  private updateAssetPerformance(assetId: string, metrics: AssetPerformanceMetrics): void {
    this.performanceMetrics.set(assetId, metrics)
  }

  private cleanupPerformanceMetrics(): void {
    const cutoffTime = Date.now() - 300000 // 5 minutes
    for (const [assetId, metrics] of this.performanceMetrics.entries()) {
      if (metrics.lastUpdate < cutoffTime) {
        this.performanceMetrics.delete(assetId)
      }
    }
  }

  private async processHighPriorityAssets(): Promise<void> {
    const highPriorityRequests = this.loadQueue.filter(req => req.priority === 'critical' || req.priority === 'high')
    
    for (const request of highPriorityRequests) {
      if (this.canLoadAsset(request.assetId)) {
        try {
          await this.loadAssetImmediately(request.assetId)
          this.removeFromLoadQueue(request.assetId)
        } catch (error) {
          console.error(`Failed to load high priority asset ${request.assetId}:`, error)
        }
      }
    }
  }

  private handleChunkLoaded(chunkId: string): void {
    // Preload assets for the loaded chunk
    const chunk = this.chunkManager.getChunkPerformance(chunkId)
    if (chunk) {
      // This would integrate with chunk asset data
      // For now, just emit an event
      this.eventManager.emit('chunkAssetsRequested', { 
        chunkId,
        timestamp: Date.now()
      })
    }
  }

  private handleChunkUnloaded(chunkId: string): void {
    // Unload assets that are no longer needed
    this.eventManager.emit('chunkAssetsUnloaded', { 
      chunkId,
      timestamp: Date.now()
    })
  }

  private async preloadWorldAssets(worldId: string): Promise<void> {
    // Preload common world assets
    const commonAssets = [
      'world_ui_common',
      'world_audio_ambient',
      'world_textures_ground',
      'world_sprites_environment'
    ]
    
    await this.preloadAssets(commonAssets, 'high')
  }

  private unloadWorldAssets(worldId: string): void {
    // Unload world-specific assets
    const worldAssets = Array.from(this.assets.values())
      .filter(asset => asset.tags.includes(worldId))
    
    for (const asset of worldAssets) {
      this.unloadAsset(asset.id, 'manual')
    }
  }
}

export interface AssetLoadResult {
  success: boolean
  asset?: AssetData
  error?: string
  loadTime: number
}



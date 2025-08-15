import { EventManager } from '../core/EventManager'
import { WorldFactory } from './WorldFactory'
import { AssetManager } from './AssetManager'
import { AssetCompressionSystem } from './AssetCompressionSystem'

export interface ChunkData {
  id: string
  worldId: string
  position: ChunkPosition
  size: ChunkSize
  level: number
  isLoaded: boolean
  isActive: boolean
  isVisible: boolean
  lastAccessed: number
  accessCount: number
  memoryUsage: number
  assets: ChunkAssets
  entities: ChunkEntities
  metadata: ChunkMetadata
}

export interface ChunkPosition {
  x: number
  y: number
  z?: number
}

export interface ChunkSize {
  width: number
  height: number
  depth?: number
}

export interface ChunkAssets {
  textures: string[]
  sprites: string[]
  audio: string[]
  models: string[]
  effects: string[]
  totalSize: number
}

export interface ChunkEntities {
  npcs: string[]
  items: string[]
  puzzles: string[]
  enemies: string[]
  collectibles: string[]
  count: number
}

export interface ChunkMetadata {
  version: string
  lastModified: number
  author: string
  tags: string[]
  difficulty: number
  biome: string
  weather: string
  timeOfDay: string
}

export interface ChunkConfig {
  chunkSize: ChunkSize
  maxChunks: number
  loadDistance: number
  unloadDistance: number
  maxLODLevels: number
  memoryThreshold: number
  networkOptimization: boolean
  compressionLevel: number
}

export interface LODLevel {
  level: number
  distance: number
  detail: number
  assetQuality: 'low' | 'medium' | 'high' | 'ultra'
  renderDistance: number
}

export interface SpatialHash {
  key: string
  chunks: Set<string>
  bounds: ChunkBounds
}

export interface ChunkBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ?: number
  maxZ?: number
}

export interface ChunkLoadRequest {
  chunkId: string
  priority: 'critical' | 'high' | 'normal' | 'low'
  requester: string
  timestamp: number
}

export interface ChunkUnloadRequest {
  chunkId: string
  reason: 'distance' | 'memory' | 'performance' | 'manual'
  timestamp: number
}

export interface ChunkPerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage: number
  entityCount: number
  assetCount: number
  lastUpdate: number
}

export class ChunkManager {
  private static instance: ChunkManager
  private eventManager: EventManager
  private worldFactory: WorldFactory
  private assetManager: AssetManager
  private compressionSystem: AssetCompressionSystem
  
  private chunks: Map<string, ChunkData> = new Map()
  private activeChunks: Set<string> = new Set()
  private chunkCache: Map<string, ChunkData> = new Map()
  private spatialHash: Map<string, SpatialHash> = new Map()
  
  private loadQueue: ChunkLoadRequest[] = []
  private unloadQueue: ChunkUnloadRequest[] = []
  private loadingChunks: Set<string> = new Set()
  
  private config!: ChunkConfig
  private lodLevels!: LODLevel[]
  private performanceMetrics: Map<string, ChunkPerformanceMetrics> = new Map()
  
  private playerPosition: ChunkPosition = { x: 0, y: 0, z: 0 }
  private lastUpdateTime: number = Date.now()

  private constructor() {
    this.eventManager = EventManager.getInstance()
    this.worldFactory = WorldFactory.getInstance()
    this.assetManager = AssetManager.getInstance()
    this.compressionSystem = AssetCompressionSystem.getInstance()
    this.initializeConfig()
    this.initializeLODLevels()
    this.setupEventListeners()
  }

  public static getInstance(): ChunkManager {
    if (!ChunkManager.instance) {
      ChunkManager.instance = new ChunkManager()
    }
    return ChunkManager.instance
  }

  /**
   * Updates player position and manages chunk loading/unloading
   */
  public updatePlayerPosition(position: ChunkPosition): void {
    this.playerPosition = position
    this.updateChunkVisibility()
    this.processChunkQueues()
    this.optimizeMemoryUsage()
  }

  /**
   * Loads a chunk with specified priority and real asset loading
   */
  public async loadChunk(chunkId: string, priority: 'critical' | 'high' | 'normal' | 'low' = 'normal', requester: string = 'system'): Promise<ChunkData> {
    // Check if chunk is already loaded
    if (this.chunks.has(chunkId)) {
      const chunk = this.chunks.get(chunkId)!
      chunk.lastAccessed = Date.now()
      chunk.accessCount++
      return chunk
    }

    // Check if chunk is in cache
    if (this.chunkCache.has(chunkId)) {
      const chunk = this.chunkCache.get(chunkId)!
      this.chunkCache.delete(chunkId)
      this.chunks.set(chunkId, chunk)
      this.activeChunks.add(chunkId)
      chunk.lastAccessed = Date.now()
      chunk.accessCount++
      this.eventManager.emit('chunkLoaded', { chunkId, fromCache: true, timestamp: Date.now() })
      return chunk
    }

    // Add to load queue
    this.addToLoadQueue(chunkId, priority, requester)
    
    // If critical priority, load immediately
    if (priority === 'critical') {
      return this.loadChunkImmediately(chunkId)
    }

    // Return placeholder chunk
    return this.createPlaceholderChunk(chunkId)
  }

  /**
   * Unloads a chunk and moves it to cache
   */
  public unloadChunk(chunkId: string, reason: 'distance' | 'memory' | 'performance' | 'manual' = 'distance'): void {
    const chunk = this.chunks.get(chunkId)
    if (!chunk) return

    // Save chunk to cache
    this.chunkCache.set(chunkId, chunk)
    this.chunks.delete(chunkId)
    this.activeChunks.delete(chunkId)

    // Update chunk state
    chunk.isLoaded = false
    chunk.isActive = false
    chunk.isVisible = false

    this.eventManager.emit('chunkUnloaded', { chunkId, reason, timestamp: Date.now() })
  }

  /**
   * Gets chunks within a specified distance from player
   */
  public getChunksInRange(distance: number): ChunkData[] {
    const chunks: ChunkData[] = []
    
    for (const chunk of this.chunks.values()) {
      const chunkDistance = this.calculateDistance(this.playerPosition, chunk.position)
      if (chunkDistance <= distance) {
        chunks.push(chunk)
      }
    }
    
    return chunks.sort((a, b) => {
      const distanceA = this.calculateDistance(this.playerPosition, a.position)
      const distanceB = this.calculateDistance(this.playerPosition, b.position)
      return distanceA - distanceB
    })
  }

  /**
   * Gets the LOD level for a chunk based on distance
   */
  public getChunkLOD(chunkId: string): LODLevel {
    const chunk = this.chunks.get(chunkId)
    if (!chunk) return this.lodLevels[0]

    const distance = this.calculateDistance(this.playerPosition, chunk.position)
    
    for (let i = this.lodLevels.length - 1; i >= 0; i--) {
      if (distance <= this.lodLevels[i].distance) {
        return this.lodLevels[i]
      }
    }
    
    return this.lodLevels[0]
  }

  /**
   * Preloads chunks in a specific area
   */
  public async preloadChunks(center: ChunkPosition, radius: number, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    const chunkIds = this.getChunkIdsInArea(center, radius)
    
    for (const chunkId of chunkIds) {
      if (!this.chunks.has(chunkId) && !this.loadingChunks.has(chunkId)) {
        this.addToLoadQueue(chunkId, priority, 'preload')
      }
    }
    
    // Process high priority chunks immediately
    if (priority === 'high') {
      await this.processHighPriorityChunks()
    }
  }

  /**
   * Gets chunk performance metrics
   */
  public getChunkPerformance(chunkId: string): ChunkPerformanceMetrics | undefined {
    return this.performanceMetrics.get(chunkId)
  }

  /**
   * Gets all active chunks
   */
  public getActiveChunks(): ChunkData[] {
    return Array.from(this.activeChunks).map(id => this.chunks.get(id)!)
  }

  /**
   * Gets chunk statistics
   */
  public getChunkStats(): {
    totalChunks: number
    activeChunks: number
    cachedChunks: number
    loadingChunks: number
    totalMemoryUsage: number
    averageLoadTime: number
  } {
    const totalChunks = this.chunks.size
    const activeChunks = this.activeChunks.size
    const cachedChunks = this.chunkCache.size
    const loadingChunks = this.loadingChunks.size
    
    let totalMemoryUsage = 0
    let totalLoadTime = 0
    let loadTimeCount = 0
    
    for (const chunk of this.chunks.values()) {
      totalMemoryUsage += chunk.memoryUsage
    }
    
    for (const metrics of this.performanceMetrics.values()) {
      if (metrics.loadTime > 0) {
        totalLoadTime += metrics.loadTime
        loadTimeCount++
      }
    }
    
    const averageLoadTime = loadTimeCount > 0 ? totalLoadTime / loadTimeCount : 0
    
    return {
      totalChunks,
      activeChunks,
      cachedChunks,
      loadingChunks,
      totalMemoryUsage,
      averageLoadTime
    }
  }

  /**
   * Cleans up chunks based on memory threshold
   */
  public cleanupChunks(): void {
    const stats = this.getChunkStats()
    
    if (stats.totalMemoryUsage > this.config.memoryThreshold) {
      // Sort chunks by last accessed time and memory usage
      const allInactiveChunks = Array.from(this.chunks.values())
        .filter(chunk => !this.activeChunks.has(chunk.id))
        .sort((a, b) => {
          const timeDiff = a.lastAccessed - b.lastAccessed
          if (Math.abs(timeDiff) < 1000) {
            return b.memoryUsage - a.memoryUsage
          }
          return timeDiff
        })
      
      const chunksToUnload = allInactiveChunks.slice(0, Math.ceil(allInactiveChunks.length * 0.3)) // Unload 30% of inactive chunks
      
      for (const chunk of chunksToUnload) {
        this.unloadChunk(chunk.id, 'memory')
      }
    }
  }

  private initializeConfig(): void {
    this.config = {
      chunkSize: { width: 512, height: 512, depth: 256 },
      maxChunks: 64,
      loadDistance: 3,
      unloadDistance: 5,
      maxLODLevels: 4,
      memoryThreshold: 512 * 1024 * 1024, // 512MB
      networkOptimization: true,
      compressionLevel: 6
    }
  }

  private initializeLODLevels(): void {
    this.lodLevels = [
      {
        level: 0,
        distance: 0,
        detail: 1.0,
        assetQuality: 'ultra',
        renderDistance: 1
      },
      {
        level: 1,
        distance: 2,
        detail: 0.75,
        assetQuality: 'high',
        renderDistance: 2
      },
      {
        level: 2,
        distance: 4,
        detail: 0.5,
        assetQuality: 'medium',
        renderDistance: 3
      },
      {
        level: 3,
        distance: 6,
        detail: 0.25,
        assetQuality: 'low',
        renderDistance: 4
      }
    ]
  }

  private setupEventListeners(): void {
    // Listen for world-related events
    this.eventManager.on('worldCreated', ({ worldId }) => {
      this.initializeWorldChunks(worldId)
    })
    
    this.eventManager.on('worldUnloaded', ({ worldId }) => {
      this.unloadWorldChunks(worldId)
    })
    
    // Listen for asset-related events
    this.eventManager.on('assetLoadFailed', ({ assetId, error }) => {
      this.handleAssetLoadFailure(assetId, error)
    })
    
    this.eventManager.on('memoryWarning', ({ usage, threshold }) => {
      this.handleMemoryWarning(usage, threshold)
    })
  }

  private initializeWorldChunks(worldId: string): void {
    // Create initial chunks around world center
    const centerChunk = this.worldToChunkPosition({ x: 0, y: 0, z: 0 })
    
    for (let x = -this.config.loadDistance; x <= this.config.loadDistance; x++) {
      for (let y = -this.config.loadDistance; y <= this.config.loadDistance; y++) {
        const chunkPosition = {
          x: centerChunk.x + x,
          y: centerChunk.y + y,
          z: centerChunk.z || 0
        }
        
        const chunkId = this.generateChunkId(worldId, chunkPosition)
        this.createChunkTemplate(chunkId, worldId, chunkPosition)
      }
    }
  }

  private unloadWorldChunks(worldId: string): void {
    const chunksToUnload = Array.from(this.chunks.values())
      .filter(chunk => chunk.worldId === worldId)
    
    for (const chunk of chunksToUnload) {
      this.unloadChunk(chunk.id, 'manual')
    }
  }

  private createChunkTemplate(chunkId: string, worldId: string, position: ChunkPosition): void {
    const chunk: ChunkData = {
      id: chunkId,
      worldId,
      position,
      size: this.config.chunkSize,
      level: 0,
      isLoaded: false,
      isActive: false,
      isVisible: false,
      lastAccessed: Date.now(),
      accessCount: 0,
      memoryUsage: 0,
      assets: {
        textures: [],
        sprites: [],
        audio: [],
        models: [],
        effects: [],
        totalSize: 0
      },
      entities: {
        npcs: [],
        items: [],
        puzzles: [],
        enemies: [],
        collectibles: [],
        count: 0
      },
      metadata: {
        version: '1.0.0',
        lastModified: Date.now(),
        author: 'AI Pets Adventure Team',
        tags: [],
        difficulty: 1,
        biome: 'default',
        weather: 'clear',
        timeOfDay: 'day'
      }
    }
    
    this.chunks.set(chunkId, chunk)
  }

  private updateChunkVisibility(): void {
    for (const chunk of this.chunks.values()) {
      const distance = this.calculateDistance(this.playerPosition, chunk.position)
      const wasVisible = chunk.isVisible
      
      chunk.isVisible = distance <= this.config.loadDistance
      
      if (chunk.isVisible && !wasVisible) {
        this.eventManager.emit('chunkBecameVisible', { chunkId: chunk.id, timestamp: Date.now() })
      } else if (!chunk.isVisible && wasVisible) {
        this.eventManager.emit('chunkBecameHidden', { chunkId: chunk.id, timestamp: Date.now() })
      }
    }
  }

  private processChunkQueues(): void {
    // Process load queue
    this.processLoadQueue()
    
    // Process unload queue
    this.processUnloadQueue()
  }

  private processLoadQueue(): void {
    // Sort load queue by priority and timestamp
    this.loadQueue.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      
      if (priorityDiff !== 0) return priorityDiff
      return a.timestamp - b.timestamp
    })
    
    // Process high priority chunks first
    const highPriorityChunks = this.loadQueue.filter(req => req.priority === 'critical' || req.priority === 'high')
    
    for (const request of highPriorityChunks) {
      if (this.canLoadChunk(request.chunkId)) {
        this.loadChunkImmediately(request.chunkId)
        this.removeFromLoadQueue(request.chunkId)
      }
    }
  }

  private processUnloadQueue(): void {
    for (const request of this.unloadQueue) {
      const chunk = this.chunks.get(request.chunkId)
      if (chunk) {
        this.unloadChunk(request.chunkId, request.reason)
      }
    }
    
    this.unloadQueue = []
  }

  private async loadChunkImmediately(chunkId: string): Promise<ChunkData> {
    const chunk = this.chunks.get(chunkId)
    if (!chunk) {
      throw new Error(`Chunk '${chunkId}' not found`)
    }
    
    if (chunk.isLoaded) return chunk
    
    this.loadingChunks.add(chunkId)
    const startTime = Date.now()
    
    try {
      // Load chunk assets with real asset loading
      await this.loadChunkAssets(chunk)
      
      chunk.isLoaded = true
      chunk.isActive = true
      chunk.lastAccessed = Date.now()
      
      // Update performance metrics
      const loadTime = Date.now() - startTime
      this.updateChunkPerformance(chunkId, { 
        loadTime, 
        renderTime: 0, 
        memoryUsage: chunk.memoryUsage, 
        entityCount: chunk.entities.count, 
        assetCount: chunk.assets.textures.length + chunk.assets.sprites.length, 
        lastUpdate: Date.now() 
      })
      
      this.eventManager.emit('chunkLoaded', { chunkId, loadTime, timestamp: Date.now() })
      return chunk
    } catch (error) {
      this.eventManager.emit('chunkLoadFailed', { chunkId, error: error instanceof Error ? error.message : 'Unknown error', timestamp: Date.now() })
      throw error
    } finally {
      this.loadingChunks.delete(chunkId)
    }
  }

  private async loadChunkAssets(chunk: ChunkData): Promise<void> {
    try {
      // Get world template for asset generation
      const worldTemplate = this.worldFactory.getTemplate(chunk.worldId)
      if (!worldTemplate) {
        throw new Error(`World template not found for world: ${chunk.worldId}`)
      }
      
      // Generate chunk-specific asset paths
      const assetPaths = this.generateChunkAssetPaths(chunk)
      
      // Load assets progressively with compression
      await this.loadChunkAssetsProgressive(chunk, assetPaths)
      
      // Generate entities
      chunk.entities = this.generateChunkEntities(chunk)
      chunk.entities.count = chunk.entities.npcs.length + chunk.entities.items.length + 
                           chunk.entities.puzzles.length + chunk.entities.enemies.length + 
                           chunk.entities.collectibles.length
      
      // Update metadata
      chunk.metadata.biome = this.determineChunkBiome(chunk)
      chunk.metadata.difficulty = this.calculateChunkDifficulty(chunk)
      
      // Calculate real memory usage
      chunk.memoryUsage = await this.calculateRealMemoryUsage(chunk)
      chunk.assets.totalSize = chunk.memoryUsage
      
    } catch (error) {
      console.error(`Failed to load chunk assets for ${chunk.id}:`, error)
      throw new Error(`Asset loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private generateChunkAssetPaths(chunk: ChunkData): {
    textures: string[]
    sprites: string[]
    audio: string[]
    models: string[]
    effects: string[]
  } {
    const biome = this.determineChunkBiome(chunk)
    const basePath = `/assets/${biome}`
    
    return {
      textures: [
        `${basePath}/textures/ground_${chunk.position.x}_${chunk.position.y}.jpg`,
        `${basePath}/textures/wall_${chunk.position.x}_${chunk.position.y}.jpg`,
        `${basePath}/textures/ceiling_${chunk.position.x}_${chunk.position.y}.jpg`
      ],
      sprites: [
        `${basePath}/sprites/environment_${chunk.position.x}_${chunk.position.y}.png`,
        `${basePath}/sprites/decoration_${chunk.position.x}_${chunk.position.y}.png`
      ],
      audio: [
        `${basePath}/audio/ambient_${chunk.position.x}_${chunk.position.y}.mp3`,
        `${basePath}/audio/effects_${chunk.position.x}_${chunk.position.y}.mp3`
      ],
      models: [
        `${basePath}/models/structures_${chunk.position.x}_${chunk.position.y}.glb`
      ],
      effects: [
        `${basePath}/effects/particles_${chunk.position.x}_${chunk.position.y}.png`
      ]
    }
  }

  private async loadChunkAssetsProgressive(chunk: ChunkData, assetPaths: ReturnType<typeof this.generateChunkAssetPaths>): Promise<void> {
    const loadPromises: Promise<void>[] = []
    
    // Load textures with progressive quality
    for (const texturePath of assetPaths.textures) {
      loadPromises.push(this.loadAssetWithProgressiveQuality(texturePath, 'texture', chunk))
    }
    
    // Load sprites
    for (const spritePath of assetPaths.sprites) {
      loadPromises.push(this.loadAssetWithProgressiveQuality(spritePath, 'sprite', chunk))
    }
    
    // Load audio with compression
    for (const audioPath of assetPaths.audio) {
      loadPromises.push(this.loadAssetWithCompression(audioPath, 'audio', chunk))
    }
    
    // Load models
    for (const modelPath of assetPaths.models) {
      loadPromises.push(this.loadAssetWithProgressiveQuality(modelPath, 'model', chunk))
    }
    
    // Load effects
    for (const effectPath of assetPaths.effects) {
      loadPromises.push(this.loadAssetWithProgressiveQuality(effectPath, 'effect', chunk))
    }
    
    // Wait for all assets to load
    await Promise.allSettled(loadPromises)
    
    // Update chunk assets with loaded asset IDs
    chunk.assets.textures = assetPaths.textures
    chunk.assets.sprites = assetPaths.sprites
    chunk.assets.audio = assetPaths.audio
    chunk.assets.models = assetPaths.models
    chunk.assets.effects = assetPaths.effects
  }

  private async loadAssetWithProgressiveQuality(assetPath: string, assetType: string, chunk: ChunkData): Promise<void> {
    try {
      // Create progressive quality tiers
      const tiers = await this.compressionSystem.createProgressiveTiers(
        assetPath, 
        assetType as 'image' | 'texture' | 'audio' | 'data'
      )
      
      // Load the highest quality tier first, then progressively load lower tiers
      const qualityOrder: Array<'ultra' | 'high' | 'medium' | 'low'> = ['ultra', 'high', 'medium', 'low']
      
      for (const quality of qualityOrder) {
        const tier = tiers.get(quality)
        if (tier) {
          try {
            await this.assetManager.loadAsset(assetPath, 'normal', `chunk_${chunk.id}`)
            break // Use the first successfully loaded tier
          } catch (error) {
            console.warn(`Failed to load ${quality} quality for ${assetPath}:`, error)
            continue
          }
        }
      }
      
      this.eventManager.emit('progressiveTiersCreated', { 
        assetId: assetPath, 
        tiers: Array.from(tiers.entries()), 
        timestamp: Date.now() 
      })
      
    } catch (error) {
      console.error(`Failed to load progressive asset ${assetPath}:`, error)
      // Don't throw - allow chunk to load with missing assets
    }
  }

  private async loadAssetWithCompression(assetPath: string, assetType: string, chunk: ChunkData): Promise<void> {
    try {
      // Load asset with compression
      const compressedAsset = await this.compressionSystem.compressImage(
        assetPath,
        'medium'
      )
      
      // Store compressed asset
      await this.assetManager.loadAsset(assetPath, 'normal', `chunk_${chunk.id}`)
      
      this.eventManager.emit('assetCompressed', { 
        assetId: assetPath, 
        result: compressedAsset, 
        timestamp: Date.now() 
      })
      
    } catch (error) {
      console.error(`Failed to load compressed asset ${assetPath}:`, error)
      // Fallback to uncompressed loading
      try {
        await this.assetManager.loadAsset(assetPath, 'normal', `chunk_${chunk.id}`)
      } catch (fallbackError) {
        console.error(`Fallback loading also failed for ${assetPath}:`, fallbackError)
      }
    }
  }

  private async calculateRealMemoryUsage(chunk: ChunkData): Promise<number> {
    let totalMemory = 0
    
    try {
      // Calculate memory usage for each asset type
      for (const texturePath of chunk.assets.textures) {
        const asset = this.assetManager.getAsset(texturePath)
        if (asset) {
          totalMemory += asset.memoryUsage || 0
        }
      }
      
      for (const spritePath of chunk.assets.sprites) {
        const asset = this.assetManager.getAsset(spritePath)
        if (asset) {
          totalMemory += asset.memoryUsage || 0
        }
      }
      
      for (const audioPath of chunk.assets.audio) {
        const asset = this.assetManager.getAsset(audioPath)
        if (asset) {
          totalMemory += asset.memoryUsage || 0
        }
      }
      
      for (const modelPath of chunk.assets.models) {
        const asset = this.assetManager.getAsset(modelPath)
        if (asset) {
          totalMemory += asset.memoryUsage || 0
        }
      }
      
      for (const effectPath of chunk.assets.effects) {
        const asset = this.assetManager.getAsset(effectPath)
        if (asset) {
          totalMemory += asset.memoryUsage || 0
        }
      }
      
    } catch (error) {
      console.warn(`Error calculating real memory usage for chunk ${chunk.id}:`, error)
      // Fallback to estimated size
      totalMemory = this.calculateEstimatedMemoryUsage(chunk.assets)
    }
    
    return totalMemory
  }

  private calculateEstimatedMemoryUsage(assets: ChunkAssets): number {
    // Fallback estimation if real calculation fails
    let totalSize = 0
    
    totalSize += assets.textures.length * 1024 * 1024 // 1MB per texture
    totalSize += assets.sprites.length * 256 * 1024   // 256KB per sprite
    totalSize += assets.audio.length * 512 * 1024     // 512KB per audio
    totalSize += assets.models.length * 2048 * 1024   // 2MB per model
    totalSize += assets.effects.length * 128 * 1024   // 128KB per effect
    
    return totalSize
  }

  private generateChunkTextures(chunk: ChunkData): string[] {
    const textures: string[] = []
    const basePath = `/assets/images/textures/${chunk.metadata.biome}`
    
    // Generate textures based on chunk position and biome
    const textureCount = Math.floor(Math.random() * 5) + 3
    for (let i = 0; i < textureCount; i++) {
      textures.push(`${basePath}/texture_${chunk.position.x}_${chunk.position.y}_${i}.jpg`)
    }
    
    return textures
  }

  private generateChunkSprites(chunk: ChunkData): string[] {
    const sprites: string[] = []
    const basePath = `/assets/images/sprites/${chunk.metadata.biome}`
    
    // Generate sprites based on chunk content
    const spriteCount = Math.floor(Math.random() * 8) + 5
    for (let i = 0; i < spriteCount; i++) {
      sprites.push(`${basePath}/sprite_${chunk.position.x}_${chunk.position.y}_${i}.png`)
    }
    
    return sprites
  }

  private generateChunkAudio(chunk: ChunkData): string[] {
    const audio: string[] = []
    const basePath = `/assets/audio/${chunk.metadata.biome}`
    
    // Generate audio based on chunk environment
    const audioCount = Math.floor(Math.random() * 3) + 2
    for (let i = 0; i < audioCount; i++) {
      audio.push(`${basePath}/ambient_${chunk.position.x}_${chunk.position.y}_${i}.mp3`)
    }
    
    return audio
  }

  private generateChunkModels(chunk: ChunkData): string[] {
    const models: string[] = []
    const basePath = `/assets/models/${chunk.metadata.biome}`
    
    // Generate 3D models if needed
    const modelCount = Math.floor(Math.random() * 2)
    for (let i = 0; i < modelCount; i++) {
      models.push(`${basePath}/model_${chunk.position.x}_${chunk.position.y}_${i}.glb`)
    }
    
    return models
  }

  private generateChunkEffects(chunk: ChunkData): string[] {
    const effects: string[] = []
    const basePath = `/assets/effects/${chunk.metadata.biome}`
    
    // Generate visual effects
    const effectCount = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < effectCount; i++) {
      effects.push(`${basePath}/effect_${chunk.position.x}_${chunk.position.y}_${i}.png`)
    }
    
    return effects
  }

  private generateChunkEntities(chunk: ChunkData): ChunkEntities {
    const entities: ChunkEntities = {
      npcs: [],
      items: [],
      puzzles: [],
      enemies: [],
      collectibles: [],
      count: 0
    }
    
    // Generate entities based on chunk position and difficulty
    const entityCount = Math.floor(Math.random() * 10) + 5
    
    for (let i = 0; i < entityCount; i++) {
      const entityType = Math.random()
      const entityId = `entity_${chunk.id}_${i}`
      
      if (entityType < 0.2) {
        entities.npcs.push(entityId)
      } else if (entityType < 0.4) {
        entities.items.push(entityId)
      } else if (entityType < 0.6) {
        entities.puzzles.push(entityId)
      } else if (entityType < 0.8) {
        entities.enemies.push(entityId)
      } else {
        entities.collectibles.push(entityId)
      }
    }
    
    return entities
  }

  private determineChunkBiome(chunk: ChunkData): string {
    // Simple biome determination based on chunk position
    const x = chunk.position.x
    const y = chunk.position.y
    
    if (Math.abs(x) < 2 && Math.abs(y) < 2) return 'jungle'
    if (x > 2) return 'desert'
    if (x < -2) return 'arctic'
    if (y > 2) return 'mountain'
    if (y < -2) return 'ocean'
    
    return 'plains'
  }

  private calculateChunkDifficulty(chunk: ChunkData): number {
    // Calculate difficulty based on distance from center and biome
    const distance = Math.sqrt(chunk.position.x * chunk.position.x + chunk.position.y * chunk.position.y)
    const biomeMultiplier = this.getBiomeDifficultyMultiplier(chunk.metadata.biome)
    
    return Math.min(10, Math.max(1, Math.floor(distance * 0.5 * biomeMultiplier)))
  }

  private getBiomeDifficultyMultiplier(biome: string): number {
    const multipliers: { [key: string]: number } = {
      'jungle': 1.2,
      'desert': 1.5,
      'arctic': 1.8,
      'mountain': 1.6,
      'ocean': 1.3,
      'plains': 1.0
    }
    
    return multipliers[biome] || 1.0
  }

  private calculateAssetsSize(assets: ChunkAssets): number {
    // Estimate asset sizes (in bytes)
    let totalSize = 0
    
    totalSize += assets.textures.length * 1024 * 1024 // 1MB per texture
    totalSize += assets.sprites.length * 256 * 1024   // 256KB per sprite
    totalSize += assets.audio.length * 512 * 1024     // 512KB per audio
    totalSize += assets.models.length * 2048 * 1024   // 2MB per model
    totalSize += assets.effects.length * 128 * 1024   // 128KB per effect
    
    return totalSize
  }

  private addToLoadQueue(chunkId: string, priority: 'critical' | 'high' | 'normal' | 'low', requester: string): void {
    // Remove existing request for this chunk
    this.removeFromLoadQueue(chunkId)
    
    // Add new request
    this.loadQueue.push({
      chunkId,
      priority,
      requester,
      timestamp: Date.now()
    })
  }

  private removeFromLoadQueue(chunkId: string): void {
    this.loadQueue = this.loadQueue.filter(req => req.chunkId !== chunkId)
  }

  private canLoadChunk(chunkId: string): boolean {
    const stats = this.getChunkStats()
    
    // Check memory threshold
    if (stats.totalMemoryUsage > this.config.memoryThreshold * 0.8) {
      return false
    }
    
    // Check max chunks limit
    if (stats.totalChunks >= this.config.maxChunks) {
      return false
    }
    
    // Check if chunk is already loading
    if (this.loadingChunks.has(chunkId)) {
      return false
    }
    
    return true
  }

  private createPlaceholderChunk(chunkId: string): ChunkData {
    // Create a minimal placeholder chunk
    const [worldId, x, y] = chunkId.split('_')
    
    return {
      id: chunkId,
      worldId: worldId || 'unknown',
      position: { x: parseInt(x) || 0, y: parseInt(y) || 0, z: 0 },
      size: this.config.chunkSize,
      level: 0,
      isLoaded: false,
      isActive: false,
      isVisible: false,
      lastAccessed: Date.now(),
      accessCount: 0,
      memoryUsage: 0,
      assets: { textures: [], sprites: [], audio: [], models: [], effects: [], totalSize: 0 },
      entities: { npcs: [], items: [], puzzles: [], enemies: [], collectibles: [], count: 0 },
      metadata: {
        version: '1.0.0',
        lastModified: Date.now(),
        author: 'AI Pets Adventure Team',
        tags: ['placeholder'],
        difficulty: 1,
        biome: 'unknown',
        weather: 'clear',
        timeOfDay: 'day'
      }
    }
  }

  private worldToChunkPosition(worldPosition: ChunkPosition): ChunkPosition {
    return {
      x: Math.floor(worldPosition.x / this.config.chunkSize.width),
      y: Math.floor(worldPosition.y / this.config.chunkSize.height),
      z: worldPosition.z ? Math.floor(worldPosition.z / (this.config.chunkSize.depth || 1)) : 0
    }
  }

  private generateChunkId(worldId: string, position: ChunkPosition): string {
    return `${worldId}_${position.x}_${position.y}${position.z ? `_${position.z}` : ''}`
  }

  private calculateDistance(pos1: ChunkPosition, pos2: ChunkPosition): number {
    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    const dz = (pos1.z || 0) - (pos2.z || 0)
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  private getChunkIdsInArea(center: ChunkPosition, radius: number): string[] {
    const chunkIds: string[] = []
    const centerChunk = this.worldToChunkPosition(center)
    
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        const chunkPosition = {
          x: centerChunk.x + x,
          y: centerChunk.y + y,
          z: centerChunk.z || 0
        }
        
        const chunkId = this.generateChunkId('world', chunkPosition)
        chunkIds.push(chunkId)
      }
    }
    
    return chunkIds
  }

  private async processHighPriorityChunks(): Promise<void> {
    const highPriorityRequests = this.loadQueue.filter(req => req.priority === 'critical' || req.priority === 'high')
    
    for (const request of highPriorityRequests) {
      if (this.canLoadChunk(request.chunkId)) {
        try {
          await this.loadChunkImmediately(request.chunkId)
          this.removeFromLoadQueue(request.chunkId)
        } catch (error) {
          console.error(`Failed to load high priority chunk ${request.chunkId}:`, error)
        }
      }
    }
  }

  private updateChunkPerformance(chunkId: string, metrics: ChunkPerformanceMetrics): void {
    this.performanceMetrics.set(chunkId, metrics)
  }

  private optimizeMemoryUsage(): void {
    // Clean up old performance metrics
    const cutoffTime = Date.now() - 300000 // 5 minutes
    for (const [chunkId, metrics] of this.performanceMetrics.entries()) {
      if (metrics.lastUpdate < cutoffTime) {
        this.performanceMetrics.delete(chunkId)
      }
    }
    
    // Clean up chunks if memory usage is high
    if (this.getChunkStats().totalMemoryUsage > this.config.memoryThreshold * 0.9) {
      this.cleanupChunks()
    }
  }



  private handleAssetLoadFailure(assetId: string, error: string): void {
    // Find chunks that depend on this asset
    for (const chunk of this.chunks.values()) {
      if (chunk.assets.textures.includes(assetId) || 
          chunk.assets.sprites.includes(assetId) || 
          chunk.assets.audio.includes(assetId) || 
          chunk.assets.models.includes(assetId) || 
          chunk.assets.effects.includes(assetId)) {
        
        // Mark chunk as having failed assets
        chunk.metadata.tags.push('failed_assets')
        this.eventManager.emit('chunkAssetLoadFailed', { 
          chunkId: chunk.id, 
          assetId, 
          error, 
          timestamp: Date.now() 
        })
      }
    }
  }

  private handleMemoryWarning(usage: number, threshold: number): void {
    // Aggressively clean up chunks when memory is low
    if (usage > threshold * 0.9) {
      this.cleanupChunks()
      
      // Force unload distant chunks
      const distantChunks = this.getChunksInRange(this.config.unloadDistance + 2)
      for (const chunk of distantChunks) {
        if (!this.activeChunks.has(chunk.id)) {
          this.unloadChunk(chunk.id, 'memory')
        }
      }
    }
  }
}

export interface ChunkLoadResult {
  success: boolean
  chunk?: ChunkData
  error?: string
  loadTime: number
}



import { ChunkManager } from './ChunkManager'
import { EventManager } from '../core/EventManager'

/**
 * ChunkManager Demo - Demonstrates the fixed Chunking System
 * 
 * This demo showcases:
 * - Real asset loading integration with AssetManager
 * - Progressive asset loading with quality tiers
 * - Asset compression integration
 * - Memory management and optimization
 * - Event-driven chunk loading/unloading
 */
export class ChunkManagerDemo {
  private chunkManager: ChunkManager
  private eventManager: EventManager

  constructor() {
    this.chunkManager = ChunkManager.getInstance()
    this.eventManager = EventManager.getInstance()
    this.setupEventListeners()
  }

  /**
   * Demonstrates basic chunk loading functionality
   */
  public async demonstrateBasicChunkLoading(): Promise<void> {
    console.log('🚀 Starting ChunkManager Demo - Basic Chunk Loading')
    
    try {
      // Load a chunk with critical priority
      const chunk = await this.chunkManager.loadChunk('world_0_0', 'critical', 'demo')
      console.log('✅ Critical chunk loaded:', chunk.id)
      
      // Get chunk performance metrics
      const performance = this.chunkManager.getChunkPerformance(chunk.id)
      console.log('📊 Chunk performance:', performance)
      
      // Get chunk statistics
      const stats = this.chunkManager.getChunkStats()
      console.log('📈 Chunk statistics:', stats)
      
    } catch (error) {
      console.error('❌ Failed to load chunk:', error)
    }
  }

  /**
   * Demonstrates progressive chunk loading with multiple quality tiers
   */
  public async demonstrateProgressiveLoading(): Promise<void> {
    console.log('🎯 Starting Progressive Loading Demo')
    
    try {
      // Preload chunks in a specific area
      await this.chunkManager.preloadChunks(
        { x: 0, y: 0, z: 0 },
        2, // radius
        'high'
      )
      
      console.log('✅ Progressive chunk loading completed')
      
      // Get active chunks
      const activeChunks = this.chunkManager.getActiveChunks()
      console.log('🎮 Active chunks:', activeChunks.length)
      
    } catch (error) {
      console.error('❌ Progressive loading failed:', error)
    }
  }

  /**
   * Demonstrates memory management and optimization
   */
  public async demonstrateMemoryManagement(): Promise<void> {
    console.log('🧠 Starting Memory Management Demo')
    
    try {
      // Load multiple chunks to test memory management
      const chunkIds = ['world_1_0', 'world_0_1', 'world_1_1', 'world_2_0']
      
      for (const chunkId of chunkIds) {
        await this.chunkManager.loadChunk(chunkId, 'normal', 'demo')
        console.log(`✅ Loaded chunk: ${chunkId}`)
      }
      
      // Get updated statistics
      const stats = this.chunkManager.getChunkStats()
      console.log('📊 Updated chunk statistics:', stats)
      
      // Force memory cleanup
      this.chunkManager.cleanupChunks()
      console.log('🧹 Memory cleanup completed')
      
    } catch (error) {
      console.error('❌ Memory management demo failed:', error)
    }
  }

  /**
   * Demonstrates chunk LOD (Level of Detail) system
   */
  public demonstrateLODSystem(): void {
    console.log('🔍 Starting LOD System Demo')
    
    try {
      // Update player position to test LOD
      this.chunkManager.updatePlayerPosition({ x: 5, y: 5, z: 0 })
      console.log('📍 Player position updated')
      
      // Get chunks in range
      const chunksInRange = this.chunkManager.getChunksInRange(3)
      console.log('🎯 Chunks in range:', chunksInRange.length)
      
      // Get LOD for specific chunks
      for (const chunk of chunksInRange.slice(0, 3)) {
        const lod = this.chunkManager.getChunkLOD(chunk.id)
        console.log(`🎨 Chunk ${chunk.id} LOD:`, lod)
      }
      
    } catch (error) {
      console.error('❌ LOD system demo failed:', error)
    }
  }

  /**
   * Demonstrates chunk unloading and caching
   */
  public async demonstrateChunkUnloading(): Promise<void> {
    console.log('🗑️ Starting Chunk Unloading Demo')
    
    try {
      // Get current active chunks
      const activeChunks = this.chunkManager.getActiveChunks()
      console.log('🎮 Active chunks before unloading:', activeChunks.length)
      
      // Unload a chunk manually
      if (activeChunks.length > 0) {
        const chunkToUnload = activeChunks[0]
        this.chunkManager.unloadChunk(chunkToUnload.id, 'manual')
        console.log(`🗑️ Manually unloaded chunk: ${chunkToUnload.id}`)
      }
      
      // Get updated statistics
      const stats = this.chunkManager.getChunkStats()
      console.log('📊 Statistics after unloading:', stats)
      
    } catch (error) {
      console.error('❌ Chunk unloading demo failed:', error)
    }
  }

  /**
   * Demonstrates error handling and recovery
   */
  public async demonstrateErrorHandling(): Promise<void> {
    console.log('⚠️ Starting Error Handling Demo')
    
    try {
      // Try to load a non-existent chunk
      await this.chunkManager.loadChunk('invalid_chunk_id', 'normal', 'demo')
    } catch (error) {
      console.log('✅ Error properly caught and handled:', error instanceof Error ? error.message : 'Unknown error')
    }
    
    // Try to load a chunk with invalid world ID
    try {
      await this.chunkManager.loadChunk('invalid_world_0_0', 'normal', 'demo')
    } catch (error) {
      console.log('✅ Invalid world error handled:', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Demonstrates performance monitoring
   */
  public demonstratePerformanceMonitoring(): void {
    console.log('📊 Starting Performance Monitoring Demo')
    
    try {
      // Get comprehensive chunk statistics
      const stats = this.chunkManager.getChunkStats()
      console.log('📈 Overall chunk statistics:', {
        totalChunks: stats.totalChunks,
        activeChunks: stats.activeChunks,
        cachedChunks: stats.cachedChunks,
        loadingChunks: stats.loadingChunks,
        totalMemoryUsage: `${(stats.totalMemoryUsage / (1024 * 1024)).toFixed(2)} MB`,
        averageLoadTime: `${stats.averageLoadTime.toFixed(2)} ms`
      })
      
      // Monitor specific chunk performance
      const activeChunks = this.chunkManager.getActiveChunks()
      for (const chunk of activeChunks.slice(0, 3)) {
        const performance = this.chunkManager.getChunkPerformance(chunk.id)
        if (performance) {
          console.log(`🎯 Chunk ${chunk.id} performance:`, {
            loadTime: `${performance.loadTime} ms`,
            memoryUsage: `${(performance.memoryUsage / (1024 * 1024)).toFixed(2)} MB`,
            entityCount: performance.entityCount,
            assetCount: performance.assetCount
          })
        }
      }
      
    } catch (error) {
      console.error('❌ Performance monitoring failed:', error)
    }
  }

  /**
   * Runs the complete demo suite
   */
  public async runCompleteDemo(): Promise<void> {
    console.log('🎬 Starting Complete ChunkManager Demo Suite')
    console.log('=' .repeat(60))
    
    try {
      // Run all demo sections
      await this.demonstrateBasicChunkLoading()
      console.log('-' .repeat(40))
      
      await this.demonstrateProgressiveLoading()
      console.log('-' .repeat(40))
      
      await this.demonstrateMemoryManagement()
      console.log('-' .repeat(40))
      
      this.demonstrateLODSystem()
      console.log('-' .repeat(40))
      
      await this.demonstrateChunkUnloading()
      console.log('-' .repeat(40))
      
      await this.demonstrateErrorHandling()
      console.log('-' .repeat(40))
      
      this.demonstratePerformanceMonitoring()
      console.log('-' .repeat(40))
      
      console.log('🎉 Complete ChunkManager Demo Suite Finished Successfully!')
      
    } catch (error) {
      console.error('💥 Demo suite failed:', error)
    }
  }

  /**
   * Sets up event listeners for monitoring chunk system events
   */
  private setupEventListeners(): void {
    // Monitor chunk loading events
    this.eventManager.on('chunkLoaded', ({ chunkId, fromCache, loadTime, timestamp }) => {
      console.log(`🎯 Chunk loaded: ${chunkId}`, {
        fromCache: fromCache || false,
        loadTime: loadTime || 'N/A',
        timestamp: new Date(timestamp).toLocaleTimeString()
      })
    })
    
    // Monitor chunk unloading events
    this.eventManager.on('chunkUnloaded', ({ chunkId, reason, timestamp }) => {
      console.log(`🗑️ Chunk unloaded: ${chunkId}`, {
        reason,
        timestamp: new Date(timestamp).toLocaleTimeString()
      })
    })
    
    // Monitor chunk load failures
    this.eventManager.on('chunkLoadFailed', ({ chunkId, error, timestamp }) => {
      console.warn(`⚠️ Chunk load failed: ${chunkId}`, {
        error,
        timestamp: new Date(timestamp).toLocaleTimeString()
      })
    })
    
    // Monitor chunk visibility changes
    this.eventManager.on('chunkBecameVisible', ({ chunkId, timestamp }) => {
      console.log(`👁️ Chunk became visible: ${chunkId}`, {
        timestamp: new Date(timestamp).toLocaleTimeString()
      })
    })
    
    this.eventManager.on('chunkBecameHidden', ({ chunkId, timestamp }) => {
      console.log(`🙈 Chunk became hidden: ${chunkId}`, {
        timestamp: new Date(timestamp).toLocaleTimeString()
      })
    })
    
    // Monitor asset compression events
    this.eventManager.on('assetCompressed', ({ assetId, result, timestamp }) => {
      console.log(`🗜️ Asset compressed: ${assetId}`, {
        timestamp: new Date(timestamp).toLocaleTimeString()
      })
    })
    
    // Monitor progressive tier creation
    this.eventManager.on('progressiveTiersCreated', ({ assetId, tiers, timestamp }) => {
      console.log(`🎨 Progressive tiers created: ${assetId}`, {
        tierCount: tiers.length,
        timestamp: new Date(timestamp).toLocaleTimeString()
      })
    })
  }
}

// Export a function to run the demo
export function runChunkManagerDemo(): void {
  const demo = new ChunkManagerDemo()
  demo.runCompleteDemo().catch(console.error)
}

// Auto-run demo if this file is executed directly
if (typeof window !== 'undefined' && (window as any).runChunkManagerDemo) {
  (window as any).runChunkManagerDemo = runChunkManagerDemo
}


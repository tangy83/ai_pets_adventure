import { EventManager } from './EventManager'
import { MemoryManagement, TextureAtlasConfig, ObjectPoolConfig } from './MemoryManagement'

export interface AssetConfig {
  format: 'webp' | 'png' | 'jpg' | 'avif'
  quality: number
  compression: 'lossy' | 'lossless'
  maxWidth?: number
  maxHeight?: number
}

export interface AudioConfig {
  format: 'mp3' | 'ogg' | 'wav' | 'aac'
  bitrate: number
  channels: number
  sampleRate: number
}

export interface LazyLoadConfig {
  threshold: number
  rootMargin: string
  delay: number
  batchSize: number
}

export interface MemoryConfig {
  maxTextureSize: number
  maxAudioBufferSize: number
  objectPoolSize: number
  gcThreshold: number
  enableTextureAtlasing: boolean
  enableEnhancedObjectPooling: boolean
}

export interface NetworkConfig {
  progressiveLoading: boolean
  chunkSize: number
  retryAttempts: number
  timeout: number
  cacheStrategy: 'memory' | 'localStorage' | 'indexedDB'
  enableRangeRequests: boolean
  enableCompression: boolean
  enablePreloading: boolean
  maxConcurrentRequests: number
  requestQueueSize: number
  adaptiveChunkSize: boolean
  connectionQualityThreshold: number
  bandwidthEstimation: boolean
}

export interface PerformanceMetrics {
  fps: number
  memoryUsage: number
  networkLatency: number
  assetLoadTime: number
  compressionRatio: number
  cacheHitRate: number
}

export class PerformanceOptimization {
  private eventManager: EventManager
  private assetConfig: AssetConfig
  private audioConfig: AudioConfig
  private lazyLoadConfig: LazyLoadConfig
  private memoryConfig: MemoryConfig
  private networkConfig: NetworkConfig
  
  private performanceMetrics: PerformanceMetrics
  private assetCache: Map<string, any> = new Map()
  private objectPools: Map<string, any[]> = new Map()
  private lazyLoadQueue: Set<string> = new Set()
  private compressionWorker?: Worker
  private memoryManagement: MemoryManagement
  
  private isEnabled: boolean = true
  private frameCount: number = 0
  private lastFrameTime: number = 0

  constructor(eventManager: EventManager) {
    this.eventManager = eventManager
    this.performanceMetrics = {
      fps: 0,
      memoryUsage: 0,
      networkLatency: 0,
      assetLoadTime: 0,
      compressionRatio: 0,
      cacheHitRate: 0
    }

    this.setupDefaultConfigs()
    this.initializeCompressionWorker()
    this.memoryManagement = new MemoryManagement(eventManager)
    this.setupEventListeners()
  }

  private setupDefaultConfigs(): void {
    // Asset compression configuration
    this.assetConfig = {
      format: 'webp',
      quality: 0.8,
      compression: 'lossy',
      maxWidth: 2048,
      maxHeight: 2048
    }

    // Audio compression configuration
    this.audioConfig = {
      format: 'mp3',
      bitrate: 128,
      channels: 2,
      sampleRate: 44100
    }

    // Lazy loading configuration
    this.lazyLoadConfig = {
      threshold: 0.1,
      rootMargin: '50px',
      delay: 100,
      batchSize: 5
    }

    // Memory management configuration
    this.memoryConfig = {
      maxTextureSize: 4096,
      maxAudioBufferSize: 50 * 1024 * 1024, // 50MB
      objectPoolSize: 100,
      gcThreshold: 0.8,
      enableTextureAtlasing: true,
      enableEnhancedObjectPooling: true
    }

    // Network efficiency configuration
    this.networkConfig = {
      progressiveLoading: true,
      chunkSize: 64 * 1024, // 64KB
      retryAttempts: 3,
      timeout: 10000,
      cacheStrategy: 'indexedDB',
      enableRangeRequests: true,
      enableCompression: true,
      enablePreloading: false,
      maxConcurrentRequests: 6,
      requestQueueSize: 100,
      adaptiveChunkSize: true,
      connectionQualityThreshold: 0.5,
      bandwidthEstimation: true
    }
  }

  private initializeCompressionWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.compressionWorker = new Worker('/workers/compression-worker.js')
        this.compressionWorker.onmessage = this.handleCompressionMessage.bind(this)
        this.compressionWorker.onerror = this.handleCompressionError.bind(this)
      } catch (error) {
        console.warn('Compression worker not available, using main thread compression')
      }
    }
  }

  private setupEventListeners(): void {
    this.eventManager.on('assetRequested', this.handleAssetRequest.bind(this))
    this.eventManager.on('memoryWarning', this.handleMemoryWarning.bind(this))
    this.eventManager.on('networkSlow', this.handleNetworkSlow.bind(this))
  }

  // Asset Compression Methods
  public async compressImage(imageData: ImageData, config?: Partial<AssetConfig>): Promise<Blob> {
    const finalConfig = { ...this.assetConfig, ...config }
    
    if (this.compressionWorker) {
      return new Promise((resolve, reject) => {
        const messageId = Date.now().toString()
        
        const timeout = setTimeout(() => {
          reject(new Error('Image compression timeout'))
        }, 10000)

        const handleMessage = (event: MessageEvent) => {
          if (event.data.id === messageId) {
            clearTimeout(timeout)
            this.compressionWorker!.removeEventListener('message', handleMessage)
            
            if (event.data.error) {
              reject(new Error(event.data.error))
            } else {
              resolve(event.data.result)
            }
          }
        }

        this.compressionWorker!.addEventListener('message', handleMessage)
        this.compressionWorker!.postMessage({
          id: messageId,
          type: 'compressImage',
          imageData,
          config: finalConfig
        })
      })
    } else {
      // Fallback to main thread compression
      return this.compressImageMainThread(imageData, finalConfig)
    }
  }

  private async compressImageMainThread(imageData: ImageData, config: AssetConfig): Promise<Blob> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // Resize if needed
    if (config.maxWidth && imageData.width > config.maxWidth) {
      const ratio = config.maxWidth / imageData.width
      canvas.width = config.maxWidth
      canvas.height = imageData.height * ratio
    } else if (config.maxHeight && imageData.height > config.maxHeight) {
      const ratio = config.maxHeight / imageData.height
      canvas.width = imageData.width * ratio
      canvas.height = config.maxHeight
    } else {
      canvas.width = imageData.width
      canvas.height = imageData.height
    }

    ctx.putImageData(imageData, 0, 0)
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!)
      }, `image/${config.format}`, config.quality)
    })
  }

  public async compressAudio(audioData: ArrayBuffer, config?: Partial<AudioConfig>): Promise<ArrayBuffer> {
    const finalConfig = { ...this.audioConfig, ...config }
    
    if (this.compressionWorker) {
      return new Promise((resolve, reject) => {
        const messageId = Date.now().toString()
        
        const timeout = setTimeout(() => {
          reject(new Error('Audio compression timeout'))
        }, 15000)

        const handleMessage = (event: MessageEvent) => {
          if (event.data.id === messageId) {
            clearTimeout(timeout)
            this.compressionWorker!.removeEventListener('message', handleMessage)
            
            if (event.data.error) {
              reject(new Error(event.data.error))
            } else {
              resolve(event.data.result)
            }
          }
        }

        this.compressionWorker!.addEventListener('message', handleMessage)
        this.compressionWorker!.postMessage({
          id: messageId,
          type: 'compressAudio',
          audioData,
          config: finalConfig
        })
      })
    } else {
      // Fallback to main thread compression (simplified)
      return audioData
    }
  }

  // Lazy Loading Methods
  public setupLazyLoading(container: HTMLElement, assets: string[]): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const assetId = entry.target.getAttribute('data-asset-id')
            if (assetId) {
              this.loadAsset(assetId)
            }
          }
        })
      },
      {
        threshold: this.lazyLoadConfig.threshold,
        rootMargin: this.lazyLoadConfig.rootMargin
      }
    )

    assets.forEach((asset, index) => {
      const placeholder = document.createElement('div')
      placeholder.setAttribute('data-asset-id', asset)
      placeholder.style.minHeight = '100px'
      placeholder.style.background = '#f0f0f0'
      placeholder.textContent = `Loading ${asset}...`
      
      container.appendChild(placeholder)
      observer.observe(placeholder)
      
      // Add to lazy load queue
      this.lazyLoadQueue.add(asset)
    })
  }

  public async loadAsset(assetId: string): Promise<any> {
    if (this.assetCache.has(assetId)) {
      this.updateCacheHitRate(true)
      return this.assetCache.get(assetId)
    }

    this.updateCacheHitRate(false)
    const startTime = performance.now()

    try {
      const asset = await this.fetchAsset(assetId)
      this.assetCache.set(assetId, asset)
      
      const loadTime = performance.now() - startTime
      this.updateAssetLoadTime(loadTime)
      
      this.eventManager.emit('assetLoaded', { assetId, loadTime, timestamp: Date.now() })
      return asset
    } catch (error) {
      this.eventManager.emit('assetLoadError', { assetId, error, timestamp: Date.now() })
      throw error
    }
  }

  private async fetchAsset(assetId: string): Promise<any> {
    // Progressive loading implementation
    if (this.networkConfig.progressiveLoading) {
      // Use the enhanced range request method for progressive loading
      const response = await fetch(`/assets/${assetId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch asset: ${response.statusText}`)
      }
      return response.arrayBuffer()
    } else {
      return this.fetchAssetStandard(assetId)
    }
  }

  private async fetchAssetProgressive(assetId: string): Promise<any> {
    const response = await fetch(`/assets/${assetId}`, {
      headers: {
        'Range': 'bytes=0-'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch asset: ${response.statusText}`)
    }

    const contentLength = response.headers.get('content-length')
    const totalSize = contentLength ? parseInt(contentLength) : 0
    
    if (totalSize > this.networkConfig.chunkSize) {
      return this.fetchAssetInChunks(assetId, totalSize)
    } else {
      return response.arrayBuffer()
    }
  }

  private async fetchAssetInChunks(assetId: string, totalSize: number): Promise<ArrayBuffer> {
    // Use the enhanced range request method
    return this.fetchAssetWithRangeRequests(assetId, totalSize)
  }

  private async fetchAssetStandard(assetId: string): Promise<any> {
    const response = await fetch(`/assets/${assetId}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch asset: ${response.statusText}`)
    }

    return response.arrayBuffer()
  }

  // Memory Management Methods
  public createObjectPool<T>(type: string, factory: () => T, initialSize?: number): void {
    if (this.memoryConfig.enableEnhancedObjectPooling) {
      // Use enhanced object pooling from MemoryManagement
      this.memoryManagement.createObjectPool(type, factory, () => {}, { initialSize })
    } else {
      // Fallback to basic object pooling
      const pool: T[] = []
      const size = initialSize || this.memoryConfig.objectPoolSize
      
      for (let i = 0; i < size; i++) {
        pool.push(factory())
      }
      
      this.objectPools.set(type, pool)
    }
  }

  public getObjectFromPool<T>(type: string, factory: () => T): T {
    if (this.memoryConfig.enableEnhancedObjectPooling) {
      // Use enhanced object pooling from MemoryManagement
      return this.memoryManagement.getObjectFromPool<T>(type)
    } else {
      // Fallback to basic object pooling
      const pool = this.objectPools.get(type) as T[]
      
      if (pool && pool.length > 0) {
        return pool.pop()!
      } else {
        return factory()
      }
    }
  }

  public returnObjectToPool<T>(type: string, obj: T): void {
    if (this.memoryConfig.enableEnhancedObjectPooling) {
      // Use enhanced object pooling from MemoryManagement
      return this.memoryManagement.returnObjectToPool<T>(type, obj)
    } else {
      // Fallback to basic object pooling
      const pool = this.objectPools.get(type) as T[]
      
      if (pool && pool.length < this.memoryConfig.objectPoolSize) {
        pool.push(obj)
      }
    }
  }

  // Texture Atlasing Methods
  public createTextureAtlas(id: string, size?: number): any {
    if (this.memoryConfig.enableTextureAtlasing) {
      return this.memoryManagement.createTextureAtlas(id, size)
    } else {
      throw new Error('Texture atlasing is disabled in current configuration')
    }
  }

  public addTextureToAtlas(atlasId: string, textureId: string, image: HTMLImageElement): boolean {
    if (this.memoryConfig.enableTextureAtlasing) {
      return this.memoryManagement.addTextureToAtlas(atlasId, textureId, image)
    } else {
      return false
    }
  }

  public getTextureFromAtlas(atlasId: string, textureId: string): any {
    if (this.memoryConfig.enableTextureAtlasing) {
      return this.memoryManagement.getTextureFromAtlas(atlasId, textureId)
    } else {
      return null
    }
  }

  public optimizeTextureAtlases(): void {
    if (this.memoryConfig.enableTextureAtlasing) {
      this.memoryManagement.optimizeTextureAtlases()
    }
  }

  // Enhanced Memory Management Methods
  public getMemoryStats(): any {
    if (this.memoryConfig.enableEnhancedObjectPooling || this.memoryConfig.enableTextureAtlasing) {
      return this.memoryManagement.getMemoryStats()
    } else {
      return {
        totalMemoryUsage: this.getMemoryUsage(),
        textureMemoryUsage: 0,
        objectPoolMemoryUsage: 0,
        cacheMemoryUsage: 0,
        atlasCount: 0,
        poolCount: this.objectPools.size,
        cacheHitRate: this.performanceMetrics.cacheHitRate,
        memoryEfficiency: 0
      }
    }
  }

  public optimizeMemory(): void {
    if (this.memoryConfig.enableEnhancedObjectPooling || this.memoryConfig.enableTextureAtlasing) {
      this.memoryManagement.optimizeMemory()
    } else {
      this.manageMemory()
    }
  }

  public setMemoryConfig(config: Partial<MemoryConfig>): void {
    this.memoryConfig = { ...this.memoryConfig, ...config }
    
    // Update MemoryManagement configuration if needed
    if (this.memoryManagement) {
      if (config.enableTextureAtlasing !== undefined) {
        // Texture atlasing config changes
      }
      if (config.enableEnhancedObjectPooling !== undefined) {
        // Object pooling config changes
      }
    }
  }

  public manageMemory(): void {
    const memoryUsage = this.getMemoryUsage()
    
    if (memoryUsage > this.memoryConfig.gcThreshold) {
      this.performGarbageCollection()
    }
    
    this.updateMemoryUsage(memoryUsage)
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / (performance as any).memory.jsHeapSizeLimit
    }
    return 0
  }

  private performGarbageCollection(): void {
    // Clear old assets from cache
    const maxCacheSize = 100
    if (this.assetCache.size > maxCacheSize) {
      const entries = Array.from(this.assetCache.entries())
      const toRemove = entries.slice(0, entries.length - maxCacheSize)
      
      toRemove.forEach(([key]) => {
        this.assetCache.delete(key)
      })
    }

    // Clear object pools if memory is still high
    if (this.getMemoryUsage() > this.memoryConfig.gcThreshold) {
      this.objectPools.clear()
    }

    this.eventManager.emit('garbageCollection', {
      timestamp: performance.now(),
      cacheSize: this.assetCache.size,
      poolCount: this.objectPools.size
    })
  }

  // Browser Compatibility Methods
  public checkBrowserCompatibility(): {
    webp: boolean
    webAudio: boolean
    webWorkers: boolean
    serviceWorkers: boolean
    indexedDB: boolean
  } {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    const compatibility = {
      webp: false,
      webAudio: false,
      webWorkers: false,
      serviceWorkers: false,
      indexedDB: false
    }

    // Check WebP support
    if (ctx) {
      try {
        const dataURL = canvas.toDataURL('image/webp')
        compatibility.webp = dataURL.indexOf('data:image/webp') === 0
      } catch (e) {
        compatibility.webp = false
      }
    }

    // Check Web Audio API
    compatibility.webAudio = typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined'

    // Check Web Workers
    compatibility.webWorkers = typeof Worker !== 'undefined'

    // Check Service Workers
    compatibility.serviceWorkers = 'serviceWorker' in navigator

    // Check IndexedDB
    compatibility.indexedDB = 'indexedDB' in window

    return compatibility
  }

  public adaptToBrowserCapabilities(): void {
    const compatibility = this.checkBrowserCompatibility()
    
    // Adapt asset format based on browser support
    if (!compatibility.webp) {
      this.assetConfig.format = 'png'
      this.assetConfig.compression = 'lossless'
    }

    // Adapt audio format based on browser support
    if (!compatibility.webAudio) {
      this.audioConfig.format = 'mp3'
    }

    // Adapt cache strategy based on browser support
    if (!compatibility.indexedDB) {
      this.networkConfig.cacheStrategy = 'localStorage'
    }

    // Adapt to worker availability
    if (!compatibility.webWorkers) {
      this.compressionWorker = undefined
    }

    this.eventManager.emit('browserAdaptation', {
      compatibility,
      adaptedConfig: {
        asset: this.assetConfig,
        audio: this.audioConfig,
        cache: this.networkConfig.cacheStrategy
      }
    })
  }

  // Performance Monitoring Methods
  public updatePerformanceMetrics(): void {
    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastFrameTime
    
    if (deltaTime > 0) {
      this.performanceMetrics.fps = 1000 / deltaTime
    }
    
    this.lastFrameTime = currentTime
    this.frameCount++
    
    // Update memory usage
    this.manageMemory()
    
    // Emit performance update
    this.eventManager.emit('performanceUpdate', {
      metrics: this.performanceMetrics,
      frameCount: this.frameCount,
      timestamp: currentTime
    })
  }

  private updateCacheHitRate(hit: boolean): void {
    const currentRate = this.performanceMetrics.cacheHitRate
    const totalRequests = this.frameCount
    
    if (totalRequests > 0) {
      this.performanceMetrics.cacheHitRate = 
        (currentRate * (totalRequests - 1) + (hit ? 1 : 0)) / totalRequests
    }
  }

  private updateAssetLoadTime(loadTime: number): void {
    const currentAvg = this.performanceMetrics.assetLoadTime
    const totalAssets = this.assetCache.size
    
    if (totalAssets > 0) {
      this.performanceMetrics.assetLoadTime = 
        (currentAvg * (totalAssets - 1) + loadTime) / totalAssets
    }
  }

  private updateMemoryUsage(usage: number): void {
    this.performanceMetrics.memoryUsage = usage
  }

  // Enhanced Network Efficiency Methods
  public async fetchAssetWithRetry(assetId: string, retryCount: number = 0): Promise<ArrayBuffer> {
    try {
      const startTime = performance.now()
      
      // Emit asset requested event
      this.eventManager.emit('assetRequested', {
        assetId,
        timestamp: Date.now()
      })

      const result = await global.fetch(`/assets/${assetId}`).then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch asset: ${response.statusText}`)
        }
        return response.arrayBuffer()
      })
      const loadTime = performance.now() - startTime
      
      // Emit asset loaded event
      this.eventManager.emit('assetLoaded', {
        assetId,
        size: result.byteLength,
        loadTime,
        timestamp: Date.now()
      })

      return result
    } catch (error) {
      if (retryCount < this.networkConfig.retryAttempts) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        
        return this.fetchAssetWithRetry(assetId, retryCount + 1)
      } else {
        // Emit asset load error event
        this.eventManager.emit('assetLoadError', {
          assetId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        })
        throw error
      }
    }
  }

  public async fetchAssetWithRangeRequests(assetId: string, totalSize: number): Promise<ArrayBuffer> {
    if (!this.networkConfig.enableRangeRequests) {
      return this.fetchAssetStandard(assetId)
    }

    const chunks: ArrayBuffer[] = []
    const chunkSize = this.networkConfig.chunkSize
    const maxConcurrent = this.networkConfig.maxConcurrentRequests
    
    // Create chunks
    const chunkRequests: Array<{ start: number; end: number; index: number }> = []
    for (let start = 0; start < totalSize; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, totalSize - 1)
      chunkRequests.push({ start, end, index: chunkRequests.length })
    }

    // Process chunks with concurrency control
    for (let i = 0; i < chunkRequests.length; i += maxConcurrent) {
      const batch = chunkRequests.slice(i, i + maxConcurrent)
      const batchPromises = batch.map(async ({ start, end, index }) => {
        try {
          const response = await fetch(`/assets/${assetId}`, {
            headers: {
              'Range': `bytes=${start}-${end}`,
              'X-Preload': 'false'
            }
          })

          if (!response.ok) {
            throw new Error(`Failed to fetch chunk ${index}: ${response.statusText}`)
          }

          const chunk = await response.arrayBuffer()
          return { index, chunk }
        } catch (error) {
          throw new Error(`Chunk ${index} failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      })

      const batchResults = await Promise.all(batchPromises)
      
      // Sort and add chunks
      batchResults.sort((a, b) => a.index - b.index)
      for (const { chunk } of batchResults) {
        chunks.push(chunk)
      }

      // Emit progress event
      this.eventManager.emit('assetLoadProgress', {
        assetId,
        loaded: chunks.length * chunkSize,
        total: totalSize,
        progress: (chunks.length * chunkSize) / totalSize,
        timestamp: Date.now()
      })
    }

    // Combine chunks
    return this.combineChunks(chunks, totalSize)
  }

  private combineChunks(chunks: ArrayBuffer[], totalSize: number): ArrayBuffer {
    const result = new ArrayBuffer(totalSize)
    const uint8Array = new Uint8Array(result)
    let offset = 0
    
    for (const chunk of chunks) {
      uint8Array.set(new Uint8Array(chunk), offset)
      offset += chunk.byteLength
    }

    return result
  }

  public async estimateBandwidth(): Promise<number> {
    if (!this.networkConfig.bandwidthEstimation) {
      return 0
    }

    try {
      const testUrl = '/api/bandwidth-test'
      const testSize = 64 * 1024 // 64KB test
      
      const startTime = performance.now()
      const response = await fetch(testUrl, {
        method: 'HEAD'
      })
      
      if (!response.ok) {
        return 0
      }

      const contentLength = response.headers.get('content-length')
      if (!contentLength) {
        return 0
      }

      const size = parseInt(contentLength, 10)
      const endTime = performance.now()
      const duration = (endTime - startTime) / 1000 // Convert to seconds
      
      // Calculate bandwidth in bytes per second
      const bandwidth = size / duration
      
      // Update network configuration based on bandwidth
      this.adaptToBandwidth(bandwidth)
      
      return bandwidth
    } catch (error) {
      console.warn('Bandwidth estimation failed:', error)
      return 0
    }
  }

  private adaptToBandwidth(bandwidth: number): void {
    if (this.networkConfig.adaptiveChunkSize) {
      // Adjust chunk size based on bandwidth
      if (bandwidth > 10 * 1024 * 1024) { // > 10MB/s
        this.networkConfig.chunkSize = 256 * 1024 // 256KB
      } else if (bandwidth > 1 * 1024 * 1024) { // > 1MB/s
        this.networkConfig.chunkSize = 128 * 1024 // 128KB
      } else {
        this.networkConfig.chunkSize = 64 * 1024 // 64KB
      }
    }

    // Adjust concurrent requests based on bandwidth
    if (bandwidth > 5 * 1024 * 1024) { // > 5MB/s
      this.networkConfig.maxConcurrentRequests = 8
    } else if (bandwidth > 1 * 1024 * 1024) { // > 1MB/s
      this.networkConfig.maxConcurrentRequests = 6
    } else {
      this.networkConfig.maxConcurrentRequests = 3
    }
  }

  public async preloadAssets(assetIds: string[]): Promise<void> {
    if (!this.networkConfig.enablePreloading) {
      return
    }

    const preloadPromises = assetIds.map(async (assetId) => {
      try {
        // Check if already cached
        if (this.assetCache.has(assetId)) {
          return
        }

        // Preload with low priority
        const response = await fetch(`/assets/${assetId}`, {
          headers: {
            'X-Preload': 'true'
          }
        })

        if (response.ok) {
          const data = await response.arrayBuffer()
          this.assetCache.set(assetId, data)
        }
      } catch (error) {
        // Silently fail for preloading
        console.debug(`Preload failed for ${assetId}:`, error)
      }
    })

    await Promise.allSettled(preloadPromises)
  }

  public getNetworkMetrics(): {
    latency: number
    bandwidth: number
    chunkSize: number
    concurrentRequests: number
    cacheHitRate: number
  } {
    return {
      latency: this.performanceMetrics.networkLatency,
      bandwidth: 0, // Would be calculated from bandwidth estimation
      chunkSize: this.networkConfig.chunkSize,
      concurrentRequests: this.networkConfig.maxConcurrentRequests,
      cacheHitRate: this.performanceMetrics.cacheHitRate
    }
  }

  public optimizeNetwork(): void {
    const currentLatency = this.performanceMetrics.networkLatency
    const optimizations: string[] = []

    // Adaptive chunk sizing
    if (currentLatency > 1000) { // > 1 second
      this.networkConfig.chunkSize = Math.max(16 * 1024, this.networkConfig.chunkSize / 2)
      optimizations.push('reduced_chunk_size')
    }

    // Adjust concurrent requests
    if (currentLatency > 2000) { // > 2 seconds
      this.networkConfig.maxConcurrentRequests = Math.max(2, this.networkConfig.maxConcurrentRequests - 1)
      optimizations.push('reduced_concurrent_requests')
    }

    // Increase timeout for slow connections
    if (currentLatency > 3000) { // > 3 seconds
      this.networkConfig.maxConcurrentRequests = Math.min(30000, this.networkConfig.timeout * 1.2)
      optimizations.push('increased_timeout')
    }

    if (optimizations.length > 0) {
      this.eventManager.emit('networkOptimized', {
        previousLatency: currentLatency,
        currentLatency: this.performanceMetrics.networkLatency,
        optimizations,
        timestamp: Date.now()
      })
    }
  }

  // Public API Methods
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics }
  }

  public getAssetConfig(): AssetConfig {
    return { ...this.assetConfig }
  }

  public setAssetConfig(config: Partial<AssetConfig>): void {
    this.assetConfig = { ...this.assetConfig, ...config }
  }

  public getAudioConfig(): AudioConfig {
    return { ...this.audioConfig }
  }

  public setAudioConfig(config: Partial<AudioConfig>): void {
    this.audioConfig = { ...this.audioConfig, ...config }
  }

  public getLazyLoadConfig(): LazyLoadConfig {
    return { ...this.lazyLoadConfig }
  }

  public setLazyLoadConfig(config: Partial<LazyLoadConfig>): void {
    this.lazyLoadConfig = { ...this.lazyLoadConfig, ...config }
  }

  public getMemoryConfig(): MemoryConfig {
    return { ...this.memoryConfig }
  }

  public setMemoryConfig(config: Partial<MemoryConfig>): void {
    this.memoryConfig = { ...this.memoryConfig, ...config }
  }

  public getNetworkConfig(): NetworkConfig {
    return { ...this.networkConfig }
  }

  public setNetworkConfig(config: Partial<NetworkConfig>): void {
    this.networkConfig = { ...this.networkConfig, ...config }
  }

  public enable(): void {
    this.isEnabled = true
  }

  public disable(): void {
    this.isEnabled = false
  }

  public reset(): void {
    this.assetCache.clear()
    this.objectPools.clear()
    this.lazyLoadQueue.clear()
    this.frameCount = 0
    this.lastFrameTime = 0
    
    this.performanceMetrics = {
      fps: 0,
      memoryUsage: 0,
      networkLatency: 0,
      assetLoadTime: 0,
      compressionRatio: 0,
      cacheHitRate: 0
    }
  }

  public destroy(): void {
    if (this.compressionWorker) {
      this.compressionWorker.terminate()
    }
    
    if (this.memoryManagement) {
      this.memoryManagement.destroy()
    }
    
    this.assetCache.clear()
    this.objectPools.clear()
    this.lazyLoadQueue.clear()
  }

  // Event Handlers
  private handleAssetRequest(event: any): void {
    if (this.isEnabled) {
      this.loadAsset(event.assetId)
    }
  }

  private handleMemoryWarning(event: any): void {
    if (this.isEnabled) {
      this.performGarbageCollection()
    }
  }

  private handleNetworkSlow(event: any): void {
    if (this.isEnabled) {
      // Adapt to slow network
      this.networkConfig.chunkSize = Math.max(16 * 1024, this.networkConfig.chunkSize / 2)
      this.networkConfig.timeout = Math.min(30000, this.networkConfig.timeout * 1.5)
    }
  }

  private handleCompressionMessage(event: MessageEvent): void {
    // Handle compression worker messages
    this.eventManager.emit('compressionComplete', event.data)
  }

  private handleCompressionError(error: ErrorEvent): void {
    console.error('Compression worker error:', error)
    this.eventManager.emit('compressionError', { error: error.message, timestamp: Date.now() })
  }
}

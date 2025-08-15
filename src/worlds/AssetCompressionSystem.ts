import { EventManager } from '../core/EventManager'

// Compression quality levels
export type CompressionQuality = 'low' | 'medium' | 'high' | 'ultra' | 'lossless'

// Compression formats
export type ImageFormat = 'webp' | 'jpeg' | 'png' | 'avif'
export type TextureFormat = 'dxt' | 'etc' | 'astc' | 'pvr'
export type AudioFormat = 'mp3' | 'ogg' | 'aac' | 'opus'

// Compression configuration
export interface CompressionConfig {
  // Image compression
  imageQuality: { [K in CompressionQuality]: number }
  imageFormats: ImageFormat[]
  enableWebP: boolean
  enableAVIF: boolean
  enableProgressiveJPEG: boolean
  
  // Texture compression
  textureQuality: { [K in CompressionQuality]: number }
  textureFormats: TextureFormat[]
  enableMipmaps: boolean
  enableAnisotropy: boolean
  
  // Audio compression
  audioQuality: { [K in CompressionQuality]: number }
  audioFormats: AudioFormat[]
  enableVorbis: boolean
  enableOpus: boolean
  
  // General compression
  maxFileSize: number
  enableGzip: boolean
  enableBrotli: boolean
  compressionLevel: number
}

// Compression result
export interface CompressionResult {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  quality: CompressionQuality
  format: string
  processingTime: number
  metadata: {
    width?: number
    height?: number
    duration?: number
    channels?: number
    sampleRate?: number
  }
}

// Asset compression request
export interface CompressionRequest {
  assetId: string
  assetType: 'image' | 'texture' | 'audio' | 'data'
  data: ArrayBuffer | Blob | string
  quality: CompressionQuality
  targetFormat?: string
  callback?: (result: CompressionResult) => void
}

/**
 * Comprehensive Asset Compression System
 * Handles image, texture, audio, and data compression with multiple quality tiers
 */
export class AssetCompressionSystem {
  private static instance: AssetCompressionSystem
  private eventManager: EventManager
  
  private config!: CompressionConfig
  private compressionQueue: CompressionRequest[] = []
  private isProcessing: boolean = false
  private compressionCache: Map<string, CompressionResult> = new Map()
  
  // Web Workers for compression
  private imageCompressionWorker: Worker | null = null
  private audioCompressionWorker: Worker | null = null
  private dataCompressionWorker: Worker | null = null

  private constructor() {
    this.eventManager = EventManager.getInstance()
    this.initializeConfig()
    this.initializeWorkers()
    this.setupEventListeners()
  }

  public static getInstance(): AssetCompressionSystem {
    if (!AssetCompressionSystem.instance) {
      AssetCompressionSystem.instance = new AssetCompressionSystem()
    }
    return AssetCompressionSystem.instance
  }

  /**
   * Compresses an image asset with specified quality
   */
  public async compressImage(
    data: ArrayBuffer | Blob | string,
    quality: CompressionQuality = 'medium',
    targetFormat?: ImageFormat
  ): Promise<CompressionResult> {
    const startTime = performance.now()
    
    try {
      // Try to use web worker first if available
      if (this.imageCompressionWorker) {
        return this.compressImageWithWorker(data, quality, targetFormat, startTime)
      }
      
      // Fallback to main thread compression
      return this.compressImageMainThread(data, quality, targetFormat, startTime)
    } catch (error) {
      console.error('Image compression failed:', error)
      throw error
    }
  }

  private async compressImageWithWorker(
    data: ArrayBuffer | Blob | string,
    quality: CompressionQuality,
    targetFormat?: ImageFormat,
    startTime?: number
  ): Promise<CompressionResult> {
    return new Promise((resolve, reject) => {
      const requestId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Set up one-time message handler for this request
      const messageHandler = (event: MessageEvent) => {
        if (event.data.requestId === requestId) {
          this.imageCompressionWorker!.removeEventListener('message', messageHandler)
          
          if (event.data.type === 'success') {
            resolve(event.data.result)
          } else {
            reject(new Error(event.data.error))
          }
        }
      }
      
      this.imageCompressionWorker!.addEventListener('message', messageHandler)
      
      // Send compression request to worker
      this.imageCompressionWorker!.postMessage({
        type: 'compressImage',
        data,
        config: {
          quality,
          format: targetFormat || 'webp'
        },
        requestId
      })
      
      // Set timeout for worker response
      setTimeout(() => {
        this.imageCompressionWorker!.removeEventListener('message', messageHandler)
        reject(new Error('Image compression worker timeout'))
      }, 30000) // 30 second timeout
    })
  }

  private async compressImageMainThread(
    data: ArrayBuffer | Blob | string,
    quality: CompressionQuality,
    targetFormat?: ImageFormat,
    startTime?: number
  ): Promise<CompressionResult> {
    const start = startTime || performance.now()
    
    // Convert input to canvas for processing
    const canvas = await this.createCanvasFromInput(data)
    const ctx = canvas.getContext('2d')!
    
    // Determine target format
    const format = targetFormat || this.selectOptimalImageFormat(canvas, quality)
    
    // Apply compression based on format
    let compressedData: Blob
    let compressionRatio: number
    
    switch (format) {
      case 'webp':
        compressedData = await this.compressToWebP(canvas, quality)
        break
      case 'jpeg':
        compressedData = await this.compressToJPEG(canvas, quality)
        break
      case 'png':
        compressedData = await this.compressToPNG(canvas, quality)
        break
      case 'avif':
        compressedData = await this.compressToAVIF(canvas, quality)
        break
      default:
        throw new Error(`Unsupported image format: ${format}`)
    }
    
    // Calculate compression ratio
    const originalSize = this.getDataSize(data)
    const compressedSize = compressedData.size
    compressionRatio = compressedSize / originalSize
    
    const result: CompressionResult = {
      originalSize,
      compressedSize,
      compressionRatio,
      quality,
      format,
      processingTime: performance.now() - start,
      metadata: {
        width: canvas.width,
        height: canvas.height
      }
    }
    
    this.eventManager.emit('imageCompressed', {
      assetId: 'temp',
      result,
      timestamp: Date.now()
    })
    
    return result
  }

  /**
   * Compresses a texture asset with specified quality
   */
  public async compressTexture(
    data: ArrayBuffer | Blob | string,
    quality: CompressionQuality = 'medium',
    targetFormat?: TextureFormat
  ): Promise<CompressionResult> {
    const startTime = performance.now()
    
    try {
      // Convert input to canvas
      const canvas = await this.createCanvasFromInput(data)
      
      // Determine target format
      const format = targetFormat || this.selectOptimalTextureFormat(canvas, quality)
      
      // Apply texture-specific compression
      let compressedData: Blob
      let compressionRatio: number
      
      switch (format) {
        case 'dxt':
          compressedData = await this.compressToDXT(canvas, quality)
          break
        case 'etc':
          compressedData = await this.compressToETC(canvas, quality)
          break
        case 'astc':
          compressedData = await this.compressToASTC(canvas, quality)
          break
        case 'pvr':
          compressedData = await this.compressToPVR(canvas, quality)
          break
        default:
          throw new Error(`Unsupported texture format: ${format}`)
      }
      
      // Calculate compression ratio
      const originalSize = this.getDataSize(data)
      const compressedSize = compressedData.size
      compressionRatio = compressedSize / originalSize
      
      const result: CompressionResult = {
        originalSize,
        compressedSize,
        compressionRatio,
        quality,
        format,
        processingTime: performance.now() - startTime,
        metadata: {
          width: canvas.width,
          height: canvas.height
        }
      }
      
      this.eventManager.emit('textureCompressed', {
        assetId: 'temp',
        result,
        timestamp: Date.now()
      })
      
      return result
    } catch (error) {
      console.error('Texture compression failed:', error)
      throw error
    }
  }

  /**
   * Compresses an audio asset with specified quality
   */
  public async compressAudio(
    data: ArrayBuffer | Blob | string,
    quality: CompressionQuality = 'medium',
    targetFormat?: AudioFormat
  ): Promise<CompressionResult> {
    const startTime = performance.now()
    
    try {
      // Convert input to audio context for processing
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await this.createAudioBufferFromInput(data, audioContext)
      
      // Determine target format
      const format = targetFormat || this.selectOptimalAudioFormat(audioBuffer, quality)
      
      // Apply audio-specific compression
      let compressedData: Blob
      let compressionRatio: number
      
      switch (format) {
        case 'mp3':
          compressedData = await this.compressToMP3(audioBuffer, quality)
          break
        case 'ogg':
          compressedData = await this.compressToOGG(audioBuffer, quality)
          break
        case 'aac':
          compressedData = await this.compressToAAC(audioBuffer, quality)
          break
        case 'opus':
          compressedData = await this.compressToOpus(audioBuffer, quality)
          break
        default:
          throw new Error(`Unsupported audio format: ${format}`)
      }
      
      // Calculate compression ratio
      const originalSize = this.getDataSize(data)
      const compressedSize = compressedData.size
      compressionRatio = compressedSize / originalSize
      
      const result: CompressionResult = {
        originalSize,
        compressedSize,
        compressionRatio,
        quality,
        format,
        processingTime: performance.now() - startTime,
        metadata: {
          duration: audioBuffer.duration,
          channels: audioBuffer.numberOfChannels,
          sampleRate: audioBuffer.sampleRate
        }
      }
      
      this.eventManager.emit('audioCompressed', {
        assetId: 'temp',
        result,
        timestamp: Date.now()
      })
      
      return result
    } catch (error) {
      console.error('Audio compression failed:', error)
      throw error
    }
  }

  /**
   * Compresses data with gzip or brotli
   */
  public async compressData(
    data: ArrayBuffer | Blob | string,
    quality: CompressionQuality = 'medium',
    useBrotli: boolean = false
  ): Promise<CompressionResult> {
    const startTime = performance.now()
    
    try {
      let compressedData: ArrayBuffer
      let format: string
      
      if (useBrotli && this.config.enableBrotli) {
        compressedData = await this.compressWithBrotli(data, quality)
        format = 'brotli'
      } else if (this.config.enableGzip) {
        compressedData = await this.compressWithGzip(data, quality)
        format = 'gzip'
      } else {
        throw new Error('No compression method available')
      }
      
      // Calculate compression ratio
      const originalSize = this.getDataSize(data)
      const compressedSize = compressedData.byteLength
      const compressionRatio = compressedSize / originalSize
      
      const result: CompressionResult = {
        originalSize,
        compressedSize,
        compressionRatio,
        quality,
        format,
        processingTime: performance.now() - startTime,
        metadata: {}
      }
      
      this.eventManager.emit('dataCompressed', {
        assetId: 'temp',
        result,
        timestamp: Date.now()
      })
      
      return result
    } catch (error) {
      console.error('Data compression failed:', error)
      throw error
    }
  }

  /**
   * Creates progressive quality tiers for an asset
   */
  public async createProgressiveTiers(
    data: ArrayBuffer | Blob | string,
    assetType: 'image' | 'texture' | 'audio' | 'data'
  ): Promise<Map<CompressionQuality, CompressionResult>> {
    const tiers = new Map<CompressionQuality, CompressionResult>()
    const qualities: CompressionQuality[] = ['low', 'medium', 'high', 'ultra']
    
    for (const quality of qualities) {
      try {
        let result: CompressionResult
        
        switch (assetType) {
          case 'image':
            result = await this.compressImage(data, quality)
            break
          case 'texture':
            result = await this.compressTexture(data, quality)
            break
          case 'audio':
            result = await this.compressAudio(data, quality)
            break
          case 'data':
            result = await this.compressData(data, quality)
            break
          default:
            throw new Error(`Unsupported asset type: ${assetType}`)
        }
        
        tiers.set(quality, result)
      } catch (error) {
        console.warn(`Failed to create ${quality} quality tier:`, error)
      }
    }
    
    return tiers
  }

  /**
   * Gets compression statistics
   */
  public getCompressionStats(): {
    totalCompressed: number
    averageCompressionRatio: number
    totalTimeSaved: number
    cacheHitRate: number
  } {
    const results = Array.from(this.compressionCache.values())
    
    if (results.length === 0) {
      return {
        totalCompressed: 0,
        averageCompressionRatio: 1.0,
        totalTimeSaved: 0,
        cacheHitRate: 0
      }
    }
    
    const totalCompressed = results.length
    const averageCompressionRatio = results.reduce((sum, r) => sum + r.compressionRatio, 0) / totalCompressed
    const totalTimeSaved = results.reduce((sum, r) => sum + (r.originalSize - r.compressedSize), 0)
    const cacheHitRate = 0.8 // Placeholder - would need actual cache hit tracking
    
    return {
      totalCompressed,
      averageCompressionRatio,
      totalTimeSaved,
      cacheHitRate
    }
  }

  // Private helper methods

  private initializeConfig(): void {
    this.config = {
      // Image compression
      imageQuality: {
        low: 0.3,
        medium: 0.6,
        high: 0.8,
        ultra: 0.95,
        lossless: 1.0
      },
      imageFormats: ['webp', 'jpeg', 'png', 'avif'],
      enableWebP: true,
      enableAVIF: true,
      enableProgressiveJPEG: true,
      
      // Texture compression
      textureQuality: {
        low: 0.4,
        medium: 0.7,
        high: 0.85,
        ultra: 0.95,
        lossless: 1.0
      },
      textureFormats: ['dxt', 'etc', 'astc', 'pvr'],
      enableMipmaps: true,
      enableAnisotropy: true,
      
      // Audio compression
      audioQuality: {
        low: 0.2,
        medium: 0.5,
        high: 0.8,
        ultra: 0.95,
        lossless: 1.0
      },
      audioFormats: ['mp3', 'ogg', 'aac', 'opus'],
      enableVorbis: true,
      enableOpus: true,
      
      // General compression
      maxFileSize: 100 * 1024 * 1024, // 100MB
      enableGzip: true,
      enableBrotli: true,
      compressionLevel: 6
    }
  }

  private initializeWorkers(): void {
    // Initialize Web Workers for compression tasks
    try {
      // Image compression worker
      if (typeof Worker !== 'undefined') {
        this.imageCompressionWorker = new Worker('/workers/image-compression.js')
        this.setupWorkerMessageHandlers(this.imageCompressionWorker, 'image')
      }
      
      // Audio compression worker
      if (typeof Worker !== 'undefined') {
        this.audioCompressionWorker = new Worker('/workers/audio-compression.js')
        this.setupWorkerMessageHandlers(this.audioCompressionWorker, 'audio')
      }
      
      // Data compression worker
      if (typeof Worker !== 'undefined') {
        this.dataCompressionWorker = new Worker('/workers/data-compression.js')
        this.setupWorkerMessageHandlers(this.dataCompressionWorker, 'data')
      }
    } catch (error) {
      console.warn('Web Workers not available, using main thread compression:', error)
    }
  }

  private setupEventListeners(): void {
    // Listen for compression-related events
    this.eventManager.on('assetCompressionRequested', (event) => {
      this.handleCompressionRequest(event)
    })
  }

  private setupWorkerMessageHandlers(worker: Worker, type: string): void {
    worker.onmessage = (event) => {
      const { type: messageType, result, error, requestId } = event.data
      
      if (messageType === 'success') {
        // Handle successful compression
        this.eventManager.emit('assetCompressionCompleted', {
          assetId: requestId,
          result,
          timestamp: Date.now()
        })
      } else if (messageType === 'error') {
        // Handle compression error
        this.eventManager.emit('assetCompressionFailed', {
          assetId: requestId,
          error,
          timestamp: Date.now()
        })
      }
    }
    
    worker.onerror = (error) => {
      console.error(`${type} compression worker error:`, error)
      this.eventManager.emit('assetCompressionFailed', {
        assetId: 'unknown',
        error: error.message || 'Worker error',
        timestamp: Date.now()
      })
    }
  }

  private async createCanvasFromInput(data: ArrayBuffer | Blob | string): Promise<HTMLCanvasElement> {
    if (typeof data === 'string') {
      // URL or data URL
      return this.createCanvasFromURL(data)
    } else if (data instanceof Blob) {
      // Blob data
      return this.createCanvasFromBlob(data)
    } else {
      // ArrayBuffer
      return this.createCanvasFromArrayBuffer(data)
    }
  }

  private async createCanvasFromURL(url: string): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        resolve(canvas)
      }
      img.onerror = () => reject(new Error(`Failed to load image from URL: ${url}`))
      img.src = url
    })
  }

  private async createCanvasFromBlob(blob: Blob): Promise<HTMLCanvasElement> {
    const url = URL.createObjectURL(blob)
    try {
      return await this.createCanvasFromURL(url)
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  private async createCanvasFromArrayBuffer(buffer: ArrayBuffer): Promise<HTMLCanvasElement> {
    const blob = new Blob([buffer])
    return this.createCanvasFromBlob(blob)
  }

  private async createAudioBufferFromInput(data: ArrayBuffer | Blob | string, audioContext: AudioContext): Promise<AudioBuffer> {
    if (typeof data === 'string') {
      // URL
      const response = await fetch(data)
      const arrayBuffer = await response.arrayBuffer()
      return audioContext.decodeAudioData(arrayBuffer)
    } else if (data instanceof Blob) {
      // Blob
      const arrayBuffer = await data.arrayBuffer()
      return audioContext.decodeAudioData(arrayBuffer)
    } else {
      // ArrayBuffer
      return audioContext.decodeAudioData(data)
    }
  }

  private selectOptimalImageFormat(canvas: HTMLCanvasElement, quality: CompressionQuality): ImageFormat {
    // Simple format selection logic
    if (this.config.enableAVIF && quality === 'ultra') {
      return 'avif'
    } else if (this.config.enableWebP && quality !== 'lossless') {
      return 'webp'
    } else if (quality === 'lossless') {
      return 'png'
    } else {
      return 'jpeg'
    }
  }

  private selectOptimalTextureFormat(canvas: HTMLCanvasElement, quality: CompressionQuality): TextureFormat {
    // Simple texture format selection
    if (quality === 'ultra' || quality === 'lossless') {
      return 'astc'
    } else if (quality === 'high') {
      return 'etc'
    } else {
      return 'dxt'
    }
  }

  private selectOptimalAudioFormat(audioBuffer: AudioBuffer, quality: CompressionQuality): AudioFormat {
    // Simple audio format selection
    if (quality === 'ultra' || quality === 'lossless') {
      return 'opus'
    } else if (quality === 'high') {
      return 'aac'
    } else if (this.config.enableVorbis) {
      return 'ogg'
    } else {
      return 'mp3'
    }
  }

  // Compression method implementations (simplified for now)

  private async compressToWebP(canvas: HTMLCanvasElement, quality: CompressionQuality): Promise<Blob> {
    const qualityValue = this.config.imageQuality[quality]
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('WebP compression failed')),
        'image/webp',
        qualityValue
      )
    })
  }

  private async compressToJPEG(canvas: HTMLCanvasElement, quality: CompressionQuality): Promise<Blob> {
    const qualityValue = this.config.imageQuality[quality]
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('JPEG compression failed')),
        'image/jpeg',
        qualityValue
      )
    })
  }

  private async compressToPNG(canvas: HTMLCanvasElement, quality: CompressionQuality): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('PNG compression failed')),
        'image/png'
      )
    })
  }

  private async compressToAVIF(canvas: HTMLCanvasElement, quality: CompressionQuality): Promise<Blob> {
    // AVIF compression would require a library like avif.js
    // For now, fall back to WebP
    return this.compressToWebP(canvas, quality)
  }

  private async compressToDXT(canvas: HTMLCanvasElement, quality: CompressionQuality): Promise<Blob> {
    // DXT compression would require a texture compression library
    // For now, fall back to PNG
    return this.compressToPNG(canvas, quality)
  }

  private async compressToETC(canvas: HTMLCanvasElement, quality: CompressionQuality): Promise<Blob> {
    // ETC compression would require a texture compression library
    // For now, fall back to PNG
    return this.compressToPNG(canvas, quality)
  }

  private async compressToASTC(canvas: HTMLCanvasElement, quality: CompressionQuality): Promise<Blob> {
    // ASTC compression would require a texture compression library
    // For now, fall back to PNG
    return this.compressToPNG(canvas, quality)
  }

  private async compressToPVR(canvas: HTMLCanvasElement, quality: CompressionQuality): Promise<Blob> {
    // PVR compression would require a texture compression library
    // For now, fall back to PNG
    return this.compressToPNG(canvas, quality)
  }

  private async compressToMP3(audioBuffer: AudioBuffer, quality: CompressionQuality): Promise<Blob> {
    // MP3 compression would require an audio compression library
    // For now, return a placeholder
    return new Blob([new ArrayBuffer(1024)], { type: 'audio/mpeg' })
  }

  private async compressToOGG(audioBuffer: AudioBuffer, quality: CompressionQuality): Promise<Blob> {
    // OGG compression would require an audio compression library
    // For now, return a placeholder
    return new Blob([new ArrayBuffer(1024)], { type: 'audio/ogg' })
  }

  private async compressToAAC(audioBuffer: AudioBuffer, quality: CompressionQuality): Promise<Blob> {
    // AAC compression would require an audio compression library
    // For now, return a placeholder
    return new Blob([new ArrayBuffer(1024)], { type: 'audio/aac' })
  }

  private async compressToOpus(audioBuffer: AudioBuffer, quality: CompressionQuality): Promise<Blob> {
    // Opus compression would require an audio compression library
    // For now, return a placeholder
    return new Blob([new ArrayBuffer(1024)], { type: 'audio/opus' })
  }

  private async compressWithGzip(data: ArrayBuffer | Blob | string, quality: CompressionQuality): Promise<ArrayBuffer> {
    // Gzip compression using CompressionStream API if available
    if ('CompressionStream' in window) {
      const stream = new CompressionStream('gzip')
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()
      
      const input = typeof data === 'string' ? new TextEncoder().encode(data) : 
                   data instanceof Blob ? await data.arrayBuffer() : data
      
      const chunk = new Uint8Array(input)
      await writer.write(chunk)
      await writer.close()
      
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }
      
      return result.buffer
    } else {
      // Fallback: return original data
      return typeof data === 'string' ? new TextEncoder().encode(data).buffer :
             data instanceof Blob ? await data.arrayBuffer() : data
    }
  }

  private async compressWithBrotli(data: ArrayBuffer | Blob | string, quality: CompressionQuality): Promise<ArrayBuffer> {
    // Brotli compression using CompressionStream API if available
    if ('CompressionStream' in window) {
      const stream = new CompressionStream('deflate')
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()
      
      const input = typeof data === 'string' ? new TextEncoder().encode(data) : 
                   data instanceof Blob ? await data.arrayBuffer() : data
      
      const chunk = new Uint8Array(input)
      await writer.write(chunk)
      await writer.close()
      
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }
      
      return result.buffer
    } else {
      // Fallback: return original data
      return typeof data === 'string' ? new TextEncoder().encode(data).buffer :
             data instanceof Blob ? await data.arrayBuffer() : data
    }
  }

  private getDataSize(data: ArrayBuffer | Blob | string): number {
    if (typeof data === 'string') {
      return new TextEncoder().encode(data).length
    } else if (data instanceof Blob) {
      return data.size
    } else {
      return data.byteLength
    }
  }

  private handleCompressionRequest(event: any): void {
    // Handle compression requests from other systems
    const { assetId, assetType, data, quality, targetFormat, callback } = event
    
    this.compressAsset(assetType, data, quality, targetFormat)
      .then(result => {
        if (callback) callback(result)
        this.eventManager.emit('assetCompressionCompleted', {
          assetId,
          result,
          timestamp: Date.now()
        })
      })
      .catch(error => {
        this.eventManager.emit('assetCompressionFailed', {
          assetId,
          error: error.message,
          timestamp: Date.now()
        })
      })
  }

  private async compressAsset(
    assetType: string,
    data: any,
    quality: CompressionQuality,
    targetFormat?: string
  ): Promise<CompressionResult> {
    switch (assetType) {
      case 'image':
        return this.compressImage(data, quality, targetFormat as ImageFormat)
      case 'texture':
        return this.compressTexture(data, quality, targetFormat as TextureFormat)
      case 'audio':
        return this.compressAudio(data, quality, targetFormat as AudioFormat)
      case 'data':
        return this.compressData(data, quality)
      default:
        throw new Error(`Unsupported asset type: ${assetType}`)
    }
  }

  public destroy(): void {
    // Clean up workers
    if (this.imageCompressionWorker) {
      this.imageCompressionWorker.terminate()
    }
    if (this.audioCompressionWorker) {
      this.audioCompressionWorker.terminate()
    }
    if (this.dataCompressionWorker) {
      this.dataCompressionWorker.terminate()
    }
    
    // Clear cache
    this.compressionCache.clear()
  }
}

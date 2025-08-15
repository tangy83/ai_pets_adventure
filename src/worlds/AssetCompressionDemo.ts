import { AssetCompressionSystem, CompressionQuality } from './AssetCompressionSystem'
import { AssetManager } from './AssetManager'
import { EventManager } from '../core/EventManager'

/**
 * Asset Compression System Demo
 * Demonstrates the comprehensive asset compression capabilities
 */
export class AssetCompressionDemo {
  private eventManager: EventManager
  private compressionSystem: AssetCompressionSystem
  private assetManager: AssetManager

  constructor() {
    this.eventManager = EventManager.getInstance()
    this.compressionSystem = AssetCompressionSystem.getInstance()
    this.assetManager = AssetManager.getInstance()
    this.setupEventListeners()
  }

  /**
   * Demonstrates image compression with different quality levels
   */
  public async demonstrateImageCompression(): Promise<void> {
    console.log('🎨 Demonstrating Image Compression...')

    // Create a test canvas with sample image data
    const canvas = this.createTestCanvas(512, 512)
    const imageData = await this.canvasToBlob(canvas)

    try {
      // Test different compression qualities
      const qualities: CompressionQuality[] = ['low', 'medium', 'high', 'ultra', 'lossless']
      
      for (const quality of qualities) {
        console.log(`\n📸 Compressing image with ${quality} quality...`)
        
        const startTime = performance.now()
        const result = await this.compressionSystem.compressImage(imageData, quality)
        const endTime = performance.now()
        
        console.log(`✅ ${quality.toUpperCase()} Quality Result:`)
        console.log(`   Original Size: ${this.formatBytes(result.originalSize)}`)
        console.log(`   Compressed Size: ${this.formatBytes(result.compressedSize)}`)
        console.log(`   Compression Ratio: ${(result.compressionRatio * 100).toFixed(1)}%`)
        console.log(`   Format: ${result.format}`)
        console.log(`   Processing Time: ${(endTime - startTime).toFixed(2)}ms`)
        console.log(`   Dimensions: ${result.metadata.width}x${result.metadata.height}`)
      }

      // Test progressive tier creation
      console.log('\n🔄 Creating progressive quality tiers...')
      const tiers = await this.compressionSystem.createProgressiveTiers(imageData, 'image')
      
      console.log('📊 Progressive Tiers Created:')
      for (const [quality, result] of tiers.entries()) {
        console.log(`   ${quality}: ${this.formatBytes(result.compressedSize)} (${(result.compressionRatio * 100).toFixed(1)}%)`)
      }

    } catch (error) {
      console.error('❌ Image compression demo failed:', error)
    }
  }

  /**
   * Tests web worker functionality for image compression
   */
  public async testWebWorkerCompression(): Promise<void> {
    console.log('\n🔧 Testing Web Worker Compression...')

    const canvas = this.createTestCanvas(1024, 1024)
    const imageData = await this.canvasToBlob(canvas)

    try {
      // Test with web worker (if available)
      console.log('📸 Testing web worker image compression...')
      
      const startTime = performance.now()
      const result = await this.compressionSystem.compressImage(imageData, 'high', 'webp')
      const endTime = performance.now()
      
      console.log('✅ Web Worker Compression Result:')
      console.log(`   Original Size: ${this.formatBytes(result.originalSize)}`)
      console.log(`   Compressed Size: ${this.formatBytes(result.compressedSize)}`)
      console.log(`   Compression Ratio: ${(result.compressionRatio * 100).toFixed(1)}%`)
      console.log(`   Format: ${result.format}`)
      console.log(`   Processing Time: ${(endTime - startTime).toFixed(2)}ms`)
      console.log(`   Dimensions: ${result.metadata.width}x${result.metadata.height}`)
      
      // Test batch compression
      console.log('\n🔄 Testing batch compression...')
      const batchStart = performance.now()
      
      const promises = Array(5).fill(null).map((_, i) => 
        this.compressionSystem.compressImage(imageData, 'medium', 'jpeg')
      )
      
      const batchResults = await Promise.all(promises)
      const batchEnd = performance.now()
      
      console.log(`✅ Batch compression completed in ${(batchEnd - batchStart).toFixed(2)}ms`)
      console.log(`   Processed ${batchResults.length} images`)
      console.log(`   Average time per image: ${((batchEnd - batchStart) / batchResults.length).toFixed(2)}ms`)
      
      const totalOriginalSize = batchResults.reduce((sum, r) => sum + r.originalSize, 0)
      const totalCompressedSize = batchResults.reduce((sum, r) => sum + r.compressedSize, 0)
      const averageCompressionRatio = 1 - (totalCompressedSize / totalOriginalSize)
      
      console.log(`   Total compression ratio: ${(averageCompressionRatio * 100).toFixed(1)}%`)

    } catch (error) {
      console.error('❌ Web worker compression test failed:', error)
    }
  }

  /**
   * Demonstrates texture compression with different formats
   */
  public async demonstrateTextureCompression(): Promise<void> {
    console.log('\n🎭 Demonstrating Texture Compression...')

    const canvas = this.createTestCanvas(256, 256)
    const textureData = await this.canvasToBlob(canvas)

    try {
      // Test texture compression
      const result = await this.compressionSystem.compressTexture(textureData, 'high')
      
      console.log('✅ Texture Compression Result:')
      console.log(`   Original Size: ${this.formatBytes(result.originalSize)}`)
      console.log(`   Compressed Size: ${this.formatBytes(result.compressedSize)}`)
      console.log(`   Compression Ratio: ${(result.compressionRatio * 100).toFixed(1)}%`)
      console.log(`   Format: ${result.format}`)
      console.log(`   Processing Time: ${result.processingTime.toFixed(2)}ms`)

    } catch (error) {
      console.error('❌ Texture compression demo failed:', error)
    }
  }

  /**
   * Demonstrates audio compression
   */
  public async demonstrateAudioCompression(): Promise<void> {
    console.log('\n🎵 Demonstrating Audio Compression...')

    // Create a test audio buffer
    const audioBuffer = this.createTestAudioBuffer(44100, 2, 5) // 5 seconds, stereo, 44.1kHz
    const audioData = this.audioBufferToArrayBuffer(audioBuffer)

    try {
      const result = await this.compressionSystem.compressAudio(audioData, 'medium')
      
      console.log('✅ Audio Compression Result:')
      console.log(`   Original Size: ${this.formatBytes(result.originalSize)}`)
      console.log(`   Compressed Size: ${this.formatBytes(result.compressedSize)}`)
      console.log(`   Compression Ratio: ${(result.compressionRatio * 100).toFixed(1)}%`)
      console.log(`   Format: ${result.format}`)
      console.log(`   Processing Time: ${result.processingTime.toFixed(2)}ms`)
      console.log(`   Duration: ${result.metadata.duration?.toFixed(2)}s`)
      console.log(`   Channels: ${result.metadata.channels}`)
      console.log(`   Sample Rate: ${result.metadata.sampleRate}Hz`)

    } catch (error) {
      console.error('❌ Audio compression demo failed:', error)
    }
  }

  /**
   * Demonstrates data compression
   */
  public async demonstrateDataCompression(): Promise<void> {
    console.log('\n📊 Demonstrating Data Compression...')

    // Create test data
    const testData = this.createTestData(1024 * 1024) // 1MB of test data

    try {
      // Test gzip compression
      const gzipResult = await this.compressionSystem.compressData(testData, 'high', false)
      
      console.log('✅ Gzip Compression Result:')
      console.log(`   Original Size: ${this.formatBytes(gzipResult.originalSize)}`)
      console.log(`   Compressed Size: ${this.formatBytes(gzipResult.compressedSize)}`)
      console.log(`   Compression Ratio: ${(gzipResult.compressionRatio * 100).toFixed(1)}%`)
      console.log(`   Format: ${gzipResult.format}`)
      console.log(`   Processing Time: ${gzipResult.processingTime.toFixed(2)}ms`)

      // Test brotli compression if available
      try {
        const brotliResult = await this.compressionSystem.compressData(testData, 'high', true)
        
        console.log('✅ Brotli Compression Result:')
        console.log(`   Original Size: ${this.formatBytes(brotliResult.originalSize)}`)
        console.log(`   Compressed Size: ${this.formatBytes(brotliResult.compressedSize)}`)
        console.log(`   Compression Ratio: ${(brotliResult.compressionRatio * 100).toFixed(1)}%`)
        console.log(`   Format: ${brotliResult.format}`)
        console.log(`   Processing Time: ${brotliResult.processingTime.toFixed(2)}ms`)
      } catch (brotliError) {
        console.log('⚠️ Brotli compression not available')
      }

    } catch (error) {
      console.error('❌ Data compression demo failed:', error)
    }
  }

  /**
   * Demonstrates asset optimization integration
   */
  public async demonstrateAssetOptimization(): Promise<void> {
    console.log('\n🚀 Demonstrating Asset Optimization Integration...')

    try {
      // Simulate loading some assets
      const assetIds = ['test_texture_1', 'test_audio_1', 'test_data_1']
      
      console.log('📦 Optimizing asset loading...')
      await this.assetManager.optimizeAssetLoading(assetIds)
      
      console.log('✅ Asset optimization completed')
      
      // Get compression statistics
      const stats = this.compressionSystem.getCompressionStats()
      console.log('\n📊 Compression Statistics:')
      console.log(`   Total Assets Compressed: ${stats.totalCompressed}`)
      console.log(`   Average Compression Ratio: ${(stats.averageCompressionRatio * 100).toFixed(1)}%`)
      console.log(`   Total Bytes Saved: ${this.formatBytes(stats.totalTimeSaved)}`)
      console.log(`   Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`)

    } catch (error) {
      console.error('❌ Asset optimization demo failed:', error)
    }
  }

  /**
   * Runs the complete compression demo
   */
  public async runCompleteDemo(): Promise<void> {
    console.log('🎮 Asset Compression System - Complete Demo')
    console.log('=' .repeat(50))

    try {
      await this.demonstrateImageCompression()
      await this.testWebWorkerCompression()
      await this.demonstrateTextureCompression()
      await this.demonstrateAudioCompression()
      await this.demonstrateDataCompression()
      await this.demonstrateAssetOptimization()

      console.log('\n🎉 Demo completed successfully!')
      console.log('\n💡 Key Features Demonstrated:')
      console.log('   • Multi-quality image compression (WebP, JPEG, PNG, AVIF)')
      console.log('   • Texture compression (DXT, ETC, ASTC, PVR)')
      console.log('   • Audio compression (MP3, OGG, AAC, Opus)')
      console.log('   • Data compression (Gzip, Brotli)')
      console.log('   • Progressive quality tiers')
      console.log('   • Asset optimization integration')
      console.log('   • Performance monitoring and statistics')

    } catch (error) {
      console.error('❌ Demo failed:', error)
    }
  }

  // Helper methods

  private setupEventListeners(): void {
    // Listen for compression events
    this.eventManager.on('imageCompressed', (event) => {
      console.log(`📸 Image compressed: ${event.assetId}`)
    })

    this.eventManager.on('textureCompressed', (event) => {
      console.log(`🎭 Texture compressed: ${event.assetId}`)
    })

    this.eventManager.on('audioCompressed', (event) => {
      console.log(`🎵 Audio compressed: ${event.assetId}`)
    })

    this.eventManager.on('dataCompressed', (event) => {
      console.log(`📊 Data compressed: ${event.assetId}`)
    })

    this.eventManager.on('assetCompressionCompleted', (event) => {
      console.log(`✅ Asset compression completed: ${event.assetId}`)
    })

    this.eventManager.on('assetCompressionFailed', (event) => {
      console.error(`❌ Asset compression failed: ${event.assetId} - ${event.error}`)
    })
  }

  private createTestCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    // Create a gradient pattern
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#ff6b6b')
    gradient.addColorStop(0.5, '#4ecdc4')
    gradient.addColorStop(1, '#45b7d1')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Add some shapes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, 50, 0, Math.PI * 2)
    ctx.fill()

    return canvas
  }

  private async canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!)
      }, 'image/png')
    })
  }

  private createTestAudioBuffer(sampleRate: number, channels: number, duration: number): AudioBuffer {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const buffer = audioContext.createBuffer(channels, sampleRate * duration, sampleRate)
    
    // Generate a simple sine wave
    for (let channel = 0; channel < channels; channel++) {
      const channelData = buffer.getChannelData(channel)
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.3
      }
    }
    
    return buffer
  }

  private audioBufferToArrayBuffer(audioBuffer: AudioBuffer): ArrayBuffer {
    const length = audioBuffer.length * audioBuffer.numberOfChannels * 2 // 16-bit samples
    const buffer = new ArrayBuffer(length)
    const view = new DataView(buffer)
    
    let offset = 0
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel)
      for (let i = 0; i < channelData.length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]))
        view.setInt16(offset, sample * 0x7FFF, true)
        offset += 2
      }
    }
    
    return buffer
  }

  private createTestData(size: number): ArrayBuffer {
    const buffer = new ArrayBuffer(size)
    const view = new Uint8Array(buffer)
    
    // Fill with test pattern
    for (let i = 0; i < size; i++) {
      view[i] = (i * 7) % 256
    }
    
    return buffer
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  public destroy(): void {
    // Clean up event listeners
    this.eventManager.off('imageCompressed')
    this.eventManager.off('textureCompressed')
    this.eventManager.off('audioCompressed')
    this.eventManager.off('dataCompressed')
    this.eventManager.off('assetCompressionCompleted')
    this.eventManager.off('assetCompressionFailed')
  }
}

// Export for use in other modules
export default AssetCompressionDemo


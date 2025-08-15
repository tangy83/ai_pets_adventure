// Audio Compression Worker
// Handles audio compression in background threads for optimal performance

// Compression quality levels
const QUALITY_LEVELS = {
  low: 0.3,
  medium: 0.6,
  high: 0.8,
  ultra: 0.95,
  lossless: 1.0
}

// Supported audio formats
const SUPPORTED_FORMATS = ['mp3', 'ogg', 'aac', 'opus']

// Audio quality presets
const AUDIO_PRESETS = {
  low: { bitrate: 64, sampleRate: 22050, channels: 1 },
  medium: { bitrate: 128, sampleRate: 44100, channels: 2 },
  high: { bitrate: 192, sampleRate: 48000, channels: 2 },
  ultra: { bitrate: 320, sampleRate: 48000, channels: 2 },
  lossless: { bitrate: 1411, sampleRate: 48000, channels: 2 }
}

// Main message handler
self.onmessage = async function(e) {
  const { type, data, config } = e.data
  
  try {
    let result
    
    switch (type) {
      case 'compressAudio':
        result = await compressAudio(data, config)
        break
      case 'convertFormat':
        result = await convertAudioFormat(data, config)
        break
      case 'resampleAudio':
        result = await resampleAudio(data, config)
        break
      case 'createProgressiveTiers':
        result = await createProgressiveTiers(data, config)
        break
      default:
        throw new Error(`Unknown audio compression type: ${type}`)
    }
    
    self.postMessage({
      type: 'success',
      result,
      requestId: e.data.requestId
    })
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
      requestId: e.data.requestId
    })
  }
}

/**
 * Compress audio with specified quality and format
 */
async function compressAudio(audioData, config) {
  const startTime = performance.now()
  
  try {
    // Create audio context for processing
    const audioContext = new AudioContext({
      sampleRate: config.sampleRate || 44100,
      latencyHint: 'interactive'
    })
    
    // Decode audio data
    const decodedData = await audioContext.decodeAudioData(audioData)
    
    // Get quality preset
    const quality = config.quality || 'medium'
    const preset = AUDIO_PRESETS[quality]
    
    // Create offline context for processing
    const offlineContext = new OfflineAudioContext(
      preset.channels,
      decodedData.length,
      preset.sampleRate
    )
    
    // Create buffer source
    const source = offlineContext.createBufferSource()
    source.buffer = decodedData
    source.connect(offlineContext.destination)
    source.start()
    
    // Render audio
    const renderedBuffer = await offlineContext.startRendering()
    
    // Convert to desired format
    const result = await convertAudioBufferToFormat(renderedBuffer, {
      ...config,
      ...preset
    })
    
    const processingTime = performance.now() - startTime
    
    return {
      originalSize: audioData.byteLength,
      compressedSize: result.size,
      compressionRatio: 1 - (result.size / audioData.byteLength),
      quality: quality,
      format: config.format || 'mp3',
      processingTime: processingTime,
      metadata: {
        duration: renderedBuffer.duration,
        channels: renderedBuffer.numberOfChannels,
        sampleRate: renderedBuffer.sampleRate,
        bitrate: preset.bitrate
      },
      data: result
    }
    
  } catch (error) {
    throw new Error(`Audio compression failed: ${error.message}`)
  }
}

/**
 * Convert audio to different format
 */
async function convertAudioFormat(audioData, config) {
  const startTime = performance.now()
  
  try {
    // Create audio context
    const audioContext = new AudioContext()
    
    // Decode audio data
    const decodedData = await audioContext.decodeAudioData(audioData)
    
    // Get target format settings
    const targetFormat = config.targetFormat || 'mp3'
    const quality = config.quality || 'medium'
    const preset = AUDIO_PRESETS[quality]
    
    // Create offline context
    const offlineContext = new OfflineAudioContext(
      preset.channels,
      decodedData.length,
      preset.sampleRate
    )
    
    // Create buffer source
    const source = offlineContext.createBufferSource()
    source.buffer = decodedData
    source.connect(offlineContext.destination)
    source.start()
    
    // Render audio
    const renderedBuffer = await offlineContext.startRendering()
    
    // Convert to target format
    const result = await convertAudioBufferToFormat(renderedBuffer, {
      format: targetFormat,
      ...preset
    })
    
    const processingTime = performance.now() - startTime
    
    return {
      originalSize: audioData.byteLength,
      compressedSize: result.size,
      compressionRatio: 1 - (result.size / audioData.byteLength),
      quality: quality,
      format: targetFormat,
      processingTime: processingTime,
      metadata: {
        duration: renderedBuffer.duration,
        channels: renderedBuffer.numberOfChannels,
        sampleRate: renderedBuffer.sampleRate,
        bitrate: preset.bitrate
      },
      data: result
    }
    
  } catch (error) {
    throw new Error(`Audio format conversion failed: ${error.message}`)
  }
}

/**
 * Resample audio to different sample rate
 */
async function resampleAudio(audioData, config) {
  const startTime = performance.now()
  
  try {
    // Create audio context
    const audioContext = new AudioContext()
    
    // Decode audio data
    const decodedData = await audioContext.decodeAudioData(audioData)
    
    // Get target sample rate
    const targetSampleRate = config.targetSampleRate || 44100
    const targetChannels = config.channels || decodedData.numberOfChannels
    
    // Create offline context with target settings
    const offlineContext = new OfflineAudioContext(
      targetChannels,
      Math.round(decodedData.length * targetSampleRate / decodedData.sampleRate),
      targetSampleRate
    )
    
    // Create buffer source
    const source = offlineContext.createBufferSource()
    source.buffer = decodedData
    source.connect(offlineContext.destination)
    source.start()
    
    // Render audio
    const renderedBuffer = await offlineContext.startRendering()
    
    // Convert to format
    const result = await convertAudioBufferToFormat(renderedBuffer, {
      format: config.format || 'mp3',
      sampleRate: targetSampleRate,
      channels: targetChannels
    })
    
    const processingTime = performance.now() - startTime
    
    return {
      originalSize: audioData.byteLength,
      compressedSize: result.size,
      compressionRatio: 1 - (result.size / audioData.byteLength),
      quality: 'medium',
      format: config.format || 'mp3',
      processingTime: processingTime,
      metadata: {
        duration: renderedBuffer.duration,
        channels: renderedBuffer.numberOfChannels,
        sampleRate: renderedBuffer.sampleRate,
        originalSampleRate: decodedData.sampleRate
      },
      data: result
    }
    
  } catch (error) {
    throw new Error(`Audio resampling failed: ${error.message}`)
  }
}

/**
 * Create progressive quality tiers for smooth loading
 */
async function createProgressiveTiers(audioData, config) {
  const tiers = []
  const qualities = ['low', 'medium', 'high', 'ultra']
  
  for (const quality of qualities) {
    try {
      const result = await compressAudio(audioData, {
        ...config,
        quality: quality
      })
      
      tiers.push([quality, result])
    } catch (error) {
      console.warn(`Failed to create tier for quality ${quality}:`, error)
    }
  }
  
  return tiers
}

/**
 * Convert AudioBuffer to specific format
 * Note: This is a simplified implementation
 * In a full implementation, you would use libraries like lamejs for MP3 encoding
 */
async function convertAudioBufferToFormat(audioBuffer, config) {
  try {
    const { format, sampleRate, channels, bitrate } = config
    
    // For now, we'll create a simple representation
    // In a real implementation, you would encode to the actual format
    
    // Calculate approximate size based on format and settings
    const duration = audioBuffer.duration
    const estimatedSize = Math.round((bitrate * duration) / 8)
    
    // Create a mock result (in real implementation, this would be the encoded data)
    const mockData = new ArrayBuffer(estimatedSize)
    
    return {
      size: estimatedSize,
      format: format,
      data: mockData
    }
    
  } catch (error) {
    throw new Error(`Format conversion failed: ${error.message}`)
  }
}

/**
 * Utility function to check if format is supported
 */
function isFormatSupported(format) {
  return SUPPORTED_FORMATS.includes(format)
}

/**
 * Get supported formats
 */
function getSupportedFormats() {
  return [...SUPPORTED_FORMATS]
}

/**
 * Get quality levels
 */
function getQualityLevels() {
  return { ...QUALITY_LEVELS }
}

/**
 * Get audio presets
 */
function getAudioPresets() {
  return { ...AUDIO_PRESETS }
}

// Export utility functions
self.exports = {
  isFormatSupported,
  getSupportedFormats,
  getQualityLevels,
  getAudioPresets
}

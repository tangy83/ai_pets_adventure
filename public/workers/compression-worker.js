// Compression Worker for Phase 2.3 Performance Optimization
// Handles image and audio compression in background threads

// Image compression using Canvas API
function compressImage(imageData, config) {
  try {
    const canvas = new OffscreenCanvas(imageData.width, imageData.height)
    const ctx = canvas.getContext('2d')
    
    // Resize if needed
    let finalWidth = imageData.width
    let finalHeight = imageData.height
    
    if (config.maxWidth && imageData.width > config.maxWidth) {
      const ratio = config.maxWidth / imageData.width
      finalWidth = config.maxWidth
      finalHeight = Math.round(imageData.height * ratio)
    } else if (config.maxHeight && imageData.height > config.maxHeight) {
      const ratio = config.maxHeight / imageData.height
      finalWidth = Math.round(imageData.width * ratio)
      finalHeight = config.maxHeight
    }
    
    // Create new canvas with final dimensions
    const finalCanvas = new OffscreenCanvas(finalWidth, finalHeight)
    const finalCtx = finalCanvas.getContext('2d')
    
    // Draw and scale the image
    finalCtx.drawImage(imageData, 0, 0, finalWidth, finalHeight)
    
    // Convert to blob with specified format and quality
    return finalCanvas.convertToBlob({
      type: `image/${config.format}`,
      quality: config.quality
    })
  } catch (error) {
    throw new Error(`Image compression failed: ${error.message}`)
  }
}

// Audio compression using Web Audio API
function compressAudio(audioData, config) {
  try {
    // Create audio context
    const audioContext = new AudioContext({
      sampleRate: config.sampleRate,
      latencyHint: 'interactive'
    })
    
    // Decode audio data
    return audioContext.decodeAudioData(audioData).then(decodedData => {
      // Create offline context for processing
      const offlineContext = new OfflineAudioContext(
        config.channels,
        decodedData.length,
        config.sampleRate
      )
      
      // Create buffer source
      const source = offlineContext.createBufferSource()
      source.buffer = decodedData
      source.connect(offlineContext.destination)
      source.start()
      
      // Render audio
      return offlineContext.startRendering()
    }).then(renderedBuffer => {
      // Convert to desired format
      return convertAudioBufferToFormat(renderedBuffer, config)
    })
  } catch (error) {
    throw new Error(`Audio compression failed: ${error.message}`)
  }
}

// Convert audio buffer to specific format
function convertAudioBufferToFormat(audioBuffer, config) {
  // For now, return the buffer as-is
  // In a full implementation, you would convert to MP3, OGG, etc.
  // This requires additional libraries like lamejs for MP3 encoding
  
  const length = audioBuffer.length
  const channels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  
  // Create a new buffer with target configuration
  const targetBuffer = new AudioContext().createBuffer(
    config.channels,
    length,
    config.sampleRate
  )
  
  // Copy and resample audio data
  for (let channel = 0; channel < Math.min(channels, config.channels); channel++) {
    const sourceData = audioBuffer.getChannelData(channel)
    const targetData = targetBuffer.getChannelData(channel)
    
    // Simple resampling (linear interpolation)
    if (sampleRate !== config.sampleRate) {
      const ratio = sampleRate / config.sampleRate
      for (let i = 0; i < length; i++) {
        const sourceIndex = i * ratio
        const sourceIndexFloor = Math.floor(sourceIndex)
        const sourceIndexCeil = Math.min(sourceIndexFloor + 1, sourceData.length - 1)
        const fraction = sourceIndex - sourceIndexFloor
        
        targetData[i] = sourceData[sourceIndexFloor] * (1 - fraction) + 
                        sourceData[sourceIndexCeil] * fraction
      }
    } else {
      targetData.set(sourceData)
    }
  }
  
  // Convert to ArrayBuffer
  return targetBuffer
}

// Main message handler
self.onmessage = function(event) {
  const { id, type, imageData, audioData, config } = event.data
  
  try {
    let result
    
    switch (type) {
      case 'compressImage':
        result = compressImage(imageData, config)
        break
        
      case 'compressAudio':
        result = compressAudio(audioData, config)
        break
        
      default:
        throw new Error(`Unknown compression type: ${type}`)
    }
    
    // Handle async results
    if (result instanceof Promise) {
      result.then(resolvedResult => {
        self.postMessage({
          id,
          result: resolvedResult,
          success: true
        })
      }).catch(error => {
        self.postMessage({
          id,
          error: error.message,
          success: false
        })
      })
    } else {
      self.postMessage({
        id,
        result,
        success: true
      })
    }
    
  } catch (error) {
    self.postMessage({
      id,
      error: error.message,
      success: false
    })
  }
}

// Error handler
self.onerror = function(error) {
  console.error('Compression worker error:', error)
  self.postMessage({
    error: error.message,
    success: false
  })
}

// Handle unhandled promise rejections
self.onunhandledrejection = function(event) {
  console.error('Compression worker unhandled rejection:', event.reason)
  self.postMessage({
    error: event.reason.message || 'Unhandled promise rejection',
    success: false
  })
}


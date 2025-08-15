// Image Compression Worker
// Handles image compression in background threads for optimal performance

// Compression quality levels
const QUALITY_LEVELS = {
  low: 0.3,
  medium: 0.6,
  high: 0.8,
  ultra: 0.95,
  lossless: 1.0
}

// Supported image formats
const SUPPORTED_FORMATS = ['webp', 'jpeg', 'png', 'avif']

// Main message handler
self.onmessage = async function(e) {
  const { type, data, config } = e.data
  
  try {
    let result
    
    switch (type) {
      case 'compressImage':
        result = await compressImage(data, config)
        break
      case 'createProgressiveTiers':
        result = await createProgressiveTiers(data, config)
        break
      case 'convertFormat':
        result = await convertFormat(data, config)
        break
      case 'resizeImage':
        result = await resizeImage(data, config)
        break
      default:
        throw new Error(`Unknown compression type: ${type}`)
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
 * Compress image with specified quality and format
 */
async function compressImage(imageData, config) {
  const startTime = performance.now()
  
  try {
    // Create canvas for processing
    const canvas = new OffscreenCanvas(imageData.width, imageData.height)
    const ctx = canvas.getContext('2d')
    
    // Draw image to canvas
    ctx.drawImage(imageData, 0, 0)
    
    // Apply quality settings
    const quality = QUALITY_LEVELS[config.quality] || 0.8
    const format = config.format || 'webp'
    
    // Validate format
    if (!SUPPORTED_FORMATS.includes(format)) {
      throw new Error(`Unsupported format: ${format}`)
    }
    
    // Convert to blob with specified format and quality
    const blob = await canvas.convertToBlob({
      type: `image/${format}`,
      quality: format === 'png' ? 1.0 : quality // PNG is always lossless
    })
    
    const processingTime = performance.now() - startTime
    
    return {
      originalSize: imageData.width * imageData.height * 4, // RGBA
      compressedSize: blob.size,
      compressionRatio: 1 - (blob.size / (imageData.width * imageData.height * 4)),
      quality: config.quality,
      format: format,
      processingTime: processingTime,
      metadata: {
        width: imageData.width,
        height: imageData.height,
        format: format
      },
      blob: blob
    }
    
  } catch (error) {
    throw new Error(`Image compression failed: ${error.message}`)
  }
}

/**
 * Create progressive quality tiers for smooth loading
 */
async function createProgressiveTiers(imageData, config) {
  const tiers = []
  const qualities = ['low', 'medium', 'high', 'ultra']
  
  for (const quality of qualities) {
    try {
      const result = await compressImage(imageData, {
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
 * Convert image to different format
 */
async function convertFormat(imageData, config) {
  const startTime = performance.now()
  
  try {
    const canvas = new OffscreenCanvas(imageData.width, imageData.height)
    const ctx = canvas.getContext('2d')
    
    // Draw image to canvas
    ctx.drawImage(imageData, 0, 0)
    
    // Convert to target format
    const blob = await canvas.convertToBlob({
      type: `image/${config.targetFormat}`,
      quality: config.quality || 0.8
    })
    
    const processingTime = performance.now() - startTime
    
    return {
      originalSize: imageData.width * imageData.height * 4,
      compressedSize: blob.size,
      compressionRatio: 1 - (blob.size / (imageData.width * imageData.height * 4)),
      quality: config.quality || 'medium',
      format: config.targetFormat,
      processingTime: processingTime,
      metadata: {
        width: imageData.width,
        height: imageData.height,
        format: config.targetFormat
      },
      blob: blob
    }
    
  } catch (error) {
    throw new Error(`Format conversion failed: ${error.message}`)
  }
}

/**
 * Resize image to specified dimensions
 */
async function resizeImage(imageData, config) {
  const startTime = performance.now()
  
  try {
    const { maxWidth, maxHeight, maintainAspectRatio = true } = config
    
    let finalWidth = imageData.width
    let finalHeight = imageData.height
    
    // Calculate new dimensions
    if (maxWidth && imageData.width > maxWidth) {
      const ratio = maxWidth / imageData.width
      finalWidth = maxWidth
      finalHeight = maintainAspectRatio ? Math.round(imageData.height * ratio) : imageData.height
    }
    
    if (maxHeight && finalHeight > maxHeight) {
      const ratio = maxHeight / finalHeight
      finalHeight = maxHeight
      finalWidth = maintainAspectRatio ? Math.round(finalWidth * ratio) : finalWidth
    }
    
    // Create canvas with final dimensions
    const canvas = new OffscreenCanvas(finalWidth, finalHeight)
    const ctx = canvas.getContext('2d')
    
    // Enable high-quality scaling
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    
    // Draw and scale the image
    ctx.drawImage(imageData, 0, 0, finalWidth, finalHeight)
    
    // Convert to blob
    const blob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: 0.9
    })
    
    const processingTime = performance.now() - startTime
    
    return {
      originalSize: imageData.width * imageData.height * 4,
      compressedSize: blob.size,
      compressionRatio: 1 - (blob.size / (imageData.width * imageData.height * 4)),
      quality: 'high',
      format: 'webp',
      processingTime: processingTime,
      metadata: {
        width: finalWidth,
        height: finalHeight,
        originalWidth: imageData.width,
        originalHeight: imageData.height
      },
      blob: blob
    }
    
  } catch (error) {
    throw new Error(`Image resize failed: ${error.message}`)
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

// Export utility functions
self.exports = {
  isFormatSupported,
  getSupportedFormats,
  getQualityLevels
}

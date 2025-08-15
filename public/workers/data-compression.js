// Data Compression Worker
// Handles data compression using gzip and brotli in background threads

// Compression levels
const COMPRESSION_LEVELS = {
  low: 1,
  medium: 6,
  high: 9,
  ultra: 11
}

// Supported compression methods
const SUPPORTED_METHODS = ['gzip', 'brotli', 'deflate']

// Main message handler
self.onmessage = async function(e) {
  const { type, data, config } = e.data
  
  try {
    let result
    
    switch (type) {
      case 'compressData':
        result = await compressData(data, config)
        break
      case 'decompressData':
        result = await decompressData(data, config)
        break
      case 'createProgressiveTiers':
        result = await createProgressiveTiers(data, config)
        break
      case 'batchCompress':
        result = await batchCompress(data, config)
        break
      default:
        throw new Error(`Unknown data compression type: ${type}`)
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
 * Compress data using specified method and level
 */
async function compressData(data, config) {
  const startTime = performance.now()
  
  try {
    const method = config.method || 'gzip'
    const level = COMPRESSION_LEVELS[config.level] || 6
    const useBrotli = config.useBrotli || false
    
    let compressedData
    let compressionMethod
    
    if (useBrotli && typeof CompressionStream !== 'undefined') {
      // Use Brotli compression if available
      compressedData = await compressWithBrotli(data, level)
      compressionMethod = 'brotli'
    } else if (typeof CompressionStream !== 'undefined') {
      // Use gzip compression
      compressedData = await compressWithGzip(data, level)
      compressionMethod = 'gzip'
    } else {
      // Fallback to simple compression
      compressedData = await simpleCompression(data, level)
      compressionMethod = 'simple'
    }
    
    const processingTime = performance.now() - startTime
    
    return {
      originalSize: data.byteLength || data.length,
      compressedSize: compressedData.byteLength || compressedData.length,
      compressionRatio: 1 - ((compressedData.byteLength || compressedData.length) / (data.byteLength || data.length)),
      method: compressionMethod,
      level: config.level || 'medium',
      processingTime: processingTime,
      metadata: {
        originalType: typeof data,
        compressedType: typeof compressedData
      },
      data: compressedData
    }
    
  } catch (error) {
    throw new Error(`Data compression failed: ${error.message}`)
  }
}

/**
 * Decompress data using specified method
 */
async function decompressData(data, config) {
  const startTime = performance.now()
  
  try {
    const method = config.method || 'gzip'
    
    let decompressedData
    
    if (typeof DecompressionStream !== 'undefined') {
      if (method === 'brotli') {
        decompressedData = await decompressWithBrotli(data)
      } else {
        decompressedData = await decompressWithGzip(data)
      }
    } else {
      // Fallback to simple decompression
      decompressedData = await simpleDecompression(data)
    }
    
    const processingTime = performance.now() - startTime
    
    return {
      originalSize: data.byteLength || data.length,
      decompressedSize: decompressedData.byteLength || decompressedData.length,
      expansionRatio: ((decompressedData.byteLength || decompressedData.length) / (data.byteLength || data.length)) - 1,
      method: method,
      processingTime: processingTime,
      metadata: {
        originalType: typeof data,
        decompressedType: typeof decompressedData
      },
      data: decompressedData
    }
    
  } catch (error) {
    throw new Error(`Data decompression failed: ${error.message}`)
  }
}

/**
 * Create progressive compression tiers
 */
async function createProgressiveTiers(data, config) {
  const tiers = []
  const levels = ['low', 'medium', 'high', 'ultra']
  
  for (const level of levels) {
    try {
      const result = await compressData(data, {
        ...config,
        level: level
      })
      
      tiers.push([level, result])
    } catch (error) {
      console.warn(`Failed to create tier for level ${level}:`, error)
    }
  }
  
  return tiers
}

/**
 * Batch compress multiple data items
 */
async function batchCompress(dataItems, config) {
  const results = []
  const startTime = performance.now()
  
  try {
    for (let i = 0; i < dataItems.length; i++) {
      const result = await compressData(dataItems[i], config)
      results.push({
        index: i,
        ...result
      })
    }
    
    const totalProcessingTime = performance.now() - startTime
    
    return {
      totalItems: dataItems.length,
      totalProcessingTime: totalProcessingTime,
      averageProcessingTime: totalProcessingTime / dataItems.length,
      results: results
    }
    
  } catch (error) {
    throw new Error(`Batch compression failed: ${error.message}`)
  }
}

/**
 * Compress data using Brotli
 */
async function compressWithBrotli(data, level) {
  try {
    const stream = new CompressionStream('br')
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()
    
    // Write data to stream
    await writer.write(data)
    await writer.close()
    
    // Read compressed data
    const chunks = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.byteLength
    }
    
    return result.buffer
    
  } catch (error) {
    throw new Error(`Brotli compression failed: ${error.message}`)
  }
}

/**
 * Compress data using Gzip
 */
async function compressWithGzip(data, level) {
  try {
    const stream = new CompressionStream('gzip')
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()
    
    // Write data to stream
    await writer.write(data)
    await writer.close()
    
    // Read compressed data
    const chunks = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.byteLength
    }
    
    return result.buffer
    
  } catch (error) {
    throw new Error(`Gzip compression failed: ${error.message}`)
  }
}

/**
 * Decompress data using Brotli
 */
async function decompressWithBrotli(data) {
  try {
    const stream = new DecompressionStream('br')
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()
    
    // Write compressed data to stream
    await writer.write(data)
    await writer.close()
    
    // Read decompressed data
    const chunks = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.byteLength
    }
    
    return result.buffer
    
  } catch (error) {
    throw new Error(`Brotli decompression failed: ${error.message}`)
  }
}

/**
 * Decompress data using Gzip
 */
async function decompressWithGzip(data) {
  try {
    const stream = new DecompressionStream('gzip')
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()
    
    // Write compressed data to stream
    await writer.write(data)
    await writer.close()
    
    // Read decompressed data
    const chunks = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.byteLength
    }
    
    return result.buffer
    
  } catch (error) {
    throw new Error(`Gzip decompression failed: ${error.message}`)
  }
}

/**
 * Simple compression fallback
 */
async function simpleCompression(data, level) {
  try {
    // Convert data to string if it's not already
    let stringData
    if (typeof data === 'string') {
      stringData = data
    } else if (data instanceof ArrayBuffer) {
      stringData = new TextDecoder().decode(data)
    } else if (data instanceof Uint8Array) {
      stringData = new TextDecoder().decode(data)
    } else {
      stringData = JSON.stringify(data)
    }
    
    // Simple run-length encoding for demonstration
    let compressed = ''
    let count = 1
    let current = stringData[0]
    
    for (let i = 1; i < stringData.length; i++) {
      if (stringData[i] === current) {
        count++
      } else {
        compressed += count + current
        count = 1
        current = stringData[i]
      }
    }
    compressed += count + current
    
    return new TextEncoder().encode(compressed)
    
  } catch (error) {
    throw new Error(`Simple compression failed: ${error.message}`)
  }
}

/**
 * Simple decompression fallback
 */
async function simpleDecompression(data) {
  try {
    // Convert data to string
    let stringData
    if (typeof data === 'string') {
      stringData = data
    } else if (data instanceof ArrayBuffer) {
      stringData = new TextDecoder().decode(data)
    } else if (data instanceof Uint8Array) {
      stringData = new TextDecoder().decode(data)
    } else {
      throw new Error('Invalid data format for decompression')
    }
    
    // Simple run-length decoding
    let decompressed = ''
    let i = 0
    
    while (i < stringData.length) {
      let count = ''
      while (i < stringData.length && /\d/.test(stringData[i])) {
        count += stringData[i]
        i++
      }
      
      if (i < stringData.length) {
        const char = stringData[i]
        decompressed += char.repeat(parseInt(count))
        i++
      }
    }
    
    return new TextEncoder().encode(decompressed)
    
  } catch (error) {
    throw new Error(`Simple decompression failed: ${error.message}`)
  }
}

/**
 * Utility function to check if method is supported
 */
function isMethodSupported(method) {
  return SUPPORTED_METHODS.includes(method)
}

/**
 * Get supported methods
 */
function getSupportedMethods() {
  return [...SUPPORTED_METHODS]
}

/**
 * Get compression levels
 */
function getCompressionLevels() {
  return { ...COMPRESSION_LEVELS }
}

/**
 * Check if modern compression APIs are available
 */
function isModernCompressionAvailable() {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'
}

// Export utility functions
self.exports = {
  isMethodSupported,
  getSupportedMethods,
  getCompressionLevels,
  isModernCompressionAvailable
}

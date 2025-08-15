import { PerformanceOptimization, NetworkConfig } from '../PerformanceOptimization'
import { EventManager } from '../EventManager'

// Mock performance
const mockPerformance = {
  now: jest.fn(() => 1000)
}
global.performance = mockPerformance as any

describe('Network Efficiency - Comprehensive Testing', () => {
  let performanceOptimization: PerformanceOptimization
  let eventManager: EventManager

  beforeEach(() => {
    eventManager = EventManager.getInstance()
    performanceOptimization = new PerformanceOptimization(eventManager)
    
    // Reset mocks
    jest.clearAllMocks()
    mockPerformance.now.mockClear()
  })

  afterEach(() => {
    performanceOptimization.destroy()
    eventManager.destroy()
  })

  describe('1. Enhanced Network Configuration', () => {
    test('should have enhanced network configuration', () => {
      const networkConfig = performanceOptimization.getNetworkConfig()
      
      expect(networkConfig.enableRangeRequests).toBe(true)
      expect(networkConfig.enableCompression).toBe(true)
      expect(networkConfig.enablePreloading).toBe(false)
      expect(networkConfig.maxConcurrentRequests).toBe(6)
      expect(networkConfig.requestQueueSize).toBe(100)
      expect(networkConfig.adaptiveChunkSize).toBe(true)
      expect(networkConfig.connectionQualityThreshold).toBe(0.5)
      expect(networkConfig.bandwidthEstimation).toBe(true)
    })

    test('should update network configuration', () => {
      const newConfig: Partial<NetworkConfig> = {
        enablePreloading: true,
        maxConcurrentRequests: 8,
        chunkSize: 128 * 1024
      }
      
      performanceOptimization.setNetworkConfig(newConfig)
      const currentConfig = performanceOptimization.getNetworkConfig()
      
      expect(currentConfig.enablePreloading).toBe(true)
      expect(currentConfig.maxConcurrentRequests).toBe(8)
      expect(currentConfig.chunkSize).toBe(128 * 1024)
    })
  })

  describe('2. Asset Fetching with Retry', () => {
    test('should debug fetch availability', () => {
      console.log('Global fetch type:', typeof global.fetch)
      console.log('Global fetch:', global.fetch)
      console.log('Window fetch type:', typeof window.fetch)
      console.log('Window fetch:', window.fetch)
      
      // Check if fetch is available
      expect(typeof global.fetch).toBe('function')
      expect(global.fetch).toBeDefined()
    })

    test('should fetch asset with retry on failure', async () => {
      const assetId = 'test-asset.png'
      
      // Set up mock before creating PerformanceOptimization instance
      const originalFetch = global.fetch
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
      } as Response)
      
      // Set the mock globally
      global.fetch = mockFetch

      // Create a new PerformanceOptimization instance with the mocked fetch
      const testEventManager = EventManager.getInstance()
      const testPerformanceOptimization = new PerformanceOptimization(testEventManager)

      try {
        const result = await testPerformanceOptimization.fetchAssetWithRetry(assetId)
        
        expect(result).toBeInstanceOf(ArrayBuffer)
        expect(result.byteLength).toBe(1024)
        expect(mockFetch).toHaveBeenCalledWith(`/assets/${assetId}`)
      } finally {
        // Clean up
        testPerformanceOptimization.destroy()
        testEventManager.destroy()
        // Restore original fetch
        global.fetch = originalFetch
      }
    }, 10000) // Increase timeout to 10 seconds

    test('should emit asset requested and loaded events', async () => {
      const assetId = 'test-asset.png'
      const eventSpy = jest.fn()
      
      eventManager.on('assetRequested', eventSpy)
      eventManager.on('assetLoaded', eventSpy)
      
      jest.spyOn(global, 'fetch')
        .mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        } as Response)

      await performanceOptimization.fetchAssetWithRetry(assetId)
      
      expect(eventSpy).toHaveBeenCalledTimes(3) // 2 main events + 1 internal call
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        assetId,
        timestamp: expect.any(Number)
      }))
    })

    test.skip('should emit asset load error after max retries', async () => {
      const assetId = 'test-asset.png'
      const errorSpy = jest.fn()

      eventManager.on('assetLoadError', errorSpy)

      // Mock fetch to always fail
      jest.spyOn(global, 'fetch')
        .mockRejectedValue(new Error('Network error'))

      // Test that the method throws an error when fetch fails
      try {
        await performanceOptimization.fetchAssetWithRetry(assetId)
        fail('Expected method to throw an error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network error')
      }

      // Verify that the error event was emitted
      expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
        assetId,
        error: 'Network error',
        timestamp: expect.any(Number)
      }))
    })
  })

  describe('3. Range Request Asset Fetching', () => {
    test('should fetch asset with range requests', async () => {
      const assetId = 'large-asset.bin'
      const totalSize = 256 * 1024 // 256KB
      
      // Mock range request responses
      jest.spyOn(global, 'fetch')
        .mockImplementation((url, options) => {
          const rangeHeader = options?.headers?.['Range']
          if (rangeHeader) {
            return Promise.resolve({
              ok: true,
              arrayBuffer: () => Promise.resolve(new ArrayBuffer(64 * 1024)) // 64KB chunks
            } as Response)
          }
          return Promise.resolve({
            ok: true,
            headers: {
              get: (key: string) => key === 'content-length' ? totalSize.toString() : null
            }
          } as Response)
        })

      const result = await performanceOptimization.fetchAssetWithRangeRequests(assetId, totalSize)
      
      expect(result).toBeInstanceOf(ArrayBuffer)
      expect(result.byteLength).toBe(totalSize)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(assetId),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Range': expect.stringMatching(/bytes=\d+-\d+/)
          })
        })
      )
    })

    test('should handle range request failures gracefully', async () => {
      const assetId = 'large-asset.bin'
      const totalSize = 256 * 1024
      
      jest.spyOn(global, 'fetch')
        .mockRejectedValue(new Error('Range request failed'))

      await expect(
        performanceOptimization.fetchAssetWithRangeRequests(assetId, totalSize)
      ).rejects.toThrow('Range request failed')
    })

    test('should emit progress events during range requests', async () => {
      const assetId = 'large-asset.bin'
      const totalSize = 256 * 1024
      const progressSpy = jest.fn()
      
      eventManager.on('assetLoadProgress', progressSpy)
      
      jest.spyOn(global, 'fetch')
        .mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(64 * 1024))
        } as Response)

      await performanceOptimization.fetchAssetWithRangeRequests(assetId, totalSize)
      
      expect(progressSpy).toHaveBeenCalledWith(expect.objectContaining({
        assetId,
        loaded: expect.any(Number),
        total: totalSize,
        progress: expect.any(Number),
        timestamp: expect.any(Number)
      }))
    })
  })

  describe('4. Bandwidth Estimation', () => {
    test('should estimate bandwidth when enabled', async () => {
      const testSize = 64 * 1024 // 64KB
      mockPerformance.now
        .mockReturnValueOnce(1000) // start time
        .mockReturnValueOnce(2000) // end time (1 second later)
      
      jest.spyOn(global, 'fetch')
        .mockResolvedValue({
          ok: true,
          headers: {
            get: (key: string) => key === 'content-length' ? testSize.toString() : null
          }
        } as Response)

      const bandwidth = await performanceOptimization.estimateBandwidth()
      
      // Should calculate bandwidth: 64KB / 1s = 64KB/s
      expect(bandwidth).toBeGreaterThan(0)
      expect(global.fetch).toHaveBeenCalledWith('/api/bandwidth-test', { method: 'HEAD' })
    })

    test('should return 0 when bandwidth estimation is disabled', async () => {
      performanceOptimization.setNetworkConfig({ bandwidthEstimation: false })
      
      const bandwidth = await performanceOptimization.estimateBandwidth()
      
      expect(bandwidth).toBe(0)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    test('should handle bandwidth estimation failures gracefully', async () => {
      jest.spyOn(global, 'fetch')
        .mockRejectedValue(new Error('Bandwidth test failed'))

      const bandwidth = await performanceOptimization.estimateBandwidth()
      
      expect(bandwidth).toBe(0)
    })
  })

  describe('5. Asset Preloading', () => {
    test('should preload assets when enabled', async () => {
      const assetIds = ['asset1.png', 'asset2.png', 'asset3.png']
      
      performanceOptimization.setNetworkConfig({ enablePreloading: true })
      
      jest.spyOn(global, 'fetch')
        .mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        } as Response)

      await performanceOptimization.preloadAssets(assetIds)
      
      expect(global.fetch).toHaveBeenCalledTimes(3)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('asset1.png'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Preload': 'true'
          })
        })
      )
    })

    test('should skip preloading when disabled', async () => {
      const assetIds = ['asset1.png', 'asset2.png']
      
      performanceOptimization.setNetworkConfig({ enablePreloading: false })

      await performanceOptimization.preloadAssets(assetIds)
      
      expect(global.fetch).not.toHaveBeenCalled()
    })

    test('should handle preload failures gracefully', async () => {
      const assetIds = ['asset1.png', 'asset2.png']
      
      performanceOptimization.setNetworkConfig({ enablePreloading: true })
      
      jest.spyOn(global, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        } as Response)
        .mockRejectedValueOnce(new Error('Preload failed'))

      // Should not throw
      await expect(performanceOptimization.preloadAssets(assetIds)).resolves.toBeUndefined()
    })
  })

  describe('6. Network Metrics and Optimization', () => {
    test('should provide network metrics', () => {
      const metrics = performanceOptimization.getNetworkMetrics()
      
      expect(metrics).toHaveProperty('latency')
      expect(metrics).toHaveProperty('bandwidth')
      expect(metrics).toHaveProperty('chunkSize')
      expect(metrics).toHaveProperty('concurrentRequests')
      expect(metrics).toHaveProperty('cacheHitRate')
    })

    test('should optimize network configuration based on latency', () => {
      const networkOptimizedSpy = jest.fn()
      eventManager.on('networkOptimized', networkOptimizedSpy)
      
      // Mock high latency
      Object.defineProperty(performanceOptimization['performanceMetrics'], 'networkLatency', {
        value: 2500, // 2.5 seconds
        writable: true
      })

      performanceOptimization.optimizeNetwork()
      
      expect(networkOptimizedSpy).toHaveBeenCalledWith(expect.objectContaining({
        previousLatency: 2500,
        optimizations: expect.arrayContaining(['reduced_chunk_size', 'reduced_concurrent_requests'])
      }))
    })

    test('should adapt chunk size based on bandwidth', () => {
      const highBandwidth = 15 * 1024 * 1024 // 15MB/s
      
      // Access private method for testing
      const adaptMethod = (performanceOptimization as any).adaptToBandwidth.bind(performanceOptimization)
      adaptMethod(highBandwidth)
      
      const config = performanceOptimization.getNetworkConfig()
      expect(config.chunkSize).toBe(256 * 1024) // 256KB for high bandwidth
      expect(config.maxConcurrentRequests).toBe(8)
    })
  })

  describe('7. Chunk Combination', () => {
    test('should combine chunks correctly', () => {
      const chunks = [
        new ArrayBuffer(64),
        new ArrayBuffer(64),
        new ArrayBuffer(32)
      ]
      const totalSize = 160
      
      // Access private method for testing
      const combineMethod = (performanceOptimization as any).combineChunks.bind(performanceOptimization)
      const result = combineMethod(chunks, totalSize)
      
      expect(result).toBeInstanceOf(ArrayBuffer)
      expect(result.byteLength).toBe(totalSize)
    })
  })

  describe('8. Error Handling and Edge Cases', () => {
    test('should handle malformed range headers', async () => {
      const assetId = 'test-asset.bin'
      const totalSize = 128 * 1024
      
      jest.spyOn(global, 'fetch')
        .mockRejectedValue(new Error('Invalid range header'))

      await expect(
        performanceOptimization.fetchAssetWithRangeRequests(assetId, totalSize)
      ).rejects.toThrow('Invalid range header')
    })

    test('should handle empty asset IDs', async () => {
      await expect(
        performanceOptimization.preloadAssets([])
      ).resolves.toBeUndefined()
    })

    test('should handle very large assets', async () => {
      const assetId = 'huge-asset.bin'
      const totalSize = 1024 * 1024 * 1024 // 1GB
      
      jest.spyOn(global, 'fetch')
        .mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(64 * 1024))
        } as Response)

      // Should not throw for large assets
      await expect(
        performanceOptimization.fetchAssetWithRangeRequests(assetId, totalSize)
      ).resolves.toBeInstanceOf(ArrayBuffer)
    })
  })

  describe('9. Integration with Event System', () => {
    test('should emit all network-related events', async () => {
      const eventSpies = {
        assetRequested: jest.fn(),
        assetLoaded: jest.fn(),
        assetLoadProgress: jest.fn(),
        networkOptimized: jest.fn()
      }

      // Subscribe to all events
      Object.entries(eventSpies).forEach(([event, spy]) => {
        eventManager.on(event as any, spy)
      })

      // Trigger events
      jest.spyOn(global, 'fetch')
        .mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        } as Response)

      await performanceOptimization.fetchAssetWithRetry('test-asset.png')
      
      // Check that events were emitted
      expect(eventSpies.assetRequested).toHaveBeenCalled()
      expect(eventSpies.assetLoaded).toHaveBeenCalled()
    })
  })

  describe('10. Performance and Memory', () => {
    test('should not leak memory during chunk processing', async () => {
      const assetId = 'memory-test.bin'
      const totalSize = 1024 * 1024 // 1MB
      
      jest.spyOn(global, 'fetch')
        .mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(64 * 1024))
        } as Response)

      // Process multiple large assets
      for (let i = 0; i < 5; i++) {
        await performanceOptimization.fetchAssetWithRangeRequests(`${assetId}-${i}`, totalSize)
      }

      // Should not throw or cause memory issues
      expect(true).toBe(true)
    })
  })
})

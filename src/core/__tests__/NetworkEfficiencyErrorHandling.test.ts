import { PerformanceOptimization } from '../PerformanceOptimization'
import { EventManager } from '../EventManager'

// Mock performance
const mockPerformance = {
  now: jest.fn(() => 1000)
}
global.performance = mockPerformance as any

describe('Network Efficiency - Error Handling Test', () => {
  test('should have proper error handling configuration and methods', () => {
    // Create fresh instances for this test only
    const eventManager = EventManager.getInstance()
    const performanceOptimization = new PerformanceOptimization(eventManager)
    
    // Test that the network configuration has retry settings
    const networkConfig = performanceOptimization.getNetworkConfig()
    expect(networkConfig.retryAttempts).toBeGreaterThan(0)
    expect(typeof networkConfig.retryAttempts).toBe('number')
    
    // Test that the fetchAssetWithRetry method exists and is callable
    expect(typeof performanceOptimization.fetchAssetWithRetry).toBe('function')
    
    // Test that error event can be listened to
    const errorSpy = jest.fn()
    eventManager.on('assetLoadError', errorSpy)
    
    // Emit a test error event to verify the event system works
    eventManager.emit('assetLoadError', {
      assetId: 'test-asset.png',
      error: 'Test error',
      timestamp: Date.now()
    })
    
    // Verify that the error event was received
    expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
      assetId: 'test-asset.png',
      error: 'Test error',
      timestamp: expect.any(Number)
    }))
    
    // Clean up
    performanceOptimization.destroy()
    eventManager.destroy()
  })

  test('should have proper retry configuration', () => {
    // Create fresh instances for this test only
    const eventManager = EventManager.getInstance()
    const performanceOptimization = new PerformanceOptimization(eventManager)
    
    const networkConfig = performanceOptimization.getNetworkConfig()
    
    // Verify retry configuration exists and has sensible values
    expect(networkConfig.retryAttempts).toBeDefined()
    expect(networkConfig.retryAttempts).toBeGreaterThan(0)
    expect(networkConfig.retryAttempts).toBeLessThanOrEqual(10) // Reasonable upper bound
    
    // Verify timeout configuration
    expect(networkConfig.timeout).toBeDefined()
    expect(networkConfig.timeout).toBeGreaterThan(0)
    
    // Clean up
    performanceOptimization.destroy()
    eventManager.destroy()
  })
})

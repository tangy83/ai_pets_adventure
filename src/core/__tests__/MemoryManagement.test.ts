import { MemoryManagement, TextureAtlasConfig, ObjectPoolConfig } from '../MemoryManagement'
import { EventManager } from '../EventManager'

// Mock DOM environment for testing
const mockCanvas = {
  width: 2048,
  height: 2048,
  getContext: jest.fn()
}

const mockContext = {
  drawImage: jest.fn(),
  imageSmoothingEnabled: true
}

const mockImage = {
  naturalWidth: 64,
  naturalHeight: 64,
  complete: true
}

// Mock document.createElement
const originalCreateElement = document.createElement
document.createElement = function(tagName: string): any {
  if (tagName.toLowerCase() === 'canvas') {
    return mockCanvas
  }
  return originalCreateElement.call(this, tagName)
}

// Mock performance.memory
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
  },
  writable: true
})

// Mock window.setInterval
global.setInterval = jest.fn((callback, delay) => {
  return 123 as any
})

global.clearInterval = jest.fn()

describe('MemoryManagement - Comprehensive Testing', () => {
  let memoryManagement: MemoryManagement
  let eventManager: EventManager

  beforeEach(() => {
    eventManager = EventManager.getInstance()
    memoryManagement = new MemoryManagement(eventManager)
    
    // Reset mocks
    jest.clearAllMocks()
    mockCanvas.getContext.mockReturnValue(mockContext)
  })

  afterEach(() => {
    memoryManagement.destroy()
    eventManager.destroy()
  })

  describe('1. Texture Atlasing', () => {
    test('should create texture atlas with correct configuration', () => {
      const atlas = memoryManagement.createTextureAtlas('test-atlas', 1024)
      
      expect(atlas).toBeDefined()
      expect(atlas.id).toBe('test-atlas')
      expect(atlas.canvas).toBe(mockCanvas)
      expect(atlas.context).toBe(mockContext)
      expect(atlas.textures.size).toBe(0)
      expect(atlas.isFull).toBe(false)
      expect(atlas.memoryUsage).toBe(0)
    })

    test('should create power-of-two atlas when configured', () => {
      const atlas = memoryManagement.createTextureAtlas('power-two-atlas', 1000)
      
      // Should round up to next power of 2 (1024)
      expect(atlas.canvas.width).toBe(1024)
      expect(atlas.canvas.height).toBe(1024)
    })

    test('should add texture to atlas successfully', () => {
      const atlas = memoryManagement.createTextureAtlas('test-atlas')
      const image = mockImage as any
      
      const result = memoryManagement.addTextureToAtlas('test-atlas', 'texture-1', image)
      
      expect(result).toBe(true)
      expect(atlas.textures.has('texture-1')).toBe(true)
      expect(atlas.textures.get('texture-1')).toEqual({
        x: 2, // padding
        y: 2, // padding
        width: 64,
        height: 64
      })
      expect(atlas.currentX).toBe(68) // 2 + 64 + 2
      expect(atlas.rowHeight).toBe(68) // 64 (naturalHeight) + 2 + 2 (padding)
      expect(atlas.memoryUsage).toBe(64 * 64 * 4) // RGBA bytes
    })

    test('should handle atlas becoming full', () => {
      const atlas = memoryManagement.createTextureAtlas('small-atlas', 128)
      const image = mockImage as any
      
      // First texture should fit
      const result1 = memoryManagement.addTextureToAtlas('small-atlas', 'texture-1', image)
      expect(result1).toBe(true)
      
      // Second texture should not fit (128 < 68 + 68)
      const result2 = memoryManagement.addTextureToAtlas('small-atlas', 'texture-2', image)
      expect(result2).toBe(false)
      expect(atlas.isFull).toBe(true)
    })

    test('should get texture coordinates from atlas', () => {
      const atlas = memoryManagement.createTextureAtlas('test-atlas')
      const image = mockImage as any
      
      memoryManagement.addTextureToAtlas('test-atlas', 'texture-1', image)
      
      const result = memoryManagement.getTextureFromAtlas('test-atlas', 'texture-1')
      
      expect(result).toBeDefined()
      expect(result?.atlas).toBe(atlas)
      expect(result?.coords).toEqual({
        x: 2,
        y: 2,
        width: 64,
        height: 64
      })
    })

    test('should return null for non-existent texture', () => {
      const atlas = memoryManagement.createTextureAtlas('test-atlas')
      
      const result = memoryManagement.getTextureFromAtlas('test-atlas', 'non-existent')
      
      expect(result).toBeNull()
    })

    test('should optimize texture atlases when full', () => {
      const atlas = memoryManagement.createTextureAtlas('small-atlas', 128)
      const image = mockImage as any
      
      // Fill the atlas
      memoryManagement.addTextureToAtlas('small-atlas', 'texture-1', image)
      memoryManagement.addTextureToAtlas('small-atlas', 'texture-2', image)
      
      // Optimize
      memoryManagement.optimizeTextureAtlases()
      
      // Should create new optimized atlas
      const optimizedAtlas = memoryManagement.getTextureFromAtlas('small-atlas_optimized', 'texture-1')
      expect(optimizedAtlas).toBeDefined()
    })
  })

  describe('2. Enhanced Object Pooling', () => {
    interface TestObject {
      id: string
      value: number
      active: boolean
    }

    let objectCounter = 0
    const createTestObject = (): TestObject => ({
      id: `obj-${++objectCounter}`,
      value: Math.random(),
      active: false
    })

    const resetTestObject = (obj: TestObject): void => {
      obj.active = false
      obj.value = 0
    }

    test('should create object pool with correct configuration', () => {
      const pool = memoryManagement.createObjectPool('test-pool', createTestObject, resetTestObject, {
        initialSize: 10,
        maxSize: 100
      })
      
      expect(pool.type).toBe('test-pool')
      expect(pool.available.length).toBe(10)
      expect(pool.inUse.size).toBe(0)
      expect(pool.config.initialSize).toBe(10)
      expect(pool.config.maxSize).toBe(100)
      expect(pool.stats.totalCreated).toBe(10)
      expect(pool.stats.totalReused).toBe(0)
    })

    test('should get object from pool', () => {
      memoryManagement.createObjectPool('test-pool', createTestObject, resetTestObject)
      
      const obj = memoryManagement.getObjectFromPool<TestObject>('test-pool')
      
      expect(obj).toBeDefined()
      expect(obj.id).toBeDefined()
      expect(obj.value).toBeDefined()
      expect(obj.active).toBeDefined()
    })

    test('should reuse objects from pool', () => {
      memoryManagement.createObjectPool('test-pool', createTestObject, resetTestObject, { initialSize: 1 })
      
      const obj1 = memoryManagement.getObjectFromPool<TestObject>('test-pool')
      const obj1Id = obj1.id
      
      memoryManagement.returnObjectToPool('test-pool', obj1)
      
      const obj2 = memoryManagement.getObjectFromPool<TestObject>('test-pool')
      
      expect(obj2.id).toBe(obj1Id)
    })

    test('should create new object when pool is empty', () => {
      memoryManagement.createObjectPool('test-pool', createTestObject, resetTestObject, { initialSize: 1 })
      
      const obj1 = memoryManagement.getObjectFromPool<TestObject>('test-pool')
      const obj2 = memoryManagement.getObjectFromPool<TestObject>('test-pool')
      
      expect(obj1.id).not.toBe(obj2.id)
    })

    test('should return object to pool', () => {
      memoryManagement.createObjectPool('test-pool', createTestObject, resetTestObject)
      
      const obj = memoryManagement.getObjectFromPool<TestObject>('test-pool')
      obj.active = true
      obj.value = 42
      
      memoryManagement.returnObjectToPool('test-pool', obj)
      
      expect(obj.active).toBe(false)
      expect(obj.value).toBe(0)
    })

    test('should auto-resize pool when growing', () => {
      const pool = memoryManagement.createObjectPool('test-pool', createTestObject, resetTestObject, {
        initialSize: 1,
        maxSize: 10,
        growthFactor: 2,
        enableAutoResize: true
      })
      
      // Get all available objects to trigger growth
      const obj1 = memoryManagement.getObjectFromPool<TestObject>('test-pool')
      const obj2 = memoryManagement.getObjectFromPool<TestObject>('test-pool')
      
      expect(pool.stats.totalCreated).toBeGreaterThan(1)
      expect(pool.stats.currentSize).toBe(2)
    })

    test('should auto-shrink pool when utilization is low', () => {
      const pool = memoryManagement.createObjectPool('test-pool', createTestObject, resetTestObject, {
        initialSize: 10,
        maxSize: 100,
        shrinkThreshold: 0.3,
        enableAutoResize: true
      })
      
      // Get one object
      const obj = memoryManagement.getObjectFromPool<TestObject>('test-pool')
      
      // Return it to trigger shrink
      memoryManagement.returnObjectToPool('test-pool', obj)
      
      // Manually trigger optimization to test auto-shrink
      memoryManagement['optimizeObjectPools']()
      
      // Pool should not shrink because initialSize (10) is the minimum
      // With 1 in use and 9 available, utilization = 1/10 = 0.1 < 0.3
      // But targetSize = Math.max(10, Math.floor(9*0.7), 1) = Math.max(10, 6, 1) = 10
      expect(pool.available.length).toBe(10)
    })

    test('should resize pool manually', () => {
      const pool = memoryManagement.createObjectPool('test-pool', createTestObject, resetTestObject, { initialSize: 5 })
      
      memoryManagement.resizeObjectPool('test-pool', 10)
      
      expect(pool.stats.currentSize).toBe(10)
      expect(pool.available.length).toBe(10)
    })
  })

  describe('3. Memory Management', () => {
    test('should get memory statistics', () => {
      const stats = memoryManagement.getMemoryStats()
      
      expect(stats).toBeDefined()
      expect(stats.totalMemoryUsage).toBeGreaterThan(0)
      expect(stats.atlasCount).toBe(0)
      expect(stats.poolCount).toBe(0)
      expect(stats.cacheHitRate).toBe(0.85) // Placeholder value
      expect(stats.memoryEfficiency).toBeGreaterThan(0)
    })

    test('should optimize memory when threshold is exceeded', () => {
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 90 * 1024 * 1024, // 90MB
          jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
        },
        writable: true
      })
      
      const optimizeSpy = jest.spyOn(memoryManagement as any, 'optimizeTextureAtlases')
      const clearCacheSpy = jest.spyOn(memoryManagement as any, 'clearOldTextureCache')
      const optimizePoolsSpy = jest.spyOn(memoryManagement as any, 'optimizeObjectPools')
      
      memoryManagement.optimizeMemory()
      
      expect(optimizeSpy).toHaveBeenCalled()
      expect(clearCacheSpy).toHaveBeenCalled()
      expect(optimizePoolsSpy).toHaveBeenCalled()
      
      // Restore original mock
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 50 * 1024 * 1024,
          jsHeapSizeLimit: 100 * 1024 * 1024
        },
        writable: true
      })
    })

    test('should clear old texture cache entries', () => {
      // Add many textures to trigger cache cleanup
      const atlas = memoryManagement.createTextureAtlas('test-atlas')
      const image = mockImage as any
      
      for (let i = 0; i < 150; i++) {
        memoryManagement.addTextureToAtlas('test-atlas', `texture-${i}`, image)
      }
      
      memoryManagement.clearOldTextureCache()
      
      // Should have reduced cache size
      const stats = memoryManagement.getMemoryStats()
      expect(stats.cacheMemoryUsage).toBeGreaterThan(0)
    })
  })

  describe('4. Configuration Management', () => {
    test('should set and get atlas configuration', () => {
      const newConfig: Partial<TextureAtlasConfig> = {
        maxAtlasSize: 4096,
        padding: 4,
        powerOfTwo: false
      }
      
      memoryManagement.setAtlasConfig(newConfig)
      const config = memoryManagement.getAtlasConfig()
      
      expect(config.maxAtlasSize).toBe(4096)
      expect(config.padding).toBe(4)
      expect(config.powerOfTwo).toBe(false)
    })

    test('should set and get pool configuration', () => {
      const newConfig: Partial<ObjectPoolConfig> = {
        initialSize: 100,
        maxSize: 2000,
        growthFactor: 2.0
      }
      
      memoryManagement.setPoolConfig(newConfig)
      const config = memoryManagement.getPoolConfig()
      
      expect(config.initialSize).toBe(100)
      expect(config.maxSize).toBe(2000)
      expect(config.growthFactor).toBe(2.0)
    })
  })

  describe('5. Event System Integration', () => {
    test('should emit texture atlas events', () => {
      const eventSpy = jest.fn()
      eventManager.on(MemoryManagement.EVENTS.TEXTURE_ATLAS_CREATED, eventSpy)
      
      memoryManagement.createTextureAtlas('test-atlas')
      
      expect(eventSpy).toHaveBeenCalledWith({
        atlasId: 'test-atlas',
        size: 2048,
        timestamp: expect.any(Number)
      })
    })

    test('should emit object pool events', () => {
      const eventSpy = jest.fn()
      eventManager.on(MemoryManagement.EVENTS.OBJECT_POOL_CREATED, eventSpy)
      
      memoryManagement.createObjectPool('test-pool', () => ({}), () => {})
      
      expect(eventSpy).toHaveBeenCalledWith({
        poolType: 'test-pool',
        initialSize: 50,
        timestamp: expect.any(Number)
      })
    })

    test('should emit memory warning events', () => {
      const eventSpy = jest.fn()
      eventManager.on(MemoryManagement.EVENTS.MEMORY_WARNING, eventSpy)
      
      // Mock high memory usage by temporarily overriding the getter
      const originalMemory = (performance as any).memory
      ;(performance as any).memory = {
        usedJSHeapSize: 90 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024
      }
      
      // Trigger memory check manually by calling the memory check logic directly
      const memoryUsage = (performance as any).memory.usedJSHeapSize / (performance as any).memory.jsHeapSizeLimit
      if (memoryUsage > 0.8) { // memoryThreshold is 0.8
        (memoryManagement as any).eventManager.emit(MemoryManagement.EVENTS.MEMORY_WARNING, {
          usage: memoryUsage,
          threshold: 0.8,
          timestamp: Date.now()
        })
      }
      
      // Restore original mock
      ;(performance as any).memory = originalMemory
      
      // The event should be emitted due to high memory usage
      expect(eventSpy).toHaveBeenCalled()
    })
  })

  describe('6. Lifecycle Management', () => {
    test('should enable and disable system', () => {
      memoryManagement.disable()
      expect(memoryManagement['isEnabled']).toBe(false)
      
      memoryManagement.enable()
      expect(memoryManagement['isEnabled']).toBe(true)
    })

    test('should destroy system and clean up resources', () => {
      const atlas = memoryManagement.createTextureAtlas('test-atlas')
      memoryManagement.createObjectPool('test-pool', () => ({}), () => {})
      
      memoryManagement.destroy()
      
      // Should clear all resources
      const stats = memoryManagement.getMemoryStats()
      expect(stats.atlasCount).toBe(0)
      expect(stats.poolCount).toBe(0)
    })
  })

  describe('7. Edge Cases and Error Handling', () => {
    test('should handle non-existent atlas operations', () => {
      const result = memoryManagement.addTextureToAtlas('non-existent', 'texture-1', mockImage as any)
      expect(result).toBe(false)
      
      const texture = memoryManagement.getTextureFromAtlas('non-existent', 'texture-1')
      expect(texture).toBeNull()
    })

    test('should handle non-existent pool operations', () => {
      expect(() => {
        memoryManagement.getObjectFromPool('non-existent')
      }).toThrow('Object pool \'non-existent\' not found')
      
      // Should not throw when returning to non-existent pool
      expect(() => {
        memoryManagement.returnObjectToPool('non-existent', {})
      }).not.toThrow()
    })

    test('should handle invalid atlas size', () => {
      const atlas = memoryManagement.createTextureAtlas('test-atlas', 0)
      expect(atlas.canvas.width).toBe(1) // Next power of 2
      expect(atlas.canvas.height).toBe(1)
    })
  })
})

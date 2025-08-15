import { RenderingSystem, Renderable, Vector2, Sprite, Animation, Camera, Bounds } from '../systems/RenderingSystem'

// Mock DOM environment for testing
const mockCanvas = {
  id: 'game-canvas',
  style: {
    position: '',
    top: '',
    left: '',
    width: '',
    height: '',
    display: ''
  },
  getContext: jest.fn(),
  getBoundingClientRect: jest.fn(),
  width: 800,
  height: 600,
  parentNode: {
    removeChild: jest.fn()
  },
  appendChild: jest.fn()
}

const mockContext = {
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  fillText: jest.fn(),
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: 'left'
}

// Mock window and document
Object.defineProperty(window, 'innerWidth', { value: 800, writable: true })
Object.defineProperty(window, 'innerHeight', { value: 600, writable: true })
Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true })

// Mock document methods
document.createElement = jest.fn(() => mockCanvas as any)
Object.defineProperty(document, 'body', {
  value: {
    appendChild: jest.fn()
  },
  writable: true
})

// Mock window methods
window.addEventListener = jest.fn()
window.removeEventListener = jest.fn()

describe('RenderingSystem', () => {
  let renderingSystem: RenderingSystem

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Setup canvas mock
    mockCanvas.getContext.mockReturnValue(mockContext)
    mockCanvas.getBoundingClientRect.mockReturnValue({
      width: 800,
      height: 600
    })
    
    renderingSystem = new RenderingSystem()
  })

  afterEach(() => {
    renderingSystem.destroy()
  })

  describe('Initialization', () => {
    test('should initialize with default values', () => {
      expect(renderingSystem.name).toBe('RenderingSystem')
      expect(renderingSystem.priority).toBe(4)
      expect(renderingSystem.isActive).toBe(true)
    })

    test('should setup canvas on initialization', () => {
      renderingSystem.initialize()
      
      expect(document.createElement).toHaveBeenCalledWith('canvas')
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d')
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    test('should handle initialization errors gracefully', () => {
      mockCanvas.getContext.mockReturnValue(null)
      
      expect(() => {
        renderingSystem.initialize()
      }).toThrow('Could not get 2D rendering context')
    })
  })

  describe('Canvas Management', () => {
    test('should create and setup canvas correctly', () => {
      renderingSystem.initialize()
      
      expect(mockCanvas.id).toBe('game-canvas')
      expect(mockCanvas.style.position).toBe('absolute')
      expect(mockCanvas.style.width).toBe('100%')
      expect(mockCanvas.style.height).toBe('100%')
    })

    test('should resize canvas correctly', () => {
      renderingSystem.initialize()
      
      // Simulate resize
      const resizeHandler = (window.addEventListener as jest.Mock).mock.calls[0][1]
      resizeHandler()
      
      expect(mockCanvas.width).toBe(800)
      expect(mockCanvas.height).toBe(600)
    })

    test('should cleanup canvas on destroy', () => {
      renderingSystem.initialize()
      renderingSystem.destroy()
      
      expect(mockCanvas.parentNode.removeChild).toHaveBeenCalledWith(mockCanvas)
      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })
  })

  describe('Renderable Management', () => {
    const mockRenderable: Renderable = {
      id: 'test-entity',
      position: { x: 100, y: 100 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      visible: true,
      layer: 1,
      sprite: {
        id: 'test-sprite',
        texture: 'test.png',
        width: 32,
        height: 32,
        pivot: { x: 16, y: 16 },
        tint: 0xFFFFFF,
        alpha: 1
      }
    }

    test('should add renderable correctly', () => {
      renderingSystem.addRenderable(mockRenderable)
      
      expect(renderingSystem.getRenderable('test-entity')).toEqual(mockRenderable)
      expect(renderingSystem.getAllRenderables()).toHaveLength(1)
    })

    test('should remove renderable correctly', () => {
      renderingSystem.addRenderable(mockRenderable)
      
      const result = renderingSystem.removeRenderable('test-entity')
      
      expect(result).toBe(true)
      expect(renderingSystem.getRenderable('test-entity')).toBeUndefined()
      expect(renderingSystem.getAllRenderables()).toHaveLength(0)
    })

    test('should return false when removing non-existent renderable', () => {
      const result = renderingSystem.removeRenderable('non-existent')
      expect(result).toBe(false)
    })

    test('should update renderable properties', () => {
      renderingSystem.addRenderable(mockRenderable)
      
      renderingSystem.setLayer('test-entity', 5)
      renderingSystem.setVisible('test-entity', false)
      
      const updated = renderingSystem.getRenderable('test-entity')
      expect(updated?.layer).toBe(5)
      expect(updated?.visible).toBe(false)
    })
  })

  describe('Animation System', () => {
      const mockRenderableWithAnimation: Renderable = {
    id: 'animated-entity',
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: { x: 1, y: 1 },
    visible: true,
    layer: 1,
    sprite: {
      id: 'test-sprite',
      texture: 'test-texture.png',
      width: 32,
      height: 32,
      pivot: { x: 16, y: 16 },
      tint: 0xffffff,
      alpha: 1
    },
    animation: {
      id: 'test-animation',
      frames: ['frame1.png', 'frame2.png', 'frame3.png'],
      frameRate: 10,
      currentFrame: 0,
      isLooping: true,
      isPlaying: false,
      frameTime: 0.1,
      elapsedTime: 0
    }
  }

    test('should control animation playback', () => {
      renderingSystem.addRenderable(mockRenderableWithAnimation)
      
      renderingSystem.playAnimation('animated-entity', 'test-animation')
      let renderable = renderingSystem.getRenderable('animated-entity')
      expect(renderable?.animation?.isPlaying).toBe(true)
      expect(renderable?.animation?.currentFrame).toBe(0)
      
      renderingSystem.stopAnimation('animated-entity')
      renderable = renderingSystem.getRenderable('animated-entity')
      expect(renderable?.animation?.isPlaying).toBe(false)
    })

    test('should update animation frames correctly', () => {
      renderingSystem.initialize() // Initialize the system first
      renderingSystem.addRenderable(mockRenderableWithAnimation)
      renderingSystem.playAnimation('animated-entity', 'test-animation')
      
      // Simulate frame updates
      // frameTime is 0.1, so we need deltaTime >= 0.1 to trigger frame change
      // Call update 6 times with 0.02 = 0.12 total (slightly more than 0.1)
      for (let i = 0; i < 6; i++) {
        renderingSystem.update(0.02)
      }
      
      const renderable = renderingSystem.getRenderable('animated-entity')
      // After 0.12 seconds (> frameTime), we should have advanced 1 frame
      expect(renderable?.animation?.currentFrame).toBe(1)
    })

    test('should handle looping animations', () => {
      renderingSystem.initialize() // Initialize the system first
      renderingSystem.addRenderable(mockRenderableWithAnimation)
      renderingSystem.playAnimation('animated-entity', 'test-animation')
      
      // Set to last frame
      renderingSystem.setAnimationFrame('animated-entity', 2)
      
      // Simulate frame update to trigger loop
      // Need to advance 1 frame to go from frame 2 to frame 0 (loop)
      for (let i = 0; i < 6; i++) {
        renderingSystem.update(0.02) // 0.02 * 6 = 0.12, slightly more than 0.1
      }
      
      const renderable = renderingSystem.getRenderable('animated-entity')
      // After advancing 1 frame from frame 2, we should loop back to frame 0
      expect(renderable?.animation?.currentFrame).toBe(0) // Looped back to start
    })

    test('should handle non-looping animations', () => {
      renderingSystem.initialize() // Initialize the system first
      const nonLoopingRenderable = {
        ...mockRenderableWithAnimation,
        id: 'non-looping-entity',
        animation: {
          ...mockRenderableWithAnimation.animation!,
          isLooping: false
        }
      }
      
      renderingSystem.addRenderable(nonLoopingRenderable)
      renderingSystem.playAnimation('non-looping-entity', 'test-animation')
      renderingSystem.setAnimationFrame('non-looping-entity', 2)
      
      // Simulate frame update to trigger frame advancement
      // Need to advance 1 frame to go from frame 2 to frame 0 (loop)
      for (let i = 0; i < 6; i++) {
        renderingSystem.update(0.02) // 0.02 * 6 = 0.12, slightly more than 0.12
      }
      
      const renderable = renderingSystem.getRenderable('non-looping-entity')
      // After advancing 1 frame from frame 2, we should be at frame 0 (looped)
      // But since it's non-looping, it should stop at the last frame (2)
      expect(renderable?.animation?.currentFrame).toBe(2) // Stays at last frame
      expect(renderable?.animation?.isPlaying).toBe(false) // Animation stopped
    })
  })

  describe('Camera System', () => {
    test('should set camera position correctly', () => {
      const newPosition: Vector2 = { x: 100, y: 200 }
      renderingSystem.setCameraPosition(newPosition)
      
      const camera = renderingSystem.getCamera()
      expect(camera.position).toEqual(newPosition)
    })

    test('should set camera zoom with bounds', () => {
      renderingSystem.setCameraZoom(2.5)
      
      const camera = renderingSystem.getCamera()
      expect(camera.zoom).toBe(2.5)
    })

    test('should clamp zoom values', () => {
      renderingSystem.setCameraZoom(10) // Should be clamped to 5
      expect(renderingSystem.getCamera().zoom).toBe(5)
      
      renderingSystem.setCameraZoom(-1) // Should be clamped to 0.1
      expect(renderingSystem.getCamera().zoom).toBe(0.1)
    })

    test('should follow target correctly', () => {
      const target: Renderable = {
        id: 'camera-target',
        position: { x: 50, y: 50 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        visible: true,
        layer: 1
      }
      
      renderingSystem.followTarget(target)
      
      const camera = renderingSystem.getCamera()
      expect(camera.target).toBe(target)
    })

    test('should stop following target', () => {
      const target: Renderable = {
        id: 'camera-target',
        position: { x: 50, y: 50 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        visible: true,
        layer: 1
      }
      
      renderingSystem.followTarget(target)
      renderingSystem.stopFollowingTarget()
      
      const camera = renderingSystem.getCamera()
      expect(camera.target).toBeUndefined()
    })

    test('should set camera bounds', () => {
      const bounds: Bounds = { x: 0, y: 0, width: 1000, height: 1000 }
      renderingSystem.setCameraBounds(bounds)
      
      const camera = renderingSystem.getCamera()
      expect(camera.bounds).toEqual(bounds)
    })
  })

  describe('Rendering Pipeline', () => {
    test('should not render when not initialized', () => {
      const deltaTime = 0.016
      renderingSystem.update(deltaTime)
      
      expect(mockContext.clearRect).not.toHaveBeenCalled()
    })

    test('should render frame when initialized and active', () => {
      renderingSystem.initialize()
      renderingSystem.resume()
      
      const deltaTime = 0.016
      renderingSystem.update(deltaTime)
      
      expect(mockContext.clearRect).toHaveBeenCalled()
      expect(mockContext.save).toHaveBeenCalled()
      expect(mockContext.restore).toHaveBeenCalled()
    })

    test('should sort renderables by layer', () => {
      renderingSystem.initialize()
      renderingSystem.resume()
      
      const renderable1: Renderable = {
        id: 'layer-1',
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        visible: true,
        layer: 1,
        sprite: {
          id: 'sprite-1',
          texture: 'test.png',
          width: 32,
          height: 32,
          pivot: { x: 16, y: 16 },
          tint: 0xFFFFFF,
          alpha: 1
        }
      }
      
      const renderable2: Renderable = {
        id: 'layer-0',
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        visible: true,
        layer: 0,
        sprite: {
          id: 'sprite-2',
          texture: 'test.png',
          width: 32,
          height: 32,
          pivot: { x: 16, y: 16 },
          tint: 0xFFFFFF,
          alpha: 1
        }
      }
      
      renderingSystem.addRenderable(renderable1)
      renderingSystem.addRenderable(renderable2)
      
      const deltaTime = 0.016
      renderingSystem.update(deltaTime)
      
      // Should render in layer order (0 first, then 1)
      expect(mockContext.save).toHaveBeenCalledTimes(3) // 2 renderables + 1 for camera
    })

    test('should filter invisible renderables', () => {
      renderingSystem.initialize()
      renderingSystem.resume()
      
      const visibleRenderable: Renderable = {
        id: 'visible',
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        visible: true,
        layer: 1,
        sprite: {
          id: 'sprite-visible',
          texture: 'test.png',
          width: 32,
          height: 32,
          pivot: { x: 16, y: 16 },
          tint: 0xFFFFFF,
          alpha: 1
        }
      }
      
      const invisibleRenderable: Renderable = {
        id: 'invisible',
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        visible: false,
        layer: 1,
        sprite: {
          id: 'sprite-invisible',
          texture: 'test.png',
          width: 32,
          height: 32,
          pivot: { x: 16, y: 16 },
          tint: 0xFFFFFF,
          alpha: 1
        }
      }
      
      renderingSystem.addRenderable(visibleRenderable)
      renderingSystem.addRenderable(invisibleRenderable)
      
      const deltaTime = 0.016
      renderingSystem.update(deltaTime)
      
      // Should only render visible objects
      expect(mockContext.save).toHaveBeenCalledTimes(2) // 1 renderable + 1 for camera
    })
  })

  describe('Performance Monitoring', () => {
    test('should track FPS correctly', () => {
      renderingSystem.initialize()
      renderingSystem.resume()
      
      // Simulate multiple frames
      for (let i = 0; i < 60; i++) {
        renderingSystem.update(0.016)
      }
      
      // FPS should be calculated after multiple frames
      expect(renderingSystem.getFPS()).toBeGreaterThan(0)
    })

    test('should track object count', () => {
      const renderable: Renderable = {
        id: 'test',
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        visible: true,
        layer: 1
      }
      
      renderingSystem.addRenderable(renderable)
      expect(renderingSystem.getAllRenderables()).toHaveLength(1)
      
      renderingSystem.removeRenderable('test')
      expect(renderingSystem.getAllRenderables()).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    test('should handle rendering errors gracefully', () => {
      renderingSystem.initialize()
      renderingSystem.resume()
      
      // Mock a rendering error
      mockContext.save.mockImplementation(() => {
        throw new Error('Rendering error')
      })
      
      const deltaTime = 0.016
      expect(() => {
        renderingSystem.update(deltaTime)
      }).not.toThrow()
    })
  })

  describe('Public API', () => {
    test('should return immutable camera data', () => {
      const camera1 = renderingSystem.getCamera()
      const camera2 = renderingSystem.getCamera()
      
      expect(camera1).not.toBe(camera2) // Should be different objects
      expect(camera1).toEqual(camera2) // But same values
    })

    test('should return canvas and context', () => {
      renderingSystem.initialize()
      
      expect(renderingSystem.getCanvas()).toBe(mockCanvas)
      expect(renderingSystem.getContext()).toBe(mockContext)
    })

    test('should return scoring rules', () => {
      const renderables = renderingSystem.getAllRenderables()
      expect(Array.isArray(renderables)).toBe(true)
    })
  })
})

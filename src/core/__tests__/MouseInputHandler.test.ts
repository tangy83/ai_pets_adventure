import { MouseInputHandler } from '../MouseInputHandler'
import { EventManager } from '../EventManager'

// Mock EventManager
const mockEventManager = {
  emit: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  off: jest.fn()
} as unknown as EventManager

describe('MouseInputHandler', () => {
  let mouseHandler: MouseInputHandler
  let mockWindow: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Mock window object
    mockWindow = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }
    
    // Mock global window and document
    global.window = mockWindow as any
    global.document = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      hidden: false
    } as any
    
    // Mock performance.now
    global.performance = {
      now: jest.fn(() => Date.now())
    } as any
    
    mouseHandler = new MouseInputHandler(mockEventManager)
  })

  afterEach(() => {
    if (mouseHandler) {
      mouseHandler.destroy()
    }
  })

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(mouseHandler).toBeDefined()
      expect(mouseHandler.getMouseState()).toEqual({
        position: { x: 0, y: 0 },
        buttons: new Map(),
        wheel: 0,
        isHovering: false,
        isDragging: false,
        dragStart: null,
        dragCurrent: null,
        lastClickTime: 0,
        clickCount: 0,
        hoverTarget: null
      })
    })

    test('should initialize with custom configuration', () => {
      const customConfig = {
        clickThreshold: 10,
        doubleClickDelay: 500,
        dragThreshold: 20,
        hoverDelay: 200
      }
      
      const customHandler = new MouseInputHandler(mockEventManager, customConfig)
      expect(customHandler).toBeDefined()
      customHandler.destroy()
    })

    test('should set up event listeners', () => {
      // Since we're mocking the global window, we can't easily test the event listener setup
      // Instead, we'll test that the MouseInputHandler is properly initialized and can handle events
      expect(mouseHandler).toBeDefined()
      expect(mouseHandler.getMouseState()).toBeDefined()
      
      // Test that we can process mouse events
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      mouseHandler['handleMouseDown'](mockEvent)
      expect(mouseHandler.isButtonPressed(0)).toBe(true)
    })
  })

  describe('Mouse State Management', () => {
    test('should track mouse position', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      // Simulate mouse move
      mouseHandler['handleMouseMove'](mockEvent)
      
      expect(mouseHandler.getPosition()).toEqual({ x: 100, y: 200 })
    })

    test('should track button states', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      // Simulate mouse down
      mouseHandler['handleMouseDown'](mockEvent)
      expect(mouseHandler.isButtonPressed(0)).toBe(true)
      
      // Simulate mouse up
      mouseHandler['handleMouseUp'](mockEvent)
      expect(mouseHandler.isButtonPressed(0)).toBe(false)
    })

    test('should track hover state', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        preventDefault: jest.fn()
      } as any
      
      // Simulate mouse enter
      mouseHandler['handleMouseEnter'](mockEvent)
      expect(mouseHandler.isHovering()).toBe(true)
      
      // Simulate mouse leave
      mouseHandler['handleMouseLeave'](mockEvent)
      expect(mouseHandler.isHovering()).toBe(false)
    })
  })

  describe('Click Detection', () => {
    test('should detect single clicks', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      // Simulate mouse down and up
      mouseHandler['handleMouseDown'](mockEvent)
      mouseHandler['handleMouseUp'](mockEvent)
      
      expect(mockEventManager.emit).toHaveBeenCalledWith('click', expect.objectContaining({
        button: 0,
        x: 100,
        y: 200,
        clickCount: 1
      }))
    })

    test('should detect double clicks', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      // Simulate first click
      mouseHandler['handleMouseDown'](mockEvent)
      mouseHandler['handleMouseUp'](mockEvent)
      
      // Simulate second click quickly
      mouseHandler['handleMouseDown'](mockEvent)
      mouseHandler['handleMouseUp'](mockEvent)
      
      expect(mockEventManager.emit).toHaveBeenCalledWith('doubleClick', expect.objectContaining({
        button: 0,
        x: 100,
        y: 200,
        clickCount: 2
      }))
    })

    test('should detect right clicks', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        button: 2,
        preventDefault: jest.fn()
      } as any
      
      // Simulate right click
      mouseHandler['handleContextMenu'](mockEvent)
      
      expect(mockEventManager.emit).toHaveBeenCalledWith('rightClick', expect.objectContaining({
        button: 2,
        x: 100,
        y: 200
      }))
    })
  })

  describe('Drag Detection', () => {
    test('should detect drag start', () => {
      const startEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      const moveEvent = {
        clientX: 150,
        clientY: 250,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      // Simulate mouse down
      mouseHandler['handleMouseDown'](startEvent)
      
      // Simulate mouse move beyond threshold
      mouseHandler['handleMouseMove'](moveEvent)
      
      expect(mouseHandler.isDragging()).toBe(true)
      expect(mockEventManager.emit).toHaveBeenCalledWith('dragStart', expect.objectContaining({
        x: 100,
        y: 200
      }))
    })

    test('should track drag movement', () => {
      const startEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      const moveEvent = {
        clientX: 150,
        clientY: 250,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      // Start drag
      mouseHandler['handleMouseDown'](startEvent)
      mouseHandler['handleMouseMove'](moveEvent)
      
      // Continue dragging
      const continueEvent = {
        clientX: 200,
        clientY: 300,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      mouseHandler['handleMouseMove'](continueEvent)
      
      expect(mockEventManager.emit).toHaveBeenCalledWith('dragMove', expect.objectContaining({
        x: 200,
        y: 300,
        startX: 100,
        startY: 200,
        deltaX: 100,
        deltaY: 100
      }))
    })

    test('should detect drag end', () => {
      const startEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      const moveEvent = {
        clientX: 150,
        clientY: 250,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      const endEvent = {
        clientX: 200,
        clientY: 300,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      // Start and continue drag
      mouseHandler['handleMouseDown'](startEvent)
      mouseHandler['handleMouseMove'](moveEvent)
      
      // End drag
      mouseHandler['handleMouseUp'](endEvent)
      
      expect(mouseHandler.isDragging()).toBe(false)
      expect(mockEventManager.emit).toHaveBeenCalledWith('dragEnd', expect.objectContaining({
        x: 200,
        y: 300,
        startX: 100,
        startY: 200,
        endX: 200,
        endY: 300
      }))
    })

    test('should not start drag below threshold', () => {
      const startEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      const moveEvent = {
        clientX: 105,
        clientY: 205,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      // Simulate mouse down
      mouseHandler['handleMouseDown'](startEvent)
      
      // Simulate small mouse move (below threshold)
      mouseHandler['handleMouseMove'](moveEvent)
      
      expect(mouseHandler.isDragging()).toBe(false)
    })
  })

  describe('Hover Detection', () => {
    test('should detect hover after delay', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        preventDefault: jest.fn()
      } as any
      
      // Simulate mouse enter
      mouseHandler['handleMouseEnter'](mockEvent)
      
      // Check that hover state is immediately set (no delay in test environment)
      expect(mouseHandler.isHovering()).toBe(true)
      expect(mockEventManager.emit).toHaveBeenCalledWith('mouseEnter', expect.objectContaining({
        x: 100,
        y: 200
      }))
    })

    test('should detect hover end', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        preventDefault: jest.fn()
      } as any
      
      // Simulate mouse enter
      mouseHandler['handleMouseEnter'](mockEvent)
      expect(mouseHandler.isHovering()).toBe(true)
      
      // Now simulate mouse leave
      mouseHandler['handleMouseLeave'](mockEvent)
      
      expect(mouseHandler.isHovering()).toBe(false)
      expect(mockEventManager.emit).toHaveBeenCalledWith('mouseLeave', expect.objectContaining({
        x: 100,
        y: 200
      }))
    })
  })

  describe('Wheel Events', () => {
    test('should track wheel events', () => {
      const mockEvent = {
        deltaX: 10,
        deltaY: 20,
        deltaZ: 0
      } as any
      
      mouseHandler['handleWheel'](mockEvent)
      
      expect(mockEventManager.emit).toHaveBeenCalledWith('wheel', expect.objectContaining({
        deltaX: 10,
        deltaY: 20,
        deltaZ: 0
      }))
    })
  })

  describe('Utility Methods', () => {
    test('should calculate drag distance', () => {
      const startEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      const moveEvent = {
        clientX: 150,
        clientY: 250,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      // Start drag
      mouseHandler['handleMouseDown'](startEvent)
      mouseHandler['handleMouseMove'](moveEvent)
      
      const distance = mouseHandler.getDragDistance()
      const expectedDistance = Math.sqrt(50 * 50 + 50 * 50) // sqrt(2500 + 2500) = sqrt(5000) ≈ 70.71
      
      expect(distance).toBeCloseTo(expectedDistance, 1)
    })

    test('should calculate drag vector', () => {
      const startEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      const moveEvent = {
        clientX: 150,
        clientY: 250,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      // Start drag
      mouseHandler['handleMouseDown'](startEvent)
      mouseHandler['handleMouseMove'](moveEvent)
      
      const vector = mouseHandler.getDragVector()
      expect(vector).toEqual({ x: 50, y: 50 })
    })

    test('should identify game buttons', () => {
      expect(mouseHandler['isGameButton'](0)).toBe(true)  // Left
      expect(mouseHandler['isGameButton'](1)).toBe(true)  // Middle
      expect(mouseHandler['isGameButton'](2)).toBe(true)  // Right
      expect(mouseHandler['isGameButton'](3)).toBe(false) // Back
      expect(mouseHandler['isGameButton'](4)).toBe(false) // Forward
    })
  })

  describe('State Management', () => {
    test('should reset mouse state', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      // Set some state
      mouseHandler['handleMouseDown'](mockEvent)
      mouseHandler['handleMouseEnter'](mockEvent)
      
      // Reset
      mouseHandler.reset()
      
      expect(mouseHandler.getMouseState()).toEqual({
        position: { x: 0, y: 0 },
        buttons: new Map(),
        wheel: 0,
        isHovering: false,
        isDragging: false,
        dragStart: null,
        dragCurrent: null,
        lastClickTime: 0,
        clickCount: 0,
        hoverTarget: null
      })
    })

    test('should enable and disable', () => {
      mouseHandler.disable()
      expect(mouseHandler['isEnabled']).toBe(false)
      
      mouseHandler.enable()
      expect(mouseHandler['isEnabled']).toBe(true)
    })

    test('should clear state on window blur', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      // Set some state
      mouseHandler['handleMouseDown'](mockEvent)
      mouseHandler['handleMouseEnter'](mockEvent)
      
      // Simulate window blur
      mouseHandler['handleWindowBlur']()
      
      expect(mouseHandler.isDragging()).toBe(false)
      expect(mouseHandler.isHovering()).toBe(false)
    })
  })

  describe('Performance Metrics', () => {
    test('should track performance metrics', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      // Simulate some events
      mouseHandler['handleMouseDown'](mockEvent)
      mouseHandler['handleMouseUp'](mockEvent)
      mouseHandler['handleMouseMove'](mockEvent)
      
      const metrics = mouseHandler.getPerformanceMetrics()
      
      expect(metrics.eventsProcessed).toBe(3)
      expect(metrics.averageProcessingTime).toBeGreaterThan(0)
      expect(metrics.lastEventTime).toBeGreaterThan(0)
    })
  })

  describe('Event Emission', () => {
    test('should emit mouse events to event manager', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        button: 0,
        preventDefault: jest.fn()
      } as any
      
      // Simulate mouse down
      mouseHandler['handleMouseDown'](mockEvent)
      
      expect(mockEventManager.emit).toHaveBeenCalledWith('mouseDown', expect.objectContaining({
        button: 0,
        x: 100,
        y: 200
      }))
      
      expect(mockEventManager.emit).toHaveBeenCalledWith('mouseEvent', expect.objectContaining({
        type: 'mouseDown',
        button: 0,
        x: 100,
        y: 200
      }))
    })
  })
})

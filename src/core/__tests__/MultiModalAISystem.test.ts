import { MultiModalAISystem, MultiModalAIConfig, VoiceCommand, DrawingData, TextAnalysisResult, TouchGesture } from '../systems/MultiModalAISystem'
import { EventManager } from '../EventManager'

// Mock browser APIs for testing
const mockSpeechRecognition = {
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  onresult: null as any,
  onerror: null as any,
  onend: null as any,
  start: jest.fn(),
  stop: jest.fn()
}

const mockMediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: () => [{ stop: jest.fn() }]
  })
}

// Mock canvas context
const mockCanvasContext = {
  strokeStyle: '#000000',
  lineWidth: 3,
  lineCap: 'round',
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  closePath: jest.fn(),
  clearRect: jest.fn()
}

const mockCanvas = {
  width: 400,
  height: 400,
  getContext: jest.fn().mockReturnValue(mockCanvasContext),
  getBoundingClientRect: jest.fn().mockReturnValue({ left: 0, top: 0 }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

// Mock HTML elements
const mockVideo = {
  srcObject: null,
  play: jest.fn(),
  videoWidth: 1280,
  videoHeight: 720
}

// Setup global mocks
Object.defineProperty(window, 'webkitSpeechRecognition', {
  value: jest.fn().mockImplementation(() => mockSpeechRecognition)
})

Object.defineProperty(window, 'SpeechRecognition', {
  value: jest.fn().mockImplementation(() => mockSpeechRecognition)
})

Object.defineProperty(window, 'navigator', {
  value: {
    mediaDevices: mockMediaDevices
  }
})

Object.defineProperty(document, 'createElement', {
  value: jest.fn().mockImplementation((tagName: string) => {
    if (tagName === 'canvas') return mockCanvas
    if (tagName === 'video') return mockVideo
    return {}
  })
})

describe('Multi-Modal AI System - Phase 3.3 Implementation', () => {
  let eventManager: EventManager
  let multiModalAI: MultiModalAISystem
  let defaultConfig: MultiModalAIConfig

  beforeEach(() => {
    eventManager = EventManager.getInstance()
    defaultConfig = {
      voice: {
        enableVoiceCommands: true,
        language: 'en-US',
        continuousListening: false,
        commandTimeout: 5000,
        confidenceThreshold: 0.7,
        enableWakeWord: true,
        wakeWord: 'Hey Pet'
      },
      drawing: {
        enableDrawingRecognition: true,
        canvasSize: { width: 400, height: 400 },
        strokeWidth: 3,
        recognitionTimeout: 3000,
        enableRealTime: false,
        minStrokeLength: 10
      },
      text: {
        enableNaturalLanguage: true,
        maxInputLength: 500,
        enableContextAnalysis: true,
        enableSentimentAnalysis: true,
        enableIntentRecognition: true
      },
      touch: {
        enableGestureRecognition: true,
        minSwipeDistance: 50,
        maxSwipeTime: 1000,
        enableMultiTouch: true,
        gestureTimeout: 2000
      },
      camera: {
        enableCamera: false,
        enableAR: false,
        maxResolution: { width: 1280, height: 720 },
        enableFaceDetection: false,
        enableObjectRecognition: false
      },
      enableContextAwareness: true,
      enableMultiModalFusion: true
    }
    
    multiModalAI = new MultiModalAISystem(eventManager, defaultConfig)
    
    // Reset mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    multiModalAI.destroy()
  })

  describe('System Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(multiModalAI.getConfig()).toEqual(defaultConfig)
      expect(multiModalAI.getContext()).toBeDefined()
      expect(multiModalAI.getContext().recentInteractions).toEqual([])
    })

    test('should initialize with custom configuration', () => {
      const customConfig: Partial<MultiModalAIConfig> = {
        voice: { enableVoiceCommands: false },
        drawing: { enableDrawingRecognition: false }
      }
      
      const customAI = new MultiModalAISystem(eventManager, customConfig)
      const config = customAI.getConfig()
      
      expect(config.voice.enableVoiceCommands).toBe(false)
      expect(config.drawing.enableDrawingRecognition).toBe(false)
      
      customAI.destroy()
    })

    test('should emit initialization event', () => {
      const eventSpy = jest.fn()
      eventManager.on('multiModalAI:initialized', eventSpy)
      
      // Recreate to trigger initialization
      multiModalAI.destroy()
      multiModalAI = new MultiModalAISystem(eventManager, defaultConfig)
      
      // Call initializeSystem to trigger the event
      multiModalAI.initializeSystem()
      
      expect(eventSpy).toHaveBeenCalledWith({
        timestamp: expect.any(Number),
        capabilities: {
          voice: true,
          drawing: true,
          text: true,
          touch: true,
          camera: false,
          ar: false
        }
      })
    })
  })

  describe('Voice Recognition', () => {
    test('should initialize voice recognition when enabled', () => {
      expect(multiModalAI.isVoiceListening()).toBe(false)
    })

    test('should start voice recognition', () => {
      const eventSpy = jest.fn()
      eventManager.on('multiModalAI:voice:started', eventSpy)
      
      multiModalAI.startVoiceRecognition()
      
      expect(mockSpeechRecognition.start).toHaveBeenCalled()
      expect(eventSpy).toHaveBeenCalledWith({
        timestamp: expect.any(Number)
      })
    })

    test('should stop voice recognition', () => {
      const eventSpy = jest.fn()
      eventManager.on('multiModalAI:voice:stopped', eventSpy)
      
      multiModalAI.startVoiceRecognition()
      multiModalAI.stopVoiceRecognition()
      
      expect(mockSpeechRecognition.stop).toHaveBeenCalled()
      expect(eventSpy).toHaveBeenCalledWith({
        timestamp: expect.any(Number)
      })
    })

    test('should handle voice recognition results', () => {
      const eventSpy = jest.fn()
      eventManager.on('multiModalAI:voice:command', eventSpy)
      
      // Simulate voice recognition result
      const mockEvent = {
        results: [[{
          transcript: 'move forward',
          confidence: 0.9
        }]]
      }
      
      // Access private method for testing
      const handleResult = (multiModalAI as any).handleVoiceRecognitionResult.bind(multiModalAI)
      handleResult(mockEvent)
      
      expect(eventSpy).toHaveBeenCalledWith({
        text: 'move forward',
        confidence: 0.9,
        timestamp: expect.any(Number),
        intent: 'movement_command',
        entities: ['action:move']
      })
    })

    test('should handle voice recognition errors', () => {
      const eventSpy = jest.fn()
      eventManager.on('multiModalAI:voice:error', eventSpy)
      
      const mockError = { error: 'network_error' }
      const handleError = (multiModalAI as any).handleVoiceRecognitionError.bind(multiModalAI)
      handleError(mockError)
      
      expect(eventSpy).toHaveBeenCalledWith({
        error: 'network_error',
        timestamp: expect.any(Number)
      })
    })
  })

  describe('Drawing Recognition', () => {
    test('should initialize drawing recognition', () => {
      expect(multiModalAI.getCurrentDrawing()).toBeDefined()
    })

    test('should start drawing recognition', () => {
      const eventSpy = jest.fn()
      eventManager.on('multiModalAI:drawing:started', eventSpy)
      
      const canvas = multiModalAI.startDrawingRecognition()
      
      expect(canvas).toBeDefined()
      expect(eventSpy).toHaveBeenCalledWith({
        timestamp: expect.any(Number),
        canvasSize: { width: 400, height: 400 }
      })
    })

    test('should stop drawing recognition', () => {
      const eventSpy = jest.fn()
      eventManager.on('multiModalAI:drawing:stopped', eventSpy)
      
      multiModalAI.startDrawingRecognition()
      multiModalAI.stopDrawingRecognition()
      
      expect(eventSpy).toHaveBeenCalledWith({
        timestamp: expect.any(Number)
      })
    })

    test('should handle drawing events', () => {
      multiModalAI.startDrawingRecognition()
      
      const mockMouseEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100
      })
      
      const handleStart = (multiModalAI as any).handleDrawingStart.bind(multiModalAI)
      handleStart(mockMouseEvent)
      
      expect(multiModalAI.getCurrentDrawing()).toBeDefined()
      expect(multiModalAI.getCurrentDrawing()?.strokes).toHaveLength(1)
    })

    test('should analyze drawings', () => {
      const eventSpy = jest.fn()
      eventManager.on('multiModalAI:drawing:analyzed', eventSpy)
      
      multiModalAI.startDrawingRecognition()
      
      // Create a simple drawing
      const drawing: DrawingData = {
        strokes: [{
          points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
          width: 3,
          color: '#000000'
        }],
        bounds: { x: 0, y: 0, width: 100, height: 0 },
        timestamp: Date.now()
      }
      
      // Set the drawing and analyze it
      ;(multiModalAI as any).currentDrawing = drawing
      const analyzeDrawing = (multiModalAI as any).analyzeDrawing.bind(multiModalAI)
      analyzeDrawing()
      
      expect(eventSpy).toHaveBeenCalledWith({
        recognized: true,
        confidence: 0.8,
        interpretation: 'simple_command',
        category: 'pet_command',
        timestamp: expect.any(Number)
      })
    })
  })

  describe('Text Processing', () => {
    test('should process text input', () => {
      const eventSpy = jest.fn()
      eventManager.on('multiModalAI:text:processed', eventSpy)
      
      const result = multiModalAI.processText('help me move forward')
      
      expect(result.intent).toBe('help_request')
      expect(result.entities).toContain('action:move')
      expect(result.sentiment).toBe('positive')
      expect(result.context).toBe('general_context')
      expect(eventSpy).toHaveBeenCalledWith(result)
    })

    test('should detect movement commands', () => {
      const result = multiModalAI.processText('go north and collect items')
      
      expect(result.intent).toBe('movement_command')
      expect(result.entities).toContain('direction:north')
      expect(result.entities).toContain('action:collect')
    })

    test('should detect combat commands', () => {
      const result = multiModalAI.processText('attack the enemy')
      
      expect(result.intent).toBe('combat_command')
      expect(result.entities).toContain('action:attack')
      expect(result.entities).toContain('object:enemy')
    })

    test('should analyze sentiment correctly', () => {
      const positiveResult = multiModalAI.processText('this is great, thank you')
      expect(positiveResult.sentiment).toBe('positive')
      
      const negativeResult = multiModalAI.processText('this is terrible, stop it')
      expect(negativeResult.sentiment).toBe('negative')
      
      const neutralResult = multiModalAI.processText('move to the door')
      expect(neutralResult.sentiment).toBe('neutral')
    })
  })

  describe('Touch Gesture Recognition', () => {
    test('should process touch gestures', () => {
      const eventSpy = jest.fn()
      eventManager.on('multiModalAI:touch:gesture', eventSpy)
      
      const gesture: TouchGesture = {
        type: 'swipe',
        direction: 'right',
        distance: 100,
        duration: 500,
        fingers: 1,
        timestamp: Date.now()
      }
      
      multiModalAI.processTouchGesture(gesture)
      
      expect(eventSpy).toHaveBeenCalledWith(gesture)
    })
  })

  describe('Camera Integration', () => {
    test('should initialize camera when enabled', async () => {
      const cameraConfig = { ...defaultConfig, camera: { ...defaultConfig.camera, enableCamera: true } }
      const cameraAI = new MultiModalAISystem(eventManager, cameraConfig)
      
      // Initialize the system to activate camera
      cameraAI.initializeSystem()
      
      expect(cameraAI.isCameraActive()).toBe(true)
      
      cameraAI.destroy()
    })

    test('should capture camera frames', async () => {
      const cameraConfig = { ...defaultConfig, camera: { ...defaultConfig.camera, enableCamera: true } }
      const cameraAI = new MultiModalAISystem(eventManager, cameraConfig)
      
      // Initialize the system to activate camera
      cameraAI.initializeSystem()
      
      const frame = await cameraAI.captureFrame()
      
      expect(frame).toBeDefined()
      expect(frame?.timestamp).toBeDefined()
      
      cameraAI.destroy()
    })
  })

  describe('Context Awareness', () => {
    test('should maintain interaction history', () => {
      multiModalAI.processText('hello world')
      multiModalAI.processText('move forward')
      
      const context = multiModalAI.getContext()
      expect(context.recentInteractions).toHaveLength(4) // 2 text + 2 processed results
      expect(context.recentInteractions[0].type).toBe('text')
      expect(context.recentInteractions[2].type).toBe('text')
    })

    test('should limit interaction history size', () => {
      // Add more than 10 interactions
      for (let i = 0; i < 15; i++) {
        multiModalAI.processText(`command ${i}`)
      }
      
      const context = multiModalAI.getContext()
      expect(context.recentInteractions).toHaveLength(20) // 15 text + 15 processed results, limited to 20
    })

    test('should update context on system events', () => {
      const eventSpy = jest.fn()
      eventManager.on('multiModalAI:context:updated', eventSpy)
      
      // Simulate quest change
      const handleQuestChange = (multiModalAI as any).handleQuestChange.bind(multiModalAI)
      handleQuestChange({ questId: 'quest_123' })
      
      expect(eventSpy).toHaveBeenCalled()
      expect(multiModalAI.getContext().currentQuest).toBe('quest_123')
    })
  })

  describe('Multi-Modal Fusion', () => {
    test('should fuse multiple input types', async () => {
      // Add different types of interactions
      multiModalAI.processText('move forward')
      multiModalAI.processTouchGesture({
        type: 'swipe',
        direction: 'up',
        distance: 50,
        duration: 300,
        fingers: 1,
        timestamp: Date.now()
      })
      
      const fusionResult = await multiModalAI.fuseMultiModalInputs()
      
      expect(fusionResult).toBeDefined()
      expect(fusionResult?.confidence).toBeGreaterThan(0)
      expect(fusionResult?.interpretedCommand).toBeDefined()
    })

    test('should handle empty interaction history', async () => {
      const fusionResult = await multiModalAI.fuseMultiModalInputs()
      expect(fusionResult).toBeNull()
    })
  })

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const eventSpy = jest.fn()
      eventManager.on('multiModalAI:config:updated', eventSpy)
      
      const newConfig = {
        voice: { enableVoiceCommands: false },
        drawing: { enableDrawingRecognition: false }
      }
      
      multiModalAI.updateConfig(newConfig)
      
      const config = multiModalAI.getConfig()
      expect(config.voice.enableVoiceCommands).toBe(false)
      expect(config.drawing.enableDrawingRecognition).toBe(false)
      expect(eventSpy).toHaveBeenCalledWith({
        config: expect.objectContaining(newConfig),
        timestamp: expect.any(Number)
      })
    })
  })

  describe('System Lifecycle', () => {
    test('should update sub-systems', () => {
      const updateSpy = jest.spyOn(multiModalAI as any, 'fuseMultiModalInputs')
      
      multiModalAI.update(16.67) // 60fps delta time
      
      expect(updateSpy).toHaveBeenCalled()
    })

    test('should destroy system properly', () => {
      const destroySpy = jest.spyOn(multiModalAI as any, 'clearDrawingCanvas')
      
      multiModalAI.destroy()
      
      expect(destroySpy).toHaveBeenCalled()
      expect(multiModalAI.getContext().recentInteractions).toEqual([])
    })
  })

  describe('Error Handling', () => {
    test('should handle voice recognition initialization failure gracefully', () => {
      // Mock speech recognition to not exist
      const originalSpeechRecognition = (window as any).SpeechRecognition
      const originalWebkitSpeechRecognition = (window as any).webkitSpeechRecognition
      
      delete (window as any).SpeechRecognition
      delete (window as any).webkitSpeechRecognition
      
      const ai = new MultiModalAISystem(eventManager, defaultConfig)
      
      // Should not throw error
      expect(ai.isVoiceListening()).toBe(false)
      
      // Restore mocks using Object.defineProperty to avoid read-only property issues
      if (originalSpeechRecognition) {
        Object.defineProperty(window, 'SpeechRecognition', {
          value: originalSpeechRecognition,
          writable: true,
          configurable: true
        })
      }
      if (originalWebkitSpeechRecognition) {
        Object.defineProperty(window, 'webkitSpeechRecognition', {
          value: originalWebkitSpeechRecognition,
          writable: true,
          configurable: true
        })
      }
      
      ai.destroy()
    })

    test('should handle camera initialization failure gracefully', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Permission denied'))
      
      const cameraConfig = { ...defaultConfig, camera: { ...defaultConfig.camera, enableCamera: true } }
      const cameraAI = new MultiModalAISystem(eventManager, cameraConfig)
      
      // Should not throw error
      expect(cameraAI.isCameraActive()).toBe(false)
      
      cameraAI.destroy()
    })
  })

  describe('Phase 3.3 Feature Completeness', () => {
    test('should implement voice recognition capabilities', () => {
      expect(multiModalAI.startVoiceRecognition).toBeDefined()
      expect(multiModalAI.stopVoiceRecognition).toBeDefined()
      expect(multiModalAI.isVoiceListening).toBeDefined()
    })

    test('should implement drawing recognition capabilities', () => {
      expect(multiModalAI.startDrawingRecognition).toBeDefined()
      expect(multiModalAI.stopDrawingRecognition).toBeDefined()
      expect(multiModalAI.getCurrentDrawing).toBeDefined()
    })

    test('should implement text processing capabilities', () => {
      expect(multiModalAI.processText).toBeDefined()
    })

    test('should implement touch gesture processing', () => {
      expect(multiModalAI.processTouchGesture).toBeDefined()
    })

    test('should implement camera integration', () => {
      expect(multiModalAI.captureFrame).toBeDefined()
      expect(multiModalAI.processARFrame).toBeDefined()
      expect(multiModalAI.isCameraActive).toBeDefined()
    })

    test('should implement context awareness', () => {
      expect(multiModalAI.getContext).toBeDefined()
    })

    test('should implement multi-modal fusion', () => {
      expect(multiModalAI.fuseMultiModalInputs).toBeDefined()
    })

    test('should support web browser environment', () => {
      // All features should work in browser environment
      expect(() => multiModalAI.processText('test')).not.toThrow()
      expect(() => multiModalAI.processTouchGesture({
        type: 'swipe',
        direction: 'right',
        distance: 50,
        duration: 300,
        fingers: 1,
        timestamp: Date.now()
      })).not.toThrow()
    })
  })
})

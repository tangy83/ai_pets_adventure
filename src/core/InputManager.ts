import { EventManager } from './EventManager'
import { InputSystem, InputState, InputEvent, Gesture, TouchPoint } from './systems/InputSystem'

export interface InputMapping {
  [key: string]: {
    action: string
    description: string
    category: 'movement' | 'action' | 'ui' | 'system' | 'accessibility'
    priority: 'high' | 'normal' | 'low'
    accessibility?: {
      screenReaderText?: string
      keyboardShortcut?: string
      touchTarget?: boolean
    }
  }
}

export interface InputAction {
  type: string
  data: any
  timestamp: number
  priority: 'high' | 'normal' | 'low'
  processed: boolean
}

export interface InputProfile {
  name: string
  mappings: InputMapping
  sensitivity: {
    mouse: number
    touch: number
    gamepad: number
  }
  deadzone: {
    gamepad: number
    touch: number
  }
  accessibility: {
    enableKeyboardNavigation: boolean
    enableScreenReader: boolean
    enableHighContrast: boolean
    enableReducedMotion: boolean
    focusIndicatorStyle: 'outline' | 'glow' | 'highlight'
    minimumTouchTarget: number
  }
}

export class InputManager {
  private inputSystem: InputSystem
  private eventManager: EventManager
  private inputMappings!: InputMapping
  private inputProfiles: Map<string, InputProfile>
  private currentProfile: string
  private actionQueue: InputAction[] = []
  private inputHistory: InputEvent[] = []
  private isEnabled: boolean = true
  private frameCount: number = 0
  private lastInputTime: number = 0

  // Input buffering for responsive gameplay
  private inputBuffer: {
    maxSize: number
    events: InputEvent[]
    actions: InputAction[]
  }

  // Performance tracking
  private performanceMetrics = {
    actionsProcessed: 0,
    averageProcessingTime: 0,
    inputLatency: 0,
    bufferUtilization: 0
  }

  constructor(inputSystem: InputSystem, eventManager: EventManager) {
    this.inputSystem = inputSystem
    this.eventManager = eventManager
    this.inputProfiles = new Map()
    this.currentProfile = 'default'
    
    this.inputBuffer = {
      maxSize: 50,
      events: [],
      actions: []
    }

    this.setupDefaultMappings()
    this.setupDefaultProfiles()
    this.setupEventListeners()
  }

  private setupDefaultMappings(): void {
    // Enhanced input mappings for Phase 2.2 Web Input Controls
    this.inputMappings = {
      // Movement controls - Enhanced with accessibility
      'KeyW': { 
        action: 'moveForward', 
        description: 'Move Forward', 
        category: 'movement', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Move forward',
          keyboardShortcut: 'W key',
          touchTarget: false
        }
      },
      'KeyS': { 
        action: 'moveBackward', 
        description: 'Move Backward', 
        category: 'movement', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Move backward',
          keyboardShortcut: 'S key',
          touchTarget: false
        }
      },
      'KeyA': { 
        action: 'moveLeft', 
        description: 'Move Left', 
        category: 'movement', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Move left',
          keyboardShortcut: 'A key',
          touchTarget: false
        }
      },
      'KeyD': { 
        action: 'moveRight', 
        description: 'Move Right', 
        category: 'movement', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Move right',
          keyboardShortcut: 'D key',
          touchTarget: false
        }
      },
      'ArrowUp': { 
        action: 'moveForward', 
        description: 'Move Forward', 
        category: 'movement', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Move forward',
          keyboardShortcut: 'Up arrow',
          touchTarget: false
        }
      },
      'ArrowDown': { 
        action: 'moveBackward', 
        description: 'Move Backward', 
        category: 'movement', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Move backward',
          keyboardShortcut: 'Down arrow',
          touchTarget: false
        }
      },
      'ArrowLeft': { 
        action: 'moveLeft', 
        description: 'Move Left', 
        category: 'movement', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Move left',
          keyboardShortcut: 'Left arrow',
          touchTarget: false
        }
      },
      'ArrowRight': { 
        action: 'moveRight', 
        description: 'Move Right', 
        category: 'movement', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Move right',
          keyboardShortcut: 'Right arrow',
          touchTarget: false
        }
      },
      
      // Action controls - Enhanced with accessibility
      'Space': { 
        action: 'jump', 
        description: 'Jump', 
        category: 'action', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Jump',
          keyboardShortcut: 'Spacebar',
          touchTarget: false
        }
      },
      'Enter': { 
        action: 'interact', 
        description: 'Interact', 
        category: 'action', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Interact with object',
          keyboardShortcut: 'Enter key',
          touchTarget: false
        }
      },
      'KeyE': { 
        action: 'interact', 
        description: 'Interact', 
        category: 'action', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Interact with object',
          keyboardShortcut: 'E key',
          touchTarget: false
        }
      },
      'KeyF': { 
        action: 'attack', 
        description: 'Attack', 
        category: 'action', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Attack',
          keyboardShortcut: 'F key',
          touchTarget: false
        }
      },
      'KeyQ': { 
        action: 'special', 
        description: 'Special Ability', 
        category: 'action', 
        priority: 'normal',
        accessibility: {
          screenReaderText: 'Use special ability',
          keyboardShortcut: 'Q key',
          touchTarget: false
        }
      },
      
      // UI controls - Enhanced with accessibility
      'Escape': { 
        action: 'pause', 
        description: 'Pause Game', 
        category: 'ui', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Pause game',
          keyboardShortcut: 'Escape key',
          touchTarget: false
        }
      },
      'Tab': { 
        action: 'inventory', 
        description: 'Open Inventory', 
        category: 'ui', 
        priority: 'normal',
        accessibility: {
          screenReaderText: 'Open inventory',
          keyboardShortcut: 'Tab key',
          touchTarget: false
        }
      },
      'KeyI': { 
        action: 'inventory', 
        description: 'Open Inventory', 
        category: 'ui', 
        priority: 'normal',
        accessibility: {
          screenReaderText: 'Open inventory',
          keyboardShortcut: 'I key',
          touchTarget: false
        }
      },
      'KeyM': { 
        action: 'map', 
        description: 'Open Map', 
        category: 'ui', 
        priority: 'normal',
        accessibility: {
          screenReaderText: 'Open map',
          keyboardShortcut: 'M key',
          touchTarget: false
        }
      },
      
      // Accessibility controls - New for Phase 2.2
      'F1': { 
        action: 'help', 
        description: 'Show Help', 
        category: 'accessibility', 
        priority: 'normal',
        accessibility: {
          screenReaderText: 'Show help and accessibility options',
          keyboardShortcut: 'F1 key',
          touchTarget: false
        }
      },
      'F2': { 
        action: 'accessibility', 
        description: 'Accessibility Menu', 
        category: 'accessibility', 
        priority: 'normal',
        accessibility: {
          screenReaderText: 'Open accessibility menu',
          keyboardShortcut: 'F2 key',
          touchTarget: false
        }
      },
      'F3': { 
        action: 'highContrast', 
        description: 'Toggle High Contrast', 
        category: 'accessibility', 
        priority: 'normal',
        accessibility: {
          screenReaderText: 'Toggle high contrast mode',
          keyboardShortcut: 'F3 key',
          touchTarget: false
        }
      },
      'F4': { 
        action: 'reducedMotion', 
        description: 'Toggle Reduced Motion', 
        category: 'accessibility', 
        priority: 'normal',
        accessibility: {
          screenReaderText: 'Toggle reduced motion mode',
          keyboardShortcut: 'F4 key',
          touchTarget: false
        }
      },
      
      // Mouse controls - Enhanced for Phase 2.2
      'MouseLeft': { 
        action: 'select', 
        description: 'Select/Click', 
        category: 'action', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Select or click',
          keyboardShortcut: 'Left mouse button',
          touchTarget: true
        }
      },
      'MouseRight': { 
        action: 'context', 
        description: 'Context Menu', 
        category: 'ui', 
        priority: 'normal',
        accessibility: {
          screenReaderText: 'Open context menu',
          keyboardShortcut: 'Right mouse button',
          touchTarget: true
        }
      },
      'MouseMiddle': { 
        action: 'special', 
        description: 'Special Action', 
        category: 'action', 
        priority: 'normal',
        accessibility: {
          screenReaderText: 'Special action',
          keyboardShortcut: 'Middle mouse button',
          touchTarget: true
        }
      },
      
      // Touch controls - Enhanced for Phase 2.2
      'TouchTap': { 
        action: 'select', 
        description: 'Select/Tap', 
        category: 'action', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Select or tap',
          keyboardShortcut: 'Single tap',
          touchTarget: true
        }
      },
      'TouchDoubleTap': { 
        action: 'doubleSelect', 
        description: 'Double Select', 
        category: 'action', 
        priority: 'high',
        accessibility: {
          screenReaderText: 'Double select or double tap',
          keyboardShortcut: 'Double tap',
          touchTarget: true
        }
      },
      'TouchLongPress': { 
        action: 'context', 
        description: 'Context Menu', 
        category: 'ui', 
        priority: 'normal',
        accessibility: {
          screenReaderText: 'Open context menu',
          keyboardShortcut: 'Long press',
          touchTarget: true
        }
      },
      'TouchSwipe': { 
        action: 'navigate', 
        description: 'Navigate', 
        category: 'ui', 
        priority: 'normal',
        accessibility: {
          screenReaderText: 'Navigate or swipe',
          keyboardShortcut: 'Swipe gesture',
          touchTarget: true
        }
      }
    }
  }

  private setupDefaultProfiles(): void {
    // Default profile with enhanced accessibility
    const defaultProfile: InputProfile = {
      name: 'default',
      mappings: this.inputMappings,
      sensitivity: {
        mouse: 1.0,
        touch: 1.0,
        gamepad: 1.0
      },
      deadzone: {
        gamepad: 0.1,
        touch: 5.0
      },
      accessibility: {
        enableKeyboardNavigation: true,
        enableScreenReader: true,
        enableHighContrast: false,
        enableReducedMotion: false,
        focusIndicatorStyle: 'outline',
        minimumTouchTarget: 44
      }
    }

    // Accessibility-focused profile
    const accessibilityProfile: InputProfile = {
      name: 'accessibility',
      mappings: this.inputMappings,
      sensitivity: {
        mouse: 0.8,
        touch: 0.8,
        gamepad: 1.0
      },
      deadzone: {
        gamepad: 0.15,
        touch: 8.0
      },
      accessibility: {
        enableKeyboardNavigation: true,
        enableScreenReader: true,
        enableHighContrast: true,
        enableReducedMotion: true,
        focusIndicatorStyle: 'glow',
        minimumTouchTarget: 48
      }
    }

    // High-performance profile
    const performanceProfile: InputProfile = {
      name: 'performance',
      mappings: this.inputMappings,
      sensitivity: {
        mouse: 1.2,
        touch: 1.2,
        gamepad: 1.0
      },
      deadzone: {
        gamepad: 0.05,
        touch: 3.0
      },
      accessibility: {
        enableKeyboardNavigation: true,
        enableScreenReader: false,
        enableHighContrast: false,
        enableReducedMotion: false,
        focusIndicatorStyle: 'outline',
        minimumTouchTarget: 44
      }
    }

    this.inputProfiles.set('default', defaultProfile)
    this.inputProfiles.set('accessibility', accessibilityProfile)
    this.inputProfiles.set('performance', performanceProfile)
  }

  private setupEventListeners(): void {
    // Listen for input system events
    this.eventManager.on('input', this.handleInputEvent.bind(this))
    
    // Listen for accessibility events
    this.eventManager.on('accessibilityFocusChange', this.handleAccessibilityFocusChange.bind(this))
    this.eventManager.on('accessibilityElementActivate', this.handleAccessibilityElementActivate.bind(this))
    this.eventManager.on('accessibilityTouchTargetValidation', this.handleAccessibilityTouchTargetValidation.bind(this))
  }

  private handleInputEvent(event: InputEvent): void {
    const startTime = performance.now()
    
    // Map input to action
    const action = this.mapInputToAction(event)
    if (action) {
      this.actionQueue.push(action)
      this.eventManager.emit('inputAction', {
        action: action.type,
        data: action
      })
    }
    
    // Add to input history
    this.inputHistory.push(event)
    if (this.inputHistory.length > this.inputBuffer.maxSize) {
      this.inputHistory.shift()
    }
    
    // Update performance metrics
    this.updatePerformanceMetrics(startTime)
  }

  private handleAccessibilityFocusChange(data: { elementId: string; hasFocus: boolean; timestamp: number }): void {
    // Handle accessibility focus change events
    this.eventManager.emit('accessibilityFocusChange', data)
  }

  private handleAccessibilityElementActivate(data: { elementId: string; timestamp: number }): void {
    // Handle accessibility element activation events
    this.eventManager.emit('accessibilityElementActivate', data)
  }

  private handleAccessibilityTouchTargetValidation(data: { elementId: string; isValid: boolean; timestamp: number }): void {
    // Handle accessibility touch target validation events
    this.validateTouchTargetAccessibility(data)
  }

  private validateTouchTargetAccessibility(data: { elementId: string; isValid: boolean; timestamp: number }): void {
    // In a real implementation, you would check if the element meets accessibility requirements
    // For now, we'll just emit an event with the validated data
    this.eventManager.emit('accessibilityTouchTargetValidation', {
      elementId: data.elementId,
      isValid: data.isValid,
      timestamp: data.timestamp
    })
  }

  private mapInputToAction(event: InputEvent): InputAction | null {
    let inputKey = ''
    
    // Determine the input key based on event type
    switch (event.type) {
      case 'keyDown':
      case 'keyUp':
        inputKey = event.data.code
        break
      case 'mouseDown':
      case 'mouseUp':
        inputKey = `Mouse${event.data.button === 0 ? 'Left' : event.data.button === 1 ? 'Middle' : 'Right'}`
        break
      case 'touchStart':
      case 'touchEnd':
        inputKey = 'TouchTap'
        break
      case 'gesture':
        switch (event.data.type) {
          case 'doubleTap':
            inputKey = 'TouchDoubleTap'
            break
          case 'longPress':
            inputKey = 'TouchLongPress'
            break
          case 'swipe':
            inputKey = 'TouchSwipe'
            break
          default:
            return null
        }
        break
      default:
        return null
    }
    
    const mapping = this.inputMappings[inputKey]
    if (!mapping) return null
    
    return {
      type: mapping.action,
      data: {
        ...event.data,
        category: mapping.category,
        description: mapping.description,
        accessibility: mapping.accessibility,
        originalEventType: event.type
      },
      timestamp: event.timestamp,
      priority: mapping.priority,
      processed: false
    }
  }

  private updatePerformanceMetrics(startTime: number): void {
    const processingTime = performance.now() - startTime
    this.performanceMetrics.actionsProcessed++
    this.performanceMetrics.averageProcessingTime = 
      (this.performanceMetrics.averageProcessingTime * (this.performanceMetrics.actionsProcessed - 1) + processingTime) / 
      this.performanceMetrics.actionsProcessed
    this.performanceMetrics.inputLatency = processingTime
    this.performanceMetrics.bufferUtilization = this.actionQueue.length / this.inputBuffer.maxSize
  }

  // Public API Methods
  public getInputMappings(): InputMapping {
    return { ...this.inputMappings }
  }

  public getAvailableProfiles(): string[] {
    return Array.from(this.inputProfiles.keys())
  }

  public getCurrentProfile(): string {
    return this.currentProfile
  }

  public switchProfile(profileName: string): boolean {
    if (this.inputProfiles.has(profileName)) {
      this.currentProfile = profileName
      const profile = this.inputProfiles.get(profileName)!
      
      // Apply profile settings to input system
      this.inputSystem.setMouseSensitivity(profile.sensitivity.mouse)
      this.inputSystem.setTouchSensitivity(profile.sensitivity.touch)
      this.inputSystem.setAccessibilityConfig(profile.accessibility)
      
      const previousProfile = this.currentProfile
      this.eventManager.emit('inputProfileChanged', {
        profile: profileName,
        previousProfile: previousProfile
      })
      
      return true
    }
    return false
  }

  public getInputBuffer() {
    return {
      events: [...this.inputHistory],
      actions: [...this.actionQueue],
      maxSize: this.inputBuffer.maxSize
    }
  }

  public isActionActive(actionName: string): boolean {
    return this.actionQueue.some(action => 
      action.type === actionName && !action.processed
    )
  }

  public getActionValue(actionName: string): number {
    const action = this.actionQueue.find(a => a.type === actionName && !a.processed)
    if (!action) return 0
    
    // Return 1 for pressed actions, 0 for released
    const originalEventType = action.data.originalEventType
    return originalEventType === 'keyDown' || originalEventType === 'mouseDown' || originalEventType === 'touchStart' ? 1 : 0
  }

  public getPerformanceMetrics() {
    return { ...this.performanceMetrics }
  }

  public update(deltaTime: number): void {
    // Process action queue
    this.actionQueue = this.actionQueue.filter(action => {
      if (action.processed) return false
      
      // Mark as processed
      action.processed = true
      return false
    })
    
    // Update frame count
    this.frameCount++
  }

  public reset(): void {
    this.actionQueue = []
    this.inputHistory = []
    this.frameCount = 0
    this.performanceMetrics = {
      actionsProcessed: 0,
      averageProcessingTime: 0,
      inputLatency: 0,
      bufferUtilization: 0
    }
  }

  public destroy(): void {
    // Note: EventManager uses 'on' for subscription, but doesn't have a direct unsubscribe method
    // The events will be cleaned up when the EventManager is destroyed
    // In a production environment, you would want to store subscription IDs and use eventManager.off()
  }
}

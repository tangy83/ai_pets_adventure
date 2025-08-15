import { BaseSystem } from './BaseSystem'

export interface TouchPoint {
  id: number
  x: number
  y: number
  startX: number
  startY: number
  startTime: number
  pressure: number
  velocity: { x: number; y: number }
  acceleration: { x: number; y: number }
}

export interface Gesture {
  type: 'tap' | 'doubleTap' | 'longPress' | 'swipe' | 'pinch' | 'rotate' | 'draw' | 'flick'
  data: any
  confidence: number
  timestamp: number
  duration: number
}

export interface InputEvent {
  type: string
  data: any
  timestamp: number
  priority: 'high' | 'normal' | 'low'
}

export interface InputState {
  keys: Map<string, boolean>
  mouse: {
    x: number
    y: number
    buttons: Map<number, boolean>
    wheel: number
    isHovering: boolean
    dragState: {
      isDragging: boolean
      startX: number
      startY: number
      currentX: number
      currentY: number
    }
  }
  touch: {
    points: TouchPoint[]
    gestures: Gesture[]
  }
  gamepad?: GamepadState
  accessibility: {
    isEnabled: boolean
    currentFocus: string | null
    focusableElements: string[]
    navigationMode: 'keyboard' | 'mouse' | 'touch'
  }
}

export interface GamepadState {
  id: string
  connected: boolean
  buttons: boolean[]
  axes: number[]
  timestamp: number
}

export interface InputBuffer {
  events: InputEvent[]
  maxSize: number
  priority: 'fifo' | 'lifo' | 'priority'
}

export interface AccessibilityConfig {
  enableKeyboardNavigation: boolean
  enableScreenReader: boolean
  enableHighContrast: boolean
  enableReducedMotion: boolean
  focusIndicatorStyle: 'outline' | 'glow' | 'highlight'
  minimumTouchTarget: number // in pixels
}

export class InputSystem extends BaseSystem {
  private touchPoints: Map<number, TouchPoint> = new Map()
  private gestures: Gesture[] = []
  private eventQueue: InputEvent[] = []
  private inputBuffer: InputBuffer
  private inputState: InputState
  private isEnabled: boolean = true
  private config: InputConfig
  private frameCount: number = 0
  private lastFrameTime: number = 0
  private inputFPS: number = 60
  private bufferSize: number = 100

  // Enhanced input features
  private keyRepeatTimers: Map<string, NodeJS.Timeout> = new Map()
  private keyRepeatDelay: number = 500 // ms
  private keyRepeatInterval: number = 50 // ms
  private mouseSensitivity: number = 1.0
  private touchSensitivity: number = 1.0
  
  // Accessibility features
  private accessibilityConfig: AccessibilityConfig
  private focusableElements: Set<string> = new Set()
  private currentFocusIndex: number = -1

  // Performance tracking
  private performanceMetrics = {
    eventsProcessed: 0,
    averageProcessingTime: 0,
    frameTime: 0,
    inputLatency: 0
  }

  constructor() {
    super('InputSystem', 1) // High priority for input system
    this.config = {
      tapThreshold: 10, // pixels
      longPressThreshold: 500, // milliseconds
      swipeThreshold: 50, // pixels
      doubleTapDelay: 300, // milliseconds
      gestureConfidence: 0.8,
      inputBufferSize: 100,
      enableGamepad: true,
      enableTouchPrediction: true,
      enableInputSmoothing: true,
      enableKeyRepeat: true,
      enableAccessibility: true
    }
    
    this.accessibilityConfig = {
      enableKeyboardNavigation: true,
      enableScreenReader: true,
      enableHighContrast: false,
      enableReducedMotion: false,
      focusIndicatorStyle: 'outline',
      minimumTouchTarget: 44 // WCAG 2.1 AA requirement
    }
    
    this.inputBuffer = {
      events: [],
      maxSize: this.config.inputBufferSize,
      priority: 'priority'
    }
    
    this.inputState = {
      keys: new Map(),
      mouse: {
        x: 0,
        y: 0,
        buttons: new Map(),
        wheel: 0,
        isHovering: false,
        dragState: {
          isDragging: false,
          startX: 0,
          startY: 0,
          currentX: 0,
          currentY: 0
        }
      },
      touch: {
        points: [],
        gestures: []
      },
      accessibility: {
        isEnabled: this.accessibilityConfig.enableKeyboardNavigation,
        currentFocus: null,
        focusableElements: [],
        navigationMode: 'keyboard'
      }
    }
    
    this.initializeEventListeners()
    this.initializeGamepadSupport()
    this.initializeAccessibility()
  }

  private initializeEventListeners(): void {
    if (typeof window === 'undefined') return

    // Touch events with passive listeners for better performance
    window.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true })
    window.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true })
    window.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true })
    window.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: true })

    // Enhanced mouse events
    window.addEventListener('mousedown', this.handleMouseDown.bind(this))
    window.addEventListener('mousemove', this.handleMouseMove.bind(this))
    window.addEventListener('mouseup', this.handleMouseUp.bind(this))
    window.addEventListener('wheel', this.handleWheel.bind(this))
    window.addEventListener('contextmenu', this.handleContextMenu.bind(this))
    window.addEventListener('mouseenter', this.handleMouseEnter.bind(this))
    window.addEventListener('mouseleave', this.handleMouseLeave.bind(this))

    // Enhanced keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this))
    window.addEventListener('keyup', this.handleKeyUp.bind(this))
    window.addEventListener('keypress', this.handleKeyPress.bind(this))

    // Gesture events - only add if they exist
    if (typeof window.addEventListener === 'function') {
      try {
        window.addEventListener('gesturestart', this.handleGestureStart.bind(this))
        window.addEventListener('gesturechange', this.handleGestureChange.bind(this))
        window.addEventListener('gestureend', this.handleGestureEnd.bind(this))
      } catch (e) {
        // Gesture events not supported in this environment
        console.warn('Gesture events not supported in this environment')
      }
    }

    // Focus and visibility events for better input management
    window.addEventListener('blur', this.handleWindowBlur.bind(this))
    window.addEventListener('focus', this.handleWindowFocus.bind(this))
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    }
  }

  private initializeAccessibility(): void {
    if (!this.accessibilityConfig.enableKeyboardNavigation) return

    // Register common focusable elements
    this.registerFocusableElement('game-canvas')
    this.registerFocusableElement('ui-panel')
    this.registerFocusableElement('inventory-button')
    this.registerFocusableElement('settings-button')
    
    // Listen for focus changes
    document.addEventListener('focusin', this.handleFocusIn.bind(this))
    document.addEventListener('focusout', this.handleFocusOut.bind(this))
  }

  private initializeGamepadSupport(): void {
    if (!this.config.enableGamepad || typeof navigator.getGamepads !== 'function') return

    // Gamepad connection events
    window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this))
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this))
  }

  public update(deltaTime: number): void {
    const startTime = performance.now()
    this.frameCount++
    
    // Update input state
    this.updateInputState()
    
    // Process gesture recognition
    this.processGestureRecognition()
    
    // Process event queue with priority
    this.processEventQueue()
    
    // Update gamepad state
    this.updateGamepadState()
    
    // Update accessibility features
    this.updateAccessibility()
    
    // Clean up old gestures and events
    this.cleanupOldData()
    
    // Update performance metrics
    this.updatePerformanceMetrics(startTime, deltaTime)
    
    // Emit input state update event
    this.emitInputStateUpdate()
  }

  private updateInputState(): void {
    // Update touch points with velocity and acceleration
    this.touchPoints.forEach((point, id) => {
      if (point.velocity) {
        point.acceleration = {
          x: point.velocity.x - (point.velocity.x || 0),
          y: point.velocity.y - (point.velocity.y || 0)
        }
      }
    })

    // Update mouse drag state
    if (this.inputState.mouse.dragState.isDragging) {
      this.inputState.mouse.dragState.currentX = this.inputState.mouse.x
      this.inputState.mouse.dragState.currentY = this.inputState.mouse.y
    }

    // Update touch gestures
    this.inputState.touch.gestures = [...this.gestures]
    this.inputState.touch.points = Array.from(this.touchPoints.values())
  }

  private updateAccessibility(): void {
    if (!this.accessibilityConfig.enableKeyboardNavigation) return

    // Update focusable elements list
    this.inputState.accessibility.focusableElements = Array.from(this.focusableElements)
    
    // Update current focus
    if (this.currentFocusIndex >= 0 && this.currentFocusIndex < this.focusableElements.size) {
      const focusableArray = Array.from(this.focusableElements)
      this.inputState.accessibility.currentFocus = focusableArray[this.currentFocusIndex]
    }
  }

  // Enhanced Keyboard Controls
  private handleKeyDown(event: KeyboardEvent): void {
    // Prevent default for game keys
    if (this.isGameKey(event.code)) {
      event.preventDefault()
    }
    
    this.inputState.keys.set(event.code, true)
    
    // Handle accessibility navigation
    if (this.accessibilityConfig.enableKeyboardNavigation) {
      this.handleAccessibilityNavigation(event)
    }
    
    // Handle key repeat
    if (this.config.enableKeyRepeat && !event.repeat) {
      this.startKeyRepeat(event.code)
    }
    
    this.queueEvent('keyDown', {
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      repeat: event.repeat,
      timestamp: performance.now()
    }, 'high')
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.inputState.keys.set(event.code, false)
    
    // Stop key repeat
    if (this.config.enableKeyRepeat) {
      this.stopKeyRepeat(event.code)
    }
    
    this.queueEvent('keyUp', {
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      timestamp: performance.now()
    }, 'high')
  }

  private handleKeyPress(event: KeyboardEvent): void {
    // Handle character input for accessibility
    if (this.accessibilityConfig.enableKeyboardNavigation) {
      this.queueEvent('keyPress', {
        key: event.key,
        code: event.code,
        charCode: event.charCode,
        timestamp: performance.now()
      }, 'normal')
    }
  }

  private handleAccessibilityNavigation(event: KeyboardEvent): void {
    switch (event.code) {
      case 'Tab':
        if (event.shiftKey) {
          this.previousFocus()
        } else {
          this.nextFocus()
        }
        event.preventDefault()
        break
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        if (this.inputState.accessibility.currentFocus) {
          this.navigateFocus(event.code)
          event.preventDefault()
        }
        break
      case 'Enter':
      case 'Space':
        if (this.inputState.accessibility.currentFocus) {
          this.activateFocusedElement()
          event.preventDefault()
        }
        break
    }
  }

  // Enhanced Mouse Controls
  private handleMouseDown(event: MouseEvent): void {
    this.inputState.mouse.buttons.set(event.button, true)
    
    // Initialize drag state
    this.inputState.mouse.dragState.isDragging = true
    this.inputState.mouse.dragState.startX = event.clientX
    this.inputState.mouse.dragState.startY = event.clientY
    this.inputState.mouse.dragState.currentX = event.clientX
    this.inputState.mouse.dragState.currentY = event.clientY
    
    this.queueEvent('mouseDown', {
      button: event.button,
      x: event.clientX,
      y: event.clientY,
      timestamp: performance.now()
    }, 'high')
  }

  private handleMouseMove(event: MouseEvent): void {
    const deltaX = (event.clientX - this.inputState.mouse.x) * this.mouseSensitivity
    const deltaY = (event.clientY - this.inputState.mouse.y) * this.mouseSensitivity
    
    this.inputState.mouse.x = event.clientX
    this.inputState.mouse.y = event.clientY
    
    // Update drag state if dragging
    if (this.inputState.mouse.dragState.isDragging) {
      this.inputState.mouse.dragState.currentX = event.clientX
      this.inputState.mouse.dragState.currentY = event.clientY
    }
    
    this.queueEvent('mouseMove', {
      x: event.clientX,
      y: event.clientY,
      deltaX,
      deltaY,
      timestamp: performance.now()
    }, 'normal')
  }

  private handleMouseUp(event: MouseEvent): void {
    this.inputState.mouse.buttons.set(event.button, false)
    
    // Finalize drag state
    if (this.inputState.mouse.dragState.isDragging) {
      this.inputState.mouse.dragState.isDragging = false
      
      // Emit drag end event
      this.queueEvent('dragEnd', {
        startX: this.inputState.mouse.dragState.startX,
        startY: this.inputState.mouse.dragState.startY,
        endX: event.clientX,
        endY: event.clientY,
        duration: performance.now() - this.lastFrameTime,
        timestamp: performance.now()
      }, 'normal')
    }
    
    this.queueEvent('mouseUp', {
      button: event.button,
      x: event.clientX,
      y: event.clientY,
      timestamp: performance.now()
    }, 'high')
  }

  private handleMouseEnter(event: MouseEvent): void {
    this.inputState.mouse.isHovering = true
    this.queueEvent('mouseEnter', {
      x: event.clientX,
      y: event.clientY,
      timestamp: performance.now()
    }, 'normal')
  }

  private handleMouseLeave(event: MouseEvent): void {
    this.inputState.mouse.isHovering = false
    this.queueEvent('mouseLeave', {
      x: event.clientX,
      y: event.clientY,
      timestamp: performance.now()
    }, 'normal')
  }

  private handleWheel(event: WheelEvent): void {
    this.inputState.mouse.wheel += event.deltaY
    
    this.queueEvent('wheel', {
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      deltaZ: event.deltaZ,
      timestamp: performance.now()
    }, 'normal')
  }

  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault()
    this.queueEvent('contextMenu', {
      x: event.clientX,
      y: event.clientY,
      timestamp: performance.now()
    }, 'low')
  }

  // Enhanced Touch Controls
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault()
    
    for (const touch of event.changedTouches) {
      const touchPoint: TouchPoint = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: performance.now(),
        pressure: touch.force || 1.0,
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 }
      }
      
      this.touchPoints.set(touch.identifier, touchPoint)
      
      // Check minimum touch target size for accessibility
      if (this.accessibilityConfig.enableKeyboardNavigation) {
        this.validateTouchTargetSize(touch.clientX, touch.clientY)
      }
    }
    
    this.queueEvent('touchStart', {
      touches: Array.from(this.touchPoints.values()),
      timestamp: performance.now()
    }, 'high')
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault()
    
    for (const touch of event.changedTouches) {
      const touchPoint = this.touchPoints.get(touch.identifier)
      if (touchPoint) {
        const deltaTime = performance.now() - touchPoint.startTime
        const deltaX = (touch.clientX - touchPoint.startX) * this.touchSensitivity
        const deltaY = (touch.clientY - touchPoint.startY) * this.touchSensitivity
        
        touchPoint.x = touch.clientX
        touchPoint.y = touch.clientY
        
        // Calculate velocity and acceleration
        if (deltaTime > 0) {
          touchPoint.velocity = {
            x: deltaX / deltaTime,
            y: deltaY / deltaTime
          }
        }
      }
    }
    
    this.queueEvent('touchMove', {
      touches: Array.from(this.touchPoints.values()),
      timestamp: performance.now()
    }, 'normal')
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault()
    
    for (const touch of event.changedTouches) {
      const touchPoint = this.touchPoints.get(touch.identifier)
      if (touchPoint) {
        // Process gesture recognition
        this.processTouchGesture(touchPoint)
        
        // Remove touch point
        this.touchPoints.delete(touch.identifier)
      }
    }
    
    this.queueEvent('touchEnd', {
      touches: Array.from(this.touchPoints.values()),
      timestamp: performance.now()
    }, 'high')
  }

  private handleTouchCancel(event: TouchEvent): void {
    event.preventDefault()
    
    for (const touch of event.changedTouches) {
      this.touchPoints.delete(touch.identifier)
    }
    
    this.queueEvent('touchCancel', {
      timestamp: performance.now()
    }, 'normal')
  }

  // Accessibility Methods
  public registerFocusableElement(elementId: string): void {
    this.focusableElements.add(elementId)
    this.updateAccessibility()
  }

  public unregisterFocusableElement(elementId: string): void {
    this.focusableElements.delete(elementId)
    this.updateAccessibility()
  }

  public setFocus(elementId: string): boolean {
    if (this.focusableElements.has(elementId)) {
      const focusableArray = Array.from(this.focusableElements)
      this.currentFocusIndex = focusableArray.indexOf(elementId)
      this.inputState.accessibility.currentFocus = elementId
      
      // Emit focus change event
      this.queueEvent('focusChange', {
        elementId,
        timestamp: performance.now()
      }, 'high')
      
      return true
    }
    return false
  }

  public nextFocus(): void {
    if (this.focusableElements.size === 0) return
    
    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.size
    const focusableArray = Array.from(this.focusableElements)
    this.inputState.accessibility.currentFocus = focusableArray[this.currentFocusIndex]
    
    this.queueEvent('focusChange', {
      elementId: this.inputState.accessibility.currentFocus,
      timestamp: performance.now()
    }, 'high')
  }

  public previousFocus(): void {
    if (this.focusableElements.size === 0) return
    
    this.currentFocusIndex = this.currentFocusIndex <= 0 
      ? this.focusableElements.size - 1 
      : this.currentFocusIndex - 1
    const focusableArray = Array.from(this.focusableElements)
    this.inputState.accessibility.currentFocus = focusableArray[this.currentFocusIndex]
    
    this.queueEvent('focusChange', {
      elementId: this.inputState.accessibility.currentFocus,
      timestamp: performance.now()
    }, 'high')
  }

  private navigateFocus(direction: string): void {
    // Implement directional navigation logic here
    // This could be used for grid-based navigation
    this.queueEvent('focusNavigate', {
      direction,
      elementId: this.inputState.accessibility.currentFocus,
      timestamp: performance.now()
    }, 'normal')
  }

  private activateFocusedElement(): void {
    if (this.inputState.accessibility.currentFocus) {
      this.queueEvent('elementActivate', {
        elementId: this.inputState.accessibility.currentFocus,
        timestamp: performance.now()
      }, 'high')
    }
  }

  private validateTouchTargetSize(x: number, y: number): void {
    // Check if touch target meets minimum size requirements
    // This is a simplified implementation - in a real app, you'd check actual element dimensions
    const minSize = this.accessibilityConfig.minimumTouchTarget
    
    this.queueEvent('touchTargetValidation', {
      x,
      y,
      minSize,
      timestamp: performance.now()
    }, 'normal')
  }

  // Key Repeat Management
  private startKeyRepeat(keyCode: string): void {
    if (this.keyRepeatTimers.has(keyCode)) return
    
    const timer = setTimeout(() => {
      this.repeatKey(keyCode)
    }, this.keyRepeatDelay)
    
    this.keyRepeatTimers.set(keyCode, timer)
  }

  private stopKeyRepeat(keyCode: string): void {
    const timer = this.keyRepeatTimers.get(keyCode)
    if (timer) {
      clearTimeout(timer)
      this.keyRepeatTimers.delete(keyCode)
    }
  }

  private repeatKey(keyCode: string): void {
    if (!this.inputState.keys.get(keyCode)) return
    
    // Emit repeated key event
    this.queueEvent('keyRepeat', {
      code: keyCode,
      timestamp: performance.now()
    }, 'normal')
    
    // Continue repeating
    const timer = setTimeout(() => {
      this.repeatKey(keyCode)
    }, this.keyRepeatInterval)
    
    this.keyRepeatTimers.set(keyCode, timer)
  }

  // Configuration Methods
  public setMouseSensitivity(sensitivity: number): void {
    this.mouseSensitivity = Math.max(0.1, Math.min(5.0, sensitivity))
  }

  public setTouchSensitivity(sensitivity: number): void {
    this.touchSensitivity = Math.max(0.1, Math.min(5.0, sensitivity))
  }

  public setAccessibilityConfig(config: Partial<AccessibilityConfig>): void {
    this.accessibilityConfig = { ...this.accessibilityConfig, ...config }
    this.inputState.accessibility.isEnabled = this.accessibilityConfig.enableKeyboardNavigation
  }

  public getAccessibilityConfig(): AccessibilityConfig {
    return { ...this.accessibilityConfig }
  }

  // Public API Methods
  public isKeyPressed(keyCode: string): boolean {
    return this.inputState.keys.get(keyCode) || false
  }

  public isMouseButtonPressed(button: number): boolean {
    return this.inputState.mouse.buttons.get(button) || false
  }

  public getMousePosition(): { x: number; y: number } {
    return { x: this.inputState.mouse.x, y: this.inputState.mouse.y }
  }

  public getMouseDragState(): InputState['mouse']['dragState'] {
    return { ...this.inputState.mouse.dragState }
  }

  public isMouseHovering(): boolean {
    return this.inputState.mouse.isHovering
  }

  public getTouchPoints(): TouchPoint[] {
    return Array.from(this.touchPoints.values())
  }

  public getGestures(): Gesture[] {
    return [...this.gestures]
  }

  public getInputState(): InputState {
    return {
      keys: new Map(this.inputState.keys),
      mouse: { ...this.inputState.mouse },
      touch: { ...this.inputState.touch },
      gamepad: this.inputState.gamepad ? { ...this.inputState.gamepad } : undefined,
      accessibility: { ...this.inputState.accessibility }
    }
  }

  public getPerformanceMetrics() {
    return { ...this.performanceMetrics }
  }

  public getConfig() {
    return { ...this.config }
  }

  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement
    if (target && target.id) {
      this.registerFocusableElement(target.id)
    }
  }

  private handleFocusOut(event: FocusEvent): void {
    const target = event.target as HTMLElement
    if (target && target.id) {
      this.unregisterFocusableElement(target.id)
    }
  }

  private updateGamepadState(): void {
    if (!this.config.enableGamepad) return
    
    const gamepads = navigator.getGamepads()
    for (const gamepad of gamepads) {
      if (gamepad && gamepad.connected) {
        this.inputState.gamepad = {
          id: gamepad.id,
          connected: gamepad.connected,
          buttons: gamepad.buttons.map(button => button.pressed),
          axes: [...gamepad.axes],
          timestamp: performance.now()
        }
        
        // Emit gamepad update events
        this.queueEvent('gamepadUpdate', {
          id: gamepad.id,
          buttons: gamepad.buttons.map(button => button.pressed),
          axes: [...gamepad.axes],
          timestamp: performance.now()
        }, 'normal')
      }
    }
  }

  private handleWindowBlur(): void {
    this.queueEvent('windowBlur', { timestamp: performance.now() }, 'high')
    // Clear all input states when window loses focus
    this.clearInputState()
  }

  private handleWindowFocus(): void {
    this.queueEvent('windowFocus', { timestamp: performance.now() }, 'high')
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.queueEvent('pageHidden', { timestamp: performance.now() }, 'high')
      this.clearInputState()
    } else {
      this.queueEvent('pageVisible', { timestamp: performance.now() }, 'high')
    }
  }

  private clearInputState(): void {
    this.inputState.keys.clear()
    this.inputState.mouse.buttons.clear()
    this.touchPoints.clear()
    this.gestures = []
  }

  private analyzeTouchGesture(touchPoint: TouchPoint, endTime: number): Gesture | null {
    const deltaX = touchPoint.x - touchPoint.startX
    const deltaY = touchPoint.y - touchPoint.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const duration = endTime - touchPoint.startTime
    
    // Enhanced tap detection with velocity
    if (distance < this.config.tapThreshold && duration < this.config.longPressThreshold) {
      const velocity = Math.sqrt(
        (touchPoint.velocity?.x || 0) ** 2 + (touchPoint.velocity?.y || 0) ** 2
      )
      
      return {
        type: 'tap',
        data: { 
          x: touchPoint.x, 
          y: touchPoint.y, 
          pressure: touchPoint.pressure,
          velocity
        },
        confidence: 0.9,
        timestamp: endTime,
        duration
      }
    }
    
    // Enhanced long press detection
    if (distance < this.config.tapThreshold && duration >= this.config.longPressThreshold) {
      return {
        type: 'longPress',
        data: { 
          x: touchPoint.x, 
          y: touchPoint.y, 
          pressure: touchPoint.pressure, 
          duration 
        },
        confidence: 0.8,
        timestamp: endTime,
        duration
      }
    }
    
    // Enhanced swipe detection with velocity
    if (distance >= this.config.swipeThreshold) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
      let direction = 'right'
      
      if (angle >= -45 && angle < 45) direction = 'right'
      else if (angle >= 45 && angle < 135) direction = 'down'
      else if (angle >= 135 || angle < -135) direction = 'left'
      else direction = 'up'
      
      const velocity = Math.sqrt(
        (touchPoint.velocity?.x || 0) ** 2 + (touchPoint.velocity?.y || 0) ** 2
      )
      
      // Detect flick gesture (high velocity swipe)
      const gestureType = velocity > 2.0 ? 'flick' : 'swipe'
      
      return {
        type: gestureType as any,
        data: { 
          direction, 
          distance, 
          deltaX, 
          deltaY, 
          duration,
          velocity,
          startX: touchPoint.startX,
          startY: touchPoint.startY,
          endX: touchPoint.x,
          endY: touchPoint.y
        },
        confidence: 0.85,
        timestamp: endTime,
        duration
      }
    }
    
    return null
  }

  private processGestureRecognition(): void {
    // Process multi-touch gestures
    if (this.touchPoints.size >= 2) {
      this.processMultiTouchGestures()
    }
    
    // Process gesture combinations
    this.processGestureCombinations()
    
    // Process input prediction if enabled
    if (this.config.enableTouchPrediction) {
      this.processTouchPrediction()
    }
  }

  private processTouchPrediction(): void {
    // Simple touch prediction based on velocity
    this.touchPoints.forEach((point) => {
      if (point.velocity && (Math.abs(point.velocity.x) > 0.5 || Math.abs(point.velocity.y) > 0.5)) {
        const predictedX = point.x + point.velocity.x * 16.67 // Predict 1 frame ahead at 60fps
        const predictedY = point.y + point.velocity.y * 16.67
        
        this.queueEvent('touchPrediction', {
          id: point.id,
          predictedX,
          predictedY,
          confidence: 0.7,
          timestamp: performance.now()
        }, 'low')
      }
    })
  }

  private processEventQueue(): void {
    const startTime = performance.now()
    let eventsProcessed = 0
    
    // Sort events by priority
    this.eventQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    
    while (this.eventQueue.length > 0 && eventsProcessed < this.bufferSize) {
      const event = this.eventQueue.shift()
      if (event) {
        // Emit to event system
        if (this.eventManager) {
          this.eventManager.emit('input', event)
        }
        
        eventsProcessed++
      }
    }
    
    this.performanceMetrics.eventsProcessed = eventsProcessed
    this.performanceMetrics.averageProcessingTime = performance.now() - startTime
  }

  private updatePerformanceMetrics(startTime: number, deltaTime: number): void {
    this.performanceMetrics.frameTime = deltaTime
    this.performanceMetrics.inputLatency = performance.now() - startTime
  }

  private emitInputStateUpdate(): void {
    if (this.eventManager) {
      this.eventManager.emit('inputStateUpdate' as any, this.inputState)
    }
  }

  private cleanupOldData(): void {
    const now = performance.now()
    
    // Clean up old gestures
    this.gestures = this.gestures.filter(gesture => {
      return now - gesture.timestamp < 2000 // Keep gestures for 2 seconds
    })
    
    // Clean up old events
    if (this.eventQueue.length > this.bufferSize) {
      this.eventQueue = this.eventQueue.slice(-this.bufferSize)
    }
  }

  private queueEvent(type: string, data: any, priority: 'high' | 'normal' | 'low' = 'normal'): void {
    const event: InputEvent = {
      type,
      data,
      timestamp: performance.now(),
      priority
    }
    
    this.eventQueue.push(event)
    
    // Maintain buffer size
    if (this.eventQueue.length > this.bufferSize) {
      this.eventQueue.shift()
    }
  }

  private handleGestureStart(event: any): void {
    this.queueEvent('gestureStart', {
      scale: event.scale,
      rotation: event.rotation
    }, 'normal')
  }

  private handleGestureChange(event: any): void {
    this.queueEvent('gestureChange', {
      scale: event.scale,
      rotation: event.rotation
    }, 'normal')
  }

  private handleGestureEnd(event: any): void {
    this.queueEvent('gestureEnd', {
      scale: event.scale,
      rotation: event.rotation
    }, 'normal')
  }

  private processMultiTouchGestures(): void {
    const touchArray = Array.from(this.touchPoints.values())
    
    if (touchArray.length === 2) {
      const touch1 = touchArray[0]
      const touch2 = touchArray[1]
      
      // Calculate distance between touches
      const distance = Math.sqrt(
        Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2)
      )
      
      // Calculate initial distance
      const initialDistance = Math.sqrt(
        Math.pow(touch2.startX - touch1.startX, 2) + Math.pow(touch2.startY - touch1.startY, 2)
      )
      
      // Pinch gesture
      if (Math.abs(distance - initialDistance) > 20) {
        const scale = distance / initialDistance
        const gesture: Gesture = {
          type: 'pinch',
          data: { scale, distance, initialDistance },
          confidence: 0.9,
          timestamp: Date.now(),
          duration: 0
        }
        this.gestures.push(gesture)
      }
    }
  }

  private processGestureCombinations(): void {
    // Look for double tap patterns
    const taps = this.gestures.filter(g => g.type === 'tap')
    if (taps.length >= 2) {
      const lastTwoTaps = taps.slice(-2)
      const timeDiff = lastTwoTaps[1].timestamp - lastTwoTaps[0].timestamp
      
      if (timeDiff < this.config.doubleTapDelay) {
        const doubleTap: Gesture = {
          type: 'doubleTap',
          data: { 
            firstTap: lastTwoTaps[0].data,
            secondTap: lastTwoTaps[1].data,
            timeDiff
          },
          confidence: 0.95,
          timestamp: Date.now(),
          duration: timeDiff
        }
        this.gestures.push(doubleTap)
      }
    }
  }

  private isGameKey(code: string): boolean {
    const gameKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'Space', 'Enter', 'Escape', 'Tab',
      'ShiftLeft', 'ControlLeft', 'AltLeft'
    ]
    return gameKeys.includes(code)
  }

  private handleGamepadConnected(event: GamepadEvent): void {
    const gamepad = event.gamepad
    this.queueEvent('gamepadConnected', {
      id: gamepad.id,
      index: gamepad.index,
      timestamp: performance.now()
    }, 'normal')
  }

  private handleGamepadDisconnected(event: GamepadEvent): void {
    this.queueEvent('gamepadDisconnected', {
      id: event.gamepad.id,
      index: event.gamepad.index,
      timestamp: performance.now()
    }, 'normal')
  }

  private processTouchGesture(touchPoint: TouchPoint): void {
    const gesture = this.analyzeTouchGesture(touchPoint, performance.now())
    if (gesture) {
      this.gestures.push(gesture)
    }
  }

  // Additional required methods
  public enable(): void {
    this.isEnabled = true
  }

  public disable(): void {
    this.isEnabled = false
    this.clearInputState()
  }

  public setConfig(config: Partial<InputConfig>): void {
    this.config = { ...this.config, ...config }
    this.bufferSize = this.config.inputBufferSize
  }

  public reset(): void {
    this.clearInputState()
    this.eventQueue = []
    this.gestures = []
    this.frameCount = 0
    this.performanceMetrics = {
      eventsProcessed: 0,
      averageProcessingTime: 0,
      frameTime: 0,
      inputLatency: 0
    }
  }

  public isTouchActive(): boolean {
    return this.touchPoints.size > 0
  }
}

export interface InputConfig {
  tapThreshold: number
  longPressThreshold: number
  swipeThreshold: number
  doubleTapDelay: number
  gestureConfidence: number
  inputBufferSize: number
  enableGamepad: boolean
  enableTouchPrediction: boolean
  enableInputSmoothing: boolean
  enableKeyRepeat: boolean
  enableAccessibility: boolean
} 

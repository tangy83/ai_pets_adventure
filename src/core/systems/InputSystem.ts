import { BaseSystem } from './BaseSystem'

export interface TouchPoint {
  id: number
  x: number
  y: number
  startX: number
  startY: number
  startTime: number
  pressure: number
}

export interface Gesture {
  type: 'tap' | 'doubleTap' | 'longPress' | 'swipe' | 'pinch' | 'rotate' | 'draw'
  data: any
  confidence: number
  timestamp: number
}

export interface InputEvent {
  type: string
  data: any
  timestamp: number
}

export class InputSystem extends BaseSystem {
  private touchPoints: Map<number, TouchPoint> = new Map()
  private gestures: Gesture[] = []
  private eventQueue: InputEvent[] = []
  private isEnabled: boolean = true
  private config: InputConfig

  constructor() {
    super('InputSystem', 1) // Added priority 1 for input system
    this.config = {
      tapThreshold: 10, // pixels
      longPressThreshold: 500, // milliseconds
      swipeThreshold: 50, // pixels
      doubleTapDelay: 300, // milliseconds
      gestureConfidence: 0.8
    }
    this.initializeEventListeners()
  }

  private initializeEventListeners(): void {
    if (typeof window === 'undefined') return

    // Touch events
    window.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    window.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    window.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    window.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false })

    // Mouse events (for desktop testing)
    window.addEventListener('mousedown', this.handleMouseDown.bind(this))
    window.addEventListener('mousemove', this.handleMouseMove.bind(this))
    window.addEventListener('mouseup', this.handleMouseUp.bind(this))

    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this))
    window.addEventListener('keyup', this.handleKeyUp.bind(this))

    // Gesture events
    window.addEventListener('gesturestart', this.handleGestureStart.bind(this))
    window.addEventListener('gesturechange', this.handleGestureChange.bind(this))
    window.addEventListener('gestureend', this.handleGestureEnd.bind(this))
  }

  public update(deltaTime: number): void {
    // Process gesture recognition
    this.processGestureRecognition()
    
    // Process event queue
    this.processEventQueue()
    
    // Clean up old gestures
    this.cleanupOldGestures()
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault()
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]
      const touchPoint: TouchPoint = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        pressure: touch.force || 1.0
      }
      
      this.touchPoints.set(touch.identifier, touchPoint)
      
      // Emit touch start event
      this.queueEvent('touchStart', {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        pressure: touch.force || 1.0
      })
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault()
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]
      const touchPoint = this.touchPoints.get(touch.identifier)
      
      if (touchPoint) {
        touchPoint.x = touch.clientX
        touchPoint.y = touch.clientY
        
        // Emit touch move event
        this.queueEvent('touchMove', {
          id: touch.identifier,
          x: touch.clientX,
          y: touch.clientY,
          deltaX: touch.clientX - touchPoint.startX,
          deltaY: touch.clientY - touchPoint.startY,
          pressure: touch.force || 1.0
        })
      }
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault()
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]
      const touchPoint = this.touchPoints.get(touch.identifier)
      
      if (touchPoint) {
        // Analyze gesture
        const gesture = this.analyzeTouchGesture(touchPoint)
        if (gesture) {
          this.gestures.push(gesture)
        }
        
        // Emit touch end event
        this.queueEvent('touchEnd', {
          id: touch.identifier,
          x: touch.clientX,
          y: touch.clientY,
          duration: Date.now() - touchPoint.startTime
        })
        
        this.touchPoints.delete(touch.identifier)
      }
    }
  }

  private handleTouchCancel(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]
      this.touchPoints.delete(touch.identifier)
      
      this.queueEvent('touchCancel', {
        id: touch.identifier
      })
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    // Simulate touch for desktop testing
    const touchPoint: TouchPoint = {
      id: -1, // Use negative ID for mouse
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      startTime: Date.now(),
      pressure: 1.0
    }
    
    this.touchPoints.set(-1, touchPoint)
    this.queueEvent('touchStart', {
      id: -1,
      x: event.clientX,
      y: event.clientY,
      pressure: 1.0
    })
  }

  private handleMouseMove(event: MouseEvent): void {
    const touchPoint = this.touchPoints.get(-1)
    if (touchPoint) {
      touchPoint.x = event.clientX
      touchPoint.y = event.clientY
      
      this.queueEvent('touchMove', {
        id: -1,
        x: event.clientX,
        y: event.clientY,
        deltaX: event.clientX - touchPoint.startX,
        deltaY: event.clientY - touchPoint.startY,
        pressure: 1.0
      })
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    const touchPoint = this.touchPoints.get(-1)
    if (touchPoint) {
      const gesture = this.analyzeTouchGesture(touchPoint)
      if (gesture) {
        this.gestures.push(gesture)
      }
      
      this.queueEvent('touchEnd', {
        id: -1,
        x: event.clientX,
        y: event.clientY,
        duration: Date.now() - touchPoint.startTime
      })
      
      this.touchPoints.delete(-1)
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.queueEvent('keyDown', {
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey
    })
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.queueEvent('keyUp', {
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey
    })
  }

  private handleGestureStart(event: any): void {
    this.queueEvent('gestureStart', {
      scale: event.scale,
      rotation: event.rotation
    })
  }

  private handleGestureChange(event: any): void {
    this.queueEvent('gestureChange', {
      scale: event.scale,
      rotation: event.rotation
    })
  }

  private handleGestureEnd(event: any): void {
    this.queueEvent('gestureEnd', {
      scale: event.scale,
      rotation: event.rotation
    })
  }

  private analyzeTouchGesture(touchPoint: TouchPoint): Gesture | null {
    const deltaX = touchPoint.x - touchPoint.startX
    const deltaY = touchPoint.y - touchPoint.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const duration = Date.now() - touchPoint.startTime
    
    // Tap gesture
    if (distance < this.config.tapThreshold && duration < this.config.longPressThreshold) {
      return {
        type: 'tap',
        data: { x: touchPoint.x, y: touchPoint.y, pressure: touchPoint.pressure },
        confidence: 0.9,
        timestamp: Date.now()
      }
    }
    
    // Long press gesture
    if (distance < this.config.tapThreshold && duration >= this.config.longPressThreshold) {
      return {
        type: 'longPress',
        data: { x: touchPoint.x, y: touchPoint.y, pressure: touchPoint.pressure, duration },
        confidence: 0.8,
        timestamp: Date.now()
      }
    }
    
    // Swipe gesture
    if (distance >= this.config.swipeThreshold) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
      let direction = 'right'
      
      if (angle >= -45 && angle < 45) direction = 'right'
      else if (angle >= 45 && angle < 135) direction = 'down'
      else if (angle >= 135 || angle < -135) direction = 'left'
      else direction = 'up'
      
      return {
        type: 'swipe',
        data: { 
          direction, 
          distance, 
          deltaX, 
          deltaY, 
          duration,
          startX: touchPoint.startX,
          startY: touchPoint.startY,
          endX: touchPoint.x,
          endY: touchPoint.y
        },
        confidence: 0.85,
        timestamp: Date.now()
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
          timestamp: Date.now()
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
          timestamp: Date.now()
        }
        this.gestures.push(doubleTap)
      }
    }
  }

  private processEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()
      if (event) {
        // Use the BaseSystem's emitEvent method with proper typing
        if (this.eventManager) {
          this.eventManager.emit('input', event)
        }
      }
    }
  }

  private cleanupOldGestures(): void {
    const now = Date.now()
    this.gestures = this.gestures.filter(gesture => {
      // Keep gestures for 1 second
      return now - (gesture as any).timestamp < 1000
    })
  }

  // Using BaseSystem's protected emitEvent method
  private queueEvent(type: string, data: any): void {
    const event: InputEvent = {
      type,
      data,
      timestamp: Date.now()
    }
    
    this.eventQueue.push(event)
    
    // Emit to event system if available
    if (this.eventManager) {
      this.eventManager.emit('input', event)
    }
  }

  public getGestures(): Gesture[] {
    return [...this.gestures]
  }

  public getTouchPoints(): TouchPoint[] {
    return Array.from(this.touchPoints.values())
  }

  public isTouchActive(): boolean {
    return this.touchPoints.size > 0
  }

  public enable(): void {
    this.isEnabled = true
  }

  public disable(): void {
    this.isEnabled = false
    this.touchPoints.clear()
    this.gestures = []
    this.eventQueue = []
  }

  public setConfig(config: Partial<InputConfig>): void {
    this.config = { ...this.config, ...config }
  }

  public getConfig(): InputConfig {
    return { ...this.config }
  }
}

export interface InputConfig {
  tapThreshold: number
  longPressThreshold: number
  swipeThreshold: number
  doubleTapDelay: number
  gestureConfidence: number
} 
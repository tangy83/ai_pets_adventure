import { EventManager } from './EventManager'

export interface TouchState {
  activeTouches: Map<number, TouchPoint>
  lastTapTime: number
  tapCount: number
  lastTapPosition: { x: number; y: number } | null
  isMultiTouch: boolean
  touchCount: number
}

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
  isActive: boolean
}

export interface TouchGesture {
  type: 'tap' | 'doubleTap' | 'longPress' | 'swipe' | 'flick' | 'pinch' | 'rotate'
  data: any
  confidence: number
  timestamp: number
  duration: number
}

export interface TouchConfig {
  enableTapTracking: boolean
  enableSwipeTracking: boolean
  enableMultiTouch: boolean
  enableGestureRecognition: boolean
  tapThreshold: number
  doubleTapDelay: number
  longPressThreshold: number
  swipeThreshold: number
  swipeVelocityThreshold: number
  preventDefaultOnGameTouches: boolean
  enableAccessibility: boolean
  minimumTouchTarget: number
}

export class TouchInputHandler {
  private eventManager: EventManager
  private touchState: TouchState
  private config: TouchConfig
  private isEnabled: boolean = true
  private touchPoints: Map<number, TouchPoint> = new Map()
  private gestures: TouchGesture[] = []
  private tapHistory: Array<{ x: number; y: number; timestamp: number }> = []
  private maxTapHistory: number = 10

  constructor(eventManager: EventManager, config: Partial<TouchConfig> = {}) {
    this.eventManager = eventManager
    this.config = {
      enableTapTracking: true,
      enableSwipeTracking: true,
      enableMultiTouch: true,
      enableGestureRecognition: true,
      tapThreshold: 10,
      doubleTapDelay: 300,
      longPressThreshold: 500,
      swipeThreshold: 50,
      swipeVelocityThreshold: 0.5,
      preventDefaultOnGameTouches: true,
      enableAccessibility: true,
      minimumTouchTarget: 44,
      ...config
    }

    this.touchState = {
      activeTouches: new Map(),
      lastTapTime: 0,
      tapCount: 0,
      lastTapPosition: null,
      isMultiTouch: false,
      touchCount: 0
    }

    this.initializeEventListeners()
  }

  private initializeEventListeners(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    window.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    window.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    window.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false })
    window.addEventListener('blur', this.handleWindowBlur.bind(this))
    window.addEventListener('focus', this.handleWindowFocus.bind(this))
    window.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
  }

  private handleTouchStart(event: TouchEvent): void {
    if (!this.isEnabled) return
    if (this.config.preventDefaultOnGameTouches) {
      event.preventDefault()
    }

    const startTime = performance.now()
    const touches: TouchPoint[] = []

    for (const touch of event.changedTouches) {
      const touchPoint: TouchPoint = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: startTime,
        pressure: touch.force || 1.0,
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        isActive: true
      }

      this.touchPoints.set(touch.identifier, touchPoint)
      this.touchState.activeTouches.set(touch.identifier, touchPoint)
      touches.push(touchPoint)
    }

    this.touchState.touchCount = this.touchPoints.size
    this.touchState.isMultiTouch = this.touchPoints.size > 1

    this.emitTouchEvent('touchStart', { touches, timestamp: startTime })
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.isEnabled) return
    if (this.config.preventDefaultOnGameTouches) {
      event.preventDefault()
    }

    const currentTime = performance.now()
    const touches: TouchPoint[] = []

    for (const touch of event.changedTouches) {
      const touchPoint = this.touchPoints.get(touch.identifier)
      if (touchPoint) {
        const deltaTime = currentTime - touchPoint.startTime
        const deltaX = touch.clientX - touchPoint.startX
        const deltaY = touch.clientY - touchPoint.startY

        touchPoint.x = touch.clientX
        touchPoint.y = touch.clientY

        if (deltaTime > 0) {
          touchPoint.velocity = { x: deltaX / deltaTime, y: deltaY / deltaTime }
        }

        touches.push(touchPoint)
      }
    }

    this.emitTouchEvent('touchMove', { touches, timestamp: currentTime })
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isEnabled) return
    if (this.config.preventDefaultOnGameTouches) {
      event.preventDefault()
    }

    const endTime = performance.now()
    const touches: TouchPoint[] = []

    for (const touch of event.changedTouches) {
      const touchPoint = this.touchPoints.get(touch.identifier)
      if (touchPoint) {
        touchPoint.isActive = false
        touches.push(touchPoint)

        if (this.config.enableGestureRecognition) {
          const gesture = this.analyzeTouchGesture(touchPoint, endTime)
          if (gesture) {
            this.gestures.push(gesture)
            this.emitTouchEvent(gesture.type as any, {
              touches: [touchPoint],
              gesture,
              timestamp: endTime
            })
          }
        }

        this.touchPoints.delete(touch.identifier)
        this.touchState.activeTouches.delete(touch.identifier)
      }
    }

    this.touchState.touchCount = this.touchPoints.size
    this.touchState.isMultiTouch = this.touchPoints.size > 1

    this.emitTouchEvent('touchEnd', { touches, timestamp: endTime })
  }

  private handleTouchCancel(event: TouchEvent): void {
    if (!this.isEnabled) return
    if (this.config.preventDefaultOnGameTouches) {
      event.preventDefault()
    }

    const touches: TouchPoint[] = []

    for (const touch of event.changedTouches) {
      const touchPoint = this.touchPoints.get(touch.identifier)
      if (touchPoint) {
        touchPoint.isActive = false
        touches.push(touchPoint)
        this.touchPoints.delete(touch.identifier)
        this.touchState.activeTouches.delete(touch.identifier)
      }
    }

    this.touchState.touchCount = this.touchPoints.size
    this.touchState.isMultiTouch = this.touchPoints.size > 1

    this.emitTouchEvent('touchCancel', { touches, timestamp: performance.now() })
  }

  private analyzeTouchGesture(touchPoint: TouchPoint, endTime: number): TouchGesture | null {
    const deltaX = touchPoint.x - touchPoint.startX
    const deltaY = touchPoint.y - touchPoint.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const duration = endTime - touchPoint.startTime
    const velocity = Math.sqrt(touchPoint.velocity.x ** 2 + touchPoint.velocity.y ** 2)

    if (distance < this.config.tapThreshold && duration < this.config.longPressThreshold) {
      return this.processTap(touchPoint, endTime, duration)
    }

    if (distance >= this.config.swipeThreshold) {
      return this.processSwipe(touchPoint, endTime, duration, distance, deltaX, deltaY, velocity)
    }

    return null
  }

  private processTap(touchPoint: TouchPoint, endTime: number, duration: number): TouchGesture | null {
    const tapData = {
      x: touchPoint.x,
      y: touchPoint.y,
      pressure: touchPoint.pressure,
      velocity: Math.sqrt(touchPoint.velocity.x ** 2 + touchPoint.velocity.y ** 2)
    }

    if (this.touchState.lastTapPosition) {
      const tapDistance = Math.sqrt(
        (touchPoint.x - this.touchState.lastTapPosition.x) ** 2 +
        (touchPoint.y - this.touchState.lastTapPosition.y) ** 2
      )
      const timeDiff = endTime - this.touchState.lastTapTime

      if (tapDistance < this.config.tapThreshold && timeDiff < this.config.doubleTapDelay) {
        this.touchState.tapCount = 2
        this.touchState.lastTapTime = endTime
        this.touchState.lastTapPosition = { x: touchPoint.x, y: touchPoint.y }

        return {
          type: 'doubleTap',
          data: { ...tapData, firstTap: this.touchState.lastTapPosition, timeDiff },
          confidence: 0.95,
          timestamp: endTime,
          duration
        }
      }
    }

    this.touchState.tapCount = 1
    this.touchState.lastTapTime = endTime
    this.touchState.lastTapPosition = { x: touchPoint.x, y: touchPoint.y }

    this.tapHistory.push({ x: touchPoint.x, y: touchPoint.y, timestamp: endTime })
    if (this.tapHistory.length > this.maxTapHistory) {
      this.tapHistory.shift()
    }

    return {
      type: 'tap',
      data: tapData,
      confidence: 0.9,
      timestamp: endTime,
      duration
    }
  }

  private processSwipe(
    touchPoint: TouchPoint,
    endTime: number,
    duration: number,
    distance: number,
    deltaX: number,
    deltaY: number,
    velocity: number
  ): TouchGesture {
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
    let direction = 'right'

    if (angle >= -45 && angle < 45) direction = 'right'
    else if (angle >= 45 && angle < 135) direction = 'down'
    else if (angle >= 135 || angle < -135) direction = 'left'
    else direction = 'up'

    const gestureType = velocity > this.config.swipeVelocityThreshold ? 'flick' : 'swipe'

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

  private handleWindowBlur(): void {
    this.resetTouchState()
  }

  private handleWindowFocus(): void {
    // Touch state can be restored if needed
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.resetTouchState()
    }
  }

  private resetTouchState(): void {
    this.touchPoints.clear()
    this.touchState.activeTouches.clear()
    this.touchState.touchCount = 0
    this.touchState.isMultiTouch = false
  }

  private emitTouchEvent(type: string, data: any): void {
    // Cast to any to bypass type checking for dynamic event types
    (this.eventManager as any).emit(type, data)
  }

  // Public API methods
  public getTouchState(): TouchState {
    return { ...this.touchState }
  }

  public getActiveTouches(): TouchPoint[] {
    return Array.from(this.touchPoints.values())
  }

  public getTouchCount(): number {
    return this.touchPoints.size
  }

  public isMultiTouch(): boolean {
    return this.touchPoints.size > 1
  }

  public isTouchActive(): boolean {
    return this.touchPoints.size > 0
  }

  public getLastTapPosition(): { x: number; y: number } | null {
    return this.touchState.lastTapPosition
  }

  public getTapCount(): number {
    return this.touchState.tapCount
  }

  public getRecentGestures(count: number = 5): TouchGesture[] {
    return this.gestures.slice(-count)
  }

  public getConfig(): TouchConfig {
    return { ...this.config }
  }

  public setConfig(config: Partial<TouchConfig>): void {
    this.config = { ...this.config, ...config }
  }

  public enable(): void {
    this.isEnabled = true
  }

  public disable(): void {
    this.isEnabled = false
    this.resetTouchState()
  }

  public reset(): void {
    this.resetTouchState()
    this.gestures = []
    this.tapHistory = []
    this.touchState.tapCount = 0
    this.touchState.lastTapPosition = null
  }

  public destroy(): void {
    this.disable()
    this.touchPoints.clear()
    this.gestures = []
    this.tapHistory = []
  }
}

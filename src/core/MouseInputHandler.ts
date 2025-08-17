import { EventManager } from './EventManager'

export interface MouseState {
  position: { x: number; y: number }
  buttons: Map<number, boolean>
  wheel: number
  isHovering: boolean
  isDragging: boolean
  dragStart: { x: number; y: number } | null
  dragCurrent: { x: number; y: number } | null
  lastClickTime: number
  clickCount: number
  hoverTarget: string | null
}

export interface MouseConfig {
  enableClickTracking: boolean
  enableDragTracking: boolean
  enableHoverTracking: boolean
  enableWheelTracking: boolean
  clickThreshold: number // pixels
  doubleClickDelay: number // milliseconds
  dragThreshold: number // pixels
  hoverDelay: number // milliseconds
  preventDefaultOnGameButtons: boolean
  enableAccessibility: boolean
}

export interface CustomMouseEvent {
  type: 'click' | 'doubleClick' | 'rightClick' | 'middleClick' | 'dragStart' | 'dragMove' | 'dragEnd' | 'hover' | 'hoverEnd' | 'wheel'
  button: number
  x: number
  y: number
  deltaX?: number
  deltaY?: number
  deltaZ?: number
  timestamp: number
  target?: string
  data?: any
}

export class MouseInputHandler {
  private eventManager: EventManager
  private config: MouseConfig
  private mouseState: MouseState
  private isEnabled: boolean = true
  
  // Timers for hover and click detection
  private hoverTimer: NodeJS.Timeout | null = null
  private clickTimer: NodeJS.Timeout | null = null
  
  // Performance tracking
  private performanceMetrics = {
    eventsProcessed: 0,
    averageProcessingTime: 0,
    lastEventTime: 0
  }

  constructor(eventManager: EventManager, config: Partial<MouseConfig> = {}) {
    this.eventManager = eventManager
    this.config = {
      enableClickTracking: true,
      enableDragTracking: true,
      enableHoverTracking: true,
      enableWheelTracking: true,
      clickThreshold: 5, // 5 pixels
      doubleClickDelay: 300, // 300ms
      dragThreshold: 10, // 10 pixels
      hoverDelay: 150, // 150ms
      preventDefaultOnGameButtons: true,
      enableAccessibility: true,
      ...config
    }
    
    this.mouseState = {
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
    }
    
    this.initializeEventListeners()
  }

  private initializeEventListeners(): void {
    if (typeof window === 'undefined') return

    // Mouse button events
    window.addEventListener('mousedown', this.handleMouseDown.bind(this))
    window.addEventListener('mouseup', this.handleMouseUp.bind(this))
    
    // Mouse movement and hover events
    window.addEventListener('mousemove', this.handleMouseMove.bind(this))
    window.addEventListener('mouseenter', this.handleMouseEnter.bind(this))
    window.addEventListener('mouseleave', this.handleMouseLeave.bind(this))
    
    // Mouse wheel events
    window.addEventListener('wheel', this.handleWheel.bind(this))
    
    // Context menu events
    window.addEventListener('contextmenu', this.handleContextMenu.bind(this))
    
    // Focus and visibility events for better input management
    window.addEventListener('blur', this.handleWindowBlur.bind(this))
    window.addEventListener('focus', this.handleWindowFocus.bind(this))
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.isEnabled) return
    
    const startTime = performance.now()
    
    // Update mouse state
    this.mouseState.buttons.set(event.button, true)
    this.mouseState.position = { x: event.clientX, y: event.clientY }
    
    // Initialize drag state
    if (this.config.enableDragTracking) {
      this.mouseState.dragStart = { x: event.clientX, y: event.clientY }
      this.mouseState.dragCurrent = { x: event.clientX, y: event.clientY }
    }
    
    // Prevent default for game buttons
    if (this.config.preventDefaultOnGameButtons && this.isGameButton(event.button)) {
      event.preventDefault()
    }
    
    // Emit raw mouse down event
    this.emitMouseEvent('mouseDown', {
      button: event.button,
      x: event.clientX,
      y: event.clientY,
      timestamp: startTime
    })
    
    this.updatePerformanceMetrics(startTime)
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isEnabled) return
    
    const startTime = performance.now()
    
    // Update mouse state
    this.mouseState.buttons.set(event.button, false)
    this.mouseState.position = { x: event.clientX, y: event.clientY }
    
    // Handle click detection
    if (this.config.enableClickTracking) {
      this.handleClickDetection(event)
    }
    
    // Handle drag completion
    if (this.config.enableDragTracking && this.mouseState.isDragging) {
      this.handleDragEnd(event)
    }
    
    // Emit raw mouse up event
    this.emitMouseEvent('mouseUp', {
      button: event.button,
      x: event.clientX,
      y: event.clientY,
      timestamp: startTime
    })
    
    this.updatePerformanceMetrics(startTime)
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isEnabled) return
    
    const startTime = performance.now()
    const oldPosition = { ...this.mouseState.position }
    
    // Update mouse position
    this.mouseState.position = { x: event.clientX, y: event.clientY }
    
    // Handle drag movement
    if (this.config.enableDragTracking && this.mouseState.dragStart && this.mouseState.dragCurrent) {
      this.handleDragMove(event)
    }
    
    // Handle hover detection
    if (this.config.enableHoverTracking) {
      this.handleHoverDetection(event)
    }
    
    // Emit mouse move event
    this.emitMouseEvent('mouseMove', {
      x: event.clientX,
      y: event.clientY,
      deltaX: event.clientX - oldPosition.x,
      deltaY: event.clientY - oldPosition.y,
      timestamp: startTime
    })
    
    this.updatePerformanceMetrics(startTime)
  }

  private handleMouseEnter(event: MouseEvent): void {
    if (!this.isEnabled) return
    
    this.mouseState.isHovering = true
    
    // Start hover timer
    if (this.config.enableHoverTracking) {
      this.startHoverTimer(event)
    }
    
    this.emitMouseEvent('mouseEnter', {
      x: event.clientX,
      y: event.clientY,
      timestamp: performance.now()
    })
  }

  private handleMouseLeave(event: MouseEvent): void {
    if (!this.isEnabled) return
    
    this.mouseState.isHovering = false
    
    // Clear hover timer and target
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer)
      this.hoverTimer = null
    }
    
    if (this.mouseState.hoverTarget) {
      this.emitMouseEvent('hoverEnd', {
        x: event.clientX,
        y: event.clientY,
        target: this.mouseState.hoverTarget,
        timestamp: performance.now()
      })
      this.mouseState.hoverTarget = null
    }
    
    this.emitMouseEvent('mouseLeave', {
      x: event.clientX,
      y: event.clientY,
      timestamp: performance.now()
    })
  }

  private handleWheel(event: WheelEvent): void {
    if (!this.isEnabled || !this.config.enableWheelTracking) return
    
    const startTime = performance.now()
    
    // Update wheel state
    this.mouseState.wheel += event.deltaY
    
    // Emit wheel event
    this.emitMouseEvent('wheel', {
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      deltaZ: event.deltaZ,
      timestamp: startTime
    })
    
    this.updatePerformanceMetrics(startTime)
  }

  private handleContextMenu(event: MouseEvent): void {
    if (!this.isEnabled) return
    
    // Prevent default context menu for game buttons
    if (this.config.preventDefaultOnGameButtons && this.isGameButton(event.button)) {
      event.preventDefault()
    }
    
    // Emit right click event
    this.emitMouseEvent('rightClick', {
      button: event.button,
      x: event.clientX,
      y: event.clientY,
      timestamp: performance.now()
    })
  }

  private handleClickDetection(event: MouseEvent): void {
    const currentTime = performance.now()
    const timeSinceLastClick = currentTime - this.mouseState.lastClickTime
    
    // Check if this is a double click
    if (timeSinceLastClick < this.config.doubleClickDelay && 
        this.mouseState.clickCount > 0) {
      this.mouseState.clickCount++
      
      // Emit double click event
      this.emitMouseEvent('doubleClick', {
        button: event.button,
        x: event.clientX,
        y: event.clientY,
        clickCount: this.mouseState.clickCount,
        timestamp: currentTime
      })
      
      // Reset click count
      this.mouseState.clickCount = 0
    } else {
      // Single click
      this.mouseState.clickCount = 1
      
      // Emit single click event
      this.emitMouseEvent('click', {
        button: event.button,
        x: event.clientX,
        y: event.clientY,
        clickCount: 1,
        timestamp: currentTime
      })
    }
    
    this.mouseState.lastClickTime = currentTime
  }

  private handleDragMove(event: MouseEvent): void {
    if (!this.mouseState.dragStart || !this.mouseState.dragCurrent) return
    
    // Update current drag position
    this.mouseState.dragCurrent = { x: event.clientX, y: event.clientY }
    
    // Check if we've moved enough to start dragging
    const distance = Math.sqrt(
      Math.pow(event.clientX - this.mouseState.dragStart.x, 2) +
      Math.pow(event.clientY - this.mouseState.dragStart.y, 2)
    )
    
    if (!this.mouseState.isDragging && distance > this.config.dragThreshold) {
      // Start dragging
      this.mouseState.isDragging = true
      
      this.emitMouseEvent('dragStart', {
        button: this.getActiveButton(),
        x: this.mouseState.dragStart.x,
        y: this.mouseState.dragStart.y,
        timestamp: performance.now()
      })
    }
    
    // Emit drag move event if dragging
    if (this.mouseState.isDragging) {
      this.emitMouseEvent('dragMove', {
        button: this.getActiveButton(),
        x: event.clientX,
        y: event.clientY,
        startX: this.mouseState.dragStart.x,
        startY: this.mouseState.dragStart.y,
        deltaX: event.clientX - this.mouseState.dragStart.x,
        deltaY: event.clientY - this.mouseState.dragStart.y,
        timestamp: performance.now()
      })
    }
  }

  private handleDragEnd(event: MouseEvent): void {
    if (!this.mouseState.dragStart || !this.mouseState.dragCurrent) return
    
    // Emit drag end event
    this.emitMouseEvent('dragEnd', {
      button: this.getActiveButton(),
      x: event.clientX,
      y: event.clientY,
      startX: this.mouseState.dragStart.x,
      startY: this.mouseState.dragStart.y,
      endX: event.clientX,
      endY: event.clientY,
      deltaX: event.clientX - this.mouseState.dragStart.x,
      deltaY: event.clientY - this.mouseState.dragStart.y,
      duration: performance.now() - this.mouseState.lastClickTime,
      timestamp: performance.now()
    })
    
    // Reset drag state
    this.mouseState.isDragging = false
    this.mouseState.dragStart = null
    this.mouseState.dragCurrent = null
  }

  private handleHoverDetection(event: MouseEvent): void {
    // Clear existing hover timer
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer)
    }
    
    // Start new hover timer
    this.startHoverTimer(event)
  }

  private startHoverTimer(event: MouseEvent): void {
    this.hoverTimer = setTimeout(() => {
      // Detect hover target (simplified - in real implementation, you'd use elementFromPoint)
      const target = this.detectHoverTarget(event.clientX, event.clientY)
      
      if (target && target !== this.mouseState.hoverTarget) {
        this.mouseState.hoverTarget = target
        
        // Emit hover event
        this.emitMouseEvent('hover', {
          x: event.clientX,
          y: event.clientY,
          target,
          timestamp: performance.now()
        })
      }
    }, this.config.hoverDelay)
  }

  private detectHoverTarget(x: number, y: number): string | null {
    // In a real implementation, you'd use document.elementFromPoint
    // For now, return a simple identifier
    if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
      const element = document.elementFromPoint(x, y)
      if (element) {
        return element.id || element.className || element.tagName.toLowerCase()
      }
    }
    // Fallback: return a simple identifier based on coordinates
    return `element-${Math.floor(x / 100)}-${Math.floor(y / 100)}`
  }

  private handleWindowBlur(): void {
    // Clear all mouse states when window loses focus
    this.resetMouseState()
  }

  private handleWindowFocus(): void {
    // Reset mouse state when window gains focus
    this.resetMouseState()
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Clear mouse states when page becomes hidden
      this.resetMouseState()
    }
  }

  private resetMouseState(): void {
    this.mouseState.buttons.clear()
    this.mouseState.isDragging = false
    this.mouseState.dragStart = null
    this.mouseState.dragCurrent = null
    this.mouseState.isHovering = false
    this.mouseState.position = { x: 0, y: 0 }
    this.mouseState.wheel = 0
    this.mouseState.lastClickTime = 0
    this.mouseState.clickCount = 0
    this.mouseState.hoverTarget = null
    
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer)
      this.hoverTimer = null
    }
    
    if (this.clickTimer) {
      clearTimeout(this.clickTimer)
      this.clickTimer = null
    }
  }

  private emitMouseEvent(type: string, data: any): void {
    // Emit to event manager
    this.eventManager.emit(type, data)
    
    // Also emit as a general mouse event
    this.eventManager.emit('mouseEvent', {
      type,
      ...data
    })
  }

  private isGameButton(button: number): boolean {
    // Left (0), Right (2), Middle (1) buttons are game buttons
    return button >= 0 && button <= 2
  }

  private getActiveButton(): number {
    for (const [button, isPressed] of this.mouseState.buttons) {
      if (isPressed) return button
    }
    return -1
  }

  private updatePerformanceMetrics(startTime: number): void {
    const processingTime = performance.now() - startTime
    this.performanceMetrics.eventsProcessed++
    this.performanceMetrics.averageProcessingTime = 
      (this.performanceMetrics.averageProcessingTime * (this.performanceMetrics.eventsProcessed - 1) + processingTime) / 
      this.performanceMetrics.eventsProcessed
    this.performanceMetrics.lastEventTime = startTime
  }

  // Public methods for external access
  public getMouseState(): MouseState {
    return { ...this.mouseState }
  }

  public isButtonPressed(button: number): boolean {
    return this.mouseState.buttons.get(button) || false
  }

  public isDragging(): boolean {
    return this.mouseState.isDragging
  }

  public isHovering(): boolean {
    return this.mouseState.isHovering
  }

  public getPosition(): { x: number; y: number } {
    return { ...this.mouseState.position }
  }

  public getDragDistance(): number {
    if (!this.mouseState.dragStart || !this.mouseState.dragCurrent) return 0
    
    return Math.sqrt(
      Math.pow(this.mouseState.dragCurrent.x - this.mouseState.dragStart.x, 2) +
      Math.pow(this.mouseState.dragCurrent.y - this.mouseState.dragStart.y, 2)
    )
  }

  public getDragVector(): { x: number; y: number } {
    if (!this.mouseState.dragStart || !this.mouseState.dragCurrent) {
      return { x: 0, y: 0 }
    }
    
    return {
      x: this.mouseState.dragCurrent.x - this.mouseState.dragStart.x,
      y: this.mouseState.dragCurrent.y - this.mouseState.dragStart.y
    }
  }

  public getPerformanceMetrics() {
    return { ...this.performanceMetrics }
  }

  public enable(): void {
    this.isEnabled = true
  }

  public disable(): void {
    this.isEnabled = false
    this.resetMouseState()
  }

  public reset(): void {
    this.resetMouseState()
    this.performanceMetrics = {
      eventsProcessed: 0,
      averageProcessingTime: 0,
      lastEventTime: 0
    }
  }

  public destroy(): void {
    this.disable()
    
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer)
      this.hoverTimer = null
    }
    
    if (this.clickTimer) {
      clearTimeout(this.clickTimer)
      this.clickTimer = null
    }
  }
}

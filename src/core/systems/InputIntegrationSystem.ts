import { BaseSystem } from './BaseSystem'
import { EventManager } from '../EventManager'
import { InputManager } from '../InputManager'
import { KeyboardInputHandler } from '../KeyboardInputHandler'
import { MouseInputHandler } from '../MouseInputHandler'
import { TouchInputHandler } from '../TouchInputHandler'
import { PlayerController } from '../PlayerController'
import { Player } from '../../entities/Player'

export interface InputIntegrationConfig {
  enableKeyboardInput: boolean
  enableMouseInput: boolean
  enableTouchInput: boolean
  enableAccessibility: boolean
  inputBufferSize: number
  enableInputLogging: boolean
}

export class InputIntegrationSystem extends BaseSystem {
  private eventManager: EventManager
  private inputManager: InputManager
  private keyboardHandler: KeyboardInputHandler
  private mouseHandler: MouseInputHandler
  private touchHandler: TouchInputHandler
  private playerController: PlayerController
  private player: Player
  private config: InputIntegrationConfig
  private isEnabled: boolean = true
  private inputBuffer: Array<{ type: string; data: any; timestamp: number }> = []
  private lastInputTime: number = 0

  // Performance tracking
  private performanceMetrics = {
    inputsProcessed: 0,
    averageProcessingTime: 0,
    inputLatency: 0,
    bufferUtilization: 0
  }

  constructor() {
    super('InputIntegrationSystem', 90) // High priority, after InputSystem
    this.config = {
      enableKeyboardInput: true,
      enableMouseInput: true,
      enableTouchInput: true,
      enableAccessibility: true,
      inputBufferSize: 100,
      enableInputLogging: false
    }
  }

  public setEventManager(eventManager: EventManager): void {
    super.setEventManager(eventManager)
    this.eventManager = eventManager
  }

  public setInputManager(inputManager: InputManager): void {
    this.inputManager = inputManager
  }

  public setPlayer(player: Player): void {
    this.player = player
  }

  public initialize(): void {
    super.initialize()
    
    if (!this.eventManager) {
      throw new Error('EventManager not set')
    }

    if (!this.inputManager) {
      throw new Error('InputManager not set')
    }

    if (!this.player) {
      throw new Error('Player not set')
    }

    // Initialize keyboard handler
    this.keyboardHandler = new KeyboardInputHandler(this.eventManager, {
      enableKeyRepeat: true,
      keyRepeatDelay: 500,
      keyRepeatInterval: 50,
      preventDefaultOnGameKeys: true,
      enableAccessibility: this.config.enableAccessibility
    })

    // Initialize mouse handler
    this.mouseHandler = new MouseInputHandler(this.eventManager, {
      enableClickTracking: true,
      enableDragTracking: true,
      enableHoverTracking: true,
      enableWheelTracking: true,
      clickThreshold: 5,
      doubleClickDelay: 300,
      dragThreshold: 10,
      hoverDelay: 150,
      preventDefaultOnGameButtons: true,
      enableAccessibility: this.config.enableAccessibility
    })

    // Initialize touch handler
    this.touchHandler = new TouchInputHandler(this.eventManager, {
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
      enableAccessibility: this.config.enableAccessibility,
      minimumTouchTarget: 44
    })

    // Initialize player controller
    this.playerController = new PlayerController(
      this.player,
      this.eventManager,
      this.inputManager
    )

    this.setupEventListeners()
    this.setupInputMappings()
    
    console.log('InputIntegrationSystem initialized')
  }

  private setupEventListeners(): void {
    // Listen for game actions from keyboard handler
    this.eventManager.on('gameAction', this.handleGameAction.bind(this))
    this.eventManager.on('gameActionRelease', this.handleGameActionRelease.bind(this))
    
    // Listen for mouse events from mouse handler
    this.eventManager.on('click', this.handleMouseClick.bind(this))
    this.eventManager.on('doubleClick', this.handleMouseDoubleClick.bind(this))
    this.eventManager.on('rightClick', this.handleMouseRightClick.bind(this))
    this.eventManager.on('dragStart', this.handleMouseDragStart.bind(this))
    this.eventManager.on('dragMove', this.handleMouseDragMove.bind(this))
    this.eventManager.on('dragEnd', this.handleMouseDragEnd.bind(this))
    this.eventManager.on('hover', this.handleMouseHover.bind(this))
    this.eventManager.on('hoverEnd', this.handleMouseHoverEnd.bind(this))
    this.eventManager.on('wheel', this.handleMouseWheel.bind(this))
    
    // Listen for touch events from touch handler
    this.eventManager.on('touchStart', this.handleTouchStart.bind(this))
    this.eventManager.on('touchMove', this.handleTouchMove.bind(this))
    this.eventManager.on('touchEnd', this.handleTouchEnd.bind(this))
    this.eventManager.on('touchCancel', this.handleTouchCancel.bind(this))
    this.eventManager.on('tap', this.handleTouchTap.bind(this))
    this.eventManager.on('doubleTap', this.handleTouchDoubleTap.bind(this))
    this.eventManager.on('longPress', this.handleTouchLongPress.bind(this))
    this.eventManager.on('swipe', this.handleTouchSwipe.bind(this))
    this.eventManager.on('flick', this.handleTouchFlick.bind(this))
    
    // Listen for input actions from input manager
    this.eventManager.on('inputAction', this.handleInputAction.bind(this))
    
    // Listen for player events
    this.eventManager.on('playerMovement', this.handlePlayerMovement.bind(this))
    this.eventManager.on('playerJump', this.handlePlayerJump.bind(this))
    this.eventManager.on('playerInteraction', this.handlePlayerInteraction.bind(this))
    this.eventManager.on('playerAttack', this.handlePlayerAttack.bind(this))
    this.eventManager.on('playerSpecialAbility', this.handlePlayerSpecialAbility.bind(this))
    
    // Listen for accessibility events
    this.eventManager.on('accessibilityTabNavigation', this.handleAccessibilityNavigation.bind(this))
    this.eventManager.on('accessibilityElementActivate', this.handleAccessibilityActivation.bind(this))
    this.eventManager.on('accessibilityHelp', this.handleAccessibilityHelp.bind(this))
    
    // Listen for system events
    this.eventManager.on('gamePaused', this.handleGamePaused.bind(this))
    this.eventManager.on('gameResumed', this.handleGameResumed.bind(this))
  }

  private setupInputMappings(): void {
    // The InputManager already has comprehensive mappings
    // We can customize or extend them here if needed
    
    // Set up custom input profiles
    this.setupInputProfiles()
  }

  private setupInputProfiles(): void {
    // Switch to default profile
    this.inputManager.switchProfile('default')
    
    // You can add more profile switching logic here
    // For example, based on user preferences or game state
  }

  private handleGameAction(action: any): void {
    const startTime = performance.now()
    
    if (this.config.enableInputLogging) {
      console.log('Game action received:', action)
    }

    // Add to input buffer
    this.addToInputBuffer('gameAction', action)

    // Process the action based on type
    switch (action.action) {
      case 'moveForward':
      case 'moveBackward':
      case 'moveLeft':
      case 'moveRight':
        this.handleMovementAction(action)
        break
      case 'jump':
        this.handleJumpAction(action)
        break
      case 'interact':
        this.handleInteractionAction(action)
        break
      case 'attack':
        this.handleAttackAction(action)
        break
      case 'special':
        this.handleSpecialAction(action)
        break
      case 'pause':
        this.handlePauseAction(action)
        break
      case 'inventory':
        this.handleInventoryAction(action)
        break
      case 'map':
        this.handleMapAction(action)
        break
      default:
        // Handle unknown actions
        this.handleUnknownAction(action)
        break
    }

    // Update performance metrics
    this.updatePerformanceMetrics(startTime)
  }

  private handleGameActionRelease(action: any): void {
    if (this.config.enableInputLogging) {
      console.log('Game action released:', action)
    }

    // Handle action release (e.g., stop movement)
    switch (action.action) {
      case 'moveForward':
      case 'moveBackward':
      case 'moveLeft':
      case 'moveRight':
        this.handleMovementRelease(action)
        break
    }
  }

  private handleInputAction(action: any): void {
    // This comes from the InputManager and is already processed
    // We can add additional logic here if needed
    
    if (this.config.enableInputLogging) {
      console.log('Input action received:', action)
    }
  }

  private handleMovementAction(action: any): void {
    // Emit movement event
    this.eventManager.emit('playerMovement', {
      direction: this.getDirectionFromAction(action.action),
      isActive: true,
      velocity: this.calculateMovementVelocity(action.action),
      timestamp: action.timestamp
    })
  }

  private handleMovementRelease(action: any): void {
    // Emit movement stop event
    this.eventManager.emit('playerMovement', {
      direction: 'none',
      isActive: false,
      velocity: { x: 0, y: 0 },
      timestamp: action.timestamp
    })
  }

  private handleJumpAction(action: any): void {
    // Emit jump event
    this.eventManager.emit('playerJump', {
      force: 150, // Default jump force
      timestamp: action.timestamp
    })
  }

  private handleInteractionAction(action: any): void {
    // Emit interaction event
    this.eventManager.emit('playerInteraction', {
      type: 'interact',
      timestamp: action.timestamp
    })
  }

  private handleAttackAction(action: any): void {
    // Emit attack event
    this.eventManager.emit('playerAttack', {
      type: 'attack',
      timestamp: action.timestamp
    })
  }

  private handleSpecialAction(action: any): void {
    // Emit special ability event
    this.eventManager.emit('playerSpecialAbility', {
      type: 'special',
      timestamp: action.timestamp
    })
  }

  private handlePauseAction(action: any): void {
    // Emit pause request
    this.eventManager.emit('gamePauseRequested', {
      timestamp: action.timestamp
    })
  }

  private handleInventoryAction(action: any): void {
    // Emit inventory toggle request
    this.eventManager.emit('inventoryToggleRequested', {
      timestamp: action.timestamp
    })
  }

  private handleMapAction(action: any): void {
    // Emit map toggle request
    this.eventManager.emit('mapToggleRequested', {
      timestamp: action.timestamp
    })
  }

  private handleUnknownAction(action: any): void {
    // Log unknown actions for debugging
    if (this.config.enableInputLogging) {
      console.warn('Unknown game action:', action)
    }
  }

  private handlePlayerMovement(event: any): void {
    // Player movement has been processed by PlayerController
    // We can add additional logic here if needed
    
    if (this.config.enableInputLogging) {
      console.log('Player movement:', event)
    }
  }

  private handlePlayerJump(event: any): void {
    // Player jump has been processed by PlayerController
    
    if (this.config.enableInputLogging) {
      console.log('Player jump:', event)
    }
  }

  private handlePlayerInteraction(event: any): void {
    // Player interaction has been processed by PlayerController
    
    if (this.config.enableInputLogging) {
      console.log('Player interaction:', event)
    }
  }

  private handlePlayerAttack(event: any): void {
    // Player attack has been processed by PlayerController
    
    if (this.config.enableInputLogging) {
      console.log('Player attack:', event)
    }
  }

  private handlePlayerSpecialAbility(event: any): void {
    // Player special ability has been processed by PlayerController
    
    if (this.config.enableInputLogging) {
      console.log('Player special ability:', event)
    }
  }

  private handleAccessibilityNavigation(event: any): void {
    // Handle accessibility navigation
    if (this.config.enableInputLogging) {
      console.log('Accessibility navigation:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('accessibilityNavigation', event)
    
    // Process navigation based on direction
    this.processAccessibilityNavigation(event)
    
    this.eventManager.emit('accessibilityNavigation', {
      type: 'tab',
      direction: event.direction,
      timestamp: event.timestamp
    })
  }

  private handleAccessibilityActivation(event: any): void {
    // Handle accessibility element activation
    if (this.config.enableInputLogging) {
      console.log('Accessibility activation:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('accessibilityActivation', event)
    
    // Process activation
    this.processAccessibilityActivation(event)
    
    this.eventManager.emit('accessibilityElementActivate', {
      type: 'keyboard',
      key: event.key,
      timestamp: event.timestamp
    })
  }

  private handleAccessibilityHelp(event: any): void {
    // Handle accessibility help request
    if (this.config.enableInputLogging) {
      console.log('Accessibility help requested:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('accessibilityHelp', event)
    
    // Show accessibility help
    this.showAccessibilityHelp()
    
    this.eventManager.emit('accessibilityHelp', {
      type: 'keyboard',
      timestamp: event.timestamp
    })
  }

  private processAccessibilityNavigation(event: any): void {
    const { direction, elementId } = event
    
    // Handle different navigation directions
    switch (direction) {
      case 'next':
        this.navigateToNextFocusableElement()
        break
      case 'previous':
        this.navigateToPreviousFocusableElement()
        break
      case 'first':
        this.navigateToFirstFocusableElement()
        break
      case 'last':
        this.navigateToLastFocusableElement()
        break
      case 'up':
        this.navigateInDirection('up')
        break
      case 'down':
        this.navigateInDirection('down')
        break
      case 'left':
        this.navigateInDirection('left')
        break
      case 'right':
        this.navigateInDirection('right')
        break
    }
  }

  private processAccessibilityActivation(event: any): void {
    const { key, elementId } = event
    
    // Handle different activation keys
    switch (key) {
      case 'Enter':
      case ' ':
        this.activateFocusedElement()
        break
      case 'F2':
        this.toggleAccessibilityMenu()
        break
      case 'F6':
        this.cycleNavigationMode()
        break
      case 'Home':
        this.navigateToFirstFocusableElement()
        break
      case 'End':
        this.navigateToLastFocusableElement()
        break
      case 'PageUp':
        this.navigatePageUp()
        break
      case 'PageDown':
        this.navigatePageDown()
        break
    }
  }

  private navigateToNextFocusableElement(): void {
    // Implementation for navigating to next focusable element
    this.eventManager.emit('accessibilityFocusChange', {
      direction: 'next',
      timestamp: performance.now()
    })
  }

  private navigateToPreviousFocusableElement(): void {
    // Implementation for navigating to previous focusable element
    this.eventManager.emit('accessibilityFocusChange', {
      direction: 'previous',
      timestamp: performance.now()
    })
  }

  private navigateToFirstFocusableElement(): void {
    // Implementation for navigating to first focusable element
    this.eventManager.emit('accessibilityFocusChange', {
      direction: 'first',
      timestamp: performance.now()
    })
  }

  private navigateToLastFocusableElement(): void {
    // Implementation for navigating to last focusable element
    this.eventManager.emit('accessibilityFocusChange', {
      direction: 'last',
      timestamp: performance.now()
    })
  }

  private navigateInDirection(direction: string): void {
    // Implementation for directional navigation
    this.eventManager.emit('accessibilityFocusChange', {
      direction,
      timestamp: performance.now()
    })
  }

  private activateFocusedElement(): void {
    // Implementation for activating the currently focused element
    this.eventManager.emit('accessibilityElementActivate', {
      method: 'keyboard',
      timestamp: performance.now()
    })
  }

  private toggleAccessibilityMenu(): void {
    // Implementation for toggling accessibility menu
    this.eventManager.emit('accessibilityMenuToggle', {
      isVisible: true,
      timestamp: performance.now()
    })
  }

  private cycleNavigationMode(): void {
    // Implementation for cycling through navigation modes
    this.eventManager.emit('accessibilityNavigationModeChange', {
      timestamp: performance.now()
    })
  }

  private navigatePageUp(): void {
    // Implementation for page up navigation
    this.eventManager.emit('accessibilityPageNavigation', {
      direction: 'up',
      timestamp: performance.now()
    })
  }

  private navigatePageDown(): void {
    // Implementation for page down navigation
    this.eventManager.emit('accessibilityPageNavigation', {
      direction: 'down',
      timestamp: performance.now()
    })
  }

  private showAccessibilityHelp(): void {
    // Implementation for showing accessibility help
    this.eventManager.emit('accessibilityHelpDisplay', {
      isVisible: true,
      timestamp: performance.now()
    })
  }

  private handleGamePaused(): void {
    // Disable input processing when game is paused
    this.isEnabled = false
    this.keyboardHandler.disable()
    this.playerController.disable()
  }

  private handleGameResumed(): void {
    // Re-enable input processing when game is resumed
    this.isEnabled = true
    this.keyboardHandler.enable()
    this.playerController.enable()
  }

  // Mouse Event Handlers
  private handleMouseClick(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Mouse click:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('mouseClick', event)
    
    // Handle click based on position and context
    this.handleMouseAction('click', event)
  }

  private handleMouseDoubleClick(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Mouse double click:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('mouseDoubleClick', event)
    
    // Handle double click (e.g., select all, special actions)
    this.handleMouseAction('doubleClick', event)
  }

  private handleMouseRightClick(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Mouse right click:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('mouseRightClick', event)
    
    // Handle right click (e.g., context menu, secondary actions)
    this.handleMouseAction('rightClick', event)
  }

  private handleMouseDragStart(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Mouse drag start:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('mouseDragStart', event)
    
    // Handle drag start (e.g., select, grab, start drawing)
    this.handleMouseAction('dragStart', event)
  }

  private handleMouseDragMove(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Mouse drag move:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('mouseDragMove', event)
    
    // Handle drag move (e.g., selection, drawing, moving objects)
    this.handleMouseAction('dragMove', event)
  }

  private handleMouseDragEnd(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Mouse drag end:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('mouseDragEnd', event)
    
    // Handle drag end (e.g., complete selection, finish drawing)
    this.handleMouseAction('dragEnd', event)
  }

  private handleMouseHover(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Mouse hover:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('mouseHover', event)
    
    // Handle hover (e.g., show tooltips, highlight elements)
    this.handleMouseAction('hover', event)
  }

  private handleMouseHoverEnd(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Mouse hover end:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('mouseHoverEnd', event)
    
    // Handle hover end (e.g., hide tooltips, remove highlights)
    this.handleMouseAction('hoverEnd', event)
  }

  private handleMouseWheel(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Mouse wheel:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('mouseWheel', event)
    
    // Handle wheel (e.g., zoom, scroll, change tools)
    this.handleMouseAction('wheel', event)
  }

  // Touch Event Handlers
  private handleTouchStart(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Touch start:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('touchStart', event)
    
    // Handle touch start (e.g., begin interaction, start gesture)
    this.handleTouchAction('touchStart', event)
  }

  private handleTouchMove(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Touch move:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('touchMove', event)
    
    // Handle touch move (e.g., gesture continuation, dragging)
    this.handleTouchAction('touchMove', event)
  }

  private handleTouchEnd(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Touch end:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('touchEnd', event)
    
    // Handle touch end (e.g., complete interaction, finalize gesture)
    this.handleTouchAction('touchEnd', event)
  }

  private handleTouchCancel(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Touch cancel:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('touchCancel', event)
    
    // Handle touch cancel (e.g., abort interaction, reset state)
    this.handleTouchAction('touchCancel', event)
  }

  private handleTouchTap(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Touch tap:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('touchTap', event)
    
    // Handle tap (e.g., select, activate, interact)
    this.handleTouchAction('tap', event)
  }

  private handleTouchDoubleTap(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Touch double tap:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('touchDoubleTap', event)
    
    // Handle double tap (e.g., zoom, special actions)
    this.handleTouchAction('doubleTap', event)
  }

  private handleTouchLongPress(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Touch long press:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('touchLongPress', event)
    
    // Handle long press (e.g., context menu, secondary actions)
    this.handleTouchAction('longPress', event)
  }

  private handleTouchSwipe(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Touch swipe:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('touchSwipe', event)
    
    // Handle swipe (e.g., navigation, scrolling, gestures)
    this.handleTouchAction('swipe', event)
  }

  private handleTouchFlick(event: any): void {
    if (this.config.enableInputLogging) {
      console.log('Touch flick:', event)
    }
    
    // Add to input buffer
    this.addToInputBuffer('touchFlick', event)
    
    // Handle flick (e.g., fast navigation, momentum scrolling)
    this.handleTouchAction('flick', event)
  }

  private handleMouseAction(action: string, event: any): void {
    // Process mouse actions based on game context
    switch (action) {
      case 'click':
        // Handle single click actions
        this.processMouseClick(event)
        break
      case 'doubleClick':
        // Handle double click actions
        this.processMouseDoubleClick(event)
        break
      case 'rightClick':
        // Handle right click actions
        this.processMouseRightClick(event)
        break
      case 'dragStart':
        // Handle drag start actions
        this.processMouseDragStart(event)
        break
      case 'dragMove':
        // Handle drag move actions
        this.processMouseDragMove(event)
        break
      case 'dragEnd':
        // Handle drag end actions
        this.processMouseDragEnd(event)
        break
      case 'hover':
        // Handle hover actions
        this.processMouseHover(event)
        break
      case 'hoverEnd':
        // Handle hover end actions
        this.processMouseHoverEnd(event)
        break
      case 'wheel':
        // Handle wheel actions
        this.processMouseWheel(event)
        break
    }
  }

  private handleTouchAction(action: string, event: any): void {
    // Process touch actions based on game context
    switch (action) {
      case 'touchStart':
        // Handle touch start actions
        this.processTouchStart(event)
        break
      case 'touchMove':
        // Handle touch move actions
        this.processTouchMove(event)
        break
      case 'touchEnd':
        // Handle touch end actions
        this.processTouchEnd(event)
        break
      case 'touchCancel':
        // Handle touch cancel actions
        this.processTouchCancel(event)
        break
      case 'tap':
        // Handle tap actions
        this.processTouchTap(event)
        break
      case 'doubleTap':
        // Handle double tap actions
        this.processTouchDoubleTap(event)
        break
      case 'longPress':
        // Handle long press actions
        this.processTouchLongPress(event)
        break
      case 'swipe':
        // Handle swipe actions
        this.processTouchSwipe(event)
        break
      case 'flick':
        // Handle flick actions
        this.processTouchFlick(event)
        break
    }
  }

  private processMouseClick(event: any): void {
    // Process single click based on position and game state
    // This could trigger interactions, selections, etc.
    this.eventManager.emit('mouseClickProcessed', {
      action: 'click',
      position: { x: event.x, y: event.y },
      button: event.button,
      timestamp: event.timestamp
    })
  }

  private processMouseDoubleClick(event: any): void {
    // Process double click (e.g., select all, special actions)
    this.eventManager.emit('mouseDoubleClickProcessed', {
      action: 'doubleClick',
      position: { x: event.x, y: event.y },
      button: event.button,
      timestamp: event.timestamp
    })
  }

  private processMouseRightClick(event: any): void {
    // Process right click (e.g., context menu, secondary actions)
    this.eventManager.emit('mouseRightClickProcessed', {
      action: 'rightClick',
      position: { x: event.x, y: event.y },
      button: event.button,
      timestamp: event.timestamp
    })
  }

  private processMouseDragStart(event: any): void {
    // Process drag start (e.g., begin selection, start drawing)
    this.eventManager.emit('mouseDragStartProcessed', {
      action: 'dragStart',
      position: { x: event.x, y: event.y },
      startPosition: { x: event.startX, y: event.startY },
      button: event.button,
      timestamp: event.timestamp
    })
  }

  private processMouseDragMove(event: any): void {
    // Process drag move (e.g., update selection, continue drawing)
    this.eventManager.emit('mouseDragMoveProcessed', {
      action: 'dragMove',
      position: { x: event.x, y: event.y },
      startPosition: { x: event.startX, y: event.startY },
      delta: { x: event.deltaX, y: event.deltaY },
      button: event.button,
      timestamp: event.timestamp
    })
  }

  private processMouseDragEnd(event: any): void {
    // Process drag end (e.g., complete selection, finish drawing)
    this.eventManager.emit('mouseDragEndProcessed', {
      action: 'dragEnd',
      position: { x: event.x, y: event.y },
      startPosition: { x: event.startX, y: event.startY },
      endPosition: { x: event.endX, y: event.y },
      delta: { x: event.deltaX, y: event.deltaY },
      duration: event.duration,
      button: event.button,
      timestamp: event.timestamp
    })
  }

  private processMouseHover(event: any): void {
    // Process hover (e.g., show tooltips, highlight elements)
    this.eventManager.emit('mouseHoverProcessed', {
      action: 'hover',
      position: { x: event.x, y: event.y },
      target: event.target,
      timestamp: event.timestamp
    })
  }

  private processMouseHoverEnd(event: any): void {
    // Process hover end (e.g., hide tooltips, remove highlights)
    this.eventManager.emit('mouseHoverEndProcessed', {
      action: 'hoverEnd',
      position: { x: event.x, y: event.y },
      target: event.target,
      timestamp: event.timestamp
    })
  }

  private processMouseWheel(event: any): void {
    // Process wheel (e.g., zoom, scroll, change tools)
    this.eventManager.emit('mouseWheelProcessed', {
      action: 'wheel',
      delta: { x: event.deltaX, y: event.deltaY, z: event.deltaZ },
      timestamp: event.timestamp
    })
  }

  // Touch Processing Methods
  private processTouchStart(event: any): void {
    // Process touch start (e.g., begin interaction, start gesture)
    this.eventManager.emit('touchStartProcessed', {
      action: 'touchStart',
      touches: event.touches,
      timestamp: event.timestamp
    })
  }

  private processTouchMove(event: any): void {
    // Process touch move (e.g., gesture continuation, dragging)
    this.eventManager.emit('touchMoveProcessed', {
      action: 'touchMove',
      touches: event.touches,
      timestamp: event.timestamp
    })
  }

  private processTouchEnd(event: any): void {
    // Process touch end (e.g., complete interaction, finalize gesture)
    this.eventManager.emit('touchEndProcessed', {
      action: 'touchEnd',
      touches: event.touches,
      timestamp: event.timestamp
    })
  }

  private processTouchCancel(event: any): void {
    // Process touch cancel (e.g., abort interaction, reset state)
    this.eventManager.emit('touchCancelProcessed', {
      action: 'touchCancel',
      timestamp: event.timestamp
    })
  }

  private processTouchTap(event: any): void {
    // Process tap (e.g., select, activate, interact)
    this.eventManager.emit('touchTapProcessed', {
      action: 'tap',
      position: { x: event.data?.x, y: event.data?.y },
      pressure: event.data?.pressure,
      timestamp: event.timestamp
    })
  }

  private processTouchDoubleTap(event: any): void {
    // Process double tap (e.g., zoom, special actions)
    this.eventManager.emit('touchDoubleTapProcessed', {
      action: 'doubleTap',
      position: { x: event.data?.x, y: event.data?.y },
      timeDiff: event.data?.timeDiff,
      timestamp: event.timestamp
    })
  }

  private processTouchLongPress(event: any): void {
    // Process long press (e.g., context menu, secondary actions)
    this.eventManager.emit('touchLongPressProcessed', {
      action: 'longPress',
      position: { x: event.data?.x, y: event.data?.y },
      duration: event.data?.duration,
      timestamp: event.timestamp
    })
  }

  private processTouchSwipe(event: any): void {
    // Process swipe (e.g., navigation, scrolling, gestures)
    this.eventManager.emit('touchSwipeProcessed', {
      action: 'swipe',
      direction: event.data?.direction,
      distance: event.data?.distance,
      startPosition: { x: event.data?.startX, y: event.data?.startY },
      endPosition: { x: event.data?.endX, y: event.data?.endY },
      duration: event.data?.duration,
      timestamp: event.timestamp
    })
  }

  private processTouchFlick(event: any): void {
    // Process flick (e.g., fast navigation, momentum scrolling)
    this.eventManager.emit('touchFlickProcessed', {
      action: 'flick',
      direction: event.data?.direction,
      velocity: event.data?.velocity,
      startPosition: { x: event.data?.startX, y: event.data?.startY },
      endPosition: { x: event.data?.endX, y: event.data?.endY },
      duration: event.data?.duration,
      timestamp: event.timestamp
    })
  }

  private getDirectionFromAction(action: string): 'up' | 'down' | 'left' | 'right' | 'none' {
    switch (action) {
      case 'moveForward': return 'up'
      case 'moveBackward': return 'down'
      case 'moveLeft': return 'left'
      case 'moveRight': return 'right'
      default: return 'none'
    }
  }

  private calculateMovementVelocity(direction: string): { x: number; y: number } {
    const speed = 100 // pixels per second
    switch (direction) {
      case 'moveForward': return { x: 0, y: -speed }
      case 'moveBackward': return { x: 0, y: speed }
      case 'moveLeft': return { x: -speed, y: 0 }
      case 'moveRight': return { x: speed, y: 0 }
      default: return { x: 0, y: 0 }
    }
  }

  private addToInputBuffer(type: string, data: any): void {
    this.inputBuffer.push({
      type,
      data,
      timestamp: performance.now()
    })

    // Maintain buffer size
    if (this.inputBuffer.length > this.config.inputBufferSize) {
      this.inputBuffer.shift()
    }
  }

  private updatePerformanceMetrics(startTime: number): void {
    const processingTime = performance.now() - startTime
    this.performanceMetrics.inputsProcessed++
    this.performanceMetrics.averageProcessingTime = 
      (this.performanceMetrics.averageProcessingTime * (this.performanceMetrics.inputsProcessed - 1) + processingTime) / 
      this.performanceMetrics.inputsProcessed
    this.performanceMetrics.inputLatency = processingTime
    this.performanceMetrics.bufferUtilization = this.inputBuffer.length / this.config.inputBufferSize
  }

  public update(deltaTime: number): void {
    if (!this.isEnabled) return

    // Update player controller
    this.playerController.update(deltaTime)

    // Process input buffer
    this.processInputBuffer()

    // Update last input time
    this.lastInputTime = performance.now()
  }

  private processInputBuffer(): void {
    // Process any remaining input in the buffer
    while (this.inputBuffer.length > 0) {
      const input = this.inputBuffer.shift()
      if (input) {
        // Process the input if needed
        // Most inputs are processed immediately, but some might need buffering
      }
    }
  }

  // Public API methods
  public getKeyboardHandler(): KeyboardInputHandler {
    return this.keyboardHandler
  }

  public getMouseHandler(): MouseInputHandler {
    return this.mouseHandler
  }

  public getTouchHandler(): TouchInputHandler {
    return this.touchHandler
  }

  public getPlayerController(): PlayerController {
    return this.playerController
  }

  public getInputBuffer() {
    return [...this.inputBuffer]
  }

  public getPerformanceMetrics() {
    return { ...this.performanceMetrics }
  }

  public getConfig(): InputIntegrationConfig {
    return { ...this.config }
  }

  public setConfig(config: Partial<InputIntegrationConfig>): void {
    this.config = { ...this.config, ...config }
    
    // Apply configuration changes
    if (this.keyboardHandler) {
      this.keyboardHandler.setConfig({
        enableAccessibility: this.config.enableAccessibility
      })
    }
  }

  public enable(): void {
    this.isEnabled = true
    if (this.keyboardHandler) this.keyboardHandler.enable()
    if (this.mouseHandler) this.mouseHandler.enable()
    if (this.touchHandler) this.touchHandler.enable()
    if (this.playerController) this.playerController.enable()
  }

  public disable(): void {
    this.isEnabled = false
    if (this.keyboardHandler) this.keyboardHandler.disable()
    if (this.mouseHandler) this.mouseHandler.disable()
    if (this.touchHandler) this.touchHandler.disable()
    if (this.playerController) this.playerController.disable()
  }

  public reset(): void {
    this.inputBuffer = []
    this.lastInputTime = 0
    this.performanceMetrics = {
      inputsProcessed: 0,
      averageProcessingTime: 0,
      inputLatency: 0,
      bufferUtilization: 0
    }
    
    if (this.keyboardHandler) this.keyboardHandler.reset()
    if (this.mouseHandler) this.mouseHandler.reset()
    if (this.touchHandler) this.touchHandler.reset()
    if (this.playerController) this.playerController.reset()
  }

  public destroy(): void {
    this.disable()
    
    if (this.keyboardHandler) this.keyboardHandler.destroy()
    if (this.playerController) this.playerController.destroy()
    
    super.destroy()
  }
}

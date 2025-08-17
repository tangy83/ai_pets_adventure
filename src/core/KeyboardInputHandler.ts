import { EventManager } from './EventManager'

export interface KeyboardState {
  keys: Map<string, boolean>
  modifiers: {
    ctrl: boolean
    shift: boolean
    alt: boolean
    meta: boolean
  }
  lastKeyPressed: string | null
  lastKeyReleased: string | null
  keyPressTime: number
}

export interface KeyboardConfig {
  enableKeyRepeat: boolean
  keyRepeatDelay: number
  keyRepeatInterval: number
  preventDefaultOnGameKeys: boolean
  enableAccessibility: boolean
}

export class KeyboardInputHandler {
  private eventManager: EventManager
  private keyboardState: KeyboardState
  private config: KeyboardConfig
  private isEnabled: boolean = true
  private keyRepeatTimers: Map<string, NodeJS.Timeout> = new Map()
  private keyPressHistory: Array<{ key: string; timestamp: number }> = []
  private maxHistorySize: number = 100

  // Game-specific key mappings
  private gameKeyMappings = {
    // Movement keys
    movement: {
      'KeyW': 'moveForward',
      'KeyS': 'moveBackward',
      'KeyA': 'moveLeft',
      'KeyD': 'moveRight',
      'ArrowUp': 'moveForward',
      'ArrowDown': 'moveBackward',
      'ArrowLeft': 'moveLeft',
      'ArrowRight': 'moveRight'
    },
    // Action keys
    actions: {
      'Space': 'jump',
      'Enter': 'interact',
      'KeyE': 'interact',
      'KeyF': 'attack',
      'KeyQ': 'special'
    },
    // UI keys
    ui: {
      'Escape': 'pause',
      'Tab': 'inventory',
      'KeyI': 'inventory',
      'KeyM': 'map'
    },
    // Accessibility keys
    accessibility: {
      'F1': 'help',
      'F2': 'accessibility',
      'F3': 'highContrast',
      'F4': 'reducedMotion'
    }
  }

  constructor(eventManager: EventManager, config: Partial<KeyboardConfig> = {}) {
    this.eventManager = eventManager
    this.config = {
      enableKeyRepeat: true,
      keyRepeatDelay: 500,
      keyRepeatInterval: 50,
      preventDefaultOnGameKeys: true,
      enableAccessibility: true,
      ...config
    }

    this.keyboardState = {
      keys: new Map(),
      modifiers: {
        ctrl: false,
        shift: false,
        alt: false,
        meta: false
      },
      lastKeyPressed: null,
      lastKeyReleased: null,
      keyPressTime: 0
    }

    this.initializeEventListeners()
  }

  private initializeEventListeners(): void {
    if (typeof window === 'undefined') return

    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this))
    window.addEventListener('keyup', this.handleKeyUp.bind(this))
    window.addEventListener('keypress', this.handleKeyPress.bind(this))

    // Focus events for accessibility
    window.addEventListener('blur', this.handleWindowBlur.bind(this))
    window.addEventListener('focus', this.handleWindowFocus.bind(this))

    // Visibility change events
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return

    const keyCode = event.code
    const key = event.key
    const timestamp = performance.now()

    // Update keyboard state
    this.keyboardState.keys.set(keyCode, true)
    this.keyboardState.lastKeyPressed = keyCode
    this.keyboardState.keyPressTime = timestamp

    // Update modifier keys
    this.updateModifierKeys(event)

    // Add to key press history
    this.addToKeyHistory(keyCode, timestamp)

    // Check if this is a game key
    const gameAction = this.getGameAction(keyCode)
    if (gameAction) {
      // Prevent default behavior for game keys if configured
      if (this.config.preventDefaultOnGameKeys) {
        event.preventDefault()
      }

      // Emit game action event
      this.emitGameAction(gameAction, {
        key: key,
        code: keyCode,
        modifiers: { ...this.keyboardState.modifiers },
        timestamp
      })

      // Start key repeat if enabled
      if (this.config.enableKeyRepeat && !event.repeat) {
        this.startKeyRepeat(keyCode, gameAction)
      }
    }

    // Emit raw key down event
    this.eventManager.emit('keyDown', {
      key,
      code: keyCode,
      modifiers: { ...this.keyboardState.modifiers },
      repeat: event.repeat,
      timestamp
    })

    // Handle accessibility features
    if (this.config.enableAccessibility) {
      this.handleAccessibilityKeyDown(event)
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.isEnabled) return

    const keyCode = event.code
    const key = event.key
    const timestamp = performance.now()

    // Update keyboard state
    this.keyboardState.keys.set(keyCode, false)
    this.keyboardState.lastKeyReleased = keyCode

    // Update modifier keys
    this.updateModifierKeys(event)

    // Check if this is a game key
    const gameAction = this.getGameAction(keyCode)
    if (gameAction) {
      // Emit game action release event
      this.emitGameActionRelease(gameAction, {
        key,
        code: keyCode,
        modifiers: { ...this.keyboardState.modifiers },
        timestamp
      })

      // Stop key repeat
      this.stopKeyRepeat(keyCode)
    }

    // Emit raw key up event
    this.eventManager.emit('keyUp', {
      key,
      code: keyCode,
      modifiers: { ...this.keyboardState.modifiers },
      timestamp
    })
  }

  private handleKeyPress(event: KeyboardEvent): void {
    if (!this.isEnabled) return

    const key = event.key
    const keyCode = event.code
    const timestamp = performance.now()

    // Emit key press event (useful for character input)
    this.eventManager.emit('keyPress', {
      key,
      keyCode,
      timestamp
    })

    // Handle accessibility features
    if (this.config.enableAccessibility) {
      this.handleAccessibilityKeyPress(event)
    }
  }

  private handleWindowBlur(): void {
    // Clear all key states when window loses focus
    this.clearKeyStates()
    this.eventManager.emit('keyboardBlur', { timestamp: performance.now() })
  }

  private handleWindowFocus(): void {
    this.eventManager.emit('keyboardFocus', { timestamp: performance.now() })
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.clearKeyStates()
      this.eventManager.emit('keyboardHidden', { timestamp: performance.now() })
    } else {
      this.eventManager.emit('keyboardVisible', { timestamp: performance.now() })
    }
  }

  private updateModifierKeys(event: KeyboardEvent): void {
    this.keyboardState.modifiers.ctrl = event.ctrlKey
    this.keyboardState.modifiers.shift = event.shiftKey
    this.keyboardState.modifiers.alt = event.altKey
    this.keyboardState.modifiers.meta = event.metaKey
  }

  private getGameAction(keyCode: string): string | null {
    // Check movement keys
    if (keyCode in this.gameKeyMappings.movement) {
      return this.gameKeyMappings.movement[keyCode as keyof typeof this.gameKeyMappings.movement]
    }

    // Check action keys
    if (keyCode in this.gameKeyMappings.actions) {
      return this.gameKeyMappings.actions[keyCode as keyof typeof this.gameKeyMappings.actions]
    }

    // Check UI keys
    if (keyCode in this.gameKeyMappings.ui) {
      return this.gameKeyMappings.ui[keyCode as keyof typeof this.gameKeyMappings.ui]
    }

    // Check accessibility keys
    if (keyCode in this.gameKeyMappings.accessibility) {
      return this.gameKeyMappings.accessibility[keyCode as keyof typeof this.gameKeyMappings.accessibility]
    }

    return null
  }

  private emitGameAction(action: string, data: any): void {
    this.eventManager.emit('gameAction', {
      action,
      ...data
    })
  }

  private emitGameActionRelease(action: string, data: any): void {
    this.eventManager.emit('gameActionRelease', {
      action,
      ...data
    })
  }

  private startKeyRepeat(keyCode: string, action: string): void {
    if (this.keyRepeatTimers.has(keyCode)) return

    const timer = setTimeout(() => {
      this.repeatKey(keyCode, action)
    }, this.config.keyRepeatDelay)

    this.keyRepeatTimers.set(keyCode, timer)
  }

  private stopKeyRepeat(keyCode: string): void {
    const timer = this.keyRepeatTimers.get(keyCode)
    if (timer) {
      clearTimeout(timer)
      this.keyRepeatTimers.delete(keyCode)
    }
  }

  private repeatKey(keyCode: string, action: string): void {
    if (!this.keyboardState.keys.get(keyCode)) return

    // Emit repeated game action
    this.emitGameAction(action, {
      key: keyCode,
      code: keyCode,
      modifiers: { ...this.keyboardState.modifiers },
      timestamp: performance.now(),
      repeat: true
    })

    // Continue repeating
    const timer = setTimeout(() => {
      this.repeatKey(keyCode, action)
    }, this.config.keyRepeatInterval)

    this.keyRepeatTimers.set(keyCode, timer)
  }

  private handleAccessibilityKeyDown(event: KeyboardEvent): void {
    // Handle accessibility-specific key combinations
    switch (event.code) {
      case 'Tab':
        // Tab navigation
        this.eventManager.emit('accessibilityTabNavigation', {
          direction: event.shiftKey ? 'backward' : 'forward',
          elementId: 'current-focus'
        })
        break
      case 'Enter':
      case 'Space':
        // Element activation
        if (this.keyboardState.modifiers.alt) {
                  this.eventManager.emit('accessibilityElementActivate', {
          elementId: 'current-focus',
          timestamp: performance.now()
        })
        }
        break
      case 'F1':
        // Help system
              this.eventManager.emit('accessibilityHelp', {
        context: 'keyboard',
        elementId: 'current-focus'
      })
        break
    }
  }

  private handleAccessibilityKeyPress(event: KeyboardEvent): void {
    // Handle character-based accessibility features
    if (event.key === 'h' || event.key === 'H') {
      this.eventManager.emit('accessibilityHotkey', {
        key: event.key,
        elementId: 'current-focus'
      })
    }
  }

  private addToKeyHistory(keyCode: string, timestamp: number): void {
    this.keyPressHistory.push({ key: keyCode, timestamp })
    
    // Maintain history size
    if (this.keyPressHistory.length > this.maxHistorySize) {
      this.keyPressHistory.shift()
    }
  }

  private clearKeyStates(): void {
    this.keyboardState.keys.clear()
    this.keyboardState.modifiers = {
      ctrl: false,
      shift: false,
      alt: false,
      meta: false
    }
    
    // Stop all key repeat timers
    this.keyRepeatTimers.forEach(timer => clearTimeout(timer))
    this.keyRepeatTimers.clear()
  }

  // Public API methods
  public isKeyPressed(keyCode: string): boolean {
    return this.keyboardState.keys.get(keyCode) || false
  }

  public isModifierPressed(modifier: keyof KeyboardState['modifiers']): boolean {
    return this.keyboardState.modifiers[modifier]
  }

  public getKeyboardState(): KeyboardState {
    return {
      keys: new Map(this.keyboardState.keys),
      modifiers: { ...this.keyboardState.modifiers },
      lastKeyPressed: this.keyboardState.lastKeyPressed,
      lastKeyReleased: this.keyboardState.lastKeyReleased,
      keyPressTime: this.keyboardState.keyPressTime
    }
  }

  public getKeyPressHistory(): Array<{ key: string; timestamp: number }> {
    return [...this.keyPressHistory]
  }

  public getActiveKeys(): string[] {
    return Array.from(this.keyboardState.keys.entries())
      .filter(([_, isPressed]) => isPressed)
      .map(([keyCode, _]) => keyCode)
  }

  public getConfig(): KeyboardConfig {
    return { ...this.config }
  }

  public setConfig(config: Partial<KeyboardConfig>): void {
    this.config = { ...this.config, ...config }
  }

  public enable(): void {
    this.isEnabled = true
  }

  public disable(): void {
    this.isEnabled = false
    this.clearKeyStates()
  }

  public reset(): void {
    this.clearKeyStates()
    this.keyPressHistory = []
    this.keyboardState.lastKeyPressed = null
    this.keyboardState.lastKeyReleased = null
    this.keyboardState.keyPressTime = 0
  }

  public destroy(): void {
    this.disable()
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown.bind(this))
      window.removeEventListener('keyup', this.handleKeyUp.bind(this))
      window.removeEventListener('keypress', this.handleKeyPress.bind(this))
      window.removeEventListener('blur', this.handleWindowBlur.bind(this))
      window.removeEventListener('focus', this.handleWindowFocus.bind(this))
    }

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    }

    // Clear all timers
    this.keyRepeatTimers.forEach(timer => clearTimeout(timer))
    this.keyRepeatTimers.clear()
  }

  // Utility methods for game integration
  public getMovementVector(): { x: number; y: number } {
    let x = 0
    let y = 0

    if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) y -= 1
    if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) y += 1
    if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) x -= 1
    if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) x += 1

    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y)
      x /= length
      y /= length
    }

    return { x, y }
  }

  public isMovementKeyPressed(): boolean {
    const movementKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
    return movementKeys.some(key => this.isKeyPressed(key))
  }

  public isActionKeyPressed(): boolean {
    const actionKeys = ['Space', 'Enter', 'KeyE', 'KeyF', 'KeyQ']
    return actionKeys.some(key => this.isKeyPressed(key))
  }
}


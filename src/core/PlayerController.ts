import { EventManager } from './EventManager'
import { InputManager } from './InputManager'
import { Player } from '../entities/Player'

export interface PlayerMovementState {
  isMoving: boolean
  direction: 'up' | 'down' | 'left' | 'right' | 'none'
  velocity: { x: number; y: number }
  lastMoveTime: number
}

export interface PlayerActionState {
  isJumping: boolean
  isInteracting: boolean
  isAttacking: boolean
  lastActionTime: number
}

export class PlayerController {
  private player: Player
  private eventManager: EventManager
  private inputManager: InputManager
  private movementState: PlayerMovementState
  private actionState: PlayerActionState
  private isEnabled: boolean = true
  private moveSpeed: number = 100 // pixels per second
  private jumpForce: number = 150
  private interactionCooldown: number = 500 // milliseconds
  private attackCooldown: number = 300 // milliseconds

  // Input state tracking
  private activeKeys: Set<string> = new Set()
  private keyStates: Map<string, boolean> = new Map()

  constructor(player: Player, eventManager: EventManager, inputManager: InputManager) {
    this.player = player
    this.eventManager = eventManager
    this.inputManager = inputManager
    
    this.movementState = {
      isMoving: false,
      direction: 'none',
      velocity: { x: 0, y: 0 },
      lastMoveTime: 0
    }
    
    this.actionState = {
      isJumping: false,
      isInteracting: false,
      isAttacking: false,
      lastActionTime: 0
    }

    this.setupEventListeners()
    this.setupInputMappings()
  }

  private setupEventListeners(): void {
    // Listen for input events from the input manager
    this.eventManager.on('inputAction', this.handleInputAction.bind(this))
    
    // Listen for player state changes
    this.eventManager.on('playerPositionChanged', this.handlePlayerPositionChanged.bind(this))
    
    // Listen for game state changes
    this.eventManager.on('gamePaused', this.handleGamePaused.bind(this))
    this.eventManager.on('gameResumed', this.handleGameResumed.bind(this))
  }

  private setupInputMappings(): void {
    // The InputManager already has the mappings, but we can customize them here if needed
    const mappings = this.inputManager.getInputMappings()
    
    // Set up custom input handling for specific actions
    this.setupMovementInputs()
    this.setupActionInputs()
  }

  private setupMovementInputs(): void {
    // Movement keys are already mapped in InputManager
    // We just need to track their state
    const movementKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
    
    movementKeys.forEach(key => {
      this.keyStates.set(key, false)
    })
  }

  private setupActionInputs(): void {
    // Action keys are already mapped in InputManager
    const actionKeys = ['Space', 'Enter', 'KeyE', 'KeyF', 'KeyQ']
    
    actionKeys.forEach(key => {
      this.keyStates.set(key, false)
    })
  }

  private handleInputAction(action: any): void {
    if (!this.isEnabled) return

    const { type, data } = action
    const currentTime = performance.now()

    switch (type) {
      case 'moveForward':
        this.handleMovement('up', true, currentTime)
        break
      case 'moveBackward':
        this.handleMovement('down', true, currentTime)
        break
      case 'moveLeft':
        this.handleMovement('left', true, currentTime)
        break
      case 'moveRight':
        this.handleMovement('right', true, currentTime)
        break
      case 'jump':
        this.handleJump(currentTime)
        break
      case 'interact':
        this.handleInteraction(currentTime)
        break
      case 'attack':
        this.handleAttack(currentTime)
        break
      case 'special':
        this.handleSpecialAbility(currentTime)
        break
      case 'pause':
        this.handlePause()
        break
      case 'inventory':
        this.handleInventory()
        break
      case 'map':
        this.handleMap()
        break
    }
  }

  private handleMovement(direction: 'up' | 'down' | 'left' | 'right', isActive: boolean, timestamp: number): void {
    // Update movement state
    this.movementState.isMoving = isActive
    this.movementState.direction = isActive ? direction : 'none'
    this.movementState.lastMoveTime = timestamp

    // Calculate velocity based on direction
    if (isActive) {
      switch (direction) {
        case 'up':
          this.movementState.velocity.y = -this.moveSpeed
          this.movementState.velocity.x = 0
          break
        case 'down':
          this.movementState.velocity.y = this.moveSpeed
          this.movementState.velocity.x = 0
          break
        case 'left':
          this.movementState.velocity.x = -this.moveSpeed
          this.movementState.velocity.y = 0
          break
        case 'right':
          this.movementState.velocity.x = this.moveSpeed
          this.movementState.velocity.y = 0
          break
      }
    } else {
      this.movementState.velocity.x = 0
      this.movementState.velocity.y = 0
    }

    // Emit movement event
    this.eventManager.emit('playerMovement', {
      direction,
      isActive,
      velocity: this.movementState.velocity,
      timestamp
    })
  }

  private handleJump(timestamp: number): void {
    if (this.actionState.isJumping) return

    this.actionState.isJumping = true
    this.actionState.lastActionTime = timestamp

    // Emit jump event
    this.eventManager.emit('playerJump', {
      force: this.jumpForce,
      timestamp
    })

    // Reset jump state after a short delay
    setTimeout(() => {
      this.actionState.isJumping = false
    }, 500)
  }

  private handleInteraction(timestamp: number): void {
    if (this.actionState.isInteracting) return
    if (timestamp - this.actionState.lastActionTime < this.interactionCooldown) return

    this.actionState.isInteracting = true
    this.actionState.lastActionTime = timestamp

    // Emit interaction event
    this.eventManager.emit('playerInteraction', {
      type: 'interact',
      timestamp
    })

    // Reset interaction state after a short delay
    setTimeout(() => {
      this.actionState.isInteracting = false
    }, 200)
  }

  private handleAttack(timestamp: number): void {
    if (this.actionState.isAttacking) return
    if (timestamp - this.actionState.lastActionTime < this.attackCooldown) return

    this.actionState.isAttacking = true
    this.actionState.lastActionTime = timestamp

    // Emit attack event
    this.eventManager.emit('playerAttack', {
      type: 'attack',
      timestamp
    })

    // Reset attack state after a short delay
    setTimeout(() => {
      this.actionState.isAttacking = false
    }, 300)
  }

  private handleSpecialAbility(timestamp: number): void {
    if (timestamp - this.actionState.lastActionTime < 1000) return // 1 second cooldown

    this.actionState.lastActionTime = timestamp

    // Emit special ability event
    this.eventManager.emit('playerSpecialAbility', {
      type: 'special',
      timestamp
    })
  }

  private handlePause(): void {
    this.eventManager.emit('gamePauseRequested', {
      timestamp: performance.now()
    })
  }

  private handleInventory(): void {
    this.eventManager.emit('inventoryToggleRequested', {
      timestamp: performance.now()
    })
  }

  private handleMap(): void {
    this.eventManager.emit('mapToggleRequested', {
      timestamp: performance.now()
    })
  }

  private handlePlayerPositionChanged(event: any): void {
    // Update player position in the Player entity
    const { x, y, world } = event
    this.player.setPosition(x, y, world)
  }

  private handleGamePaused(): void {
    this.isEnabled = false
    // Stop all movement
    this.movementState.isMoving = false
    this.movementState.velocity.x = 0
    this.movementState.velocity.y = 0
  }

  private handleGameResumed(): void {
    this.isEnabled = true
  }

  // Public API methods
  public update(deltaTime: number): void {
    if (!this.isEnabled) return

    // Update player position based on movement
    if (this.movementState.isMoving) {
      this.updatePlayerPosition(deltaTime)
    }

    // Update action states
    this.updateActionStates(deltaTime)
  }

  private updatePlayerPosition(deltaTime: number): void {
    const currentPos = this.player.getPosition()
    const deltaSeconds = deltaTime / 1000

    // Calculate new position
    const newX = currentPos.x + (this.movementState.velocity.x * deltaSeconds)
    const newY = currentPos.y + (this.movementState.velocity.y * deltaSeconds)

    // Update player position
    this.player.setPosition(newX, newY, currentPos.world)

    // Emit position update event
    this.eventManager.emit('playerPositionChanged', {
      x: newX,
      y: newY,
      world: currentPos.world,
      timestamp: performance.now()
    })
  }

  private updateActionStates(deltaTime: number): void {
    const currentTime = performance.now()

    // Check if actions should be reset
    if (this.actionState.isJumping && currentTime - this.actionState.lastActionTime > 500) {
      this.actionState.isJumping = false
    }

    if (this.actionState.isInteracting && currentTime - this.actionState.lastActionTime > 200) {
      this.actionState.isInteracting = false
    }

    if (this.actionState.isAttacking && currentTime - this.actionState.lastActionTime > 300) {
      this.actionState.isAttacking = false
    }
  }

  public getMovementState(): PlayerMovementState {
    return { ...this.movementState }
  }

  public getActionState(): PlayerActionState {
    return { ...this.actionState }
  }

  public setMoveSpeed(speed: number): void {
    this.moveSpeed = Math.max(10, Math.min(500, speed))
  }

  public setJumpForce(force: number): void {
    this.jumpForce = Math.max(50, Math.min(300, force))
  }

  public enable(): void {
    this.isEnabled = true
  }

  public disable(): void {
    this.isEnabled = false
    // Stop all movement
    this.movementState.isMoving = false
    this.movementState.velocity.x = 0
    this.movementState.velocity.y = 0
  }

  public reset(): void {
    this.movementState = {
      isMoving: false,
      direction: 'none',
      velocity: { x: 0, y: 0 },
      lastMoveTime: 0
    }
    
    this.actionState = {
      isJumping: false,
      isInteracting: false,
      isAttacking: false,
      lastActionTime: 0
    }

    this.activeKeys.clear()
    this.keyStates.clear()
  }

  public destroy(): void {
    this.eventManager.off('inputAction', this.handleInputAction.bind(this))
    this.eventManager.off('playerPositionChanged', this.handlePlayerPositionChanged.bind(this))
    this.eventManager.off('gamePaused', this.handleGamePaused.bind(this))
    this.eventManager.off('gameResumed', this.handleGameResumed.bind(this))
  }
}


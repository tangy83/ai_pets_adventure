// Core Game Systems - Only export what's actually needed
export { GameEngine } from './GameEngine'
export { GameState } from './GameState'
export { SystemManager } from './SystemManager'
export { EventManager } from './EventManager'
export { TimeManager } from './TimeManager'
export { PerformanceMonitor } from './PerformanceMonitor'
export { ErrorBoundary } from './ErrorBoundary'
export { ComponentRegistry } from './ComponentRegistry'

// ECS System exports - Specific exports only
export { ECSRenderingSystem } from './systems/ECSRenderingSystem'
export { ECSPhysicsSystem } from './systems/ECSPhysicsSystem'
export { AnimationSystem } from './systems/AnimationSystem'
export { InteractionSystem } from './systems/InteractionSystem'

// Core types only - avoid wildcard exports
export type { PerformanceMetrics } from './PerformanceMonitor'
export type { GameSystem } from './SystemManager'
export type { GameEvents } from './EventManager'

// Phase 2: Enhanced Input Processing
export { InputManager } from './InputManager'
export { InputSystem } from './systems/InputSystem'
export type { 
  InputMapping, 
  InputAction, 
  InputProfile
} from './InputManager'
export type { 
  InputState, 
  InputEvent, 
  TouchPoint, 
  Gesture 
} from './systems/InputSystem' 

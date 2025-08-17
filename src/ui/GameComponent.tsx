import React, { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine } from '../core'
import { KeyboardInputHandler } from '../core/KeyboardInputHandler'
import { MouseInputHandler } from '../core/MouseInputHandler'
import { TouchInputHandler } from '../core/TouchInputHandler'
import './GameComponent.css'

interface GameComponentProps {
  onGameReady?: (engine: GameEngine) => void
  onGameError?: (error: Error) => void
}

// Screen size breakpoints
const BREAKPOINTS = {
  mobile: 600,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440
}

// Device orientation types
type Orientation = 'portrait' | 'landscape'

// Screen size categories
type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'largeDesktop'

export const GameComponent: React.FC<GameComponentProps> = ({ 
  onGameReady, 
  onGameError 
}) => {
  const gameEngineRef = useRef<GameEngine | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isGameRunning, setIsGameRunning] = useState(false)
  const [gameState, setGameState] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [keyboardState, setKeyboardState] = useState<string[]>([])
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0 })
  const [mouseState, setMouseState] = useState({
    position: { x: 0, y: 0 },
    isHovering: false,
    isDragging: false,
    buttons: new Map<number, boolean>(),
    lastClick: null as any
  })
  const [mouseEvents, setMouseEvents] = useState<any[]>([])
  const [touchState, setTouchState] = useState({
    activeTouches: 0,
    isMultiTouch: false,
    lastTapPosition: null as any,
    tapCount: 0
  })
  const [touchEvents, setTouchEvents] = useState<any[]>([])
  const [accessibilityState, setAccessibilityState] = useState({
    isEnabled: true,
    currentFocus: null as string | null,
    navigationMode: 'keyboard' as 'keyboard' | 'mouse' | 'touch',
    screenReaderActive: false,
    highContrastEnabled: false,
    reducedMotionEnabled: false
  })
  const [accessibilityEvents, setAccessibilityEvents] = useState<any[]>([])

  // Responsive UI state
  const [screenSize, setScreenSize] = useState<ScreenSize>('mobile')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })
  const [isCompactMode, setIsCompactMode] = useState(false)
  const [showResponsiveInfo, setShowResponsiveInfo] = useState(false)

  // Responsive UI functions
  const getScreenSize = useCallback((width: number): ScreenSize => {
    if (width >= BREAKPOINTS.largeDesktop) return 'largeDesktop'
    if (width >= BREAKPOINTS.desktop) return 'desktop'
    if (width >= BREAKPOINTS.tablet) return 'tablet'
    return 'mobile'
  }, [])

  const getOrientation = useCallback((width: number, height: number): Orientation => {
    return width > height ? 'landscape' : 'portrait'
  }, [])

  const updateResponsiveState = useCallback(() => {
    const width = window.innerWidth
    const height = window.innerHeight
    
    setWindowDimensions({ width, height })
    setScreenSize(getScreenSize(width))
    setOrientation(getOrientation(width, height))
    setIsCompactMode(width < BREAKPOINTS.tablet || (getOrientation(width, height) === 'landscape' && height < 600))
  }, [getScreenSize, getOrientation])

  // Responsive layout helpers
  const getResponsiveGridColumns = useCallback(() => {
    switch (screenSize) {
      case 'mobile':
        return 1
      case 'tablet':
        return orientation === 'landscape' ? 2 : 1
      case 'desktop':
        return 2
      case 'largeDesktop':
        return 3
      default:
        return 1
    }
  }, [screenSize, orientation])

  const getResponsivePadding = useCallback(() => {
    switch (screenSize) {
      case 'mobile':
        return '10px'
      case 'tablet':
        return '15px'
      case 'desktop':
        return '20px'
      case 'largeDesktop':
        return '30px'
      default:
        return '10px'
    }
  }, [screenSize])

  const getResponsiveFontSize = useCallback(() => {
    switch (screenSize) {
      case 'mobile':
        return '14px'
      case 'tablet':
        return '16px'
      case 'desktop':
        return '18px'
      case 'largeDesktop':
        return '20px'
      default:
        return '14px'
    }
  }, [screenSize])

  // Responsive canvas sizing
  const updateCanvasSize = useCallback(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const container = canvas.parentElement
      
      if (container) {
        const containerWidth = container.clientWidth
        const maxWidth = Math.min(containerWidth - 40, getMaxCanvasWidth())
        const aspectRatio = 16 / 9
        
        canvas.style.width = `${maxWidth}px`
        canvas.style.height = `${maxWidth / aspectRatio}px`
      }
    }
  }, [screenSize])

  const getMaxCanvasWidth = useCallback(() => {
    switch (screenSize) {
      case 'mobile':
        return 400
      case 'tablet':
        return 600
      case 'desktop':
        return 800
      case 'largeDesktop':
        return 1000
      default:
        return 400
    }
  }, [screenSize])

  // Responsive event display
  const getMaxEventItems = useCallback(() => {
    if (isCompactMode) return 3
    switch (screenSize) {
      case 'mobile':
        return 4
      case 'tablet':
        return 6
      case 'desktop':
        return 8
      case 'largeDesktop':
        return 10
      default:
        return 4
    }
  }, [screenSize, isCompactMode])

  // Responsive control layout
  const getControlLayout = useCallback(() => {
    if (screenSize === 'mobile' && orientation === 'portrait') {
      return 'vertical'
    }
    if (screenSize === 'mobile' && orientation === 'landscape') {
      return 'horizontal'
    }
    if (screenSize === 'tablet') {
      return orientation === 'landscape' ? 'horizontal' : 'vertical'
    }
    return 'horizontal'
  }, [screenSize, orientation])

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      updateResponsiveState()
      updateCanvasSize()
    }

    const handleOrientationChange = () => {
      setTimeout(() => {
        updateResponsiveState()
        updateCanvasSize()
      }, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)
    
    // Initial setup
    updateResponsiveState()
    updateCanvasSize()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [updateResponsiveState, updateCanvasSize])

  // Responsive info display
  const toggleResponsiveInfo = () => {
    setShowResponsiveInfo(!showResponsiveInfo)
  }

  useEffect(() => {
    initializeGame()
    return () => cleanupGame()
  }, [])

  const initializeGame = async () => {
    try {
      // Create game engine instance without audio systems to avoid missing file errors
      const engine = new GameEngine({
        enableSystems: ['input', 'ai', 'physics', 'rendering'] // Exclude 'audio'
      })
      gameEngineRef.current = engine

      // Set up event listeners
      const eventManager = engine.getEventManager()
      eventManager.on('gameStateChanged', (data) => {
        setGameState(data)
      })

      // Set up keyboard input monitoring
      eventManager.on('keyDown', (data) => {
        setKeyboardState(prev => [...new Set([...prev, data.code])])
      })

      eventManager.on('keyUp', (data) => {
        setKeyboardState(prev => prev.filter(key => key !== data.code))
      })

      // Set up player movement monitoring
      eventManager.on('playerMovement', (data) => {
        if (data.isActive) {
          setPlayerPosition(prev => ({
            x: prev.x + (data.velocity.x * 0.016), // Approximate for 60fps
            y: prev.y + (data.velocity.y * 0.016)
          }))
        }
      })

      // Set up player position changes
      eventManager.on('playerPositionChanged', (data) => {
        setPlayerPosition({ x: data.x, y: data.y })
      })

      // Set up mouse event monitoring
      eventManager.on('click', (data) => {
        setMouseState(prev => ({
          ...prev,
          lastClick: data,
          position: { x: data.x, y: data.y }
        }))
        setMouseEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'click', ...data }])
      })

      eventManager.on('doubleClick', (data) => {
        setMouseEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'doubleClick', ...data }])
      })

      eventManager.on('rightClick', (data) => {
        setMouseEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'rightClick', ...data }])
      })

      eventManager.on('dragStart', (data) => {
        setMouseState(prev => ({ ...prev, isDragging: true }))
        setMouseEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'dragStart', ...data }])
      })

      eventManager.on('dragMove', (data) => {
        setMouseEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'dragMove', ...data }])
      })

      eventManager.on('dragEnd', (data) => {
        setMouseState(prev => ({ ...prev, isDragging: false }))
        setMouseEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'dragEnd', ...data }])
      })

      eventManager.on('hover', (data) => {
        setMouseState(prev => ({ ...prev, isHovering: true }))
        setMouseEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'hover', ...data }])
      })

      eventManager.on('hoverEnd', (data) => {
        setMouseState(prev => ({ ...prev, isHovering: false }))
        setMouseEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'hoverEnd', ...data }])
      })

      eventManager.on('wheel', (data) => {
        setMouseEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'wheel', delta: data.deltaY }])
      })

      // Set up touch event monitoring
      eventManager.on('touchStart', (data) => {
        setTouchState(prev => ({
          ...prev,
          activeTouches: data.touches?.length || 1,
          isMultiTouch: (data.touches?.length || 1) > 1
        }))
        setTouchEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'touchStart', ...data }])
      })

      eventManager.on('touchEnd', (data) => {
        setTouchState(prev => ({
          ...prev,
          activeTouches: Math.max(0, prev.activeTouches - 1),
          isMultiTouch: false
        }))
        setTouchEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'touchEnd', ...data }])
      })

      eventManager.on('tap', (data) => {
        setTouchState(prev => ({
          ...prev,
          lastTapPosition: { x: data.x, y: data.y },
          tapCount: prev.tapCount + 1
        }))
        setTouchEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'tap', ...data }])
      })

      eventManager.on('swipe', (data) => {
        setTouchEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'swipe', ...data }])
      })

      // Set up accessibility event monitoring
      eventManager.on('accessibilityFocusChange', (data) => {
        setAccessibilityState(prev => ({
          ...prev,
          currentFocus: data.elementId || null
        }))
        setAccessibilityEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'focusChange', ...data }])
      })

      eventManager.on('accessibilityNavigation', (data) => {
        setAccessibilityEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'navigation', ...data }])
      })

      eventManager.on('accessibilityElementActivate', (data) => {
        setAccessibilityEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'elementActivate', ...data }])
      })

      eventManager.on('accessibilityMenuToggle', (data) => {
        setAccessibilityEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'menuToggle', ...data }])
      })

      eventManager.on('accessibilityNavigationModeChange', (data) => {
        setAccessibilityState(prev => ({
          ...prev,
          navigationMode: data.mode || prev.navigationMode
        }))
        setAccessibilityEvents(prev => [...prev.slice(-getMaxEventItems()), { type: 'navigationModeChange', ...data }])
      })

      // Notify parent component
      if (onGameReady) {
        onGameReady(engine)
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize game')
      setError(error.message)
      if (onGameError) {
        onGameError(error)
      }
    }
  }

  const cleanupGame = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.stop()
      gameEngineRef.current = null
    }
  }

  const startGame = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.start()
      setIsGameRunning(true)
    }
  }

  const stopGame = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.stop()
      setIsGameRunning(false)
    }
  }

  const resetGame = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.reset()
      setPlayerPosition({ x: 0, y: 0 })
      setMouseEvents([])
      setTouchEvents([])
      setAccessibilityEvents([])
    }
  }

  const clearEvents = () => {
    setMouseEvents([])
    setTouchEvents([])
    setAccessibilityEvents([])
  }

  if (error) {
    return (
      <div className="game-error">
        <h3>Game Error</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reload Game</button>
      </div>
    )
  }

  const controlLayout = getControlLayout()
  const gridColumns = getResponsiveGridColumns()

  return (
    <div className="game-component" style={{ padding: getResponsivePadding() }}>
      {/* Responsive Info Display */}
      {showResponsiveInfo && (
        <div className="responsive-info">
          <h4>Responsive UI Info</h4>
          <div className="status-grid">
            <div className="status-item">
              <strong>Screen Size:</strong> {screenSize} ({windowDimensions.width} × {windowDimensions.height})
            </div>
            <div className="status-item">
              <strong>Orientation:</strong> {orientation}
            </div>
            <div className="status-item">
              <strong>Layout Mode:</strong> {controlLayout}
            </div>
            <div className="status-item">
              <strong>Grid Columns:</strong> {gridColumns}
            </div>
            <div className="status-item">
              <strong>Compact Mode:</strong> {isCompactMode ? 'Yes' : 'No'}
            </div>
            <div className="status-item">
              <strong>Max Events:</strong> {getMaxEventItems()}
            </div>
          </div>
        </div>
      )}

      {/* Game Controls */}
      <div className={`game-controls ${controlLayout === 'horizontal' ? 'horizontal' : 'vertical'}`}>
        <button 
          className="start-btn" 
          onClick={startGame}
          disabled={isGameRunning}
          aria-label="Start Game"
        >
          Start Game
        </button>
        <button 
          className="stop-btn" 
          onClick={stopGame}
          disabled={!isGameRunning}
          aria-label="Stop Game"
        >
          Stop Game
        </button>
        <button onClick={resetGame} aria-label="Reset Game">
          Reset
        </button>
        <button onClick={clearEvents} aria-label="Clear Events">
          Clear Events
        </button>
        <button onClick={toggleResponsiveInfo} aria-label="Toggle Responsive Info">
          {showResponsiveInfo ? 'Hide' : 'Show'} Responsive Info
        </button>
      </div>

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={800}
        height={450}
        aria-label="Game Canvas"
      />

      {/* Responsive Grid Layout */}
      <div className="responsive-grid" style={{ 
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gap: isCompactMode ? '10px' : '15px'
      }}>
        {/* Game Info */}
        <div className="game-info">
          <h4>Game Status</h4>
          <div className="status-grid">
            <div className="status-item">
              <strong>Status:</strong> {isGameRunning ? 'Running' : 'Stopped'}
            </div>
            <div className="status-item">
              <strong>Player Position:</strong> X: {playerPosition.x.toFixed(2)}, Y: {playerPosition.y.toFixed(2)}
            </div>
            {gameState && (
              <div className="status-item">
                <strong>Game State:</strong> {gameState.status || 'Unknown'}
              </div>
            )}
          </div>
        </div>

        {/* Input Status */}
        <div className="input-status">
          <h4>Input Status</h4>
          <div className="status-grid">
            <div className="status-item">
              <strong>Active Keys:</strong> {keyboardState.length > 0 ? keyboardState.join(', ') : 'None'}
            </div>
            <div className="status-item">
              <strong>Input Mode:</strong> {accessibilityState.navigationMode}
            </div>
          </div>
        </div>

        {/* Mouse Status */}
        <div className="mouse-status">
          <h4>Mouse Status</h4>
          <div className="status-grid">
            <div className="status-item">
              <strong>Position:</strong> X: {mouseState.position.x}, Y: {mouseState.position.y}
            </div>
            <div className="status-item">
              <strong>State:</strong> {mouseState.isHovering ? 'Hovering' : 'Not Hovering'} {mouseState.isDragging ? '| Dragging' : ''}
            </div>
            <div className="status-item">
              <strong>Buttons:</strong> {Array.from(mouseState.buttons.entries()).filter(([_, pressed]) => pressed).map(([button]) => `Button ${button}`).join(', ') || 'None'}
            </div>
          </div>
        </div>

        {/* Touch Status */}
        <div className="touch-status">
          <h4>Touch Status</h4>
          <div className="status-grid">
            <div className="status-item">
              <strong>Active Touches:</strong> {touchState.activeTouches}
            </div>
            <div className="status-item">
              <strong>Multi-Touch:</strong> {touchState.isMultiTouch ? 'Yes' : 'No'}
            </div>
            <div className="status-item">
              <strong>Tap Count:</strong> {touchState.tapCount}
            </div>
          </div>
        </div>

        {/* Accessibility Status */}
        <div className="accessibility-status">
          <h4>Accessibility Status</h4>
          <div className="status-grid">
            <div className="status-item">
              <strong>Enabled:</strong> {accessibilityState.isEnabled ? 'Yes' : 'No'}
            </div>
            <div className="status-item">
              <strong>Navigation Mode:</strong> {accessibilityState.navigationMode}
            </div>
            <div className="status-item">
              <strong>Current Focus:</strong> {accessibilityState.currentFocus || 'None'}
            </div>
            <div className="status-item">
              <strong>Screen Reader:</strong> {accessibilityState.screenReaderActive ? 'Active' : 'Inactive'}
            </div>
            <div className="status-item">
              <strong>High Contrast:</strong> {accessibilityState.highContrastEnabled ? 'Enabled' : 'Disabled'}
            </div>
            <div className="status-item">
              <strong>Reduced Motion:</strong> {accessibilityState.reducedMotionEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </div>

        {/* Controls Help */}
        <div className="controls-help">
          <h4>Controls Help</h4>
          <div className="control-section">
            <h5>Movement</h5>
            <p>WASD - Move player</p>
            <p>Arrow Keys - Alternative movement</p>
            <p>Space - Jump</p>
          </div>
          <div className="control-section">
            <h5>Mouse</h5>
            <p>Left Click - Select/Activate</p>
            <p>Right Click - Context menu</p>
            <p>Drag - Move objects</p>
            <p>Hover - Show tooltips</p>
          </div>
          <div className="control-section">
            <h5>Touch</h5>
            <p>Tap - Select/Activate</p>
            <p>Double Tap - Special action</p>
            <p>Swipe - Navigate</p>
            <p>Long Press - Context menu</p>
          </div>
          <div className="control-section">
            <h5>Accessibility</h5>
            <p>Tab - Navigate between elements</p>
            <p>Enter/Space - Activate focused element</p>
            <p>Arrow Keys - Navigate in direction</p>
            <p>Home/End - Navigate to first/last element</p>
            <p>Page Up/Down - Navigate by page</p>
            <p>Escape - Close menus/return focus</p>
          </div>
        </div>
      </div>

      {/* Event Displays - Responsive Layout */}
      <div className="responsive-grid" style={{ 
        gridTemplateColumns: `repeat(${Math.min(gridColumns, 2)}, 1fr)`,
        gap: isCompactMode ? '10px' : '15px'
      }}>
        {/* Mouse Events */}
        <div className="mouse-events">
          <h4>Recent Mouse Events</h4>
          <div className="event-list">
            {mouseEvents.length > 0 ? (
              mouseEvents.map((event, index) => (
                <div key={index} className="event-item">
                  <span className="event-type">{event.type}</span>
                  {event.x !== undefined && event.y !== undefined && (
                    <span className="event-position">({event.x}, {event.y})</span>
                  )}
                  {event.delta && <span className="event-delta">Δ: {event.delta}</span>}
                </div>
              ))
            ) : (
              <p>No mouse events</p>
            )}
          </div>
        </div>

        {/* Touch Events */}
        <div className="touch-events">
          <h4>Recent Touch Events</h4>
          <div className="event-list">
            {touchEvents.length > 0 ? (
              touchEvents.map((event, index) => (
                <div key={index} className="event-item">
                  <span className="event-type">{event.type}</span>
                  {event.x !== undefined && event.y !== undefined && (
                    <span className="event-position">({event.x}, {event.y})</span>
                  )}
                  {event.direction && <span className="event-direction">{event.direction}</span>}
                </div>
              ))
            ) : (
              <p>No touch events</p>
            )}
          </div>
        </div>

        {/* Accessibility Events */}
        <div className="accessibility-events">
          <h4>Recent Accessibility Events</h4>
          <div className="event-list">
            {accessibilityEvents.length > 0 ? (
              accessibilityEvents.map((event, index) => (
                <div key={index} className="event-item">
                  <span className="event-type">{event.type}</span>
                  {event.direction && <span className="event-direction">{event.direction}</span>}
                  {event.method && <span className="event-method">{event.method}</span>}
                </div>
              ))
            ) : (
              <p>No accessibility events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 
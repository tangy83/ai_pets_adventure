import React, { useEffect, useRef, useState } from 'react'
import { GameEngine } from '../core'

interface GameComponentProps {
  onGameReady?: (engine: GameEngine) => void
  onGameError?: (error: Error) => void
}

export const GameComponent: React.FC<GameComponentProps> = ({ 
  onGameReady, 
  onGameError 
}) => {
  const gameEngineRef = useRef<GameEngine | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isGameRunning, setIsGameRunning] = useState(false)
  const [gameState, setGameState] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initializeGame()
    return () => cleanupGame()
  }, [])

  const initializeGame = async () => {
    try {
      // Create game engine instance
      const engine = new GameEngine()
      gameEngineRef.current = engine

      // Set up event listeners
      const eventManager = engine.getEventManager()
      eventManager.on('gameStateChanged', (data) => {
        setGameState(data)
      })

      // Initialize game state
      const gameState = engine.getGameState()
      await gameState.loadGameState()

      // Notify parent component
      onGameReady?.(engine)

      console.log('Game initialized successfully')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error.message)
      onGameError?.(error)
      console.error('Failed to initialize game:', error)
    }
  }

  const cleanupGame = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.stop()
      gameEngineRef.current = null
    }
  }

  const startGame = () => {
    if (gameEngineRef.current && !isGameRunning) {
      gameEngineRef.current.start()
      setIsGameRunning(true)
    }
  }

  const stopGame = () => {
    if (gameEngineRef.current && isGameRunning) {
      gameEngineRef.current.stop()
      setIsGameRunning(false)
    }
  }

  const pauseGame = () => {
    if (gameEngineRef.current) {
      const gameState = gameEngineRef.current.getGameState()
      gameState.pause()
    }
  }

  const resumeGame = () => {
    if (gameEngineRef.current) {
      const gameState = gameEngineRef.current.getGameState()
      gameState.resume()
    }
  }

  if (error) {
    return (
      <div className="game-error">
        <h3>Game Error</h3>
        <p>{error}</p>
        <button onClick={initializeGame}>Retry</button>
      </div>
    )
  }

  return (
    <div className="game-component">
      <div className="game-controls">
        <button 
          onClick={isGameRunning ? stopGame : startGame}
          className={isGameRunning ? 'stop-btn' : 'start-btn'}
        >
          {isGameRunning ? 'Stop Game' : 'Start Game'}
        </button>
        
        {isGameRunning && (
          <>
            <button onClick={pauseGame}>Pause</button>
            <button onClick={resumeGame}>Resume</button>
          </>
        )}
      </div>

      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={800}
        height={600}
      />

      {gameState && (
        <div className="game-info">
          <h4>Game Status</h4>
          <p>Player Level: {gameState.player?.level || 'N/A'}</p>
          <p>Current World: {gameState.currentWorld || 'N/A'}</p>
          <p>Active Quests: {gameState.activeQuests?.length || 0}</p>
        </div>
      )}
    </div>
  )
} 
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { GameComponent } from '@/ui/GameComponent'
import { MultiModalAISystem } from '@/core/systems/MultiModalAISystem'
import { PetAISystem } from '@/core/systems/PetAISystem'
import { ClientSideAIProcessor } from '@/core/systems/ClientSideAIProcessor'
import { EventManager } from '@/core/EventManager'

export default function GamePage() {
  const [gameState, setGameState] = useState<'loading' | 'ready' | 'playing' | 'paused'>('loading')
  const [aiSystems, setAiSystems] = useState<{
    multiModal: MultiModalAISystem | null
    petAI: PetAISystem | null
    clientAI: ClientSideAIProcessor | null
  }>({
    multiModal: null,
    petAI: null,
    clientAI: null
  })
  
  const [voiceCommands, setVoiceCommands] = useState<string[]>([])
  const [drawingData, setDrawingData] = useState<any>(null)
  const [petState, setPetState] = useState<any>(null)
  const [aiContext, setAiContext] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const eventManager = EventManager.getInstance()

  useEffect(() => {
    initializeGame()
  }, [])

  const initializeGame = async () => {
    try {
      addLog('🚀 Initializing AI Pets Adventure...')
      
      // Initialize AI systems
      const petAI = new PetAISystem(eventManager)
      const clientAI = new ClientSideAIProcessor(eventManager)
      const multiModal = new MultiModalAISystem(eventManager, {
        voice: { 
          enableVoiceCommands: true,
          language: 'en-US',
          continuousListening: false,
          commandTimeout: 5000,
          confidenceThreshold: 0.7,
          enableWakeWord: true,
          wakeWord: 'Hey Pet'
        },
        drawing: { 
          enableDrawingRecognition: true,
          canvasSize: { width: 400, height: 400 },
          strokeWidth: 3,
          recognitionTimeout: 3000,
          enableRealTime: false,
          minStrokeLength: 10
        },
        text: { 
          enableNaturalLanguage: true,
          maxInputLength: 500,
          enableContextAnalysis: true,
          enableSentimentAnalysis: true,
          enableIntentRecognition: true
        },
        touch: { 
          enableGestureRecognition: true,
          minSwipeDistance: 50,
          maxSwipeTime: 1000,
          enableMultiTouch: true,
          gestureTimeout: 2000
        },
        camera: { 
          enableCamera: false,
          enableAR: false,
          maxResolution: { width: 1280, height: 720 },
          enableFaceDetection: false,
          enableObjectRecognition: false
        }
      })
      
      setAiSystems({ multiModal, petAI, clientAI })
      
      // Set up event listeners
      setupEventListeners()
      
      // Register a test pet
      if (petAI) {
        petAI.registerPet('test-pet-1', {
          personality: {
            traits: ['friendly', 'curious', 'electric'],
            adaptability: 80,
            curiosity: 90,
            sociability: 70,
            independence: 75,
            learningRate: 85
          },
          skills: {
            abilities: new Map([
              ['puzzle_solving', {
                id: 'puzzle_solving',
                name: 'Puzzle Solving',
                type: 'puzzle',
                cooldown: 0,
                energyCost: 10,
                successRate: 0.8,
                level: 1,
                description: 'Ability to solve puzzles and riddles'
              }],
              ['treasure_hunting', {
                id: 'treasure_hunting',
                name: 'Treasure Hunting',
                type: 'exploration',
                cooldown: 0,
                energyCost: 15,
                successRate: 0.7,
                level: 1,
                description: 'Ability to find hidden treasures'
              }]
            ]),
            cooldowns: new Map(),
            experience: new Map([
              ['puzzle_solving', 0],
              ['treasure_hunting', 0]
            ]),
            maxLevel: 10
          }
        })
        addLog('🐾 Pet "Sparky" registered with AI system')
      }
      
      setGameState('ready')
      addLog('✅ Game initialization complete!')
      addLog('🎮 Ready to play - Use voice commands, drawing, or text input!')
      
    } catch (error) {
      addLog(`❌ Initialization failed: ${error}`)
      setGameState('loading')
    }
  }

  const setupEventListeners = () => {
    // Multi-Modal AI events
    eventManager.on('multiModalAI:voice:command', (data) => {
      setVoiceCommands(prev => [...prev, data.text])
      addLog(`🎤 Voice Command: "${data.text}"`)
      processVoiceCommand(data.text)
    })
    
    eventManager.on('multiModalAI:drawing:analyzed', (data) => {
      setDrawingData(data)
      addLog(`🎨 Drawing Recognized: ${data.interpretation}`)
      processDrawingCommand(data.interpretation)
    })
    
    eventManager.on('multiModalAI:text:processed', (data) => {
      addLog(`📝 Text Processed: ${data.intent} - ${data.entities.join(', ')}`)
      processTextCommand(data.intent, data.entities)
    })
    
    // Pet AI events
    eventManager.on('pet:ai:state:updated', (data) => {
      setPetState(data.state)
      addLog(`🐾 Pet State: ${data.state.currentBehavior}`)
    })
    
    // Client AI events
    eventManager.on('client:ai:initialized', (data) => {
      addLog(`🤖 Client AI Ready: ${data.modelsLoaded} models loaded`)
    })
  }

  const processVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase()
    
    if (lowerCommand.includes('start') || lowerCommand.includes('play')) {
      startGame()
    } else if (lowerCommand.includes('stop') || lowerCommand.includes('pause')) {
      pauseGame()
    } else if (lowerCommand.includes('pet') || lowerCommand.includes('sparky')) {
      if (aiSystems.petAI) {
        aiSystems.petAI.forceBehaviorExecution('test-pet-1')
        addLog('🐾 Sparky is responding to your call!')
      }
    } else if (lowerCommand.includes('help')) {
      showHelp()
    }
  }

  const processDrawingCommand = (interpretation: string) => {
    switch (interpretation) {
      case 'simple_command':
        addLog('🎨 Simple drawing detected - executing basic action')
        break
      case 'horizontal_gesture':
        addLog('🎨 Horizontal gesture - moving right')
        break
      case 'vertical_gesture':
        addLog('🎨 Vertical gesture - moving up')
        break
      case 'complex_drawing':
        addLog('🎨 Complex drawing - analyzing pattern...')
        break
      default:
        addLog(`🎨 Unknown drawing pattern: ${interpretation}`)
    }
  }

  const processTextCommand = (intent: string, entities: string[]) => {
    addLog(`📝 Intent: ${intent}, Entities: ${entities.join(', ')}`)
    
    if (intent === 'movement_command') {
      const direction = entities.find(e => e.startsWith('direction:'))
      if (direction) {
        const dir = direction.split(':')[1]
        addLog(`🚶 Moving ${dir}`)
      }
    } else if (intent === 'combat_command') {
      addLog('⚔️ Combat mode activated!')
    } else if (intent === 'collection_command') {
      addLog('💎 Collection mode activated!')
    }
  }

  const startGame = () => {
    setGameState('playing')
    addLog('🎮 Game started!')
  }

  const pauseGame = () => {
    setGameState('paused')
    addLog('⏸️ Game paused')
  }

  const showHelp = () => {
    addLog('❓ Available commands:')
    addLog('   - "Start game" or "Play"')
    addLog('   - "Stop game" or "Pause"')
    addLog('   - "Call Sparky" or "Pet help"')
    addLog('   - Draw simple shapes for actions')
    addLog('   - Type commands in the text input')
  }

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`])
  }

  const clearLogs = () => {
    setLogs([])
  }

  const startVoiceRecognition = () => {
    if (aiSystems.multiModal) {
      aiSystems.multiModal.startVoiceRecognition()
      addLog('🎤 Voice recognition started - try saying "Start game"')
    }
  }

  const stopVoiceRecognition = () => {
    if (aiSystems.multiModal) {
      aiSystems.multiModal.stopVoiceRecognition()
      addLog('🎤 Voice recognition stopped')
    }
  }

  const startDrawingRecognition = () => {
    if (aiSystems.multiModal && canvasRef.current) {
      const canvas = aiSystems.multiModal.startDrawingRecognition()
      if (canvas) {
        addLog('🎨 Drawing recognition started - draw on the canvas!')
      }
    }
  }

  const stopDrawingRecognition = () => {
    if (aiSystems.multiModal) {
      aiSystems.multiModal.stopDrawingRecognition()
      addLog('🎨 Drawing recognition stopped')
    }
  }

  const processTextInput = (text: string) => {
    if (aiSystems.multiModal) {
      aiSystems.multiModal.processText(text)
    }
  }

  return (
    <div className="game-page" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '1rem',
        borderBottom: '2px solid rgba(255,255,255,0.2)'
      }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>🐾 AI Pets Adventure - Game Interface</h1>
        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8 }}>
          Phase 3 Complete: Pet AI + Client AI + Multi-Modal AI
        </p>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 120px)' }}>
        {/* Left Panel - Game Canvas */}
        <div style={{ flex: 2, padding: '1rem' }}>
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '10px',
            padding: '1rem',
            height: '100%'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#FFD700' }}>🎮 Game World</h3>
            
            {gameState === 'loading' && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                <p>Initializing AI systems...</p>
              </div>
            )}
            
            {gameState === 'ready' && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
                <h3>Ready to Play!</h3>
                <p>All AI systems are initialized and ready.</p>
                <button 
                  onClick={startGame}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '5px',
                    fontSize: '1.1rem',
                    cursor: 'pointer'
                  }}
                >
                  🚀 Start Game
                </button>
              </div>
            )}
            
            {gameState === 'playing' && (
              <div>
                <GameComponent 
                  onGameReady={(engine) => addLog('🎮 Game engine ready!')}
                  onGameError={(error) => addLog(`❌ Game error: ${error.message}`)}
                />
              </div>
            )}
            
            {gameState === 'paused' && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏸️</div>
                <h3>Game Paused</h3>
                <button 
                  onClick={startGame}
                  style={{
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '5px',
                    fontSize: '1.1rem',
                    cursor: 'pointer'
                  }}
                >
                  ▶️ Resume Game
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - AI Controls & Status */}
        <div style={{ flex: 1, padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
          {/* AI Systems Status */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>🤖 AI Systems Status</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ 
                background: aiSystems.petAI ? '#4CAF50' : '#f44336',
                padding: '0.5rem',
                borderRadius: '5px',
                marginBottom: '0.5rem'
              }}>
                🐾 Pet AI: {aiSystems.petAI ? 'ACTIVE' : 'INACTIVE'}
              </div>
              
              <div style={{ 
                background: aiSystems.clientAI ? '#4CAF50' : '#f44336',
                padding: '0.5rem',
                borderRadius: '5px',
                marginBottom: '0.5rem'
              }}>
                🧠 Client AI: {aiSystems.clientAI ? 'ACTIVE' : 'INACTIVE'}
              </div>
              
              <div style={{ 
                background: aiSystems.multiModal ? '#4CAF50' : '#f44336',
                padding: '0.5rem',
                borderRadius: '5px'
              }}>
                🎭 Multi-Modal AI: {aiSystems.multiModal ? 'ACTIVE' : 'INACTIVE'}
              </div>
            </div>
          </div>

          {/* Voice Recognition */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>🎤 Voice Commands</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <button 
                onClick={startVoiceRecognition}
                style={{
                  background: '#9C27B0',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '5px',
                  marginRight: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                🎤 Start Listening
              </button>
              
              <button 
                onClick={stopVoiceRecognition}
                style={{
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                ⏹️ Stop Listening
              </button>
            </div>
            
            {voiceCommands.length > 0 && (
              <div style={{ 
                background: 'rgba(255,255,255,0.1)',
                padding: '0.5rem',
                borderRadius: '5px',
                maxHeight: '100px',
                overflowY: 'auto'
              }}>
                <strong>Recent Commands:</strong>
                {voiceCommands.slice(-3).map((cmd, i) => (
                  <div key={i} style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    "{cmd}"
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Drawing Recognition */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>🎨 Drawing Recognition</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <button 
                onClick={startDrawingRecognition}
                style={{
                  background: '#FF9800',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '5px',
                  marginRight: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                🎨 Start Drawing
              </button>
              
              <button 
                onClick={stopDrawingRecognition}
                style={{
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                ⏹️ Stop Drawing
              </button>
            </div>
            
            {drawingData && (
              <div style={{ 
                background: 'rgba(255,255,255,0.1)',
                padding: '0.5rem',
                borderRadius: '5px'
              }}>
                <strong>Last Drawing:</strong>
                <div>Interpretation: {drawingData.interpretation}</div>
                <div>Confidence: {(drawingData.confidence * 100).toFixed(1)}%</div>
                <div>Category: {drawingData.category}</div>
              </div>
            )}
          </div>

          {/* Text Input */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>📝 Text Commands</h3>
            
            <input
              type="text"
              placeholder="Type a command (e.g., 'move north', 'attack enemy')"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '5px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(0,0,0,0.3)',
                color: 'white',
                marginBottom: '0.5rem'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  processTextInput(e.currentTarget.value)
                  e.currentTarget.value = ''
                }
              }}
            />
          </div>

          {/* Pet Status */}
          {petState && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>🐾 Pet Status</h3>
              
              <div style={{ 
                background: 'rgba(255,255,255,0.1)',
                padding: '0.5rem',
                borderRadius: '5px'
              }}>
                <div><strong>ID:</strong> {petState.id || 'Unknown'}</div>
                <div><strong>Behavior:</strong> {petState.currentBehavior || 'idle'}</div>
                <div><strong>Energy:</strong> {petState.energy || 100}%</div>
                <div><strong>Mood:</strong> {petState.mood || 'idle'}</div>
              </div>
            </div>
          )}

          {/* Game Logs */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#FFD700', margin: 0 }}>📊 Game Logs</h3>
              <button 
                onClick={clearLogs}
                style={{
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '3px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
            
            <div style={{ 
              background: 'rgba(0,0,0,0.5)',
              padding: '0.5rem',
              borderRadius: '5px',
              maxHeight: '200px',
              overflowY: 'auto',
              fontSize: '0.8rem'
            }}>
              {logs.length === 0 ? (
                <div style={{ opacity: 0.6 }}>No logs yet...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} style={{ marginBottom: '0.25rem', wordBreak: 'break-word' }}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drawing Canvas (Hidden by default) */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: '-1000px',
          left: '-1000px',
          width: '400px',
          height: '400px',
          border: '1px solid #ccc'
        }}
      />
    </div>
  )
}

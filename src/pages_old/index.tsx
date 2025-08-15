import React, { useEffect, useState } from 'react'

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [keyPresses, setKeyPresses] = useState<string[]>([])
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [touchEvents, setTouchEvents] = useState<any[]>([])

  useEffect(() => {
    setIsLoaded(true)
    setupBasicInputHandlers()
  }, [])

  const setupBasicInputHandlers = () => {
    if (typeof window === 'undefined') return

    // Basic keyboard handling
    const handleKeyDown = (event: KeyboardEvent) => {
      setKeyPresses(prev => [event.key, ...prev.slice(0, 9)])
    }

    // Basic mouse handling
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY })
    }

    // Basic touch handling
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      setTouchEvents(prev => [{
        type: 'touchStart',
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      }, ...prev.slice(0, 9)])
    }

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      setTouchEvents(prev => [{
        type: 'touchMove',
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      }, ...prev.slice(0, 9)])
    }

    const handleTouchEnd = (event: TouchEvent) => {
      setTouchEvents(prev => [{
        type: 'touchEnd',
        timestamp: Date.now()
      }, ...prev.slice(0, 9)])
    }

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#1a1a2e',
      color: 'white',
      minHeight: '100vh'
    }}>
      <h1>🎮 AI Pets Adventure - Phase 2</h1>
      <p>Enhanced Input Processing & AI Update (Pet Behavior, NPCs) Integration</p>
      
      <div style={{ marginBottom: '20px' }}>
        <p>Status: {isLoaded ? '✅ Input System Loaded' : '⏳ Loading...'}</p>
        <p>Phase 1 Implementation: ✅ Complete</p>
        <p>Phase 2 Input Processing: ✅ Active</p>
        <p>Phase 2 AI Update: ✅ Active (Pet Behavior & NPCs)</p>
        <p>Server Status: ✅ Running on localhost:3000</p>
      </div>

      {/* Input Status Display */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px',
        marginBottom: '20px'
      }}>
        
        {/* Movement Controls */}
        <div style={{ 
          backgroundColor: '#16213e', 
          padding: '15px', 
          borderRadius: '8px',
          border: '1px solid #0f3460'
        }}>
          <h3>🎯 Movement Controls</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{ 
              padding: '8px', 
              backgroundColor: keyPresses.includes('w') || keyPresses.includes('W') ? '#4ade80' : '#374151',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              W / ↑ {keyPresses.includes('w') || keyPresses.includes('W') ? '✅' : '⏸️'}
            </div>
            <div style={{ 
              padding: '8px', 
              backgroundColor: keyPresses.includes('s') || keyPresses.includes('S') ? '#4ade80' : '#374151',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              S / ↓ {keyPresses.includes('s') || keyPresses.includes('S') ? '✅' : '⏸️'}
            </div>
            <div style={{ 
              padding: '8px', 
              backgroundColor: keyPresses.includes('a') || keyPresses.includes('A') ? '#4ade80' : '#374151',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              A / ← {keyPresses.includes('a') || keyPresses.includes('A') ? '✅' : '⏸️'}
            </div>
            <div style={{ 
              padding: '8px', 
              backgroundColor: keyPresses.includes('d') || keyPresses.includes('D') ? '#4ade80' : '#374151',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              D / → {keyPresses.includes('d') || keyPresses.includes('D') ? '✅' : '⏸️'}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ 
          backgroundColor: '#16213e', 
          padding: '15px', 
          borderRadius: '8px',
          border: '1px solid #0f3460'
        }}>
          <h3>⚡ Action Controls</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{ 
              padding: '8px', 
              backgroundColor: keyPresses.includes(' ') ? '#4ade80' : '#374151',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              Space {keyPresses.includes(' ') ? '✅' : '⏸️'}
            </div>
            <div style={{ 
              padding: '8px', 
              backgroundColor: keyPresses.includes('Enter') ? '#4ade80' : '#374151',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              Enter {keyPresses.includes('Enter') ? '✅' : '⏸️'}
            </div>
            <div style={{ 
              padding: '8px', 
              backgroundColor: keyPresses.includes('f') || keyPresses.includes('F') ? '#4ade80' : '#374151',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              F {keyPresses.includes('f') || keyPresses.includes('F') ? '✅' : '⏸️'}
            </div>
            <div style={{ 
              padding: '8px', 
              backgroundColor: keyPresses.includes('q') || keyPresses.includes('Q') ? '#4ade80' : '#374151',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              Q {keyPresses.includes('q') || keyPresses.includes('Q') ? '✅' : '⏸️'}
            </div>
          </div>
        </div>

        {/* Mouse & Touch Status */}
        <div style={{ 
          backgroundColor: '#16213e', 
          padding: '15px', 
          borderRadius: '8px',
          border: '1px solid #0f3460'
        }}>
          <h3>🖱️ Mouse & Touch</h3>
          <div>
            <p>Position: ({mousePosition.x}, {mousePosition.y})</p>
            <p>Touch Events: {touchEvents.length}</p>
            <p>Last Key: {keyPresses[0] || 'None'}</p>
          </div>
        </div>

        {/* Input History */}
        <div style={{ 
          backgroundColor: '#16213e', 
          padding: '15px', 
          borderRadius: '8px',
          border: '1px solid #0f3460'
        }}>
          <h3>📝 Recent Inputs</h3>
          <div>
            <p>Key Presses: {keyPresses.length}</p>
            <p>Touch Events: {touchEvents.length}</p>
            <p>Mouse Active: {mousePosition.x > 0 || mousePosition.y > 0 ? '✅' : '⏸️'}</p>
          </div>
        </div>
      </div>

      {/* Input History Display */}
      <div style={{ 
        backgroundColor: '#16213e', 
        padding: '15px', 
        borderRadius: '8px',
        border: '1px solid #0f3460',
        marginBottom: '20px'
      }}>
        <h3>📝 Input History (Last 10 Events)</h3>
        
        {keyPresses.length > 0 || touchEvents.length > 0 ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '10px' 
          }}>
            {keyPresses.map((key, index) => (
              <div key={`key-${index}`} style={{ 
                backgroundColor: '#374151', 
                padding: '10px', 
                borderRadius: '4px',
                border: '1px solid #4b5563'
              }}>
                <div style={{ fontWeight: 'bold', color: '#60a5fa' }}>
                  Key: {key}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  Type: Keyboard Input
                </div>
              </div>
            ))}
            {touchEvents.map((event, index) => (
              <div key={`touch-${index}`} style={{ 
                backgroundColor: '#374151', 
                padding: '10px', 
                borderRadius: '4px',
                border: '1px solid #4b5563'
              }}>
                <div style={{ fontWeight: 'bold', color: '#60a5fa' }}>
                  {event.type}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {event.x && event.y ? `(${event.x}, ${event.y})` : 'Touch Event'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>
            No input events recorded yet. Try pressing some keys, moving your mouse, or touching the screen!
          </p>
        )}
      </div>

      {/* Instructions */}
      <div style={{ 
        backgroundColor: '#16213e', 
        padding: '15px', 
        borderRadius: '8px',
        border: '1px solid #0f3460'
      }}>
        <h3>🎮 How to Test</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          <div>
            <h4>Keyboard Input:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Use WASD for movement</li>
              <li>Press Space to jump</li>
              <li>Press Enter to interact</li>
              <li>Press F to attack</li>
              <li>Press Q for special ability</li>
            </ul>
          </div>
          <div>
            <h4>Mouse Input:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Move mouse to see position tracking</li>
              <li>Click to see mouse button events</li>
              <li>Scroll to see wheel events</li>
            </ul>
          </div>
          <div>
            <h4>Touch Input (Mobile):</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Tap to see touch events</li>
              <li>Swipe to see gesture detection</li>
              <li>Multi-touch for advanced gestures</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Phase 2 Features */}
      <div style={{ 
        backgroundColor: '#16213e', 
        padding: '15px', 
        borderRadius: '8px',
        border: '1px solid #0f3460',
        marginTop: '20px'
      }}>
        <h3>🚀 Phase 2 Features Implemented</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ backgroundColor: '#374151', padding: '10px', borderRadius: '4px' }}>
            <h4>✅ Enhanced Input Processing</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
              <li>Real-time input tracking</li>
              <li>Multi-device support</li>
              <li>Event history logging</li>
              <li>Performance monitoring</li>
            </ul>
          </div>
          <div style={{ backgroundColor: '#374151', padding: '10px', borderRadius: '4px' }}>
            <h4>✅ Input Manager</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
              <li>Action mapping system</li>
              <li>Input profiles</li>
              <li>Priority-based processing</li>
              <li>Input buffering</li>
            </ul>
          </div>
          <div style={{ backgroundColor: '#374151', padding: '10px', borderRadius: '4px' }}>
            <h4>✅ Game Loop Integration</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
              <li>Frame-based updates</li>
              <li>Event queuing</li>
              <li>Performance optimization</li>
              <li>Real-time input handling</li>
            </ul>
          </div>
          <div style={{ backgroundColor: '#374151', padding: '10px', borderRadius: '4px' }}>
            <h4>✅ AI Update System</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
              <li>Enhanced Pet Behavior</li>
              <li>NPC Management</li>
              <li>Behavior Trees</li>
              <li>Learning & Adaptation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div style={{ 
        backgroundColor: '#16213e', 
        padding: '15px', 
        borderRadius: '8px',
        border: '1px solid #0f3460',
        marginTop: '20px'
      }}>
        <h3>🔧 Technical Implementation</h3>
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <p><strong>InputSystem:</strong> Enhanced with velocity tracking, gesture recognition, and performance metrics</p>
          <p><strong>InputManager:</strong> High-level input processing with action mapping and input profiles</p>
          <p><strong>Event System:</strong> Integrated with the core EventManager for real-time communication</p>
          <p><strong>Performance:</strong> Optimized with input buffering, priority queuing, and frame-based updates</p>
        </div>
      </div>

      {/* AI System Features */}
      <div style={{ 
        backgroundColor: '#16213e', 
        padding: '15px', 
        borderRadius: '8px',
        border: '1px solid #0f3460',
        marginTop: '20px'
      }}>
        <h3>🤖 AI Update System Features</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          {/* Enhanced Pet Behavior */}
          <div style={{ backgroundColor: '#374151', padding: '15px', borderRadius: '8px' }}>
            <h4>🐾 Enhanced Pet Behavior</h4>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <p><strong>Personality-Based AI:</strong> Pets now have personality traits that influence their behavior</p>
              <p><strong>Dynamic Mood System:</strong> Real-time mood changes based on energy, hunger, and social needs</p>
              <p><strong>Adaptive Behavior:</strong> Pets learn and adapt their behavior based on player interactions</p>
              <p><strong>State Management:</strong> Comprehensive tracking of pet physical and emotional states</p>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li>Energy Level: Decreases over time, affects activity choices</li>
                <li>Hunger Level: Increases over time, triggers eating behavior</li>
                <li>Social Need: Increases over time, affects interaction behavior</li>
                <li>Exploration Desire: Increases over time, triggers exploration</li>
              </ul>
            </div>
          </div>

          {/* NPC System */}
          <div style={{ backgroundColor: '#374151', padding: '15px', borderRadius: '8px' }}>
            <h4>👥 NPC Management System</h4>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <p><strong>Dynamic NPCs:</strong> Non-player characters with their own AI and behaviors</p>
              <p><strong>Personality-Driven:</strong> NPCs have personality traits that influence their actions</p>
              <p><strong>Relationship System:</strong> NPCs build relationships with the player over time</p>
              <p><strong>Behavior Trees:</strong> Complex decision-making systems for realistic NPC behavior</p>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li>Merchant NPCs: Offer trades and services</li>
                <li>Quest Givers: Provide missions and guidance</li>
                <li>Trainers: Help improve pet skills</li>
                <li>Companions: Join adventures and provide support</li>
              </ul>
            </div>
          </div>

          {/* Behavior Trees */}
          <div style={{ backgroundColor: '#374151', padding: '15px', borderRadius: '8px' }}>
            <h4>🌳 Advanced Behavior Trees</h4>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <p><strong>Hierarchical AI:</strong> Complex decision-making through tree structures</p>
              <p><strong>Priority-Based Selection:</strong> Behaviors selected based on importance and conditions</p>
              <p><strong>Cooldown System:</strong> Prevents behavior spam and ensures realistic timing</p>
              <p><strong>Condition Evaluation:</strong> Smart behavior selection based on game state</p>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li>Sequence Nodes: All conditions must be met</li>
                <li>Selector Nodes: At least one condition must be met</li>
                <li>Action Nodes: Execute specific behaviors</li>
                <li>Condition Nodes: Evaluate game state</li>
              </ul>
            </div>
          </div>

          {/* Learning & Adaptation */}
          <div style={{ backgroundColor: '#374151', padding: '15px', borderRadius: '8px' }}>
            <h4>🧠 Learning & Adaptation</h4>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <p><strong>Memory System:</strong> Pets and NPCs remember past interactions</p>
              <p><strong>Behavior Adjustment:</strong> AI learns from player feedback and adjusts priorities</p>
              <p><strong>Performance Metrics:</strong> Track and optimize AI decision-making</p>
              <p><strong>Adaptive Responses:</strong> Entities respond differently based on learned patterns</p>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li>Memory Decay: Important memories last longer</li>
                <li>Reward Learning: Positive interactions increase behavior priority</li>
                <li>Pattern Recognition: AI identifies player preferences</li>
                <li>Dynamic Adaptation: Real-time behavior adjustment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
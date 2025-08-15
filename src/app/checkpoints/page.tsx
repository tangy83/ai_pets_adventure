'use client'

import { useState, useEffect } from 'react'
import { CheckpointSystem, CheckpointData, CheckpointSummary } from '../../worlds/CheckpointSystem'

export default function CheckpointsPage() {
  const [checkpointSystem, setCheckpointSystem] = useState<CheckpointSystem | null>(null)
  const [checkpoints, setCheckpoints] = useState<CheckpointSummary[]>([])
  const [currentCheckpoint, setCurrentCheckpoint] = useState<CheckpointData | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Form states
  const [checkpointName, setCheckpointName] = useState('')
  const [playerData, setPlayerData] = useState({
    level: 1,
    experience: 0,
    coins: 0,
    orbs: 0,
    reputation: 0,
    petBond: 0
  })
  const [questProgress, setQuestProgress] = useState({
    activeQuests: [],
    completedQuests: [],
    questPoints: 0
  })
  const [achievements, setAchievements] = useState({
    unlocked: [],
    progress: {}
  })
  const [gameState, setGameState] = useState({
    currentWorld: 'default',
    unlockedAreas: [],
    inventory: {},
    skills: {},
    playTime: 0
  })

  useEffect(() => {
    const initSystem = () => {
      try {
        const system = CheckpointSystem.getInstance()
        setCheckpointSystem(system)
        
        // Load initial data
        refreshCheckpoints()
        refreshStats()
        
        // Listen for events
        system.eventManager.on('checkpoint:created', handleCheckpointEvent)
        system.eventManager.on('checkpoint:restored', handleCheckpointEvent)
        system.eventManager.on('checkpoint:deleted', handleCheckpointEvent)
        system.eventManager.on('checkpoint:updated', handleCheckpointEvent)
        system.eventManager.on('checkpoint:imported', handleCheckpointEvent)
        system.eventManager.on('checkpoint:cleared', handleCheckpointEvent)
        
        addLog('✅ Checkpoint System initialized')
      } catch (error) {
        addLog(`❌ Failed to initialize: ${error}`)
      }
    }

    initSystem()
  }, [])

  const handleCheckpointEvent = (data: any) => {
    refreshCheckpoints()
    refreshStats()
    addLog(`📊 Event: ${Object.keys(data)[0]} - ${data.id || 'N/A'}`)
  }

  const refreshCheckpoints = () => {
    if (!checkpointSystem) return
    const allCheckpoints = checkpointSystem.getAllCheckpoints()
    console.log('Refreshing checkpoints:', allCheckpoints)
    setCheckpoints(allCheckpoints)
    
    const current = checkpointSystem.getCurrentCheckpoint()
    setCurrentCheckpoint(current)
  }

  const refreshStats = () => {
    if (!checkpointSystem) return
    const checkpointStats = checkpointSystem.getCheckpointStats()
    setStats(checkpointStats)
  }

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)])
  }

  const createCheckpoint = async () => {
    if (!checkpointSystem || !checkpointName.trim()) {
      addLog('❌ Please enter a checkpoint name')
      return
    }

    setIsLoading(true)
    try {
      console.log('Creating checkpoint with name:', checkpointName)
      const id = checkpointSystem.createCheckpoint(
        checkpointName,
        playerData,
        questProgress,
        achievements,
        gameState
      )
      
      console.log('Checkpoint created with ID:', id)
      addLog(`✅ Checkpoint created: ${checkpointName} (${id})`)
      setCheckpointName('')
      
      // Update play time
      setGameState(prev => ({ ...prev, playTime: prev.playTime + 60000 })) // Add 1 minute
      
      // Refresh the checkpoints list to show the new checkpoint
      refreshCheckpoints()
      refreshStats()
      
    } catch (error) {
      addLog(`❌ Failed to create checkpoint: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const restoreCheckpoint = async (checkpointId: string) => {
    if (!checkpointSystem) return

    setIsLoading(true)
    try {
      const checkpoint = checkpointSystem.restoreCheckpoint(checkpointId)
      
      if (checkpoint) {
        // Update form data with restored values
        setPlayerData(checkpoint.playerData)
        setQuestProgress(checkpoint.questProgress)
        setAchievements(checkpoint.achievements)
        setGameState(checkpoint.gameState)
        
        addLog(`✅ Checkpoint restored: ${checkpoint.name}`)
      } else {
        addLog('❌ Failed to restore checkpoint')
      }
    } catch (error) {
      addLog(`❌ Error restoring checkpoint: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteCheckpoint = async (checkpointId: string) => {
    if (!checkpointSystem) return

    if (confirm('Are you sure you want to delete this checkpoint?')) {
      try {
        const deleted = checkpointSystem.deleteCheckpoint(checkpointId)
        
        if (deleted) {
          addLog(`🗑️ Checkpoint deleted: ${checkpointId}`)
        } else {
          addLog('❌ Failed to delete checkpoint')
        }
      } catch (error) {
        addLog(`❌ Error deleting checkpoint: ${error}`)
      }
    }
  }

  const exportCheckpoint = (checkpointId: string) => {
    if (!checkpointSystem) return

    try {
      const exportData = checkpointSystem.exportCheckpoint(checkpointId)
      
      if (exportData) {
        // Create download link
        const blob = new Blob([exportData], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `checkpoint_${checkpointId}.json`
        a.click()
        URL.revokeObjectURL(url)
        
        addLog(`📤 Checkpoint exported: ${checkpointId}`)
      } else {
        addLog('❌ Failed to export checkpoint')
      }
    } catch (error) {
      addLog(`❌ Error exporting checkpoint: ${error}`)
    }
  }

  const importCheckpoint = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!checkpointSystem || !event.target.files?.[0]) return

    const file = event.target.files[0]
    setIsLoading(true)

    try {
      const text = await file.text()
      const id = checkpointSystem.importCheckpoint(text)
      
      if (id) {
        addLog(`📥 Checkpoint imported: ${id}`)
      } else {
        addLog('❌ Failed to import checkpoint')
      }
    } catch (error) {
      addLog(`❌ Error importing checkpoint: ${error}`)
    } finally {
      setIsLoading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const clearAllCheckpoints = () => {
    if (!checkpointSystem) return

    if (confirm('Are you sure you want to delete ALL checkpoints? This cannot be undone!')) {
      try {
        checkpointSystem.clearAllCheckpoints()
        addLog('🗑️ All checkpoints cleared')
      } catch (error) {
        addLog(`❌ Error clearing checkpoints: ${error}`)
      }
    }
  }

  const simulateGameProgress = () => {
    // Simulate gaining experience and completing objectives
    setPlayerData(prev => ({
      ...prev,
      level: prev.level + 1,
      experience: prev.experience + 100,
      coins: prev.coins + 50,
      orbs: prev.orbs + 5,
      reputation: prev.reputation + 10,
      petBond: Math.min(100, prev.petBond + 5)
    }))

    setQuestProgress(prev => ({
      ...prev,
      questPoints: prev.questPoints + 25
    }))

    setGameState(prev => ({
      ...prev,
      playTime: prev.playTime + 300000 // Add 5 minutes
    }))

    addLog('🎮 Simulated game progress')
  }

  const resetGameState = () => {
    setPlayerData({
      level: 1,
      experience: 0,
      coins: 0,
      orbs: 0,
      reputation: 0,
      petBond: 0
    })
    setQuestProgress({
      activeQuests: [],
      completedQuests: [],
      questPoints: 0
    })
    setAchievements({
      unlocked: [],
      progress: {}
    })
    setGameState({
      currentWorld: 'default',
      unlockedAreas: [],
      inventory: {},
      skills: {},
      playTime: 0
    })
    
    addLog('🔄 Game state reset')
  }

  if (!checkpointSystem) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>⏳ Loading Checkpoint System...</h1>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#1a1a2e',
      color: 'white',
      minHeight: '100vh'
    }}>
      <h1>💾 Checkpoint System - Quest Progress Manager</h1>
      <p>Save, restore, and manage your quest progress and game state</p>

      {/* Quick Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <a 
          href="/" 
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            marginRight: '10px'
          }}
        >
          🏠 Back to Home
        </a>
        <a 
          href="/test-rewards" 
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px'
          }}
        >
          🎯 Test Rewards
        </a>
      </div>

      {/* System Statistics */}
      {stats && (
        <div style={{ 
          backgroundColor: '#16213e', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #0f3460'
        }}>
          <h3>📊 System Statistics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <p><strong>Total Checkpoints:</strong> {stats.total}</p>
              <p><strong>Total Play Time:</strong> {Math.floor(stats.totalPlayTime / 60000)}m</p>
            </div>
            <div>
              <p><strong>Average Level:</strong> {stats.averageLevel}</p>
              <p><strong>Total Points:</strong> {stats.totalPoints.toLocaleString()}</p>
            </div>
            {stats.mostRecent && (
              <div>
                <p><strong>Most Recent:</strong> {stats.mostRecent.name}</p>
                <p><strong>Level:</strong> {stats.mostRecent.playerLevel}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Game State Form */}
      <div style={{ 
        backgroundColor: '#16213e', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #0f3460'
      }}>
        <h3>🎮 Current Game State</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Player Data */}
          <div>
            <h4>👤 Player Data</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label>
                Level:
                <input
                  type="number"
                  value={playerData.level}
                  onChange={(e) => setPlayerData(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </label>
              <label>
                Experience:
                <input
                  type="number"
                  value={playerData.experience}
                  onChange={(e) => setPlayerData(prev => ({ ...prev, experience: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </label>
              <label>
                Coins:
                <input
                  type="number"
                  value={playerData.coins}
                  onChange={(e) => setPlayerData(prev => ({ ...prev, coins: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </label>
              <label>
                Orbs:
                <input
                  type="number"
                  value={playerData.orbs}
                  onChange={(e) => setPlayerData(prev => ({ ...prev, orbs: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </label>
              <label>
                Reputation:
                <input
                  type="number"
                  value={playerData.reputation}
                  onChange={(e) => setPlayerData(prev => ({ ...prev, reputation: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </label>
              <label>
                Pet Bond:
                <input
                  type="number"
                  value={playerData.petBond}
                  onChange={(e) => setPlayerData(prev => ({ ...prev, petBond: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </label>
            </div>
          </div>

          {/* Quest Progress */}
          <div>
            <h4>🎯 Quest Progress</h4>
            <label>
              Quest Points:
              <input
                type="number"
                value={questProgress.questPoints}
                onChange={(e) => setQuestProgress(prev => ({ ...prev, questPoints: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', padding: '5px', marginTop: '5px' }}
              />
            </label>
            <label>
              Current World:
              <input
                type="text"
                value={gameState.currentWorld}
                onChange={(e) => setGameState(prev => ({ ...prev, currentWorld: e.target.value }))}
                style={{ width: '100%', padding: '5px', marginTop: '5px' }}
              />
            </label>
            <label>
              Play Time (minutes):
              <input
                type="number"
                value={Math.floor(gameState.playTime / 60000)}
                onChange={(e) => setGameState(prev => ({ ...prev, playTime: (parseInt(e.target.value) || 0) * 60000 }))}
                style={{ width: '100%', padding: '5px', marginTop: '5px' }}
              />
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={simulateGameProgress}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🎮 Simulate Progress
          </button>
          <button
            onClick={resetGameState}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🔄 Reset State
          </button>
        </div>
      </div>

      {/* Checkpoint Management */}
      <div style={{ 
        backgroundColor: '#16213e', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #0f3460'
      }}>
        <h3>💾 Checkpoint Management</h3>
        
        {/* Create Checkpoint */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'end', flexWrap: 'wrap' }}>
            <label style={{ flex: '1', minWidth: '200px' }}>
              Checkpoint Name:
              <input
                type="text"
                value={checkpointName}
                onChange={(e) => setCheckpointName(e.target.value)}
                placeholder="Enter checkpoint name..."
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </label>
            <button
              onClick={createCheckpoint}
              disabled={isLoading || !checkpointName.trim()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? '⏳ Creating...' : '💾 Create Checkpoint'}
            </button>
          </div>
        </div>

        {/* Import/Export */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <label style={{ cursor: 'pointer' }}>
              <input
                type="file"
                accept=".json"
                onChange={importCheckpoint}
                style={{ display: 'none' }}
              />
              <span style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#2196F3',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                📥 Import Checkpoint
              </span>
            </label>
            <button
              onClick={clearAllCheckpoints}
              style={{
                padding: '10px 20px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🗑️ Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Checkpoints List */}
      <div style={{ 
        backgroundColor: '#16213e', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #0f3460'
      }}>
        <h3>📋 Saved Checkpoints ({checkpoints.length})</h3>
        
        {checkpoints.length === 0 ? (
          <div style={{ 
            backgroundColor: '#0f3460', 
            padding: '20px', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <p>No checkpoints saved yet. Create your first checkpoint above!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {checkpoints.map((checkpoint) => (
              <div
                key={checkpoint.id}
                style={{
                  backgroundColor: '#0f3460',
                  padding: '15px',
                  borderRadius: '6px',
                  border: currentCheckpoint?.id === checkpoint.id ? '2px solid #4CAF50' : '1px solid #533483'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, color: currentCheckpoint?.id === checkpoint.id ? '#4CAF50' : 'white' }}>
                    {checkpoint.name} {currentCheckpoint?.id === checkpoint.id && '✅'}
                  </h4>
                  <span style={{ color: '#888', fontSize: '12px' }}>
                    {new Date(checkpoint.timestamp).toLocaleString()}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                  <div><strong>Level:</strong> {checkpoint.playerLevel}</div>
                  <div><strong>Points:</strong> {checkpoint.totalPoints.toLocaleString()}</div>
                  <div><strong>Quests:</strong> {checkpoint.questsCompleted}</div>
                  <div><strong>Play Time:</strong> {checkpoint.playTime}</div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => restoreCheckpoint(checkpoint.id)}
                    disabled={isLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    🔄 Restore
                  </button>
                  <button
                    onClick={() => exportCheckpoint(checkpoint.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    📤 Export
                  </button>
                  <button
                    onClick={() => deleteCheckpoint(checkpoint.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Logs */}
      <div style={{ 
        backgroundColor: '#16213e', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #0f3460'
      }}>
        <h3>📝 System Logs</h3>
        <div style={{ 
          backgroundColor: '#0f3460', 
          padding: '15px', 
          borderRadius: '4px',
          maxHeight: '300px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {logs.length === 0 ? (
            <p style={{ color: '#888', textAlign: 'center' }}>No logs yet. Start using the system to see activity.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '5px', color: '#ddd' }}>
                {log}
              </div>
            ))
          )}
        </div>
        <button
          onClick={() => setLogs([])}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🗑️ Clear Logs
        </button>
      </div>
    </div>
  )
}

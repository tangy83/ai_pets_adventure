import React, { useState, useEffect, useRef } from 'react'
import { MemoryManagement, TextureAtlasConfig, ObjectPoolConfig, MemoryStats } from '../core/MemoryManagement'
import { EventManager } from '../core/EventManager'
import './MemoryManagementDemo.css'

interface TextureAtlasInfo {
  id: string
  size: number
  textureCount: number
  memoryUsage: number
  isFull: boolean
}

interface ObjectPoolInfo {
  type: string
  available: number
  inUse: number
  totalCreated: number
  totalReused: number
  utilization: number
}

export const MemoryManagementDemo: React.FC = () => {
  const [eventManager] = useState(() => EventManager.getInstance())
  const [memoryManagement] = useState(() => new MemoryManagement(eventManager))
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
    totalMemoryUsage: 0,
    textureMemoryUsage: 0,
    objectPoolMemoryUsage: 0,
    cacheMemoryUsage: 0,
    atlasCount: 0,
    poolCount: 0,
    cacheHitRate: 0,
    memoryEfficiency: 0
  })
  const [textureAtlases, setTextureAtlases] = useState<TextureAtlasInfo[]>([])
  const [objectPools, setObjectPools] = useState<ObjectPoolInfo[]>([])
  const [events, setEvents] = useState<string[]>([])
  const [isEnabled, setIsEnabled] = useState(true)
  const [atlasConfig, setAtlasConfig] = useState<TextureAtlasConfig>({
    maxAtlasSize: 2048,
    padding: 2,
    powerOfTwo: true,
    format: 'webp',
    quality: 0.9
  })
  const [poolConfig, setPoolConfig] = useState<ObjectPoolConfig>({
    initialSize: 50,
    maxSize: 1000,
    growthFactor: 1.5,
    shrinkThreshold: 0.3,
    enableAutoResize: true
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    // Setup event listeners
    const eventHandlers = {
      [MemoryManagement.EVENTS.TEXTURE_ATLAS_CREATED]: (data: any) => {
        addEvent(`Texture Atlas Created: ${data.atlasId} (${data.size}x${data.size})`)
        updateTextureAtlases()
      },
      [MemoryManagement.EVENTS.TEXTURE_ATLAS_FULL]: (data: any) => {
        addEvent(`Texture Atlas Full: ${data.atlasId}`)
        updateTextureAtlases()
      },
      [MemoryManagement.EVENTS.TEXTURE_ADDED]: (data: any) => {
        addEvent(`Texture Added: ${data.textureId} to ${data.atlasId}`)
        updateTextureAtlases()
      },
      [MemoryManagement.EVENTS.OBJECT_POOL_CREATED]: (data: any) => {
        addEvent(`Object Pool Created: ${data.poolType} (${data.initialSize})`)
        updateObjectPools()
      },
      [MemoryManagement.EVENTS.OBJECT_POOL_RESIZED]: (data: any) => {
        addEvent(`Object Pool Resized: ${data.poolType} (${data.newSize})`)
        updateObjectPools()
      },
      [MemoryManagement.EVENTS.MEMORY_WARNING]: (data: any) => {
        addEvent(`Memory Warning: ${Math.round(data.usage * 100)}% usage`)
      },
      [MemoryManagement.EVENTS.MEMORY_OPTIMIZED]: (data: any) => {
        addEvent(`Memory Optimized: Saved ${Math.round(data.memorySaved / 1024)}KB`)
        updateMemoryStats()
      },
      [MemoryManagement.EVENTS.TEXTURE_ATLAS_OPTIMIZED]: (data: any) => {
        addEvent(`Texture Atlas Optimized: Saved ${Math.round(data.memorySaved / 1024)}KB`)
        updateTextureAtlases()
      }
    }

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      eventManager.on(event, handler)
    })

    // Start monitoring
    startMonitoring()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        eventManager.off(event, handler)
      })
    }
  }, [eventManager, memoryManagement])

  const startMonitoring = () => {
    const updateStats = () => {
      if (isEnabled) {
        updateMemoryStats()
        updateTextureAtlases()
        updateObjectPools()
      }
      animationFrameRef.current = requestAnimationFrame(updateStats)
    }
    updateStats()
  }

  const updateMemoryStats = () => {
    const stats = memoryManagement.getMemoryStats()
    setMemoryStats(stats)
  }

  const updateTextureAtlases = () => {
    // This would need to be implemented with actual atlas data
    // For demo purposes, we'll use mock data
    setTextureAtlases([
      {
        id: 'main-atlas',
        size: 2048,
        textureCount: 15,
        memoryUsage: 2.5 * 1024 * 1024, // 2.5MB
        isFull: false
      },
      {
        id: 'ui-atlas',
        size: 1024,
        textureCount: 8,
        memoryUsage: 0.8 * 1024 * 1024, // 0.8MB
        isFull: false
      }
    ])
  }

  const updateObjectPools = () => {
    // This would need to be implemented with actual pool data
    // For demo purposes, we'll use mock data
    setObjectPools([
      {
        type: 'GameObject',
        available: 45,
        inUse: 5,
        totalCreated: 50,
        totalReused: 120,
        utilization: 0.1
      },
      {
        type: 'Particle',
        available: 80,
        inUse: 20,
        totalCreated: 100,
        totalReused: 350,
        utilization: 0.2
      }
    ])
  }

  const addEvent = (message: string) => {
    setEvents(prev => [new Date().toLocaleTimeString() + ': ' + message, ...prev.slice(0, 49)])
  }

  const createDemoAtlas = () => {
    try {
      const atlas = memoryManagement.createTextureAtlas('demo-atlas', 1024)
      addEvent(`Demo Atlas Created: ${atlas.id}`)
    } catch (error) {
      addEvent(`Error: ${error}`)
    }
  }

  const createDemoObjectPool = () => {
    try {
      const pool = memoryManagement.createObjectPool(
        'demo-pool',
        () => ({ id: Date.now(), data: 'demo' }),
        (obj: any) => { obj.data = 'demo' },
        { initialSize: 10, maxSize: 100 }
      )
      addEvent(`Demo Object Pool Created: ${pool.type}`)
    } catch (error) {
      addEvent(`Error: ${error}`)
    }
  }

  const optimizeMemory = () => {
    memoryManagement.optimizeMemory()
    addEvent('Memory optimization triggered')
  }

  const clearEvents = () => {
    setEvents([])
  }

  const toggleSystem = () => {
    if (isEnabled) {
      memoryManagement.disable()
      setIsEnabled(false)
      addEvent('Memory Management System Disabled')
    } else {
      memoryManagement.enable()
      setIsEnabled(true)
      addEvent('Memory Management System Enabled')
    }
  }

  const updateAtlasConfig = (updates: Partial<TextureAtlasConfig>) => {
    const newConfig = { ...atlasConfig, ...updates }
    setAtlasConfig(newConfig)
    memoryManagement.setAtlasConfig(newConfig)
    addEvent('Atlas configuration updated')
  }

  const updatePoolConfig = (updates: Partial<ObjectPoolConfig>) => {
    const newConfig = { ...poolConfig, ...updates }
    setPoolConfig(newConfig)
    memoryManagement.setPoolConfig(newConfig)
    addEvent('Pool configuration updated')
  }

  return (
    <div className="memory-management-demo">
      <div className="demo-header">
        <h1>Memory Management Demo</h1>
        <p>Texture Atlasing & Enhanced Object Pooling for Web Optimization</p>
      </div>

      <div className="demo-controls">
        <div className="control-group">
          <h3>System Controls</h3>
          <button 
            className={`control-btn ${isEnabled ? 'enabled' : 'disabled'}`}
            onClick={toggleSystem}
          >
            {isEnabled ? 'Disable' : 'Enable'} System
          </button>
          <button className="control-btn" onClick={optimizeMemory}>
            Optimize Memory
          </button>
          <button className="control-btn" onClick={clearEvents}>
            Clear Events
          </button>
        </div>

        <div className="control-group">
          <h3>Demo Actions</h3>
          <button className="control-btn" onClick={createDemoAtlas}>
            Create Demo Atlas
          </button>
          <button className="control-btn" onClick={createDemoObjectPool}>
            Create Demo Object Pool
          </button>
        </div>
      </div>

      <div className="demo-content">
        <div className="content-section">
          <h3>Memory Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <label>Total Memory Usage:</label>
              <span>{Math.round(memoryStats.totalMemoryUsage * 100)}%</span>
            </div>
            <div className="stat-item">
              <label>Texture Memory:</label>
              <span>{Math.round(memoryStats.textureMemoryUsage / 1024)}KB</span>
            </div>
            <div className="stat-item">
              <label>Object Pool Memory:</label>
              <span>{Math.round(memoryStats.objectPoolMemoryUsage / 1024)}KB</span>
            </div>
            <div className="stat-item">
              <label>Cache Memory:</label>
              <span>{Math.round(memoryStats.cacheMemoryUsage / 1024)}KB</span>
            </div>
            <div className="stat-item">
              <label>Atlas Count:</label>
              <span>{memoryStats.atlasCount}</span>
            </div>
            <div className="stat-item">
              <label>Pool Count:</label>
              <span>{memoryStats.poolCount}</span>
            </div>
            <div className="stat-item">
              <label>Cache Hit Rate:</label>
              <span>{Math.round(memoryStats.cacheHitRate * 100)}%</span>
            </div>
            <div className="stat-item">
              <label>Memory Efficiency:</label>
              <span>{Math.round(memoryStats.memoryEfficiency * 100)}%</span>
            </div>
          </div>
        </div>

        <div className="content-section">
          <h3>Texture Atlases</h3>
          <div className="atlas-list">
            {textureAtlases.map(atlas => (
              <div key={atlas.id} className={`atlas-item ${atlas.isFull ? 'full' : ''}`}>
                <div className="atlas-header">
                  <h4>{atlas.id}</h4>
                  <span className={`status ${atlas.isFull ? 'full' : 'active'}`}>
                    {atlas.isFull ? 'Full' : 'Active'}
                  </span>
                </div>
                <div className="atlas-details">
                  <div>Size: {atlas.size}x{atlas.size}</div>
                  <div>Textures: {atlas.textureCount}</div>
                  <div>Memory: {Math.round(atlas.memoryUsage / 1024)}KB</div>
                </div>
              </div>
            ))}
            {textureAtlases.length === 0 && (
              <div className="empty-state">No texture atlases created yet</div>
            )}
          </div>
        </div>

        <div className="content-section">
          <h3>Object Pools</h3>
          <div className="pool-list">
            {objectPools.map(pool => (
              <div key={pool.type} className="pool-item">
                <div className="pool-header">
                  <h4>{pool.type}</h4>
                  <span className={`utilization ${pool.utilization > 0.7 ? 'high' : pool.utilization > 0.3 ? 'medium' : 'low'}`}>
                    {Math.round(pool.utilization * 100)}% Utilized
                  </span>
                </div>
                <div className="pool-details">
                  <div>Available: {pool.available}</div>
                  <div>In Use: {pool.inUse}</div>
                  <div>Total Created: {pool.totalCreated}</div>
                  <div>Total Reused: {pool.totalReused}</div>
                </div>
              </div>
            ))}
            {objectPools.length === 0 && (
              <div className="empty-state">No object pools created yet</div>
            )}
          </div>
        </div>

        <div className="content-section">
          <h3>Configuration</h3>
          <div className="config-grid">
            <div className="config-group">
              <h4>Texture Atlas Config</h4>
              <div className="config-item">
                <label>Max Size:</label>
                <input
                  type="number"
                  value={atlasConfig.maxAtlasSize}
                  onChange={(e) => updateAtlasConfig({ maxAtlasSize: parseInt(e.target.value) })}
                  min="256"
                  max="8192"
                  step="256"
                />
              </div>
              <div className="config-item">
                <label>Padding:</label>
                <input
                  type="number"
                  value={atlasConfig.padding}
                  onChange={(e) => updateAtlasConfig({ padding: parseInt(e.target.value) })}
                  min="0"
                  max="16"
                />
              </div>
              <div className="config-item">
                <label>
                  <input
                    type="checkbox"
                    checked={atlasConfig.powerOfTwo}
                    onChange={(e) => updateAtlasConfig({ powerOfTwo: e.target.checked })}
                  />
                  Power of Two
                </label>
              </div>
            </div>

            <div className="config-group">
              <h4>Object Pool Config</h4>
              <div className="config-item">
                <label>Initial Size:</label>
                <input
                  type="number"
                  value={poolConfig.initialSize}
                  onChange={(e) => updatePoolConfig({ initialSize: parseInt(e.target.value) })}
                  min="1"
                  max="1000"
                />
              </div>
              <div className="config-item">
                <label>Max Size:</label>
                <input
                  type="number"
                  value={poolConfig.maxSize}
                  onChange={(e) => updatePoolConfig({ maxSize: parseInt(e.target.value) })}
                  min="poolConfig.initialSize"
                  max="10000"
                />
              </div>
              <div className="config-item">
                <label>Growth Factor:</label>
                <input
                  type="number"
                  value={poolConfig.growthFactor}
                  onChange={(e) => updatePoolConfig({ growthFactor: parseFloat(e.target.value) })}
                  min="1.1"
                  max="3.0"
                  step="0.1"
                />
              </div>
              <div className="config-item">
                <label>
                  <input
                    type="checkbox"
                    checked={poolConfig.enableAutoResize}
                    onChange={(e) => updatePoolConfig({ enableAutoResize: e.target.checked })}
                  />
                  Auto Resize
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="content-section">
          <h3>Event Log</h3>
          <div className="event-log">
            {events.map((event, index) => (
              <div key={index} className="event-item">
                {event}
              </div>
            ))}
            {events.length === 0 && (
              <div className="empty-state">No events logged yet</div>
            )}
          </div>
        </div>
      </div>

      <div className="demo-footer">
        <p>Memory Management System - Phase 2.3 Web Optimization</p>
        <p>Features: Texture Atlasing, Enhanced Object Pooling, Memory Monitoring</p>
      </div>
    </div>
  )
}


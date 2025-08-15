import React, { useState, useEffect, useRef } from 'react'
import { GameAssetLazyLoader, GameAsset, LazyLoadConfig, LoadProgress } from '../core/GameAssetLazyLoader'
import { EventManager } from '../core/EventManager'
import './GameAssetLazyLoaderDemo.css'

interface AssetDisplayProps {
  asset: GameAsset
  progress: LoadProgress | null
  onLoad: () => void
}

const AssetDisplay: React.FC<AssetDisplayProps> = ({ asset, progress, onLoad }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            onLoad()
          }
        })
      },
      { threshold: 0.1 }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [onLoad])

  useEffect(() => {
    if (progress?.status === 'loaded') {
      setIsLoaded(true)
    }
  }, [progress])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loaded': return '#4CAF50'
      case 'loading': return '#FF9800'
      case 'error': return '#F44336'
      default: return '#9E9E9E'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loaded': return '✅'
      case 'loading': return '⏳'
      case 'error': return '❌'
      default: return '⏸️'
    }
  }

  return (
    <div 
      ref={elementRef}
      className={`asset-display ${isVisible ? 'visible' : ''} ${isLoaded ? 'loaded' : ''}`}
      data-asset-id={asset.id}
    >
      <div className="asset-header">
        <span className="asset-type-icon">
          {asset.type === 'world' ? '🌍' : asset.type === 'texture' ? '🖼️' : '🔊'}
        </span>
        <span className="asset-name">{asset.metadata?.name || asset.id}</span>
        <span className="asset-priority priority-{asset.priority}">{asset.priority}</span>
      </div>
      
      <div className="asset-content">
        {!isVisible && (
          <div className="asset-placeholder">
            <div className="placeholder-text">Scroll to load</div>
          </div>
        )}
        
        {isVisible && !isLoaded && (
          <div className="asset-loading">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading...</div>
            {progress && (
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
            )}
          </div>
        )}
        
        {isLoaded && (
          <div className="asset-loaded">
            <div className="loaded-content">
              {asset.type === 'world' && (
                <div className="world-preview">
                  <div className="world-grid">
                    {Array.from({ length: 9 }, (_, i) => (
                      <div key={i} className="world-tile"></div>
                    ))}
                  </div>
                  <div className="world-info">
                    <div>Size: {(asset.size / 1024).toFixed(1)} KB</div>
                    <div>Difficulty: {asset.metadata?.difficulty || 'Unknown'}</div>
                  </div>
                </div>
              )}
              
              {asset.type === 'texture' && (
                <div className="texture-preview">
                  <div className="texture-sample" style={{ 
                    background: asset.metadata?.tiling ? 'repeating-linear-gradient(45deg, #4CAF50, #4CAF50 10px, #45a049 10px, #45a049 20px)' : '#4CAF50'
                  }}></div>
                  <div className="texture-info">
                    <div>Size: {(asset.size / 1024).toFixed(1)} KB</div>
                    <div>Tiling: {asset.metadata?.tiling ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              )}
              
              {asset.type === 'audio' && (
                <div className="audio-preview">
                  <div className="audio-visualizer">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div key={i} className="audio-bar" style={{ 
                        height: `${20 + Math.random() * 30}px`,
                        animationDelay: `${i * 0.1}s`
                      }}></div>
                    ))}
                  </div>
                  <div className="audio-info">
                    <div>Size: {(asset.size / 1024).toFixed(1)} KB</div>
                    <div>Loop: {asset.metadata?.loop ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="asset-footer">
        <div className="asset-status" style={{ color: getStatusColor(progress?.status || 'pending') }}>
          {getStatusIcon(progress?.status || 'pending')} {progress?.status || 'pending'}
        </div>
        <div className="asset-size">{(asset.size / 1024).toFixed(1)} KB</div>
      </div>
    </div>
  )
}

export const GameAssetLazyLoaderDemo: React.FC = () => {
  const [eventManager] = useState(() => EventManager.getInstance())
  const [lazyLoader] = useState(() => new GameAssetLazyLoader(eventManager))
  const [assets, setAssets] = useState<GameAsset[]>([])
  const [assetProgress, setAssetProgress] = useState<Map<string, LoadProgress>>(new Map())
  const [overallProgress, setOverallProgress] = useState<LoadProgress>({
    assetId: 'overall',
    loaded: 0,
    total: 0,
    percentage: 0,
    status: 'pending'
  })
  const [config, setConfig] = useState<LazyLoadConfig>({
    batchSize: 5,
    maxConcurrent: 3,
    preloadDistance: 100,
    cacheStrategy: 'memory',
    retryAttempts: 3,
    retryDelay: 1000
  })
  const [isLazyLoading, setIsLazyLoading] = useState(false)
  const [cacheStats, setCacheStats] = useState({
    totalAssets: 0,
    cachedAssets: 0,
    totalSize: 0,
    cachedSize: 0,
    hitRate: 0
  })
  const [events, setEvents] = useState<string[]>([])

  // Sample game assets
  const sampleAssets: GameAsset[] = [
    {
      id: 'forest-world',
      type: 'world',
      url: '/assets/worlds/forest.json',
      priority: 'high',
      size: 1024 * 75,
      metadata: { name: 'Enchanted Forest', difficulty: 'easy', biome: 'forest' }
    },
    {
      id: 'desert-world',
      type: 'world',
      url: '/assets/worlds/desert.json',
      priority: 'medium',
      size: 1024 * 60,
      metadata: { name: 'Sandy Desert', difficulty: 'medium', biome: 'desert' }
    },
    {
      id: 'mountain-world',
      type: 'world',
      url: '/assets/worlds/mountain.json',
      priority: 'low',
      size: 1024 * 90,
      metadata: { name: 'Rocky Mountains', difficulty: 'hard', biome: 'mountain' }
    },
    {
      id: 'grass-texture',
      type: 'texture',
      url: '/assets/textures/grass.png',
      priority: 'high',
      size: 1024 * 25,
      metadata: { name: 'Grass Texture', tiling: true, material: 'organic' }
    },
    {
      id: 'stone-texture',
      type: 'texture',
      url: '/assets/textures/stone.png',
      priority: 'medium',
      size: 1024 * 30,
      metadata: { name: 'Stone Texture', tiling: false, material: 'mineral' }
    },
    {
      id: 'wood-texture',
      type: 'texture',
      url: '/assets/textures/wood.png',
      priority: 'low',
      size: 1024 * 20,
      metadata: { name: 'Wood Texture', tiling: true, material: 'organic' }
    },
    {
      id: 'ambient-sound',
      type: 'audio',
      url: '/assets/audio/ambient.mp3',
      priority: 'high',
      size: 1024 * 150,
      metadata: { name: 'Ambient Sound', loop: true, category: 'atmosphere' }
    },
    {
      id: 'music-track',
      type: 'audio',
      url: '/assets/audio/music.mp3',
      priority: 'medium',
      size: 1024 * 200,
      metadata: { name: 'Background Music', loop: true, category: 'music' }
    },
    {
      id: 'effect-sound',
      type: 'audio',
      url: '/assets/audio/effect.mp3',
      priority: 'low',
      size: 1024 * 50,
      metadata: { name: 'Sound Effect', loop: false, category: 'effects' }
    }
  ]

  useEffect(() => {
    // Set up event listeners
    const eventHandlers = [
      'asset:registered',
      'asset:load:start',
      'asset:load:progress',
      'asset:load:complete',
      'asset:load:error',
      'asset:cache:hit',
      'asset:cache:miss',
      'asset:visibility:change',
      'batch:complete',
      'memory:warning'
    ]

    eventHandlers.forEach(eventType => {
      eventManager.on(eventType, (data) => {
        setEvents(prev => [`${eventType}: ${JSON.stringify(data)}`, ...prev.slice(0, 19)])
      })
    })

    // Initialize with sample assets
    setAssets(sampleAssets)
    sampleAssets.forEach(asset => lazyLoader.registerAsset(asset))

    // Update overall progress
    const updateProgress = () => {
      setOverallProgress(lazyLoader.getOverallProgress())
      setCacheStats(lazyLoader.getCacheStats())
    }

    const interval = setInterval(updateProgress, 100)

    return () => {
      clearInterval(interval)
      eventHandlers.forEach(eventType => eventManager.off(eventType))
    }
  }, [eventManager, lazyLoader])

  const handleAssetLoad = (assetId: string) => {
    // Update progress for this asset
    const progress = lazyLoader.getAssetProgress(assetId)
    if (progress) {
      setAssetProgress(prev => new Map(prev.set(assetId, progress)))
    }
  }

  const startLazyLoading = () => {
    lazyLoader.startLazyLoading()
    setIsLazyLoading(true)
  }

  const stopLazyLoading = () => {
    lazyLoader.stopLazyLoading()
    setIsLazyLoading(false)
  }

  const preloadAssets = (assetIds: string[]) => {
    lazyLoader.preloadAssets(assetIds)
  }

  const clearCache = () => {
    lazyLoader.clearCache()
    setAssetProgress(new Map())
  }

  const getAssetProgress = (assetId: string): LoadProgress | null => {
    return assetProgress.get(assetId) || null
  }

  const updateConfig = (updates: Partial<LazyLoadConfig>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    
    // Recreate lazy loader with new config
    lazyLoader.destroy()
    const newLazyLoader = new GameAssetLazyLoader(eventManager, newConfig)
    Object.assign(lazyLoader, newLazyLoader)
    
    // Re-register assets
    sampleAssets.forEach(asset => lazyLoader.registerAsset(asset))
  }

  return (
    <div className="game-asset-lazy-loader-demo">
      <div className="demo-header">
        <h1>🎮 Game Asset Lazy Loader Demo</h1>
        <p>Experience lazy loading for worlds, textures, and audio assets</p>
      </div>

      <div className="demo-controls">
        <div className="control-section">
          <h3>🚀 System Controls</h3>
          <div className="control-buttons">
            <button 
              onClick={startLazyLoading}
              disabled={isLazyLoading}
              className="btn btn-primary"
            >
              {isLazyLoading ? '⏳ Loading...' : '▶️ Start Lazy Loading'}
            </button>
            <button 
              onClick={stopLazyLoading}
              disabled={!isLazyLoading}
              className="btn btn-secondary"
            >
              ⏹️ Stop Lazy Loading
            </button>
            <button onClick={clearCache} className="btn btn-warning">
              🗑️ Clear Cache
            </button>
          </div>
        </div>

        <div className="control-section">
          <h3>⚙️ Configuration</h3>
          <div className="config-grid">
            <div className="config-item">
              <label>Batch Size:</label>
              <input
                type="range"
                min="1"
                max="10"
                value={config.batchSize}
                onChange={(e) => updateConfig({ batchSize: parseInt(e.target.value) })}
              />
              <span>{config.batchSize}</span>
            </div>
            <div className="config-item">
              <label>Preload Distance:</label>
              <input
                type="range"
                min="50"
                max="300"
                step="50"
                value={config.preloadDistance}
                onChange={(e) => updateConfig({ preloadDistance: parseInt(e.target.value) })}
              />
              <span>{config.preloadDistance}px</span>
            </div>
            <div className="config-item">
              <label>Retry Attempts:</label>
              <input
                type="range"
                min="1"
                max="5"
                value={config.retryAttempts}
                onChange={(e) => updateConfig({ retryAttempts: parseInt(e.target.value) })}
              />
              <span>{config.retryAttempts}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="progress-section">
        <h3>📊 Overall Progress</h3>
        <div className="overall-progress">
          <div className="progress-bar large">
            <div 
              className="progress-fill" 
              style={{ width: `${overallProgress.percentage}%` }}
            ></div>
          </div>
          <div className="progress-stats">
            <span>Loaded: {overallProgress.loaded}/{overallProgress.total}</span>
            <span>Percentage: {overallProgress.percentage}%</span>
            <span>Status: {overallProgress.status}</span>
          </div>
        </div>
      </div>

      <div className="cache-section">
        <h3>💾 Cache Statistics</h3>
        <div className="cache-stats">
          <div className="stat-item">
            <span className="stat-label">Total Assets:</span>
            <span className="stat-value">{cacheStats.totalAssets}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Cached Assets:</span>
            <span className="stat-value">{cacheStats.cachedAssets}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Size:</span>
            <span className="stat-value">{(cacheStats.totalSize / 1024).toFixed(1)} KB</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Cached Size:</span>
            <span className="stat-value">{(cacheStats.cachedSize / 1024).toFixed(1)} KB</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Hit Rate:</span>
            <span className="stat-value">{(cacheStats.hitRate * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="assets-section">
        <h3>🎯 Game Assets</h3>
        <div className="assets-grid">
          {assets.map(asset => (
            <AssetDisplay
              key={asset.id}
              asset={asset}
              progress={getAssetProgress(asset.id)}
              onLoad={() => handleAssetLoad(asset.id)}
            />
          ))}
        </div>
      </div>

      <div className="events-section">
        <h3>📡 Event Log</h3>
        <div className="events-log">
          {events.map((event, index) => (
            <div key={index} className="event-item">
              {event}
            </div>
          ))}
          {events.length === 0 && (
            <div className="no-events">No events yet. Start lazy loading to see events!</div>
          )}
        </div>
      </div>

      <div className="demo-footer">
        <p>
          <strong>Instructions:</strong> Scroll down to see assets load as they become visible. 
          High priority assets load immediately, others load when scrolled into view.
        </p>
      </div>
    </div>
  )
}


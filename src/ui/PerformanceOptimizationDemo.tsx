import React, { useState, useEffect, useRef } from 'react'
import { PerformanceOptimization, AssetConfig, AudioConfig, LazyLoadConfig, MemoryConfig, NetworkConfig } from '../core/PerformanceOptimization'
import { EventManager } from '../core/EventManager'
import './PerformanceOptimizationDemo.css'

interface PerformanceMetrics {
  fps: number
  memoryUsage: number
  networkLatency: number
  assetLoadTime: number
  compressionRatio: number
  cacheHitRate: number
}

export const PerformanceOptimizationDemo: React.FC = () => {
  const [eventManager] = useState(() => EventManager.getInstance())
  const [performanceOptimization] = useState(() => new PerformanceOptimization(eventManager))
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    networkLatency: 0,
    assetLoadTime: 0,
    compressionRatio: 0,
    cacheHitRate: 0
  })
  
  const [assetConfig, setAssetConfig] = useState<AssetConfig>(performanceOptimization.getAssetConfig())
  const [audioConfig, setAudioConfig] = useState<AudioConfig>(performanceOptimization.getAudioConfig())
  const [lazyLoadConfig, setLazyLoadConfig] = useState<LazyLoadConfig>(performanceOptimization.getLazyLoadConfig())
  const [memoryConfig, setMemoryConfig] = useState<MemoryConfig>(performanceOptimization.getMemoryConfig())
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>(performanceOptimization.getNetworkConfig())
  
  const [browserCompatibility, setBrowserCompatibility] = useState(performanceOptimization.checkBrowserCompatibility())
  const [isEnabled, setIsEnabled] = useState(true)
  const [assetCache, setAssetCache] = useState<Map<string, any>>(new Map())
  const [objectPools, setObjectPools] = useState<Map<string, any[]>>(new Map())
  
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    // Set up event listeners
    const handlePerformanceUpdate = (data: any) => {
      setMetrics(data.metrics)
    }

    const handleAssetLoaded = (data: any) => {
      console.log('Asset loaded:', data)
      // Update asset cache display
      setAssetCache(new Map(performanceOptimization['assetCache']))
    }

    const handleAssetLoadProgress = (data: any) => {
      console.log('Asset load progress:', data)
    }

    const handleGarbageCollection = (data: any) => {
      console.log('Garbage collection:', data)
      // Update object pools display
      setObjectPools(new Map(performanceOptimization['objectPools']))
    }

    const handleBrowserAdaptation = (data: any) => {
      console.log('Browser adaptation:', data)
      setBrowserCompatibility(performanceOptimization.checkBrowserCompatibility())
    }

    eventManager.on('performanceUpdate', handlePerformanceUpdate)
    eventManager.on('assetLoaded', handleAssetLoaded)
    eventManager.on('assetLoadProgress', handleAssetLoadProgress)
    eventManager.on('garbageCollection', handleGarbageCollection)
    eventManager.on('browserAdaptation', handleBrowserAdaptation)

    // Start performance monitoring
    const updateMetrics = () => {
      performanceOptimization.updatePerformanceMetrics()
      animationFrameRef.current = requestAnimationFrame(updateMetrics)
    }
    updateMetrics()

    // Set up lazy loading demo
    if (containerRef.current) {
      const demoAssets = [
        'demo-texture-1.png',
        'demo-texture-2.png',
        'demo-audio-1.mp3',
        'demo-audio-2.mp3',
        'demo-model-1.glb'
      ]
      performanceOptimization.setupLazyLoading(containerRef.current, demoAssets)
    }

    // Create demo object pools
    performanceOptimization.createObjectPool('demoObject', () => ({ id: Math.random(), type: 'demo' }), 5)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      eventManager.off('performanceUpdate', handlePerformanceUpdate)
      eventManager.off('assetLoaded', handleAssetLoaded)
      eventManager.off('assetLoadProgress', handleAssetLoadProgress)
      eventManager.off('garbageCollection', handleGarbageCollection)
      eventManager.off('browserAdaptation', handleBrowserAdaptation)
    }
  }, [eventManager, performanceOptimization])

  const handleAssetConfigChange = (key: keyof AssetConfig, value: any) => {
    const newConfig = { ...assetConfig, [key]: value }
    setAssetConfig(newConfig)
    performanceOptimization.setAssetConfig(newConfig)
  }

  const handleAudioConfigChange = (key: keyof AudioConfig, value: any) => {
    const newConfig = { ...audioConfig, [key]: value }
    setAudioConfig(newConfig)
    performanceOptimization.setAudioConfig(newConfig)
  }

  const handleLazyLoadConfigChange = (key: keyof LazyLoadConfig, value: any) => {
    const newConfig = { ...lazyLoadConfig, [key]: value }
    setLazyLoadConfig(newConfig)
    performanceOptimization.setLazyLoadConfig(newConfig)
  }

  const handleMemoryConfigChange = (key: keyof MemoryConfig, value: any) => {
    const newConfig = { ...memoryConfig, [key]: value }
    setMemoryConfig(newConfig)
    performanceOptimization.setMemoryConfig(newConfig)
  }

  const handleNetworkConfigChange = (key: keyof NetworkConfig, value: any) => {
    const newConfig = { ...networkConfig, [key]: value }
    setNetworkConfig(newConfig)
    performanceOptimization.setNetworkConfig(newConfig)
  }

  const toggleSystem = () => {
    if (isEnabled) {
      performanceOptimization.disable()
    } else {
      performanceOptimization.enable()
    }
    setIsEnabled(!isEnabled)
  }

  const resetSystem = () => {
    performanceOptimization.reset()
    setMetrics({
      fps: 0,
      memoryUsage: 0,
      networkLatency: 0,
      assetLoadTime: 0,
      compressionRatio: 0,
      cacheHitRate: 0
    })
  }

  const adaptToBrowser = () => {
    performanceOptimization.adaptToBrowserCapabilities()
    setBrowserCompatibility(performanceOptimization.checkBrowserCompatibility())
    setAssetConfig(performanceOptimization.getAssetConfig())
    setAudioConfig(performanceOptimization.getAudioConfig())
    setNetworkConfig(performanceOptimization.getNetworkConfig())
  }

  const testObjectPool = () => {
    const obj = performanceOptimization.getObjectFromPool('demoObject', () => ({ id: Math.random(), type: 'demo' }))
    console.log('Got object from pool:', obj)
    
    // Return it after a delay
    setTimeout(() => {
      performanceOptimization.returnObjectToPool('demoObject', obj)
      setObjectPools(new Map(performanceOptimization['objectPools']))
    }, 1000)
  }

  const testAssetLoading = async () => {
    try {
      const asset = await performanceOptimization['loadAsset']('demo-test-asset.png')
      console.log('Test asset loaded:', asset)
    } catch (error) {
      console.error('Test asset loading failed:', error)
    }
  }

  return (
    <div className="performance-optimization-demo">
      <h1>Phase 2.3 Performance Optimization Demo</h1>
      
      {/* System Controls */}
      <div className="demo-section">
        <h2>System Controls</h2>
        <div className="control-buttons">
          <button onClick={toggleSystem} className={isEnabled ? 'enabled' : 'disabled'}>
            {isEnabled ? 'Disable' : 'Enable'} System
          </button>
          <button onClick={resetSystem}>Reset System</button>
          <button onClick={adaptToBrowser}>Adapt to Browser</button>
          <button onClick={testObjectPool}>Test Object Pool</button>
          <button onClick={testAssetLoading}>Test Asset Loading</button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="demo-section">
        <h2>Real-Time Performance Metrics</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <h3>FPS</h3>
            <div className="metric-value">{metrics.fps.toFixed(1)}</div>
            <div className="metric-bar">
              <div 
                className="metric-fill" 
                style={{ width: `${Math.min(100, (metrics.fps / 60) * 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="metric-card">
            <h3>Memory Usage</h3>
            <div className="metric-value">{(metrics.memoryUsage * 100).toFixed(1)}%</div>
            <div className="metric-bar">
              <div 
                className="metric-fill" 
                style={{ width: `${metrics.memoryUsage * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className="metric-card">
            <h3>Cache Hit Rate</h3>
            <div className="metric-value">{(metrics.cacheHitRate * 100).toFixed(1)}%</div>
            <div className="metric-bar">
              <div 
                className="metric-fill" 
                style={{ width: `${metrics.cacheHitRate * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className="metric-card">
            <h3>Asset Load Time</h3>
            <div className="metric-value">{metrics.assetLoadTime.toFixed(1)}ms</div>
            <div className="metric-bar">
              <div 
                className="metric-fill" 
                style={{ width: `${Math.min(100, (metrics.assetLoadTime / 1000) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Browser Compatibility */}
      <div className="demo-section">
        <h2>Browser Compatibility</h2>
        <div className="compatibility-grid">
          <div className={`compatibility-item ${browserCompatibility.webp ? 'supported' : 'not-supported'}`}>
            <span>WebP Support</span>
            <span>{browserCompatibility.webp ? '✅' : '❌'}</span>
          </div>
          <div className={`compatibility-item ${browserCompatibility.webAudio ? 'supported' : 'not-supported'}`}>
            <span>Web Audio API</span>
            <span>{browserCompatibility.webAudio ? '✅' : '❌'}</span>
          </div>
          <div className={`compatibility-item ${browserCompatibility.webWorkers ? 'supported' : 'not-supported'}`}>
            <span>Web Workers</span>
            <span>{browserCompatibility.webWorkers ? '✅' : '❌'}</span>
          </div>
          <div className={`compatibility-item ${browserCompatibility.serviceWorkers ? 'supported' : 'not-supported'}`}>
            <span>Service Workers</span>
            <span>{browserCompatibility.serviceWorkers ? '✅' : '❌'}</span>
          </div>
          <div className={`compatibility-item ${browserCompatibility.indexedDB ? 'supported' : 'not-supported'}`}>
            <span>IndexedDB</span>
            <span>{browserCompatibility.indexedDB ? '✅' : '❌'}</span>
          </div>
        </div>
      </div>

      {/* Configuration Panels */}
      <div className="demo-section">
        <h2>Configuration</h2>
        
        {/* Asset Configuration */}
        <div className="config-panel">
          <h3>Asset Configuration</h3>
          <div className="config-grid">
            <div className="config-item">
              <label>Format:</label>
              <select 
                value={assetConfig.format} 
                onChange={(e) => handleAssetConfigChange('format', e.target.value)}
              >
                <option value="webp">WebP</option>
                <option value="png">PNG</option>
                <option value="jpg">JPEG</option>
                <option value="avif">AVIF</option>
              </select>
            </div>
            <div className="config-item">
              <label>Quality:</label>
              <input 
                type="range" 
                min="0.1" 
                max="1" 
                step="0.1" 
                value={assetConfig.quality}
                onChange={(e) => handleAssetConfigChange('quality', parseFloat(e.target.value))}
              />
              <span>{assetConfig.quality}</span>
            </div>
            <div className="config-item">
              <label>Compression:</label>
              <select 
                value={assetConfig.compression} 
                onChange={(e) => handleAssetConfigChange('compression', e.target.value)}
              >
                <option value="lossy">Lossy</option>
                <option value="lossless">Lossless</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audio Configuration */}
        <div className="config-panel">
          <h3>Audio Configuration</h3>
          <div className="config-grid">
            <div className="config-item">
              <label>Format:</label>
              <select 
                value={audioConfig.format} 
                onChange={(e) => handleAudioConfigChange('format', e.target.value)}
              >
                <option value="mp3">MP3</option>
                <option value="ogg">OGG</option>
                <option value="wav">WAV</option>
                <option value="aac">AAC</option>
              </select>
            </div>
            <div className="config-item">
              <label>Bitrate:</label>
              <input 
                type="range" 
                min="64" 
                max="320" 
                step="64" 
                value={audioConfig.bitrate}
                onChange={(e) => handleAudioConfigChange('bitrate', parseInt(e.target.value))}
              />
              <span>{audioConfig.bitrate} kbps</span>
            </div>
            <div className="config-item">
              <label>Channels:</label>
              <select 
                value={audioConfig.channels} 
                onChange={(e) => handleAudioConfigChange('channels', parseInt(e.target.value))}
              >
                <option value={1}>Mono</option>
                <option value={2}>Stereo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lazy Loading Configuration */}
        <div className="config-panel">
          <h3>Lazy Loading Configuration</h3>
          <div className="config-grid">
            <div className="config-item">
              <label>Threshold:</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={lazyLoadConfig.threshold}
                onChange={(e) => handleLazyLoadConfigChange('threshold', parseFloat(e.target.value))}
              />
              <span>{lazyLoadConfig.threshold}</span>
            </div>
            <div className="config-item">
              <label>Root Margin:</label>
              <input 
                type="text" 
                value={lazyLoadConfig.rootMargin}
                onChange={(e) => handleLazyLoadConfigChange('rootMargin', e.target.value)}
              />
            </div>
            <div className="config-item">
              <label>Delay:</label>
              <input 
                type="number" 
                min="0" 
                max="1000" 
                step="50" 
                value={lazyLoadConfig.delay}
                onChange={(e) => handleLazyLoadConfigChange('delay', parseInt(e.target.value))}
              />
              <span>ms</span>
            </div>
          </div>
        </div>

        {/* Memory Configuration */}
        <div className="config-panel">
          <h3>Memory Configuration</h3>
          <div className="config-grid">
            <div className="config-item">
              <label>Max Texture Size:</label>
              <input 
                type="number" 
                min="512" 
                max="8192" 
                step="512" 
                value={memoryConfig.maxTextureSize}
                onChange={(e) => handleMemoryConfigChange('maxTextureSize', parseInt(e.target.value))}
              />
              <span>px</span>
            </div>
            <div className="config-item">
              <label>Object Pool Size:</label>
              <input 
                type="number" 
                min="10" 
                max="1000" 
                step="10" 
                value={memoryConfig.objectPoolSize}
                onChange={(e) => handleMemoryConfigChange('objectPoolSize', parseInt(e.target.value))}
              />
            </div>
            <div className="config-item">
              <label>GC Threshold:</label>
              <input 
                type="range" 
                min="0.5" 
                max="0.95" 
                step="0.05" 
                value={memoryConfig.gcThreshold}
                onChange={(e) => handleMemoryConfigChange('gcThreshold', parseFloat(e.target.value))}
              />
              <span>{(memoryConfig.gcThreshold * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Network Configuration */}
        <div className="config-panel">
          <h3>Network Configuration</h3>
          <div className="config-grid">
            <div className="config-item">
              <label>Progressive Loading:</label>
              <input 
                type="checkbox" 
                checked={networkConfig.progressiveLoading}
                onChange={(e) => handleNetworkConfigChange('progressiveLoading', e.target.checked)}
              />
            </div>
            <div className="config-item">
              <label>Chunk Size:</label>
              <input 
                type="number" 
                min="16384" 
                max="262144" 
                step="16384" 
                value={networkConfig.chunkSize}
                onChange={(e) => handleNetworkConfigChange('chunkSize', parseInt(e.target.value))}
              />
              <span>bytes</span>
            </div>
            <div className="config-item">
              <label>Retry Attempts:</label>
              <input 
                type="number" 
                min="1" 
                max="10" 
                step="1" 
                value={networkConfig.retryAttempts}
                onChange={(e) => handleNetworkConfigChange('retryAttempts', parseInt(e.target.value))}
              />
            </div>
            <div className="config-item">
              <label>Cache Strategy:</label>
              <select 
                value={networkConfig.cacheStrategy} 
                onChange={(e) => handleNetworkConfigChange('cacheStrategy', e.target.value)}
              >
                <option value="memory">Memory</option>
                <option value="localStorage">LocalStorage</option>
                <option value="indexedDB">IndexedDB</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="demo-section">
        <h2>System Status</h2>
        <div className="status-grid">
          <div className="status-item">
            <span>System Enabled:</span>
            <span className={isEnabled ? 'status-ok' : 'status-error'}>
              {isEnabled ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="status-item">
            <span>Asset Cache Size:</span>
            <span>{assetCache.size} assets</span>
          </div>
          <div className="status-item">
            <span>Object Pools:</span>
            <span>{objectPools.size} pools</span>
          </div>
          <div className="status-item">
            <span>Total Pooled Objects:</span>
            <span>
              {Array.from(objectPools.values()).reduce((total, pool) => total + pool.length, 0)} objects
            </span>
          </div>
        </div>
      </div>

      {/* Lazy Loading Demo */}
      <div className="demo-section">
        <h2>Lazy Loading Demo</h2>
        <div ref={containerRef} className="lazy-load-container">
          {/* Placeholders will be created here by the system */}
        </div>
      </div>
    </div>
  )
}


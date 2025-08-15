import React, { useState, useEffect, useRef } from 'react'
import { PerformanceOptimization, NetworkConfig } from '../core/PerformanceOptimization'
import { EventManager } from '../core/EventManager'
import './NetworkEfficiencyDemo.css'

interface NetworkMetrics {
  latency: number
  bandwidth: number
  chunkSize: number
  concurrentRequests: number
  cacheHitRate: number
}

interface AssetLoadProgress {
  assetId: string
  loaded: number
  total: number
  progress: number
  timestamp: number
}

export const NetworkEfficiencyDemo: React.FC = () => {
  const [eventManager] = useState(() => EventManager.getInstance())
  const [performanceOptimization] = useState(() => new PerformanceOptimization(eventManager))
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>(performanceOptimization.getNetworkConfig())
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics>(performanceOptimization.getNetworkMetrics())
  const [assetProgress, setAssetProgress] = useState<Map<string, AssetLoadProgress>>(new Map())
  const [events, setEvents] = useState<string[]>([])
  const [isEstimatingBandwidth, setIsEstimatingBandwidth] = useState(false)
  const [isPreloading, setIsPreloading] = useState(false)
  const [testAssets] = useState(['test1.png', 'test2.png', 'test3.png', 'large-asset.bin', 'texture-pack.atlas'])

  const animationFrameRef = useRef<number>()

  useEffect(() => {
    // Setup event listeners
    const eventHandlers = {
      assetRequested: (data: any) => addEvent(`Asset requested: ${data.assetId}`),
      assetLoaded: (data: any) => addEvent(`Asset loaded: ${data.assetId} (${(data.size / 1024).toFixed(1)}KB in ${data.loadTime.toFixed(0)}ms)`),
      assetLoadError: (data: any) => addEvent(`Asset load error: ${data.assetId} - ${data.error}`),
      assetLoadProgress: (data: any) => {
        setAssetProgress(prev => new Map(prev.set(data.assetId, data)))
        addEvent(`Asset progress: ${data.assetId} - ${(data.progress * 100).toFixed(1)}%`)
      },
      networkOptimized: (data: any) => addEvent(`Network optimized: ${data.optimizations.join(', ')}`),
      memoryWarning: (data: any) => addEvent(`Memory warning: ${(data.usage * 100).toFixed(1)}% usage`),
      networkSlow: (data: any) => addEvent(`Network slow: ${data.latency.toFixed(0)}ms latency`)
    }

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      eventManager.on(event as any, handler)
    })

    // Start performance monitoring
    const updateMetrics = () => {
      setNetworkMetrics(performanceOptimization.getNetworkMetrics())
      animationFrameRef.current = requestAnimationFrame(updateMetrics)
    }
    updateMetrics()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [eventManager, performanceOptimization])

  const addEvent = (message: string) => {
    setEvents(prev => [message, ...prev.slice(0, 49)]) // Keep last 50 events
  }

  const updateNetworkConfig = (updates: Partial<NetworkConfig>) => {
    performanceOptimization.setNetworkConfig(updates)
    setNetworkConfig(performanceOptimization.getNetworkConfig())
    addEvent(`Network config updated: ${Object.keys(updates).join(', ')}`)
  }

  const estimateBandwidth = async () => {
    setIsEstimatingBandwidth(true)
    try {
      const bandwidth = await performanceOptimization.estimateBandwidth()
      if (bandwidth > 0) {
        addEvent(`Bandwidth estimated: ${(bandwidth / (1024 * 1024)).toFixed(2)} MB/s`)
        setNetworkMetrics(performanceOptimization.getNetworkMetrics())
      } else {
        addEvent('Bandwidth estimation failed')
      }
    } catch (error) {
      addEvent(`Bandwidth estimation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsEstimatingBandwidth(false)
    }
  }

  const preloadAssets = async () => {
    setIsPreloading(true)
    try {
      await performanceOptimization.preloadAssets(testAssets)
      addEvent(`Preloaded ${testAssets.length} assets`)
    } catch (error) {
      addEvent(`Preload error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsPreloading(false)
    }
  }

  const optimizeNetwork = () => {
    performanceOptimization.optimizeNetwork()
    addEvent('Network optimization triggered')
    setNetworkMetrics(performanceOptimization.getNetworkMetrics())
  }

  const testAssetFetch = async (assetId: string) => {
    try {
      addEvent(`Testing asset fetch: ${assetId}`)
      // Simulate asset fetch with retry
      await performanceOptimization.fetchAssetWithRetry(assetId)
    } catch (error) {
      addEvent(`Asset fetch failed: ${assetId}`)
    }
  }

  const clearEvents = () => {
    setEvents([])
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatLatency = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="network-efficiency-demo">
      <header className="demo-header">
        <h1>🌐 Network Efficiency Demo</h1>
        <p>Phase 2.3 Performance Optimization - Network Efficiency Features</p>
      </header>

      <div className="demo-content">
        {/* Network Configuration Panel */}
        <section className="config-panel">
          <h2>⚙️ Network Configuration</h2>
          <div className="config-grid">
            <div className="config-item">
              <label>Progressive Loading:</label>
              <input
                type="checkbox"
                checked={networkConfig.progressiveLoading}
                onChange={(e) => updateNetworkConfig({ progressiveLoading: e.target.checked })}
              />
            </div>
            <div className="config-item">
              <label>Range Requests:</label>
              <input
                type="checkbox"
                checked={networkConfig.enableRangeRequests}
                onChange={(e) => updateNetworkConfig({ enableRangeRequests: e.target.checked })}
              />
            </div>
            <div className="config-item">
              <label>Asset Preloading:</label>
              <input
                type="checkbox"
                checked={networkConfig.enablePreloading}
                onChange={(e) => updateNetworkConfig({ enablePreloading: e.target.checked })}
              />
            </div>
            <div className="config-item">
              <label>Bandwidth Estimation:</label>
              <input
                type="checkbox"
                checked={networkConfig.bandwidthEstimation}
                onChange={(e) => updateNetworkConfig({ bandwidthEstimation: e.target.checked })}
              />
            </div>
            <div className="config-item">
              <label>Adaptive Chunk Size:</label>
              <input
                type="checkbox"
                checked={networkConfig.adaptiveChunkSize}
                onChange={(e) => updateNetworkConfig({ adaptiveChunkSize: e.target.checked })}
              />
            </div>
            <div className="config-item">
              <label>Chunk Size:</label>
              <select
                value={networkConfig.chunkSize}
                onChange={(e) => updateNetworkConfig({ chunkSize: parseInt(e.target.value) })}
              >
                <option value={16 * 1024}>16 KB</option>
                <option value={32 * 1024}>32 KB</option>
                <option value={64 * 1024}>64 KB</option>
                <option value={128 * 1024}>128 KB</option>
                <option value={256 * 1024}>256 KB</option>
              </select>
            </div>
            <div className="config-item">
              <label>Max Concurrent Requests:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={networkConfig.maxConcurrentRequests}
                onChange={(e) => updateNetworkConfig({ maxConcurrentRequests: parseInt(e.target.value) })}
              />
            </div>
            <div className="config-item">
              <label>Retry Attempts:</label>
              <input
                type="number"
                min="1"
                max="5"
                value={networkConfig.retryAttempts}
                onChange={(e) => updateNetworkConfig({ retryAttempts: parseInt(e.target.value) })}
              />
            </div>
            <div className="config-item">
              <label>Timeout (ms):</label>
              <input
                type="number"
                min="1000"
                max="30000"
                step="1000"
                value={networkConfig.timeout}
                onChange={(e) => updateNetworkConfig({ timeout: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </section>

        {/* Network Metrics Panel */}
        <section className="metrics-panel">
          <h2>📊 Network Metrics</h2>
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Latency</h3>
              <div className="metric-value">{formatLatency(networkMetrics.latency)}</div>
            </div>
            <div className="metric-card">
              <h3>Bandwidth</h3>
              <div className="metric-value">{networkMetrics.bandwidth > 0 ? formatBytes(networkMetrics.bandwidth) + '/s' : 'Unknown'}</div>
            </div>
            <div className="metric-card">
              <h3>Chunk Size</h3>
              <div className="metric-value">{formatBytes(networkMetrics.chunkSize)}</div>
            </div>
            <div className="metric-card">
              <h3>Concurrent Requests</h3>
              <div className="metric-value">{networkMetrics.concurrentRequests}</div>
            </div>
            <div className="metric-card">
              <h3>Cache Hit Rate</h3>
              <div className="metric-value">{(networkMetrics.cacheHitRate * 100).toFixed(1)}%</div>
            </div>
          </div>
        </section>

        {/* Control Panel */}
        <section className="control-panel">
          <h2>🎮 Controls</h2>
          <div className="control-buttons">
            <button
              onClick={estimateBandwidth}
              disabled={isEstimatingBandwidth}
              className="btn btn-primary"
            >
              {isEstimatingBandwidth ? 'Estimating...' : 'Estimate Bandwidth'}
            </button>
            <button
              onClick={preloadAssets}
              disabled={isPreloading}
              className="btn btn-secondary"
            >
              {isPreloading ? 'Preloading...' : 'Preload Assets'}
            </button>
            <button onClick={optimizeNetwork} className="btn btn-success">
              Optimize Network
            </button>
            <button onClick={clearEvents} className="btn btn-warning">
              Clear Events
            </button>
          </div>
        </section>

        {/* Asset Testing Panel */}
        <section className="testing-panel">
          <h2>🧪 Asset Testing</h2>
          <div className="asset-grid">
            {testAssets.map((assetId) => (
              <div key={assetId} className="asset-item">
                <span className="asset-name">{assetId}</span>
                <button
                  onClick={() => testAssetFetch(assetId)}
                  className="btn btn-sm btn-outline"
                >
                  Test Fetch
                </button>
                {assetProgress.has(assetId) && (
                  <div className="asset-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${(assetProgress.get(assetId)?.progress || 0) * 100}%`
                        }}
                      />
                    </div>
                    <span className="progress-text">
                      {formatBytes(assetProgress.get(assetId)?.loaded || 0)} / {formatBytes(assetProgress.get(assetId)?.total || 0)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Event Log */}
        <section className="event-log">
          <h2>📝 Event Log</h2>
          <div className="log-container">
            {events.length === 0 ? (
              <p className="no-events">No events yet. Try some actions above!</p>
            ) : (
              events.map((event, index) => (
                <div key={index} className="log-entry">
                  <span className="log-timestamp">
                    {new Date().toLocaleTimeString()}
                  </span>
                  <span className="log-message">{event}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <footer className="demo-footer">
        <p>Network Efficiency Demo - Progressive Loading, Range Requests, Bandwidth Estimation, and Asset Preloading</p>
      </footer>
    </div>
  )
}




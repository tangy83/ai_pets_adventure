import React, { useState, useEffect } from 'react'
import './ResponsiveUIDemo.css'

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

export const ResponsiveUIDemo: React.FC = () => {
  const [screenSize, setScreenSize] = useState<ScreenSize>('mobile')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })
  const [isCompactMode, setIsCompactMode] = useState(false)
  const [activeDemo, setActiveDemo] = useState<'layout' | 'controls' | 'canvas' | 'events'>('layout')

  // Responsive UI functions
  const getScreenSize = (width: number): ScreenSize => {
    if (width >= BREAKPOINTS.largeDesktop) return 'largeDesktop'
    if (width >= BREAKPOINTS.desktop) return 'desktop'
    if (width >= BREAKPOINTS.tablet) return 'tablet'
    return 'mobile'
  }

  const getOrientation = (width: number, height: number): Orientation => {
    return width > height ? 'landscape' : 'portrait'
  }

  const updateResponsiveState = () => {
    const width = window.innerWidth
    const height = window.innerHeight
    
    setWindowDimensions({ width, height })
    setScreenSize(getScreenSize(width))
    setOrientation(getOrientation(width, height))
    setIsCompactMode(width < BREAKPOINTS.tablet || (getOrientation(width, height) === 'landscape' && height < 600))
  }

  // Responsive layout helpers
  const getResponsiveGridColumns = () => {
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
  }

  const getResponsivePadding = () => {
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
  }

  const getResponsiveFontSize = () => {
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
  }

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      updateResponsiveState()
    }

    const handleOrientationChange = () => {
      setTimeout(() => {
        updateResponsiveState()
      }, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)
    
    // Initial setup
    updateResponsiveState()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  const gridColumns = getResponsiveGridColumns()
  const padding = getResponsivePadding()
  const fontSize = getResponsiveFontSize()

  return (
    <div className="responsive-ui-demo" style={{ padding }}>
      <header className="demo-header">
        <h1 style={{ fontSize: `calc(${fontSize} * 1.5)` }}>Responsive UI Demo</h1>
        <p style={{ fontSize }}>Demonstrating responsive design features for web input controls</p>
      </header>

      {/* Responsive Info Display */}
      <section className="responsive-info-section">
        <h2>Current Responsive State</h2>
        <div className="responsive-grid" style={{ 
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gap: isCompactMode ? '10px' : '15px'
        }}>
          <div className="info-card">
            <h3>Screen Size</h3>
            <p><strong>{screenSize}</strong></p>
            <p>{windowDimensions.width} × {windowDimensions.height}</p>
          </div>
          <div className="info-card">
            <h3>Orientation</h3>
            <p><strong>{orientation}</strong></p>
            <p>{orientation === 'portrait' ? 'Tall' : 'Wide'} layout</p>
          </div>
          <div className="info-card">
            <h3>Layout</h3>
            <p><strong>{gridColumns} column{gridColumns > 1 ? 's' : ''}</strong></p>
            <p>Grid layout</p>
          </div>
          <div className="info-card">
            <h3>Mode</h3>
            <p><strong>{isCompactMode ? 'Compact' : 'Standard'}</strong></p>
            <p>UI density</p>
          </div>
        </div>
      </section>

      {/* Demo Navigation */}
      <nav className="demo-navigation">
        <button 
          className={`demo-nav-btn ${activeDemo === 'layout' ? 'active' : ''}`}
          onClick={() => setActiveDemo('layout')}
        >
          Layout Demo
        </button>
        <button 
          className={`demo-nav-btn ${activeDemo === 'controls' ? 'active' : ''}`}
          onClick={() => setActiveDemo('controls')}
        >
          Controls Demo
        </button>
        <button 
          className={`demo-nav-btn ${activeDemo === 'canvas' ? 'active' : ''}`}
          onClick={() => setActiveDemo('canvas')}
        >
          Canvas Demo
        </button>
        <button 
          className={`demo-nav-btn ${activeDemo === 'events' ? 'active' : ''}`}
          onClick={() => setActiveDemo('events')}
        >
          Events Demo
        </button>
      </nav>

      {/* Demo Content */}
      <main className="demo-content">
        {activeDemo === 'layout' && (
          <section className="layout-demo">
            <h2>Responsive Layout System</h2>
            <div className="responsive-grid" style={{ 
              gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
              gap: isCompactMode ? '10px' : '15px'
            }}>
              <div className="demo-card">
                <h3>Card 1</h3>
                <p>This card adapts to the current grid layout. Current columns: {gridColumns}</p>
                <div className="card-indicator">Grid Position: 1</div>
              </div>
              <div className="demo-card">
                <h3>Card 2</h3>
                <p>Responsive spacing and sizing based on screen size: {screenSize}</p>
                <div className="card-indicator">Grid Position: 2</div>
              </div>
              <div className="demo-card">
                <h3>Card 3</h3>
                <p>Only visible on larger screens. Current screen: {screenSize}</p>
                <div className="card-indicator">Grid Position: 3</div>
              </div>
            </div>
          </section>
        )}

        {activeDemo === 'controls' && (
          <section className="controls-demo">
            <h2>Responsive Controls</h2>
            <div className={`control-group ${orientation === 'landscape' && screenSize === 'tablet' ? 'horizontal' : 'vertical'}`}>
              <button className="demo-btn primary">Primary Action</button>
              <button className="demo-btn secondary">Secondary Action</button>
              <button className="demo-btn tertiary">Tertiary Action</button>
              <button className="demo-btn danger">Danger Action</button>
            </div>
            <div className="control-info">
              <p><strong>Layout:</strong> {orientation === 'landscape' && screenSize === 'tablet' ? 'Horizontal' : 'Vertical'}</p>
              <p><strong>Touch Targets:</strong> Minimum 44px (current: {Math.max(44, parseInt(fontSize) * 2)}px)</p>
              <p><strong>Button Size:</strong> Responsive to screen size</p>
            </div>
          </section>
        )}

        {activeDemo === 'canvas' && (
          <section className="canvas-demo">
            <h2>Responsive Canvas</h2>
            <div className="canvas-container">
              <canvas 
                className="demo-canvas"
                width={800}
                height={450}
                style={{
                  width: '100%',
                  maxWidth: Math.min(windowDimensions.width - 40, getMaxCanvasWidth()),
                  height: 'auto',
                  aspectRatio: '16/9'
                }}
              />
            </div>
            <div className="canvas-info">
              <p><strong>Canvas Size:</strong> Responsive to container width</p>
              <p><strong>Aspect Ratio:</strong> Maintained at 16:9</p>
              <p><strong>Max Width:</strong> {getMaxCanvasWidth()}px</p>
              <p><strong>Current Width:</strong> {Math.min(windowDimensions.width - 40, getMaxCanvasWidth())}px</p>
            </div>
          </section>
        )}

        {activeDemo === 'events' && (
          <section className="events-demo">
            <h2>Responsive Event Display</h2>
            <div className="events-container">
              <div className="event-list" style={{ maxHeight: getMaxEventHeight() }}>
                {generateDemoEvents().map((event, index) => (
                  <div key={index} className="event-item">
                    <span className="event-type">{event.type}</span>
                    <span className="event-data">{event.data}</span>
                    <span className="event-time">{event.time}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="events-info">
              <p><strong>Max Events:</strong> {getMaxEventItems()} items</p>
              <p><strong>List Height:</strong> {getMaxEventHeight()}px</p>
              <p><strong>Compact Mode:</strong> {isCompactMode ? 'Yes' : 'No'}</p>
            </div>
          </section>
        )}
      </main>

      {/* Responsive Tips */}
      <section className="responsive-tips">
        <h2>Responsive Design Tips</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <h3>Mobile First</h3>
            <p>Start with mobile design and progressively enhance for larger screens</p>
          </div>
          <div className="tip-card">
            <h3>Touch Targets</h3>
            <p>Ensure minimum 44px touch targets for mobile devices</p>
          </div>
          <div className="tip-card">
            <h3>Flexible Grids</h3>
            <p>Use CSS Grid with dynamic column counts for responsive layouts</p>
          </div>
          <div className="tip-card">
            <h3>Orientation</h3>
            <p>Handle both portrait and landscape orientations gracefully</p>
          </div>
        </div>
      </section>
    </div>
  )

  // Helper functions
  function getMaxCanvasWidth(): number {
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
  }

  function getMaxEventItems(): number {
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
  }

  function getMaxEventHeight(): number {
    if (isCompactMode) return 120
    switch (screenSize) {
      case 'mobile':
        return 150
      case 'tablet':
        return 180
      case 'desktop':
        return 200
      case 'largeDesktop':
        return 250
      default:
        return 150
    }
  }

  function generateDemoEvents() {
    const eventTypes = ['click', 'touch', 'keypress', 'scroll', 'resize', 'orientation']
    const events = []
    
    for (let i = 0; i < getMaxEventItems(); i++) {
      events.push({
        type: eventTypes[i % eventTypes.length],
        data: `Event ${i + 1} data`,
        time: `${Date.now() - i * 1000}ms ago`
      })
    }
    
    return events
  }
}






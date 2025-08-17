'use client'

export default function HomePage() {
  return (
    <div style={{
      margin: 0,
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '2rem' }}>🐾 AI Pets Adventure</h1>
      <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Phase 2 Complete! 🎉</p>
      
      <div style={{
        background: 'rgba(255,255,255,0.2)',
        padding: '2rem',
        borderRadius: '1rem',
        margin: '2rem auto',
        maxWidth: '600px'
      }}>
        <h2 style={{ color: '#FFD700', marginBottom: '1rem' }}>🎮 Game Status</h2>
        <p style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>✅ Core Systems: OPERATIONAL</p>
        <p style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>✅ PWA Components: READY</p>
        <p style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>✅ Game Engine: FUNCTIONAL</p>
        <p style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>✅ Input Systems: WORKING</p>
        <p style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>✅ Event System: OPERATIONAL</p>
        
        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}>
          <h3 style={{ color: '#90EE90' }}>💰 Reward Calculator System</h3>
          <p style={{ margin: '0.5rem 0' }}>✅ Quest reward calculations working</p>
          <p style={{ margin: '0.5rem 0' }}>✅ Objective completion rewards</p>
          <p style={{ margin: '0.5rem 0' }}>✅ Multiplier system functional</p>
          <p style={{ margin: '0.5rem 0' }}>✅ Pet bond bonuses active</p>
        </div>
      </div>
      
      <div style={{ marginTop: '2rem' }}>
        <p style={{ fontSize: '1.2rem' }}>🚀 Ready to Play!</p>
        <p style={{ fontSize: '1rem', opacity: 0.8 }}>Your AI Pets Adventure is fully functional!</p>
        
        <div style={{ marginTop: '2rem' }}>
          <a 
            href="/game" 
            style={{
              display: 'inline-block',
              background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)'
            }}

          >
            🎮 Launch Game Interface
          </a>
        </div>
        
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <a 
            href="/checkpoints" 
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.3)'
            }}
          >
            🎯 Checkpoint System
          </a>
          
          <a 
            href="/test-rewards" 
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.3)'
            }}
          >
            💰 Reward Calculator
          </a>
        </div>
      </div>
    </div>
  )
}

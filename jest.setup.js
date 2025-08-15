require('@testing-library/jest-dom')

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    ready: Promise.resolve({}),
  },
  writable: true,
  configurable: true,
})

// Mock PWA-specific APIs
Object.defineProperty(navigator, 'standalone', {
  value: false,
  writable: true,
  configurable: true,
})

// Mock Network Information API
Object.defineProperty(navigator, 'connection', {
  value: {
    type: 'wifi',
    effectiveType: '4g',
    downlink: 25,
    rtt: 30,
    saveData: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  },
  writable: true,
  configurable: true,
})

// Mock online/offline events
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
  configurable: true,
})

// Mock window online/offline events
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn(),
  writable: true,
  configurable: true,
})

Object.defineProperty(window, 'removeEventListener', {
  value: jest.fn(),
  writable: true,
  configurable: true,
})

// Mock setInterval and clearInterval
global.setInterval = jest.fn()
global.clearInterval = jest.fn()
global.setTimeout = jest.fn((callback, delay) => {
  // Don't call callback immediately to prevent infinite recursion
  return 123
})
global.clearTimeout = jest.fn()

// Mock IndexedDB
Object.defineProperty(window, 'indexedDB', {
  value: {
    open: jest.fn(),
    deleteDatabase: jest.fn(),
  },
  writable: true,
  configurable: true,
})

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: jest.fn((key) => {
    return localStorageMock.store[key] || null
  }),
  setItem: jest.fn((key, value) => {
    localStorageMock.store[key] = value
  }),
  removeItem: jest.fn((key) => {
    delete localStorageMock.store[key]
  }),
  clear: jest.fn(() => {
    localStorageMock.store = {}
  }),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

// Mock Web Speech API
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: jest.fn(),
    cancel: jest.fn(),
    getVoices: jest.fn(() => []),
  },
  writable: true,
  configurable: true,
})

Object.defineProperty(window, 'SpeechRecognition', {
  value: jest.fn(),
  writable: true,
  configurable: true,
})

// Mock Canvas API
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    strokeRect: jest.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
    toBlob: jest.fn((callback) => callback(new Blob(['test'], { type: 'image/png' }))),
    convertToBlob: jest.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/png' }))),
  })),
  writable: true,
  configurable: true,
})

// Mock Canvas toBlob method at prototype level
Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  value: jest.fn((callback, type = 'image/png', quality = 0.92) => {
    // Simulate async behavior by calling callback immediately
    callback(new Blob(['mock-image-data'], { type: type || 'image/png' }))
  }),
  writable: true,
  configurable: true,
})

// Mock Canvas toDataURL method
Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: jest.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  writable: true,
  configurable: true,
})

// Mock Image API
global.Image = class Image {
  constructor() {
    this.width = 0
    this.height = 0
    this.src = ''
    this.onload = null
    this.onerror = null
  }
  
  set src(value) {
    this._src = value
    // Simulate loading immediately
    if (this.onload) {
      this.width = 100
      this.height = 100
      this.onload()
    }
  }
  
  get src() {
    return this._src
  }
}

// Mock OffscreenCanvas for web workers
global.OffscreenCanvas = class OffscreenCanvas {
  constructor(width, height) {
    this.width = width
    this.height = height
  }
  
  getContext(type) {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Array(4) })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => []),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      fillText: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      transform: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      strokeRect: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      toBlob: jest.fn((callback) => callback(new Blob(['test'], { type: 'image/png' }))),
      convertToBlob: jest.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/png' }))),
    }
  }
  
  toBlob(callback, type, quality) {
    callback(new Blob(['test'], { type: type || 'image/png' }))
  }
  
  convertToBlob(options) {
    return Promise.resolve(new Blob(['test'], { type: options?.type || 'image/png' }))
  }
}

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  triggerIntersection: jest.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: jest.fn().mockImplementation((title, options) => ({
    title,
    ...options,
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
  writable: true,
  configurable: true,
})

// Mock caches API
Object.defineProperty(window, 'caches', {
  value: {
    open: jest.fn(),
    keys: jest.fn(),
    delete: jest.fn(),
    match: jest.fn(),
  },
  writable: true,
  configurable: true,
})

// Mock Event API first
global.Event = class Event {
  constructor(type, init = {}) {
    this.type = type
    this.bubbles = init.bubbles || false
    this.cancelable = init.cancelable || false
    this.defaultPrevented = false
  }
  
  preventDefault() {
    if (this.cancelable) {
      this.defaultPrevented = true
    }
  }
  
  stopPropagation() {}
}

// Mock TouchEvent API
global.TouchEvent = class TouchEvent extends global.Event {
  constructor(type, init = {}) {
    super(type, init)
    this.changedTouches = init.changedTouches || []
    this.targetTouches = init.targetTouches || []
    this.touches = init.touches || []
  }
}

// Mock Touch API
global.Touch = class Touch {
  constructor(init = {}) {
    this.identifier = init.identifier || 0
    this.target = init.target || null
    this.clientX = init.clientX || 0
    this.clientY = init.clientY || 0
    this.pageX = init.pageX || 0
    this.pageY = init.pageY || 0
    this.radiusX = init.radiusX || 0
    this.radiusY = init.radiusY || 0
    this.rotationAngle = init.rotationAngle || 0
    this.force = init.force || 0
  }
}

// Mock PointerEvent API
global.PointerEvent = class PointerEvent extends global.Event {
  constructor(type, init = {}) {
    super(type, init)
    this.pointerId = init.pointerId || 0
    this.width = init.width || 0
    this.height = init.height || 0
    this.pressure = init.pressure || 0
    this.tangentialPressure = init.tangentialPressure || 0
    this.tiltX = init.tiltX || 0
    this.tiltY = init.tiltY || 0
    this.twist = init.twist || 0
    this.pointerType = init.pointerType || 'mouse'
    this.isPrimary = init.isPrimary || false
    this.clientX = init.clientX || 0
    this.clientY = init.clientY || 0
    this.pageX = init.pageX || 0
    this.pageY = init.pageY || 0
  }
}

// Mock AudioContext API
global.AudioContext = class AudioContext {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 44100
    this.state = 'running'
  }
  
  createBuffer(channels, length, sampleRate) {
    return {
      length,
      numberOfChannels: channels,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: jest.fn(() => new Float32Array(length))
    }
  }
  
  decodeAudioData(arrayBuffer) {
    return Promise.resolve(this.createBuffer(2, 44100, 44100))
  }
}

global.OfflineAudioContext = class OfflineAudioContext extends global.AudioContext {
  constructor(channels, length, sampleRate) {
    super({ sampleRate })
    this.channels = channels
    this.length = length
  }
  
  startRendering() {
    return Promise.resolve(this.createBuffer(this.channels, this.length, this.sampleRate))
  }
}

// Mock CompressionStream and DecompressionStream APIs
global.CompressionStream = class CompressionStream {
  constructor(format) {
    this.format = format
  }
  
  get readable() {
    return {
      getReader: () => ({
        read: () => Promise.resolve({ done: true, value: null })
      })
    }
  }
  
  get writable() {
    return {
      getWriter: () => ({
        write: jest.fn(),
        close: jest.fn()
      })
    }
  }
}

global.DecompressionStream = class DecompressionStream {
  constructor(format) {
    this.format = format
  }
  
  get readable() {
    return {
      getReader: () => ({
        read: () => Promise.resolve({ done: true, value: null })
      })
    }
  }
  
  get writable() {
    return {
      getWriter: () => ({
        write: jest.fn(),
        close: jest.fn()
      })
    }
  }
}

// Mock Performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  timeOrigin: Date.now(),
  getEntries: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  mark: jest.fn(),
  measure: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
}

// Mock Worker API
global.Worker = class Worker {
  constructor(scriptURL) {
    this.scriptURL = scriptURL
    this.onmessage = null
    this.onerror = null
    this.postMessage = jest.fn()
    this.terminate = jest.fn()
    this.addEventListener = jest.fn()
    this.removeEventListener = jest.fn()
    
    // Store event listeners for proper simulation
    this.messageListeners = []
    
    // Force compression worker to fail so it falls back to main thread
    if (scriptURL.includes('compression-worker.js')) {
      throw new Error('Compression worker not available')
    }
  }
  
  // Mock addEventListener to store listeners
  addEventListener(type, listener) {
    if (type === 'message') {
      this.messageListeners.push(listener)
    }
  }
  
  // Mock removeEventListener to remove listeners
  removeEventListener(type, listener) {
    if (type === 'message') {
      const index = this.messageListeners.indexOf(listener)
      if (index > -1) {
        this.messageListeners.splice(index, 1)
      }
    }
  }
  
  // Mock postMessage to simulate compression responses
  postMessage(message) {
    // Simulate compression worker responses
    if (message.type === 'compressImage') {
      setTimeout(() => {
        const responseData = {
          id: message.id,
          result: new Blob(['compressed-image'], { type: `image/${message.config?.format || 'webp'}` })
        }
        
        // Call onmessage if set (for the general message handler)
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', { data: responseData }))
        }
        
        // Call all registered message listeners (for the specific compression handlers)
        this.messageListeners.forEach(listener => {
          listener(new MessageEvent('message', { data: responseData }))
        })
      }, 10) // Small delay to simulate async processing
    } else if (message.type === 'compressAudio') {
      setTimeout(() => {
        const responseData = {
          id: message.id,
          result: new ArrayBuffer(512) // Simulate compressed audio
        }
        
        // Call onmessage if set (for the general message handler)
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', { data: responseData }))
        }
        
        // Call all registered message listeners (for the specific compression handlers)
        this.messageListeners.forEach(listener => {
          listener(new MessageEvent('message', { data: responseData }))
        })
      }, 10)
    }
  }
}

// Mock fetch API with Response methods
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(1024))),
    json: jest.fn(() => Promise.resolve({})),
    text: jest.fn(() => Promise.resolve('')),
    blob: jest.fn(() => Promise.resolve(new Blob(['test']))),
    headers: new Map(),
    url: 'https://example.com',
  })
)

// Mock beforeinstallprompt event
Object.defineProperty(window, 'beforeinstallprompt', {
  value: null,
  writable: true,
  configurable: true,
})

// Mock install prompt
Object.defineProperty(window, 'installPrompt', {
  value: {
    prompt: jest.fn(),
    userChoice: Promise.resolve({ outcome: 'accepted' }),
  },
  writable: true,
  configurable: true,
})

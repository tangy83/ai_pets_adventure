import '@testing-library/jest-dom'

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
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
  configurable: true,
})

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
  })),
  writable: true,
  configurable: true,
})

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

// Mock fetch API
global.fetch = jest.fn()

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
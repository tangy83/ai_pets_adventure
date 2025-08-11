export interface GameState {
  id: string
  playerData: PlayerData
  petData: PetData
  questProgress: QuestProgress
  worldState: WorldState
  timestamp: number
}

export interface PlayerData {
  id: string
  name: string
  level: number
  experience: number
  coins: number
  preferences: PlayerPreferences
}

export interface PetData {
  id: string
  name: string
  type: string
  level: number
  bond: number
  skills: PetSkill[]
  memories: PetMemory[]
}

export interface PetSkill {
  id: string
  name: string
  level: number
  cooldown: number
  lastUsed: number
}

export interface PetMemory {
  id: string
  type: 'quest' | 'interaction' | 'learning'
  data: any
  timestamp: number
}

export interface QuestProgress {
  activeQuests: ActiveQuest[]
  completedQuests: string[]
  currentWorld: string
  unlockedWorlds: string[]
}

export interface ActiveQuest {
  id: string
  worldId: string
  objectives: QuestObjective[]
  progress: number
  startedAt: number
}

export interface QuestObjective {
  id: string
  description: string
  completed: boolean
  required: boolean
}

export interface WorldState {
  currentWorld: string
  unlockedAreas: string[]
  discoveredItems: string[]
  npcInteractions: NPCRecord[]
}

export interface NPCRecord {
  npcId: string
  lastInteraction: number
  relationship: number
  conversations: Conversation[]
}

export interface Conversation {
  id: string
  content: string
  timestamp: number
  playerChoice?: string
}

export interface PlayerPreferences {
  audioVolume: number
  musicVolume: number
  hapticFeedback: boolean
  notifications: boolean
  language: string
  theme: 'light' | 'dark' | 'auto'
}

export interface OfflineAction {
  id: string
  type: 'quest_complete' | 'pet_training' | 'item_collect' | 'social_interaction'
  data: any
  timestamp: number
  retryCount: number
  maxRetries: number
}

export class OfflineStorage {
  private static instance: OfflineStorage
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'ai-pets-adventure-db'
  private readonly DB_VERSION = 1

  private constructor() {}

  public static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage()
    }
    return OfflineStorage.instance
  }

  public async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object stores
        if (!db.objectStoreNames.contains('gameState')) {
          const gameStateStore = db.createObjectStore('gameState', { keyPath: 'id' })
          gameStateStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains('offlineActions')) {
          const offlineActionsStore = db.createObjectStore('offlineActions', { keyPath: 'id' })
          offlineActionsStore.createIndex('timestamp', 'timestamp', { unique: false })
          offlineActionsStore.createIndex('type', 'type', { unique: false })
        }

        if (!db.objectStoreNames.contains('petMemories')) {
          const petMemoriesStore = db.createObjectStore('petMemories', { keyPath: 'id' })
          petMemoriesStore.createIndex('petId', 'petId', { unique: false })
          petMemoriesStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains('userPreferences')) {
          db.createObjectStore('userPreferences', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('cachedAssets')) {
          const cachedAssetsStore = db.createObjectStore('cachedAssets', { keyPath: 'url' })
          cachedAssetsStore.createIndex('type', 'type', { unique: false })
          cachedAssetsStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  // Game State Management
  public async saveGameState(gameState: GameState): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['gameState'], 'readwrite')
      const store = transaction.objectStore('gameState')
      const request = store.put(gameState)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  public async getGameState(id: string): Promise<GameState | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['gameState'], 'readonly')
      const store = transaction.objectStore('gameState')
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  public async getLatestGameState(): Promise<GameState | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['gameState'], 'readonly')
      const store = transaction.objectStore('gameState')
      const index = store.index('timestamp')
      const request = index.openCursor(null, 'prev')

      request.onsuccess = () => {
        const cursor = request.result
        resolve(cursor ? cursor.value : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Offline Actions Management
  public async queueOfflineAction(action: OfflineAction): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readwrite')
      const store = transaction.objectStore('offlineActions')
      const request = store.put(action)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  public async getOfflineActions(): Promise<OfflineAction[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readonly')
      const store = transaction.objectStore('offlineActions')
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  public async removeOfflineAction(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readwrite')
      const store = transaction.objectStore('offlineActions')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  public async clearOfflineActions(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readwrite')
      const store = transaction.objectStore('offlineActions')
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Pet Memories Management
  public async savePetMemory(memory: PetMemory): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['petMemories'], 'readwrite')
      const store = transaction.objectStore('petMemories')
      const request = store.put(memory)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  public async getPetMemories(petId: string): Promise<PetMemory[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['petMemories'], 'readonly')
      const store = transaction.objectStore('petMemories')
      const index = store.index('petId')
      const request = index.getAll(petId)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  // User Preferences Management
  public async saveUserPreferences(preferences: PlayerPreferences): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['userPreferences'], 'readwrite')
      const store = transaction.objectStore('userPreferences')
      const request = store.put({ id: 'default', ...preferences })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  public async getUserPreferences(): Promise<PlayerPreferences | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['userPreferences'], 'readonly')
      const store = transaction.objectStore('userPreferences')
      const request = store.get('default')

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  // Asset Caching Management
  public async cacheAsset(url: string, data: any, type: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const asset = {
      url,
      data,
      type,
      timestamp: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedAssets'], 'readwrite')
      const store = transaction.objectStore('cachedAssets')
      const request = store.put(asset)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  public async getCachedAsset(url: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedAssets'], 'readonly')
      const store = transaction.objectStore('cachedAssets')
      const request = store.get(url)

      request.onsuccess = () => resolve(request.result?.data || null)
      request.onerror = () => reject(request.error)
    })
  }

  public async clearOldCachedAssets(maxAge: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const cutoffTime = Date.now() - maxAge

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cachedAssets'], 'readwrite')
      const store = transaction.objectStore('cachedAssets')
      const index = store.index('timestamp')
      const request = index.openCursor()

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          if (cursor.value.timestamp < cutoffTime) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Database Management
  public async clearDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([
        'gameState', 
        'offlineActions', 
        'petMemories', 
        'userPreferences', 
        'cachedAssets'
      ], 'readwrite')

      const stores = [
        'gameState', 
        'offlineActions', 
        'petMemories', 
        'userPreferences', 
        'cachedAssets'
      ]

      let completed = 0
      const total = stores.length

      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName)
        const request = store.clear()
        
        request.onsuccess = () => {
          completed++
          if (completed === total) resolve()
        }
        request.onerror = () => reject(request.error)
      })
    })
  }

  public async getDatabaseSize(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([
        'gameState', 
        'offlineActions', 
        'petMemories', 
        'userPreferences', 
        'cachedAssets'
      ], 'readonly')

      const stores = [
        'gameState', 
        'offlineActions', 
        'petMemories', 
        'userPreferences', 
        'cachedAssets'
      ]

      let totalSize = 0
      let completed = 0
      const total = stores.length

      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName)
        const request = store.getAll()
        
        request.onsuccess = () => {
          const data = request.result
          totalSize += JSON.stringify(data).length
          completed++
          if (completed === total) resolve(totalSize)
        }
        request.onerror = () => reject(request.error)
      })
    })
  }

  public close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  public async getStorageStatus(): Promise<{ used: number; total: number; percentage: number }> {
    if (!this.db) {
      return { used: 0, total: 0, percentage: 0 }
    }

    try {
      const used = await this.getDatabaseSize()
      
      // Try to get storage quota if available
      let total = 0
      
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await (navigator.storage as any).estimate()
          total = estimate.quota || 0
        } catch (error) {
          console.warn('Could not get storage estimate:', error)
        }
      }

      // Fallback to estimated values if quota not available
      if (total === 0) {
        total = 50 * 1024 * 1024 // 50MB default
      }

      const percentage = total > 0 ? Math.round((used / total) * 100) : 0

      return { used, total, percentage }
    } catch (error) {
      console.error('Error getting storage status:', error)
      return { used: 0, total: 0, percentage: 0 }
    }
  }
}

// Export singleton instance
export const offlineStorage = OfflineStorage.getInstance() 
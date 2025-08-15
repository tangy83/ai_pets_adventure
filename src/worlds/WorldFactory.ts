import { EventManager } from '../core/EventManager'

export interface WorldTemplate {
  id: string
  name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  maxPlayers: number
  timeLimit?: number
  requiredLevel: number
  requiredPetBond: number
  assets: {
    textures: string[]
    audio: string[]
    models: string[]
  }
  quests: string[]
  npcs: string[]
  items: string[]
  environment: {
    lighting: 'day' | 'night' | 'dynamic'
    weather: 'clear' | 'rain' | 'snow' | 'storm'
    timeOfDay: number // 0-24 hours
  }
  physics: {
    gravity: number
    friction: number
    airResistance: number
  }
  metadata: {
    version: string
    author: string
    creationDate: number
    lastModified: number
    tags: string[]
    rating: number
    playCount: number
    averageCompletionTime: number
  }
}

export interface WorldInstance {
  id: string
  templateId: string
  status: 'loading' | 'active' | 'paused' | 'completed' | 'failed'
  startTime: number
  endTime?: number
  players: string[]
  currentQuests: string[]
  completedQuests: string[]
  worldState: Map<string, any>
  performance: {
    fps: number
    memoryUsage: number
    activeEntities: number
    lastUpdate: number
  }
}

export class WorldFactory {
  private static instance: WorldFactory
  private eventManager: EventManager
  private templates: Map<string, WorldTemplate> = new Map()
  private activeWorlds: Map<string, WorldInstance> = new Map()
  private isInitialized: boolean = false

  private constructor() {
    this.eventManager = EventManager.getInstance()
    this.initializeWorldTemplates()
    this.setupEventListeners()
  }

  public static getInstance(): WorldFactory {
    if (!WorldFactory.instance) {
      WorldFactory.instance = new WorldFactory()
    }
    return WorldFactory.instance
  }

  /**
   * Initializes the WorldFactory
   */
  public initialize(): void {
    if (this.isInitialized) return
    
    this.isInitialized = true
    this.eventManager.emit('worldFactoryInitialized', { timestamp: Date.now() })
  }

  /**
   * Creates a new world instance from a template
   */
  public createWorld(templateId: string, players: string[] = []): WorldInstance | null {
    const template = this.templates.get(templateId)
    if (!template) {
      console.error(`World template '${templateId}' not found`)
      return null
    }

    const worldId = `world_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const worldInstance: WorldInstance = {
      id: worldId,
      templateId,
      status: 'loading',
      startTime: Date.now(),
      players: [...players],
      currentQuests: [...template.quests],
      completedQuests: [],
      worldState: new Map(),
      performance: {
        fps: 60,
        memoryUsage: 0,
        activeEntities: 0,
        lastUpdate: Date.now()
      }
    }

    this.activeWorlds.set(worldId, worldInstance)
    
    // Emit world created event
    this.eventManager.emit('worldCreated', {
      worldId,
      templateId,
      players,
      timestamp: Date.now()
    })

    return worldInstance
  }

  /**
   * Gets a world instance by ID
   */
  public getWorld(worldId: string): WorldInstance | undefined {
    return this.activeWorlds.get(worldId)
  }

  /**
   * Gets all active worlds
   */
  public getActiveWorlds(): WorldInstance[] {
    return Array.from(this.activeWorlds.values())
  }

  /**
   * Gets a world template by ID
   */
  public getTemplate(templateId: string): WorldTemplate | undefined {
    return this.templates.get(templateId)
  }

  /**
   * Gets all available templates
   */
  public getTemplates(): WorldTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * Updates world status
   */
  public updateWorldStatus(worldId: string, status: WorldInstance['status']): boolean {
    const world = this.activeWorlds.get(worldId)
    if (!world) return false

    world.status = status
    
    if (status === 'completed' || status === 'failed') {
      world.endTime = Date.now()
    }

    this.eventManager.emit('worldStatusChanged', {
      worldId,
      status,
      timestamp: Date.now()
    })

    return true
  }

  /**
   * Adds a player to a world
   */
  public addPlayerToWorld(worldId: string, playerId: string): boolean {
    const world = this.activeWorlds.get(worldId)
    if (!world) return false

    if (!world.players.includes(playerId)) {
      world.players.push(playerId)
      
      this.eventManager.emit('playerJoinedWorld', {
        worldId,
        playerId,
        timestamp: Date.now()
      })
    }

    return true
  }

  /**
   * Removes a player from a world
   */
  public removePlayerFromWorld(worldId: string, playerId: string): boolean {
    const world = this.activeWorlds.get(worldId)
    if (!world) return false

    const index = world.players.indexOf(playerId)
    if (index > -1) {
      world.players.splice(index, 1)
      
      this.eventManager.emit('playerLeftWorld', {
        worldId,
        playerId,
        timestamp: Date.now()
      })
    }

    return true
  }

  /**
   * Updates world performance metrics
   */
  public updateWorldPerformance(worldId: string, performance: Partial<WorldInstance['performance']>): boolean {
    const world = this.activeWorlds.get(worldId)
    if (!world) return false

    world.performance = { ...world.performance, ...performance, lastUpdate: Date.now() }
    return true
  }

  /**
   * Completes a quest in a world
   */
  public completeQuest(worldId: string, questId: string): boolean {
    const world = this.activeWorlds.get(worldId)
    if (!world) return false

    const questIndex = world.currentQuests.indexOf(questId)
    if (questIndex > -1) {
      world.currentQuests.splice(questIndex, 1)
      world.completedQuests.push(questId)
      
      this.eventManager.emit('questCompletedInWorld', {
        worldId,
        questId,
        timestamp: Date.now()
      })
    }

    return true
  }

  /**
   * Destroys a world instance
   */
  public destroyWorld(worldId: string): boolean {
    const world = this.activeWorlds.get(worldId)
    if (!world) return false

    this.activeWorlds.delete(worldId)
    
    this.eventManager.emit('worldDestroyed', {
      worldId,
      templateId: world.templateId,
      timestamp: Date.now()
    })

    return true
  }

  /**
   * Initializes default world templates
   */
  private initializeWorldTemplates(): void {
    // Emerald Jungle World
    this.templates.set('emerald_jungle', {
      id: 'emerald_jungle',
      name: 'Emerald Jungle',
      description: 'A lush, mysterious jungle filled with ancient secrets and dangerous creatures.',
      difficulty: 'medium',
      maxPlayers: 10,
      timeLimit: 3600000, // 1 hour
      requiredLevel: 5,
      requiredPetBond: 30,
      assets: {
        textures: ['jungle_ground', 'jungle_trees', 'jungle_water'],
        audio: ['jungle_ambience', 'jungle_wind', 'jungle_animals'],
        models: ['ancient_temple', 'jungle_hut', 'treasure_chest']
      },
      quests: ['emerald_jungle_main', 'ancient_secrets', 'wildlife_rescue'],
      npcs: ['jungle_guide', 'ancient_guardian', 'wildlife_expert'],
      items: ['emerald_gem', 'ancient_scroll', 'jungle_herb'],
      environment: {
        lighting: 'dynamic',
        weather: 'clear',
        timeOfDay: 12
      },
      physics: {
        gravity: 9.8,
        friction: 0.3,
        airResistance: 0.1
      },
      metadata: {
        version: '1.0.0',
        author: 'AI Pets Adventure Team',
        creationDate: Date.now(),
        lastModified: Date.now(),
        tags: ['jungle', 'adventure', 'mystery'],
        rating: 4.5,
        playCount: 0,
        averageCompletionTime: 1800000 // 30 minutes
      }
    })

    // Crystal Caves World
    this.templates.set('crystal_caves', {
      id: 'crystal_caves',
      name: 'Crystal Caves',
      description: 'A beautiful but treacherous cave system filled with glowing crystals and hidden dangers.',
      difficulty: 'hard',
      maxPlayers: 8,
      timeLimit: 5400000, // 1.5 hours
      requiredLevel: 10,
      requiredPetBond: 50,
      assets: {
        textures: ['cave_walls', 'crystal_surfaces', 'cave_floor'],
        audio: ['cave_echoes', 'crystal_hum', 'water_drips'],
        models: ['crystal_formation', 'ancient_machinery', 'treasure_vault']
      },
      quests: ['crystal_mastery', 'cave_exploration', 'ancient_machinery'],
      npcs: ['cave_explorer', 'crystal_sage', 'ancient_mechanic'],
      items: ['crystal_shard', 'ancient_blueprint', 'cave_map'],
      environment: {
        lighting: 'night',
        weather: 'clear',
        timeOfDay: 0
      },
      physics: {
        gravity: 9.8,
        friction: 0.2,
        airResistance: 0.05
      },
      metadata: {
        version: '1.0.0',
        author: 'AI Pets Adventure Team',
        creationDate: Date.now(),
        lastModified: Date.now(),
        tags: ['cave', 'crystal', 'mystery'],
        rating: 4.8,
        playCount: 0,
        averageCompletionTime: 2700000 // 45 minutes
      }
    })

    // Floating Islands World
    this.templates.set('floating_islands', {
      id: 'floating_islands',
      name: 'Floating Islands',
      description: 'A series of magical floating islands in the sky, connected by bridges and teleporters.',
      difficulty: 'expert',
      maxPlayers: 6,
      timeLimit: 7200000, // 2 hours
      requiredLevel: 15,
      requiredPetBond: 75,
      assets: {
        textures: ['island_grass', 'cloud_surfaces', 'sky_background'],
        audio: ['wind_sounds', 'magical_hum', 'bird_calls'],
        models: ['floating_castle', 'magical_bridge', 'sky_portal']
      },
      quests: ['sky_conquest', 'magical_bridges', 'floating_castle'],
      npcs: ['sky_guardian', 'magical_bridge_keeper', 'castle_ruler'],
      items: ['sky_gem', 'magical_bridge_key', 'castle_crown'],
      environment: {
        lighting: 'day',
        weather: 'clear',
        timeOfDay: 14
      },
      physics: {
        gravity: 2.0,
        friction: 0.1,
        airResistance: 0.2
      },
      metadata: {
        version: '1.0.0',
        author: 'AI Pets Adventure Team',
        creationDate: Date.now(),
        lastModified: Date.now(),
        tags: ['sky', 'magical', 'adventure'],
        rating: 5.0,
        playCount: 0,
        averageCompletionTime: 3600000 // 1 hour
      }
    })
  }

  private setupEventListeners(): void {
    this.eventManager.on('playerJoinedWorld', (event) => {
      const { worldId, playerId } = event.data
      const world = this.activeWorlds.get(worldId)
      if (world) {
        world.players.push(playerId)
        this.eventManager.emit('playerJoinedWorld', {
          worldId,
          playerId,
          timestamp: Date.now()
        })
      }
    })

    this.eventManager.on('playerLeftWorld', (event) => {
      const { worldId, playerId } = event.data
      const world = this.activeWorlds.get(worldId)
      if (world) {
        const index = world.players.indexOf(playerId)
        if (index > -1) {
          world.players.splice(index, 1)
        }
        this.eventManager.emit('playerLeftWorld', {
          worldId,
          playerId,
          timestamp: Date.now()
        })
      }
    })

    this.eventManager.on('questCompletedInWorld', (event) => {
      const { worldId, questId } = event.data
      const world = this.activeWorlds.get(worldId)
      if (world) {
        const questIndex = world.currentQuests.indexOf(questId)
        if (questIndex > -1) {
          world.currentQuests.splice(questIndex, 1)
        }
        world.completedQuests.push(questId)
        this.eventManager.emit('questCompletedInWorld', {
          worldId,
          questId,
          timestamp: Date.now()
        })
      }
    })

    this.eventManager.on('worldStatusChanged', (event) => {
      const { worldId, status } = event.data
      const world = this.activeWorlds.get(worldId)
      if (world) {
        world.status = status
        if (status === 'completed' || status === 'failed') {
          world.endTime = Date.now()
        }
        this.eventManager.emit('worldStatusChanged', {
          worldId,
          status,
          timestamp: Date.now()
        })
      }
    })

    this.eventManager.on('worldDestroyed', (event) => {
      const { worldId, templateId } = event.data
      this.activeWorlds.delete(worldId)
      this.eventManager.emit('worldDestroyed', {
        worldId,
        templateId,
        timestamp: Date.now()
      })
    })
  }
}

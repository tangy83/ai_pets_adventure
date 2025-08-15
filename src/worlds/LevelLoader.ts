import { EventManager } from '../core/EventManager'
import { QuestSystem } from './QuestSystem'
import { WorldFactory, WorldTemplate } from './WorldFactory'

export interface LevelData {
  id: string
  worldId: string
  questId: string
  name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  requiredLevel: number
  checkpoints: CheckpointData[]
  objectives: LevelObjective[]
  assets: LevelAssets
  mechanics: LevelMechanics
  state: LevelState
  metadata: LevelMetadata
}

export interface CheckpointData {
  id: string
  name: string
  position: { x: number; y: number }
  description: string
  isActive: boolean
  isCompleted: boolean
  requiredItems: string[]
  unlockConditions: string[]
  saveData: any
}

export interface LevelObjective {
  id: string
  type: 'collect' | 'interact' | 'solve' | 'reach' | 'defeat' | 'explore'
  description: string
  target: string
  count: number
  current: number
  isCompleted: boolean
  reward: ObjectiveReward
  hints: string[]
}

export interface ObjectiveReward {
  experience: number
  coins: number
  items: string[]
  skills: string[]
  unlockables: string[]
}

export interface LevelAssets {
  background: string
  music: string
  ambientSounds: string[]
  textures: string[]
  sprites: string[]
  audio: string[]
  animations: string[]
  effects: string[]
  ui: string[]
}

export interface LevelMechanics {
  physics: PhysicsConfig
  lighting: LightingConfig
  weather: WeatherConfig
  gravity: GravityConfig
  interactions: InteractionConfig
  puzzles: PuzzleConfig
  enemies: EnemyConfig
  collectibles: CollectibleConfig
}

export interface PhysicsConfig {
  gravity: number
  friction: number
  restitution: number
  airResistance: number
  wind: number
}

export interface LightingConfig {
  ambient: number
  directional: number
  shadows: boolean
  dynamic: boolean
  color: string
  intensity: number
}

export interface WeatherConfig {
  enabled: boolean
  type: 'clear' | 'rainy' | 'foggy' | 'stormy' | 'snowy'
  particles: boolean
  wind: number
  temperature: number
  visibility: number
}

export interface GravityConfig {
  enabled: boolean
  strength: number
  direction: 'down' | 'up' | 'left' | 'right' | 'custom'
  customVector?: { x: number; y: number }
  zones: GravityZone[]
}

export interface GravityZone {
  id: string
  position: { x: number; y: number }
  radius: number
  strength: number
  direction: 'down' | 'up' | 'left' | 'right' | 'custom'
  customVector?: { x: number; y: number }
}

export interface InteractionConfig {
  npcDialogue: boolean
  itemCollection: boolean
  puzzleSolving: boolean
  petInteraction: boolean
  multiplayer: boolean
  petAbilities: string[]
  petRestrictions: string[]
}

export interface PuzzleConfig {
  enabled: boolean
  types: string[]
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  hints: boolean
  skipOption: boolean
  timeLimit?: number
}

export interface EnemyConfig {
  enabled: boolean
  types: string[]
  spawnRate: number
  maxCount: number
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  respawnTime: number
}

export interface CollectibleConfig {
  enabled: boolean
  types: string[]
  spawnRate: number
  maxCount: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  respawnTime: number
}

export interface LevelState {
  isLoaded: boolean
  isActive: boolean
  isCompleted: boolean
  currentCheckpoint: string | null
  completedObjectives: Set<string>
  collectedItems: Set<string>
  defeatedEnemies: Set<string>
  solvedPuzzles: Set<string>
  startTime: number
  completionTime?: number
  attempts: number
  bestTime?: number
  score: number
  stars: number
}

export interface LevelMetadata {
  version: string
  author: string
  creationDate: number
  lastModified: number
  tags: string[]
  rating: number
  playCount: number
  averageCompletionTime: number
  difficultyRating: number
}

export interface LevelTemplate {
  id: string
  worldId: string
  questId: string
  name: string
  description: string
  baseDifficulty: 'easy' | 'medium' | 'hard' | 'expert'
  requiredLevel: number
  checkpoints: CheckpointData[]
  objectives: LevelObjective[]
  assets: LevelAssets
  mechanics: LevelMechanics
  metadata: LevelMetadata
}

export interface DifficultyScaling {
  playerLevel: number
  petBondLevel: number
  questProgress: number
  previousAttempts: number
  timeOfDay: number
  weatherConditions: string
  multiplayer: boolean
}

export class LevelLoader {
  private static instance: LevelLoader
  private eventManager: EventManager
  private questSystem: QuestSystem
  private worldFactory: WorldFactory
  private levelTemplates: Map<string, LevelTemplate> = new Map()
  private activeLevels: Map<string, LevelData> = new Map()
  private levelCache: Map<string, LevelData> = new Map()
  private checkpointData: Map<string, any> = new Map()

  private constructor() {
    this.eventManager = EventManager.getInstance()
    this.questSystem = QuestSystem.getInstance()
    this.worldFactory = WorldFactory.getInstance()
    this.initializeLevelTemplates()
    this.setupEventListeners()
  }

  public static getInstance(): LevelLoader {
    if (!LevelLoader.instance) {
      LevelLoader.instance = new LevelLoader()
    }
    return LevelLoader.instance
  }

  /**
   * Loads a level for a specific quest with progressive content delivery
   */
  public async loadLevel(levelId: string, questId: string, playerData?: any): Promise<LevelData> {
    const template = this.levelTemplates.get(levelId)
    if (!template) {
      throw new Error(`Level template '${levelId}' not found`)
    }

    // Check if level is already loaded
    if (this.activeLevels.has(levelId)) {
      return this.activeLevels.get(levelId)!
    }

    this.eventManager.emit('levelLoadStarted', { levelId, questId, timestamp: Date.now() })

    try {
      // Create level instance from template
      const level = this.createLevelFromTemplate(template, questId, playerData)
      
      // Progressive asset loading
      await this.loadLevelAssets(level, 'critical')
      
      // Mark level as loaded
      level.state.isLoaded = true
      this.activeLevels.set(levelId, level)
      
      // Load remaining assets in background
      this.loadLevelAssets(level, 'essential').then(() => {
        this.eventManager.emit('levelAssetsLoaded', { levelId, type: 'essential', timestamp: Date.now() })
      })
      
      this.loadLevelAssets(level, 'optional').then(() => {
        this.eventManager.emit('levelAssetsLoaded', { levelId, type: 'optional', timestamp: Date.now() })
      })

      this.eventManager.emit('levelLoadCompleted', { level, questId, timestamp: Date.now() })
      return level
    } catch (error) {
      this.eventManager.emit('levelLoadFailed', { levelId, questId, error, timestamp: Date.now() })
      throw error
    }
  }

  /**
   * Unloads a level and cleans up resources
   */
  public unloadLevel(levelId: string): void {
    const level = this.activeLevels.get(levelId)
    if (!level) return

    // Save checkpoint data
    this.saveCheckpointData(level)
    
    // Clean up assets
    this.cleanupLevelAssets(level)
    
    // Remove from active levels
    this.activeLevels.delete(levelId)
    
    // Cache level data for potential reuse
    this.levelCache.set(levelId, level)
    
    this.eventManager.emit('levelUnloaded', { levelId, timestamp: Date.now() })
  }

  /**
   * Saves checkpoint progress for a level
   */
  public saveCheckpoint(levelId: string, checkpointId: string, saveData: any): void {
    const level = this.activeLevels.get(levelId)
    if (!level) return

    const checkpoint = level.checkpoints.find(cp => cp.id === checkpointId)
    if (!checkpoint) return

    // Update checkpoint state
    checkpoint.isCompleted = true
    checkpoint.saveData = saveData
    
    // Update level state
    level.state.currentCheckpoint = checkpointId
    level.state.attempts++
    
    // Save checkpoint data
    this.checkpointData.set(`${levelId}_${checkpointId}`, saveData)
    
    this.eventManager.emit('checkpointSaved', { levelId, checkpointId, saveData, timestamp: Date.now() })
  }

  /**
   * Loads checkpoint progress for a level
   */
  public loadCheckpoint(levelId: string, checkpointId: string): any {
    const level = this.activeLevels.get(levelId)
    if (!level) return null

    const checkpoint = level.checkpoints.find(cp => cp.id === checkpointId)
    if (!checkpoint || !checkpoint.isCompleted) return null

    // Restore level state from checkpoint
    this.restoreLevelState(level, checkpoint.saveData)
    
    this.eventManager.emit('checkpointLoaded', { levelId, checkpointId, saveData: checkpoint.saveData, timestamp: Date.now() })
    return checkpoint.saveData
  }

  /**
   * Scales level difficulty based on player capabilities
   */
  public scaleLevelDifficulty(levelId: string, scaling: DifficultyScaling): void {
    const level = this.activeLevels.get(levelId)
    if (!level) return

    // Calculate difficulty multiplier
    const difficultyMultiplier = this.calculateDifficultyMultiplier(scaling)
    
    // Apply difficulty scaling to mechanics
    this.applyDifficultyScaling(level, difficultyMultiplier)
    
    // Update level state
    level.mechanics.puzzles.difficulty = this.scalePuzzleDifficulty(level.mechanics.puzzles.difficulty, difficultyMultiplier)
    level.mechanics.enemies.difficulty = this.scaleEnemyDifficulty(level.mechanics.enemies.difficulty, difficultyMultiplier)
    
    this.eventManager.emit('levelDifficultyScaled', { levelId, difficultyMultiplier, scaling, timestamp: Date.now() })
  }

  /**
   * Validates level content integrity and recovers from errors
   */
  public validateLevel(levelId: string): LevelValidationResult {
    const level = this.activeLevels.get(levelId)
    if (!level) {
      return { isValid: false, errors: ['Level not found'] }
    }

    const errors: string[] = []
    const warnings: string[] = []

    // Validate checkpoints
    if (level.checkpoints.length === 0) {
      errors.push('No checkpoints defined')
    }

    // Validate objectives
    if (level.objectives.length === 0) {
      errors.push('No objectives defined')
    }

    // Validate assets
    if (!level.assets.background) {
      warnings.push('No background image defined')
    }

    // Validate mechanics
    if (level.mechanics.physics.gravity < 0) {
      errors.push('Invalid physics configuration')
    }

    // Attempt to recover from errors
    if (errors.length > 0) {
      this.attemptLevelRecovery(level, errors)
    }

    const result: LevelValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      recoveryAttempted: errors.length > 0
    }

    this.eventManager.emit('levelValidated', { levelId, result, timestamp: Date.now() })
    return result
  }

  /**
   * Gets all available level templates
   */
  public getLevelTemplates(): LevelTemplate[] {
    return Array.from(this.levelTemplates.values())
  }

  /**
   * Gets a specific level template
   */
  public getLevelTemplate(levelId: string): LevelTemplate | undefined {
    return this.levelTemplates.get(levelId)
  }

  /**
   * Gets active levels for a specific quest
   */
  public getActiveLevelsForQuest(questId: string): LevelData[] {
    return Array.from(this.activeLevels.values()).filter(level => level.questId === questId)
  }

  /**
   * Resets a level to its initial state
   */
  public resetLevel(levelId: string): void {
    const level = this.activeLevels.get(levelId)
    if (!level) return

    // Reset level state
    level.state.isActive = false
    level.state.isCompleted = false
    level.state.currentCheckpoint = null
    level.state.completedObjectives.clear()
    level.state.collectedItems.clear()
    level.state.defeatedEnemies.clear()
    level.state.solvedPuzzles.clear()
    level.state.startTime = Date.now()
    level.state.completionTime = undefined
    level.state.score = 0
    level.state.stars = 0

    // Reset checkpoints
    level.checkpoints.forEach(checkpoint => {
      checkpoint.isActive = false
      checkpoint.isCompleted = false
    })

    // Reset objectives
    level.objectives.forEach(objective => {
      objective.isCompleted = false
      objective.current = 0
    })

    this.eventManager.emit('levelReset', { levelId, timestamp: Date.now() })
  }

  private createLevelFromTemplate(template: LevelTemplate, questId: string, playerData?: any): LevelData {
    // Generate unique level ID
    const levelId = `${template.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create level instance
    const level: LevelData = {
      ...template,
      id: levelId,
      questId,
      state: {
        isLoaded: false,
        isActive: false,
        isCompleted: false,
        currentCheckpoint: null,
        completedObjectives: new Set(),
        collectedItems: new Set(),
        defeatedEnemies: new Set(),
        solvedPuzzles: new Set(),
        startTime: Date.now(),
        attempts: 0,
        score: 0,
        stars: 0
      }
    }

    // Apply player-specific modifications
    if (playerData) {
      this.applyPlayerModifications(level, playerData)
    }

    return level
  }

  private async loadLevelAssets(level: LevelData, priority: 'critical' | 'essential' | 'optional'): Promise<void> {
    const assets = this.getAssetsByPriority(level.assets, priority)
    
    // Load textures
    await this.preloadImages(assets.textures)
    
    // Load audio
    await this.preloadAudio(assets.audio)
    
    // Load sprites
    await this.preloadImages(assets.sprites)
  }

  private getAssetsByPriority(assets: LevelAssets, priority: 'critical' | 'essential' | 'optional'): LevelAssets {
    switch (priority) {
      case 'critical':
        return {
          ...assets,
          textures: assets.textures.slice(0, 2),
          audio: assets.audio.slice(0, 1),
          sprites: assets.sprites.slice(0, 3)
        }
      case 'essential':
        return {
          ...assets,
          textures: assets.textures.slice(0, 5),
          audio: assets.audio.slice(0, 3),
          sprites: assets.sprites.slice(0, 8)
        }
      default:
        return assets
    }
  }

  private async preloadImages(paths: string[]): Promise<void> {
    const promises = paths.map(path => this.preloadImage(path))
    await Promise.all(promises)
  }

  private async preloadAudio(paths: string[]): Promise<void> {
    const promises = paths.map(path => this.preloadAudioFile(path))
    await Promise.all(promises)
  }

  private preloadImage(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => reject(new Error(`Failed to load image: ${path}`))
      img.src = path
    })
  }

  private preloadAudioFile(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      audio.oncanplaythrough = () => resolve()
      audio.onerror = () => reject(new Error(`Failed to load audio: ${path}`))
      audio.src = path
    })
  }

  private saveCheckpointData(level: LevelData): void {
    level.checkpoints.forEach(checkpoint => {
      if (checkpoint.isCompleted) {
        this.checkpointData.set(`${level.id}_${checkpoint.id}`, checkpoint.saveData)
      }
    })
  }

  private restoreLevelState(level: LevelData, saveData: any): void {
    if (saveData.state) {
      level.state = { ...level.state, ...saveData.state }
    }
    
    if (saveData.checkpoints) {
      level.checkpoints.forEach(checkpoint => {
        const savedCheckpoint = saveData.checkpoints[checkpoint.id]
        if (savedCheckpoint) {
          checkpoint.isCompleted = savedCheckpoint.isCompleted
          checkpoint.saveData = savedCheckpoint.saveData
        }
      })
    }
    
    if (saveData.objectives) {
      level.objectives.forEach(objective => {
        const savedObjective = saveData.objectives[objective.id]
        if (savedObjective) {
          objective.isCompleted = savedObjective.isCompleted
          objective.current = savedObjective.current
        }
      })
    }
  }

  private calculateDifficultyMultiplier(scaling: DifficultyScaling): number {
    let multiplier = 1.0
    
    // Player level scaling
    multiplier += (scaling.playerLevel - 1) * 0.1
    
    // Pet bond level scaling
    multiplier += scaling.petBondLevel * 0.05
    
    // Quest progress scaling
    multiplier += scaling.questProgress * 0.02
    
    // Previous attempts scaling (easier after failures)
    multiplier -= scaling.previousAttempts * 0.05
    
    // Time of day scaling
    const hour = new Date().getHours()
    if (hour >= 22 || hour <= 6) {
      multiplier += 0.1 // Night time bonus
    }
    
    // Multiplayer scaling
    if (scaling.multiplayer) {
      multiplier += 0.2
    }
    
    return Math.max(0.5, Math.min(2.0, multiplier))
  }

  private applyDifficultyScaling(level: LevelData, multiplier: number): void {
    // Scale physics
    level.mechanics.physics.gravity *= multiplier
    level.mechanics.physics.friction *= multiplier
    
    // Scale enemy spawn rate
    level.mechanics.enemies.spawnRate *= multiplier
    
    // Scale collectible spawn rate
    level.mechanics.collectibles.spawnRate *= multiplier
  }

  private scalePuzzleDifficulty(baseDifficulty: string, multiplier: number): string {
    const difficulties = ['easy', 'medium', 'hard', 'expert']
    const baseIndex = difficulties.indexOf(baseDifficulty)
    
    if (multiplier > 1.5) {
      return difficulties[Math.min(baseIndex + 1, difficulties.length - 1)]
    } else if (multiplier < 0.7) {
      return difficulties[Math.max(baseIndex - 1, 0)]
    }
    
    return baseDifficulty
  }

  private scaleEnemyDifficulty(baseDifficulty: string, multiplier: number): string {
    return this.scalePuzzleDifficulty(baseDifficulty, multiplier)
  }

  private attemptLevelRecovery(level: LevelData, errors: string[]): void {
    // Attempt to fix common issues
    if (errors.includes('No checkpoints defined')) {
      level.checkpoints.push({
        id: 'default_checkpoint',
        name: 'Start Point',
        position: { x: 0, y: 0 },
        description: 'Default starting checkpoint',
        isActive: true,
        isCompleted: false,
        requiredItems: [],
        unlockConditions: [],
        saveData: {}
      })
    }
    
    if (errors.includes('No objectives defined')) {
      level.objectives.push({
        id: 'default_objective',
        type: 'explore',
        description: 'Explore the level',
        target: 'level_completion',
        count: 1,
        current: 0,
        isCompleted: false,
        reward: { experience: 10, coins: 5, items: [], skills: [], unlockables: [] },
        hints: ['Look around and explore the area']
      })
    }
    
    if (errors.includes('Invalid physics configuration')) {
      level.mechanics.physics.gravity = Math.abs(level.mechanics.physics.gravity)
    }
  }

  private applyPlayerModifications(level: LevelData, playerData: any): void {
    // Apply player-specific modifications based on data
    if (playerData.level < level.requiredLevel) {
      // Reduce difficulty for under-leveled players
      level.mechanics.enemies.difficulty = 'easy'
      level.mechanics.puzzles.difficulty = 'easy'
    }
    
    if (playerData.petBondLevel > 50) {
      // Enable advanced pet interactions for high bond levels
      level.mechanics.interactions.petAbilities.push('advanced_sensing', 'puzzle_assistance')
    }
  }

  private cleanupLevelAssets(level: LevelData): void {
    // Clean up cached assets
    // This would integrate with the asset management system
  }

  private setupEventListeners(): void {
    // Listen for quest-related events
    this.eventManager.on('questStarted', ({ questId }) => {
      // Preload levels for the quest
      const questLevels = this.getLevelTemplates().filter(level => level.questId === questId)
      questLevels.forEach(level => {
        this.preloadLevelAssets(level.id)
      })
    })
    
    this.eventManager.on('questCompleted', ({ questId }) => {
      // Unload levels for the completed quest
      const activeLevels = this.getActiveLevelsForQuest(questId)
      activeLevels.forEach(level => {
        this.unloadLevel(level.id)
      })
    })
  }

  private async preloadLevelAssets(levelId: string): Promise<void> {
    const template = this.levelTemplates.get(levelId)
    if (!template) return

    try {
      await this.loadLevelAssets({ assets: template.assets } as LevelData, 'critical')
      this.eventManager.emit('levelPreloadCompleted', { levelId, timestamp: Date.now() })
    } catch (error) {
      this.eventManager.emit('levelPreloadFailed', { levelId, error, timestamp: Date.now() })
    }
  }

  private initializeLevelTemplates(): void {
    // Emerald Jungle - Quest 1 Level
    this.levelTemplates.set('emerald_jungle_quest_1', {
      id: 'emerald_jungle_quest_1',
      worldId: 'emerald_jungle',
      questId: 'quest_1',
      name: 'The Ancient Grove',
      description: 'Navigate through the mysterious grove to find the hidden temple entrance.',
      baseDifficulty: 'easy',
      requiredLevel: 1,
      checkpoints: [
        {
          id: 'grove_entrance',
          name: 'Grove Entrance',
          position: { x: 100, y: 100 },
          description: 'The entrance to the ancient grove',
          isActive: true,
          isCompleted: false,
          requiredItems: [],
          unlockConditions: [],
          saveData: {}
        },
        {
          id: 'temple_path',
          name: 'Temple Path',
          position: { x: 400, y: 300 },
          description: 'The path leading to the hidden temple',
          isActive: false,
          isCompleted: false,
          requiredItems: ['jungle_herb'],
          unlockConditions: ['grove_entrance_completed'],
          saveData: {}
        }
      ],
      objectives: [
        {
          id: 'find_temple',
          type: 'reach',
          description: 'Find the hidden temple entrance',
          target: 'temple_entrance',
          count: 1,
          current: 0,
          isCompleted: false,
          reward: { experience: 25, coins: 10, items: ['ancient_key'], skills: [], unlockables: [] },
          hints: ['Look for unusual rock formations', 'Your pet can sense ancient magic']
        },
        {
          id: 'collect_herbs',
          type: 'collect',
          description: 'Collect mystical herbs for the temple guardian',
          target: 'jungle_herb',
          count: 3,
          current: 0,
          isCompleted: false,
          reward: { experience: 15, coins: 5, items: [], skills: ['herb_lore'], unlockables: [] },
          hints: ['Herbs grow near water sources', 'Look for glowing plants']
        }
      ],
      assets: {
        background: '/assets/images/levels/emerald_grove_bg.jpg',
        music: '/assets/audio/levels/emerald_grove_theme.mp3',
        ambientSounds: [
          '/assets/audio/ambient/grove_wind.mp3',
          '/assets/audio/ambient/grove_birds.mp3'
        ],
        textures: [
          '/assets/images/textures/grove_ground.jpg',
          '/assets/images/textures/grove_path.jpg',
          '/assets/images/textures/grove_water.jpg'
        ],
        sprites: [
          '/assets/images/sprites/grove_trees.png',
          '/assets/images/sprites/grove_herbs.png',
          '/assets/images/sprites/grove_temple.png'
        ],
        audio: [
          '/assets/audio/sfx/grove_footsteps.mp3',
          '/assets/audio/sfx/grove_herb_pickup.mp3'
        ],
        animations: [
          '/assets/animations/grove_leaves.gif',
          '/assets/animations/grove_water_flow.gif'
        ],
        effects: [
          '/assets/effects/grove_mist.png',
          '/assets/effects/grove_light_rays.png'
        ],
        ui: [
          '/assets/images/ui/grove_theme_button.png',
          '/assets/images/ui/grove_theme_panel.png'
        ]
      },
      mechanics: {
        physics: {
          gravity: 9.8,
          friction: 0.3,
          restitution: 0.2,
          airResistance: 0.1,
          wind: 0.1
        },
        lighting: {
          ambient: 0.7,
          directional: 0.8,
          shadows: true,
          dynamic: true,
          color: '#8fbc8f',
          intensity: 1.0
        },
        weather: {
          enabled: true,
          type: 'clear',
          particles: true,
          wind: 0.1,
          temperature: 22,
          visibility: 1.0
        },
        gravity: {
          enabled: true,
          strength: 9.8,
          direction: 'down',
          zones: []
        },
        interactions: {
          npcDialogue: true,
          itemCollection: true,
          puzzleSolving: true,
          petInteraction: true,
          multiplayer: false,
          petAbilities: ['herb_sensing', 'path_finding'],
          petRestrictions: []
        },
        puzzles: {
          enabled: true,
          types: ['pattern', 'logic'],
          difficulty: 'easy',
          hints: true,
          skipOption: false
        },
        enemies: {
          enabled: false,
          types: [],
          spawnRate: 0,
          maxCount: 0,
          difficulty: 'easy',
          respawnTime: 0
        },
        collectibles: {
          enabled: true,
          types: ['herbs', 'keys'],
          spawnRate: 0.8,
          maxCount: 5,
          rarity: 'uncommon',
          respawnTime: 300
        }
      },
      metadata: {
        version: '1.0.0',
        author: 'AI Pets Adventure Team',
        creationDate: Date.now(),
        lastModified: Date.now(),
        tags: ['nature', 'exploration', 'puzzle'],
        rating: 4.5,
        playCount: 0,
        averageCompletionTime: 300,
        difficultyRating: 1.0
      }
    })
  }
}

export interface LevelValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  recoveryAttempted: boolean
}



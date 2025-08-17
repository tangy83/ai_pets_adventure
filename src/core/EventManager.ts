// Define typed event interfaces for better type safety
export interface GameEvents {
  // Game state events
  gameStateInitialized: {
    player: any
    pet: any
    worlds: [string, any][]
  }
  gameStateUpdated: {
    deltaTime: number
    totalPlayTime: number
  }
  gameStateSaved: {
    saveData: any
    timestamp: number
  }
  gameStateLoaded: {
    saveData: any
    timestamp: number
  }
  gameStateChanged: any
  gameStateSaveError: {
    error: string
    timestamp: number
  }
  gameStateLoadError: {
    error: string
    timestamp: number
  }
  
  // Quest events
  questStarted: {
    questId: string
    previousQuest: string | null
    player: any
  }
  questCompleted: {
    questId: string
    rewards: any[]
    player: any
    pet: any
  }
  questFailed: {
    questId: string
    player: any
  }
  
  // Player events
  playerLevelUp: {
    newLevel: number
    player: any
  }
  playerNameChanged: {
    oldName: string
    newName: string
    player: any
  }
  
  // World events
  worldChanged: {
    oldWorld: string
    newWorld: string
    player: any
  }
  
  // Achievement events
  achievementUnlocked: {
    achievementId: string
    totalAchievements: number
  }
  
  // Game control events
  gamePaused: {
    timestamp: number
  }
  gameResumed: {
    timestamp: number
  }
  gameReset: {
    timestamp: number
  }
  engineStarted: {
    timestamp: number
    config: any
  }
  engineStopped: {
    timestamp: number
    reason: string
    frameCount: number
    totalPlayTime: number
  }
  fpsUpdated: {
    fps: number
    frameCount: number
  }
  
  // ECS events
  entityCreated: {
    entityId: string
    name: string
    tags: string[]
    timestamp: number
  }
  entityDestroyed: {
    entityId: string
    timestamp: number
  }
  componentAdded: {
    entityId: string
    componentType: string
    timestamp: number
  }
  componentRemoved: {
    entityId: string
    componentType: string
    timestamp: number
  }
  entitiesCleared: {
    timestamp: number
  }
  systemAdded: {
    systemName: string
    timestamp: number
  }
  systemRemoved: {
    systemName: string
    timestamp: number
  }
  systemsCleared: {
    timestamp: number
  }
  systemError: {
    systemName: string
    error: string
    timestamp: number
  }
  recoveryFailed: {
    errorId: string
    system: string
    reason: string
  }
  recoverySucceeded: {
    errorId: string
    system: string
    strategy: string
  }
  restartSystem: {
    system: string
    reason: string
  }
  resetSystemState: {
    system: string
    reason: string
  }
  
  // System lifecycle events
  systemStarted: {
    systemName: string
    timestamp: number
  }
  systemStopped: {
    systemName: string
    timestamp: number
  }
  systemPaused: {
    systemName: string
    timestamp: number
  }
  systemResumed: {
    systemName: string
    timestamp: number
  }
  
  // Interaction events
  entityInteractionAvailable: {
    entityId: string
    targetId: string
    distance: number
    interactionType: string
  }
  entityInteractionStarted: {
    entityId: string
    targetId: string
    interactionType: string
    timestamp: number
  }
  entityInteractionCompleted: {
    entityId: string
    targetId: string
    interactionType: string
    result: any
    timestamp: number
  }
  
  // Animation events
  animationStarted: {
    entityId: string
    animationName: string
    timestamp: number
  }
  animationCompleted: {
    entityId: string
    animationName: string
    timestamp: number
  }
  animationStopped: {
    entityId: string
    animationName: string
    timestamp: number
  }
  
  // Inventory events
  itemAdded: {
    entityId: string
    itemId: string
    quantity: number
    timestamp: number
  }
  itemRemoved: {
    entityId: string
    itemId: string
    quantity: number
    timestamp: number
  }
  inventoryFull: {
    entityId: string
    itemId: string
    timestamp: number
  }
  
  // Skill events
  skillUsed: {
    entityId: string
    skillId: string
    timestamp: number
  }
  skillLevelUp: {
    entityId: string
    skillId: string
    oldLevel: number
    newLevel: number
    timestamp: number
  }
  skillCooldown: {
    entityId: string
    skillId: string
    remainingCooldown: number
    timestamp: number
  }
  ai_behavior_selected: {
    behaviorId: string
    behaviorName: string
    action: any
    entityId: string
    timestamp: number
  }
  ai_behavior_completed: {
    behaviorId: string
    behaviorName: string
    result: any
    entityId: string
    timestamp: number
  }
  ai_move: any
  ai_interact: any
  ai_emote: any
  ai_learn: any
  ai_communicate: any
  ai_action_completed: {
    action: any
  }
  ai_behavior_added: any
  ai_behavior_removed: any
  touchStart: any
  touchMove: any
  touchEnd: any
  touchCancel: any
  keyDown: any
  keyUp: any
  gestureStart: any
  gestureChange: any
  gestureEnd: any
  input: any
  physics_collision: any
  physics_body_update: any
  physics_body_updated: any
  physics_body_added: any
  physics_body_removed: any
  
  // Asset management events
  'asset:registered': {
    assetId: string
    asset: any
    timestamp: number
  }
  'asset:load:start': {
    assetId: string
    asset: any
    timestamp: number
  }
  'asset:load:progress': {
    assetId: string
    loaded: number
    total: number
    percentage: number
    timestamp: number
  }
  'asset:load:complete': {
    assetId: string
    asset: any
    timestamp: number
  }
  'asset:load:error': {
    assetId: string
    error: string
    timestamp: number
  }
  'asset:cache:hit': {
    assetId: string
    timestamp: number
  }
  'asset:cache:miss': {
    assetId: string
    timestamp: number
  }
  'asset:visibility:change': {
    assetId: string
    isVisible: boolean
    timestamp: number
  }
  'batch:complete': {
    batchSize: number
    completedAssets: string[]
    timestamp: number
  }
  'memory:warning': {
    message: string
    currentUsage: number
    threshold: number
    timestamp: number
  }
  
  // Memory Management events
  'textureAtlas:created': {
    atlasId: string
    size: number
    timestamp: number
  }
  'textureAtlas:full': {
    atlasId: string
    timestamp: number
  }
  'texture:added': {
    atlasId: string
    textureId: string
    coordinates: any
    timestamp: number
  }
  'objectPool:created': {
    poolId: string
    type: string
    initialSize: number
    timestamp: number
  }
  'objectPool:resized': {
    poolId: string
    type: string
    newSize: number
    oldSize: number
    timestamp: number
  }
  'memory:optimized': {
    savedMemory: number
    optimizationType: string
    timestamp: number
  }
  'textureAtlas:optimized': {
    atlasId: string
    savedMemory: number
    timestamp: number
  }
  
  // Additional asset management events
  'asset:cache:cleared': {
    timestamp: number
  }
  'asset:cache:removed': {
    assetId: string
    timestamp: number
  }
  'lazyLoader:destroyed': {
    timestamp: number
  }
  
  // Input management events
  'focusChange': {
    elementId: string
    hasFocus: boolean
    timestamp: number
  }
  
  // Asset compression events
  assetCompressionRequested: {
    assetId: string
    compressionType: string
    timestamp: number
  }
  assetCompressionCompleted: {
    assetId: string
    originalSize: number
    compressedSize: number
    compressionRatio: number
    timestamp: number
  }
  assetCompressionFailed: {
    assetId: string
    error: string
    timestamp: number
  }
  
  // Asset management additional events
  assetUnloaded: {
    assetId: string
    timestamp: number
  }
  

  textureAtlasCreated: {
    atlasId: string
    textureCount: number
    timestamp: number
  }
  assetCompressed: {
    assetId: string
    compressionRatio: number
    timestamp: number
  }
  progressiveTiersCreated: {
    assetId: string
    tierCount: number
    timestamp: number
  }
  assetLoadingOptimized: {
    optimizationType: string
    improvement: number
    timestamp: number
  }
  assetLoaded: {
    assetId: string
    loadTime: number
    timestamp: number
  }
  assetLoadFailed: {
    assetId: string
    error: string
    timestamp: number
  }
  batchProgress: {
    batchId: string
    progress: number
    timestamp: number
  }
  batchLoaded: {
    batchId: string
    assetCount: number
    timestamp: number
  }
  assetRestoredFromCache: {
    assetId: string
    cacheType: string
    timestamp: number
  }
  chunkAssetsRequested: {
    chunkId: string
    assetCount: number
    timestamp: number
  }
  chunkAssetsUnloaded: {
    chunkId: string
    assetCount: number
    timestamp: number
  }
  
  // Chunk management events
  chunkLoaded: {
    chunkId: string
    fromCache?: boolean
    loadTime?: number
    timestamp: number
  }
  chunkUnloaded: {
    chunkId: string
    reason: string
    timestamp: number
  }
  chunkLoadFailed: {
    chunkId: string
    error: string
    timestamp: number
  }
  chunkBecameVisible: {
    chunkId: string
    timestamp: number
  }
  chunkBecameHidden: {
    chunkId: string
    timestamp: number
  }
  chunkAssetLoadFailed: {
    chunkId: string
    assetId: string
    error: string
    timestamp: number
  }
  
  // World management events
  worldCreated: {
    worldId: string
    worldData: any
    timestamp: number
  }
  worldUnloaded: {
    worldId: string
    timestamp: number
  }
  worldStatusChanged: {
    worldId: string
    oldStatus: string
    newStatus: string
    timestamp: number
  }
  worldDestroyed: {
    worldId: string
    timestamp: number
  }
  
  // Player world events
  playerJoinedWorld: {
    playerId: string
    worldId: string
    timestamp: number
  }
  playerLeftWorld: {
    playerId: string
    worldId: string
    timestamp: number
  }
  
  // Quest system events
  questAbandoned: {
    questId: string
    player: any
    timestamp?: number
  }
  questReadyToComplete: {
    questId: string
    player: any
    timestamp?: number
  }
  questProgressUpdated: {
    questId: string
    objectiveId: string
    player: any
    timestamp?: number
  }
  questReset: {
    questId: string
    player: any
    timestamp?: number
  }
  questLevelLoaded: {
    levelId: string
    questId: string
    timestamp: number
  }
  questCheckpointSaved: {
    playerId: string
    checkpointId: string
    checkpointName: string
    questCount: number
    timestamp?: number
  }
  questCheckpointRestored: {
    playerId: string
    checkpointId: string
    restoredQuests: number
    timestamp?: number
  }
  questChainAvailable: {
    questId: string
    player: any
    timestamp?: number
  }
  questCompletedInWorld: {
    questId: string
    worldId: string
    player: any
    timestamp: number
  }
  
  // Level management events
  levelLoadStarted: {
    levelId: string
    questId: string
    timestamp: number
  }
  levelAssetsLoaded: {
    levelId: string
    type: string
    timestamp: number
  }
  levelLoadCompleted: {
    level: any
    questId: string
    timestamp: number
  }
  levelLoadFailed: {
    levelId: string
    questId: string
    error: string
    timestamp: number
  }
  levelUnloaded: {
    levelId: string
    timestamp: number
  }
  checkpointSaved: {
    levelId: string
    checkpointId: string
    saveData: any
    timestamp: number
  }
  checkpointLoaded: {
    levelId: string
    checkpointId: string
    saveData: any
    timestamp: number
  }
  levelDifficultyScaled: {
    levelId: string
    difficultyMultiplier: number
    scaling: any
    timestamp: number
  }
  levelValidated: {
    levelId: string
    result: any
    timestamp: number
  }
  levelReset: {
    levelId: string
    timestamp: number
  }
  levelPreloadCompleted: {
    levelId: string
    timestamp: number
  }
  levelPreloadFailed: {
    levelId: string
    error: string
    timestamp: number
  }
  
  // Checkpoint system events
  'checkpoint:created': {
    checkpoint: any
    id: string
    timestamp: number
  }
  'checkpoint:restored': {
    checkpoint: any
    id: string
    timestamp: number
  }
  'checkpoint:deleted': {
    checkpointId: string
    timestamp: number
  }
  'checkpoint:updated': {
    checkpointId: string
    updates: any
    timestamp: number
  }
  'checkpoint:imported': {
    checkpoint: any
    id: string
    timestamp: number
  }
  'checkpoint:cleared': {}
  'checkpoint:restore:failed': {
    checkpointId: string
    error: string
    timestamp: number
  }
  'checkpoint:autoSave:triggered': {}
  
  // Objective tracking events
  objectiveTrackerInitialized: {
    playerId: string
    timestamp: number
  }
  objectiveTrackingStarted: {
    questId: string
    objectiveId: string
    timestamp: number
  }
  objectiveProgressUpdated: {
    objectiveId: string
    progress: number
    timestamp: number
  }
  objectiveHintProvided: {
    objectiveId: string
    hint: string
    timestamp: number
  }
  objectiveReset: {
    objectiveId: string
    timestamp: number
  }
  objectiveMilestoneReached: {
    objectiveId: string
    milestone: string
    timestamp: number
  }
  objectiveCompleted: {
    objectiveId: string
    questId: string
    player: any
    timestamp?: number
  }
  objectiveTrackerAutoSave: {
    playerId: string
    timestamp: number
  }
  
  // Difficulty scaling events
  difficultyAdjusted: {
    questId: string
    playerId: string
    oldDifficulty: number
    newDifficulty: number
    factors: any
    timestamp: number
  }
  
  // Pet behavior events
  petSkillUsed: {
    petId: string
    skillId: string
    timestamp: number
  }
  petBehaviorChanged: {
    petId: string
    oldBehavior: string
    newBehavior: string
    timestamp: number
  }
  
  // Reward system events
  rewardsCalculated: {
    questId: string
    playerId: string
    rewards: any
    calculation: any
    timestamp: number
  }
  objectiveRewardsCalculated: {
    objectiveId: string
    playerId: string
    rewards: any
    timestamp: number
  }
  rewardsDistributed: {
    playerId: string
    rewards: any
    timestamp: number
  }
  rewardsCheckpointSaved: {
    playerId: string
    checkpointId: string
    timestamp: number
  }
  rewardsCheckpointRestored: {
    playerId: string
    checkpointId: string
    timestamp: number
  }
  
  // World factory events
  worldFactoryInitialized: {
    timestamp: number
  }
  
  // Input events
  keyPress: {
    key: string
    keyCode: string
    timestamp: number
  }
  gameAction: {
    action: string
    data: any
  }
  gameActionRelease: {
    action: string
    data: any
  }
  inputAction: {
    action: string
    data: any
  }
  inputProfileChanged: {
    profile: string
    previousProfile: string
  }
  
  // Accessibility events
  accessibilityFocusChange: {
    elementId: string
    hasFocus: boolean
    timestamp: number
  }
  accessibilityElementActivate: {
    elementId: string
    timestamp: number
  }
  accessibilityTouchTargetValidation: {
    elementId: string
    isValid: boolean
    timestamp: number
  }
  accessibilityTabNavigation: {
    direction: 'forward' | 'backward'
    elementId: string
  }
  accessibilityHelp: {
    context: string
    elementId: string
  }
  accessibilityHotkey: {
    key: string
    elementId: string
  }
  
  // Keyboard events
  keyboardBlur: {
    timestamp: number
  }
  keyboardFocus: {
    timestamp: number
  }
  keyboardHidden: {
    timestamp: number
  }
  keyboardVisible: {
    timestamp: number
  }
  
  // Touch events
  touchTargetValidation: {
    elementId: string
    isValid: boolean
    timestamp: number
  }
  
  // Mouse events
  mouseEvent: {
    type: string
    button?: number
    x?: number
    y?: number
    deltaX?: number
    deltaY?: number
    deltaZ?: number
    timestamp: number
    target?: string
    data?: any
  }
  mouseDown: {
    button: number
    x: number
    y: number
    timestamp: number
  }
  mouseUp: {
    button: number
    x: number
    y: number
    timestamp: number
  }
  mouseMove: {
    x: number
    y: number
    deltaX: number
    deltaY: number
    timestamp: number
  }
  mouseEnter: {
    timestamp: number
  }
  mouseLeave: {
    timestamp: number
  }
  click: {
    button: number
    x: number
    y: number
    timestamp: number
    target?: string
  }
  doubleClick: {
    button: number
    x: number
    y: number
    timestamp: number
    target?: string
  }
  rightClick: {
    button: number
    x: number
    y: number
    timestamp: number
    target?: string
  }
  middleClick: {
    button: number
    x: number
    y: number
    timestamp: number
    target?: string
  }
  dragStart: {
    button: number
    x: number
    y: number
    timestamp: number
  }
  dragMove: {
    button: number
    x: number
    y: number
    deltaX: number
    deltaY: number
    timestamp: number
  }
  dragEnd: {
    button: number
    x: number
    y: number
    timestamp: number
  }
  hover: {
    x: number
    y: number
    timestamp: number
    target?: string
  }
  hoverEnd: {
    x: number
    y: number
    timestamp: number
    target?: string
  }
  wheel: {
    deltaX: number
    deltaY: number
    deltaZ: number
    timestamp: number
  }
  
  // Element events
  elementActivate: {
    elementId: string
    timestamp: number
  }
  
  // Pet AI events
  'pet:ai:registered': {
    petId: string
    timestamp: number
  }
  'pet:ai:behavior:executed': {
    petId: string
    behavior: string
    success: boolean
    timestamp: number
  }
  'pet:ai:behavior:changed': {
    petId: string
    behavior: string
    timestamp: number
  }
  'pet:ai:skill:added': {
    petId: string
    skill: any
    timestamp: number
  }
  'pet:ai:state:updated': {
    petId: string
    state: any
    timestamp: number
  }
  'pet:ai:destroyed': {
    petId: string
    timestamp: number
  }
  'pet:ai:memory:added': {
    petId: string
    memory: any
    timestamp: number
  }
  'pet:ai:learning:progress': {
    petId: string
    progress: any
    timestamp: number
  }
  'pet:ai:context:analyzed': {
    petId: string
    context: any
    timestamp: number
  }
  
  // Client-side AI Processing events
  'client:ai:initialized': {
    timestamp: number
    modelsLoaded: number
    capabilities: any
  }
  'client:ai:model:loaded': {
    modelId: string
    modelName: string
    timestamp: number
  }
  'client:ai:model:unloaded': {
    modelId: string
    timestamp: number
  }
  'client:ai:learning:recorded': {
    experienceId: string
    context: string
    success: boolean
    timestamp: number
  }
  'client:ai:learning:training:completed': {
    modelId: string
    accuracy: number
    timestamp: number
  }
  'client:ai:cloud:sync:queued': {
    modelId: string
    changesCount: number
    timestamp: number
  }
  'client:ai:cloud:sync:completed': {
    modelId: string
    timestamp: number
  }
  'client:ai:cloud:sync:failed': {
    modelId: string
    error: string
    timestamp: number
  }
  'client:ai:performance:updated': {
    metrics: any
    timestamp: number
  }
  'client:ai:complexity:adjusted': {
    reason: string
    newBatchSize: number
    timestamp: number
  }
  'client:ai:connection:restored': {
    timestamp: number
  }
  'client:ai:connection:lost': {
    timestamp: number
  }
  
  // Multi-Modal AI events
  'multiModalAI:initialized': {
    timestamp: number
    capabilities: any
  }
  'multiModalAI:voice:started': {
    timestamp: number
  }
  'multiModalAI:voice:stopped': {
    timestamp: number
  }
  'multiModalAI:voice:command': {
    text: string
    confidence: number
    timestamp: number
    intent?: string
    entities?: string[]
  }
  'multiModalAI:voice:error': {
    error: string
    timestamp: number
  }
  'multiModalAI:voice:ended': {
    timestamp: number
  }
  'multiModalAI:voice:processed': {
    text: string
    confidence: number
    timestamp: number
    intent?: string
    entities?: string[]
    analysis: any
  }
  'multiModalAI:drawing:started': {
    timestamp: number
    canvasSize: { width: number; height: number }
  }
  'multiModalAI:drawing:stopped': {
    timestamp: number
  }
  'multiModalAI:drawing:analyzed': {
    recognized: boolean
    confidence: number
    interpretation: string
    category: string
    timestamp: number
  }
  'multiModalAI:text:processed': {
    intent: string
    confidence: number
    entities: string[]
    sentiment: string
    context: string
    timestamp: number
  }
  'multiModalAI:touch:gesture': {
    type: string
    direction?: string
    distance: number
    duration: number
    fingers: number
    timestamp: number
  }
  'multiModalAI:camera:initialized': {
    timestamp: number
    resolution: { width: number; height: number }
  }
  'multiModalAI:context:updated': {
    context: any
    analysis: any
    timestamp: number
  }
  'multiModalAI:fusion:result': {
    primaryInput: string
    confidence: number
    interpretedCommand: string
    context: any
    timestamp: number
  }
  'multiModalAI:config:updated': {
    config: any
    timestamp: number
  }
  
}

export type EventType = keyof GameEvents
export type EventData<T extends EventType> = GameEvents[T]

export type EventHandler<T extends EventType = EventType> = (data: EventData<T>) => void
export type EventFilter<T extends EventType = EventType> = (data: EventData<T>) => boolean

export interface EventSubscription<T extends EventType = EventType> {
  id: string
  eventType: T
  handler: EventHandler<T>
  filter?: EventFilter<T>
  once: boolean
  priority: number
}

export class EventManager {
  private static instance: EventManager
  private events: Map<EventType, EventSubscription<any>[]> = new Map()
  private eventQueue: Array<{ type: EventType; data: any; timestamp: number }> = []
  private isProcessing: boolean = false
  private subscriptionIdCounter: number = 0
  private maxEventQueueSize: number = 1000
  private eventStats: Map<EventType, { count: number; lastEmitted: number }> = new Map()

  constructor() {
    // Process events on the next tick to avoid blocking the main thread
    setInterval(() => this.processEvents(), 16) // ~60fps
  }

  public static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager()
    }
    return EventManager.instance
  }

  public on<T extends EventType>(
    eventType: T, 
    handler: EventHandler<T>, 
    filter?: EventFilter<T>,
    priority: number = 0
  ): string {
    const subscriptionId = this.generateSubscriptionId()
    const subscription: EventSubscription<T> = {
      id: subscriptionId,
      eventType,
      handler,
      filter,
      once: false,
      priority
    }

    this.addSubscription(eventType, subscription)
    return subscriptionId
  }

  public once<T extends EventType>(
    eventType: T, 
    handler: EventHandler<T>, 
    filter?: EventFilter<T>,
    priority: number = 0
  ): string {
    const subscriptionId = this.generateSubscriptionId()
    const subscription: EventSubscription<T> = {
      id: subscriptionId,
      eventType,
      handler,
      filter,
      once: true,
      priority
    }

    this.addSubscription(eventType, subscription)
    return subscriptionId
  }

  public off(subscriptionId: string): boolean {
    for (const [eventType, subscriptions] of this.events.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId)
      if (index !== -1) {
        subscriptions.splice(index, 1)
        
        // Remove event type if no more subscriptions
        if (subscriptions.length === 0) {
          this.events.delete(eventType)
        }
        
        return true
      }
    }
    return false
  }

  public offAll(eventType: EventType): number {
    const subscriptions = this.events.get(eventType)
    if (!subscriptions) return 0

    const count = subscriptions.length
    this.events.delete(eventType)
    return count
  }

  public emit<T extends EventType>(eventType: T, data: EventData<T>): void {
    // Validate event data structure
    if (!this.validateEventData(eventType, data)) {
      console.warn(`Invalid event data for ${eventType}:`, data)
      return
    }

    // Update event statistics
    this.updateEventStats(eventType)

    // Add event to queue for processing
    this.eventQueue.push({
      type: eventType,
      data,
      timestamp: Date.now()
    })

    // Limit queue size to prevent memory issues
    if (this.eventQueue.length > this.maxEventQueueSize) {
      console.warn(`Event queue limit reached, dropping oldest event`)
      this.eventQueue.shift()
    }

    // Process events immediately if not already processing
    if (!this.isProcessing) {
      this.processEvents()
    }
  }

  public emitImmediate<T extends EventType>(eventType: T, data: EventData<T>): void {
    // Validate event data structure
    if (!this.validateEventData(eventType, data)) {
      console.warn(`Invalid event data for ${eventType}:`, data)
      return
    }

    // Update event statistics
    this.updateEventStats(eventType)

    // Process event immediately (useful for critical events)
    this.processEvent(eventType, data)
  }

  private validateEventData<T extends EventType>(eventType: T, data: EventData<T>): boolean {
    // Basic validation - ensure data is not null/undefined
    if (data === null || data === undefined) {
      return false
    }

    // Add more specific validation rules here if needed
    // For now, just ensure the data exists
    return true
  }

  private updateEventStats(eventType: EventType): void {
    const stats = this.eventStats.get(eventType) || { count: 0, lastEmitted: 0 }
    stats.count++
    stats.lastEmitted = Date.now()
    this.eventStats.set(eventType, stats)
  }

  private addSubscription<T extends EventType>(eventType: T, subscription: EventSubscription<T>): void {
    if (!this.events.has(eventType)) {
      this.events.set(eventType, [])
    }

    const subscriptions = this.events.get(eventType)!
    subscriptions.push(subscription)
    
    // Sort subscriptions by priority (higher priority first)
    subscriptions.sort((a, b) => b.priority - a.priority)

    console.log(`Event subscription added: ${eventType} (priority: ${subscription.priority})`)
  }

  private generateSubscriptionId(): string {
    return `event_${++this.subscriptionIdCounter}_${Date.now()}`
  }

  public processEvents(): void {
    if (this.isProcessing || this.eventQueue.length === 0) return

    this.isProcessing = true

    try {
      // Process all queued events
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!
        this.processEvent(event.type, event.data)
      }
    } catch (error) {
      console.error('Error processing events:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private processEvent<T extends EventType>(eventType: T, data: EventData<T>): void {
    const subscriptions = this.events.get(eventType)
    if (!subscriptions) return

    // Create a copy of subscriptions to avoid modification during iteration
    const subscriptionsCopy = [...subscriptions]
    const toRemove: string[] = []

    for (const subscription of subscriptionsCopy) {
      try {
        // Skip inactive subscriptions
        if (!subscription.handler) {
          toRemove.push(subscription.id)
          continue
        }

        // Apply filter if present
        if (subscription.filter && !subscription.filter(data)) {
          continue
        }

        // Call handler with proper typing
        subscription.handler(data)

        // Mark for removal if it's a one-time subscription
        if (subscription.once) {
          toRemove.push(subscription.id)
        }
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error)
        
        // Remove problematic subscription
        toRemove.push(subscription.id)
      }
    }

    // Remove marked subscriptions
    for (const id of toRemove) {
      this.off(id)
    }
  }

  public getEventCount(eventType?: EventType): number {
    if (eventType) {
      return this.events.get(eventType)?.length || 0
    }
    
    let total = 0
    for (const subscriptions of this.events.values()) {
      total += subscriptions.length
    }
    return total
  }

  public getEventTypes(): EventType[] {
    return Array.from(this.events.keys())
  }

  public getSubscriptionCount(eventType: EventType): number {
    return this.events.get(eventType)?.length || 0
  }

  public getEventStats(): Map<EventType, { count: number; lastEmitted: number }> {
    return new Map(this.eventStats)
  }

  public getEventStatsForType(eventType: EventType): { count: number; lastEmitted: number } | undefined {
    return this.eventStats.get(eventType)
  }

  public clearEventQueue(): void {
    this.eventQueue = []
  }

  public getEventQueueLength(): number {
    return this.eventQueue.length
  }

  public setMaxEventQueueSize(size: number): void {
    this.maxEventQueueSize = Math.max(100, size) // Minimum size of 100
  }

  public getMaxEventQueueSize(): number {
    return this.maxEventQueueSize
  }

  public destroy(): void {
    this.events.clear()
    this.eventQueue = []
    this.eventStats.clear()
    this.isProcessing = false
    this.subscriptionIdCounter = 0
  }

  // Utility method to check if an event type has any active subscriptions
  public hasSubscribers(eventType: EventType): boolean {
    const subscriptions = this.events.get(eventType)
    return subscriptions ? subscriptions.length > 0 : false
  }

  // Method to get all subscriptions for a specific event type
  public getSubscriptions(eventType: EventType): EventSubscription[] {
    return [...(this.events.get(eventType) || [])]
  }

  // Method to pause/resume event processing
  public pauseEventProcessing(): void {
    this.isProcessing = true
  }

  public resumeEventProcessing(): void {
    this.isProcessing = false
    // Process any queued events
    this.processEvents()
  }
} 
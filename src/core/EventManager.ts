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
  
  // ECS events
  entityCreated: {
    entityId: string
    name: string
    tags: string[]
  }
  entityDestroyed: {
    entityId: string
  }
  componentAdded: {
    entityId: string
    componentType: string
  }
  componentRemoved: {
    entityId: string
    componentType: string
  }
  entitiesCleared: {}
  systemAdded: {
    systemName: string
  }
  systemRemoved: {
    systemName: string
  }
  systemsCleared: {}
  systemError: {
    systemName: string
    error: string
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
  private events: Map<EventType, EventSubscription[]> = new Map()
  private eventQueue: Array<{ type: EventType; data: any; timestamp: number }> = []
  private isProcessing: boolean = false
  private subscriptionIdCounter: number = 0
  private maxEventQueueSize: number = 1000
  private eventStats: Map<EventType, { count: number; lastEmitted: number }> = new Map()

  constructor() {
    // Process events on the next tick to avoid blocking the main thread
    setInterval(() => this.processEvents(), 16) // ~60fps
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
export interface TimeEvent {
  id: string
  callback: () => void
  delay: number
  repeat: boolean
  interval: number
  remainingTime: number
  isActive: boolean
}

export class TimeManager {
  private startTime: number = performance.now()
  private currentTime: number = 0
  private deltaTime: number = 0
  private lastFrameTime: number = 0
  private timeScale: number = 1.0
  private isPaused: boolean = false
  private timeEvents: Map<string, TimeEvent> = new Map()
  private eventIdCounter: number = 0

  constructor() {
    this.currentTime = this.startTime
    this.lastFrameTime = this.currentTime
  }

  public update(deltaTime: number): void {
    if (this.isPaused) {
      this.deltaTime = 0
      return
    }

    // Apply time scale
    this.deltaTime = deltaTime * this.timeScale
    this.currentTime += this.deltaTime
    this.lastFrameTime = this.currentTime

    // Update time events
    this.updateTimeEvents()
  }

  public getDeltaTime(): number {
    return this.deltaTime
  }

  public getCurrentTime(): number {
    return this.currentTime
  }

  public getElapsedTime(): number {
    return this.currentTime - this.startTime
  }

  public getTimeScale(): number {
    return this.timeScale
  }

  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale)
  }

  public pause(): void {
    this.isPaused = true
  }

  public resume(): void {
    this.isPaused = false
  }

  public isTimePaused(): boolean {
    return this.isPaused
  }

  public setTimeout(callback: () => void, delay: number): string {
    const eventId = this.generateEventId()
    const timeEvent: TimeEvent = {
      id: eventId,
      callback,
      delay,
      repeat: false,
      interval: 0,
      remainingTime: delay,
      isActive: true
    }

    this.timeEvents.set(eventId, timeEvent)
    return eventId
  }

  public setInterval(callback: () => void, interval: number): string {
    const eventId = this.generateEventId()
    const timeEvent: TimeEvent = {
      id: eventId,
      callback,
      delay: interval,
      repeat: true,
      interval,
      remainingTime: interval,
      isActive: true
    }

    this.timeEvents.set(eventId, timeEvent)
    return eventId
  }

  public clearTimeout(eventId: string): boolean {
    const event = this.timeEvents.get(eventId)
    if (!event) return false

    event.isActive = false
    this.timeEvents.delete(eventId)
    return true
  }

  public clearInterval(eventId: string): boolean {
    return this.clearTimeout(eventId)
  }

  private updateTimeEvents(): void {
    const eventsToRemove: string[] = []

    for (const [eventId, event] of this.timeEvents.entries()) {
      if (!event.isActive) {
        eventsToRemove.push(eventId)
        continue
      }

      event.remainingTime -= this.deltaTime

      if (event.remainingTime <= 0) {
        try {
          event.callback()
        } catch (error) {
          console.error(`Error in time event callback:`, error)
        }

        if (event.repeat) {
          // Reset for next interval
          event.remainingTime = event.interval
        } else {
          // One-time event, mark for removal
          eventsToRemove.push(eventId)
        }
      }
    }

    // Remove completed events
    for (const eventId of eventsToRemove) {
      this.timeEvents.delete(eventId)
    }
  }

  private generateEventId(): string {
    return `time_${++this.eventIdCounter}_${Date.now()}`
  }

  public getActiveEventCount(): number {
    return this.timeEvents.size
  }

  public clearAllEvents(): void {
    this.timeEvents.clear()
  }

  public getEventInfo(eventId: string): TimeEvent | undefined {
    return this.timeEvents.get(eventId)
  }

  public getAllEvents(): TimeEvent[] {
    return Array.from(this.timeEvents.values())
  }

  public reset(): void {
    this.startTime = performance.now()
    this.currentTime = this.startTime
    this.lastFrameTime = this.currentTime
    this.deltaTime = 0
    this.timeScale = 1.0
    this.isPaused = false
    this.clearAllEvents()
  }

  public destroy(): void {
    this.clearAllEvents()
    this.reset()
  }
} 

export interface PlayerStats {
  level: number
  experience: number
  health: number
  maxHealth: number
  coins: number
  questsCompleted: number
}

export interface PlayerPosition {
  x: number
  y: number
  world: string
}

export class Player {
  private id: string
  private name: string
  private stats: PlayerStats
  private position: PlayerPosition
  private preferences: PlayerPreferences
  private createdAt: Date
  private lastActive: Date

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
    this.stats = {
      level: 1,
      experience: 0,
      health: 100,
      maxHealth: 100,
      coins: 0,
      questsCompleted: 0
    }
    this.position = {
      x: 0,
      y: 0,
      world: 'home'
    }
    this.preferences = {
      audioVolume: 0.7,
      musicVolume: 0.5,
      hapticFeedback: true,
      notifications: true,
      language: 'en',
      theme: 'auto'
    }
    this.createdAt = new Date()
    this.lastActive = new Date()
  }

  // Getters
  public getId(): string { return this.id }
  public getName(): string { return this.name }
  public getLevel(): number { return this.stats.level }
  public getStats(): PlayerStats { return { ...this.stats } }
  public getPosition(): PlayerPosition { return { ...this.position } }
  public getPreferences(): PlayerPreferences { return { ...this.preferences } }
  public getCreatedAt(): Date { return new Date(this.createdAt) }
  public getLastActive(): Date { return new Date(this.lastActive) }

  // Setters
  public setName(name: string): void { this.name = name }
  public setPosition(x: number, y: number, world: string): void {
    this.position = { x, y, world }
    this.updateLastActive()
  }

  // Stats management
  public addExperience(amount: number): void {
    this.stats.experience += amount
    this.checkLevelUp()
    this.updateLastActive()
  }

  public addCoins(amount: number): void {
    this.stats.coins += amount
    this.updateLastActive()
  }

  public spendCoins(amount: number): boolean {
    if (this.stats.coins >= amount) {
      this.stats.coins -= amount
      this.updateLastActive()
      return true
    }
    return false
  }

  public heal(amount: number): void {
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount)
    this.updateLastActive()
  }

  public takeDamage(amount: number): void {
    this.stats.health = Math.max(0, this.stats.health - amount)
    this.updateLastActive()
  }

  public completeQuest(): void {
    this.stats.questsCompleted++
    this.addExperience(100)
    this.addCoins(50)
  }

  // Preferences management
  public updatePreferences(preferences: Partial<PlayerPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences }
    this.updateLastActive()
  }

  // Private methods
  private checkLevelUp(): void {
    const experienceNeeded = this.stats.level * 100
    if (this.stats.experience >= experienceNeeded) {
      this.stats.level++
      this.stats.experience -= experienceNeeded
      this.stats.maxHealth += 10
      this.stats.health = this.stats.maxHealth
    }
  }

  private updateLastActive(): void {
    this.lastActive = new Date()
  }

  // Serialization
  public toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      stats: this.stats,
      position: this.position,
      preferences: this.preferences,
      createdAt: this.createdAt.toISOString(),
      lastActive: this.lastActive.toISOString()
    }
  }

  public static fromJSON(data: any): Player {
    const player = new Player(data.id, data.name)
    player.stats = data.stats
    player.position = data.position
    player.preferences = data.preferences
    player.createdAt = new Date(data.createdAt)
    player.lastActive = new Date(data.lastActive)
    return player
  }
}

export interface PlayerPreferences {
  audioVolume: number
  musicVolume: number
  hapticFeedback: boolean
  notifications: boolean
  language: string
  theme: 'light' | 'dark' | 'auto'
} 
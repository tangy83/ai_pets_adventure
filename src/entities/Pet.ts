export interface PetStats {
  level: number
  experience: number
  health: number
  maxHealth: number
  energy: number
  maxEnergy: number
  bond: number
  maxBond: number
}

export interface PetSkill {
  id: string
  name: string
  description: string
  level: number
  cooldown: number
  lastUsed: number
  energyCost: number
}

export interface PetMemory {
  id: string
  type: 'quest' | 'interaction' | 'learning' | 'social'
  data: any
  timestamp: number
  importance: number
}

export type PetType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'dragon' | 'unicorn'
export type PetPersonality = 'friendly' | 'curious' | 'brave' | 'shy' | 'playful' | 'wise'

export class Pet {
  private id: string
  private name: string
  private type: PetType
  private personality: PetPersonality
  private stats: PetStats
  private skills: PetSkill[]
  private memories: PetMemory[]
  private ownerId: string
  private createdAt: Date
  private lastActive: Date

  constructor(id: string, name: string, type: PetType, ownerId: string) {
    this.id = id
    this.name = name
    this.type = type
    this.personality = this.generatePersonality(type)
    this.ownerId = ownerId
    this.stats = {
      level: 1,
      experience: 0,
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100,
      bond: 0,
      maxBond: 100
    }
    this.skills = this.generateInitialSkills(type)
    this.memories = []
    this.createdAt = new Date()
    this.lastActive = new Date()
  }

  // Getters
  public getId(): string { return this.id }
  public getName(): string { return this.name }
  public getType(): PetType { return this.type }
  public getPersonality(): PetPersonality { return this.personality }
  public getStats(): PetStats { return { ...this.stats } }
  public getSkills(): PetSkill[] { return [...this.skills] }
  public getMemories(): PetMemory[] { return [...this.memories] }
  public getOwnerId(): string { return this.ownerId }
  public getCreatedAt(): Date { return new Date(this.createdAt) }
  public getLastActive(): Date { return new Date(this.lastActive) }

  // Setters
  public setName(name: string): void { this.name = name }
  public setPersonality(personality: PetPersonality): void { this.personality = personality }

  // Stats management
  public addExperience(amount: number): void {
    this.stats.experience += amount
    this.checkLevelUp()
    this.updateLastActive()
  }

  public addBond(amount: number): void {
    this.stats.bond = Math.min(this.stats.maxBond, this.stats.bond + amount)
    this.updateLastActive()
  }

  public heal(amount: number): void {
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount)
    this.updateLastActive()
  }

  public restoreEnergy(amount: number): void {
    this.stats.energy = Math.min(this.stats.maxEnergy, this.stats.energy + amount)
    this.updateLastActive()
  }

  public useEnergy(amount: number): boolean {
    if (this.stats.energy >= amount) {
      this.stats.energy -= amount
      this.updateLastActive()
      return true
    }
    return false
  }

  public takeDamage(amount: number): void {
    this.stats.health = Math.max(0, this.stats.health - amount)
    this.updateLastActive()
  }

  // Skills management
  public addSkill(skill: PetSkill): void {
    const existingSkill = this.skills.find(s => s.id === skill.id)
    if (existingSkill) {
      existingSkill.level = Math.max(existingSkill.level, skill.level)
    } else {
      this.skills.push(skill)
    }
    this.updateLastActive()
  }

  public useSkill(skillId: string): boolean {
    const skill = this.skills.find(s => s.id === skillId)
    if (!skill) return false

    const now = Date.now()
    if (now - skill.lastUsed < skill.cooldown) return false
    if (this.stats.energy < skill.energyCost) return false

    skill.lastUsed = now
    this.useEnergy(skill.energyCost)
    return true
  }

  public upgradeSkill(skillId: string): boolean {
    const skill = this.skills.find(s => s.id === skillId)
    if (!skill) return false

    skill.level++
    skill.cooldown = Math.max(1000, skill.cooldown * 0.9)
    skill.energyCost = Math.max(5, skill.energyCost * 0.95)
    this.updateLastActive()
    return true
  }

  // Memory management
  public addMemory(memory: Omit<PetMemory, 'id' | 'timestamp'>): void {
    const newMemory: PetMemory = {
      ...memory,
      id: this.generateId(),
      timestamp: Date.now()
    }
    
    this.memories.push(newMemory)
    this.cleanupOldMemories()
    this.updateLastActive()
  }

  public getMemoriesByType(type: PetMemory['type']): PetMemory[] {
    return this.memories.filter(m => m.type === type)
  }

  public getMemoriesByImportance(minImportance: number): PetMemory[] {
    return this.memories.filter(m => m.importance >= minImportance)
  }

  // AI behavior helpers
  public getBehaviorContext(): any {
    return {
      personality: this.personality,
      currentStats: this.stats,
      recentMemories: this.memories
        .filter(m => Date.now() - m.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 5),
      availableSkills: this.skills.filter(s => 
        Date.now() - s.lastUsed >= s.cooldown && this.stats.energy >= s.energyCost
      )
    }
  }

  // Private methods
  private generatePersonality(type: PetType): PetPersonality {
    const personalities: PetPersonality[] = ['friendly', 'curious', 'brave', 'shy', 'playful', 'wise']
    const typePersonalities: Record<PetType, PetPersonality[]> = {
      dog: ['friendly', 'playful', 'brave'],
      cat: ['curious', 'shy', 'wise'],
      bird: ['curious', 'playful', 'wise'],
      rabbit: ['shy', 'curious', 'friendly'],
      dragon: ['brave', 'wise', 'curious'],
      unicorn: ['wise', 'friendly', 'brave']
    }
    
    const preferred = typePersonalities[type] || personalities
    return preferred[Math.floor(Math.random() * preferred.length)]
  }

  private generateInitialSkills(type: PetType): PetSkill[] {
    const baseSkills: PetSkill[] = [
      {
        id: 'basic_attack',
        name: 'Basic Attack',
        description: 'A simple attack move',
        level: 1,
        cooldown: 1000,
        lastUsed: 0,
        energyCost: 10
      },
      {
        id: 'heal',
        name: 'Heal',
        description: 'Restore some health',
        level: 1,
        cooldown: 5000,
        lastUsed: 0,
        energyCost: 20
      }
    ]

    // Add type-specific skills
    const typeSkills: Record<PetType, PetSkill[]> = {
      dog: [{
        id: 'bark',
        name: 'Bark',
        description: 'Scare away enemies',
        level: 1,
        cooldown: 3000,
        lastUsed: 0,
        energyCost: 15
      }],
      cat: [{
        id: 'stealth',
        name: 'Stealth',
        description: 'Move silently',
        level: 1,
        cooldown: 4000,
        lastUsed: 0,
        energyCost: 12
      }],
      bird: [{
        id: 'fly',
        name: 'Fly',
        description: 'Move quickly over obstacles',
        level: 1,
        cooldown: 2000,
        lastUsed: 0,
        energyCost: 18
      }],
      rabbit: [{
        id: 'jump',
        name: 'Jump',
        description: 'Leap over obstacles',
        level: 1,
        cooldown: 1500,
        lastUsed: 0,
        energyCost: 8
      }],
      dragon: [{
        id: 'fire_breath',
        name: 'Fire Breath',
        description: 'Powerful fire attack',
        level: 1,
        cooldown: 8000,
        lastUsed: 0,
        energyCost: 30
      }],
      unicorn: [{
        id: 'magic_heal',
        name: 'Magic Heal',
        description: 'Powerful healing magic',
        level: 1,
        cooldown: 10000,
        lastUsed: 0,
        energyCost: 25
      }]
    }

    return [...baseSkills, ...(typeSkills[type] || [])]
  }

  private checkLevelUp(): void {
    const experienceNeeded = this.stats.level * 150
    if (this.stats.experience >= experienceNeeded) {
      this.stats.level++
      this.stats.experience -= experienceNeeded
      this.stats.maxHealth += 15
      this.stats.maxEnergy += 10
      this.stats.health = this.stats.maxHealth
      this.stats.energy = this.stats.maxEnergy
      this.stats.maxBond += 20
    }
  }

  private cleanupOldMemories(): void {
    const maxMemories = 100
    if (this.memories.length > maxMemories) {
      this.memories = this.memories
        .sort((a, b) => b.importance - a.importance)
        .slice(0, maxMemories)
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private updateLastActive(): void {
    this.lastActive = new Date()
  }

  // Serialization
  public toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      personality: this.personality,
      stats: this.stats,
      skills: this.skills,
      memories: this.memories,
      ownerId: this.ownerId,
      createdAt: this.createdAt.toISOString(),
      lastActive: this.lastActive.toISOString()
    }
  }

  public static fromJSON(data: any): Pet {
    const pet = new Pet(data.id, data.name, data.type, data.ownerId)
    pet.personality = data.personality
    pet.stats = data.stats
    pet.skills = data.skills
    pet.memories = data.memories
    pet.createdAt = new Date(data.createdAt)
    pet.lastActive = new Date(data.lastActive)
    return pet
  }
} 
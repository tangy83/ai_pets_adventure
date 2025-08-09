export interface WorldData {
  id: string
  name: string
  description: string
  level: number
  unlocked: boolean
  background: string
  music: string
  ambientSounds: string[]
  npcs: NPCData[]
  items: ItemData[]
  puzzles: PuzzleData[]
}

export interface NPCData {
  id: string
  name: string
  type: 'quest_giver' | 'merchant' | 'trainer' | 'story'
  position: { x: number; y: number }
  dialogue: DialogueData[]
  quests: string[]
}

export interface DialogueData {
  id: string
  text: string
  choices?: string[]
  nextDialogue?: string
  questTrigger?: string
}

export interface ItemData {
  id: string
  name: string
  description: string
  type: 'collectible' | 'tool' | 'weapon' | 'consumable'
  position: { x: number; y: number }
  collectible: boolean
  value: number
}

export interface PuzzleData {
  id: string
  name: string
  description: string
  type: 'pattern' | 'logic' | 'sequence' | 'matching'
  difficulty: number
  position: { x: number; y: number }
  solved: boolean
  hints: string[]
}

export class WorldSystem {
  private static instance: WorldSystem
  private worlds: Map<string, WorldData> = new Map()
  private currentWorld: string = 'home'
  private unlockedWorlds: Set<string> = new Set(['home'])

  private constructor() {
    this.initializeWorlds()
  }

  public static getInstance(): WorldSystem {
    if (!WorldSystem.instance) {
      WorldSystem.instance = new WorldSystem()
    }
    return WorldSystem.instance
  }

  // World management
  public getWorld(worldId: string): WorldData | undefined {
    return this.worlds.get(worldId)
  }

  public getCurrentWorld(): WorldData | undefined {
    return this.worlds.get(this.currentWorld)
  }

  public getCurrentWorldId(): string {
    return this.currentWorld
  }

  public changeWorld(worldId: string): boolean {
    const world = this.worlds.get(worldId)
    if (!world || !world.unlocked) return false

    this.currentWorld = worldId
    return true
  }

  public unlockWorld(worldId: string): boolean {
    const world = this.worlds.get(worldId)
    if (!world) return false

    world.unlocked = true
    this.unlockedWorlds.add(worldId)
    return true
  }

  public getUnlockedWorlds(): WorldData[] {
    return Array.from(this.unlockedWorlds)
      .map(id => this.worlds.get(id)!)
      .filter(Boolean)
  }

  public getAvailableWorlds(level: number): WorldData[] {
    return Array.from(this.worlds.values())
      .filter(world => world.level <= level && world.unlocked)
  }

  // NPC interactions
  public getNPCsInWorld(worldId: string): NPCData[] {
    const world = this.worlds.get(worldId)
    return world?.npcs || []
  }

  public getNPC(npcId: string): NPCData | undefined {
    for (const world of this.worlds.values()) {
      const npc = world.npcs.find(n => n.id === npcId)
      if (npc) return npc
    }
    return undefined
  }

  public interactWithNPC(npcId: string, dialogueId: string): DialogueData | undefined {
    const npc = this.getNPC(npcId)
    if (!npc) return undefined

    return npc.dialogue.find(d => d.id === dialogueId)
  }

  // Item management
  public getItemsInWorld(worldId: string): ItemData[] {
    const world = this.worlds.get(worldId)
    return world?.items || []
  }

  public collectItem(worldId: string, itemId: string): ItemData | undefined {
    const world = this.worlds.get(worldId)
    if (!world) return undefined

    const item = world.items.find(i => i.id === itemId)
    if (!item || !item.collectible) return undefined

    // Remove item from world
    world.items = world.items.filter(i => i.id !== itemId)
    
    return item
  }

  // Puzzle management
  public getPuzzlesInWorld(worldId: string): PuzzleData[] {
    const world = this.worlds.get(worldId)
    return world?.puzzles || []
  }

  public solvePuzzle(worldId: string, puzzleId: string): boolean {
    const world = this.worlds.get(worldId)
    if (!world) return false

    const puzzle = world.puzzles.find(p => p.id === puzzleId)
    if (!puzzle || puzzle.solved) return false

    puzzle.solved = true
    return true
  }

  // World initialization
  private initializeWorlds(): void {
    // Home World
    this.worlds.set('home', {
      id: 'home',
      name: 'Home Base',
      description: 'Your cozy home base where you can rest, train, and plan your adventures',
      level: 1,
      unlocked: true,
      background: '/assets/images/worlds/home-background.jpg',
      music: '/assets/audio/worlds/home-theme.mp3',
      ambientSounds: ['/assets/audio/ambient/home-ambient.mp3'],
      npcs: [
        {
          id: 'elder_mentor',
          name: 'Elder Mentor',
          type: 'quest_giver',
          position: { x: 400, y: 300 },
          dialogue: [
            {
              id: 'welcome',
              text: 'Welcome, young adventurer! I am here to guide you on your journey.',
              choices: ['Tell me about this world', 'What quests do you have?', 'Goodbye'],
              nextDialogue: 'about_world'
            },
            {
              id: 'about_world',
              text: 'This is a world of magic and mystery, where you and your AI pet will solve puzzles and uncover secrets.',
              choices: ['Tell me about quests', 'How do I get started?', 'Goodbye'],
              nextDialogue: 'quests_available'
            },
            {
              id: 'quests_available',
              text: 'I have several quests for you. Start with the tutorial to learn the basics.',
              choices: ['Start tutorial', 'Show me other quests', 'Goodbye'],
              questTrigger: 'tutorial_quest'
            }
          ],
          quests: ['tutorial_quest']
        },
        {
          id: 'pet_trainer',
          name: 'Pet Trainer',
          type: 'trainer',
          position: { x: 600, y: 400 },
          dialogue: [
            {
              id: 'training_intro',
              text: 'Hello! I can help you train your pet and improve their skills.',
              choices: ['Start training', 'What skills can I learn?', 'Goodbye'],
              nextDialogue: 'training_options'
            },
            {
              id: 'training_options',
              text: 'I offer basic training, skill development, and bond strengthening exercises.',
              choices: ['Start basic training', 'Show me advanced skills', 'Goodbye'],
              nextDialogue: 'basic_training'
            }
          ],
          quests: []
        }
      ],
      items: [
        {
          id: 'training_dummy',
          name: 'Training Dummy',
          description: 'A practice target for training your combat skills',
          type: 'tool',
          position: { x: 500, y: 350 },
          collectible: false,
          value: 0
        }
      ],
      puzzles: []
    })

    // Emerald Jungle World
    this.worlds.set('emerald_jungle', {
      id: 'emerald_jungle',
      name: 'Emerald Jungle',
      description: 'A mysterious jungle filled with ancient ruins, exotic creatures, and hidden treasures',
      level: 2,
      unlocked: false,
      background: '/assets/images/worlds/jungle-background.jpg',
      music: '/assets/audio/worlds/jungle-theme.mp3',
      ambientSounds: [
        '/assets/audio/ambient/jungle-birds.mp3',
        '/assets/audio/ambient/jungle-insects.mp3',
        '/assets/audio/ambient/jungle-water.mp3'
      ],
      npcs: [
        {
          id: 'jungle_guide',
          name: 'Jungle Guide',
          type: 'quest_giver',
          position: { x: 200, y: 150 },
          dialogue: [
            {
              id: 'jungle_welcome',
              text: 'Welcome to the Emerald Jungle! Many adventurers have been lost here. Be careful!',
              choices: ['Tell me about this place', 'What dangers await?', 'Goodbye'],
              nextDialogue: 'jungle_dangers'
            },
            {
              id: 'jungle_dangers',
              text: 'The jungle is home to wild creatures, ancient traps, and mysterious puzzles. But great rewards await those who succeed.',
              choices: ['Show me the quests', 'Tell me about the temple', 'Goodbye'],
              nextDialogue: 'jungle_quests'
            }
          ],
          quests: ['jungle_exploration', 'temple_discovery']
        }
      ],
      items: [
        {
          id: 'jungle_flower',
          name: 'Jungle Flower',
          description: 'A rare flower with healing properties',
          type: 'collectible',
          position: { x: 300, y: 250 },
          collectible: true,
          value: 25
        },
        {
          id: 'ancient_key',
          name: 'Ancient Key',
          description: 'An old key that might unlock something important',
          type: 'tool',
          position: { x: 450, y: 180 },
          collectible: true,
          value: 100
        }
      ],
      puzzles: [
        {
          id: 'temple_door',
          name: 'Temple Door Puzzle',
          description: 'An ancient door with mysterious symbols that must be arranged correctly',
          type: 'pattern',
          difficulty: 3,
          position: { x: 700, y: 300 },
          solved: false,
          hints: [
            'The symbols represent the four elements',
            'Water flows, fire rises, earth is stable, air moves freely',
            'Look for patterns in the temple carvings'
          ]
        }
      ]
    })

    // Crystal Caves World (locked initially)
    this.worlds.set('crystal_caves', {
      id: 'crystal_caves',
      name: 'Crystal Caves',
      description: 'A network of caves filled with glowing crystals and ancient magic',
      level: 3,
      unlocked: false,
      background: '/assets/images/worlds/caves-background.jpg',
      music: '/assets/audio/worlds/caves-theme.mp3',
      ambientSounds: [
        '/assets/audio/ambient/crystal-hum.mp3',
        '/assets/audio/ambient/water-drip.mp3'
      ],
      npcs: [],
      items: [],
      puzzles: []
    })
  }

  // Serialization
  public toJSON(): any {
    return {
      worlds: Array.from(this.worlds.values()),
      currentWorld: this.currentWorld,
      unlockedWorlds: Array.from(this.unlockedWorlds)
    }
  }

  public static fromJSON(data: any): WorldSystem {
    const system = WorldSystem.getInstance()
    
    // Clear existing data
    system.worlds.clear()
    system.unlockedWorlds.clear()
    
    // Restore worlds
    data.worlds?.forEach((worldData: any) => {
      system.worlds.set(worldData.id, worldData)
    })
    
    // Restore current world and unlocked worlds
    system.currentWorld = data.currentWorld || 'home'
    data.unlockedWorlds?.forEach((worldId: string) => {
      system.unlockedWorlds.add(worldId)
    })
    
    return system
  }
} 
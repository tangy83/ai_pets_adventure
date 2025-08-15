import { AISystem } from '../systems/AISystem'
import { EventManager } from '../EventManager'

describe('Enhanced AISystem', () => {
  let aiSystem: AISystem
  let eventManager: EventManager

  beforeEach(() => {
    eventManager = new EventManager()
    aiSystem = new AISystem()
    aiSystem.setEventManager(eventManager)
  })

  test('should create pet behavior state with personality', () => {
    const petId = 'test_pet_001'
    const personality = ['friendly', 'curious', 'playful']
    
    aiSystem.addPetBehaviorState(petId, personality)
    const state = aiSystem.getPetBehaviorState(petId)
    
    expect(state).toBeDefined()
    expect(state?.currentMood).toBe('happy')
    expect(state?.energyLevel).toBe(100)
  })

  test('should add and manage NPCs', () => {
    const npcs = aiSystem.getNPCs()
    expect(npcs.length).toBeGreaterThan(0)
    
    const merchant = npcs.find(n => n.id === 'merchant_001')
    expect(merchant).toBeDefined()
    expect(merchant?.type).toBe('merchant')
  })
})


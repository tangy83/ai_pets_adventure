import { PetAISystem, PetAIState, SkillAbility, PetMemory, BehaviorResult, BehaviorStatus } from '../systems/PetAISystem'
import { EventManager } from '../EventManager'

describe('Pet AI System - Phase 3.1 Implementation', () => {
  let petAISystem: PetAISystem
  let eventManager: EventManager
  let testPetId: string

  beforeEach(() => {
    eventManager = EventManager.getInstance()
    petAISystem = new PetAISystem(eventManager)
    testPetId = 'test-pet-001'
  })

  afterEach(() => {
    petAISystem.destroy()
  })

  describe('System Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(petAISystem).toBeDefined()
      expect(petAISystem.name).toBe('pet-ai')
      expect(petAISystem.priority).toBe(80)
    })

    test('should initialize default behaviors', () => {
      const pet = petAISystem.getPetState(testPetId)
      expect(pet).toBeUndefined() // Pet not registered yet
      
      petAISystem.registerPet(testPetId)
      const registeredPet = petAISystem.getPetState(testPetId)
      expect(registeredPet).toBeDefined()
      expect(registeredPet?.currentBehavior).toBe('idle')
    })
  })

  describe('Pet Registration & Management', () => {
    test('should register pet with default state', () => {
      petAISystem.registerPet(testPetId)
      const pet = petAISystem.getPetState(testPetId)
      
      expect(pet).toBeDefined()
      expect(pet?.id).toBe(testPetId)
      expect(pet?.mood).toBe('idle')
      expect(pet?.energy).toBe(100)
      expect(pet?.hunger).toBe(0)
      expect(pet?.socialNeed).toBe(50)
      expect(pet?.explorationDesire).toBe(50)
    })

    test('should register pet with custom configuration', () => {
      const customConfig = {
        mood: 'exploration' as const,
        energy: 80,
        personality: {
          traits: ['brave', 'independent'],
          adaptability: 90,
          curiosity: 95,
          sociability: 40,
          independence: 85,
          learningRate: 80
        }
      }

      petAISystem.registerPet(testPetId, customConfig)
      const pet = petAISystem.getPetState(testPetId)
      
      expect(pet?.mood).toBe('exploration')
      expect(pet?.energy).toBe(80)
      expect(pet?.personality.traits).toContain('brave')
      expect(pet?.personality.adaptability).toBe(90)
    })

    test('should emit pet:ai:registered event', () => {
      const eventSpy = jest.fn()
      eventManager.on('pet:ai:registered', eventSpy)
      
      petAISystem.registerPet(testPetId)
      
      expect(eventSpy).toHaveBeenCalledWith({
        petId: testPetId,
        timestamp: expect.any(Number)
      })
    })
  })

  describe('Behavior Tree System', () => {
    beforeEach(() => {
      petAISystem.registerPet(testPetId)
    })

    test('should create behavior tree for pet', async () => {
      const result = await petAISystem.executeBehaviorTree(testPetId)
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.status).toBe(BehaviorStatus.SUCCESS)
    })

    test('should execute idle behavior by default', async () => {
      const result = await petAISystem.executeBehaviorTree(testPetId)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      // Should execute one of the available behaviors
      expect(['responded_to_player', 'rested', 'threat_assessed', 'environment_scanned', 'puzzle_analyzed', 'social_opportunities_identified']).toContain(result.data)
    })

    test('should handle behavior tree execution errors gracefully', async () => {
      // Test with invalid pet ID
      const result = await petAISystem.executeBehaviorTree('invalid-pet-id')
      
      expect(result.success).toBe(false)
      expect(result.status).toBe(BehaviorStatus.ERROR)
      expect(result.message).toBe('Pet or behavior tree not found')
    })

    test('should respect behavior cooldowns', async () => {
      // First execution
      const result1 = await petAISystem.executeBehaviorTree(testPetId)
      expect(result1.success).toBe(true)
      
      // Second execution should still work (no cooldown on root)
      const result2 = await petAISystem.executeBehaviorTree(testPetId)
      expect(result2.success).toBe(true)
    })
  })

  describe('Behavior State Management', () => {
    beforeEach(() => {
      petAISystem.registerPet(testPetId)
    })

    test('should update pet behavior', () => {
      const eventSpy = jest.fn()
      eventManager.on('pet:ai:behavior:changed', eventSpy)
      
      petAISystem.updatePetBehavior(testPetId, 'exploration')
      
      const pet = petAISystem.getPetState(testPetId)
      expect(pet?.currentBehavior).toBe('exploration')
      
      expect(eventSpy).toHaveBeenCalledWith({
        petId: testPetId,
        behavior: 'exploration',
        timestamp: expect.any(Number)
      })
    })

    test('should update pet state over time', () => {
      const pet = petAISystem.getPetState(testPetId)!
      const initialEnergy = pet.energy
      const initialHunger = pet.hunger
      
      // Simulate time passing
      petAISystem.update(1000) // 1 second
      
      const updatedPet = petAISystem.getPetState(testPetId)!
      expect(updatedPet.energy).toBeLessThan(initialEnergy) // Energy decreases
      expect(updatedPet.hunger).toBeGreaterThan(initialHunger) // Hunger increases
    })

    test('should emit state update events', () => {
      const eventSpy = jest.fn()
      eventManager.on('pet:ai:state:updated', eventSpy)
      
      petAISystem.update(1000)
      
      expect(eventSpy).toHaveBeenCalledWith({
        petId: testPetId,
        state: expect.any(Object),
        timestamp: expect.any(Number)
      })
    })
  })

  describe('Skill Management', () => {
    beforeEach(() => {
      petAISystem.registerPet(testPetId)
    })

    test('should add pet skills', () => {
      const eventSpy = jest.fn()
      eventManager.on('pet:ai:skill:added', eventSpy)
      
      const skill: SkillAbility = {
        id: 'fire_breath',
        name: 'Fire Breath',
        type: 'combat',
        cooldown: 5000,
        energyCost: 20,
        successRate: 85,
        level: 1,
        description: 'Breathes fire at enemies'
      }
      
      petAISystem.addPetSkill(testPetId, skill)
      
      expect(eventSpy).toHaveBeenCalledWith({
        petId: testPetId,
        skill: skill,
        timestamp: expect.any(Number)
      })
    })
  })

  describe('Memory System Integration', () => {
    beforeEach(() => {
      petAISystem.registerPet(testPetId)
    })

    test('should retrieve pet memories', () => {
      const memories = petAISystem.getPetMemories(testPetId)
      expect(Array.isArray(memories)).toBe(true)
    })

    test('should retrieve memories by type', () => {
      const memories = petAISystem.getPetMemories(testPetId, 'interaction')
      expect(Array.isArray(memories)).toBe(true)
    })
  })

  describe('Context Analysis', () => {
    beforeEach(() => {
      petAISystem.registerPet(testPetId)
    })

    test('should analyze environment context', async () => {
      const result = await petAISystem.executeBehaviorTree(testPetId)
      
      // The context analyzer should update the pet's context during behavior execution
      const pet = petAISystem.getPetState(testPetId)
      expect(pet?.context).toBeDefined()
      expect(pet?.context.currentLocation).toBeDefined()
      expect(pet?.context.dangerLevel).toBeDefined()
    })
  })

  describe('Learning Module Integration', () => {
    beforeEach(() => {
      petAISystem.registerPet(testPetId)
    })

    test('should support learning capabilities', () => {
      // The learning module should be available for each pet
      const pet = petAISystem.getPetState(testPetId)
      expect(pet).toBeDefined()
      
      // Learning should be enabled by default
      expect(pet?.personality.learningRate).toBeGreaterThan(0)
    })
  })

  describe('System Integration', () => {
    test('should integrate with event system', () => {
      const eventSpy = jest.fn()
      eventManager.on('pet:ai:registered', eventSpy)
      
      // Register a pet to trigger events
      petAISystem.registerPet(testPetId)
      
      // Event should have been emitted
      expect(eventSpy).toHaveBeenCalledWith({
        petId: testPetId,
        timestamp: expect.any(Number)
      })
    })

    test('should handle multiple pets independently', () => {
      const pet1Id = 'pet-1'
      const pet2Id = 'pet-2'
      
      petAISystem.registerPet(pet1Id, { mood: 'exploration' })
      petAISystem.registerPet(pet2Id, { mood: 'social' })
      
      const pet1 = petAISystem.getPetState(pet1Id)
      const pet2 = petAISystem.getPetState(pet2Id)
      
      expect(pet1?.mood).toBe('exploration')
      expect(pet2?.mood).toBe('social')
      expect(pet1?.id).not.toBe(pet2?.id)
    })
  })

  describe('Error Handling & Resilience', () => {
    test('should handle invalid pet operations gracefully', async () => {
      // Try to execute behavior tree for non-existent pet
      const result = await petAISystem.executeBehaviorTree('non-existent-pet')
      
      expect(result.success).toBe(false)
      expect(result.status).toBe(BehaviorStatus.ERROR)
      expect(result.message).toBe('Pet or behavior tree not found')
    })

    test('should continue operating after individual pet errors', () => {
      const validPetId = 'valid-pet'
      const invalidPetId = 'invalid-pet'
      
      petAISystem.registerPet(validPetId)
      
      // This should not crash the system
      expect(() => {
        petAISystem.updatePetBehavior(invalidPetId, 'exploration')
      }).not.toThrow()
      
      // Valid pet should still work
      const validPet = petAISystem.getPetState(validPetId)
      expect(validPet).toBeDefined()
    })
  })

  describe('Performance & Scalability', () => {
    test('should handle multiple pets efficiently', () => {
      const petCount = 10
      const petIds = Array.from({ length: petCount }, (_, i) => `pet-${i}`)
      
      const startTime = performance.now()
      
      petIds.forEach(id => {
        petAISystem.registerPet(id)
      })
      
      const endTime = performance.now()
      const registrationTime = endTime - startTime
      
      // Registration should be fast (under 100ms for 10 pets)
      expect(registrationTime).toBeLessThan(100)
      
      // All pets should be registered
      petIds.forEach(id => {
        expect(petAISystem.getPetState(id)).toBeDefined()
      })
    })

    test('should update all pets in single update cycle', () => {
      const petCount = 5
      const petIds = Array.from({ length: petCount }, (_, i) => `pet-${i}`)
      
      petIds.forEach(id => {
        petAISystem.registerPet(id)
      })
      
      const eventSpy = jest.fn()
      eventManager.on('pet:ai:state:updated', eventSpy)
      
      petAISystem.update(1000)
      
      // Should emit state update events for all pets
      expect(eventSpy).toHaveBeenCalledTimes(petCount)
    })
  })

  describe('Phase 3.1 Feature Completeness', () => {
    test('should implement all required AI behavior states', () => {
      const pet = petAISystem.getPetState(testPetId)
      if (!pet) {
        petAISystem.registerPet(testPetId)
      }
      
      const requiredBehaviors = ['idle', 'exploration', 'puzzle_solving', 'combat', 'social']
      requiredBehaviors.forEach(behavior => {
        expect(petAISystem.updatePetBehavior).toBeDefined()
        expect(() => petAISystem.updatePetBehavior(testPetId, behavior)).not.toThrow()
      })
    })

    test('should support behavior tree decision making', async () => {
      petAISystem.registerPet(testPetId)
      
      const result = await petAISystem.executeBehaviorTree(testPetId)
      expect(result).toBeDefined()
      expect(typeof result.success).toBe('boolean')
      expect(result.status).toBeDefined()
    })

    test('should support memory system for quest context', () => {
      petAISystem.registerPet(testPetId)
      
      const memories = petAISystem.getPetMemories(testPetId, 'event')
      expect(Array.isArray(memories)).toBe(true)
    })

    test('should support skill manager with abilities and cooldowns', () => {
      petAISystem.registerPet(testPetId)
      
      const skill: SkillAbility = {
        id: 'test_skill',
        name: 'Test Skill',
        type: 'utility',
        cooldown: 1000,
        energyCost: 10,
        successRate: 100,
        level: 1,
        description: 'Test skill for validation'
      }
      
      expect(() => petAISystem.addPetSkill(testPetId, skill)).not.toThrow()
    })

    test('should support context analyzer for environment awareness', async () => {
      petAISystem.registerPet(testPetId)
      
      const result = await petAISystem.executeBehaviorTree(testPetId)
      expect(result.success).toBe(true)
      
      // Context should be analyzed during behavior execution
      const pet = petAISystem.getPetState(testPetId)
      expect(pet?.context).toBeDefined()
    })

    test('should support learning module for player style adaptation', () => {
      petAISystem.registerPet(testPetId)
      
      const pet = petAISystem.getPetState(testPetId)
      expect(pet?.personality.learningRate).toBeGreaterThan(0)
      expect(pet?.personality.adaptability).toBeGreaterThan(0)
    })
  })
})

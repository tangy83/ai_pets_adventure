import {
  InventoryComponent,
  SkillComponent,
  AnimationComponent,
  InteractionComponent
} from '../EntityComponentSystem'

describe('New ECS Components', () => {
  describe('InventoryComponent', () => {
    let inventory: InventoryComponent

    beforeEach(() => {
      inventory = new InventoryComponent('test_entity', 20, 100)
    })

    it('should initialize with correct default values', () => {
      expect(inventory.entityId).toBe('test_entity')
      expect(inventory.maxCapacity).toBe(20)
      expect(inventory.maxWeight).toBe(100)
      expect(inventory.weight).toBe(0)
      expect(inventory.items.size).toBe(0)
    })

    it('should add items successfully', () => {
      expect(inventory.addItem('sword', 1)).toBe(true)
      expect(inventory.getItemCount('sword')).toBe(1)
      expect(inventory.getTotalItems()).toBe(1)
    })

    it('should add multiple quantities of the same item', () => {
      expect(inventory.addItem('arrow', 5)).toBe(true)
      expect(inventory.getItemCount('arrow')).toBe(5)
      expect(inventory.getTotalItems()).toBe(5)
    })

    it('should prevent adding items when inventory is full', () => {
      // Fill inventory with different items
      for (let i = 0; i < 20; i++) {
        inventory.addItem(`item_${i}`, 1)
      }
      
      expect(inventory.addItem('new_item', 1)).toBe(false)
      expect(inventory.getItemCount('new_item')).toBe(0)
    })

    it('should allow adding to existing items when inventory is full', () => {
      // Fill inventory with different items
      for (let i = 0; i < 20; i++) {
        inventory.addItem(`item_${i}`, 1)
      }
      
      // Add to existing item
      expect(inventory.addItem('item_0', 1)).toBe(true)
      expect(inventory.getItemCount('item_0')).toBe(2)
    })

    it('should remove items successfully', () => {
      inventory.addItem('sword', 3)
      expect(inventory.removeItem('sword', 2)).toBe(true)
      expect(inventory.getItemCount('sword')).toBe(1)
      expect(inventory.getTotalItems()).toBe(1)
    })

    it('should remove items completely when quantity matches', () => {
      inventory.addItem('sword', 1)
      expect(inventory.removeItem('sword', 1)).toBe(true)
      expect(inventory.hasItem('sword')).toBe(false)
      expect(inventory.getTotalItems()).toBe(0)
    })

    it('should prevent removing more items than available', () => {
      inventory.addItem('sword', 2)
      expect(inventory.removeItem('sword', 3)).toBe(false)
      expect(inventory.getItemCount('sword')).toBe(2)
    })

    it('should check if items exist', () => {
      expect(inventory.hasItem('sword')).toBe(false)
      inventory.addItem('sword', 1)
      expect(inventory.hasItem('sword')).toBe(true)
      expect(inventory.hasItem('sword', 2)).toBe(false)
    })
  })

  describe('SkillComponent', () => {
    let skills: SkillComponent

    beforeEach(() => {
      skills = new SkillComponent('test_entity', 100)
    })

    it('should initialize with correct default values', () => {
      expect(skills.entityId).toBe('test_entity')
      expect(skills.maxSkillPoints).toBe(100)
      expect(skills.skillPoints).toBe(100)
      expect(skills.skills.size).toBe(0)
    })

    it('should add skills successfully', () => {
      expect(skills.addSkill('fireball', 1, 10)).toBe(true)
      expect(skills.getSkillLevel('fireball')).toBe(1)
    })

    it('should prevent adding duplicate skills', () => {
      skills.addSkill('fireball', 1, 10)
      expect(skills.addSkill('fireball', 2, 10)).toBe(false)
    })

    it('should level up skills successfully', () => {
      skills.addSkill('fireball', 1, 10)
      expect(skills.levelUpSkill('fireball')).toBe(true)
      expect(skills.getSkillLevel('fireball')).toBe(2)
    })

    it('should prevent leveling up beyond max level', () => {
      skills.addSkill('fireball', 10, 10)
      expect(skills.levelUpSkill('fireball')).toBe(false)
      expect(skills.getSkillLevel('fireball')).toBe(10)
    })

    it('should use skills successfully', () => {
      skills.addSkill('fireball', 1, 10)
      expect(skills.useSkill('fireball')).toBe(true)
    })

    it('should prevent using non-existent skills', () => {
      expect(skills.useSkill('nonexistent')).toBe(false)
    })

    it('should return correct skill levels', () => {
      expect(skills.getSkillLevel('nonexistent')).toBe(0)
      skills.addSkill('fireball', 5, 10)
      expect(skills.getSkillLevel('fireball')).toBe(5)
    })
  })

  describe('AnimationComponent', () => {
    let animation: AnimationComponent

    beforeEach(() => {
      animation = new AnimationComponent('test_entity', 12)
    })

    it('should initialize with correct default values', () => {
      expect(animation.entityId).toBe('test_entity')
      expect(animation.frameRate).toBe(12)
      expect(animation.currentAnimation).toBeNull()
      expect(animation.isPlaying).toBe(false)
      expect(animation.isLooping).toBe(true)
      expect(animation.currentFrame).toBe(0)
    })

    it('should add animations successfully', () => {
      animation.addAnimation('walk', ['frame1', 'frame2', 'frame3'], 1000, true)
      expect(animation.animations.has('walk')).toBe(true)
      expect(animation.animations.get('walk')?.frameCount).toBe(3)
    })

    it('should play animations successfully', () => {
      animation.addAnimation('walk', ['frame1', 'frame2'], 1000, true)
      expect(animation.playAnimation('walk')).toBe(true)
      expect(animation.currentAnimation).toBe('walk')
      expect(animation.isPlaying).toBe(true)
    })

    it('should prevent playing non-existent animations', () => {
      expect(animation.playAnimation('nonexistent')).toBe(false)
      expect(animation.currentAnimation).toBeNull()
      expect(animation.isPlaying).toBe(false)
    })

    it('should stop animations correctly', () => {
      animation.addAnimation('walk', ['frame1', 'frame2'], 1000, true)
      animation.playAnimation('walk')
      animation.stopAnimation()
      expect(animation.isPlaying).toBe(false)
      expect(animation.currentFrame).toBe(0)
    })

    it('should pause and resume animations', () => {
      animation.addAnimation('walk', ['frame1', 'frame2'], 1000, true)
      animation.playAnimation('walk')
      animation.pauseAnimation()
      expect(animation.isPlaying).toBe(false)
      animation.resumeAnimation()
      expect(animation.isPlaying).toBe(true)
    })

    it('should get current frame correctly', () => {
      animation.addAnimation('walk', ['frame1', 'frame2'], 1000, true)
      animation.playAnimation('walk')
      expect(animation.getCurrentFrame()).toBe('frame1')
    })

    it('should return null for current frame when no animation is playing', () => {
      expect(animation.getCurrentFrame()).toBeNull()
    })

    it('should update animation frames correctly', () => {
      animation.addAnimation('walk', ['frame1', 'frame2'], 1000, true)
      animation.playAnimation('walk')
      
      // Simulate frame time (1000ms / 12fps = ~83.33ms per frame)
      animation.update(100) // More than frame time
      expect(animation.currentFrame).toBe(1)
    })

    it('should loop animations when enabled', () => {
      animation.addAnimation('walk', ['frame1', 'frame2'], 1000, true)
      animation.playAnimation('walk')
      animation.currentFrame = 1 // Set to last frame
      
      animation.update(100) // Trigger frame change
      expect(animation.currentFrame).toBe(0) // Should loop back
    })

    it('should stop non-looping animations when complete', () => {
      animation.addAnimation('attack', ['frame1', 'frame2'], 1000, false)
      animation.playAnimation('attack')
      
      // Progress through the animation frames naturally
      animation.update(500) // Move to middle
      animation.update(500) // Move to end, should trigger stop
      
      expect(animation.isPlaying).toBe(false) // Should stop
    })
  })

  describe('InteractionComponent', () => {
    let interaction: InteractionComponent

    beforeEach(() => {
      interaction = new InteractionComponent('test_entity', 'basic', 50)
    })

    it('should initialize with correct default values', () => {
      expect(interaction.entityId).toBe('test_entity')
      expect(interaction.interactable).toBe(true)
      expect(interaction.interactionRange).toBe(50)
      expect(interaction.interactionType).toBe('basic')
      expect(interaction.cooldown).toBe(1000)
      expect(interaction.lastInteraction).toBe(0)
    })

    it('should allow interaction when conditions are met', () => {
      expect(interaction.canInteract()).toBe(true)
    })

    it('should prevent interaction when not interactable', () => {
      interaction.setInteractable(false)
      expect(interaction.canInteract()).toBe(false)
    })

    it('should prevent interaction during cooldown', () => {
      interaction.interact('player1')
      expect(interaction.canInteract()).toBe(false)
    })

    it('should allow interaction after cooldown expires', () => {
      interaction.interact('player1')
      
      // Simulate time passing (more than cooldown)
      const originalTime = Date.now
      Date.now = jest.fn(() => originalTime() + 2000)
      
      expect(interaction.canInteract()).toBe(true)
      
      // Restore original Date.now
      Date.now = originalTime
    })

    it('should perform interactions successfully', () => {
      const result = interaction.interact('player1', { action: 'greet' })
      expect(result).toBe(true)
      expect(interaction.getInteractionData('lastInteractor')).toBe('player1')
      expect(interaction.getInteractionData('lastInteractionData')).toEqual({ action: 'greet' })
    })

    it('should prevent interaction during cooldown', () => {
      interaction.interact('player1')
      const result = interaction.interact('player2')
      expect(result).toBe(false)
    })

    it('should set and get interaction data', () => {
      interaction.setInteractionData('customKey', 'customValue')
      expect(interaction.getInteractionData('customKey')).toBe('customValue')
    })

    it('should update interaction properties', () => {
      interaction.setInteractionRange(100)
      interaction.setCooldown(2000)
      
      expect(interaction.interactionRange).toBe(100)
      expect(interaction.cooldown).toBe(2000)
    })

    it('should handle multiple interactions with different data', () => {
      interaction.interact('player1', { action: 'greet' })
      
      // Second interaction should fail due to cooldown, so data should remain from first
      const result = interaction.interact('player2', { action: 'attack' })
      expect(result).toBe(false) // Should fail due to cooldown
      
      // Data should remain from the first (successful) interaction
      expect(interaction.getInteractionData('lastInteractor')).toBe('player1')
      expect(interaction.getInteractionData('lastInteractionData')).toEqual({ action: 'greet' })
    })
  })
}) 
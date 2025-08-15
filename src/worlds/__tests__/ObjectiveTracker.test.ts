import { ObjectiveTracker } from '../ObjectiveTracker'
import { QuestManager } from '../QuestManager'
import { QuestObjective } from '../QuestManager'

describe('ObjectiveTracker', () => {
  let objectiveTracker: ObjectiveTracker
  let questManager: QuestManager

  beforeEach(() => {
    objectiveTracker = ObjectiveTracker.getInstance()
    questManager = QuestManager.getInstance()
  })

  afterEach(() => {
    // Reset the singleton instance for clean tests
    ;(ObjectiveTracker as any).instance = undefined
    ;(QuestManager as any).instance = undefined
  })

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(objectiveTracker).toBeDefined()
      expect(typeof objectiveTracker.initialize).toBe('function')
    })

    it('should have default configuration', () => {
      const config = objectiveTracker['config']
      expect(config.enableMilestones).toBe(true)
      expect(config.enableHints).toBe(true)
      expect(config.enableLocationTracking).toBe(true)
      expect(config.enableProgressHistory).toBe(true)
    })
  })

  describe('Objective Tracking', () => {
    const mockObjective: QuestObjective = {
      id: 'test_objective',
      type: 'collect',
      description: 'Collect test items',
      target: 'test_item',
      count: 5,
      current: 0,
      isCompleted: false,
      isOptional: false,
      hints: ['Look in the test area', 'Use your pet\'s senses'],
      location: { x: 100, y: 200, z: 0 },
      reward: {
        experience: 100,
        coins: 50,
        items: ['test_reward'],
        skills: ['test_skill'],
        petBond: 25,
        unlockables: []
      }
    }

    it('should start tracking an objective', () => {
      objectiveTracker.startTrackingObjective('test_objective', 'test_quest', 'player1', mockObjective)
      
      const progress = objectiveTracker.getObjectiveProgress('test_objective', 'test_quest', 'player1')
      expect(progress).toBeDefined()
      expect(progress?.objectiveId).toBe('test_objective')
      expect(progress?.questId).toBe('test_quest')
      expect(progress?.current).toBe(0)
      expect(progress?.target).toBe(5)
      expect(progress?.percentage).toBe(0)
      expect(progress?.isCompleted).toBe(false)
    })

    it('should not track the same objective twice', () => {
      objectiveTracker.startTrackingObjective('test_objective', 'test_quest', 'player1', mockObjective)
      objectiveTracker.startTrackingObjective('test_objective', 'test_quest', 'player1', mockObjective)
      
      const playerObjectives = objectiveTracker.getPlayerObjectives('player1')
      expect(playerObjectives.length).toBe(1)
    })

    it('should track location if provided', () => {
      objectiveTracker.startTrackingObjective('test_objective', 'test_quest', 'player1', mockObjective)
      
      const progress = objectiveTracker.getObjectiveProgress('test_objective', 'test_quest', 'player1')
      expect(progress?.location).toEqual({ x: 100, y: 200, z: 0 })
    })
  })

  describe('Progress Updates', () => {
    const mockObjective: QuestObjective = {
      id: 'progress_test',
      type: 'collect',
      description: 'Collect progress items',
      target: 'progress_item',
      count: 10,
      current: 0,
      isCompleted: false,
      isOptional: false,
      hints: ['Progress hint'],
      reward: {
        experience: 200,
        coins: 100,
        items: [],
        skills: [],
        petBond: 50,
        unlockables: []
      }
    }

    beforeEach(() => {
      objectiveTracker.startTrackingObjective('progress_test', 'progress_quest', 'player1', mockObjective)
    })

    it('should update objective progress', () => {
      const success = objectiveTracker.updateObjectiveProgress('progress_test', 'progress_quest', 'player1', 3)
      expect(success).toBe(true)
      
      const progress = objectiveTracker.getObjectiveProgress('progress_test', 'progress_quest', 'player1')
      expect(progress?.current).toBe(3)
      expect(progress?.percentage).toBe(30)
      expect(progress?.isCompleted).toBe(false)
    })

    it('should not exceed target count', () => {
      objectiveTracker.updateObjectiveProgress('progress_test', 'progress_quest', 'player1', 15)
      
      const progress = objectiveTracker.getObjectiveProgress('progress_test', 'progress_quest', 'player1')
      expect(progress?.current).toBe(10)
      expect(progress?.percentage).toBe(100)
    })

    it('should mark objective as completed when target is reached', () => {
      objectiveTracker.updateObjectiveProgress('progress_test', 'progress_quest', 'player1', 10)
      
      const progress = objectiveTracker.getObjectiveProgress('progress_test', 'progress_quest', 'player1')
      expect(progress?.isCompleted).toBe(true)
      expect(progress?.timeCompleted).toBeDefined()
    })

    it('should track attempts when specified', () => {
      objectiveTracker.updateObjectiveProgress('progress_test', 'progress_quest', 'player1', 3, { attempt: true })
      objectiveTracker.updateObjectiveProgress('progress_test', 'progress_quest', 'player1', 5, { attempt: true })
      
      const progress = objectiveTracker.getObjectiveProgress('progress_test', 'progress_quest', 'player1')
      expect(progress?.attempts).toBe(2)
    })

    it('should update location when provided', () => {
      const newLocation = { x: 150, y: 250, z: 10 }
      objectiveTracker.updateObjectiveProgress('progress_test', 'progress_quest', 'player1', 3, { location: newLocation })
      
      const progress = objectiveTracker.getObjectiveProgress('progress_test', 'progress_quest', 'player1')
      expect(progress?.location).toEqual(newLocation)
    })
  })

  describe('Milestones', () => {
    const mockObjective: QuestObjective = {
      id: 'milestone_test',
      type: 'collect',
      description: 'Test milestones',
      target: 'milestone_item',
      count: 100,
      current: 0,
      isCompleted: false,
      isOptional: false,
      hints: [],
      reward: {
        experience: 1000,
        coins: 500,
        items: [],
        skills: [],
        petBond: 100,
        unlockables: []
      }
    }

    beforeEach(() => {
      objectiveTracker.startTrackingObjective('milestone_test', 'milestone_quest', 'player1', mockObjective)
    })

    it('should generate milestones at 25%, 50%, and 75%', () => {
      const progress = objectiveTracker.getObjectiveProgress('milestone_test', 'milestone_quest', 'player1')
      expect(progress?.milestones.length).toBe(3)
      expect(progress?.milestones[0].percentage).toBe(25)
      expect(progress?.milestones[1].percentage).toBe(50)
      expect(progress?.milestones[2].percentage).toBe(75)
    })

    it('should mark milestones as reached when progress is made', () => {
      // Reach 25% milestone
      objectiveTracker.updateObjectiveProgress('milestone_test', 'milestone_quest', 'player1', 25)
      let progress = objectiveTracker.getObjectiveProgress('milestone_test', 'milestone_quest', 'player1')
      expect(progress?.milestones[0].isReached).toBe(true)
      expect(progress?.milestones[1].isReached).toBe(false)

      // Reach 50% milestone
      objectiveTracker.updateObjectiveProgress('milestone_test', 'milestone_quest', 'player1', 50)
      progress = objectiveTracker.getObjectiveProgress('milestone_test', 'milestone_quest', 'player1')
      expect(progress?.milestones[1].isReached).toBe(true)
      expect(progress?.milestones[2].isReached).toBe(false)
    })

    it('should provide milestone rewards', () => {
      const progress = objectiveTracker.getObjectiveProgress('milestone_test', 'milestone_quest', 'player1')
      const milestone25 = progress?.milestones[0]
      
      expect(milestone25?.reward).toBeDefined()
      expect(milestone25?.reward?.experience).toBe(250) // 25% of 1000
      expect(milestone25?.reward?.coins).toBe(125) // 25% of 500
      expect(milestone25?.reward?.petBond).toBe(25) // 25% of 100
    })
  })

  describe('Hints', () => {
    const mockObjective: QuestObjective = {
      id: 'hint_test',
      type: 'collect',
      description: 'Test hints',
      target: 'hint_item',
      count: 100,
      current: 0,
      isCompleted: false,
      isOptional: false,
      hints: ['First hint', 'Second hint', 'Third hint', 'Final hint'],
      reward: {
        experience: 100,
        coins: 50,
        items: [],
        skills: [],
        petBond: 25,
        unlockables: []
      }
    }

    beforeEach(() => {
      objectiveTracker.startTrackingObjective('hint_test', 'hint_quest', 'player1', mockObjective)
    })

    it('should provide hints based on progress', () => {
      // 0% progress - first hint
      let hint = objectiveTracker.getObjectiveHint('hint_test', 'hint_quest', 'player1')
      expect(hint).toBe('First hint')

      // 25% progress - second hint
      objectiveTracker.updateObjectiveProgress('hint_test', 'hint_quest', 'player1', 25)
      hint = objectiveTracker.getObjectiveHint('hint_test', 'hint_quest', 'player1')
      expect(hint).toBe('Second hint')

      // 50% progress - third hint
      objectiveTracker.updateObjectiveProgress('hint_test', 'hint_quest', 'player1', 50)
      hint = objectiveTracker.getObjectiveHint('hint_test', 'hint_quest', 'player1')
      expect(hint).toBe('Third hint')

      // 75% progress - final hint
      objectiveTracker.updateObjectiveProgress('hint_test', 'hint_quest', 'player1', 75)
      hint = objectiveTracker.getObjectiveHint('hint_test', 'hint_quest', 'player1')
      expect(hint).toBe('Final hint')
    })

    it('should return null if no hints available', () => {
      const mockObjectiveNoHints: QuestObjective = {
        ...mockObjective,
        hints: []
      }
      
      objectiveTracker.startTrackingObjective('no_hint_test', 'no_hint_quest', 'player1', mockObjectiveNoHints)
      const hint = objectiveTracker.getObjectiveHint('no_hint_test', 'no_hint_quest', 'player1')
      expect(hint).toBeNull()
    })
  })

  describe('Progress History', () => {
    const mockObjective: QuestObjective = {
      id: 'history_test',
      type: 'collect',
      description: 'Test history',
      target: 'history_item',
      count: 10,
      current: 0,
      isCompleted: false,
      isOptional: false,
      hints: [],
      reward: {
        experience: 100,
        coins: 50,
        items: [],
        skills: [],
        petBond: 25,
        unlockables: []
      }
    }

    beforeEach(() => {
      objectiveTracker.startTrackingObjective('history_test', 'history_quest', 'player1', mockObjective)
    })

    it('should track progress history', () => {
      objectiveTracker.updateObjectiveProgress('history_test', 'history_quest', 'player1', 3)
      objectiveTracker.updateObjectiveProgress('history_test', 'history_quest', 'player1', 6)
      objectiveTracker.updateObjectiveProgress('history_test', 'history_quest', 'player1', 9)
      
      const history = objectiveTracker.getObjectiveHistory('history_test', 'history_quest', 'player1')
      expect(history.length).toBeGreaterThan(1)
      
      // Check that history shows progression
      const progressValues = history.map(h => h.current)
      expect(progressValues).toContain(3)
      expect(progressValues).toContain(6)
      expect(progressValues).toContain(9)
    })
  })

  describe('Statistics', () => {
    const mockObjective1: QuestObjective = {
      id: 'stat_test_1',
      type: 'collect',
      description: 'Statistics test 1',
      target: 'stat_item_1',
      count: 5,
      current: 0,
      isCompleted: false,
      isOptional: false,
      hints: [],
      reward: { experience: 100, coins: 50, items: [], skills: [], petBond: 25, unlockables: [] }
    }

    const mockObjective2: QuestObjective = {
      id: 'stat_test_2',
      type: 'explore',
      description: 'Statistics test 2',
      target: 'stat_area_2',
      count: 1,
      current: 0,
      isCompleted: false,
      isOptional: false,
      hints: [],
      reward: { experience: 200, coins: 100, items: [], skills: [], petBond: 50, unlockables: [] }
    }

    beforeEach(() => {
      objectiveTracker.startTrackingObjective('stat_test_1', 'stat_quest', 'player1', mockObjective1)
      objectiveTracker.startTrackingObjective('stat_test_2', 'stat_quest', 'player1', mockObjective2)
    })

    it('should provide accurate statistics', () => {
      let stats = objectiveTracker.getObjectiveStatistics('player1')
      expect(stats.totalObjectives).toBe(2)
      expect(stats.completedObjectives).toBe(0)
      expect(stats.activeObjectives).toBe(2)

      // Complete first objective
      objectiveTracker.updateObjectiveProgress('stat_test_1', 'stat_quest', 'player1', 5)
      
      stats = objectiveTracker.getObjectiveStatistics('player1')
      expect(stats.totalObjectives).toBe(2)
      expect(stats.completedObjectives).toBe(1)
      expect(stats.activeObjectives).toBe(1)
    })

    it('should track objectives by quest', () => {
      const stats = objectiveTracker.getObjectiveStatistics('player1')
      expect(stats.objectivesByQuest.get('stat_quest')).toBe(2)
    })
  })

  describe('Configuration', () => {
    it('should allow configuration updates', () => {
      objectiveTracker.configure({
        enableMilestones: false,
        updateInterval: 2000
      })

      const config = objectiveTracker['config']
      expect(config.enableMilestones).toBe(false)
      expect(config.updateInterval).toBe(2000)
    })
  })

  describe('Data Export/Import', () => {
    const mockObjective: QuestObjective = {
      id: 'export_test',
      type: 'collect',
      description: 'Export test',
      target: 'export_item',
      count: 5,
      current: 0,
      isCompleted: false,
      isOptional: false,
      hints: [],
      reward: { experience: 100, coins: 50, items: [], skills: [], petBond: 25, unlockables: [] }
    }

    it('should export player data', () => {
      objectiveTracker.startTrackingObjective('export_test', 'export_quest', 'player1', mockObjective)
      objectiveTracker.updateObjectiveProgress('export_test', 'export_quest', 'player1', 3)
      
      const exportedData = objectiveTracker.exportPlayerData('player1')
      expect(exportedData.objectives.length).toBe(1)
      expect(exportedData.statistics.totalObjectives).toBe(1)
    })

    it('should import player data', () => {
      const testData = {
        objectives: [{
          objectiveId: 'import_test',
          questId: 'import_quest',
          current: 2,
          target: 5,
          percentage: 40,
          isCompleted: false,
          timeStarted: Date.now(),
          timeSpent: 1000,
          attempts: 1,
          lastUpdate: Date.now(),
          milestones: [],
          hints: []
        }]
      }

      objectiveTracker.importPlayerData('player1', testData)
      const progress = objectiveTracker.getObjectiveProgress('import_test', 'import_quest', 'player1')
      expect(progress).toBeDefined()
      expect(progress?.current).toBe(2)
      expect(progress?.percentage).toBe(40)
    })
  })

  describe('Cleanup', () => {
    it('should clean up completed objectives', () => {
      const mockObjective: QuestObjective = {
        id: 'cleanup_test',
        type: 'collect',
        description: 'Cleanup test',
        target: 'cleanup_item',
        count: 1,
        current: 0,
        isCompleted: false,
        isOptional: false,
        hints: [],
        reward: { experience: 100, coins: 50, items: [], skills: [], petBond: 25, unlockables: [] }
      }

      objectiveTracker.startTrackingObjective('cleanup_test', 'cleanup_quest', 'player1', mockObjective)
      objectiveTracker.updateObjectiveProgress('cleanup_test', 'cleanup_quest', 'player1', 1)
      
      // Force completion time to be old
      const progress = objectiveTracker.getObjectiveProgress('cleanup_test', 'cleanup_quest', 'player1')
      if (progress) {
        progress.timeCompleted = Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      }
      
      objectiveTracker.cleanupCompletedObjectives('player1', 24 * 60 * 60 * 1000) // 24 hours
      
      const remainingProgress = objectiveTracker.getObjectiveProgress('cleanup_test', 'cleanup_quest', 'player1')
      expect(remainingProgress).toBeUndefined()
    })
  })
})




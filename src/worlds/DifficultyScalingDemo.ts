import { DifficultyScalingSystem } from './DifficultyScalingSystem'
import { QuestSystem } from './QuestSystem'
import { EventManager } from '../core/EventManager'

/**
 * Demo showcasing the AI-based Difficulty Scaling System
 * This demonstrates how quest difficulty automatically adjusts based on:
 * - Player performance metrics
 * - Pet AI behavior and intelligence
 * - Learning patterns and skill improvement
 * - World complexity and progression
 */
export class DifficultyScalingDemo {
  private eventManager: EventManager
  private difficultyScaling: DifficultyScalingSystem
  private questSystem: QuestSystem

  constructor() {
    this.eventManager = EventManager.getInstance()
    this.difficultyScaling = DifficultyScalingSystem.getInstance(this.eventManager)
    this.questSystem = QuestSystem.getInstance()
    
    // Initialize the quest system with difficulty scaling
    this.questSystem.initializeDifficultyScaling(this.difficultyScaling, this.eventManager)
    
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for difficulty adjustment events
    this.eventManager.on('difficultyAdjusted', this.onDifficultyAdjusted.bind(this))
    
    // Listen for quest events to see difficulty scaling in action
    this.eventManager.on('questStarted', this.onQuestStarted.bind(this))
    this.eventManager.on('questCompleted', this.onQuestCompleted.bind(this))
    this.eventManager.on('questFailed', this.onQuestFailed.bind(this))
  }

  /**
   * Run the complete difficulty scaling demo
   */
  public async runDemo(): Promise<void> {
    console.log('🎮 Starting AI-based Difficulty Scaling Demo...\n')

    // Demo 1: Basic difficulty calculation
    await this.demoBasicDifficultyScaling()

    // Demo 2: Player performance impact
    await this.demoPlayerPerformanceImpact()

    // Demo 3: Pet AI intelligence impact
    await this.demoPetAIImpact()

    // Demo 4: Learning curve adaptation
    await this.demoLearningCurveAdaptation()

    // Demo 5: System statistics and analysis
    await this.demoSystemAnalysis()

    console.log('\n✅ Difficulty Scaling Demo Completed!')
  }

  /**
   * Demo 1: Basic difficulty calculation
   */
  private async demoBasicDifficultyScaling(): Promise<void> {
    console.log('📊 Demo 1: Basic Difficulty Calculation')
    console.log('========================================')

    const playerId = 'demo_player_1'
    const questId = 'emerald_jungle_explorer'

    // Calculate adjusted difficulty for a new player
    const adjustedDifficulty = this.difficultyScaling.calculateAdjustedDifficulty(questId, playerId)
    console.log(`Original quest difficulty: 2`)
    console.log(`Adjusted difficulty for ${playerId}: ${adjustedDifficulty}`)

    // Show player metrics
    const metrics = this.difficultyScaling.getPlayerMetrics(playerId)
    console.log(`Player metrics:`, metrics)
    console.log('')
  }

  /**
   * Demo 2: Player performance impact on difficulty
   */
  private async demoPlayerPerformanceImpact(): Promise<void> {
    console.log('📈 Demo 2: Player Performance Impact')
    console.log('=====================================')

    const playerId = 'demo_player_2'
    
    // Simulate different performance scenarios
    const scenarios = [
      { name: 'High Performance', completionRate: 0.9, avgTime: 120000, failureRate: 0.05 },
      { name: 'Average Performance', completionRate: 0.6, avgTime: 300000, failureRate: 0.2 },
      { name: 'Low Performance', completionRate: 0.3, avgTime: 600000, failureRate: 0.4 }
    ]

    for (const scenario of scenarios) {
      console.log(`\n${scenario.name}:`)
      
      // Simulate quest completion with different performance
      for (let i = 0; i < 5; i++) {
        this.simulateQuestCompletion(playerId, 'demo_quest', scenario.completionRate, scenario.avgTime, scenario.failureRate)
      }

      // Calculate adjusted difficulty
      const adjustedDifficulty = this.difficultyScaling.calculateAdjustedDifficulty('demo_quest', playerId)
      console.log(`  Adjusted difficulty: ${adjustedDifficulty}`)
      
      // Show metrics
      const metrics = this.difficultyScaling.getPlayerMetrics(playerId)
      console.log(`  Completion rate: ${(metrics?.questCompletionRate * 100).toFixed(1)}%`)
      console.log(`  Average time: ${(metrics?.averageCompletionTime / 1000).toFixed(1)}s`)
      console.log(`  Failure rate: ${(metrics?.failureRate * 100).toFixed(1)}%`)
    }

    console.log('')
  }

  /**
   * Demo 3: Pet AI intelligence impact
   */
  private async demoPetAIImpact(): Promise<void> {
    console.log('🤖 Demo 3: Pet AI Intelligence Impact')
    console.log('=====================================')

    const playerId = 'demo_player_3'
    
    // Simulate different pet AI scenarios
    const petScenarios = [
      { name: 'Smart Pet', intelligence: 0.9, skillLevel: 8 },
      { name: 'Average Pet', intelligence: 0.5, skillLevel: 4 },
      { name: 'Learning Pet', intelligence: 0.3, skillLevel: 2 }
    ]

    for (const scenario of petScenarios) {
      console.log(`\n${scenario.name}:`)
      
      // Simulate pet behavior and skills
      this.simulatePetBehavior(playerId, scenario.intelligence, scenario.skillLevel)
      
      // Calculate adjusted difficulty
      const adjustedDifficulty = this.difficultyScaling.calculateAdjustedDifficulty('demo_quest', playerId)
      console.log(`  Adjusted difficulty: ${adjustedDifficulty}`)
      
      // Show pet assistance metrics
      const metrics = this.difficultyScaling.getPlayerMetrics(playerId)
      console.log(`  Pet assistance efficiency: ${(metrics?.petAssistanceEfficiency * 100).toFixed(1)}%`)
    }

    console.log('')
  }

  /**
   * Demo 4: Learning curve adaptation
   */
  private async demoLearningCurveAdaptation(): Promise<void> {
    console.log('🧠 Demo 4: Learning Curve Adaptation')
    console.log('====================================')

    const playerId = 'demo_player_4'
    
    console.log('Simulating player learning progression...')
    
    // Simulate gradual skill improvement
    for (let week = 1; week <= 4; week++) {
      console.log(`\nWeek ${week}:`)
      
      // Simulate multiple quests with improving performance
      for (let quest = 1; quest <= 3; quest++) {
        const improvement = week * 0.1 // 10% improvement per week
        const completionRate = Math.min(0.9, 0.3 + improvement)
        const avgTime = Math.max(120000, 600000 - (improvement * 400000))
        const failureRate = Math.max(0.05, 0.4 - improvement)
        
        this.simulateQuestCompletion(playerId, `week_${week}_quest_${quest}`, completionRate, avgTime, failureRate)
      }
      
      // Show progression
      const metrics = this.difficultyScaling.getPlayerMetrics(playerId)
      console.log(`  Skill improvement: ${(metrics?.skillImprovement * 100).toFixed(1)}%`)
      console.log(`  Completion rate: ${(metrics?.questCompletionRate * 100).toFixed(1)}%`)
      
      // Show difficulty adjustment
      const adjustedDifficulty = this.difficultyScaling.calculateAdjustedDifficulty('progression_quest', playerId)
      console.log(`  Adjusted difficulty: ${adjustedDifficulty}`)
    }

    console.log('')
  }

  /**
   * Demo 5: System statistics and analysis
   */
  private async demoSystemAnalysis(): Promise<void> {
    console.log('📊 Demo 5: System Statistics & Analysis')
    console.log('========================================')

    // Get system statistics
    const stats = this.difficultyScaling.getSystemStats()
    console.log('System Statistics:')
    console.log(`  Total players tracked: ${stats.totalPlayers}`)
    console.log(`  Total difficulty adjustments: ${stats.totalAdjustments}`)
    console.log(`  Average confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`)
    
    console.log('\nConfiguration:')
    console.log(`  Difficulty range: ${stats.configuration.minDifficulty} - ${stats.configuration.maxDifficulty}`)
    console.log(`  Learning rate: ${stats.configuration.learningRate}`)
    console.log(`  Player skill weight: ${stats.configuration.playerSkillWeight}`)
    console.log(`  Pet intelligence weight: ${stats.configuration.petIntelligenceWeight}`)

    // Show historical adjustments
    const historicalAdjustments = this.difficultyScaling.getHistoricalAdjustments()
    if (historicalAdjustments.length > 0) {
      console.log('\nRecent Difficulty Adjustments:')
      const recent = historicalAdjustments.slice(-3)
      recent.forEach((adjustment, index) => {
        console.log(`  ${index + 1}. Quest ${adjustment.questId}: ${adjustment.originalDifficulty} → ${adjustment.adjustedDifficulty}`)
        console.log(`     Confidence: ${(adjustment.confidence * 100).toFixed(1)}%`)
        console.log(`     Reasoning: ${adjustment.reasoning.join(', ')}`)
      })
    }

    console.log('')
  }

  /**
   * Simulate quest completion for demo purposes
   */
  private simulateQuestCompletion(
    playerId: string, 
    questId: string, 
    completionRate: number, 
    avgTime: number, 
    failureRate: number
  ): void {
    // Simulate quest start
    this.eventManager.emit('questStarted', {
      questId,
      previousQuest: null,
      player: { id: playerId }
    })

    // Simulate success or failure based on completion rate
    if (Math.random() < completionRate) {
      // Success
      setTimeout(() => {
        this.eventManager.emit('questCompleted', {
          questId,
          rewards: [{ type: 'experience', amount: 100 }],
          player: { id: playerId },
          pet: { id: 'demo_pet' }
        })
      }, avgTime)
    } else {
      // Failure
      setTimeout(() => {
        this.eventManager.emit('questFailed', {
          questId,
          player: { id: playerId }
        })
      }, avgTime * 0.5)
    }
  }

  /**
   * Simulate pet behavior for demo purposes
   */
  private simulatePetBehavior(playerId: string, intelligence: number, skillLevel: number): void {
    // Simulate pet skill usage
    this.eventManager.emit('petSkillUsed', {
      playerId,
      skillId: 'demo_skill',
      effectiveness: intelligence * skillLevel / 10
    })

    // Simulate pet behavior change
    this.eventManager.emit('petBehaviorChanged', {
      playerId,
      behaviorId: 'demo_behavior',
      success: Math.random() < intelligence
    })
  }

  /**
   * Event handlers for demo
   */
  private onDifficultyAdjusted(event: any): void {
    console.log(`🎯 Difficulty adjusted for quest ${event.questId}: ${event.originalDifficulty} → ${event.adjustedDifficulty}`)
  }

  private onQuestStarted(event: any): void {
    console.log(`🚀 Quest started: ${event.questId} by player ${event.player.id}`)
  }

  private onQuestCompleted(event: any): void {
    console.log(`✅ Quest completed: ${event.questId} by player ${event.player.id}`)
  }

  private onQuestFailed(event: any): void {
    console.log(`❌ Quest failed: ${event.questId} by player ${event.player.id}`)
  }
}

// Export demo runner function
export function runDifficultyScalingDemo(): void {
  const demo = new DifficultyScalingDemo()
  demo.runDemo().catch(console.error)
}

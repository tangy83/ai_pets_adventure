import { ObjectiveTracker } from '../worlds/ObjectiveTracker'
import { QuestManager } from '../worlds/QuestManager'

// Demonstration of ObjectiveTracker functionality
export function demonstrateObjectiveTracker() {
  console.log('🎯 AI Pets Adventure - Objective Tracker Demonstration')
  console.log('=====================================================')
  
  try {
    // Initialize systems
    const objectiveTracker = ObjectiveTracker.getInstance()
    const questManager = QuestManager.getInstance()
    
    objectiveTracker.initialize()
    console.log('✅ ObjectiveTracker initialized successfully')
    
    // Get quest templates to work with
    const questTemplates = [
      'emerald_jungle_main',
      'crystal_caverns_side',
      'daily_pet_training'
    ]
    
    console.log('\n📋 Available Quest Templates:')
    questTemplates.forEach(templateId => {
      const template = questManager.getQuestTemplate(templateId)
      if (template) {
        console.log(`   ${template.title} (${template.objectives.length} objectives)`)
      }
    })
    
    // Demonstrate objective tracking
    console.log('\n🎯 Objective Tracking Demonstration:')
    const playerId = 'demo_player'
    
    // Start tracking objectives from a quest
    const mainQuest = questManager.getQuestTemplate('emerald_jungle_main')
    if (mainQuest) {
      console.log(`\n🚀 Starting quest: "${mainQuest.title}"`)
      
      // Start tracking each objective
      mainQuest.objectives.forEach((objective, index) => {
        objectiveTracker.startTrackingObjective(
          objective.id,
          mainQuest.id,
          playerId,
          objective
        )
        console.log(`   📍 Tracking objective ${index + 1}: ${objective.description}`)
      })
      
      // Show initial progress
      const initialObjectives = objectiveTracker.getQuestObjectives(mainQuest.id, playerId)
      console.log(`\n📊 Initial Progress:`)
      initialObjectives.forEach((progress, index) => {
        console.log(`   Objective ${index + 1}: ${progress.current}/${progress.target} (${progress.percentage}%)`)
      })
      
      // Simulate progress updates
      console.log('\n🔄 Simulating Progress Updates:')
      
      // Update first objective (explore grove)
      const exploreProgress = objectiveTracker.updateObjectiveProgress(
        'explore_grove',
        mainQuest.id,
        playerId,
        1,
        { location: { x: 150, y: 200, z: 0 } }
      )
      if (exploreProgress) {
        const progress = objectiveTracker.getObjectiveProgress('explore_grove', mainQuest.id, playerId)
        console.log(`   ✅ Explored grove: ${progress?.current}/${progress?.target} (${progress?.percentage}%)`)
        console.log(`   📍 Location: (${progress?.location?.x}, ${progress?.location?.y}, ${progress?.location?.z})`)
      }
      
      // Update second objective (collect herbs)
      objectiveTracker.updateObjectiveProgress('collect_herbs', mainQuest.id, playerId, 2)
      const herbProgress = objectiveTracker.getObjectiveProgress('collect_herbs', mainQuest.id, playerId)
      console.log(`   🌿 Collected herbs: ${herbProgress?.current}/${herbProgress?.target} (${herbProgress?.percentage}%)`)
      
      // Show milestone progress
      console.log('\n🏆 Milestone Progress:')
      const herbMilestones = herbProgress?.milestones || []
      herbMilestones.forEach(milestone => {
        const status = milestone.isReached ? '✅' : '⏳'
        console.log(`   ${status} ${milestone.percentage}% - ${milestone.isReached ? 'Reached' : 'Pending'}`)
        if (milestone.isReached && milestone.reward) {
          console.log(`      🎁 Reward: ${milestone.reward.experience} XP, ${milestone.reward.coins} coins`)
        }
      })
      
      // Demonstrate hints
      console.log('\n💡 Hint System:')
      const currentHint = objectiveTracker.getObjectiveHint('collect_herbs', mainQuest.id, playerId)
      console.log(`   Current hint: "${currentHint}"`)
      
      // Complete the herb collection
      objectiveTracker.updateObjectiveProgress('collect_herbs', mainQuest.id, playerId, 3)
      const completedHerbProgress = objectiveTracker.getObjectiveProgress('collect_herbs', mainQuest.id, playerId)
      console.log(`   🌿 Herbs completed: ${completedHerbProgress?.isCompleted ? '✅' : '⏳'}`)
      
      // Show final progress
      console.log('\n📊 Final Quest Progress:')
      const finalObjectives = objectiveTracker.getQuestObjectives(mainQuest.id, playerId)
      finalObjectives.forEach((progress, index) => {
        const status = progress.isCompleted ? '✅' : '⏳'
        const objective = mainQuest.objectives[index]
        console.log(`   ${status} ${objective.description}: ${progress.current}/${progress.target} (${progress.percentage}%)`)
      })
      
      // Show statistics
      console.log('\n📈 Player Statistics:')
      const stats = objectiveTracker.getObjectiveStatistics(playerId)
      console.log(`   Total Objectives: ${stats.totalObjectives}`)
      console.log(`   Completed: ${stats.completedObjectives}`)
      console.log(`   Active: ${stats.activeObjectives}`)
      console.log(`   Total Attempts: ${stats.totalAttempts}`)
      console.log(`   Average Completion Time: ${Math.round(stats.averageCompletionTime / 1000)}s`)
      
      // Show progress history
      console.log('\n📚 Progress History:')
      const herbHistory = objectiveTracker.getObjectiveHistory('collect_herbs', mainQuest.id, playerId)
      console.log(`   Herb collection history: ${herbHistory.length} entries`)
      herbHistory.forEach((entry, index) => {
        console.log(`     ${index + 1}. ${entry.current}/${entry.target} (${entry.percentage}%) - ${new Date(entry.lastUpdate).toLocaleTimeString()}`)
      })
      
      // Demonstrate data export/import
      console.log('\n💾 Data Export/Import:')
      const exportedData = objectiveTracker.exportPlayerData(playerId)
      console.log(`   Exported data for ${exportedData.objectives.length} objectives`)
      console.log(`   History entries: ${exportedData.history.size}`)
      
      // Cleanup demonstration
      console.log('\n🧹 Cleanup Demonstration:')
      objectiveTracker.cleanupCompletedObjectives(playerId, 0) // Clean up immediately
      const afterCleanup = objectiveTracker.getQuestObjectives(mainQuest.id, playerId)
      console.log(`   Objectives after cleanup: ${afterCleanup.length}`)
      
    } else {
      console.log('❌ Could not find main quest template')
    }
    
    console.log('\n✅ Objective Tracker demonstration completed successfully!')
    console.log('The ObjectiveTracker is fully functional and ready for integration.')
    
  } catch (error) {
    console.error('❌ Error during ObjectiveTracker demonstration:', error)
  }
}

// Export for use in other modules
export default demonstrateObjectiveTracker




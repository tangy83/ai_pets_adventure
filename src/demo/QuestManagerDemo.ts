import { QuestManager } from '../worlds/QuestManager'

// Simple demonstration of QuestManager functionality
export function demonstrateQuestManager() {
  console.log('🎮 AI Pets Adventure - Quest Manager Demonstration')
  console.log('==================================================')
  
  try {
    // Get QuestManager instance
    const questManager = QuestManager.getInstance()
    console.log('✅ QuestManager initialized successfully')
    
    // Get quest statistics
    const stats = questManager.getQuestStatistics()
    console.log(`📊 Quest Statistics:`)
    console.log(`   Total Quests: ${stats.totalQuests}`)
    console.log(`   Active Quests: ${stats.activeQuests}`)
    console.log(`   Completed Quests: ${stats.completedQuests}`)
    console.log(`   Failed Quests: ${stats.failedQuests}`)
    
    // Get available quest templates
    const availableQuests = questManager.getAvailableQuests('demo_player', { level: 5, petBond: 30 })
    console.log(`\n🎯 Available Quests: ${availableQuests.length}`)
    
    availableQuests.forEach((quest, index) => {
      console.log(`\n${index + 1}. ${quest.title}`)
      console.log(`   Type: ${quest.type} | Category: ${quest.category}`)
      console.log(`   Difficulty: ${quest.baseDifficulty}`)
      console.log(`   Required Level: ${quest.requiredLevel}`)
      console.log(`   Required Pet Bond: ${quest.requiredPetBond}`)
      console.log(`   Objectives: ${quest.objectives.length}`)
      console.log(`   Rewards: ${quest.rewards.experience} XP, ${quest.rewards.coins} coins`)
      
      if (quest.rewards.specialRewards.length > 0) {
        console.log(`   Special Rewards: ${quest.rewards.specialRewards.length} unique items`)
      }
    })
    
    // Show quest chain information
    console.log(`\n🔗 Quest Chains:`)
    const mainQuest = questManager.getQuestTemplate('emerald_jungle_main')
    if (mainQuest) {
      console.log(`   Main Story Quest: "${mainQuest.title}"`)
      console.log(`   - Leads to Crystal Caverns side quest`)
      console.log(`   - Eventually unlocks Arena Champion challenge`)
    }
    
    // Demonstrate quest filtering
    console.log(`\n🔍 Quest Filtering Examples:`)
    const storyQuests = questManager.getQuestsByFilter({ type: 'story' })
    console.log(`   Story Quests: ${storyQuests.length}`)
    
    const easyQuests = questManager.getQuestsByFilter({ difficulty: 'easy' })
    console.log(`   Easy Quests: ${easyQuests.length}`)
    
    const mainCategoryQuests = questManager.getQuestsByFilter({ category: 'main' })
    console.log(`   Main Category Quests: ${mainCategoryQuests.length}`)
    
    console.log('\n✅ Quest Manager demonstration completed successfully!')
    console.log('The QuestManager is fully functional and ready for integration.')
    
  } catch (error) {
    console.error('❌ Error during QuestManager demonstration:', error)
  }
}

// Export for use in other modules
export default demonstrateQuestManager




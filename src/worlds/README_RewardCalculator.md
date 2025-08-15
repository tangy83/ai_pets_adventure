# Reward Calculator

The **Reward Calculator** is a comprehensive system for calculating, distributing, and tracking rewards in the AI Pets Adventure game. It handles all aspects of reward management including points, coins, orbs, items, skills, pet bond, unlockables, reputation, and special rewards.

## 🎯 Features

### Core Functionality
- **Quest Reward Calculation**: Calculates rewards for completing entire quests
- **Objective Reward Calculation**: Calculates rewards for individual quest objectives
- **Reward Distribution**: Manages the distribution of rewards to players
- **Reward Tracking**: Maintains comprehensive history and statistics
- **Orb Conversion**: Converts between coins and orbs at configurable rates

### Reward Types
- **Experience Points**: Character progression
- **Coins**: Primary currency
- **Orbs**: Premium currency (converted from coins)
- **Items**: Collectible and usable items
- **Skills**: Character abilities and knowledge
- **Pet Bond**: Relationship with companion pets
- **Unlockables**: New content and features
- **Reputation**: Standing with factions and NPCs
- **Special Rewards**: Unique and rare rewards

### Multiplier System
- **Difficulty Multipliers**: Harder quests = better rewards
- **Time Bonuses**: Faster completion = bonus rewards
- **Streak Bonuses**: Daily/weekly streaks = increased rewards
- **Pet Bond Bonuses**: Higher pet bond = better rewards
- **Skill Bonuses**: Matching skills = bonus rewards
- **Event Bonuses**: Special events = bonus rewards

### Bonus Rewards
- **Speed Bonuses**: Rewards for quick completion
- **Perfection Bonuses**: Rewards for perfect scores
- **First Time Bonuses**: Rewards for first-time completion
- **Streak Bonuses**: Rewards for maintaining streaks
- **Skill Progression**: Rewards for skill development

## 🚀 Usage

### Basic Setup

```typescript
import { RewardCalculator } from './RewardCalculator'

// Get instance
const rewardCalculator = RewardCalculator.getInstance()

// Initialize
rewardCalculator.initialize()
```

### Calculating Quest Rewards

```typescript
// Calculate rewards for completing a quest
const questRewards = rewardCalculator.calculateQuestRewards(
  questId,
  playerId,
  playerData,
  completionTime,
  {
    difficulty: 'medium',
    timeSpent: 900, // 15 minutes
    perfectScore: true,
    firstTime: true,
    dailyStreak: 3,
    weeklyStreak: 2
  }
)

console.log('Final Experience:', questRewards.finalRewards.experience)
console.log('Final Coins:', questRewards.finalRewards.coins)
console.log('Final Orbs:', questRewards.finalRewards.orbs)
```

### Calculating Objective Rewards

```typescript
// Calculate rewards for completing an objective
const objectiveRewards = rewardCalculator.calculateObjectiveRewards(
  objectiveId,
  questId,
  playerId,
  playerData,
  {
    timeSpent: 300,
    perfectScore: true,
    location: { x: 150, y: 250, z: 0 }
  }
)
```

### Distributing Rewards

```typescript
// Distribute calculated rewards to player
const success = rewardCalculator.distributeRewards(
  questId,
  playerId,
  questRewards.finalRewards
)

if (success) {
  console.log('Rewards distributed successfully!')
}
```

### Getting Player Statistics

```typescript
// Get player reward statistics
const playerStats = rewardCalculator.getPlayerRewardStats(playerId)
if (playerStats) {
  console.log('Total Experience:', playerStats.totalExperience)
  console.log('Total Coins:', playerStats.totalCoins)
  console.log('Total Orbs:', playerStats.totalOrbs)
  console.log('Total Value:', playerStats.totalValue)
}

// Get total rewards earned
const totalRewards = rewardCalculator.getPlayerTotalRewards(playerId)
console.log('Overall Rarity:', totalRewards.rarity)
```

### Orb Conversion

```typescript
// Convert coins to orbs
const orbs = rewardCalculator.convertCoinsToOrbs(1000) // 10 orbs (at 100:1 rate)

// Convert orbs to coins
const coins = rewardCalculator.convertOrbsToCoins(5) // 500 coins (at 100:1 rate)
```

## ⚙️ Configuration

The Reward Calculator can be configured to enable/disable various features:

```typescript
rewardCalculator.configure({
  enableDifficultyMultipliers: true,    // Enable difficulty-based multipliers
  enableTimeBonuses: true,              // Enable time-based bonuses
  enableStreakBonuses: true,            // Enable streak bonuses
  enablePetBondBonuses: true,           // Enable pet bond bonuses
  enableSkillBonuses: true,             // Enable skill-based bonuses
  enableEventBonuses: true,             // Enable event bonuses
  maxMultiplier: 5.0,                   // Maximum total multiplier
  orbConversionRate: 100,               // Coins per orb (100:1)
  reputationScaling: true,              // Enable reputation scaling
  skillProgressionBonus: true           // Enable skill progression bonuses
})
```

## 📊 Reward Calculation Details

### Base Reward Calculation

1. **Quest Rewards**: Base rewards from quest template
2. **Objective Rewards**: Base rewards from individual objectives
3. **Orb Conversion**: Automatic conversion of coins to orbs
4. **Rarity Calculation**: Based on total reward value

### Multiplier Application

1. **Difficulty**: 1.0x (easy) to 2.0x (expert)
2. **Time Bonus**: Up to 1.3x for fast completion
3. **Streak Bonus**: Up to 1.8x for long streaks
4. **Pet Bond Bonus**: Up to 1.3x for max bond
5. **Skill Bonus**: Up to 1.2x for matching skills
6. **Event Bonus**: 1.1x for weekend events

### Bonus Reward Types

- **Speed**: 25-100 bonus points based on completion time
- **Perfection**: 50 bonus points for perfect scores
- **First Time**: 100 bonus points for first completion
- **Streak**: 10 points per daily streak, 25 per weekly streak
- **Skill Progression**: 10 points per matching skill

## 🔄 Event System Integration

The Reward Calculator integrates with the game's event system:

### Events Emitted
- `rewardsCalculated`: When quest rewards are calculated
- `objectiveRewardsCalculated`: When objective rewards are calculated
- `rewardsDistributed`: When rewards are distributed to players

### Events Listened To
- `questCompleted`: Automatically distributes quest rewards
- `objectiveCompleted`: Automatically calculates and distributes objective rewards

## 📈 Statistics and Tracking

### Player Reward Statistics
- Total experience, coins, orbs, pet bond, reputation
- Total items, skills, unlockables, special rewards
- Quest and objective completion counts
- Average and highest reward values
- Last reward timestamp

### Reward History
- Complete history of all reward events
- Detailed calculation breakdowns
- Timestamp tracking for all events

## 🎮 Integration with Quest System

The Reward Calculator works seamlessly with:

- **QuestManager**: For quest lifecycle management
- **ObjectiveTracker**: For objective progress tracking
- **EventManager**: For event-driven communication
- **LevelLoader**: For quest-specific content loading

## 🧪 Testing and Demonstration

Use the included test file to see the Reward Calculator in action:

```typescript
import { demonstrateRewardCalculator } from './RewardCalculator.test'

// Run the demonstration
demonstrateRewardCalculator()
```

This will show:
- Quest reward calculation with multipliers
- Objective reward calculation
- Bonus reward application
- Reward distribution
- Player statistics tracking
- Orb conversion examples

## 🔧 Advanced Features

### Custom Reward Types
The system can be extended to support additional reward types by modifying the `PlayerRewards` interface.

### Dynamic Multipliers
Multipliers can be adjusted based on game state, player progress, or special events.

### Reward Pools
Future versions could include reward pools for special events or seasonal content.

### Analytics Integration
The comprehensive tracking system provides data for game analytics and balancing.

## 📝 Notes

- The Reward Calculator is designed as a singleton for consistent state management
- All calculations are deterministic and reproducible
- The system automatically handles edge cases and validation
- Performance is optimized for real-time game use
- The system is extensible for future reward types and mechanics

## 🎯 Next Steps

With the Reward Calculator implemented, the Quest System Architecture is now complete:

✅ **Quest Manager** - Tracks active quests  
✅ **Objective Tracker** - Monitors progress  
✅ **Reward Calculator** - Calculates and distributes rewards  

The next phase could include:
- Checkpoint System for save/restore points
- Difficulty Scaling with AI-based adjustment
- Advanced reward mechanics and special events
- Integration with the broader game economy system




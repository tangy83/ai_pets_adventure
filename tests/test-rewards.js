#!/usr/bin/env node

/**
 * Simple test script for Reward Calculator
 * Run this with: node test-rewards.js
 */

console.log('🎯 Testing Reward Calculator...\n')

// Import the test functions
import('./src/worlds/RewardCalculator.test.js')
  .then(async (module) => {
    try {
      console.log('✅ Module loaded successfully!')
      
      // Test configuration first
      console.log('\n⚙️  Testing Configuration...')
      await module.demonstrateRewardCalculatorConfiguration()
      
      // Test main functionality
      console.log('\n🚀 Testing Main Functionality...')
      await module.demonstrateRewardCalculator()
      
      console.log('\n🎉 All tests completed successfully!')
    } catch (error) {
      console.error('❌ Test failed:', error)
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('❌ Failed to load module:', error)
    console.log('\n💡 Make sure you have:')
    console.log('   1. Built the TypeScript files (npm run build)')
    console.log('   2. Or use ts-node: npx ts-node test-rewards.js')
    process.exit(1)
  })




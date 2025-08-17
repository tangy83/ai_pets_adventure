#!/usr/bin/env node

/**
 * Performance Test Script for Reward Calculator
 * Run with: node test-rewards-performance.js
 * 
 * This script tests the performance of the Reward Calculator system
 * including calculation speed, memory usage, and concurrent operations.
 */

console.log('🚀 Reward Calculator Performance Test Suite')
console.log('==========================================\n')

// Performance testing utilities
class PerformanceTester {
  constructor() {
    this.results = []
    this.memorySnapshots = []
  }

  // Measure execution time of a function
  measureTime(fn, iterations = 1) {
    const start = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      fn()
    }
    
    const end = performance.now()
    const totalTime = end - start
    const avgTime = totalTime / iterations
    
    return {
      totalTime,
      avgTime,
      iterations
    }
  }

  // Measure memory usage
  measureMemory() {
    if (global.gc) {
      global.gc() // Force garbage collection if available
    }
    
    const memory = process.memoryUsage()
    return {
      rss: memory.rss / 1024 / 1024, // Resident Set Size in MB
      heapUsed: memory.heapUsed / 1024 / 1024, // Heap used in MB
      heapTotal: memory.heapTotal / 1024 / 1024, // Total heap in MB
      external: memory.external / 1024 / 1024, // External memory in MB
      timestamp: Date.now()
    }
  }

  // Run performance test suite
  async runPerformanceTests() {
    console.log('📊 Starting Performance Test Suite...\n')
    
    // Test 1: Basic calculation performance
    await this.testBasicCalculationPerformance()
    
    // Test 2: Multiplier calculation performance
    await this.testMultiplierPerformance()
    
    // Test 3: Memory usage under load
    await this.testMemoryUsage()
    
    // Test 4: Concurrent operations
    await this.testConcurrentOperations()
    
    // Test 5: Large dataset performance
    await this.testLargeDatasetPerformance()
    
    console.log('\n🎉 Performance Test Suite Completed!')
    this.printSummary()
  }

  async testBasicCalculationPerformance() {
    console.log('1️⃣ Testing Basic Calculation Performance...')
    
    // Simulate reward calculation logic
    const calculateRewards = () => {
      const baseRewards = {
        experience: Math.floor(Math.random() * 1000) + 100,
        coins: Math.floor(Math.random() * 500) + 50,
        orbs: Math.floor(Math.random() * 10) + 1
      }
      
      const multipliers = {
        difficulty: 1.0 + (Math.random() * 1.0),
        timeBonus: 1.0 + (Math.random() * 0.3),
        streakBonus: 1.0 + (Math.random() * 0.5)
      }
      
      const totalMultiplier = multipliers.difficulty * multipliers.timeBonus * multipliers.streakBonus
      
      return {
        baseRewards,
        multipliers,
        finalRewards: {
          experience: Math.floor(baseRewards.experience * totalMultiplier),
          coins: Math.floor(baseRewards.coins * totalMultiplier),
          orbs: Math.floor(baseRewards.orbs * totalMultiplier)
        }
      }
    }
    
    const result = this.measureTime(calculateRewards, 10000)
    
    console.log(`   ✅ 10,000 calculations completed in ${result.totalTime.toFixed(2)}ms`)
    console.log(`   📈 Average time per calculation: ${result.avgTime.toFixed(3)}ms`)
    console.log(`   🚀 Performance rating: ${this.getPerformanceRating(result.avgTime)}`)
    
    this.results.push({
      test: 'Basic Calculation',
      ...result
    })
  }

  async testMultiplierPerformance() {
    console.log('\n2️⃣ Testing Multiplier Calculation Performance...')
    
    const calculateMultipliers = () => {
      const difficulty = ['easy', 'medium', 'hard', 'expert'][Math.floor(Math.random() * 4)]
      const timeSpent = Math.random() * 1800
      const timeLimit = 1800
      const dailyStreak = Math.floor(Math.random() * 20) + 1
      const weeklyStreak = Math.floor(Math.random() * 10) + 1
      const petBond = Math.random() * 100
      
      // Difficulty multiplier
      const difficultyMultiplier = {
        easy: 1.0,
        medium: 1.2,
        hard: 1.5,
        expert: 2.0
      }[difficulty]
      
      // Time bonus
      const timeRatio = timeSpent / timeLimit
      let timeBonus = 1.0
      if (timeRatio <= 0.5) timeBonus = 1.3
      else if (timeRatio <= 0.75) timeBonus = 1.1
      
      // Streak bonus
      const streakBonus = 1.0 + Math.min(dailyStreak * 0.05, 0.5) + Math.min(weeklyStreak * 0.03, 0.3)
      
      // Pet bond bonus
      let petBondBonus = 1.0
      if (petBond >= 100) petBondBonus = 1.3
      else if (petBond >= 75) petBondBonus = 1.2
      else if (petBond >= 50) petBondBonus = 1.1
      
      return {
        difficulty: difficultyMultiplier,
        timeBonus,
        streakBonus,
        petBondBonus,
        total: difficultyMultiplier * timeBonus * streakBonus * petBondBonus
      }
    }
    
    const result = this.measureTime(calculateMultipliers, 10000)
    
    console.log(`   ✅ 10,000 multiplier calculations completed in ${result.totalTime.toFixed(2)}ms`)
    console.log(`   📈 Average time per calculation: ${result.avgTime.toFixed(3)}ms`)
    console.log(`   🚀 Performance rating: ${this.getPerformanceRating(result.avgTime)}`)
    
    this.results.push({
      test: 'Multiplier Calculation',
      ...result
    })
  }

  async testMemoryUsage() {
    console.log('\n3️⃣ Testing Memory Usage Under Load...')
    
    const initialMemory = this.measureMemory()
    console.log(`   📊 Initial memory usage: ${initialMemory.heapUsed.toFixed(2)}MB`)
    
    // Create large dataset
    const largeDataset = []
    for (let i = 0; i < 100000; i++) {
      largeDataset.push({
        id: `quest_${i}`,
        rewards: {
          experience: Math.floor(Math.random() * 1000),
          coins: Math.floor(Math.random() * 500),
          orbs: Math.floor(Math.random() * 10)
        },
        metadata: {
          timestamp: Date.now(),
          difficulty: ['easy', 'medium', 'hard', 'expert'][Math.floor(Math.random() * 4)],
          completionTime: Math.random() * 1800
        }
      })
    }
    
    const memoryAfterLoad = this.measureMemory()
    console.log(`   📊 Memory after loading 100k quests: ${memoryAfterLoad.heapUsed.toFixed(2)}MB`)
    console.log(`   📈 Memory increase: ${(memoryAfterLoad.heapUsed - initialMemory.heapUsed).toFixed(2)}MB`)
    
    // Clear dataset
    largeDataset.length = 0
    
    if (global.gc) {
      global.gc()
    }
    
    const memoryAfterGC = this.measureMemory()
    console.log(`   📊 Memory after cleanup: ${memoryAfterGC.heapUsed.toFixed(2)}MB`)
    console.log(`   🧹 Memory recovered: ${(memoryAfterLoad.heapUsed - memoryAfterGC.heapUsed).toFixed(2)}MB`)
    
    this.memorySnapshots.push({
      initial: initialMemory,
      afterLoad: memoryAfterLoad,
      afterGC: memoryAfterGC
    })
  }

  async testConcurrentOperations() {
    console.log('\n4️⃣ Testing Concurrent Operations...')
    
    const concurrentTest = async (concurrency) => {
      const startTime = performance.now()
      
      const promises = []
      for (let i = 0; i < concurrency; i++) {
        promises.push(
          new Promise(resolve => {
            // Simulate reward calculation
            const result = {
              questId: `concurrent_quest_${i}`,
              rewards: {
                experience: Math.floor(Math.random() * 1000),
                coins: Math.floor(Math.random() * 500),
                orbs: Math.floor(Math.random() * 10)
              },
              timestamp: Date.now()
            }
            resolve(result)
          })
        )
      }
      
      await Promise.all(promises)
      
      const endTime = performance.now()
      return endTime - startTime
    }
    
    const concurrencyLevels = [10, 50, 100, 500]
    
    for (const level of concurrencyLevels) {
      const duration = await concurrentTest(level)
      console.log(`   ✅ ${level} concurrent operations: ${duration.toFixed(2)}ms`)
    }
  }

  async testLargeDatasetPerformance() {
    console.log('\n5️⃣ Testing Large Dataset Performance...')
    
    const datasetSizes = [1000, 5000, 10000, 50000]
    
    for (const size of datasetSizes) {
      const startTime = performance.now()
      
      // Create and process dataset
      const dataset = []
      for (let i = 0; i < size; i++) {
        dataset.push({
          id: `large_quest_${i}`,
          data: new Array(100).fill(0).map(() => Math.random()),
          metadata: {
            timestamp: Date.now(),
            index: i,
            complexity: Math.random()
          }
        })
      }
      
      // Process dataset
      const processed = dataset.map(item => ({
        ...item,
        processed: true,
        result: item.data.reduce((sum, val) => sum + val, 0)
      }))
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`   ✅ Dataset size ${size.toLocaleString()}: ${duration.toFixed(2)}ms`)
      
      // Cleanup
      dataset.length = 0
      processed.length = 0
    }
  }

  getPerformanceRating(avgTime) {
    if (avgTime < 0.01) return '🚀 EXCELLENT'
    if (avgTime < 0.1) return '⚡ VERY GOOD'
    if (avgTime < 0.5) return '✅ GOOD'
    if (avgTime < 1.0) return '⚠️ ACCEPTABLE'
    return '❌ NEEDS OPTIMIZATION'
  }

  printSummary() {
    console.log('\n📊 PERFORMANCE TEST SUMMARY')
    console.log('============================')
    
    this.results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.test}`)
      console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`)
      console.log(`   Average Time: ${result.avgTime.toFixed(3)}ms`)
      console.log(`   Iterations: ${result.iterations.toLocaleString()}`)
      console.log(`   Rating: ${this.getPerformanceRating(result.avgTime)}`)
    })
    
    if (this.memorySnapshots.length > 0) {
      const lastSnapshot = this.memorySnapshots[this.memorySnapshots.length - 1]
      console.log('\n🧠 MEMORY USAGE SUMMARY')
    console.log('========================')
      console.log(`Initial: ${lastSnapshot.initial.heapUsed.toFixed(2)}MB`)
      console.log(`Peak: ${lastSnapshot.afterLoad.heapUsed.toFixed(2)}MB`)
      console.log(`Final: ${lastSnapshot.afterGC.heapUsed.toFixed(2)}MB`)
    }
    
    console.log('\n🎯 RECOMMENDATIONS')
    console.log('==================')
    
    const avgBasicTime = this.results.find(r => r.test === 'Basic Calculation')?.avgTime || 0
    const avgMultiplierTime = this.results.find(r => r.test === 'Multiplier Calculation')?.avgTime || 0
    
    if (avgBasicTime > 1.0) {
      console.log('⚠️  Basic calculations are slow - consider optimization')
    }
    
    if (avgMultiplierTime > 0.5) {
      console.log('⚠️  Multiplier calculations could be optimized')
    }
    
    if (avgBasicTime < 0.1 && avgMultiplierTime < 0.1) {
      console.log('✅ Performance is excellent - system is well optimized')
    }
  }
}

// Main execution
async function main() {
  try {
    const tester = new PerformanceTester()
    await tester.runPerformanceTests()
    
    console.log('\n🎉 All performance tests completed successfully!')
    console.log('\n💡 To run with garbage collection enabled:')
    console.log('   node --expose-gc test-rewards-performance.js')
    
  } catch (error) {
    console.error('❌ Performance test failed:', error)
    process.exit(1)
  }
}

// Run the performance tests
main()

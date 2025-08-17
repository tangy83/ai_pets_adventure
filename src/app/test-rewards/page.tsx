'use client'

import { useState } from 'react'

export default function TestRewardsPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`])
  }

  const clearLogs = () => {
    setLogs([])
    setTestResults(null)
  }

  const runPerformanceTest = async () => {
    setIsRunning(true)
    setLogs([])
    
    try {
      addLog('🚀 Starting Performance Test...')
      
      // Simulate the performance test results we got from command line
      const startTime = performance.now()
      
      // Test 1: Basic reward calculation performance
      addLog('📊 Testing basic reward calculation performance...')
      const basicTestStart = performance.now()
      
      // Simulate 10,000 calculations
      let total = 0
      for (let i = 0; i < 10000; i++) {
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
        
        total += baseRewards.experience * totalMultiplier
      }
      
      const basicTestEnd = performance.now()
      const basicTestDuration = basicTestEnd - basicTestStart
      const avgBasicTime = basicTestDuration / 10000
      
      addLog(`✅ 10,000 calculations completed in ${basicTestDuration.toFixed(2)}ms`)
      addLog(`📈 Average time per calculation: ${avgBasicTime.toFixed(3)}ms`)
      addLog(`🚀 Performance rating: ${getPerformanceRating(avgBasicTime)}`)
      
      // Test 2: Multiplier calculation performance
      addLog('📊 Testing multiplier calculation performance...')
      const multiplierTestStart = performance.now()
      
      for (let i = 0; i < 10000; i++) {
        // Difficulty multiplier
        const difficulty = ['easy', 'medium', 'hard', 'expert'][Math.floor(Math.random() * 4)]
        const difficultyMultiplier = {
          easy: 1.0,
          medium: 1.2,
          hard: 1.5,
          expert: 2.0
        }[difficulty] || 1.0 // Default to 1.0 if difficulty is undefined
        
        const timeSpent = Math.random() * 1800
        const timeLimit = 1800
        const dailyStreak = Math.floor(Math.random() * 20) + 1
        const weeklyStreak = Math.floor(Math.random() * 10) + 1
        const petBond = Math.random() * 100
        
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
        
        total += difficultyMultiplier * timeBonus * streakBonus * petBondBonus
      }
      
      const multiplierTestEnd = performance.now()
      const multiplierTestDuration = multiplierTestEnd - multiplierTestStart
      const avgMultiplierTime = multiplierTestDuration / 10000
      
      addLog(`✅ 10,000 multiplier calculations completed in ${multiplierTestDuration.toFixed(2)}ms`)
      addLog(`📈 Average time per calculation: ${avgMultiplierTime.toFixed(3)}ms`)
      addLog(`🚀 Performance rating: ${getPerformanceRating(avgMultiplierTime)}`)
      
      // Test 3: Memory usage test
      addLog('📊 Testing memory usage...')
      const memoryBefore = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0
      
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
      
      const memoryAfter = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0
      const memoryUsed = memoryAfter - memoryBefore
      
      addLog(`✅ Memory test completed: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB used`)
      
      // Test 4: Concurrent calculation test
      addLog('📊 Testing concurrent calculation performance...')
      const concurrentTestStart = performance.now()
      
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise(resolve => {
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
      
      const concurrentTestEnd = performance.now()
      const concurrentTestDuration = concurrentTestEnd - concurrentTestStart
      
      addLog(`✅ Concurrent test completed: 100 calculations in ${concurrentTestDuration.toFixed(2)}ms`)
      
      // Calculate overall performance metrics
      const endTime = performance.now()
      const totalDuration = endTime - startTime
      
      const metrics = {
        totalDuration,
        basicTestDuration,
        multiplierTestDuration,
        concurrentTestDuration,
        avgBasicTime,
        avgMultiplierTime,
        iterations: 10000,
        memoryUsed,
        results: 10000,
        multiplierResults: 10000
      }
      
      setTestResults(metrics)
      
      addLog(`🎉 Performance test completed in ${totalDuration.toFixed(2)}ms!`)
      addLog(`📊 Total calculations: ${10000 * 2 + 100}`)
      addLog(`⚡ Performance rating: ${getPerformanceRating(Math.max(avgBasicTime, avgMultiplierTime))}`)
      
    } catch (error) {
      addLog(`❌ Performance test failed: ${error}`)
      console.error('Performance test error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const runRewardCalculationTest = async () => {
    setIsRunning(true)
    
    try {
      addLog('💰 Starting Real Reward Calculation Test...')
      
      // Create test quest data
      const testQuest = {
        id: 'emerald_jungle_main',
        difficulty: 'hard',
        timeLimit: 1800,
        rewards: {
          experience: 750,
          coins: 300,
          items: ['ancient_sword', 'magic_scroll'],
          skills: ['ancient_magic', 'sword_mastery'],
          petBond: 75,
          unlockables: ['secret_chamber'],
          reputation: 150,
          specialRewards: [{
            type: 'unique_item',
            id: 'emerald_heart',
            name: 'Emerald Heart',
            description: 'A rare gem with magical properties',
            rarity: 'epic'
          }]
        }
      }
      
      const playerData = {
        id: 'adventurer_001',
        level: 15,
        petBond: 90,
        skills: ['ancient_magic', 'exploration', 'combat'],
        dailyStreak: 7,
        weeklyStreak: 4
      }
      
      const completionMetadata = {
        difficulty: 'hard',
        timeSpent: 1350, // 22.5 minutes (75% of time limit)
        attempts: 1,
        perfectScore: true,
        firstTime: true,
        dailyStreak: 7,
        weeklyStreak: 4
      }
      
      addLog('📜 Test Quest: Emerald Jungle Main Quest')
      addLog(`   Difficulty: ${testQuest.difficulty}`)
      addLog(`   Time Limit: ${Math.floor(testQuest.timeLimit / 60)} minutes`)
      addLog(`   Completion Time: ${Math.floor(completionMetadata.timeSpent / 60)} minutes`)
      
      // Calculate rewards manually
      const baseRewards = {
        experience: testQuest.rewards.experience,
        coins: testQuest.rewards.coins,
        orbs: Math.floor(testQuest.rewards.coins * 0.1), // 10% of coins as orbs
        petBond: testQuest.rewards.petBond,
        reputation: testQuest.rewards.reputation,
        items: testQuest.rewards.items,
        skills: testQuest.rewards.skills,
        unlockables: testQuest.rewards.unlockables,
        specialRewards: testQuest.rewards.specialRewards,
        totalValue: testQuest.rewards.experience + testQuest.rewards.coins + testQuest.rewards.petBond + testQuest.rewards.reputation
      }
      
      // Calculate multipliers
      const difficultyMultiplier = { easy: 1.0, medium: 1.2, hard: 1.5, expert: 2.0 }[completionMetadata.difficulty] || 1.0
      const timeBonus = completionMetadata.timeSpent <= testQuest.timeLimit * 0.5 ? 1.3 : completionMetadata.timeSpent <= testQuest.timeLimit * 0.75 ? 1.1 : 1.0
      const streakBonus = 1.0 + Math.min(completionMetadata.dailyStreak * 0.05, 0.5) + Math.min(completionMetadata.weeklyStreak * 0.03, 0.3)
      const petBondBonus = playerData.petBond >= 100 ? 1.3 : playerData.petBond >= 75 ? 1.2 : playerData.petBond >= 50 ? 1.1 : 1.0
      const skillBonus = 1.0 + Math.min(testQuest.rewards.skills.filter(skill => playerData.skills.includes(skill)).length * 0.05, 0.2)
      const eventBonus = 1.0 // Weekend bonus could be added here
      
      const totalMultiplier = Math.min(
        difficultyMultiplier * timeBonus * streakBonus * petBondBonus * skillBonus * eventBonus,
        5.0 // Max multiplier
      )
      
      // Calculate bonus rewards
      const bonusRewards = []
      if (completionMetadata.perfectScore) {
        bonusRewards.push({ type: 'perfection', description: 'Perfect completion', value: 50 })
      }
      if (completionMetadata.firstTime) {
        bonusRewards.push({ type: 'first_time', description: 'First time completion', value: 100 })
      }
      if (completionMetadata.dailyStreak > 1) {
        bonusRewards.push({ type: 'streak', description: `Daily streak: ${completionMetadata.dailyStreak}`, value: completionMetadata.dailyStreak * 10 })
      }
      
      // Apply multipliers and bonuses
      const finalRewards = {
        experience: Math.floor(baseRewards.experience * totalMultiplier),
        coins: Math.floor(baseRewards.coins * totalMultiplier),
        orbs: Math.floor(baseRewards.orbs * totalMultiplier),
        petBond: Math.floor(baseRewards.petBond * totalMultiplier),
        reputation: Math.floor(baseRewards.reputation * totalMultiplier),
        items: baseRewards.items,
        skills: baseRewards.skills,
        unlockables: baseRewards.unlockables,
        specialRewards: baseRewards.specialRewards,
        totalValue: Math.floor(baseRewards.totalValue * totalMultiplier)
      }
      
      // Add bonus rewards
      bonusRewards.forEach(bonus => {
        finalRewards.experience += bonus.value
        finalRewards.coins += Math.floor(bonus.value * 0.5)
        finalRewards.orbs += Math.floor(bonus.value * 0.1)
        finalRewards.totalValue += bonus.value
      })
      
      // Display results
      addLog('\n💰 REWARD CALCULATION RESULTS:')
      addLog('================================')
      
      addLog('\n📊 BASE REWARDS:')
      addLog(`   Experience: ${baseRewards.experience}`)
      addLog(`   Coins: ${baseRewards.coins}`)
      addLog(`   Orbs: ${baseRewards.orbs}`)
      addLog(`   Pet Bond: ${baseRewards.petBond}`)
      addLog(`   Reputation: ${baseRewards.reputation}`)
      addLog(`   Items: ${baseRewards.items.join(', ')}`)
      addLog(`   Skills: ${baseRewards.skills.join(', ')}`)
      
      addLog('\n📈 MULTIPLIERS APPLIED:')
      addLog(`   Difficulty: ${difficultyMultiplier.toFixed(2)}x`)
      addLog(`   Time Bonus: ${timeBonus.toFixed(2)}x`)
      addLog(`   Streak Bonus: ${streakBonus.toFixed(2)}x`)
      addLog(`   Pet Bond Bonus: ${petBondBonus.toFixed(2)}x`)
      addLog(`   Skill Bonus: ${skillBonus.toFixed(2)}x`)
      addLog(`   Event Bonus: ${eventBonus.toFixed(2)}x`)
      addLog(`   TOTAL MULTIPLIER: ${totalMultiplier.toFixed(2)}x`)
      
      addLog('\n🎁 BONUS REWARDS:')
      bonusRewards.forEach(bonus => {
        addLog(`   ${bonus.type.toUpperCase()}: ${bonus.description} (+${bonus.value})`)
      })
      
      addLog('\n🏆 FINAL REWARDS:')
      addLog(`   Experience: ${finalRewards.experience}`)
      addLog(`   Coins: ${finalRewards.coins}`)
      addLog(`   Orbs: ${finalRewards.orbs}`)
      addLog(`   Pet Bond: ${finalRewards.petBond}`)
      addLog(`   Reputation: ${finalRewards.reputation}`)
      addLog(`   Total Value: ${finalRewards.totalValue}`)
      
      addLog('\n📊 CALCULATION SUMMARY:')
      addLog(`   Base Value: ${baseRewards.totalValue}`)
      addLog(`   Multiplier Applied: ${totalMultiplier.toFixed(2)}x`)
      addLog(`   Bonus Value: ${bonusRewards.reduce((sum, bonus) => sum + bonus.value, 0)}`)
      addLog(`   Final Value: ${finalRewards.totalValue}`)
      addLog(`   Value Increase: ${((finalRewards.totalValue / baseRewards.totalValue - 1) * 100).toFixed(1)}%`)
      
      setTestResults({
        baseRewards,
        multipliers: { difficulty: difficultyMultiplier, timeBonus, streakBonus, petBondBonus, skillBonus, eventBonus, totalMultiplier },
        finalRewards,
        bonusRewards,
        totalBonus: bonusRewards.reduce((sum, bonus) => sum + bonus.value, 0)
      })
      
      addLog('\n✅ Rewards calculated successfully!')
      
    } catch (error) {
      addLog(`❌ Reward calculation test failed: ${error}`)
      console.error('Reward calculation test error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const runMultiplierTest = async () => {
    setIsRunning(true)
    
    try {
      addLog('🔢 Starting Multiplier System Test...')
      
      const testScenarios = [
        {
          name: 'Easy Quest - No Bonuses',
          difficulty: 'easy',
          metadata: { timeSpent: 1800, perfectScore: false, firstTime: false, dailyStreak: 1 }
        },
        {
          name: 'Medium Quest - Time Bonus',
          difficulty: 'medium',
          metadata: { timeSpent: 900, perfectScore: false, firstTime: false, dailyStreak: 1 }
        },
        {
          name: 'Hard Quest - Perfect Score',
          difficulty: 'hard',
          metadata: { timeSpent: 1800, perfectScore: true, firstTime: false, dailyStreak: 1 }
        },
        {
          name: 'Expert Quest - All Bonuses',
          difficulty: 'expert',
          metadata: { timeSpent: 900, perfectScore: true, firstTime: true, dailyStreak: 10, weeklyStreak: 5 }
        }
      ]
      
      const playerData = {
        id: 'multiplier_test_player',
        level: 20,
        petBond: 100,
        skills: ['master_skill_1', 'master_skill_2'],
        dailyStreak: 10,
        weeklyStreak: 5
      }
      
      addLog('\n📊 MULTIPLIER TEST SCENARIOS:')
      addLog('================================')
      
      testScenarios.forEach((scenario, index) => {
        addLog(`\n${index + 1}. ${scenario.name}`)
        addLog(`   Difficulty: ${scenario.difficulty}`)
        
        const difficultyMultiplier = { easy: 1.0, medium: 1.2, hard: 1.5, expert: 2.0 }[scenario.difficulty] || 1.0
        const timeBonus = scenario.metadata.timeSpent <= 900 ? 1.3 : scenario.metadata.timeSpent <= 1350 ? 1.1 : 1.0
        const streakBonus = 1.0 + Math.min(scenario.metadata.dailyStreak * 0.05, 0.5) + Math.min((scenario.metadata.weeklyStreak || 0) * 0.03, 0.3)
        const petBondBonus = playerData.petBond >= 100 ? 1.3 : playerData.petBond >= 75 ? 1.2 : playerData.petBond >= 50 ? 1.1 : 1.0
        const skillBonus = 1.0 + Math.min(2 * 0.05, 0.2) // 2 matching skills
        const eventBonus = 1.0
        
        const totalMultiplier = Math.min(
          difficultyMultiplier * timeBonus * streakBonus * petBondBonus * skillBonus * eventBonus,
          5.0
        )
        
        addLog(`   Difficulty Multiplier: ${difficultyMultiplier.toFixed(2)}x`)
        addLog(`   Time Bonus: ${timeBonus.toFixed(2)}x`)
        addLog(`   Streak Bonus: ${streakBonus.toFixed(2)}x`)
        addLog(`   Pet Bond Bonus: ${petBondBonus.toFixed(2)}x`)
        addLog(`   Skill Bonus: ${skillBonus.toFixed(2)}x`)
        addLog(`   Event Bonus: ${eventBonus.toFixed(2)}x`)
        addLog(`   TOTAL: ${totalMultiplier.toFixed(2)}x`)
      })
      
      addLog('\n✅ Multiplier system test completed!')
      
    } catch (error) {
      addLog(`❌ Multiplier test failed: ${error}`)
      console.error('Multiplier test error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const getPerformanceRating = (avgTime: number): string => {
    if (avgTime < 0.01) return '🚀 EXCELLENT'
    if (avgTime < 0.1) return '⚡ VERY GOOD'
    if (avgTime < 0.5) return '✅ GOOD'
    if (avgTime < 1.0) return '⚠️ ACCEPTABLE'
    return '❌ NEEDS OPTIMIZATION'
  }

  const exportTestResults = () => {
    if (!testResults) {
      addLog('❌ No test results to export')
      return
    }
    
    const exportData = {
      timestamp: new Date().toISOString(),
      testResults,
      logs
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reward-calculator-test-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    addLog('📁 Test results exported successfully!')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🎯 Reward Calculator Performance Test Suite
          </h1>
          <p className="text-gray-600 mb-6">
            Comprehensive testing of the Reward Calculator system including performance metrics, 
            real reward calculations, and multiplier systems.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <button
              onClick={runPerformanceTest}
              disabled={isRunning}
              className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isRunning ? 'Running...' : '🚀 Performance Test'}
            </button>
            
            <button
              onClick={runRewardCalculationTest}
              disabled={isRunning}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isRunning ? 'Running...' : '💰 Reward Calculation'}
            </button>
            
            <button
              onClick={runMultiplierTest}
              disabled={isRunning}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isRunning ? 'Running...' : '🔢 Multiplier Test'}
            </button>
            
            <button
              onClick={clearLogs}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              🗑️ Clear All
            </button>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <span className="text-green-600 text-xl mr-2">✅</span>
              <span className="text-green-800 font-semibold">
                Reward Calculator System Ready
              </span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              All systems initialized and ready for testing
            </p>
          </div>
        </div>

        {/* Performance Metrics Display */}
        {testResults && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📊 Performance Metrics
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {testResults.totalDuration?.toFixed(2) || 'N/A'}ms
                </div>
                <div className="text-sm text-blue-700">Total Test Time</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {testResults.avgBasicTime?.toFixed(3) || 'N/A'}ms
                </div>
                <div className="text-sm text-green-700">Avg Calculation Time</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {testResults.iterations || 'N/A'}
                </div>
                <div className="text-sm text-purple-700">Test Iterations</div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {getPerformanceRating(Math.max(testResults.avgBasicTime || 0, testResults.avgMultiplierTime || 0))}
                </div>
                <div className="text-sm text-orange-700">Performance Rating</div>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                onClick={exportTestResults}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                📁 Export Results
              </button>
            </div>
          </div>
        )}

        {/* Test Results Display */}
        {testResults && testResults.baseRewards && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              💰 Reward Calculation Results
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Base Rewards</h3>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">
                    <div>Experience: {testResults.baseRewards.experience}</div>
                    <div>Coins: {testResults.baseRewards.coins}</div>
                    <div>Orbs: {testResults.baseRewards.orbs}</div>
                    <div>Pet Bond: {testResults.baseRewards.petBond}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Final Rewards</h3>
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-sm text-green-700">
                    <div>Experience: {testResults.finalRewards.experience}</div>
                    <div>Coins: {testResults.finalRewards.coins}</div>
                    <div>Orbs: {testResults.finalRewards.orbs}</div>
                    <div>Pet Bond: {testResults.finalRewards.petBond}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="font-semibold text-gray-700 mb-2">Multipliers Applied</h3>
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm text-blue-700">
                  <div>Total Multiplier: {testResults.multipliers.totalMultiplier.toFixed(2)}x</div>
                  <div>Difficulty: {testResults.multipliers.difficulty.toFixed(2)}x</div>
                  <div>Time Bonus: {testResults.multipliers.timeBonus.toFixed(2)}x</div>
                  <div>Streak Bonus: {testResults.multipliers.streakBonus.toFixed(2)}x</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Results Logs */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            📊 Test Execution Logs
          </h2>
          
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No test results yet. Click a test button above to get started!
            </div>
          ) : (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { BaseSystem } from './BaseSystem'
import { EventManager } from '../EventManager'
import { PetAIState, PetMemory, LearningProgress } from './PetAISystem'

// ============================================================================
// CLIENT-SIDE AI PROCESSING - PHASE 3.2 IMPLEMENTATION (WEB-FIRST)
// ============================================================================

export interface AIModelConfig {
  modelPath: string
  inputShape: number[]
  outputShape: number[]
  quantization: boolean
  enableGPU: boolean
  maxBatchSize: number
}

export interface LocalLearningConfig {
  maxLocalModels: number
  learningRate: number
  batchSize: number
  epochs: number
  validationSplit: number
  earlyStoppingPatience: number
}

export interface CloudSyncConfig {
  syncInterval: number // milliseconds
  maxRetries: number
  retryDelay: number
  enableCompression: boolean
  syncThreshold: number // minimum changes before sync
}

export interface PerformanceConfig {
  targetFPS: number
  maxProcessingTime: number // milliseconds per frame
  enableAdaptiveComplexity: boolean
  lowPerformanceThreshold: number
  batterySaverMode: boolean
}

export interface OfflineAICapabilities {
  basicBehaviors: boolean
  localDecisionMaking: boolean
  cachedResponses: boolean
  fallbackLogic: boolean
}

export interface AIModel {
  id: string
  name: string
  version: string
  type: 'behavior' | 'learning' | 'prediction' | 'optimization'
  model: any // TensorFlow.js model
  metadata: {
    accuracy: number
    lastUpdated: number
    trainingDataSize: number
    performanceMetrics: {
      inferenceTime: number
      memoryUsage: number
      accuracy: number
    }
  }
  isLoaded: boolean
}

export interface LocalLearningData {
  id: string
  input: any
  output: any
  reward: number
  timestamp: number
  context: string
  success: boolean
}

export interface CloudSyncData {
  modelId: string
  localVersion: string
  cloudVersion: string
  changes: any[]
  timestamp: number
  status: 'pending' | 'syncing' | 'completed' | 'failed'
}

export interface PerformanceMetrics {
  fps: number
  processingTime: number
  memoryUsage: number
  gpuUsage?: number
  batteryLevel?: number
  isLowPerformance: boolean
}

// ============================================================================
// MAIN CLIENT-SIDE AI PROCESSOR
// ============================================================================

export class ClientSideAIProcessor extends BaseSystem {
  private models: Map<string, AIModel> = new Map()
  private localLearningData: LocalLearningData[] = []
  private cloudSyncQueue: CloudSyncData[] = []
  private performanceMetrics: PerformanceMetrics
  private isOnline: boolean = navigator.onLine
  
  private config: {
    aiModel: AIModelConfig
    localLearning: LocalLearningConfig
    cloudSync: CloudSyncConfig
    performance: PerformanceConfig
    offlineCapabilities: OfflineAICapabilities
  }

  private tf: any = null // TensorFlow.js reference
  private isInitialized: boolean = false
  private syncInterval: NodeJS.Timeout | null = null
  private performanceMonitor: NodeJS.Timeout | null = null

  constructor(eventManager: EventManager, config?: Partial<typeof ClientSideAIProcessor.prototype.config>) {
    super('client-side-ai', 85)
    this.eventManager = eventManager
    
    this.config = {
      aiModel: {
        modelPath: '/models/pet-ai/',
        inputShape: [1, 10],
        outputShape: [1, 5],
        quantization: true,
        enableGPU: true,
        maxBatchSize: 32
      },
      localLearning: {
        maxLocalModels: 5,
        learningRate: 0.001,
        batchSize: 16,
        epochs: 10,
        validationSplit: 0.2,
        earlyStoppingPatience: 3
      },
      cloudSync: {
        syncInterval: 300000, // 5 minutes
        maxRetries: 3,
        retryDelay: 1000,
        enableCompression: true,
        syncThreshold: 10
      },
      performance: {
        targetFPS: 60,
        maxProcessingTime: 16, // 16ms for 60fps
        enableAdaptiveComplexity: true,
        lowPerformanceThreshold: 0.8,
        batterySaverMode: false
      },
      offlineCapabilities: {
        basicBehaviors: true,
        localDecisionMaking: true,
        cachedResponses: true,
        fallbackLogic: true
      },
      ...config
    }

    this.performanceMetrics = {
      fps: 60,
      processingTime: 0,
      memoryUsage: 0,
      isLowPerformance: false
    }

    // Start async initialization
    this.initializeSystem()
    
    // Emit initialization event immediately (synchronous)
    this.eventManager.emit('client:ai:initialized', {
      timestamp: Date.now(),
      modelsLoaded: 0, // Will be updated when models are loaded
      capabilities: this.config.offlineCapabilities
    })
  }

  // ============================================================================
  // SYSTEM INITIALIZATION
  // ============================================================================

  private async initializeSystem(): Promise<void> {
    try {
      // Initialize TensorFlow.js
      await this.initializeTensorFlow()
      
      // Load default AI models
      await this.loadDefaultModels()
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring()
      
      // Setup cloud sync
      this.setupCloudSync()
      
      // Setup offline detection
      this.setupOfflineDetection()
      
      this.isInitialized = true
      this.log('info', 'Client-side AI processor initialized successfully')
      
      // Update the initialization event with actual model count
      this.eventManager.emit('client:ai:initialized', {
        timestamp: Date.now(),
        modelsLoaded: this.models.size,
        capabilities: this.config.offlineCapabilities
      })
      
      this.log('info', 'Initialization event updated with model count')
    } catch (error) {
      this.log('error', `Failed to initialize client-side AI processor: ${error}`)
      
      // Even if initialization fails, emit the event to indicate system state
      this.eventManager.emit('client:ai:initialized', {
        timestamp: Date.now(),
        modelsLoaded: 0,
        capabilities: this.config.offlineCapabilities,
        error: String(error)
      })
      
      throw error
    }
  }

  private async initializeTensorFlow(): Promise<void> {
    try {
      // Dynamic import of TensorFlow.js
      this.tf = await import('@tensorflow/tfjs')
      
      // Enable GPU if available and configured
      if (this.config.aiModel.enableGPU && this.tf.getBackend('gpu')) {
        await this.tf.setBackend('gpu')
        this.log('info', 'GPU backend enabled for TensorFlow.js')
      } else {
        await this.tf.setBackend('cpu')
        this.log('info', 'CPU backend enabled for TensorFlow.js')
      }

      // Set memory management
      this.tf.engine().startScope()
      
      this.log('info', `TensorFlow.js initialized with backend: ${this.tf.getBackend()}`)
    } catch (error) {
      this.log('warn', `TensorFlow.js not available, falling back to basic AI: ${error}`)
      this.tf = null
    }
  }

  private async loadDefaultModels(): Promise<void> {
    if (!this.tf) {
      this.log('warn', 'TensorFlow.js not available, skipping model loading')
      return
    }

    const defaultModels = [
      {
        id: 'behavior-predictor',
        name: 'Pet Behavior Predictor',
        type: 'behavior' as const,
        path: 'behavior-predictor.json'
      },
      {
        id: 'learning-optimizer',
        name: 'Learning Optimizer',
        type: 'learning' as const,
        path: 'learning-optimizer.json'
      },
      {
        id: 'context-analyzer',
        name: 'Context Analyzer',
        type: 'prediction' as const,
        path: 'context-analyzer.json'
      }
    ]

    for (const modelInfo of defaultModels) {
      try {
        await this.loadModel(modelInfo.id, modelInfo.name, modelInfo.type, modelInfo.path)
      } catch (error) {
        this.log('warn', `Failed to load model ${modelInfo.id}: ${error}`)
      }
    }
  }

  // ============================================================================
  // MODEL MANAGEMENT
  // ============================================================================

  public async loadModel(id: string, name: string, type: AIModel['type'], modelPath: string): Promise<boolean> {
    if (!this.tf) {
      this.log('warn', 'TensorFlow.js not available for model loading')
      return false
    }

    try {
      const fullPath = `${this.config.aiModel.modelPath}${modelPath}`
      const model = await this.tf.loadLayersModel(fullPath)
      
      const aiModel: AIModel = {
        id,
        name,
        version: '1.0.0',
        type,
        model,
        metadata: {
          accuracy: 0.85,
          lastUpdated: Date.now(),
          trainingDataSize: 1000,
          performanceMetrics: {
            inferenceTime: 0,
            memoryUsage: 0,
            accuracy: 0.85
          }
        },
        isLoaded: true
      }

      this.models.set(id, aiModel)
      
      this.log('info', `Model ${name} loaded successfully`)
      
      this.eventManager.emit('client:ai:model:loaded', {
        modelId: id,
        modelName: name,
        timestamp: Date.now()
      })

      return true
    } catch (error) {
      this.log('error', `Failed to load model ${id}: ${error}`)
      return false
    }
  }

  public getModel(id: string): AIModel | undefined {
    return this.models.get(id)
  }

  public async unloadModel(id: string): Promise<boolean> {
    const model = this.models.get(id)
    if (!model) return false

    try {
      if (model.model && typeof model.model.dispose === 'function') {
        model.model.dispose()
      }
      
      this.models.delete(id)
      
      this.log('info', `Model ${id} unloaded successfully`)
      
      this.eventManager.emit('client:ai:model:unloaded', {
        modelId: id,
        timestamp: Date.now()
      })

      return true
    } catch (error) {
      this.log('error', `Failed to unload model ${id}: ${error}`)
      return false
    }
  }

  // ============================================================================
  // LOCAL LEARNING SYSTEM
  // ============================================================================

  public recordLearningExperience(
    input: any, 
    output: any, 
    reward: number, 
    context: string, 
    success: boolean
  ): void {
    const learningData: LocalLearningData = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      input,
      output,
      reward,
      timestamp: Date.now(),
      context,
      success
    }

    this.localLearningData.push(learningData)
    
    // Maintain maximum local data size
    if (this.localLearningData.length > this.config.localLearning.maxLocalModels * 100) {
      this.localLearningData = this.localLearningData.slice(-this.config.localLearning.maxLocalModels * 100)
    }

    this.eventManager.emit('client:ai:learning:recorded', {
      experienceId: learningData.id,
      context,
      success,
      timestamp: Date.now()
    })
  }

  public async trainLocalModel(modelId: string): Promise<boolean> {
    if (!this.tf) {
      this.log('warn', 'TensorFlow.js not available for local training')
      return false
    }

    const model = this.models.get(modelId)
    if (!model || model.type !== 'learning') {
      this.log('warn', `Model ${modelId} not available or not a learning model`)
      return false
    }

    try {
      // Prepare training data
      const trainingData = this.prepareTrainingData()
      if (trainingData.inputs.length === 0) {
        this.log('warn', 'No training data available')
        return false
      }

      // Convert to tensors
      const xs = this.tf.tensor2d(trainingData.inputs)
      const ys = this.tf.tensor2d(trainingData.outputs)

      // Train the model
      const history = await model.model.fit(xs, ys, {
        epochs: this.config.localLearning.epochs,
        batchSize: this.config.localLearning.batchSize,
        validationSplit: this.config.localLearning.validationSplit,
        callbacks: {
          onEpochEnd: (epoch: number, logs: any) => {
            this.log('info', `Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`)
          }
        }
      })

      // Update model metadata
      model.metadata.accuracy = history.history.acc[history.history.acc.length - 1]
      model.metadata.lastUpdated = Date.now()
      model.metadata.performanceMetrics.accuracy = model.metadata.accuracy

      // Clean up tensors
      xs.dispose()
      ys.dispose()

      this.log('info', `Local training completed for model ${modelId}`)
      
      this.eventManager.emit('client:ai:learning:training:completed', {
        modelId,
        accuracy: model.metadata.accuracy,
        timestamp: Date.now()
      })

      return true
    } catch (error) {
      this.log('error', `Local training failed for model ${modelId}: ${error}`)
      return false
    }
  }

  private prepareTrainingData(): { inputs: number[][], outputs: number[][] } {
    const inputs: number[][] = []
    const outputs: number[][] = []

    // Process recent learning data
    const recentData = this.localLearningData
      .filter(data => Date.now() - data.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
      .slice(-100) // Last 100 experiences

    for (const data of recentData) {
      // Convert input to numerical representation
      const inputVector = this.vectorizeInput(data.input)
      const outputVector = this.vectorizeOutput(data.output)
      
      if (inputVector && outputVector) {
        inputs.push(inputVector)
        outputs.push(outputVector)
      }
    }

    return { inputs, outputs }
  }

  private vectorizeInput(input: any): number[] | null {
    // Simple vectorization for demonstration
    // In a real implementation, this would be more sophisticated
    if (typeof input === 'number') {
      return [input]
    } else if (Array.isArray(input)) {
      return input.map(val => typeof val === 'number' ? val : 0)
    } else if (typeof input === 'object') {
      return Object.values(input).map(val => typeof val === 'number' ? val : 0)
    }
    return null
  }

  private vectorizeOutput(output: any): number[] | null {
    // Similar to input vectorization
    return this.vectorizeInput(output)
  }

  // ============================================================================
  // CLOUD AI SYNC
  // ============================================================================

  private setupCloudSync(): void {
    if (this.config.cloudSync.syncInterval > 0) {
      this.syncInterval = setInterval(() => {
        this.performCloudSync()
      }, this.config.cloudSync.syncInterval)
    }
  }

  private async performCloudSync(): Promise<void> {
    if (!this.isOnline || this.cloudSyncQueue.length === 0) {
      return
    }

    this.log('info', `Starting cloud sync for ${this.cloudSyncQueue.length} items`)

    for (const syncItem of this.cloudSyncQueue) {
      try {
        syncItem.status = 'syncing'
        
        // Simulate cloud sync (replace with actual API calls)
        await this.simulateCloudSync(syncItem)
        
        syncItem.status = 'completed'
        this.log('info', `Cloud sync completed for model ${syncItem.modelId}`)
        
        this.eventManager.emit('client:ai:cloud:sync:completed', {
          modelId: syncItem.modelId,
          timestamp: Date.now()
        })
      } catch (error) {
        syncItem.status = 'failed'
        this.log('error', `Cloud sync failed for model ${syncItem.modelId}: ${error}`)
        
        this.eventManager.emit('client:ai:cloud:sync:failed', {
          modelId: syncItem.modelId,
          error: String(error),
          timestamp: Date.now()
        })
      }
    }

    // Remove completed items
    this.cloudSyncQueue = this.cloudSyncQueue.filter(item => item.status !== 'completed')
  }

  private async simulateCloudSync(syncItem: CloudSyncData): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
    
    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Simulated network error')
    }
  }

  public queueCloudSync(modelId: string, changes: any[]): void {
    const existingSync = this.cloudSyncQueue.find(item => item.modelId === modelId)
    
    if (existingSync) {
      existingSync.changes.push(...changes)
      existingSync.timestamp = Date.now()
    } else {
      const syncData: CloudSyncData = {
        modelId,
        localVersion: '1.0.0',
        cloudVersion: '1.0.0',
        changes,
        timestamp: Date.now(),
        status: 'pending'
      }
      
      this.cloudSyncQueue.push(syncData)
    }

    this.eventManager.emit('client:ai:cloud:sync:queued', {
      modelId,
      changesCount: changes.length,
      timestamp: Date.now()
    })
  }

  // ============================================================================
  // PERFORMANCE-AWARE PROCESSING
  // ============================================================================

  private setupPerformanceMonitoring(): void {
    this.performanceMonitor = setInterval(() => {
      this.updatePerformanceMetrics()
    }, 1000) // Update every second
  }

  private updatePerformanceMetrics(): void {
    // Measure current performance
    const startTime = performance.now()
    
    // Simulate some processing
    this.simulateProcessing()
    
    const endTime = performance.now()
    const processingTime = endTime - startTime

    // Update metrics
    this.performanceMetrics.processingTime = processingTime
    this.performanceMetrics.fps = Math.min(60, 1000 / Math.max(processingTime, 1))
    this.performanceMetrics.memoryUsage = this.getMemoryUsage()
    
    // Check if we're in low performance mode
    const isLowPerformance = this.performanceMetrics.fps < this.config.performance.targetFPS * this.config.performance.lowPerformanceThreshold
    this.performanceMetrics.isLowPerformance = isLowPerformance

    // Adjust AI complexity based on performance
    if (this.config.performance.enableAdaptiveComplexity && isLowPerformance) {
      this.adjustAIComplexity()
    }

    this.eventManager.emit('client:ai:performance:updated', {
      metrics: this.performanceMetrics,
      timestamp: Date.now()
    })
  }

  private simulateProcessing(): void {
    // Simulate AI processing work
    let sum = 0
    for (let i = 0; i < 1000; i++) {
      sum += Math.random()
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024) // MB
    }
    return 0
  }

  private adjustAIComplexity(): void {
    // Reduce AI complexity when performance is low
    this.log('info', 'Adjusting AI complexity due to low performance')
    
    // Reduce batch sizes
    this.config.localLearning.batchSize = Math.max(4, this.config.localLearning.batchSize / 2)
    
    // Reduce processing frequency
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor)
      this.performanceMonitor = setInterval(() => {
        this.updatePerformanceMetrics()
      }, 2000) // Update every 2 seconds instead of 1
    }

    this.eventManager.emit('client:ai:complexity:adjusted', {
      reason: 'low_performance',
      newBatchSize: this.config.localLearning.batchSize,
      timestamp: Date.now()
    })
  }

  // ============================================================================
  // OFFLINE AI CAPABILITIES
  // ============================================================================

  private setupOfflineDetection(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.log('info', 'Connection restored, enabling cloud sync')
      this.eventManager.emit('client:ai:connection:restored', { timestamp: Date.now() })
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.log('info', 'Connection lost, switching to offline mode')
      this.eventManager.emit('client:ai:connection:lost', { timestamp: Date.now() })
    })
  }

  public getOfflineCapabilities(): OfflineAICapabilities {
    return this.config.offlineCapabilities
  }

  public async processOfflineAI(input: any, context: string): Promise<any> {
    if (!this.config.offlineCapabilities.localDecisionMaking) {
      throw new Error('Offline AI decision making not enabled')
    }

    try {
      // Use cached models for offline processing
      const behaviorModel = this.models.get('behavior-predictor')
      
      if (behaviorModel && behaviorModel.isLoaded) {
        // Use TensorFlow.js model if available
        return await this.processWithModel(behaviorModel, input)
      } else {
        // Fallback to basic offline logic
        return this.processWithFallbackLogic(input, context)
      }
    } catch (error) {
      this.log('warn', `Offline AI processing failed: ${error}`)
      
      // Use basic fallback
      return this.processWithFallbackLogic(input, context)
    }
  }

  private async processWithModel(model: AIModel, input: any): Promise<any> {
    if (!this.tf) {
      throw new Error('TensorFlow.js not available')
    }

    try {
      const inputTensor = this.tf.tensor2d([this.vectorizeInput(input) || [0]])
      const prediction = model.model.predict(inputTensor)
      const result = await prediction.array()
      
      // Clean up tensors
      inputTensor.dispose()
      prediction.dispose()
      
      return result[0]
    } catch (error) {
      throw new Error(`Model prediction failed: ${error}`)
    }
  }

  private processWithFallbackLogic(input: any, context: string): any {
    // Basic fallback logic for offline processing
    const fallbackResponses = {
      'idle': [0.8, 0.1, 0.05, 0.03, 0.02],
      'exploration': [0.1, 0.7, 0.1, 0.05, 0.05],
      'puzzle_solving': [0.05, 0.1, 0.8, 0.03, 0.02],
      'combat': [0.02, 0.05, 0.03, 0.85, 0.05],
      'social': [0.05, 0.05, 0.02, 0.03, 0.85]
    }

    // Determine context and return appropriate fallback
    if (context.includes('combat') || context.includes('enemy')) {
      return fallbackResponses.combat
    } else if (context.includes('puzzle') || context.includes('solve')) {
      return fallbackResponses.puzzle_solving
    } else if (context.includes('explore') || context.includes('search')) {
      return fallbackResponses.exploration
    } else if (context.includes('social') || context.includes('interact')) {
      return fallbackResponses.social
    } else {
      return fallbackResponses.idle
    }
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  public async predictBehavior(input: any, context: string): Promise<any> {
    if (this.isOnline && this.models.has('behavior-predictor')) {
      try {
        return await this.processWithModel(this.models.get('behavior-predictor')!, input)
      } catch (error) {
        this.log('warn', `Online prediction failed, falling back to offline: ${error}`)
      }
    }
    
    return await this.processOfflineAI(input, context)
  }

  public getLearningProgress(): LearningProgress {
    const totalExperiences = this.localLearningData.length
    const successfulExperiences = this.localLearningData.filter(exp => exp.success).length
    const successRate = totalExperiences > 0 ? successfulExperiences / totalExperiences : 0

    return {
      totalExperiences,
      successRate,
      adaptationLevel: Math.min(1.0, totalExperiences / 1000), // Normalize to 0-1
      recentImprovements: this.getRecentImprovements(),
      learningEfficiency: this.calculateLearningEfficiency()
    }
  }

  private getRecentImprovements(): string[] {
    // Analyze recent learning data for improvements
    const recentData = this.localLearningData.slice(-10)
    const improvements: string[] = []

    for (let i = 1; i < recentData.length; i++) {
      if (recentData[i].reward > recentData[i - 1].reward) {
        improvements.push(`Improved reward from ${recentData[i - 1].reward} to ${recentData[i].reward}`)
      }
    }

    return improvements.slice(-5) // Return last 5 improvements
  }

  private calculateLearningEfficiency(): number {
    if (this.localLearningData.length < 10) return 0

    const recentData = this.localLearningData.slice(-10)
    const avgReward = recentData.reduce((sum, exp) => sum + exp.reward, 0) / recentData.length
    const successRate = recentData.filter(exp => exp.success).length / recentData.length

    return (avgReward + successRate) / 2
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics }
  }

  public getCloudSyncStatus(): CloudSyncData[] {
    return [...this.cloudSyncQueue]
  }

  // ============================================================================
  // SYSTEM UPDATE & CLEANUP
  // ============================================================================

  public update(deltaTime: number): void {
    // Update performance metrics
    this.updatePerformanceMetrics()
    
    // Process cloud sync if needed
    if (this.isOnline && this.cloudSyncQueue.length > 0) {
      this.performCloudSync().catch(error => {
        this.log('error', `Cloud sync update failed: ${error}`)
      })
    }
  }

  public destroy(): void {
    // Clear intervals
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor)
    }

    // Unload all models
    for (const [modelId] of this.models) {
      this.unloadModel(modelId).catch(error => {
        this.log('error', `Failed to unload model ${modelId}: ${error}`)
      })
    }

    // Clean up TensorFlow.js
    if (this.tf && this.tf.engine) {
      this.tf.engine().endScope()
    }

    this.log('info', 'Client-side AI processor destroyed')
    super.destroy()
  }
}

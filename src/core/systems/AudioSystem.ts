import { BaseSystem } from './BaseSystem'

export interface AudioClip {
  id: string
  url: string
  type: 'sound' | 'music'
  volume: number
  loop: boolean
  preload: boolean
  duration?: number
}

export interface AudioInstance {
  id: string
  clipId: string
  audio: HTMLAudioElement
  volume: number
  isPlaying: boolean
  startTime: number
  loop: boolean
}

export interface AudioListener {
  position: Vector2
  velocity: Vector2
}

export interface Vector2 {
  x: number
  y: number
}

export interface AudioSettings {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  enableAudio: boolean
  enableMusic: boolean
  enableSFX: boolean
}

export class AudioSystem extends BaseSystem {
  private clips: Map<string, AudioClip> = new Map()
  private instances: Map<string, AudioInstance> = new Map()
  private listener: AudioListener
  private settings: AudioSettings
  private audioContext: AudioContext | null = null
  private gainNodes: Map<string, GainNode> = new Map()
  private isInitialized: boolean = false
  private isMuted: boolean = false

  constructor() {
    super('AudioSystem', 5) // Lowest priority
    
    this.listener = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 }
    }

    this.settings = {
      masterVolume: 1.0,
      musicVolume: 0.8,
      sfxVolume: 1.0,
      enableAudio: true,
      enableMusic: true,
      enableSFX: true
    }
  }

  initialize(): void {
    super.initialize()
    this.setupAudioContext()
    this.loadDefaultAudio()
    this.isInitialized = true
    this.log('Audio system initialized')
  }

  destroy(): void {
    super.destroy()
    this.cleanupAudio()
    this.isInitialized = false
    this.log('Audio system destroyed')
  }

  update(deltaTime: number): void {
    if (!this.isActive || !this.isInitialized) return

    try {
      // Update audio instances
      this.updateAudioInstances(deltaTime)
      
      // Update spatial audio
      this.updateSpatialAudio()
      
      // Clean up finished instances
      this.cleanupFinishedInstances()
      
    } catch (error) {
      this.log(`Error updating audio system: ${error}`, 'error')
    }
  }

  private setupAudioContext(): void {
    try {
      // Create Web Audio API context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Create master gain node
      const masterGain = this.audioContext.createGain()
      masterGain.connect(this.audioContext.destination)
      this.gainNodes.set('master', masterGain)
      
      // Create music and SFX gain nodes
      const musicGain = this.audioContext.createGain()
      const sfxGain = this.audioContext.createGain()
      
      musicGain.connect(masterGain)
      sfxGain.connect(masterGain)
      
      this.gainNodes.set('music', musicGain)
      this.gainNodes.set('sfx', sfxGain)
      
      this.log('Web Audio API context initialized')
      
    } catch (error) {
      this.log(`Web Audio API not supported, falling back to HTML5 Audio: ${error}`, 'warn')
      this.audioContext = null
    }
  }

  private loadDefaultAudio(): void {
    // Load default audio clips
    this.loadClip({
      id: 'background-music',
      url: '/assets/audio/background-music.mp3',
      type: 'music',
      volume: 0.6,
      loop: true,
      preload: true
    })

    this.loadClip({
      id: 'click-sound',
      url: '/assets/audio/click.mp3',
      type: 'sound',
      volume: 0.8,
      loop: false,
      preload: true
    })

    this.loadClip({
      id: 'success-sound',
      url: '/assets/audio/success.mp3',
      type: 'sound',
      volume: 1.0,
      loop: false,
      preload: true
    })

    this.log('Default audio clips loaded')
  }

  private updateAudioInstances(deltaTime: number): void {
    this.instances.forEach(instance => {
      if (instance.isPlaying && instance.audio.ended && !instance.loop) {
        instance.isPlaying = false
      }
    })
  }

  private updateSpatialAudio(): void {
    // Update spatial audio based on listener position
    // This is a simplified implementation
    this.instances.forEach(instance => {
      // Calculate distance-based volume for spatial audio
      // In a real implementation, this would use Web Audio API spatialization
    })
  }

  private cleanupFinishedInstances(): void {
    const finishedInstances: string[] = []
    
    this.instances.forEach((instance, id) => {
      if (!instance.isPlaying && instance.audio.ended) {
        finishedInstances.push(id)
      }
    })

    finishedInstances.forEach(id => {
      this.stopInstance(id)
    })
  }

  public loadClip(clip: AudioClip): void {
    this.clips.set(clip.id, clip)
    
    if (clip.preload) {
      this.preloadClip(clip)
    }
    
    this.log(`Audio clip loaded: ${clip.id}`)
  }

  private preloadClip(clip: AudioClip): void {
    const audio = new Audio()
    audio.preload = 'auto'
    
    audio.addEventListener('canplaythrough', () => {
      this.log(`Audio clip preloaded: ${clip.id}`)
    })
    
    audio.addEventListener('error', (error) => {
      this.log(`Error preloading audio clip ${clip.id}: ${error}`, 'error')
    })
    
    audio.src = clip.url
  }

  public play(clipId: string, options?: Partial<AudioInstance>): string | null {
    const clip = this.clips.get(clipId)
    if (!clip) {
      this.log(`Audio clip not found: ${clipId}`, 'error')
      return null
    }

    // Check if audio is enabled
    if (!this.settings.enableAudio) return null
    if (clip.type === 'music' && !this.settings.enableMusic) return null
    if (clip.type === 'sound' && !this.settings.enableSFX) return null

    try {
      let audio: HTMLAudioElement
      
      if (this.audioContext && this.audioContext.state === 'running') {
        // Use Web Audio API
        audio = this.createWebAudioInstance(clip, options)
      } else {
        // Fallback to HTML5 Audio
        audio = this.createHTML5AudioInstance(clip, options)
      }

      const instanceId = `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const instance: AudioInstance = {
        id: instanceId,
        clipId: clip.id,
        audio,
        volume: options?.volume ?? clip.volume,
        isPlaying: true,
        startTime: Date.now(),
        loop: options?.loop ?? clip.loop
      }

      this.instances.set(instanceId, instance)
      
      // Set volume
      this.setInstanceVolume(instanceId, instance.volume)
      
      // Play audio
      audio.play().catch(error => {
        this.log(`Error playing audio ${clipId}: ${error}`, 'error')
        instance.isPlaying = false
      })

      this.log(`Playing audio: ${clip.id}`)
      return instanceId
      
    } catch (error) {
      this.log(`Error creating audio instance for ${clipId}: ${error}`, 'error')
      return null
    }
  }

  private createWebAudioInstance(clip: AudioClip, options?: Partial<AudioInstance>): HTMLAudioElement {
    // For Web Audio API, we still need an HTMLAudioElement for the source
    const audio = new Audio(clip.url)
    
    if (options?.loop !== undefined) {
      audio.loop = options.loop
    } else {
      audio.loop = clip.loop
    }
    
    return audio
  }

  private createHTML5AudioInstance(clip: AudioClip, options?: Partial<AudioInstance>): HTMLAudioElement {
    const audio = new Audio(clip.url)
    
    if (options?.loop !== undefined) {
      audio.loop = options.loop
    } else {
      audio.loop = clip.loop
    }
    
    return audio
  }

  public stopInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId)
    if (instance) {
      instance.audio.pause()
      instance.audio.currentTime = 0
      instance.isPlaying = false
      this.instances.delete(instanceId)
      
      this.log(`Stopped audio instance: ${instanceId}`)
      return true
    }
    return false
  }

  public stopAll(): void {
    this.instances.forEach(instance => {
      instance.audio.pause()
      instance.audio.currentTime = 0
      instance.isPlaying = false
    })
    
    this.instances.clear()
    this.log('Stopped all audio instances')
  }

  public pauseInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId)
    if (instance && instance.isPlaying) {
      instance.audio.pause()
      instance.isPlaying = false
      this.log(`Paused audio instance: ${instanceId}`)
      return true
    }
    return false
  }

  public resumeInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId)
    if (instance && !instance.isPlaying) {
      instance.audio.play().catch(error => {
        this.log(`Error resuming audio ${instanceId}: ${error}`, 'error')
      })
      instance.isPlaying = true
      this.log(`Resumed audio instance: ${instanceId}`)
      return true
    }
    return false
  }

  public setInstanceVolume(instanceId: string, volume: number): void {
    const instance = this.instances.get(instanceId)
    if (instance) {
      const clip = this.clips.get(instance.clipId)
      if (clip) {
        const finalVolume = volume * this.settings.masterVolume * 
          (clip.type === 'music' ? this.settings.musicVolume : this.settings.sfxVolume)
        
        instance.audio.volume = Math.max(0, Math.min(1, finalVolume))
        instance.volume = volume
      }
    }
  }

  public setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume))
    this.updateAllVolumes()
    this.log(`Master volume set to: ${volume}`)
  }

  public setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume))
    this.updateAllVolumes()
    this.log(`Music volume set to: ${volume}`)
  }

  public setSFXVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume))
    this.updateAllVolumes()
    this.log(`SFX volume set to: ${volume}`)
  }

  private updateAllVolumes(): void {
    this.instances.forEach(instance => {
      this.setInstanceVolume(instance.id, instance.volume)
    })
  }

  public setListenerPosition(position: Vector2): void {
    this.listener.position = position
  }

  public setListenerVelocity(velocity: Vector2): void {
    this.listener.velocity = velocity
  }

  public mute(): void {
    this.isMuted = true
    this.instances.forEach(instance => {
      instance.audio.muted = true
    })
    this.log('Audio muted')
  }

  public unmute(): void {
    this.isMuted = false
    this.instances.forEach(instance => {
      instance.audio.muted = false
    })
    this.log('Audio unmuted')
  }

  public isAudioEnabled(): boolean {
    return this.settings.enableAudio && !this.isMuted
  }

  public getAudioSettings(): AudioSettings {
    return { ...this.settings }
  }

  public getActiveInstances(): AudioInstance[] {
    return Array.from(this.instances.values()).filter(instance => instance.isPlaying)
  }

  public getClip(clipId: string): AudioClip | undefined {
    return this.clips.get(clipId)
  }

  public getAllClips(): AudioClip[] {
    return Array.from(this.clips.values())
  }

  public getInstance(instanceId: string): AudioInstance | undefined {
    return this.instances.get(instanceId)
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext
  }

  private cleanupAudio(): void {
    this.stopAll()
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.gainNodes.clear()
  }
} 

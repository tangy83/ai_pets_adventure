import { Component } from './EntityComponentSystem'

/**
 * ComponentRegistry - Centralized component type management
 * Ensures type safety and provides component creation utilities
 */
export class ComponentRegistry {
  private static instance: ComponentRegistry
  private componentTypes: Map<string, new (entityId: string, ...args: any[]) => Component> = new Map()
  private componentValidators: Map<string, (component: Component) => boolean> = new Map()

  private constructor() {
    this.registerDefaultComponents()
  }

  public static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry()
    }
    return ComponentRegistry.instance
  }

  /**
   * Register a component type with optional validation
   */
  public registerComponentType<T extends Component>(
    type: string,
    constructor: new (entityId: string, ...args: any[]) => T,
    validator?: (component: T) => boolean
  ): void {
    this.componentTypes.set(type, constructor)
    if (validator) {
      this.componentValidators.set(type, validator as (component: Component) => boolean)
    }
  }

  /**
   * Create a component instance of the specified type
   */
  public createComponent<T extends Component>(
    type: string,
    entityId: string,
    ...args: any[]
  ): T | null {
    const Constructor = this.componentTypes.get(type)
    if (!Constructor) {
      console.error(`Component type '${type}' not registered`)
      return null
    }

    try {
      const component = new Constructor(entityId, ...args) as T
      
      // Validate component if validator exists
      const validator = this.componentValidators.get(type)
      if (validator && !validator(component)) {
        console.error(`Component validation failed for type '${type}'`)
        return null
      }

      return component
    } catch (error) {
      console.error(`Failed to create component of type '${type}':`, error)
      return null
    }
  }

  /**
   * Check if a component type is registered
   */
  public hasComponentType(type: string): boolean {
    return this.componentTypes.has(type)
  }

  /**
   * Get all registered component types
   */
  public getRegisteredTypes(): string[] {
    return Array.from(this.componentTypes.keys())
  }

  /**
   * Get component constructor for a type
   */
  public getComponentConstructor(type: string): (new (entityId: string, ...args: any[]) => Component) | undefined {
    return this.componentTypes.get(type)
  }

  /**
   * Validate a component instance
   */
  public validateComponent(component: Component): boolean {
    const validator = this.componentValidators.get(component.type)
    if (!validator) return true // No validator means always valid
    return validator(component)
  }

  /**
   * Register default component types
   */
  private registerDefaultComponents(): void {
    // Import and register all default components
    // This will be populated as components are implemented
  }

  /**
   * Clear all registered components (for testing)
   */
  public clear(): void {
    this.componentTypes.clear()
    this.componentValidators.clear()
  }
} 

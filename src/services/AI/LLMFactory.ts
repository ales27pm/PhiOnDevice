import { LLMProvider, LLMConfig } from './LLMProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { OnDeviceProvider } from './OnDeviceProvider';

/**
 * LLM Provider Types
 */
export type LLMProviderType = 'openai' | 'local';

/**
 * LLM Factory - Abstract Factory Pattern Implementation
 * 
 * This factory manages the creation and switching between different LLM providers.
 * It enables seamless AI model switching while maintaining a consistent interface.
 */
export class LLMFactory {
  private static instance: LLMFactory;
  private providers: Map<LLMProviderType, LLMProvider> = new Map();
  private currentProvider: LLMProvider | null = null;
  private defaultProviderType: LLMProviderType = 'local';

  private constructor() {}

  /**
   * Singleton instance getter
   */
  static getInstance(): LLMFactory {
    if (!LLMFactory.instance) {
      LLMFactory.instance = new LLMFactory();
    }
    return LLMFactory.instance;
  }

  /**
   * Create or get a provider instance
   */
  async createProvider(type: LLMProviderType, config?: LLMConfig): Promise<LLMProvider> {
    let provider = this.providers.get(type);
    
    if (!provider) {
      switch (type) {
        case 'openai':
          provider = new OpenAIProvider(config);
          break;
        case 'local':
          provider = new OnDeviceProvider();
          break;
        default:
          throw new Error(`Unsupported provider type: ${type}`);
      }
      
      this.providers.set(type, provider);
    }
    
    return provider;
  }

  /**
   * Set the active provider
   */
  async setActiveProvider(type: LLMProviderType, config?: LLMConfig): Promise<void> {
    const provider = await this.createProvider(type, config);
    
    // Check if provider is available before setting it as active
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      console.warn(`Provider ${type} is not available, will try to use fallback when needed`);
      // Don't throw error, just set the provider and let it handle graceful degradation
    }
    
    this.currentProvider = provider;
  }

  /**
   * Get the current active provider
   */
  async getCurrentProvider(): Promise<LLMProvider> {
    if (!this.currentProvider) {
      // Try to set default provider, fallback to best available if it fails
      try {
        await this.setActiveProvider(this.defaultProviderType);
      } catch (error) {
        console.warn(`LLMFactory: Failed to set default provider (${this.defaultProviderType}), switching to best available:`, error);
        await this.switchToBestAvailableProvider();
      }
    }
    return this.currentProvider!;
  }

  /**
   * Get a specific provider without setting it as active
   */
  async getProvider(type: LLMProviderType, config?: LLMConfig): Promise<LLMProvider> {
    return this.createProvider(type, config);
  }

  /**
   * Switch to the best available provider
   */
  async switchToBestAvailableProvider(): Promise<LLMProvider> {
    const providerTypes: LLMProviderType[] = ['local', 'openai'];
    
    for (const type of providerTypes) {
      try {
        const provider = await this.createProvider(type);
        const isAvailable = await provider.isAvailable();
        
        if (isAvailable) {
          this.currentProvider = provider;
          console.log(`LLMFactory: Switched to ${type} provider`);
          return provider;
        } else {
          console.warn(`LLMFactory: ${type} provider is not available`);
        }
      } catch (error) {
        console.warn(`LLMFactory: Failed to check availability for ${type} provider:`, error);
      }
    }
    
    // If no providers are available, force use of local provider as fallback
    console.warn('LLMFactory: No providers available, forcing local provider as fallback');
    const localProvider = await this.createProvider('local');
    this.currentProvider = localProvider;
    return localProvider;
  }

  /**
   * Get all available provider types
   */
  getAvailableProviderTypes(): LLMProviderType[] {
    return ['openai', 'local'];
  }

  /**
   * Check availability of all providers
   */
  async checkAllProvidersAvailability(): Promise<Record<LLMProviderType, boolean>> {
    const results: Record<LLMProviderType, boolean> = {} as any;
    
    for (const type of this.getAvailableProviderTypes()) {
      try {
        const provider = await this.createProvider(type);
        results[type] = await provider.isAvailable();
      } catch (error) {
        results[type] = false;
      }
    }
    
    return results;
  }

  /**
   * Set default provider type
   */
  setDefaultProvider(type: LLMProviderType): void {
    this.defaultProviderType = type;
  }

  /**
   * Get current provider type
   */
  getCurrentProviderType(): LLMProviderType | null {
    return this.currentProvider?.providerId as LLMProviderType || null;
  }

  /**
   * Reset factory (for testing)
   */
  reset(): void {
    this.providers.clear();
    this.currentProvider = null;
  }
}

/**
 * Convenience function to get the factory instance
 */
export const getLLMFactory = () => LLMFactory.getInstance();
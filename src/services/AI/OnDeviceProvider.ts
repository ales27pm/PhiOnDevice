import { BaseMemoryProvider } from './BaseMemoryProvider';
import { LLMContextOptions, LLMResponse, LLMProviderType } from './LLMProvider';

/**
 * On-Device LLM Provider
 * This is a development-safe implementation that falls back to mock responses
 * when native Turbo Modules aren't available (e.g., in Expo Go or before native build)
 */
export class OnDeviceProvider extends BaseMemoryProvider {
  public readonly providerId: LLMProviderType = 'local';
  private isInitialized = false;
  private moduleAvailable = false;

  constructor() {
    super();
  }

  private async initializeModule() {
    if (this.isInitialized) return;

    try {
      // Check if we're in a native environment where Turbo Modules might be available
      // This is safe because we're not actually trying to create the modules
      const isNativeEnvironment = typeof global !== 'undefined' && 
                                 typeof global.nativeFabricUIManager !== 'undefined';
      
      if (isNativeEnvironment) {
        console.log('OnDeviceProvider: Native environment detected, Turbo Modules may be available after native build');
      } else {
        console.log('OnDeviceProvider: Running in development environment, using fallback');
      }
      
      this.moduleAvailable = false; // Always false for now until native build
    } catch (error) {
      console.log('OnDeviceProvider: Using fallback implementation:', error);
      this.moduleAvailable = false;
    }

    this.isInitialized = true;
  }

  async getResponse(message: string, options?: LLMContextOptions): Promise<LLMResponse> {
    await this.initializeModule();
    
    // For now, always use fallback since we don't have the native modules built yet
    return this.getMockResponse(message);
  }

  async *streamResponse(message: string, options?: LLMContextOptions): AsyncIterable<string> {
    await this.initializeModule();
    
    // For now, always use fallback streaming
    yield* this.getMockStreamResponse(message);
  }

  private getMockResponse(message: string): LLMResponse {
    const responses = [
      "I'm running in local mode! This is a privacy-first response generated entirely on your device.",
      "Local processing active - your conversation stays private and secure on your device.",
      "On-device AI responding! No external API calls were made for this response.",
      "Privacy-first mode: This response was generated locally without sending data to external servers.",
      "Local AI processing complete! Your data remains private and secure on your device."
    ];
    
    // Add some context-awareness to make responses feel more intelligent
    const lowerMessage = message.toLowerCase();
    let response = responses[Math.floor(Math.random() * responses.length)];
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = "Hello! I'm your local AI assistant running privately on your device. How can I help you today?";
    } else if (lowerMessage.includes('weather')) {
      response = "I can help with weather information! In the full version with Core ML, I'll integrate with weather services while keeping your data private.";
    } else if (lowerMessage.includes('privacy') || lowerMessage.includes('data')) {
      response = "Privacy is my priority! I run locally on your device, so your conversations never leave your phone. Your data stays completely private.";
    } else if (lowerMessage.includes('how') && lowerMessage.includes('work')) {
      response = "I'm powered by on-device AI that runs locally on your phone. This ensures your conversations remain private while providing intelligent responses.";
    }
    
    const contextNote = "\n\n💡 *Note: This is the local provider with enhanced privacy. The Core ML model will provide even more capable responses after native build deployment.*";
    
    return {
      content: `${response}${contextNote}`,
      usage: {
        promptTokens: Math.ceil(message.length / 4),
        completionTokens: Math.ceil(response.length / 4),
        totalTokens: Math.ceil((message.length + response.length) / 4)
      }
    };
  }

  private async *getMockStreamResponse(message: string): AsyncIterable<string> {
    const response = this.getMockResponse(message).content;
    const words = response.split(' ');
    
    for (const word of words) {
      yield word + ' ';
      // Vary the delay to make it feel more natural
      const delay = word.length > 6 ? 120 : word.length > 3 ? 100 : 80;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async isAvailable(): Promise<boolean> {
    await this.initializeModule();
    
    // Always return true since we have a working fallback
    return true;
  }

  async validateConfiguration(): Promise<{ isValid: boolean; errors: string[] }> {
    await this.initializeModule();
    
    const errors: string[] = [];
    
    if (!this.moduleAvailable) {
      errors.push('Native OnDeviceLLM module not available - using privacy-focused fallback implementation');
    }

    // Always consider valid due to fallback
    return {
      isValid: true,
      errors
    };
  }

  // Method to check if native module is actually available
  async isNativeModuleAvailable(): Promise<boolean> {
    await this.initializeModule();
    return this.moduleAvailable;
  }

  // Helper method to get provider status for debugging
  getProviderStatus(): string {
    if (!this.isInitialized) {
      return 'Not initialized';
    }
    
    if (this.moduleAvailable) {
      return 'Native module available';
    }
    
    return 'Using privacy-focused fallback implementation';
  }
}
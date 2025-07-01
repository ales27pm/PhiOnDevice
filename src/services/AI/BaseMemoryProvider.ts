import { LLMProvider, LLMConfig, LLMContextOptions } from './LLMProvider';
import { memoryService, MemorySearchResult } from '../MemoryService';

/**
 * Base class for memory-aware LLM providers
 * 
 * This abstract class provides memory integration functionality
 * that can be inherited by concrete LLM providers.
 */
export abstract class BaseMemoryProvider implements LLMProvider {
  public abstract readonly providerId: string;
  protected config: LLMConfig;

  constructor(config: LLMConfig = {}) {
    this.config = {
      memoryEnabled: true,
      maxMemoryContext: 3,
      ...config,
    };
  }

  /**
   * Abstract methods that must be implemented by concrete providers
   */
  abstract isAvailable(): Promise<boolean>;
  
  /**
   * Core LLM response method without memory integration
   * Must be implemented by concrete providers
   */
  protected abstract getCoreResponse(prompt: string): Promise<string>;
  
  /**
   * Core LLM streaming method without memory integration
   * Must be implemented by concrete providers
   */
  protected abstract getCoreStreamResponse(prompt: string): Promise<ReadableStream>;

  /**
   * Get response with automatic memory integration
   */
  async getResponse(prompt: string, options?: LLMContextOptions): Promise<string> {
    const shouldUseMemory = this.shouldUseMemory(options);
    const enhancedPrompt = shouldUseMemory ? await this.enhancePromptWithMemory(prompt, options) : prompt;
    
    try {
      const response = await this.getCoreResponse(enhancedPrompt);
      
      // Save conversation to memory if enabled
      if (shouldUseMemory) {
        await this.saveConversationToMemory(prompt, response);
      }
      
      return response;
    } catch (error) {
      console.error(`${this.providerId}: Error in getResponse:`, error);
      throw error;
    }
  }

  /**
   * Stream response with automatic memory integration
   */
  async streamResponse(prompt: string, options?: LLMContextOptions): Promise<ReadableStream> {
    const shouldUseMemory = this.shouldUseMemory(options);
    const enhancedPrompt = shouldUseMemory ? await this.enhancePromptWithMemory(prompt, options) : prompt;
    
    try {
      const stream = await this.getCoreStreamResponse(enhancedPrompt);
      
      // If memory is enabled, we need to collect the full response to save it
      if (shouldUseMemory) {
        return this.createMemoryAwareStream(stream, prompt);
      }
      
      return stream;
    } catch (error) {
      console.error(`${this.providerId}: Error in streamResponse:`, error);
      throw error;
    }
  }

  /**
   * Enhance prompt with relevant memories
   */
  private async enhancePromptWithMemory(prompt: string, options?: LLMContextOptions): Promise<string> {
    try {
      // Validate inputs
      if (!prompt || prompt.trim().length === 0) {
        return prompt;
      }

      const maxResults = options?.maxMemoryResults || this.config.maxMemoryContext || 3;
      
      // Try to search memory with timeout
      const searchPromise = memoryService.searchMemory(prompt, maxResults);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Memory search timeout')), 5000)
      );
      
      const memories = await Promise.race([searchPromise, timeoutPromise]);
      
      if (!memories || memories.length === 0) {
        console.log(`${this.providerId}: No relevant memories found for prompt`);
        return prompt;
      }

      // Format memory context
      const memoryContext = this.formatMemoryContext(memories);
      
      // Combine context with user prompt
      const enhancedPrompt = `${memoryContext}\n\nCurrent user input: ${prompt}`;
      
      console.log(`${this.providerId}: Enhanced prompt with ${memories.length} relevant memories`);
      return enhancedPrompt;
      
    } catch (error) {
      console.warn(`${this.providerId}: Failed to enhance prompt with memory (using fallback):`, error);
      return prompt; // Always fallback to original prompt
    }
  }

  /**
   * Format memory search results into context
   */
  private formatMemoryContext(memories: MemorySearchResult[]): string {
    const contextEntries = memories.map((result, index) => {
      const memory = result.memory;
      const metadata = memory.metadata ? JSON.parse(memory.metadata) : {};
      const isUser = metadata.isUser;
      const role = isUser ? 'User' : 'Assistant';
      
      return `[Memory ${index + 1}] ${role}: ${memory.content}`;
    });

    return `Relevant conversation history:\n${contextEntries.join('\n')}\n\nPlease use this context to provide a more informed response.`;
  }

  /**
   * Save conversation turn to memory
   */
  private async saveConversationToMemory(userInput: string, assistantResponse: string): Promise<void> {
    try {
      // Validate inputs
      if (!userInput || userInput.trim().length === 0) {
        console.warn(`${this.providerId}: User input is empty, skipping memory save`);
        return;
      }

      if (!assistantResponse || assistantResponse.trim().length === 0) {
        console.warn(`${this.providerId}: Assistant response is empty, skipping memory save`);
        return;
      }

      // Save with timeout to prevent hanging
      const savePromises = [
        memoryService.addMemory(userInput.trim(), {
          isUser: true,
          timestamp: new Date().toISOString(),
          provider: this.providerId,
        }),
        memoryService.addMemory(assistantResponse.trim(), {
          isUser: false,
          timestamp: new Date().toISOString(),
          provider: this.providerId,
        })
      ];

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Memory save timeout')), 10000)
      );

      await Promise.race([Promise.all(savePromises), timeoutPromise]);
      console.log(`${this.providerId}: Saved conversation turn to memory`);
    } catch (error) {
      console.warn(`${this.providerId}: Failed to save conversation to memory:`, error);
      // Don't throw - memory saving should not block the response
    }
  }

  /**
   * Create a memory-aware stream that collects the full response
   */
  private createMemoryAwareStream(originalStream: ReadableStream, userPrompt: string): ReadableStream {
    let fullResponse = '';
    const decoder = new TextDecoder();

    return new ReadableStream({
      start: async (controller) => {
        try {
          const reader = originalStream.getReader();
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Save to memory when streaming is complete
              if (fullResponse) {
                await this.saveConversationToMemory(userPrompt, fullResponse);
              }
              controller.close();
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            fullResponse += chunk;
            controller.enqueue(value);
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }

  /**
   * Determine if memory should be used for this request
   */
  private shouldUseMemory(options?: LLMContextOptions): boolean {
    if (options?.memoryEnabled !== undefined) {
      return options.memoryEnabled;
    }
    
    return this.config.memoryEnabled ?? true;
  }

  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * Enable or disable memory for this provider
   */
  setMemoryEnabled(enabled: boolean): void {
    this.config.memoryEnabled = enabled;
  }

  /**
   * Check if memory is enabled for this provider
   */
  isMemoryEnabled(): boolean {
    return this.config.memoryEnabled ?? true;
  }
}
import { LLMConfig, LLMError, LLMTimeoutError, LLMUnavailableError } from './LLMProvider';
import { BaseMemoryProvider } from './BaseMemoryProvider';
import { getOpenAIClient } from '../../api/openai';

/**
 * OpenAI LLM Provider Implementation with Memory Integration
 * 
 * Provides streaming and non-streaming responses from OpenAI's API
 * Uses the existing secure OpenAI client configuration
 * Includes automatic memory storage and retrieval
 */
export class OpenAIProvider extends BaseMemoryProvider {
  public readonly providerId = 'openai';
  private client: ReturnType<typeof getOpenAIClient>;

  constructor(config: LLMConfig = {}) {
    const defaultConfig = {
      model: 'gpt-4o-2024-11-20',
      temperature: 0.7,
      maxTokens: 2048,
      timeout: 30000,
      memoryEnabled: true,
      maxMemoryContext: 3,
      ...config,
    };
    
    super(defaultConfig);
    
    try {
      this.client = getOpenAIClient();
      
      // Check if we have a valid API key
      const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
      if (!apiKey) {
        console.warn('OpenAI: No API key found in environment variables');
      } else if (apiKey.includes('-n0tr3al')) {
        console.warn('OpenAI: Using placeholder API key - OpenAI requests will fail');
      } else {
        console.log('OpenAI: API key configured successfully');
      }
    } catch (error) {
      throw new LLMError('Failed to initialize OpenAI client', this.providerId);
    }
  }

  /**
   * Expose core methods for testing (public access)
   */
  public async testCoreResponse(prompt: string): Promise<string> {
    return this.getCoreResponse(prompt);
  }

  public async testCoreStreamResponse(prompt: string): Promise<ReadableStream> {
    return this.getCoreStreamResponse(prompt);
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if API key is configured and valid
      const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
      if (!apiKey) {
        console.warn('OpenAI API key not configured');
        return false;
      }
      
      if (apiKey.includes('-n0tr3al')) {
        console.warn('OpenAI: Using placeholder API key - service unavailable');
        return false;
      }

      // Check if client is initialized
      if (!this.client) {
        console.warn('OpenAI client not initialized');
        return false;
      }

      // Test with a minimal request to check availability
      const response = await this.client.chat.completions.create({
        model: this.config.model!,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });
      return !!response;
    } catch (error) {
      console.warn('OpenAI provider availability check failed:', error);
      return false;
    }
  }

  protected async getCoreStreamResponse(prompt: string): Promise<ReadableStream> {
    // Validate prompt and configuration
    if (!prompt || prompt.trim().length === 0) {
      throw new LLMError('Prompt cannot be empty', this.providerId);
    }

    if (!this.config.model) {
      throw new LLMError('No model configured', this.providerId);
    }

    // Check if client is properly initialized
    if (!this.client) {
      throw new LLMError('OpenAI client not initialized', this.providerId);
    }

    try {
      // Pre-flight checks
      const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
      if (!apiKey || apiKey.includes('-n0tr3al')) {
        throw new LLMError('OpenAI API key is not configured or is a placeholder', this.providerId);
      }

      console.log(`${this.providerId}: Making streaming request with model ${this.config.model}`);
      
      const requestParams = {
        model: this.config.model,
        messages: [
          {
            role: 'system' as const,
            content: 'You are a helpful AI assistant. Provide clear, concise, and helpful responses. When provided with conversation history, use it to give more contextual and relevant answers.',
          },
          {
            role: 'user' as const,
            content: prompt,
          },
        ],
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2048,
        stream: true as const,
      };

      console.log(`${this.providerId}: Request params:`, {
        model: requestParams.model,
        messageCount: requestParams.messages.length,
        temperature: requestParams.temperature,
        maxTokens: requestParams.max_tokens,
      });

      const stream = await this.client.chat.completions.create(requestParams);

      // Validate that we got a stream
      if (!stream) {
        throw new LLMError('No stream received from OpenAI', this.providerId);
      }

      // Convert OpenAI stream to ReadableStream
      const providerId = this.providerId;
      return new ReadableStream({
        async start(controller) {
          try {
            let hasContent = false;
            let chunkCount = 0;
            
            console.log(`${providerId}: Starting stream processing`);
            
            for await (const chunk of stream) {
              chunkCount++;
              
              if (!chunk || !chunk.choices || chunk.choices.length === 0) {
                console.warn(`${providerId}: Received invalid chunk:`, chunk);
                continue;
              }
              
              const choice = chunk.choices[0];
              const content = choice?.delta?.content;
              
              if (content) {
                hasContent = true;
                controller.enqueue(new TextEncoder().encode(content));
              }
              
              // Check for finish reason
              const finishReason = choice?.finish_reason;
              if (finishReason) {
                console.log(`${providerId}: Stream finished with reason: ${finishReason}`);
                break;
              }
            }
            
            console.log(`${providerId}: Processed ${chunkCount} chunks, hasContent: ${hasContent}`);
            
            // If no content was received, send a default response
            if (!hasContent) {
              const fallbackMessage = "I apologize, but I couldn't generate a proper response. Please try again.";
              controller.enqueue(new TextEncoder().encode(fallbackMessage));
              console.warn(`${providerId}: No content received, using fallback message`);
            }
            
            controller.close();
          } catch (streamError) {
            console.error(`${providerId}: OpenAI streaming error:`, streamError);
            
            // Send a fallback message and close gracefully
            try {
              const errorMessage = "I encountered an error while generating the response. Please try again.";
              controller.enqueue(new TextEncoder().encode(errorMessage));
              controller.close();
            } catch (controllerError) {
              console.error(`${providerId}: Controller error:`, controllerError);
              controller.error(new LLMError(
                `OpenAI streaming failed: ${streamError instanceof Error ? streamError.message : 'Unknown streaming error'}`,
                providerId
              ));
            }
          }
        },
      });
    } catch (error) {
      console.warn(`${this.providerId}: OpenAI request error:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new LLMTimeoutError(this.providerId);
        }
        if (error.message.includes('unavailable') || error.message.includes('503')) {
          throw new LLMUnavailableError(this.providerId);
        }
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new LLMError('OpenAI rate limit exceeded. Please try again later.', this.providerId);
        }
        if (error.message.includes('401') || error.message.includes('invalid_api_key')) {
          throw new LLMError('OpenAI API key is invalid or missing.', this.providerId);
        }
        if (error.message.includes('no body')) {
          throw new LLMError('OpenAI API request failed - please check your internet connection and try again.', this.providerId);
        }
      }
      
      throw new LLMError(
        `OpenAI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.providerId
      );
    }
  }

  protected async getCoreResponse(prompt: string): Promise<string> {
    // Validate prompt and configuration
    if (!prompt || prompt.trim().length === 0) {
      throw new LLMError('Prompt cannot be empty', this.providerId);
    }

    if (!this.config.model) {
      throw new LLMError('No model configured', this.providerId);
    }

    // Check if client is properly initialized
    if (!this.client) {
      throw new LLMError('OpenAI client not initialized', this.providerId);
    }

    try {
      // Pre-flight checks
      const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
      if (!apiKey || apiKey.includes('-n0tr3al')) {
        throw new LLMError('OpenAI API key is not configured or is a placeholder', this.providerId);
      }

      console.log(`${this.providerId}: Making non-streaming request with model ${this.config.model}`);
      
      const requestParams = {
        model: this.config.model,
        messages: [
          {
            role: 'system' as const,
            content: 'You are a helpful AI assistant. Provide clear, concise, and helpful responses. When provided with conversation history, use it to give more contextual and relevant answers.',
          },
          {
            role: 'user' as const,
            content: prompt,
          },
        ],
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2048,
      };

      const completion = await this.client.chat.completions.create(requestParams);

      if (!completion || !completion.choices || completion.choices.length === 0) {
        console.error(`${this.providerId}: Invalid completion response:`, completion);
        return "I apologize, but I couldn't generate a proper response. Please try again.";
      }

      const response = completion.choices[0]?.message?.content;
      if (!response || response.trim().length === 0) {
        console.warn(`${this.providerId}: Empty response received`);
        return "I apologize, but I couldn't generate a proper response. Please try again.";
      }

      console.log(`${this.providerId}: Successfully generated response (${response.length} characters)`);
      return response;
    } catch (error) {
      console.error(`${this.providerId}: OpenAI non-streaming error:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new LLMTimeoutError(this.providerId);
        }
        if (error.message.includes('unavailable') || error.message.includes('503')) {
          throw new LLMUnavailableError(this.providerId);
        }
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new LLMError('OpenAI rate limit exceeded. Please try again later.', this.providerId);
        }
        if (error.message.includes('401') || error.message.includes('invalid_api_key')) {
          throw new LLMError('OpenAI API key is invalid or missing.', this.providerId);
        }
        if (error.message.includes('no body')) {
          throw new LLMError('OpenAI API request failed - please check your internet connection and try again.', this.providerId);
        }
      }
      
      throw new LLMError(
        `OpenAI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.providerId
      );
    }
  }


}
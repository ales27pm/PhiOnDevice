/**
 * Unified LLM Provider Interface
 * 
 * This interface defines the contract for all LLM providers in the system.
 * It enables seamless switching between different AI models (OpenAI, local models, etc.)
 * using the Abstract Factory pattern.
 */

export interface LLMProvider {
  /**
   * Streams a response from the LLM based on the given prompt
   * @param prompt - The user's input prompt
   * @param options - Optional context and memory settings
   * @returns Promise that resolves to a ReadableStream of the AI response
   */
  streamResponse(prompt: string, options?: LLMContextOptions): Promise<ReadableStream>;

  /**
   * Gets a complete response from the LLM (non-streaming)
   * @param prompt - The user's input prompt
   * @param options - Optional context and memory settings
   * @returns Promise that resolves to the complete AI response
   */
  getResponse(prompt: string, options?: LLMContextOptions): Promise<string>;

  /**
   * Provider identifier for debugging and logging
   */
  readonly providerId: string;

  /**
   * Whether the provider is currently available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Configuration interface for LLM providers
 */
export interface LLMConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  memoryEnabled?: boolean;
  maxMemoryContext?: number;
}

/**
 * Context options for memory integration
 */
export interface LLMContextOptions {
  memoryEnabled?: boolean;
  maxMemoryResults?: number;
  includeMemoryContext?: boolean;
}

/**
 * Error types for LLM operations
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export class LLMUnavailableError extends LLMError {
  constructor(provider: string) {
    super(`LLM provider ${provider} is currently unavailable`, provider, 'UNAVAILABLE');
    this.name = 'LLMUnavailableError';
  }
}

export class LLMTimeoutError extends LLMError {
  constructor(provider: string) {
    super(`LLM provider ${provider} request timed out`, provider, 'TIMEOUT');
    this.name = 'LLMTimeoutError';
  }
}
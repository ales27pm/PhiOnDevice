import { LLMProviderType } from './LLMFactory';
import { createLLMStream, createLLMResponse } from './llmUtils';
import { LLMContextOptions } from './LLMProvider';

/**
 * Utility functions for robust AI provider handling
 */

/**
 * Create an LLM response with automatic fallback
 * @param message - User message
 * @param preferredProvider - Preferred provider to try first
 * @param options - Context options including memory settings
 * @returns Promise resolving to AI response
 */
export async function createRobustLLMResponse(
  message: string,
  preferredProvider: LLMProviderType = 'openai',
  options?: LLMContextOptions
): Promise<string> {
  const fallbackProviders: LLMProviderType[] = preferredProvider === 'openai' 
    ? ['openai', 'local'] 
    : ['local', 'openai'];

  let lastError: Error | null = null;

  for (const provider of fallbackProviders) {
    try {
      console.log(`Attempting response with ${provider} provider`);
      
      // Try with memory first, then without if it fails
      if (options?.memoryEnabled !== false) {
        try {
          return await createLLMResponse(message, provider, { ...options, memoryEnabled: true });
        } catch (memoryError) {
          console.warn(`Memory-enabled request failed for ${provider}, trying without memory:`, memoryError);
          return await createLLMResponse(message, provider, { ...options, memoryEnabled: false });
        }
      } else {
        return await createLLMResponse(message, provider, options);
      }
    } catch (error) {
      console.warn(`Provider ${provider} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  // If all providers failed, return a helpful error message
  throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Create an LLM stream with automatic fallback
 * @param message - User message
 * @param preferredProvider - Preferred provider to try first
 * @param options - Context options including memory settings
 * @returns Promise resolving to ReadableStream
 */
export async function createRobustLLMStream(
  message: string,
  preferredProvider: LLMProviderType = 'openai',
  options?: LLMContextOptions
): Promise<ReadableStream> {
  const fallbackProviders: LLMProviderType[] = preferredProvider === 'openai' 
    ? ['openai', 'local'] 
    : ['local', 'openai'];

  let lastError: Error | null = null;

  for (const provider of fallbackProviders) {
    try {
      console.log(`Attempting stream with ${provider} provider`);
      
      // Try with memory first, then without if it fails
      if (options?.memoryEnabled !== false) {
        try {
          return await createLLMStream(message, provider, { ...options, memoryEnabled: true });
        } catch (memoryError) {
          console.warn(`Memory-enabled stream failed for ${provider}, trying without memory:`, memoryError);
          return await createLLMStream(message, provider, { ...options, memoryEnabled: false });
        }
      } else {
        return await createLLMStream(message, provider, options);
      }
    } catch (error) {
      console.warn(`Provider ${provider} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  // If all providers failed, create a fallback stream with error message
  const errorMessage = `I'm sorry, but I'm currently experiencing technical difficulties. All AI services are temporarily unavailable. Please try again in a few moments.`;
  
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(errorMessage));
      controller.close();
    },
  });
}

/**
 * Get a user-friendly error message based on the error type
 * @param error - The error that occurred
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('rate limit') || message.includes('429')) {
    return "I'm currently experiencing high demand. Please wait a moment and try again.";
  }
  
  if (message.includes('api key') || message.includes('401') || message.includes('unauthorized')) {
    return "There's an issue with the AI service configuration. Please try again later.";
  }
  
  if (message.includes('timeout')) {
    return "The request timed out. Please try again with a shorter message.";
  }
  
  if (message.includes('network') || message.includes('connection')) {
    return "There's a network connectivity issue. Please check your connection and try again.";
  }
  
  if (message.includes('no body') || message.includes('empty response')) {
    return "The AI service returned an empty response. Please try again.";
  }
  
  return "I encountered an unexpected error. Please try again.";
}
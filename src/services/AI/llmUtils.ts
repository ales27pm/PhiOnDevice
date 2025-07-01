import { LLMProviderType } from './LLMFactory';
import { getLLMFactory } from './LLMFactory';
import { LLMContextOptions } from './LLMProvider';

/**
 * Core LLM utility functions
 * 
 * These functions provide the basic interface for interacting with LLM providers
 * without creating circular dependencies.
 */

/**
 * Create an LLM response using the specified provider
 */
export const createLLMResponse = async (
  prompt: string, 
  providerType?: LLMProviderType, 
  options?: LLMContextOptions
): Promise<string> => {
  const factory = getLLMFactory();
  
  if (providerType) {
    const provider = await factory.getProvider(providerType);
    return provider.getResponse(prompt, options);
  }
  
  const provider = await factory.getCurrentProvider();
  return provider.getResponse(prompt, options);
};

/**
 * Create an LLM stream using the specified provider
 */
export const createLLMStream = async (
  prompt: string, 
  providerType?: LLMProviderType, 
  options?: LLMContextOptions
): Promise<ReadableStream> => {
  const factory = getLLMFactory();
  
  if (providerType) {
    const provider = await factory.getProvider(providerType);
    return provider.streamResponse(prompt, options);
  }
  
  const provider = await factory.getCurrentProvider();
  return provider.streamResponse(prompt, options);
};
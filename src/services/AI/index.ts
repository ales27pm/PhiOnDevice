/**
 * AI Services - Unified LLM Provider System
 * 
 * This module provides a unified interface for interacting with different AI models
 * using the Abstract Factory pattern. It allows seamless switching between providers
 * like OpenAI, local LLMs, and future AI services.
 */

// Core interfaces and types
export type { LLMProvider, LLMConfig, LLMContextOptions } from './LLMProvider';
export { LLMError, LLMUnavailableError, LLMTimeoutError } from './LLMProvider';

// Base memory-aware provider
export { BaseMemoryProvider } from './BaseMemoryProvider';

// Provider implementations
export { OpenAIProvider } from './OpenAIProvider';
export { LocalLLMProvider } from './LocalLLMProvider';

// Factory and management
export { LLMFactory, getLLMFactory } from './LLMFactory';
export type { LLMProviderType } from './LLMFactory';

// Core utility functions
export { createLLMResponse, createLLMStream } from './llmUtils';

// Advanced utility functions
export { createRobustLLMResponse, createRobustLLMStream, getUserFriendlyErrorMessage } from './providerUtils';
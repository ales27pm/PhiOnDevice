// Voice Services
export { default as voiceActivationService } from './VoiceActivationService';
export { default as ttsService } from './TTSService';

// Memory Services
export { MemoryService, memoryService } from './MemoryService';
export type { Memory, MemorySearchResult, MemoryServiceConfig } from './MemoryService';

// AI Services
export * from './AI';

// Re-export for convenience
export { voiceActivationService, ttsService };
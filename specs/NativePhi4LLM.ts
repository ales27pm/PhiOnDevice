import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Phi4GenerationConfig {
  maxTokens: number;
  temperature: number;
  topK: number;
  topP: number;
  stopSequences?: string[];
  enableKVCache: boolean;
}

export interface Phi4GenerationResult {
  text: string;
  finishReason: 'length' | 'stop' | 'error';
  tokensGenerated: number;
  inferenceTimeMs: number;
  tokensPerSecond: number;
}

export interface Phi4ModelInfo {
  modelPath: string;
  isLoaded: boolean;
  parameterCount: string;
  quantization: string;
  contextLength: number;
  vocabularySize: number;
}

export interface Phi4PerformanceMetrics {
  prefillTimeMs: number;
  decodeTimeMs: number;
  totalTimeMs: number;
  tokensPerSecond: number;
  memoryUsageMB: number;
  accelerator: 'CPU' | 'GPU' | 'ANE';
}

export interface Spec extends TurboModule {
  // Model lifecycle
  loadModel(modelPath: string): Promise<boolean>;
  unloadModel(): Promise<void>;
  isModelLoaded(): Promise<boolean>;
  getModelInfo(): Promise<Phi4ModelInfo>;

  // Text generation
  generateText(
    prompt: string,
    config: Phi4GenerationConfig
  ): Promise<Phi4GenerationResult>;

  // Streaming generation (iOS only - uses native callbacks)
  startStreamingGeneration(
    prompt: string,
    config: Phi4GenerationConfig,
    callbackId: string
  ): Promise<void>;
  
  stopStreamingGeneration(): Promise<void>;

  // Tokenization
  tokenize(text: string): Promise<number[]>;
  detokenize(tokens: number[]): Promise<string>;
  getTokenCount(text: string): Promise<number>;

  // Performance and diagnostics
  getPerformanceMetrics(): Promise<Phi4PerformanceMetrics>;
  warmupModel(): Promise<void>;
  clearKVCache(): Promise<void>;

  // Memory management
  getMemoryUsage(): Promise<number>;
  triggerMemoryCleanup(): Promise<void>;

  // Model configuration
  setComputeUnits(units: 'all' | 'cpuOnly' | 'cpuAndGPU' | 'cpuAndNeuralEngine'): Promise<void>;
  setQuantizationMode(mode: 'none' | 'linear' | 'dynamic'): Promise<void>;
}

// Use get() instead of getEnforcing() to handle cases where the native module isn't compiled
export default TurboModuleRegistry.get<Spec>('NativePhi4LLM');
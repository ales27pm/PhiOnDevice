import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import NativePhi4LLM from '../../specs/NativePhi4LLM';
import type {
  Phi4GenerationConfig,
  Phi4GenerationResult,
  Phi4ModelInfo,
  Phi4PerformanceMetrics,
} from '../../specs/NativePhi4LLM';
import { Analytics } from '../utils/analytics';
import { ErrorHandler, ReasoningError } from '../utils/errorHandler';

// Enum mapping helpers for legacy compatibility
const quantizationMap: Record<string, 'none' | 'linear' | 'dynamic'> = {
  int4: 'linear',
  int8: 'linear',
  none: 'none',
  linear: 'linear',
  dynamic: 'dynamic'
};

const computeUnitMap: Record<string, 'all' | 'cpuOnly' | 'cpuAndGPU' | 'cpuAndNeuralEngine'> = {
  neural_engine: 'cpuAndNeuralEngine',
  gpu: 'cpuAndGPU',
  cpu: 'cpuOnly',
  all: 'all',
  cpuOnly: 'cpuOnly',
  cpuAndGPU: 'cpuAndGPU',
  cpuAndNeuralEngine: 'cpuAndNeuralEngine'
};

// Helper functions for enum mapping
export function mapQuantization(userInput: string): 'none' | 'linear' | 'dynamic' {
  return quantizationMap[userInput] || 'none';
}

export function mapComputeUnit(userInput: string): 'all' | 'cpuOnly' | 'cpuAndGPU' | 'cpuAndNeuralEngine' {
  return computeUnitMap[userInput] || 'all';
}

// Event emitter for streaming tokens (created lazily)
let eventEmitter: NativeEventEmitter | null = null;

// Helper function to get event emitter safely
function getEventEmitter(): NativeEventEmitter | null {
  if (!NativePhi4LLM) {
    return null;
  }
  
  if (!eventEmitter) {
    eventEmitter = new NativeEventEmitter(NativeModules.NativePhi4LLM);
  }
  
  return eventEmitter;
}

export interface StreamingGenerationCallbacks {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

class Phi4NativeLLM {
  private isInitialized = false;
  private modelPath = '';
  private streamingCallbacks: Map<string, StreamingGenerationCallbacks> = new Map();

  constructor() {
    this.setupEventListeners();
  }

  // Helper method to ensure native module is available
  private ensureNativeModule(): void {
    if (!NativePhi4LLM) {
      throw new ReasoningError('NATIVE_MODULE_UNAVAILABLE', 'Native Phi-4 module is not available in this environment');
    }
  }

  // MARK: - Model Lifecycle

  async loadModel(modelPath: string): Promise<boolean> {
    try {
      if (!NativePhi4LLM) {
        throw new ReasoningError('NATIVE_MODULE_UNAVAILABLE', 'Native Phi-4 module is not available');
      }
      
      Analytics.track('native_model_load_started', { modelPath });
      
      const result = await NativePhi4LLM.loadModel(modelPath);
      
      if (result) {
        this.isInitialized = true;
        this.modelPath = modelPath;
        
        Analytics.track('native_model_load_success', { modelPath });
        console.log('✅ Native Phi-4 model loaded successfully');
        
        // Warm up the model for better first-run performance
        await this.warmupModel();
        
        return true;
      }
      
      throw new ReasoningError('MODEL_LOAD_FAILED', 'Failed to load native model');
      
    } catch (error) {
      Analytics.track('native_model_load_failed', { 
        modelPath, 
        error: (error as Error).message 
      });
      
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.loadModel');
      throw error;
    }
  }

  async unloadModel(): Promise<void> {
    try {
      if (!NativePhi4LLM) {
        throw new ReasoningError('NATIVE_MODULE_UNAVAILABLE', 'Native Phi-4 module is not available');
      }
      await NativePhi4LLM.unloadModel();
      
      this.isInitialized = false;
      this.modelPath = '';
      
      Analytics.track('native_model_unloaded');
      console.log('✅ Native Phi-4 model unloaded');
      
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.unloadModel');
      throw error;
    }
  }

  async isModelLoaded(): Promise<boolean> {
    try {
      if (!NativePhi4LLM) return false;
      return await NativePhi4LLM.isModelLoaded();
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.isModelLoaded');
      return false;
    }
  }

  async getModelInfo(): Promise<Phi4ModelInfo> {
    try {
      this.ensureNativeModule();
      return await NativePhi4LLM!.getModelInfo();
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.getModelInfo');
      throw error;
    }
  }

  // MARK: - Text Generation

  async generateText(
    prompt: string,
    config: Partial<Phi4GenerationConfig> = {}
  ): Promise<Phi4GenerationResult> {
    if (!this.isInitialized) {
      throw new ReasoningError('MODEL_NOT_LOADED', 'Model is not loaded. Call loadModel() first.');
    }

    const fullConfig: Phi4GenerationConfig = {
      maxTokens: 512,
      temperature: 0.7,
      topK: 50,
      topP: 0.9,
      stopSequences: ['<|endoftext|>', '\n\n'],
      enableKVCache: true,
      ...config,
    };

    const startTime = Date.now();

    try {
      Analytics.track('native_generation_started', {
        promptLength: prompt.length,
        maxTokens: fullConfig.maxTokens,
        temperature: fullConfig.temperature,
      });

      this.ensureNativeModule();
      const result = await NativePhi4LLM!.generateText(prompt, fullConfig);

      const duration = Date.now() - startTime;
      
      Analytics.track('native_generation_completed', {
        promptLength: prompt.length,
        tokensGenerated: result.tokensGenerated,
        tokensPerSecond: result.tokensPerSecond,
        duration,
        finishReason: result.finishReason,
      });

      console.log(`✅ Generated ${result.tokensGenerated} tokens in ${result.inferenceTimeMs.toFixed(1)}ms (${result.tokensPerSecond.toFixed(1)} t/s)`);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      Analytics.track('native_generation_failed', {
        promptLength: prompt.length,
        duration,
        error: (error as Error).message,
      });

      ErrorHandler.logError(error as Error, 'NativePhi4LLM.generateText');
      throw error;
    }
  }

  async startStreamingGeneration(
    prompt: string,
    callbacks: StreamingGenerationCallbacks,
    config: Partial<Phi4GenerationConfig> = {}
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new ReasoningError('MODEL_NOT_LOADED', 'Model is not loaded. Call loadModel() first.');
    }

    const fullConfig: Phi4GenerationConfig = {
      maxTokens: 512,
      temperature: 0.7,
      topK: 50,
      topP: 0.9,
      stopSequences: ['<|endoftext|>', '\n\n'],
      enableKVCache: true,
      ...config,
    };

    const callbackId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.streamingCallbacks.set(callbackId, callbacks);

    const startTime = Date.now();

    try {
      Analytics.track('native_streaming_started', {
        promptLength: prompt.length,
        maxTokens: fullConfig.maxTokens,
        callbackId,
      });

      this.ensureNativeModule();
      await NativePhi4LLM!.startStreamingGeneration(prompt, fullConfig, callbackId);

      console.log(`✅ Started streaming generation for prompt: ${prompt.substring(0, 50)}...`);

      return callbackId;

    } catch (error) {
      // Clean up callback on error
      this.streamingCallbacks.delete(callbackId);

      const duration = Date.now() - startTime;
      
      Analytics.track('native_streaming_failed', {
        promptLength: prompt.length,
        duration,
        error: (error as Error).message,
        callbackId,
      });

      ErrorHandler.logError(error as Error, 'NativePhi4LLM.startStreamingGeneration');
      throw error;
    }
  }

  async stopStreamingGeneration(): Promise<void> {
    try {
      this.ensureNativeModule();
      await NativePhi4LLM!.stopStreamingGeneration();
      
      // Clear all streaming callbacks
      this.streamingCallbacks.clear();
      
      Analytics.track('native_streaming_stopped');
      console.log('✅ Streaming generation stopped');
      
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.stopStreamingGeneration');
      throw error;
    }
  }

  // MARK: - Tokenization

  async tokenize(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      throw new ReasoningError('MODEL_NOT_LOADED', 'Model is not loaded. Call loadModel() first.');
    }

    try {
      this.ensureNativeModule();
      const tokens = await NativePhi4LLM!.tokenize(text);
      
      Analytics.track('native_tokenization', {
        textLength: text.length,
        tokenCount: tokens.length,
      });

      return tokens;

    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.tokenize');
      throw error;
    }
  }

  async detokenize(tokens: number[]): Promise<string> {
    if (!this.isInitialized) {
      throw new ReasoningError('MODEL_NOT_LOADED', 'Model is not loaded. Call loadModel() first.');
    }

    try {
      this.ensureNativeModule();
      const text = await NativePhi4LLM!.detokenize(tokens);
      
      Analytics.track('native_detokenization', {
        tokenCount: tokens.length,
        textLength: text.length,
      });

      return text;

    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.detokenize');
      throw error;
    }
  }

  async getTokenCount(text: string): Promise<number> {
    if (!this.isInitialized) {
      throw new ReasoningError('MODEL_NOT_LOADED', 'Model is not loaded. Call loadModel() first.');
    }

    try {
      this.ensureNativeModule();
      return await NativePhi4LLM!.getTokenCount(text);
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.getTokenCount');
      throw error;
    }
  }

  // MARK: - Performance and Diagnostics

  async getPerformanceMetrics(): Promise<Phi4PerformanceMetrics> {
    try {
      this.ensureNativeModule();
      const metrics = await NativePhi4LLM!.getPerformanceMetrics();
      
      Analytics.track('native_performance_metrics', metrics);
      
      return metrics;
      
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.getPerformanceMetrics');
      throw error;
    }
  }

  async warmupModel(): Promise<void> {
    if (!this.isInitialized) {
      throw new ReasoningError('MODEL_NOT_LOADED', 'Model is not loaded. Call loadModel() first.');
    }

    try {
      console.log('🔄 Warming up native model...');
      const startTime = Date.now();
      
      this.ensureNativeModule();
      await NativePhi4LLM!.warmupModel();
      
      const duration = Date.now() - startTime;
      
      Analytics.track('native_model_warmup', { duration });
      console.log(`✅ Model warmup completed in ${duration}ms`);
      
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.warmupModel');
      throw error;
    }
  }

  async clearKVCache(): Promise<void> {
    if (!this.isInitialized) {
      throw new ReasoningError('MODEL_NOT_LOADED', 'Model is not loaded. Call loadModel() first.');
    }

    try {
      this.ensureNativeModule();
      await NativePhi4LLM!.clearKVCache();
      
      Analytics.track('native_kv_cache_cleared');
      console.log('✅ KV cache cleared');
      
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.clearKVCache');
      throw error;
    }
  }

  // MARK: - Memory Management

  async getMemoryUsage(): Promise<number> {
    try {
      this.ensureNativeModule();
      return await NativePhi4LLM!.getMemoryUsage();
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.getMemoryUsage');
      return 0;
    }
  }

  async triggerMemoryCleanup(): Promise<void> {
    try {
      this.ensureNativeModule();
      await NativePhi4LLM!.triggerMemoryCleanup();
      
      Analytics.track('native_memory_cleanup');
      console.log('✅ Memory cleanup triggered');
      
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.triggerMemoryCleanup');
      throw error;
    }
  }

  // MARK: - Model Configuration

  async setComputeUnits(units: 'all' | 'cpuOnly' | 'cpuAndGPU' | 'cpuAndNeuralEngine' | string): Promise<void> {
    try {
      this.ensureNativeModule();
      const mappedUnits = mapComputeUnit(units);
      await NativePhi4LLM!.setComputeUnits(mappedUnits);
      
      Analytics.track('native_compute_units_changed', { units: mappedUnits, originalInput: units });
      console.log(`✅ Compute units set to: ${mappedUnits} (from input: ${units})`);
      
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.setComputeUnits');
      throw error;
    }
  }

  async setQuantizationMode(mode: 'none' | 'linear' | 'dynamic' | string): Promise<void> {
    try {
      this.ensureNativeModule();
      const mappedMode = mapQuantization(mode);
      await NativePhi4LLM!.setQuantizationMode(mappedMode);
      
      Analytics.track('native_quantization_changed', { mode: mappedMode, originalInput: mode });
      console.log(`✅ Quantization mode set to: ${mappedMode} (from input: ${mode})`);
      
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.setQuantizationMode');
      throw error;
    }
  }

  // MARK: - Private Methods

  private setupEventListeners(): void {
    const emitter = getEventEmitter();
    if (!emitter) {
      console.log('⚠️ Native LLM module not available, skipping event listener setup');
      return;
    }
    
    // Listen for streaming token events
    emitter.addListener('onTokenGenerated', (event) => {
      const { callbackId, token, isComplete } = event;
      const callbacks = this.streamingCallbacks.get(callbackId);
      
      if (callbacks) {
        if (isComplete) {
          callbacks.onComplete();
          this.streamingCallbacks.delete(callbackId);
          
          Analytics.track('native_streaming_completed', { callbackId });
        } else {
          callbacks.onToken(token);
        }
      }
    });

    console.log('✅ Native LLM event listeners setup');
  }

  // MARK: - Utility Methods

  getModelPath(): string {
    return this.modelPath;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async diagnose(): Promise<{
    isModelLoaded: boolean;
    modelInfo?: Phi4ModelInfo;
    performanceMetrics?: Phi4PerformanceMetrics;
    memoryUsage?: number;
  }> {
    try {
      const isLoaded = await this.isModelLoaded();
      
      if (!isLoaded) {
        return { isModelLoaded: false };
      }

      const [modelInfo, performanceMetrics, memoryUsage] = await Promise.all([
        this.getModelInfo(),
        this.getPerformanceMetrics(),
        this.getMemoryUsage(),
      ]);

      return {
        isModelLoaded: true,
        modelInfo,
        performanceMetrics,
        memoryUsage,
      };
      
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativePhi4LLM.diagnose');
      return { isModelLoaded: false };
    }
  }
}

// Singleton instance
export const nativePhi4LLM = new Phi4NativeLLM();

// Platform check - only available on iOS and when native module is available
export const isNativeLLMSupported = Platform.OS === 'ios' && NativePhi4LLM !== null;

// Helper function to get model bundle path
export function getModelBundlePath(): string {
  // In a real app, this would return the path to the .mlpackage in the bundle
  // For iOS: Bundle.main.path(forResource: "phi4-mini-reasoning", ofType: "mlpackage")
  return '/path/to/phi4-mini-reasoning.mlpackage';
}

// Export types
export type {
  Phi4GenerationConfig,
  Phi4GenerationResult,
  Phi4ModelInfo,
  Phi4PerformanceMetrics,
};

// Legacy compatibility exports
export const QuantizationMode = {
  INT4: 'linear' as const,
  INT8: 'linear' as const,
  NONE: 'none' as const,
  LINEAR: 'linear' as const,
  DYNAMIC: 'dynamic' as const
};

export const ComputeUnit = {
  NEURAL_ENGINE: 'cpuAndNeuralEngine' as const,
  GPU: 'cpuAndGPU' as const,
  CPU: 'cpuOnly' as const,
  ALL: 'all' as const
};
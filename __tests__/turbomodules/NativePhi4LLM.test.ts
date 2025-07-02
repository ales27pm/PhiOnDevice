/**
 * TurboModule Tests for NativePhi4LLM
 */

import { TurboModuleRegistry } from 'react-native';
import type { Spec as NativePhi4LLMSpec } from '../../specs/NativePhi4LLM';

// Mock TurboModule
const mockNativePhi4LLM: NativePhi4LLMSpec = {
  loadModel: jest.fn().mockResolvedValue(true),
  unloadModel: jest.fn().mockResolvedValue(undefined),
  isModelLoaded: jest.fn().mockResolvedValue(true),
  getModelInfo: jest.fn().mockResolvedValue({
    modelName: 'phi-4-mini-reasoning',
    version: '1.0.0',
    modelPath: '/test/path/model.mlpackage',
    isLoaded: true,
    parameterCount: '14B',
    quantization: 'linear',
    contextLength: 4096,
    vocabularySize: 32000,
    memoryUsage: 8589934592,
    supportedComputeUnits: ['cpuAndNeuralEngine', 'cpuAndGPU', 'cpuOnly'],
    quantizationMode: 'linear'
  }),
  generateText: jest.fn().mockResolvedValue({
    text: 'Test response',
    tokensGenerated: 10,
    tokensPerSecond: 25.5,
    inferenceTimeMs: 400,
    finishReason: 'stop'
  }),
  startStreamingGeneration: jest.fn().mockResolvedValue(undefined),
  stopStreamingGeneration: jest.fn().mockResolvedValue(undefined),
  tokenize: jest.fn().mockResolvedValue([1, 2, 3, 4, 5]),
  detokenize: jest.fn().mockResolvedValue('test text'),
  getTokenCount: jest.fn().mockResolvedValue(5),
  getPerformanceMetrics: jest.fn().mockResolvedValue({
    totalGenerations: 100,
    tokensPerSecond: 25.5,
    successRate: 0.95,
    prefillTimeMs: 50,
    decodeTimeMs: 350,
    totalTimeMs: 400,
    memoryUsageMB: 512,
    accelerator: 'ANE',
    averageTokensPerSecond: 25.5,
    averageInferenceTimeMs: 400,
    totalInferenceTimeMs: 40000,
    errorCount: 5
  }),
  warmupModel: jest.fn().mockResolvedValue(undefined),
  clearKVCache: jest.fn().mockResolvedValue(undefined),
  getMemoryUsage: jest.fn().mockResolvedValue(536870912),
  triggerMemoryCleanup: jest.fn().mockResolvedValue(undefined),
  setComputeUnits: jest.fn().mockResolvedValue(undefined),
  setQuantizationMode: jest.fn().mockResolvedValue(undefined),
  addListener: jest.fn(),
  removeListeners: jest.fn()
};

// Mock TurboModuleRegistry
jest.mock('react-native', () => ({
  TurboModuleRegistry: {
    get: jest.fn((name: string) => {
      if (name === 'NativePhi4LLM') {
        return mockNativePhi4LLM;
      }
      return null;
    }),
  },
  Platform: {
    OS: 'ios'
  }
}));

describe('NativePhi4LLM TurboModule', () => {
  let nativeModule: NativePhi4LLMSpec;

  beforeAll(() => {
    nativeModule = TurboModuleRegistry.get('NativePhi4LLM')!;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Model Lifecycle', () => {
    it('should load model successfully', async () => {
      const result = await nativeModule.loadModel('/test/path');
      expect(result).toBe(true);
      expect(mockNativePhi4LLM.loadModel).toHaveBeenCalledWith('/test/path');
    });

    it('should unload model successfully', async () => {
      await nativeModule.unloadModel();
      expect(mockNativePhi4LLM.unloadModel).toHaveBeenCalled();
    });

    it('should check if model is loaded', async () => {
      const isLoaded = await nativeModule.isModelLoaded();
      expect(isLoaded).toBe(true);
      expect(mockNativePhi4LLM.isModelLoaded).toHaveBeenCalled();
    });

    it('should get model information', async () => {
      const modelInfo = await nativeModule.getModelInfo();
      expect(modelInfo).toEqual({
        modelName: 'phi-4-mini-reasoning',
        version: '1.0.0',
        modelPath: '/test/path/model.mlpackage',
        isLoaded: true,
        parameterCount: '14B',
        quantization: 'linear',
        contextLength: 4096,
        vocabularySize: 32000,
        memoryUsage: 8589934592,
        supportedComputeUnits: ['cpuAndNeuralEngine', 'cpuAndGPU', 'cpuOnly'],
        quantizationMode: 'linear'
      });
    });
  });

  describe('Text Generation', () => {
    it('should generate text successfully', async () => {
      const config = {
        maxTokens: 100,
        temperature: 0.7,
        topK: 50,
        topP: 0.9,
        stopSequences: ['<|endoftext|>'],
        enableKVCache: true
      };

      const result = await nativeModule.generateText('Test prompt', config);
      
      expect(result).toEqual({
        text: 'Test response',
        tokensGenerated: 10,
        tokensPerSecond: 25.5,
        inferenceTimeMs: 400,
        finishReason: 'stop'
      });
      
      expect(mockNativePhi4LLM.generateText).toHaveBeenCalledWith('Test prompt', config);
    });

    it('should start streaming generation', async () => {
      const config = {
        maxTokens: 100,
        temperature: 0.7,
        topK: 50,
        topP: 0.9,
        stopSequences: ['<|endoftext|>'],
        enableKVCache: true
      };

      await nativeModule.startStreamingGeneration('Test prompt', config, 'callback_123');
      
      expect(mockNativePhi4LLM.startStreamingGeneration).toHaveBeenCalledWith(
        'Test prompt', 
        config, 
        'callback_123'
      );
    });

    it('should stop streaming generation', async () => {
      await nativeModule.stopStreamingGeneration();
      expect(mockNativePhi4LLM.stopStreamingGeneration).toHaveBeenCalled();
    });
  });

  describe('Tokenization', () => {
    it('should tokenize text', async () => {
      const tokens = await nativeModule.tokenize('test text');
      expect(tokens).toEqual([1, 2, 3, 4, 5]);
      expect(mockNativePhi4LLM.tokenize).toHaveBeenCalledWith('test text');
    });

    it('should detokenize tokens', async () => {
      const text = await nativeModule.detokenize([1, 2, 3, 4, 5]);
      expect(text).toBe('test text');
      expect(mockNativePhi4LLM.detokenize).toHaveBeenCalledWith([1, 2, 3, 4, 5]);
    });

    it('should get token count', async () => {
      const count = await nativeModule.getTokenCount('test text');
      expect(count).toBe(5);
      expect(mockNativePhi4LLM.getTokenCount).toHaveBeenCalledWith('test text');
    });
  });

  describe('Performance and Diagnostics', () => {
    it('should get performance metrics', async () => {
      const metrics = await nativeModule.getPerformanceMetrics();
      
      expect(metrics).toEqual({
        totalGenerations: 100,
        tokensPerSecond: 25.5,
        successRate: 0.95,
        prefillTimeMs: 50,
        decodeTimeMs: 350,
        totalTimeMs: 400,
        memoryUsageMB: 512,
        accelerator: 'ANE',
        averageTokensPerSecond: 25.5,
        averageInferenceTimeMs: 400,
        totalInferenceTimeMs: 40000,
        errorCount: 5
      });
    });

    it('should warm up model', async () => {
      await nativeModule.warmupModel();
      expect(mockNativePhi4LLM.warmupModel).toHaveBeenCalled();
    });

    it('should clear KV cache', async () => {
      await nativeModule.clearKVCache();
      expect(mockNativePhi4LLM.clearKVCache).toHaveBeenCalled();
    });

    it('should get memory usage', async () => {
      const memoryUsage = await nativeModule.getMemoryUsage();
      expect(memoryUsage).toBe(536870912);
      expect(mockNativePhi4LLM.getMemoryUsage).toHaveBeenCalled();
    });

    it('should trigger memory cleanup', async () => {
      await nativeModule.triggerMemoryCleanup();
      expect(mockNativePhi4LLM.triggerMemoryCleanup).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should set compute units', async () => {
      await nativeModule.setComputeUnits('cpuAndNeuralEngine');
      expect(mockNativePhi4LLM.setComputeUnits).toHaveBeenCalledWith('cpuAndNeuralEngine');
    });

    it('should set quantization mode', async () => {
      await nativeModule.setQuantizationMode('linear');
      expect(mockNativePhi4LLM.setQuantizationMode).toHaveBeenCalledWith('linear');
    });
  });

  describe('Event Handling', () => {
    it('should add event listeners', () => {
      nativeModule.addListener?.('onTokenGenerated');
      expect(mockNativePhi4LLM.addListener).toHaveBeenCalledWith('onTokenGenerated');
    });

    it('should remove event listeners', () => {
      nativeModule.removeListeners?.(5);
      expect(mockNativePhi4LLM.removeListeners).toHaveBeenCalledWith(5);
    });
  });
});
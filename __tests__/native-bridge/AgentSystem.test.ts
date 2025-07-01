/**
 * Native Bridge Integration Tests
 * Tests the integration between React Native JS and native modules
 */

import { agentFactory } from '../../src/agent/AgentFactory';
import { nativePhi4LLM } from '../../src/api/nativePhi4LLM';

// Mock native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: {
    NativePhi4LLM: {
      loadModel: jest.fn().mockResolvedValue(true),
      isModelLoaded: jest.fn().mockResolvedValue(true),
      generateText: jest.fn().mockResolvedValue({
        text: 'The answer is 4.',
        tokensGenerated: 4,
        tokensPerSecond: 25.0,
        inferenceTimeMs: 160,
        finishReason: 'stop'
      }),
      getModelInfo: jest.fn().mockResolvedValue({
        modelName: 'phi-4-mini-reasoning',
        version: '1.0.0',
        parameterCount: 14000000000,
        memoryUsage: 8589934592,
        supportedComputeUnits: ['neural_engine', 'gpu', 'cpu'],
        quantizationMode: 'int4'
      }),
      getPerformanceMetrics: jest.fn().mockResolvedValue({
        totalGenerations: 50,
        averageTokensPerSecond: 25.0,
        averageInferenceTimeMs: 200,
        totalInferenceTimeMs: 10000,
        successRate: 0.98,
        errorCount: 1
      })
    }
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
  TurboModuleRegistry: {
    get: jest.fn((name) => {
      if (name === 'NativePhi4LLM') {
        return {
          loadModel: jest.fn().mockResolvedValue(true),
          generateText: jest.fn().mockResolvedValue({
            text: 'Test response',
            tokensGenerated: 3,
            tokensPerSecond: 20.0
          })
        };
      }
      return null;
    })
  }
}));

// Mock external API clients to test local-first behavior
jest.mock('../../src/api/enhanced-phi4-reasoning', () => ({
  generateEnhancedReasoning: jest.fn().mockResolvedValue({
    solution: 'External API response',
    tokensPerSecond: 15.0
  })
}));

describe('Agent System Native Bridge Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Agent Factory Native LLM Integration', () => {
    it('should initialize native LLM successfully', async () => {
      const result = await agentFactory.initializeNativeLLM();
      expect(result).toBe(true);
    });

    it('should get comprehensive system status', async () => {
      const status = await agentFactory.getSystemStatus();
      
      expect(status).toHaveProperty('nativeLLMSupported');
      expect(status).toHaveProperty('nativeLLMLoaded');
      expect(status).toHaveProperty('availableModules');
      expect(status).toHaveProperty('supportedLanguages');
      expect(status).toHaveProperty('toolsAvailable');
      
      expect(status.availableModules).toContain('perception');
      expect(status.availableModules).toContain('planning');
      expect(status.availableModules).toContain('memory');
      expect(status.availableModules).toContain('action');
      expect(status.availableModules).toContain('dialogue');
    });

    it('should create agents with native LLM support', async () => {
      const mathAgent = agentFactory.createMathAgent();
      const quebecAgent = agentFactory.createQuebecoisAgent();
      const tutorAgent = agentFactory.createTutorAgent();

      expect(mathAgent).toBeDefined();
      expect(quebecAgent).toBeDefined();
      expect(tutorAgent).toBeDefined();

      // Test agent status
      const mathStatus = await mathAgent.getStatus();
      expect(mathStatus.isReady).toBe(true);
      expect(mathStatus.capabilities.reasoning).toBe(true);
    });
  });

  describe('Native LLM Direct Integration', () => {
    it('should load and use native model', async () => {
      const modelPath = '/test/path/phi4-mini-reasoning.mlpackage';
      const loaded = await nativePhi4LLM.loadModel(modelPath);
      
      expect(loaded).toBe(true);
      
      const isReady = await nativePhi4LLM.isModelLoaded();
      expect(isReady).toBe(true);
    });

    it('should generate text using native model', async () => {
      const result = await nativePhi4LLM.generateText(
        'What is 2 + 2?',
        { maxTokens: 50, temperature: 0.1 }
      );
      
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('tokensGenerated');
      expect(result).toHaveProperty('tokensPerSecond');
      expect(result.text).toBe('The answer is 4.');
      expect(result.tokensGenerated).toBe(4);
    });

    it('should get native model diagnostics', async () => {
      const diagnosis = await nativePhi4LLM.diagnose();
      
      expect(diagnosis.isModelLoaded).toBe(true);
      expect(diagnosis.modelInfo).toBeDefined();
      expect(diagnosis.performanceMetrics).toBeDefined();
      
      if (diagnosis.modelInfo) {
        expect(diagnosis.modelInfo.modelName).toBe('phi-4-mini-reasoning');
        expect(diagnosis.modelInfo.version).toBe('1.0.0');
      }
    });
  });

  describe('Local-First Agent Reasoning', () => {
    it('should prioritize native LLM over external APIs', async () => {
      const tutorAgent = agentFactory.createTutorAgent();
      
      // Mock native LLM as available
      jest.spyOn(nativePhi4LLM, 'isModelLoaded').mockResolvedValue(true);
      
      const response = await tutorAgent.processConversation(
        'Solve 3x + 5 = 14',
        'test_session_123'
      );
      
      expect(response).toBeDefined();
      expect(response.message.content).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0.8);
      
      // Verify that native reasoning was attempted
      expect(nativePhi4LLM.isModelLoaded).toHaveBeenCalled();
    });

    it('should fallback to external API when native fails', async () => {
      const tutorAgent = agentFactory.createTutorAgent();
      
      // Mock native LLM as unavailable
      jest.spyOn(nativePhi4LLM, 'isModelLoaded').mockResolvedValue(false);
      
      const response = await tutorAgent.processConversation(
        'What is calculus?',
        'test_session_456'
      );
      
      expect(response).toBeDefined();
      expect(response.message.content).toBeDefined();
      
      // Should have fallen back to external API
      const { generateEnhancedReasoning } = require('../../src/api/enhanced-phi4-reasoning');
      expect(generateEnhancedReasoning).toHaveBeenCalled();
    });

    it('should include reasoning traces showing local vs external processing', async () => {
      const tutorAgent = agentFactory.createTutorAgent();
      
      // Test with native LLM available
      jest.spyOn(nativePhi4LLM, 'isModelLoaded').mockResolvedValue(true);
      
      const response = await tutorAgent.processConversation(
        'Explain quadratic equations',
        'test_session_789'
      );
      
      expect(response.reasoning).toBeDefined();
      expect(response.reasoning!.length).toBeGreaterThan(0);
      
      // Check if reasoning trace indicates local processing
      const localProcessingStep = response.reasoning!.find(step => 
        step.content.includes('local') || step.content.includes('Phi-4')
      );
      expect(localProcessingStep).toBeDefined();
    });
  });

  describe('Performance and Resource Management', () => {
    it('should track native LLM performance metrics', async () => {
      const metrics = await nativePhi4LLM.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('totalGenerations');
      expect(metrics).toHaveProperty('averageTokensPerSecond');
      expect(metrics).toHaveProperty('successRate');
      
      expect(metrics.totalGenerations).toBeGreaterThanOrEqual(0);
      expect(metrics.averageTokensPerSecond).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeLessThanOrEqual(1);
    });

    it('should handle memory management', async () => {
      const memoryUsage = await nativePhi4LLM.getMemoryUsage();
      expect(typeof memoryUsage).toBe('number');
      expect(memoryUsage).toBeGreaterThanOrEqual(0);
      
      // Test memory cleanup
      await nativePhi4LLM.triggerMemoryCleanup();
      // Should not throw an error
    });

    it('should support compute unit configuration', async () => {
      // Test different compute units
      await nativePhi4LLM.setComputeUnits('neural_engine');
      await nativePhi4LLM.setComputeUnits('gpu');
      await nativePhi4LLM.setComputeUnits('cpu');
      
      // Test quantization modes
      await nativePhi4LLM.setQuantizationMode('int4');
      await nativePhi4LLM.setQuantizationMode('int8');
      await nativePhi4LLM.setQuantizationMode('none');
      
      // Should not throw errors
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle native module initialization failures gracefully', async () => {
      // Mock native module as unavailable
      jest.spyOn(require('react-native'), 'NativeModules', 'get').mockReturnValue({
        NativePhi4LLM: null
      });
      
      const result = await agentFactory.initializeNativeLLM();
      expect(result).toBe(false);
      
      // Agent should still function with external APIs
      const agent = agentFactory.createTutorAgent();
      expect(agent).toBeDefined();
    });

    it('should handle native LLM generation errors', async () => {
      // Mock native generation to fail
      jest.spyOn(nativePhi4LLM, 'generateText').mockRejectedValue(
        new Error('Native generation failed')
      );
      
      jest.spyOn(nativePhi4LLM, 'isModelLoaded').mockResolvedValue(true);
      
      const agent = agentFactory.createMathAgent();
      
      // Should not throw, should fallback gracefully
      const response = await agent.processConversation(
        'Calculate 5 * 8',
        'error_test_session'
      );
      
      expect(response).toBeDefined();
      expect(response.message.content).toBeDefined();
    });
  });
});
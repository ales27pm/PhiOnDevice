import { ReasoningStep } from '../state/reasoningStore';
import { 
  nativePhi4LLM, 
  isNativeLLMSupported, 
  getModelBundlePath,
  type StreamingGenerationCallbacks 
} from './nativePhi4LLM';
import { generateEnhancedReasoning } from './enhanced-phi4-reasoning';
import { Analytics } from '../utils/analytics';
import { ErrorHandler, ReasoningError } from '../utils/errorHandler';

export interface NativeReasoningConfig {
  useNativeLLM: boolean;
  maxTokens: number;
  temperature: number;
  topK: number;
  topP: number;
  enableStreaming: boolean;
  enableKVCache: boolean;
}

export interface NativeReasoningResult {
  solution: string;
  tokensPerSecond: number;
  duration: number;
  wasNativeExecution: boolean;
  performanceMetrics?: any;
}

class Phi4NativeReasoningEngine {
  private isInitialized = false;
  private isModelLoaded = false;
  private initializationPromise: Promise<boolean> | null = null;

  constructor() {
    // Auto-initialize on iOS
    if (isNativeLLMSupported) {
      this.initializeNativeModel();
    }
  }

  // MARK: - Initialization

  private async initializeNativeModel(): Promise<boolean> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<boolean> {
    try {
      console.log('🚀 Initializing native Phi-4 model...');
      
      const modelPath = getModelBundlePath();
      const success = await nativePhi4LLM.loadModel(modelPath);
      
      if (success) {
        this.isInitialized = true;
        this.isModelLoaded = true;
        
        console.log('✅ Native Phi-4 model initialized successfully');
        
        // Get model diagnostics
        const diagnostics = await nativePhi4LLM.diagnose();
        console.log('📊 Model diagnostics:', diagnostics);
        
        Analytics.track('native_reasoning_engine_initialized', {
          modelPath,
          ...diagnostics
        });
        
        return true;
      }
      
      throw new ReasoningError('NATIVE_INIT_FAILED', 'Failed to initialize native model');
      
    } catch (error) {
      console.warn('⚠️ Native model initialization failed, falling back to mock:', error);
      
      Analytics.track('native_reasoning_engine_init_failed', {
        error: (error as Error).message
      });
      
      this.isInitialized = false;
      this.isModelLoaded = false;
      
      return false;
    }
  }

  // MARK: - Public API

  async generateReasoning(
    problem: string,
    onStep: (step: ReasoningStep) => void,
    onToken?: (token: string) => void,
    config: Partial<NativeReasoningConfig> = {}
  ): Promise<NativeReasoningResult> {
    
    const fullConfig: NativeReasoningConfig = {
      useNativeLLM: true,
      maxTokens: 512,
      temperature: 0.7,
      topK: 50,
      topP: 0.9,
      enableStreaming: !!onToken,
      enableKVCache: true,
      ...config
    };

    // Try native execution first on iOS
    if (isNativeLLMSupported && fullConfig.useNativeLLM) {
      try {
        return await this.executeNativeReasoning(problem, onStep, onToken, fullConfig);
      } catch (error) {
        console.warn('⚠️ Native reasoning failed, falling back to enhanced mock:', error);
        
        Analytics.track('native_reasoning_fallback', {
          problem: problem.substring(0, 100),
          error: (error as Error).message
        });
      }
    }

    // Fallback to enhanced mock reasoning
    return await this.executeMockReasoning(problem, onStep, onToken);
  }

  // MARK: - Native Execution

  private async executeNativeReasoning(
    problem: string,
    onStep: (step: ReasoningStep) => void,
    onToken?: (token: string) => void,
    config: NativeReasoningConfig
  ): Promise<NativeReasoningResult> {
    
    // Ensure model is loaded
    if (!this.isModelLoaded) {
      await this.initializeNativeModel();
      if (!this.isModelLoaded) {
        throw new ReasoningError('NATIVE_MODEL_NOT_LOADED', 'Native model failed to load');
      }
    }

    const startTime = Date.now();
    let generatedText = '';
    let stepCount = 0;

    try {
      // Create mathematical reasoning prompt
      const reasoningPrompt = this.createReasoningPrompt(problem);
      
      Analytics.track('native_reasoning_started', {
        problemLength: problem.length,
        promptLength: reasoningPrompt.length,
        useStreaming: config.enableStreaming
      });

      if (config.enableStreaming && onToken) {
        // Streaming generation with step extraction
        await this.executeStreamingGeneration(
          reasoningPrompt,
          config,
          (token: string) => {
            generatedText += token;
            onToken(token);
            
            // Extract reasoning steps from generated text
            const steps = this.extractReasoningSteps(generatedText);
            if (steps.length > stepCount) {
              const newStep = steps[stepCount];
              onStep(newStep);
              stepCount++;
            }
          }
        );
      } else {
        // Non-streaming generation
        const result = await nativePhi4LLM.generateText(reasoningPrompt, {
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          topK: config.topK,
          topP: config.topP,
          enableKVCache: config.enableKVCache,
          stopSequences: ['<|endoftext|>', '\n\nFinal Answer:']
        });
        
        generatedText = result.text;
        
        // Extract and emit steps
        const steps = this.extractReasoningSteps(generatedText);
        for (const step of steps) {
          onStep(step);
          await new Promise(resolve => setTimeout(resolve, 200)); // Simulate step timing
        }
      }

      // Extract final solution
      const solution = this.extractSolution(generatedText);
      
      const duration = Date.now() - startTime;
      
      // Get performance metrics
      const performanceMetrics = await nativePhi4LLM.getPerformanceMetrics();
      
      const result: NativeReasoningResult = {
        solution,
        tokensPerSecond: performanceMetrics.tokensPerSecond,
        duration,
        wasNativeExecution: true,
        performanceMetrics
      };

      Analytics.track('native_reasoning_completed', {
        problemLength: problem.length,
        solutionLength: solution.length,
        duration,
        tokensPerSecond: performanceMetrics.tokensPerSecond,
        stepCount
      });

      console.log(`✅ Native reasoning completed: ${stepCount} steps, ${performanceMetrics.tokensPerSecond.toFixed(1)} t/s`);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      Analytics.track('native_reasoning_failed', {
        problemLength: problem.length,
        duration,
        error: (error as Error).message
      });

      ErrorHandler.logError(error as Error, 'NativeReasoningEngine.executeNativeReasoning');
      throw error;
    }
  }

  private async executeStreamingGeneration(
    prompt: string,
    config: NativeReasoningConfig,
    onToken: (token: string) => void
  ): Promise<void> {
    
    return new Promise((resolve, reject) => {
      const callbacks: StreamingGenerationCallbacks = {
        onToken: (token: string) => {
          onToken(token);
        },
        onComplete: () => {
          resolve();
        },
        onError: (error: Error) => {
          reject(error);
        }
      };

      nativePhi4LLM.startStreamingGeneration(prompt, callbacks, {
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        topK: config.topK,
        topP: config.topP,
        enableKVCache: config.enableKVCache,
        stopSequences: ['<|endoftext|>', '\n\nFinal Answer:']
      }).catch(reject);
    });
  }

  // MARK: - Mock Execution

  private async executeMockReasoning(
    problem: string,
    onStep: (step: ReasoningStep) => void,
    onToken?: (token: string) => void
  ): Promise<NativeReasoningResult> {
    
    console.log('🔄 Executing enhanced mock reasoning...');
    
    const mockResult = await generateEnhancedReasoning(problem, onStep, onToken);
    
    return {
      solution: mockResult.solution,
      tokensPerSecond: mockResult.tokensPerSecond,
      duration: mockResult.duration,
      wasNativeExecution: false
    };
  }

  // MARK: - Prompt Engineering

  private createReasoningPrompt(problem: string): string {
    return `You are Phi-4-mini-reasoning, an advanced mathematical AI assistant. Solve the following problem with detailed step-by-step reasoning.

Problem: ${problem}

Please provide your solution in the following format:

Step 1: [Description]
[Detailed explanation of this step]

Step 2: [Description]  
[Detailed explanation of this step]

[Continue with additional steps as needed]

Final Answer: [Your final solution]

Begin your reasoning now:

Step 1:`;
  }

  // MARK: - Text Processing

  private extractReasoningSteps(text: string): ReasoningStep[] {
    const steps: ReasoningStep[] = [];
    
    // Extract steps using regex pattern
    const stepPattern = /Step (\d+):\s*([^\n]+)\n([^S]*?)(?=Step \d+:|Final Answer:|$)/g;
    let match;
    
    while ((match = stepPattern.exec(text)) !== null) {
      const stepNumber = parseInt(match[1]);
      const description = match[2].trim();
      const content = match[3].trim();
      
      if (description && content) {
        steps.push({
          step: stepNumber,
          description,
          content,
          isComplete: true
        });
      }
    }
    
    return steps;
  }

  private extractSolution(text: string): string {
    // Extract final answer
    const finalAnswerMatch = text.match(/Final Answer:\s*(.+?)(?:\n|$)/);
    if (finalAnswerMatch) {
      return finalAnswerMatch[1].trim();
    }
    
    // Fallback: extract last meaningful line
    const lines = text.split('\n').filter(line => line.trim());
    return lines[lines.length - 1] || 'Solution completed';
  }

  // MARK: - Diagnostics

  async getModelStatus(): Promise<{
    isNativeSupported: boolean;
    isModelLoaded: boolean;
    modelInfo?: any;
    performanceMetrics?: any;
  }> {
    
    if (!isNativeLLMSupported) {
      return {
        isNativeSupported: false,
        isModelLoaded: false
      };
    }

    try {
      const diagnostics = await nativePhi4LLM.diagnose();
      
      return {
        isNativeSupported: true,
        isModelLoaded: diagnostics.isModelLoaded,
        modelInfo: diagnostics.modelInfo,
        performanceMetrics: diagnostics.performanceMetrics
      };
      
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativeReasoningEngine.getModelStatus');
      
      return {
        isNativeSupported: true,
        isModelLoaded: false
      };
    }
  }

  async optimizeForDevice(): Promise<void> {
    if (!isNativeLLMSupported || !this.isModelLoaded) return;

    try {
      // Set optimal compute units for the device
      await nativePhi4LLM.setComputeUnits('all');
      
      // Clear KV cache to free memory
      await nativePhi4LLM.clearKVCache();
      
      // Trigger memory cleanup
      await nativePhi4LLM.triggerMemoryCleanup();
      
      console.log('✅ Model optimized for device');
      
    } catch (error) {
      ErrorHandler.logError(error as Error, 'NativeReasoningEngine.optimizeForDevice');
    }
  }

  // MARK: - Getters

  get isNativeModelReady(): boolean {
    return isNativeLLMSupported && this.isModelLoaded;
  }

  get supportsNativeInference(): boolean {
    return isNativeLLMSupported;
  }
}

// Singleton instance
export const nativeReasoningEngine = new Phi4NativeReasoningEngine();

// Main export function that automatically chooses the best execution method
export async function generateNativeReasoning(
  problem: string,
  onStep: (step: ReasoningStep) => void,
  onToken?: (token: string) => void,
  config?: Partial<NativeReasoningConfig>
): Promise<NativeReasoningResult> {
  return nativeReasoningEngine.generateReasoning(problem, onStep, onToken, config);
}

// Export types and utilities
export {
  isNativeLLMSupported,
  type NativeReasoningConfig,
  type NativeReasoningResult
};
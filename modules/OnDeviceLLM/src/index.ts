import NativeOnDeviceLLM from './NativeOnDeviceLLM';

export interface OnDeviceLLMConfig {
  modelName: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
}

export interface GenerationParams {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
}

export interface ModelInfo {
  name: string;
  size: number;
  version: string;
  description?: string;
}

export class OnDeviceLLM {
  private static instance: OnDeviceLLM;
  private currentModel: string | null = null;
  private isGenerating = false;

  private constructor() {}

  static getInstance(): OnDeviceLLM {
    if (!OnDeviceLLM.instance) {
      OnDeviceLLM.instance = new OnDeviceLLM();
    }
    return OnDeviceLLM.instance;
  }

  /**
   * Initialize the LLM with a specific model
   */
  async initialize(config: OnDeviceLLMConfig): Promise<boolean> {
    try {
      const success = await NativeOnDeviceLLM.initializeModel(config.modelName);
      if (success) {
        this.currentModel = config.modelName;
        
        // Set generation parameters if provided
        if (config.maxTokens || config.temperature || config.topP || config.topK || config.repeatPenalty) {
          await NativeOnDeviceLLM.setGenerationParams({
            maxTokens: config.maxTokens,
            temperature: config.temperature,
            topP: config.topP,
            topK: config.topK,
            repeatPenalty: config.repeatPenalty,
          });
        }
      }
      return success;
    } catch (error) {
      console.error('Failed to initialize OnDeviceLLM:', error);
      return false;
    }
  }

  /**
   * Generate text with callback for each token
   */
  async generate(
    prompt: string,
    params?: GenerationParams,
    onToken?: (token: string) => void
  ): Promise<string> {
    if (!this.currentModel) {
      throw new Error('No model loaded. Call initialize() first.');
    }

    if (this.isGenerating) {
      throw new Error('Generation already in progress. Cancel current generation first.');
    }

    try {
      this.isGenerating = true;
      return await NativeOnDeviceLLM.generate(
        prompt,
        params?.maxTokens,
        params?.temperature,
        onToken
      );
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Generate text with streaming support
   */
  async generateStream(prompt: string, params?: GenerationParams): Promise<ReadableStream<string>> {
    if (!this.currentModel) {
      throw new Error('No model loaded. Call initialize() first.');
    }

    if (this.isGenerating) {
      throw new Error('Generation already in progress. Cancel current generation first.');
    }

    return new ReadableStream({
      start: async (controller) => {
        try {
          this.isGenerating = true;
          
          await NativeOnDeviceLLM.generate(
            prompt,
            params?.maxTokens,
            params?.temperature,
            (token: string) => {
              controller.enqueue(token);
            }
          );
          
          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          this.isGenerating = false;
        }
      },
      cancel: async () => {
        await this.cancelGeneration();
      },
    });
  }

  /**
   * Cancel ongoing generation
   */
  async cancelGeneration(): Promise<void> {
    if (this.isGenerating) {
      await NativeOnDeviceLLM.cancelGeneration();
      this.isGenerating = false;
    }
  }

  /**
   * Check if model is loaded
   */
  isModelLoaded(): boolean {
    return NativeOnDeviceLLM.isModelLoaded();
  }

  /**
   * Get current model name
   */
  getCurrentModel(): string | null {
    return this.currentModel;
  }

  /**
   * Unload current model
   */
  async unloadModel(): Promise<void> {
    if (this.isGenerating) {
      await this.cancelGeneration();
    }
    
    await NativeOnDeviceLLM.unloadModel();
    this.currentModel = null;
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    return await NativeOnDeviceLLM.getAvailableModels();
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName: string): Promise<ModelInfo> {
    return await NativeOnDeviceLLM.getModelInfo(modelName);
  }

  /**
   * Update generation parameters
   */
  async setGenerationParams(params: GenerationParams): Promise<void> {
    await NativeOnDeviceLLM.setGenerationParams(params);
  }

  /**
   * Check if currently generating
   */
  isCurrentlyGenerating(): boolean {
    return this.isGenerating;
  }
}

// Export singleton instance
export const onDeviceLLM = OnDeviceLLM.getInstance();

// Export types
export type { OnDeviceLLMConfig, GenerationParams, ModelInfo };

// Re-export native module for advanced usage
export { default as NativeOnDeviceLLM } from './NativeOnDeviceLLM';
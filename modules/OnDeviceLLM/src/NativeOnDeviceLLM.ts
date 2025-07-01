import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Initialize the on-device LLM with a specific model
   * @param modelName - Name of the CoreML model file (without extension)
   * @returns Promise that resolves when model is loaded
   */
  initializeModel(modelName: string): Promise<boolean>;

  /**
   * Generate text from a prompt using the on-device LLM
   * @param prompt - Input text prompt
   * @param maxTokens - Maximum number of tokens to generate (optional, default: 100)
   * @param temperature - Sampling temperature (optional, default: 0.7)
   * @param callback - Callback function that receives each generated token
   * @returns Promise that resolves when generation is complete
   */
  generate(
    prompt: string,
    maxTokens?: number,
    temperature?: number,
    callback?: (token: string) => void
  ): Promise<string>;

  /**
   * Generate text with streaming support
   * @param prompt - Input text prompt
   * @param maxTokens - Maximum number of tokens to generate
   * @param temperature - Sampling temperature
   * @returns Promise that resolves to the complete generated text
   */
  generateStream(
    prompt: string,
    maxTokens?: number,
    temperature?: number
  ): Promise<string>;

  /**
   * Check if a model is currently loaded
   * @returns Whether a model is loaded and ready
   */
  isModelLoaded(): boolean;

  /**
   * Unload the current model to free memory
   * @returns Promise that resolves when model is unloaded
   */
  unloadModel(): Promise<void>;

  /**
   * Get available models in the app bundle
   * @returns Array of available model names
   */
  getAvailableModels(): Promise<string[]>;

  /**
   * Get model information
   * @param modelName - Name of the model
   * @returns Model metadata (size, version, etc.)
   */
  getModelInfo(modelName: string): Promise<{
    name: string;
    size: number;
    version: string;
    description?: string;
  }>;

  /**
   * Cancel ongoing generation
   * @returns Promise that resolves when generation is cancelled
   */
  cancelGeneration(): Promise<void>;

  /**
   * Set generation parameters
   * @param params - Generation parameters
   */
  setGenerationParams(params: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    repeatPenalty?: number;
  }): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('OnDeviceLLM');
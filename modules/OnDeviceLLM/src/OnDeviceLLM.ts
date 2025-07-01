import { TurboModule, TurboModuleRegistry, NativeEventEmitter } from 'react-native';

export interface Spec extends TurboModule {
  // Initialize the Core ML model
  initialize(): Promise<boolean>;
  
  // Start generation process. Tokens will be sent via events.
  generate(prompt: string, maxTokens?: number): Promise<void>;
  
  // Stop generation if in progress
  stopGeneration(): Promise<void>;
  
  // Check if model is loaded and ready
  isReady(): Promise<boolean>;
  
  // Get model information
  getModelInfo(): Promise<{
    modelName: string;
    quantization: string;
    vocabSize: number;
    maxLength: number;
  }>;
}

const OnDeviceLLM = TurboModuleRegistry.get<Spec>('OnDeviceLLM');
const OnDeviceLLMModule = OnDeviceLLM;

// Event Emitter for streaming tokens - with null check
const eventEmitter = OnDeviceLLMModule ? new NativeEventEmitter(OnDeviceLLMModule) : null;

export enum LLMEvent {
  TOKEN = 'onToken',
  ERROR = 'onError',
  COMPLETE = 'onComplete',
  MODEL_LOADED = 'onModelLoaded',
  GENERATION_STARTED = 'onGenerationStarted',
}

export interface TokenEvent {
  token: string;
  tokenId: number;
  probability?: number;
}

export interface ErrorEvent {
  error: string;
  code?: string;
}

export interface ModelLoadedEvent {
  success: boolean;
  modelInfo?: {
    modelName: string;
    quantization: string;
    vocabSize: number;
    maxLength: number;
  };
}

export interface GenerationStartedEvent {
  prompt: string;
  maxTokens: number;
}

// Enhanced interface with event handling
export default {
  ...OnDeviceLLMModule,
  
  addListener: (eventType: LLMEvent, listener: (data: any) => void) => {
    if (!eventEmitter) {
      console.warn('OnDeviceLLM: Native module not available, listener not added');
      return { remove: () => {} };
    }
    return eventEmitter.addListener(eventType, listener);
  },
  
  removeListener: (eventType: LLMEvent, listener: (data: any) => void) => {
    if (!eventEmitter) {
      console.warn('OnDeviceLLM: Native module not available');
      return;
    }
    return eventEmitter.removeListener(eventType, listener);
  },
  
  removeAllListeners: (eventType?: LLMEvent) => {
    if (!eventEmitter) {
      console.warn('OnDeviceLLM: Native module not available');
      return;
    }
    return eventEmitter.removeAllListeners(eventType);
  },
  
  // Convenience method for streaming generation with callback
  generateWithCallback: async (
    prompt: string,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    maxTokens: number = 256
  ): Promise<void> => {
    if (!eventEmitter || !OnDeviceLLMModule) {
      onError('OnDeviceLLM: Native module not available');
      return;
    }
    
    const tokenListener = eventEmitter.addListener(LLMEvent.TOKEN, (data: TokenEvent) => {
      onToken(data.token);
    });
    
    const completeListener = eventEmitter.addListener(LLMEvent.COMPLETE, () => {
      tokenListener.remove();
      completeListener.remove();
      errorListener.remove();
      onComplete();
    });
    
    const errorListener = eventEmitter.addListener(LLMEvent.ERROR, (data: ErrorEvent) => {
      tokenListener.remove();
      completeListener.remove();
      errorListener.remove();
      onError(data.error);
    });
    
    try {
      await OnDeviceLLMModule.generate(prompt, maxTokens);
    } catch (error) {
      tokenListener.remove();
      completeListener.remove();
      errorListener.remove();
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  },
  
  // Promise-based generation that returns full response
  generatePromise: (prompt: string, maxTokens: number = 256): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!eventEmitter || !OnDeviceLLMModule) {
        reject(new Error('OnDeviceLLM: Native module not available'));
        return;
      }
      
      let fullResponse = '';
      
      const tokenListener = eventEmitter.addListener(LLMEvent.TOKEN, (data: TokenEvent) => {
        fullResponse += data.token;
      });
      
      const completeListener = eventEmitter.addListener(LLMEvent.COMPLETE, () => {
        tokenListener.remove();
        completeListener.remove();
        errorListener.remove();
        resolve(fullResponse);
      });
      
      const errorListener = eventEmitter.addListener(LLMEvent.ERROR, (data: ErrorEvent) => {
        tokenListener.remove();
        completeListener.remove();
        errorListener.remove();
        reject(new Error(data.error));
      });
      
      OnDeviceLLMModule.generate(prompt, maxTokens).catch((error) => {
        tokenListener.remove();
        completeListener.remove();
        errorListener.remove();
        reject(error);
      });
    });
  },
};
import { TurboModule, TurboModuleRegistry, NativeEventEmitter } from 'react-native';

export interface Spec extends TurboModule {
  // Pipeline control
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // Configuration
  setWakeWordEnabled(enabled: boolean): Promise<void>;
  setWakeWordSensitivity(sensitivity: number): Promise<void>; // 0.0 - 1.0
  setContinuousListening(enabled: boolean): Promise<void>;
  
  // Status queries
  isRunning(): Promise<boolean>;
  getCurrentState(): Promise<string>;
  
  // Manual triggers (for testing)
  simulateWakeWord(): Promise<void>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
}

const VoicePipeline = TurboModuleRegistry.get<Spec>('VoicePipeline');
const VoicePipelineModule = VoicePipeline;

const eventEmitter = VoicePipelineModule ? new NativeEventEmitter(VoicePipelineModule) : null;

export enum VoiceEvent {
  STATE_CHANGE = 'onStateChange',
  WAKEWORD_DETECTED = 'onWakeWord',
  TRANSCRIPTION = 'onTranscription',
  TRANSCRIPTION_PARTIAL = 'onTranscriptionPartial',
  ERROR = 'onError',
  AUDIO_LEVEL = 'onAudioLevel',
  LISTENING_TIMEOUT = 'onListeningTimeout',
}

export type VoicePipelineState = 
  | 'idle' 
  | 'listening_wakeword' 
  | 'transcribing' 
  | 'processing'
  | 'error';

export interface StateChangeEvent {
  state: VoicePipelineState;
  previousState: VoicePipelineState;
  timestamp: number;
}

export interface WakeWordEvent {
  confidence: number;
  timestamp: number;
}

export interface TranscriptionEvent {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

export interface ErrorEvent {
  error: string;
  code?: string;
  recoverable: boolean;
}

export interface AudioLevelEvent {
  level: number; // 0.0 - 1.0
  timestamp: number;
}

export default {
  ...VoicePipelineModule,
  
  addListener: (eventType: VoiceEvent, listener: (data: any) => void) => {
    if (!eventEmitter) {
      console.warn('VoicePipeline: Native module not available, listener not added');
      return { remove: () => {} };
    }
    return eventEmitter.addListener(eventType, listener);
  },
  
  removeListener: (eventType: VoiceEvent, listener: (data: any) => void) => {
    if (!eventEmitter) {
      console.warn('VoicePipeline: Native module not available');
      return;
    }
    return eventEmitter.removeListener(eventType, listener);
  },
  
  removeAllListeners: (eventType?: VoiceEvent) => {
    return eventEmitter.removeAllListeners(eventType);
  },
  
  // Convenience method for simple voice recognition
  listenOnce: (timeoutMs: number = 5000): Promise<string> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        transcriptionListener.remove();
        errorListener.remove();
        reject(new Error('Listening timeout'));
      }, timeoutMs);
      
      const transcriptionListener = eventEmitter.addListener(
        VoiceEvent.TRANSCRIPTION,
        (data: TranscriptionEvent) => {
          if (data.isFinal) {
            clearTimeout(timeout);
            transcriptionListener.remove();
            errorListener.remove();
            resolve(data.text);
          }
        }
      );
      
      const errorListener = eventEmitter.addListener(
        VoiceEvent.ERROR,
        (data: ErrorEvent) => {
          clearTimeout(timeout);
          transcriptionListener.remove();
          errorListener.remove();
          reject(new Error(data.error));
        }
      );
      
      VoicePipelineModule?.startListening().catch(reject);
    });
  },
  
  // Convenience method for wake word detection
  waitForWakeWord: (timeoutMs?: number): Promise<WakeWordEvent> => {
    return new Promise((resolve, reject) => {
      let timeout: NodeJS.Timeout | undefined;
      
      if (timeoutMs) {
        timeout = setTimeout(() => {
          wakeWordListener.remove();
          errorListener.remove();
          reject(new Error('Wake word timeout'));
        }, timeoutMs);
      }
      
      const wakeWordListener = eventEmitter.addListener(
        VoiceEvent.WAKEWORD_DETECTED,
        (data: WakeWordEvent) => {
          if (timeout) clearTimeout(timeout);
          wakeWordListener.remove();
          errorListener.remove();
          resolve(data);
        }
      );
      
      const errorListener = eventEmitter.addListener(
        VoiceEvent.ERROR,
        (data: ErrorEvent) => {
          if (timeout) clearTimeout(timeout);
          wakeWordListener.remove();
          errorListener.remove();
          reject(new Error(data.error));
        }
      );
    });
  },
  
  // State management helper
  createStateManager: () => {
    let currentState: VoicePipelineState = 'idle';
    const stateListeners: Array<(state: VoicePipelineState) => void> = [];
    
    const stateListener = eventEmitter.addListener(
      VoiceEvent.STATE_CHANGE,
      (data: StateChangeEvent) => {
        currentState = data.state;
        stateListeners.forEach(listener => listener(data.state));
      }
    );
    
    return {
      getCurrentState: () => currentState,
      onStateChange: (listener: (state: VoicePipelineState) => void) => {
        stateListeners.push(listener);
        return () => {
          const index = stateListeners.indexOf(listener);
          if (index > -1) {
            stateListeners.splice(index, 1);
          }
        };
      },
      destroy: () => {
        stateListener.remove();
        stateListeners.length = 0;
      }
    };
  },
};
import { EventEmitter } from 'events';
import { NativeModules, NativeEventEmitter } from 'react-native';

// Type definitions for react-native-wakeword
interface WakeWordModule {
  startListening: (options?: { keyword?: string }) => Promise<void>;
  stopListening: () => Promise<void>;
  isListening: () => Promise<boolean>;
}

class VoiceActivationService extends EventEmitter {
  private wakeWordModule: WakeWordModule | null = null;
  private eventEmitter: NativeEventEmitter | null = null;
  private isInitialized = false;
  private isCurrentlyListening = false;

  constructor() {
    super();
    this.initializeWakeWord();
  }

  private initializeWakeWord() {
    try {
      // Initialize react-native-wakeword module
      this.wakeWordModule = NativeModules.RNWakeword as WakeWordModule;
      
      if (this.wakeWordModule) {
        this.eventEmitter = new NativeEventEmitter(this.wakeWordModule as any);
        this.setupEventListeners();
        this.isInitialized = true;
      } else {
        console.warn('VoiceActivationService: Wake word module not available');
      }
    } catch (error) {
      console.error('VoiceActivationService: Failed to initialize wake word module:', error);
    }
  }

  private setupEventListeners() {
    if (!this.eventEmitter) return;

    // Listen for wake word detection events
    this.eventEmitter.addListener('onWakeWordDetected', (data) => {
      console.log('Wake word detected:', data);
      this.emit('wakeWordDetected', data);
    });

    this.eventEmitter.addListener('onWakeWordError', (error) => {
      console.error('Wake word error:', error);
      this.emit('wakeWordError', error);
    });

    this.eventEmitter.addListener('onWakeWordStarted', () => {
      console.log('Wake word listening started');
      this.isCurrentlyListening = true;
      this.emit('wakeWordStarted');
    });

    this.eventEmitter.addListener('onWakeWordStopped', () => {
      console.log('Wake word listening stopped');
      this.isCurrentlyListening = false;
      this.emit('wakeWordStopped');
    });
  }

  /**
   * Start listening for wake words
   * @param keyword Optional wake word keyword to listen for
   */
  async start(keyword?: string): Promise<void> {
    if (!this.isInitialized || !this.wakeWordModule) {
      throw new Error('VoiceActivationService: Wake word module not initialized');
    }

    try {
      if (this.isCurrentlyListening) {
        console.log('VoiceActivationService: Already listening for wake words');
        return;
      }

      const options = keyword ? { keyword } : undefined;
      await this.wakeWordModule.startListening(options);
      console.log('VoiceActivationService: Started listening for wake words');
    } catch (error) {
      console.error('VoiceActivationService: Failed to start listening:', error);
      throw error;
    }
  }

  /**
   * Stop listening for wake words
   */
  async stop(): Promise<void> {
    if (!this.isInitialized || !this.wakeWordModule) {
      throw new Error('VoiceActivationService: Wake word module not initialized');
    }

    try {
      if (!this.isCurrentlyListening) {
        console.log('VoiceActivationService: Not currently listening');
        return;
      }

      await this.wakeWordModule.stopListening();
      console.log('VoiceActivationService: Stopped listening for wake words');
    } catch (error) {
      console.error('VoiceActivationService: Failed to stop listening:', error);
      throw error;
    }
  }

  /**
   * Check if currently listening for wake words
   */
  async isListening(): Promise<boolean> {
    if (!this.isInitialized || !this.wakeWordModule) {
      return false;
    }

    try {
      return await this.wakeWordModule.isListening();
    } catch (error) {
      console.error('VoiceActivationService: Failed to check listening status:', error);
      return this.isCurrentlyListening;
    }
  }

  /**
   * Get initialization status
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners('onWakeWordDetected');
      this.eventEmitter.removeAllListeners('onWakeWordError');
      this.eventEmitter.removeAllListeners('onWakeWordStarted');
      this.eventEmitter.removeAllListeners('onWakeWordStopped');
    }
    this.removeAllListeners();
  }
}

// Export singleton instance
export const voiceActivationService = new VoiceActivationService();
export default voiceActivationService;
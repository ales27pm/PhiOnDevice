import * as Speech from 'expo-speech';

interface TTSOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  quality?: 'default' | 'enhanced';
  voice?: string;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
}

class TTSService {
  private isSpeaking = false;
  private currentSpeechId: string | null = null;

  /**
   * Speak the provided text using text-to-speech
   * @param text The text to speak
   * @param options Optional TTS configuration
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!text || text.trim().length === 0) {
      console.warn('TTSService: Empty text provided');
      return;
    }

    try {
      // Stop any current speech before starting new one
      if (this.isSpeaking) {
        await this.stop();
      }

      const {
        language = 'en-US',
        pitch = 1.0,
        rate = 1.0,
        quality = 'default',
        voice,
        onStart,
        onDone,
        onStopped,
        onError,
      } = options;

      // Validate parameters
      const normalizedPitch = Math.max(0.5, Math.min(2.0, pitch));
      const normalizedRate = Math.max(0.1, Math.min(3.0, rate));

      const speechOptions: Speech.SpeechOptions = {
        language,
        pitch: normalizedPitch,
        rate: normalizedRate,
        quality: quality as Speech.SpeechOptions['quality'],
        voice,
        onStart: () => {
          console.log('TTS: Speech started');
          this.isSpeaking = true;
          onStart?.();
        },
        onDone: () => {
          console.log('TTS: Speech completed');
          this.isSpeaking = false;
          this.currentSpeechId = null;
          onDone?.();
        },
        onStopped: () => {
          console.log('TTS: Speech stopped');
          this.isSpeaking = false;
          this.currentSpeechId = null;
          onStopped?.();
        },
        onError: (error: Error) => {
          console.error('TTS: Speech error:', error);
          this.isSpeaking = false;
          this.currentSpeechId = null;
          onError?.(error);
        },
      };

      // Generate unique ID for this speech request
      this.currentSpeechId = `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log(`TTS: Speaking text: "${text.substring(0, 50)}..."`);
      Speech.speak(text, speechOptions);
    } catch (error) {
      console.error('TTSService: Error in speak method:', error);
      this.isSpeaking = false;
      this.currentSpeechId = null;
      options.onError?.(error instanceof Error ? error : new Error('Unknown TTS error'));
      throw error;
    }
  }

  /**
   * Stop current speech
   */
  async stop(): Promise<void> {
    try {
      if (this.isSpeaking) {
        console.log('TTS: Stopping speech');
        Speech.stop();
        this.isSpeaking = false;
        this.currentSpeechId = null;
      }
    } catch (error) {
      console.error('TTSService: Error stopping speech:', error);
      throw error;
    }
  }

  /**
   * Pause current speech (iOS only)
   */
  async pause(): Promise<void> {
    try {
      if (this.isSpeaking) {
        console.log('TTS: Pausing speech');
        Speech.pause();
      }
    } catch (error) {
      console.error('TTSService: Error pausing speech:', error);
      throw error;
    }
  }

  /**
   * Resume paused speech (iOS only)
   */
  async resume(): Promise<void> {
    try {
      console.log('TTS: Resuming speech');
      Speech.resume();
    } catch (error) {
      console.error('TTSService: Error resuming speech:', error);
      throw error;
    }
  }

  /**
   * Check if currently speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(): Promise<Speech.Voice[]> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      console.log('TTS: Available voices:', voices.length);
      return voices;
    } catch (error) {
      console.error('TTSService: Error getting available voices:', error);
      return [];
    }
  }

  /**
   * Get available voices for a specific language
   */
  async getVoicesForLanguage(language: string): Promise<Speech.Voice[]> {
    try {
      const allVoices = await this.getAvailableVoices();
      return allVoices.filter(voice => 
        voice.language.toLowerCase().startsWith(language.toLowerCase())
      );
    } catch (error) {
      console.error('TTSService: Error getting voices for language:', error);
      return [];
    }
  }

  /**
   * Quick speak method with default options
   */
  async quickSpeak(text: string): Promise<void> {
    return this.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 1.0,
      quality: 'default',
    });
  }

  /**
   * Speak with enhanced quality
   */
  async speakEnhanced(text: string, language = 'en-US'): Promise<void> {
    return this.speak(text, {
      language,
      pitch: 1.0,
      rate: 0.9,
      quality: 'enhanced',
    });
  }
}

// Export singleton instance
export const ttsService = new TTSService();
export default ttsService;
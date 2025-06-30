/**
 * Voice Agent Interface System
 * 
 * Advanced voice interaction system that integrates speech recognition,
 * natural language processing, and speech synthesis with the agent architecture.
 */

import { EventEmitter } from 'events';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { 
  AdvancedAgent, 
  AgentResponse, 
  ReasoningTrace 
} from './AgentCore';
import { multiAgentOrchestrator } from './MultiAgentOrchestrator';
import { Analytics } from '../utils/analytics';
import { ErrorHandler } from '../utils/errorHandler';

export interface VoiceConfig {
  language: 'fr-CA' | 'fr-FR' | 'en-US' | 'en-CA';
  speechRate: number;
  pitch: number;
  voice?: string;
  enableInterruption: boolean;
  noiseReduction: boolean;
  continuousListening: boolean;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: string[];
  language: string;
}

export interface VoiceInteraction {
  id: string;
  type: 'voice_input' | 'voice_output' | 'system_message';
  content: string;
  timestamp: number;
  confidence?: number;
  duration?: number;
  metadata?: {
    language?: string;
    emotion?: string;
    urgency?: number;
  };
}

export interface VoiceSession {
  sessionId: string;
  userId?: string;
  interactions: VoiceInteraction[];
  startTime: number;
  lastActivity: number;
  isActive: boolean;
  preferences: VoiceConfig;
}

/**
 * Advanced Voice Agent Interface
 * 
 * Provides natural voice interaction with the agent system,
 * including speech recognition, processing, and synthesis.
 */
export class VoiceAgentInterface extends EventEmitter {
  private recording: Audio.Recording | null = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private currentSession: VoiceSession | null = null;
  private agent: AdvancedAgent | null = null;
  private config: VoiceConfig;
  private audioPermission: boolean = false;

  constructor(agent?: AdvancedAgent) {
    super();
    
    this.agent = agent;
    this.config = {
      language: 'fr-CA',
      speechRate: 0.8,
      pitch: 1.0,
      enableInterruption: true,
      noiseReduction: true,
      continuousListening: false,
    };

    console.log('🎤 Voice Agent Interface initialized');
  }

  /**
   * Initialize voice capabilities and request permissions
   */
  async initialize(): Promise<boolean> {
    try {
      // Request audio permissions
      const permission = await Audio.requestPermissionsAsync();
      this.audioPermission = permission.status === 'granted';

      if (!this.audioPermission) {
        throw new Error('Audio permission not granted');
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });

      // Check TTS availability
      const availableVoices = await Speech.getAvailableVoicesAsync();
      console.log(`🔊 Available voices: ${availableVoices.length}`);

      Analytics.track('voice_interface_initialized', {
        platform: Platform.OS,
        permission: this.audioPermission,
        availableVoices: availableVoices.length,
      });

      return true;

    } catch (error) {
      ErrorHandler.logError(error as Error, 'VoiceAgentInterface.initialize');
      return false;
    }
  }

  /**
   * Start a new voice conversation session
   */
  async startVoiceSession(
    agent?: AdvancedAgent,
    config?: Partial<VoiceConfig>
  ): Promise<string> {
    if (agent) {
      this.agent = agent;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    const sessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      sessionId,
      interactions: [],
      startTime: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
      preferences: this.config,
    };

    // Welcome message
    await this.speak(this.getWelcomeMessage(), 'system_message');

    Analytics.track('voice_session_started', {
      sessionId,
      language: this.config.language,
    });

    this.emit('session_started', { sessionId });

    return sessionId;
  }

  /**
   * Start listening for voice input
   */
  async startListening(): Promise<void> {
    if (!this.audioPermission) {
      throw new Error('Audio permission required');
    }

    if (this.isListening) {
      return; // Already listening
    }

    try {
      // Stop any current speech
      if (this.isSpeaking) {
        await this.stopSpeaking();
      }

      // Create new recording
      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      await this.recording.startAsync();
      this.isListening = true;

      console.log('🎤 Started listening...');
      this.emit('listening_started');

      // Auto-stop after timeout if not continuous
      if (!this.config.continuousListening) {
        setTimeout(() => {
          if (this.isListening) {
            this.stopListening();
          }
        }, 10000); // 10 second timeout
      }

    } catch (error) {
      ErrorHandler.logError(error as Error, 'VoiceAgentInterface.startListening');
      this.isListening = false;
      throw error;
    }
  }

  /**
   * Stop listening and process the audio
   */
  async stopListening(): Promise<void> {
    if (!this.isListening || !this.recording) {
      return;
    }

    try {
      this.isListening = false;
      
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      console.log('🎤 Stopped listening, processing audio...');
      this.emit('listening_stopped');

      if (uri) {
        // Process the recorded audio
        const result = await this.processAudioInput(uri);
        
        if (result && result.transcript.trim()) {
          await this.handleVoiceInput(result);
        } else {
          await this.speak("Je n'ai pas bien entendu. Pouvez-vous répéter?", 'system_message');
        }
      }

      this.recording = null;

    } catch (error) {
      ErrorHandler.logError(error as Error, 'VoiceAgentInterface.stopListening');
      this.isListening = false;
      this.recording = null;
    }
  }

  /**
   * Speak text using text-to-speech
   */
  async speak(
    text: string, 
    interactionType: 'voice_output' | 'system_message' = 'voice_output'
  ): Promise<void> {
    if (this.isSpeaking && this.config.enableInterruption) {
      await this.stopSpeaking();
    }

    try {
      this.isSpeaking = true;
      
      // Add interaction to session
      if (this.currentSession) {
        const interaction: VoiceInteraction = {
          id: `voice_out_${Date.now()}`,
          type: interactionType,
          content: text,
          timestamp: Date.now(),
        };
        
        this.currentSession.interactions.push(interaction);
        this.currentSession.lastActivity = Date.now();
      }

      console.log(`🔊 Speaking: ${text.substring(0, 50)}...`);
      this.emit('speaking_started', { text });

      // Configure speech options based on language
      const speechOptions: Speech.SpeechOptions = {
        language: this.config.language,
        rate: this.config.speechRate,
        pitch: this.config.pitch,
        quality: Speech.VoiceQuality.Enhanced,
      };

      // Speak the text
      await Speech.speak(text, speechOptions);

      this.isSpeaking = false;
      this.emit('speaking_completed');

      Analytics.track('voice_output_completed', {
        textLength: text.length,
        language: this.config.language,
        sessionId: this.currentSession?.sessionId,
      });

    } catch (error) {
      this.isSpeaking = false;
      ErrorHandler.logError(error as Error, 'VoiceAgentInterface.speak');
      throw error;
    }
  }

  /**
   * Stop current speech
   */
  async stopSpeaking(): Promise<void> {
    if (this.isSpeaking) {
      await Speech.stop();
      this.isSpeaking = false;
      this.emit('speaking_stopped');
    }
  }

  /**
   * Process voice input and generate agent response
   */
  private async handleVoiceInput(recognitionResult: SpeechRecognitionResult): Promise<void> {
    try {
      const { transcript, confidence } = recognitionResult;
      
      // Add voice input to session
      if (this.currentSession) {
        const interaction: VoiceInteraction = {
          id: `voice_in_${Date.now()}`,
          type: 'voice_input',
          content: transcript,
          timestamp: Date.now(),
          confidence,
          metadata: {
            language: recognitionResult.language,
            emotion: this.detectEmotionFromVoice(transcript),
            urgency: this.calculateUrgency(transcript),
          },
        };
        
        this.currentSession.interactions.push(interaction);
        this.currentSession.lastActivity = Date.now();
      }

      console.log(`👂 Recognized: "${transcript}" (confidence: ${confidence.toFixed(2)})`);
      this.emit('voice_input_recognized', { transcript, confidence });

      // Process with agent (use orchestrator for complex queries)
      let response: AgentResponse;
      
      if (this.shouldUseOrchestrator(transcript)) {
        const orchestrationResult = await multiAgentOrchestrator.orchestrateTask(
          transcript,
          this.currentSession?.sessionId || 'voice_session',
          (update) => this.emit('reasoning_progress', update)
        );
        
        response = {
          message: {
            id: `orchestrated_${Date.now()}`,
            role: 'assistant',
            content: orchestrationResult.finalResult,
            timestamp: Date.now(),
          },
          confidence: orchestrationResult.confidence,
        };
      } else if (this.agent) {
        response = await this.agent.processConversation(
          transcript,
          this.currentSession?.sessionId || 'voice_session',
          (step: ReasoningTrace) => this.emit('reasoning_step', step)
        );
      } else {
        throw new Error('No agent available for processing');
      }

      // Speak the response
      await this.speak(response.message.content);

      Analytics.track('voice_interaction_completed', {
        inputLength: transcript.length,
        outputLength: response.message.content.length,
        confidence: response.confidence,
        sessionId: this.currentSession?.sessionId,
      });

    } catch (error) {
      ErrorHandler.logError(error as Error, 'VoiceAgentInterface.handleVoiceInput');
      await this.speak("Désolé, j'ai rencontré une difficulté. Pouvez-vous reformuler?", 'system_message');
    }
  }

  /**
   * Process recorded audio to extract speech
   */
  private async processAudioInput(audioUri: string): Promise<SpeechRecognitionResult | null> {
    try {
      // This is a mock implementation
      // In a real app, you would integrate with:
      // - iOS Speech Framework (native)
      // - Google Speech-to-Text API
      // - Azure Speech Service
      // - Amazon Transcribe
      
      console.log(`🎵 Processing audio file: ${audioUri}`);
      
      // Simulate speech recognition processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock result - would be replaced with actual STT service
      const mockTranscripts = [
        "Peux-tu m'aider avec mon devoir de mathématiques?",
        "Résous l'équation 2x plus 3 égal 7",
        "Comment calculer l'aire d'un cercle?",
        "Explique-moi les dérivées",
        "Salut, comment ça va?",
      ];
      
      const transcript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
      
      return {
        transcript,
        confidence: 0.85 + Math.random() * 0.15,
        isFinal: true,
        language: this.config.language,
        alternatives: [transcript],
      };

    } catch (error) {
      ErrorHandler.logError(error as Error, 'VoiceAgentInterface.processAudioInput');
      return null;
    }
  }

  private shouldUseOrchestrator(input: string): boolean {
    // Determine if input is complex enough for orchestrator
    const complexityIndicators = [
      input.includes('et') || input.includes('puis'),
      input.split('?').length > 2,
      input.length > 100,
      input.includes('comparer') || input.includes('analyser'),
    ];

    return complexityIndicators.filter(Boolean).length >= 2;
  }

  private detectEmotionFromVoice(transcript: string): string {
    // Simple emotion detection from text
    const emotions = {
      excited: ['super', 'génial', 'excellent', 'fantastique'],
      confused: ['comprends pas', 'sais pas', 'confus', 'perdu'],
      frustrated: ['argh', 'difficile', 'compliqué', 'impossible'],
      happy: ['merci', 'parfait', 'bien', 'content'],
    };

    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => transcript.toLowerCase().includes(keyword))) {
        return emotion;
      }
    }

    return 'neutral';
  }

  private calculateUrgency(transcript: string): number {
    let urgency = 0.5;
    
    if (transcript.includes('urgent') || transcript.includes('vite')) {
      urgency += 0.3;
    }
    
    const questionMarks = (transcript.match(/\?/g) || []).length;
    urgency += Math.min(questionMarks * 0.1, 0.2);
    
    return Math.min(urgency, 1.0);
  }

  private getWelcomeMessage(): string {
    const messages = {
      'fr-CA': "Salut! Je suis ton assistant vocal. Tu peux me parler en français québécois pis je vais t'aider avec tes questions!",
      'fr-FR': "Bonjour! Je suis votre assistant vocal. Vous pouvez me parler et je vous aiderai avec vos questions.",
      'en-US': "Hello! I'm your voice assistant. You can speak to me and I'll help you with your questions.",
      'en-CA': "Hello! I'm your voice assistant. You can speak to me in English or French and I'll help you out!"
    };

    return messages[this.config.language] || messages['en-US'];
  }

  // Configuration and status methods
  updateConfig(newConfig: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config_updated', this.config);
  }

  getSession(): VoiceSession | null {
    return this.currentSession;
  }

  async endSession(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.isActive = false;
      
      Analytics.track('voice_session_ended', {
        sessionId: this.currentSession.sessionId,
        duration: Date.now() - this.currentSession.startTime,
        interactions: this.currentSession.interactions.length,
      });

      this.emit('session_ended', { sessionId: this.currentSession.sessionId });
    }

    if (this.isListening) {
      await this.stopListening();
    }

    if (this.isSpeaking) {
      await this.stopSpeaking();
    }

    this.currentSession = null;
  }

  isActive(): boolean {
    return this.currentSession?.isActive || false;
  }

  getCapabilities(): VoiceCapabilities {
    return {
      speechRecognition: this.audioPermission,
      textToSpeech: true,
      continuousListening: this.config.continuousListening,
      interruptionSupport: this.config.enableInterruption,
      languages: ['fr-CA', 'fr-FR', 'en-US', 'en-CA'],
      currentLanguage: this.config.language,
    };
  }
}

export interface VoiceCapabilities {
  speechRecognition: boolean;
  textToSpeech: boolean;
  continuousListening: boolean;
  interruptionSupport: boolean;
  languages: string[];
  currentLanguage: string;
}

export default VoiceAgentInterface;
import { useState, useEffect, useCallback, useRef } from 'react';
import Voice, { SpeechRecognizedEvent, SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import * as Speech from 'expo-speech';
import { Alert, Linking } from 'react-native';
import { ListeningState } from '../state/chatStore';
import { ErrorInfo, commonErrors } from '../components/ErrorModal';

interface VoiceControlOptions {
  onSpeechRecognized?: (text: string) => void;
  onError?: (error: ErrorInfo) => void;
  onStateChange?: (state: ListeningState) => void;
  timeout?: number; // in milliseconds
  language?: string;
}

interface VoiceControlResult {
  listeningState: ListeningState;
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  recognizedText: string;
  clearRecognizedText: () => void;
}

export const useVoiceControl = (options: VoiceControlOptions = {}): VoiceControlResult => {
  const {
    onSpeechRecognized,
    onError,
    onStateChange,
    timeout = 10000, // 10 second timeout
    language = 'en-US',
  } = options;

  const [listeningState, setListeningState] = useState<ListeningState>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  const updateState = useCallback((newState: ListeningState) => {
    setListeningState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  const handleError = useCallback((error: ErrorInfo) => {
    updateState('idle');
    onError?.(error);
  }, [onError, updateState]);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Initialize Voice
  useEffect(() => {
    const initializeVoice = async () => {
      try {
        await Voice.destroy();
        await Voice.removeAllListeners();
        
        // Set up event listeners
        Voice.onSpeechStart = () => {
          console.log('Speech started');
          clearTimeoutRef();
          updateState('listening');
        };

        Voice.onSpeechRecognized = (event: SpeechRecognizedEvent) => {
          console.log('Speech recognized:', event);
        };

        Voice.onSpeechEnd = () => {
          console.log('Speech ended');
          updateState('processing');
        };

        Voice.onSpeechError = (event: SpeechErrorEvent) => {
          console.error('Speech error:', event.error);
          clearTimeoutRef();
          
          let errorInfo: ErrorInfo;
          
          if (event.error?.message?.includes('timeout') || event.error?.code === '7') {
            errorInfo = commonErrors.sttTimeout();
          } else if (event.error?.message?.includes('permission') || event.error?.code === '9') {
            errorInfo = commonErrors.sttPermission(() => {
              Linking.openSettings();
            });
          } else if (event.error?.message?.includes('network') || event.error?.code === '2') {
            errorInfo = commonErrors.networkError();
          } else {
            errorInfo = {
              type: 'stt',
              title: 'Speech Recognition Error',
              message: event.error?.message || 'An error occurred during speech recognition. Please try again.',
            };
          }
          
          handleError(errorInfo);
        };

        Voice.onSpeechResults = (event: SpeechResultsEvent) => {
          console.log('Speech results:', event.value);
          clearTimeoutRef();
          
          if (event.value && event.value.length > 0) {
            const recognizedText = event.value[0];
            setRecognizedText(recognizedText);
            onSpeechRecognized?.(recognizedText);
          }
          
          updateState('idle');
        };

        Voice.onSpeechPartialResults = (event: SpeechResultsEvent) => {
          console.log('Partial results:', event.value);
          if (event.value && event.value.length > 0) {
            setRecognizedText(event.value[0]);
          }
        };

        isInitialized.current = true;
        console.log('Voice initialized successfully');
      } catch (error) {
        console.error('Voice initialization error:', error);
        isInitialized.current = false;
      }
    };

    initializeVoice();

    return () => {
      Voice.destroy();
      Voice.removeAllListeners();
      clearTimeoutRef();
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!isInitialized.current) {
      handleError({
        type: 'stt',
        title: 'Voice Service Unavailable',
        message: 'Voice recognition service is not available. Please restart the app and try again.',
      });
      return;
    }

    if (listeningState !== 'idle') {
      console.log('Already listening or processing');
      return;
    }

    try {
      // Clear any previous recognized text
      setRecognizedText('');
      
      // Start listening
      updateState('listening');
      await Voice.start(language);
      
      // Set timeout for listening
      timeoutRef.current = setTimeout(() => {
        console.log('Voice timeout reached');
        stopListening();
        handleError(commonErrors.sttTimeout());
      }, timeout);
      
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      
      let errorInfo: ErrorInfo;
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorInfo = commonErrors.sttPermission(() => {
            Linking.openSettings();
          });
        } else if (error.message.includes('network')) {
          errorInfo = commonErrors.networkError();
        } else {
          errorInfo = {
            type: 'stt',
            title: 'Failed to Start Listening',
            message: error.message || 'Unable to start voice recognition. Please try again.',
          };
        }
      } else {
        errorInfo = {
          type: 'stt',
          title: 'Voice Recognition Error',
          message: 'An unexpected error occurred. Please try again.',
        };
      }
      
      handleError(errorInfo);
    }
  }, [listeningState, language, timeout, handleError, updateState]);

  const stopListening = useCallback(async () => {
    try {
      clearTimeoutRef();
      await Voice.stop();
      
      // Only update to idle if we're not already processing
      if (listeningState === 'listening') {
        updateState('processing');
        
        // Auto-transition to idle after a short delay if no results
        setTimeout(() => {
          if (listeningState === 'processing') {
            updateState('idle');
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      updateState('idle');
    }
  }, [listeningState, updateState, clearTimeoutRef]);

  const speak = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      
      await Speech.speak(text, {
        language,
        pitch: 1.0,
        rate: 0.9,
        quality: 'enhanced',
        onDone: () => {
          setIsSpeaking(false);
        },
        onStopped: () => {
          setIsSpeaking(false);
        },
        onError: (error) => {
          console.error('TTS Error:', error);
          setIsSpeaking(false);
        },
      });
    } catch (error) {
      console.error('Error speaking text:', error);
      setIsSpeaking(false);
    }
  }, [language]);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  const clearRecognizedText = useCallback(() => {
    setRecognizedText('');
  }, []);

  return {
    listeningState,
    isListening: listeningState === 'listening' || listeningState === 'processing',
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isSpeaking,
    recognizedText,
    clearRecognizedText,
  };
};
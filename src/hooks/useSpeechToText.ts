import { useState, useEffect, useCallback, useRef } from 'react';
import Voice, { SpeechRecognizedEvent, SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

interface UseSpeechToTextOptions {
  locale?: string;
  continuous?: boolean;
  partialResults?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onResults?: (results: string[]) => void;
}

interface UseSpeechToTextReturn {
  transcribedText: string;
  partialText: string;
  isRecording: boolean;
  error: string | null;
  startRecognition: () => Promise<void>;
  stopRecognition: () => Promise<void>;
  clearText: () => void;
  isAvailable: boolean;
}

export const useSpeechToText = (options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn => {
  const {
    locale = 'en-US',
    continuous = false,
    partialResults = true,
    onStart,
    onEnd,
    onError,
    onResults,
  } = options;

  const [transcribedText, setTranscribedText] = useState<string>('');
  const [partialText, setPartialText] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);

  const isInitialized = useRef<boolean>(false);

  // Initialize Voice service
  useEffect(() => {
    const initializeVoice = async () => {
      try {
        // Check if voice recognition is available
        const available = await Voice.isAvailable();
        setIsAvailable(available);

        if (available) {
          // Set up event listeners
          Voice.onSpeechStart = onSpeechStart;
          Voice.onSpeechRecognized = onSpeechRecognized;
          Voice.onSpeechEnd = onSpeechEnd;
          Voice.onSpeechError = onSpeechError;
          Voice.onSpeechResults = onSpeechResults;
          Voice.onSpeechPartialResults = onSpeechPartialResults;
          Voice.onSpeechVolumeChanged = onSpeechVolumeChanged;

          isInitialized.current = true;
        }
      } catch (e) {
        console.error('Error initializing Voice service:', e);
        setError('Failed to initialize voice recognition');
        setIsAvailable(false);
      }
    };

    initializeVoice();

    // Cleanup on unmount
    return () => {
      if (isInitialized.current) {
        Voice.destroy().then(Voice.removeAllListeners);
      }
    };
  }, []);

  // Event handlers
  const onSpeechStart = useCallback(() => {
    console.log('Speech recognition started');
    setIsRecording(true);
    setError(null);
    onStart?.();
  }, [onStart]);

  const onSpeechRecognized = useCallback(() => {
    console.log('Speech recognized');
  }, []);

  const onSpeechEnd = useCallback(() => {
    console.log('Speech recognition ended');
    setIsRecording(false);
    setPartialText('');
    onEnd?.();
  }, [onEnd]);

  const onSpeechError = useCallback((event: SpeechErrorEvent) => {
    console.error('Speech recognition error:', event.error);
    const errorMessage = event.error?.message || 'Speech recognition error occurred';
    setError(errorMessage);
    setIsRecording(false);
    setPartialText('');
    onError?.(errorMessage);
  }, [onError]);

  const onSpeechResults = useCallback((event: SpeechResultsEvent) => {
    console.log('Speech results:', event.value);
    if (event.value && event.value.length > 0) {
      const result = event.value[0];
      setTranscribedText(result);
      setPartialText('');
      onResults?.(event.value);
    }
  }, [onResults]);

  const onSpeechPartialResults = useCallback((event: SpeechResultsEvent) => {
    console.log('Speech partial results:', event.value);
    if (event.value && event.value.length > 0 && partialResults) {
      setPartialText(event.value[0]);
    }
  }, [partialResults]);

  const onSpeechVolumeChanged = useCallback((event: any) => {
    // Optional: Handle volume changes for visual feedback
    console.log('Speech volume changed:', event.value);
  }, []);

  // Start speech recognition
  const startRecognition = useCallback(async (): Promise<void> => {
    if (!isAvailable) {
      throw new Error('Voice recognition is not available');
    }

    if (isRecording) {
      console.log('Speech recognition is already running');
      return;
    }

    try {
      setError(null);
      setPartialText('');
      
      const options = {
        locale,
        continuous,
        partialResults,
      };

      await Voice.start(locale, options);
    } catch (e) {
      console.error('Error starting speech recognition:', e);
      const errorMessage = 'Failed to start speech recognition';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [isAvailable, isRecording, locale, continuous, partialResults]);

  // Stop speech recognition
  const stopRecognition = useCallback(async (): Promise<void> => {
    if (!isRecording) {
      console.log('Speech recognition is not running');
      return;
    }

    try {
      await Voice.stop();
      setIsRecording(false);
      setPartialText('');
    } catch (e) {
      console.error('Error stopping speech recognition:', e);
      setError('Failed to stop speech recognition');
      throw new Error('Failed to stop speech recognition');
    }
  }, [isRecording]);

  // Clear transcribed text
  const clearText = useCallback(() => {
    setTranscribedText('');
    setPartialText('');
    setError(null);
  }, []);

  return {
    transcribedText,
    partialText,
    isRecording,
    error,
    startRecognition,
    stopRecognition,
    clearText,
    isAvailable,
  };
};
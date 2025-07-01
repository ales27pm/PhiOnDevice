import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore, ChatMessage, ListeningState } from '../state/chatStore';
import { VoiceVisualizer } from '../components/VoiceVisualizer';
import { ErrorModal, ErrorInfo, commonErrors } from '../components/ErrorModal';
import { useVoiceControl } from '../hooks/useVoiceControl';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { cn } from '../utils/cn';

const AssistantScreen: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [currentError, setCurrentError] = useState<ErrorInfo | null>(null);
  const [showWakeWordDetection, setShowWakeWordDetection] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const { 
    messages, 
    isGenerating,
    currentProvider,
    memoryEnabled,
    networkStatus,
    addMessage, 
    sendMessage,
    sendStreamingMessage,
    switchProvider,
    initializeMemory,
    toggleMemory,
    refreshProvider,
    setNetworkStatus
  } = useChatStore();
  
  const networkState = useNetworkStatus();

  const {
    listeningState,
    isListening,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isSpeaking,
    recognizedText,
    clearRecognizedText,
  } = useVoiceControl({
    onSpeechRecognized: handleVoiceInput,
    onError: setCurrentError,
    timeout: 15000, // 15 second timeout
  });

  // Initialize memory service and refresh provider on component mount
  useEffect(() => {
    const initialize = async () => {
      await initializeMemory();
      await refreshProvider();
    };
    initialize();
  }, []);

  // Monitor network status
  useEffect(() => {
    setNetworkStatus(networkState.status);
  }, [networkState.status, setNetworkStatus]);
  
  // Show network errors
  useEffect(() => {
    if (networkState.status === 'offline' && !currentError) {
      setCurrentError(commonErrors.networkError());
    }
  }, [networkState.status, currentError]);

  // Simulate wake word detection (in real app, this would be continuous)
  useEffect(() => {
    const interval = setInterval(() => {
      if (listeningState === 'idle' && !isGenerating && Math.random() < 0.05) {
        setShowWakeWordDetection(true);
        setTimeout(() => {
          setShowWakeWordDetection(false);
        }, 2000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [listeningState, isGenerating]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputText.trim() && !isGenerating) {
      const message = inputText.trim();
      setInputText('');
      
      try {
        await sendStreamingMessage(message);
      } catch (error) {
        console.error('Error sending message:', error);
        setCurrentError({
          type: 'llm',
          title: 'Message Send Failed',
          message: 'Failed to send your message. Please check your connection and try again.',
        });
      }
    }
  };

  const handleVoiceInput = async (text: string) => {
    if (text.trim()) {
      try {
        await sendStreamingMessage(text);
      } catch (error) {
        console.error('Error processing voice input:', error);
        setCurrentError(commonErrors.llmError());
      }
    }
    clearRecognizedText();
  };

  const handleRetryLastMessage = async () => {
    const lastUserMessage = messages.filter(m => m.isUser).pop();
    if (lastUserMessage) {
      try {
        await sendStreamingMessage(lastUserMessage.text);
      } catch (error) {
        setCurrentError(commonErrors.llmError());
      }
    }
  };

  const handleMicrophonePress = async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  const getVoiceVisualizerState = () => {
    if (showWakeWordDetection) return 'wake-word';
    if (isGenerating) return 'generating';
    if (listeningState === 'processing') return 'processing';
    if (listeningState === 'listening') return 'listening';
    return 'idle';
  };

  const getMicrophoneIcon = () => {
    switch (listeningState) {
      case 'listening':
        return 'mic';
      case 'processing':
        return 'hourglass';
      default:
        return 'mic-outline';
    }
  };

  const getMicrophoneColor = () => {
    switch (listeningState) {
      case 'listening':
        return '#ef4444'; // red-500
      case 'processing':
        return '#f59e0b'; // amber-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  const renderMessage = (message: ChatMessage, index: number) => (
    <View
      key={message.id}
      className={cn(
        'mb-4 flex-row',
        message.isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <View
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3',
          message.isUser
            ? 'bg-blue-500 rounded-br-md'
            : 'bg-gray-100 rounded-bl-md'
        )}
      >
        <Text
          className={cn(
            'text-base leading-5',
            message.isUser ? 'text-white' : 'text-gray-900'
          )}
        >
          {message.text}
        </Text>
        <Text
          className={cn(
            'text-xs mt-1 opacity-70',
            message.isUser ? 'text-blue-100' : 'text-gray-500'
          )}
        >
          {(() => {
            try {
              const date = new Date(message.timestamp);
              return date.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
            } catch {
              return new Date().toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
            }
          })()}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View className="px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={toggleMemory}
              className={cn(
                'w-8 h-8 rounded-full items-center justify-center',
                memoryEnabled ? 'bg-green-100' : 'bg-gray-100'
              )}
            >
              <Ionicons
                name={memoryEnabled ? 'bulb' : 'bulb-outline'}
                size={16}
                color={memoryEnabled ? '#059669' : '#6b7280'}
              />
            </Pressable>
            
            <Text className="text-xl font-semibold text-gray-900 flex-1 text-center">
              Voice Assistant
            </Text>
            
            <Pressable
              onPress={() => navigation.navigate('Settings' as never)}
              className="w-8 h-8 rounded-full items-center justify-center bg-gray-100"
            >
              <Ionicons
                name="settings-outline"
                size={16}
                color="#6b7280"
              />
            </Pressable>
          </View>
          
          {/* Voice Visualizer */}
          <View className="items-center mt-3 mb-2">
            <VoiceVisualizer 
              state={getVoiceVisualizerState()}
              size={60}
            />
          </View>
          
          <Text className="text-sm text-gray-500 text-center mt-1">
            {showWakeWordDetection && 'Wake word detected!'}
            {listeningState === 'listening' && !showWakeWordDetection && 'Listening...'}
            {listeningState === 'processing' && 'Processing speech...'}
            {isGenerating && memoryEnabled && 'AI is thinking with memory context...'}
            {isGenerating && !memoryEnabled && 'AI is thinking...'}
            {recognizedText && `Recognized: "${recognizedText}"`}
            {networkState.status === 'offline' && 'No internet connection'}
            {networkState.status === 'slow' && 'Slow connection detected'}
            {listeningState === 'idle' && !isGenerating && !showWakeWordDetection && !recognizedText && networkState.status === 'online' &&
              `Ready to help • ${currentProvider.toUpperCase()}${memoryEnabled ? ' • Memory ON' : ' • Memory OFF'}`
            }
          </Text>
          
          {/* Network Status Indicator */}
          {networkState.status !== 'online' && (
            <View className="flex-row items-center justify-center mt-2">
              <Ionicons 
                name={networkState.status === 'offline' ? 'wifi-outline' : 'cellular-outline'} 
                size={14} 
                color={networkState.status === 'offline' ? '#ef4444' : '#f59e0b'} 
              />
              <Text className={cn(
                'text-xs ml-1',
                networkState.status === 'offline' ? 'text-red-500' : 'text-amber-500'
              )}>
                {networkState.status === 'offline' ? 'Offline' : 'Slow Connection'}
              </Text>
            </View>
          )}
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
        >
          {messages.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
              <Text className="text-gray-500 text-center mt-4 text-base">
                Start a conversation by typing a message or using voice input
              </Text>
              <Text className="text-gray-400 text-center mt-2 text-sm">
                Tap the microphone to speak or type below
              </Text>
            </View>
          ) : (
            messages.map(renderMessage)
          )}
        </ScrollView>

        {/* Input Area */}
        <View
          className="px-4 py-3 bg-gray-50 border-t border-gray-200"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="flex-row items-end space-x-3">
            {/* Text Input */}
            <View className="flex-1 bg-white rounded-full border border-gray-300 px-4 py-3">
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                placeholderTextColor="#9ca3af"
                className="text-base text-gray-900 min-h-[20px] max-h-[100px]"
                multiline
                textAlignVertical="center"
                onSubmitEditing={handleSendMessage}
                blurOnSubmit={false}
              />
            </View>

            {/* Send Button */}
            <Pressable
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isGenerating || networkState.status === 'offline'}
              className={cn(
                'w-12 h-12 rounded-full items-center justify-center',
                inputText.trim() && !isGenerating && networkState.status !== 'offline'
                  ? 'bg-blue-500'
                  : 'bg-gray-300'
              )}
            >
              <Ionicons
                name={isGenerating ? "hourglass" : networkState.status === 'offline' ? "wifi-outline" : "send"}
                size={20}
                color={inputText.trim() && !isGenerating && networkState.status !== 'offline' ? 'white' : '#9ca3af'}
              />
            </Pressable>

            {/* Microphone Button */}
            <Pressable
              onPress={handleMicrophonePress}
              disabled={isGenerating || networkState.status === 'offline'}
              className={cn(
                'w-12 h-12 rounded-full items-center justify-center border-2',
                listeningState === 'listening'
                  ? 'bg-red-50 border-red-500'
                  : listeningState === 'processing'
                  ? 'bg-amber-50 border-amber-500'
                  : isGenerating || networkState.status === 'offline'
                  ? 'bg-gray-100 border-gray-200'
                  : 'bg-gray-50 border-gray-300'
              )}
            >
              <Ionicons
                name={networkState.status === 'offline' ? 'wifi-outline' : getMicrophoneIcon()}
                size={24}
                color={isGenerating || networkState.status === 'offline' ? '#d1d5db' : getMicrophoneColor()}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      {/* Error Modal */}
      <ErrorModal
        visible={!!currentError}
        error={currentError}
        onDismiss={() => setCurrentError(null)}
        onRetry={handleRetryLastMessage}
      />
    </SafeAreaView>
  );
};

export default AssistantScreen;
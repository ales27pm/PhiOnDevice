import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VoiceVisualizer } from '../components/VoiceVisualizer';
import { ErrorModal, ErrorInfo, commonErrors } from '../components/ErrorModal';
import { useVoiceControl } from '../hooks/useVoiceControl';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { cn } from '../utils/cn';

const VoicePipelineTestScreen: React.FC = () => {
  const [currentTest, setCurrentTest] = useState<string>('');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [currentError, setCurrentError] = useState<ErrorInfo | null>(null);
  const [visualizerState, setVisualizerState] = useState<'idle' | 'wake-word' | 'listening' | 'processing' | 'generating'>('idle');

  const networkStatus = useNetworkStatus();
  
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
    onSpeechRecognized: (text) => {
      addTestResult(`✅ Speech recognized: "${text}"`);
    },
    onError: (error) => {
      addTestResult(`❌ Voice error: ${error.title} - ${error.message}`);
      setCurrentError(error);
    },
    timeout: 10000,
  });

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const clearResults = () => {
    setTestResults([]);
    setCurrentTest('');
  };

  const runTest = async (testName: string, testFn: () => Promise<void> | void) => {
    setCurrentTest(testName);
    addTestResult(`🧪 Starting test: ${testName}`);
    
    try {
      await testFn();
      addTestResult(`✅ Test completed: ${testName}`);
    } catch (error) {
      addTestResult(`❌ Test failed: ${testName} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCurrentTest('');
    }
  };

  const tests = [
    {
      name: 'Voice Visualizer States',
      action: () => runTest('Voice Visualizer States', async () => {
        const states: Array<'idle' | 'wake-word' | 'listening' | 'processing' | 'generating'> = 
          ['wake-word', 'listening', 'processing', 'generating', 'idle'];
        
        for (const state of states) {
          setVisualizerState(state);
          addTestResult(`🎨 Showing ${state} state`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }),
    },
    {
      name: 'Voice Recognition',
      action: () => runTest('Voice Recognition', async () => {
        addTestResult('🎤 Starting voice recognition...');
        await startListening();
        
        // Let it listen for 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        if (isListening) {
          await stopListening();
          addTestResult('🛑 Stopped listening manually');
        }
      }),
    },
    {
      name: 'Text-to-Speech',
      action: () => runTest('Text-to-Speech', async () => {
        const testText = 'This is a test of the text-to-speech functionality. The voice pipeline is working correctly.';
        addTestResult('🔊 Starting text-to-speech...');
        await speak(testText);
        addTestResult('✅ Text-to-speech completed');
      }),
    },
    {
      name: 'Network Error Simulation',
      action: () => runTest('Network Error Simulation', () => {
        setCurrentError(commonErrors.networkError());
        addTestResult('🌐 Network error modal shown');
      }),
    },
    {
      name: 'STT Timeout Simulation',
      action: () => runTest('STT Timeout Simulation', () => {
        setCurrentError(commonErrors.sttTimeout());
        addTestResult('⏱️ STT timeout error modal shown');
      }),
    },
    {
      name: 'Permission Error Simulation',
      action: () => runTest('Permission Error Simulation', () => {
        setCurrentError(commonErrors.sttPermission(() => {
          Alert.alert('Test', 'This would open device settings');
        }));
        addTestResult('🔒 Permission error modal shown');
      }),
    },
    {
      name: 'LLM Error Simulation',
      action: () => runTest('LLM Error Simulation', () => {
        setCurrentError(commonErrors.llmError());
        addTestResult('🤖 LLM error modal shown');
      }),
    },
    {
      name: 'Rate Limit Simulation',
      action: () => runTest('Rate Limit Simulation', () => {
        setCurrentError(commonErrors.rateLimitError());
        addTestResult('⚡ Rate limit error modal shown');
      }),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Voice Pipeline Test Suite
        </Text>
        
        <Text className="text-gray-600 mb-6">
          Test all voice pipeline features, visual states, and error handling
        </Text>

        {/* Network Status */}
        <View className="bg-gray-50 rounded-xl p-4 mb-6">
          <Text className="font-semibold text-gray-900 mb-2">Network Status</Text>
          <View className="flex-row items-center">
            <Ionicons 
              name={networkStatus.status === 'online' ? 'wifi' : networkStatus.status === 'offline' ? 'wifi-outline' : 'cellular'} 
              size={20} 
              color={networkStatus.status === 'online' ? '#059669' : networkStatus.status === 'offline' ? '#ef4444' : '#f59e0b'} 
            />
            <Text className="ml-2 text-gray-700">
              {networkStatus.status.toUpperCase()} - {networkStatus.connectionType}
            </Text>
          </View>
        </View>

        {/* Voice Visualizer Demo */}
        <View className="bg-gray-50 rounded-xl p-4 mb-6">
          <Text className="font-semibold text-gray-900 mb-4">Voice Visualizer Demo</Text>
          <View className="items-center">
            <VoiceVisualizer 
              state={visualizerState}
              size={100}
            />
            <Text className="mt-2 text-gray-600">
              Current State: {visualizerState}
            </Text>
          </View>
        </View>

        {/* Voice Status */}
        <View className="bg-gray-50 rounded-xl p-4 mb-6">
          <Text className="font-semibold text-gray-900 mb-2">Voice Status</Text>
          <View className="space-y-1">
            <Text className="text-gray-700">Listening State: {listeningState}</Text>
            <Text className="text-gray-700">Is Listening: {isListening ? 'Yes' : 'No'}</Text>
            <Text className="text-gray-700">Is Speaking: {isSpeaking ? 'Yes' : 'No'}</Text>
            {recognizedText && (
              <Text className="text-gray-700">Recognized: "{recognizedText}"</Text>
            )}
          </View>
        </View>

        {/* Test Controls */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900">Tests</Text>
            <Pressable
              onPress={clearResults}
              className="bg-gray-100 px-4 py-2 rounded-lg"
            >
              <Text className="text-gray-700 font-medium">Clear Results</Text>
            </Pressable>
          </View>

          <View className="space-y-3">
            {tests.map((test) => (
              <Pressable
                key={test.name}
                onPress={test.action}
                disabled={currentTest === test.name}
                className={cn(
                  'bg-blue-500 rounded-xl p-4 flex-row items-center justify-between',
                  currentTest === test.name && 'bg-blue-300'
                )}
              >
                <Text className="text-white font-medium flex-1">
                  {test.name}
                </Text>
                {currentTest === test.name ? (
                  <Ionicons name="hourglass" size={20} color="white" />
                ) : (
                  <Ionicons name="play" size={20} color="white" />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Test Results */}
        {testResults.length > 0 && (
          <View className="bg-gray-50 rounded-xl p-4">
            <Text className="font-semibold text-gray-900 mb-3">Test Results</Text>
            <ScrollView className="max-h-64">
              {testResults.map((result, index) => (
                <Text
                  key={index}
                  className={cn(
                    'text-sm mb-1 font-mono',
                    result.includes('✅') ? 'text-green-600' :
                    result.includes('❌') ? 'text-red-600' :
                    result.includes('🧪') ? 'text-blue-600' :
                    'text-gray-600'
                  )}
                >
                  {result}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Error Modal */}
      <ErrorModal
        visible={!!currentError}
        error={currentError}
        onDismiss={() => setCurrentError(null)}
        onRetry={() => {
          addTestResult('🔄 Retry action triggered');
        }}
      />
    </SafeAreaView>
  );
};

export default VoicePipelineTestScreen;
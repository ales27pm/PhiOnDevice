import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../utils/cn';

const TurboModuleTestScreen: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTestingOnDevice, setIsTestingOnDevice] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testOnDeviceLLM = async () => {
    setIsTestingOnDevice(true);
    addTestResult('🧪 Testing OnDeviceLLM module...');
    
    try {
      // Try to get the TurboModuleRegistry
      const { TurboModuleRegistry } = require('react-native');
      addTestResult('✅ TurboModuleRegistry available');
      
      // Try to get the OnDeviceLLM module
      const OnDeviceLLM = TurboModuleRegistry.get('OnDeviceLLM');
      
      if (OnDeviceLLM) {
        addTestResult('✅ OnDeviceLLM module found');
        
        try {
          const isReady = await OnDeviceLLM.isReady();
          addTestResult(`📊 Module ready status: ${isReady}`);
          
          if (isReady) {
            const modelInfo = await OnDeviceLLM.getModelInfo();
            addTestResult(`📋 Model info: ${JSON.stringify(modelInfo)}`);
          }
        } catch (error) {
          addTestResult(`⚠️ Module methods error: ${error}`);
        }
      } else {
        addTestResult('❌ OnDeviceLLM module not found - not linked or not built');
      }
    } catch (error) {
      addTestResult(`❌ TurboModuleRegistry error: ${error}`);
    }
    
    setIsTestingOnDevice(false);
  };

  const testVoicePipeline = async () => {
    setIsTestingVoice(true);
    addTestResult('🎤 Testing VoicePipeline module...');
    
    try {
      // Try to get the TurboModuleRegistry
      const { TurboModuleRegistry } = require('react-native');
      addTestResult('✅ TurboModuleRegistry available for voice');
      
      // Try to get the VoicePipeline module
      const VoicePipeline = TurboModuleRegistry.get('VoicePipeline');
      
      if (VoicePipeline) {
        addTestResult('✅ VoicePipeline module found');
        
        try {
          const isRunning = await VoicePipeline.isRunning();
          addTestResult(`📊 Pipeline running status: ${isRunning}`);
          
          const currentState = await VoicePipeline.getCurrentState();
          addTestResult(`📋 Current state: ${currentState}`);
        } catch (error) {
          addTestResult(`⚠️ Pipeline methods error: ${error}`);
        }
      } else {
        addTestResult('❌ VoicePipeline module not found - not linked or not built');
      }
    } catch (error) {
      addTestResult(`❌ TurboModuleRegistry error for voice: ${error}`);
    }
    
    setIsTestingVoice(false);
  };

  const testRuntimeEnvironment = () => {
    addTestResult('🔍 Testing runtime environment...');
    
    try {
      const { Platform } = require('react-native');
      addTestResult(`📱 Platform: ${Platform.OS} ${Platform.Version}`);
      
      // Check if we're in development or production
      const isDev = __DEV__;
      addTestResult(`🔧 Development mode: ${isDev}`);
      
      // Check if TurboModules are enabled
      const { TurboModuleRegistry } = require('react-native');
      const hasRegistry = !!TurboModuleRegistry;
      addTestResult(`⚡ TurboModuleRegistry available: ${hasRegistry}`);
      
      if (hasRegistry) {
        // Try to list some known modules
        const knownModules = ['PlatformConstants', 'DeviceInfo'];
        for (const moduleName of knownModules) {
          try {
            const module = TurboModuleRegistry.get(moduleName);
            addTestResult(`📦 ${moduleName}: ${module ? 'available' : 'not available'}`);
          } catch (error) {
            addTestResult(`📦 ${moduleName}: error - ${error}`);
          }
        }
      }
      
    } catch (error) {
      addTestResult(`❌ Environment test error: ${error}`);
    }
  };

  useEffect(() => {
    // Run environment test on mount
    testRuntimeEnvironment();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Turbo Module Test Suite
        </Text>
        
        <Text className="text-gray-600 mb-6">
          Test the OnDeviceLLM and VoicePipeline Turbo Modules integration
        </Text>

        {/* Test Controls */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900">Module Tests</Text>
            <Pressable
              onPress={clearResults}
              className="bg-gray-100 px-4 py-2 rounded-lg"
            >
              <Text className="text-gray-700 font-medium">Clear Results</Text>
            </Pressable>
          </View>

          <View className="space-y-3">
            <Pressable
              onPress={testRuntimeEnvironment}
              className="bg-blue-500 rounded-xl p-4 flex-row items-center justify-between"
            >
              <Text className="text-white font-medium flex-1">
                Test Runtime Environment
              </Text>
              <Ionicons name="information-circle" size={20} color="white" />
            </Pressable>
            
            <Pressable
              onPress={testOnDeviceLLM}
              disabled={isTestingOnDevice}
              className={cn(
                'bg-green-500 rounded-xl p-4 flex-row items-center justify-between',
                isTestingOnDevice && 'bg-green-300'
              )}
            >
              <Text className="text-white font-medium flex-1">
                Test OnDeviceLLM Module
              </Text>
              {isTestingOnDevice ? (
                <Ionicons name="hourglass" size={20} color="white" />
              ) : (
                <Ionicons name="hardware-chip" size={20} color="white" />
              )}
            </Pressable>

            <Pressable
              onPress={testVoicePipeline}
              disabled={isTestingVoice}
              className={cn(
                'bg-purple-500 rounded-xl p-4 flex-row items-center justify-between',
                isTestingVoice && 'bg-purple-300'
              )}
            >
              <Text className="text-white font-medium flex-1">
                Test VoicePipeline Module
              </Text>
              {isTestingVoice ? (
                <Ionicons name="hourglass" size={20} color="white" />
              ) : (
                <Ionicons name="mic" size={20} color="white" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Test Results */}
        {testResults.length > 0 && (
          <View className="bg-gray-50 rounded-xl p-4">
            <Text className="font-semibold text-gray-900 mb-3">Test Results</Text>
            <ScrollView className="max-h-96">
              {testResults.map((result, index) => (
                <Text
                  key={index}
                  className={cn(
                    'text-sm mb-1 font-mono',
                    result.includes('✅') ? 'text-green-600' :
                    result.includes('❌') ? 'text-red-600' :
                    result.includes('⚠️') ? 'text-amber-600' :
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

        {/* Instructions */}
        <View className="mt-6 bg-blue-50 rounded-xl p-4">
          <Text className="font-semibold text-blue-900 mb-2">Instructions</Text>
          <Text className="text-blue-800 text-sm leading-relaxed">
            • <Text className="font-medium">Runtime Environment</Text>: Checks if TurboModules are available{'\n'}
            • <Text className="font-medium">OnDeviceLLM</Text>: Tests Core ML model integration{'\n'}
            • <Text className="font-medium">VoicePipeline</Text>: Tests voice processing capabilities{'\n'}
            • <Text className="font-medium">Expected</Text>: Modules will only be available after native build with proper linking
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TurboModuleTestScreen;
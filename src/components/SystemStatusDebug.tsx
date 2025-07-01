/**
 * System Status Debug Component
 * Shows detailed information about the local LLM and agent system
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { agentFactory } from '../agent/AgentFactory';
import { nativePhi4LLM, isNativeLLMSupported } from '../api/nativePhi4LLM';

export default function SystemStatusDebug() {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setIsLoading(true);
    try {
      const status = await agentFactory.getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('Failed to get system status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testNativeLLM = async () => {
    if (!isNativeLLMSupported) {
      alert('Native LLM not supported on this platform');
      return;
    }

    try {
      const result = await nativePhi4LLM.generateText(
        "What is 2 + 2?",
        { maxTokens: 50, temperature: 0.1 }
      );
      
      alert(`Native LLM Test Result:\n${result.text}\n\nTokens: ${result.tokensGenerated}\nSpeed: ${result.tokensPerSecond.toFixed(1)} t/s`);
    } catch (error) {
      alert(`Native LLM Test Failed: ${(error as Error).message}`);
    }
  };

  if (isLoading) {
    return (
      <View className="bg-white rounded-lg p-4 m-4">
        <Text className="text-center text-gray-600">Loading system status...</Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-lg p-4 m-4 border border-gray-200">
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between"
      >
        <View className="flex-row items-center space-x-2">
          <Ionicons name="hardware-chip" size={20} color="#6B7280" />
          <Text className="font-semibold text-gray-900">System Status</Text>
          {systemStatus?.nativeLLMLoaded ? (
            <View className="bg-green-100 px-2 py-1 rounded-full">
              <Text className="text-xs font-medium text-green-800">🧠 Native Active</Text>
            </View>
          ) : (
            <View className="bg-orange-100 px-2 py-1 rounded-full">
              <Text className="text-xs font-medium text-orange-800">☁️ API Mode</Text>
            </View>
          )}
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#6B7280" 
        />
      </Pressable>

      {isExpanded && systemStatus && (
        <ScrollView className="mt-4 max-h-96">
          <View className="space-y-3">
            {/* Platform Support */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Platform Support</Text>
              <Text className="text-xs text-gray-600">
                Native LLM Supported: {systemStatus.nativeLLMSupported ? '✅ Yes' : '❌ No'}
              </Text>
              <Text className="text-xs text-gray-600">
                Native LLM Loaded: {systemStatus.nativeLLMLoaded ? '✅ Yes' : '❌ No'}
              </Text>
            </View>

            {/* Model Information */}
            {systemStatus.nativeModelInfo && (
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Model Information</Text>
                <Text className="text-xs text-gray-600">
                  Name: {systemStatus.nativeModelInfo.modelName}
                </Text>
                <Text className="text-xs text-gray-600">
                  Version: {systemStatus.nativeModelInfo.version}
                </Text>
                <Text className="text-xs text-gray-600">
                  Parameters: {systemStatus.nativeModelInfo.parameterCount?.toLocaleString() || 'Unknown'}
                </Text>
                <Text className="text-xs text-gray-600">
                  Memory: {systemStatus.nativeModelInfo.memoryUsage ? 
                    `${(systemStatus.nativeModelInfo.memoryUsage / 1024 / 1024).toFixed(1)}MB` : 
                    'Unknown'}
                </Text>
              </View>
            )}

            {/* Performance Metrics */}
            {systemStatus.nativePerformance && (
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Performance</Text>
                <Text className="text-xs text-gray-600">
                  Avg Speed: {systemStatus.nativePerformance.averageTokensPerSecond?.toFixed(1) || 'N/A'} tokens/sec
                </Text>
                <Text className="text-xs text-gray-600">
                  Total Generations: {systemStatus.nativePerformance.totalGenerations || 0}
                </Text>
                <Text className="text-xs text-gray-600">
                  Success Rate: {systemStatus.nativePerformance.successRate ? 
                    `${(systemStatus.nativePerformance.successRate * 100).toFixed(1)}%` : 
                    'N/A'}
                </Text>
              </View>
            )}

            {/* Agent Capabilities */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Agent Capabilities</Text>
              <Text className="text-xs text-gray-600">
                Modules: {systemStatus.availableModules?.join(', ') || 'None'}
              </Text>
              <Text className="text-xs text-gray-600">
                Languages: {systemStatus.supportedLanguages?.join(', ') || 'None'}
              </Text>
              <Text className="text-xs text-gray-600">
                Tools: {systemStatus.toolsAvailable?.join(', ') || 'None'}
              </Text>
            </View>

            {/* Test Button */}
            {systemStatus.nativeLLMLoaded && (
              <Pressable
                onPress={testNativeLLM}
                className="bg-blue-500 rounded-lg p-3 mt-2"
              >
                <Text className="text-white text-center font-medium">
                  🧪 Test Native LLM
                </Text>
              </Pressable>
            )}

            {/* Refresh Button */}
            <Pressable
              onPress={checkSystemStatus}
              className="bg-gray-500 rounded-lg p-3"
            >
              <Text className="text-white text-center font-medium">
                🔄 Refresh Status
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
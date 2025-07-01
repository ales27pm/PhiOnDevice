import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { backgroundTaskService } from '../services/BackgroundTaskService';
import { proactiveConditionsService } from '../services/ProactiveConditionsService';
import { contextService } from '../services/ContextService';
import { cn } from '../utils/cn';

interface ServiceStatus {
  isRegistered: boolean;
  isRunning: boolean;
  backgroundFetchStatus: string;
  lastExecution?: Date;
}

const ProactiveAgentScreen: React.FC = () => {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [conditions, setConditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testing, setTesting] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [serviceStatus, proactiveConditions] = await Promise.all([
        backgroundTaskService.getStatus(),
        Promise.resolve(proactiveConditionsService.getConditions()),
      ]);

      setStatus(serviceStatus);
      setConditions(proactiveConditions);
    } catch (error) {
      console.error('Failed to load proactive agent data:', error);
      Alert.alert('Error', 'Failed to load proactive agent status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleInitializeAgent = async () => {
    try {
      setLoading(true);
      Alert.alert('Initializing', 'Setting up proactive agent...');
      
      const success = await backgroundTaskService.initialize();
      if (success) {
        Alert.alert('Success', 'Proactive agent initialized successfully!');
        await loadData();
      } else {
        Alert.alert('Error', 'Failed to initialize proactive agent. Please check permissions.');
      }
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      Alert.alert('Error', 'Failed to initialize proactive agent.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConditions = async () => {
    try {
      setTesting(true);
      Alert.alert('Testing', 'Running proactive conditions test...');
      
      await backgroundTaskService.testProactiveConditions();
      Alert.alert('Test Complete', 'Check your notifications for test alerts!');
    } catch (error) {
      console.error('Failed to test conditions:', error);
      Alert.alert('Error', 'Failed to run test conditions.');
    } finally {
      setTesting(false);
    }
  };

  const handleRunAgent = async () => {
    try {
      setTesting(true);
      Alert.alert('Running', 'Executing proactive agent manually...');
      
      await backgroundTaskService.runProactiveAgent();
      Alert.alert('Complete', 'Proactive agent execution completed!');
    } catch (error) {
      console.error('Failed to run agent:', error);
      Alert.alert('Error', 'Failed to run proactive agent.');
    } finally {
      setTesting(false);
    }
  };

  const handleToggleCondition = (conditionId: string, enabled: boolean) => {
    proactiveConditionsService.setConditionEnabled(conditionId, enabled);
    setConditions(conditions.map(c => 
      c.id === conditionId ? { ...c, enabled } : c
    ));
  };

  const StatusCard: React.FC<{
    title: string;
    value: string | boolean;
    subtitle?: string;
    icon: string;
    color?: string;
  }> = ({ title, value, subtitle, icon, color = '#3b82f6' }) => (
    <View className="bg-white p-4 rounded-xl border border-gray-200 flex-1">
      <View className="flex-row items-center mb-2">
        <View 
          className="w-8 h-8 rounded-full items-center justify-center mr-2"
          style={{ backgroundColor: `${color}20` }}
        >
          <Ionicons name={icon as any} size={16} color={color} />
        </View>
        <Text className="text-sm font-medium text-gray-600">{title}</Text>
      </View>
      <Text className="text-lg font-bold text-gray-900 mb-1">
        {typeof value === 'boolean' ? (value ? 'Active' : 'Inactive') : value}
      </Text>
      {subtitle && (
        <Text className="text-xs text-gray-500">{subtitle}</Text>
      )}
    </View>
  );

  const ConditionCard: React.FC<{ condition: any }> = ({ condition }) => (
    <View className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900 mb-1">
            {condition.name}
          </Text>
          <Text className="text-sm text-gray-600">
            {condition.description}
          </Text>
        </View>
        <Pressable 
          onPress={() => handleToggleCondition(condition.id, !condition.enabled)}
          className={cn(
            'w-12 h-6 rounded-full justify-center ml-3',
            condition.enabled ? 'bg-green-500' : 'bg-gray-300'
          )}
        >
          <View className={cn(
            'w-5 h-5 rounded-full bg-white',
            condition.enabled ? 'ml-6' : 'ml-1'
          )} />
        </Pressable>
      </View>
      <View className="flex-row items-center">
        <View className={cn(
          'w-2 h-2 rounded-full mr-2',
          condition.enabled ? 'bg-green-500' : 'bg-gray-400'
        )} />
        <Text className="text-xs text-gray-500">
          {condition.enabled ? 'Active' : 'Disabled'}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-600 mt-4">Loading proactive agent...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <Text className="text-xl font-semibold text-gray-900 text-center">
          Proactive Agent
        </Text>
        <Text className="text-sm text-gray-500 text-center mt-1">
          Intelligent background assistance
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Overview */}
        <View className="px-4 py-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Agent Status
          </Text>
          
          {status ? (
            <View className="flex-row space-x-3 mb-4">
              <StatusCard
                title="Background Task"
                value={status.isRunning}
                subtitle="Hourly execution"
                icon="time"
                color={status.isRunning ? '#10b981' : '#ef4444'}
              />
              <StatusCard
                title="System Status"
                value={status.backgroundFetchStatus}
                subtitle="iOS/Android support"
                icon="phone-portrait"
                color={status.backgroundFetchStatus === 'Available' ? '#10b981' : '#f59e0b'}
              />
            </View>
          ) : (
            <View className="bg-gray-100 rounded-lg p-8 items-center">
              <Ionicons name="warning-outline" size={48} color="#f59e0b" />
              <Text className="text-gray-600 text-center mt-2">
                Agent not initialized
              </Text>
            </View>
          )}

          {/* Quick Actions */}
          <View className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Quick Actions
            </Text>
            
            <View className="space-y-3">
              <Pressable
                onPress={handleInitializeAgent}
                disabled={loading}
                className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex-row items-center justify-center"
              >
                <Ionicons name="rocket" size={16} color="#3b82f6" />
                <Text className="text-blue-600 font-medium ml-2">
                  Initialize Proactive Agent
                </Text>
              </Pressable>

              <Pressable
                onPress={handleRunAgent}
                disabled={testing || !status?.isRunning}
                className={cn(
                  'border rounded-lg p-3 flex-row items-center justify-center',
                  status?.isRunning && !testing
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                )}
              >
                {testing ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Ionicons name="play" size={16} color={status?.isRunning ? '#10b981' : '#9ca3af'} />
                )}
                <Text className={cn(
                  'font-medium ml-2',
                  status?.isRunning && !testing ? 'text-green-600' : 'text-gray-500'
                )}>
                  Run Agent Now
                </Text>
              </Pressable>

              <Pressable
                onPress={handleTestConditions}
                disabled={testing}
                className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex-row items-center justify-center"
              >
                {testing ? (
                  <ActivityIndicator size="small" color="#8b5cf6" />
                ) : (
                  <Ionicons name="flask" size={16} color="#8b5cf6" />
                )}
                <Text className="text-purple-600 font-medium ml-2">
                  Test Conditions
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Proactive Conditions */}
        <View className="px-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-900">
              Proactive Conditions
            </Text>
            <Text className="text-sm text-gray-500">
              {conditions.filter(c => c.enabled).length} of {conditions.length} active
            </Text>
          </View>

          {conditions.length > 0 ? (
            conditions.map((condition) => (
              <ConditionCard key={condition.id} condition={condition} />
            ))
          ) : (
            <View className="bg-white rounded-lg border border-gray-200 p-8 items-center">
              <Ionicons name="construct-outline" size={48} color="#d1d5db" />
              <Text className="text-gray-500 text-center mt-4 text-base">
                No conditions loaded
              </Text>
            </View>
          )}
        </View>

        {/* Information */}
        <View className="px-4 mt-4">
          <View className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text className="text-lg font-semibold text-blue-900 ml-2">
                How It Works
              </Text>
            </View>
            <Text className="text-blue-800 text-sm leading-5">
              • The proactive agent runs in the background every hour{'\n'}
              • It checks your calendar, weather, and location{'\n'}
              • When conditions are met, you'll receive helpful notifications{'\n'}
              • All processing happens locally on your device{'\n'}
              • You can enable/disable individual conditions above
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProactiveAgentScreen;
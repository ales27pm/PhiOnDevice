import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../state/chatStore';
import { useSettingsStore } from '../state/settingsStore';
import { cn } from '../utils/cn';

const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  
  const { 
    currentProvider, 
    memoryEnabled, 
    switchProvider, 
    toggleMemory 
  } = useChatStore();
  
  const {
    handsFreeModeEnabled,
    wakewUprdEnabled,
    notificationsEnabled,
    toggleHandsFreeMode,
    toggleWakeWord,
    toggleNotifications,
    resetAllSettings,
  } = useSettingsStore();

  const handleProviderSwitch = async (provider: 'openai' | 'local') => {
    if (provider === currentProvider) return;
    
    setIsLoading(true);
    try {
      await switchProvider(provider);
      Alert.alert(
        'Provider Switched',
        `Successfully switched to ${provider === 'openai' ? 'Cloud AI (OpenAI)' : 'Local AI'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Switch Failed',
        `Failed to switch to ${provider === 'openai' ? 'Cloud AI' : 'Local AI'}. Please try again.`,
        [{ text: 'OK' }]
      );
      console.error('Provider switch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHandsFreeModeToggle = () => {
    if (!handsFreeModeEnabled) {
      Alert.alert(
        'Enable Hands-Free Mode?',
        'This will enable always-on wake-word detection. The app will listen for "Hey Assistant" even when minimized.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Enable', 
            onPress: () => toggleHandsFreeMode()
          }
        ]
      );
    } else {
      toggleHandsFreeMode();
    }
  };

  const handleWakeWordToggle = () => {
    if (!wakewUprdEnabled && !handsFreeModeEnabled) {
      Alert.alert(
        'Enable Wake Word?',
        'This will allow you to activate the assistant by saying "Hey Assistant" during conversations.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: () => toggleWakeWord() }
        ]
      );
    } else {
      toggleWakeWord();
    }
  };

  const handlePrivacyDashboard = () => {
    navigation.navigate('PrivacyDashboard' as never);
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset All Settings',
      'This will reset all settings to their default values. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            resetAllSettings();
            Alert.alert('Settings Reset', 'All settings have been reset to defaults.');
          }
        }
      ]
    );
  };

  const handleVoicePipelineTest = () => {
    navigation.navigate('VoicePipelineTest' as never);
  };

  const handleTurboModuleTest = () => {
    navigation.navigate('TurboModuleTest' as never);
  };

  const SettingSection: React.FC<{
    title: string;
    children: React.ReactNode;
  }> = ({ title, children }) => (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-900 mb-3 px-4">
        {title}
      </Text>
      <View className="bg-white border border-gray-200 rounded-xl mx-4">
        {children}
      </View>
    </View>
  );

  const SettingRow: React.FC<{
    icon: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    isLast?: boolean;
  }> = ({ icon, title, subtitle, children, isLast = false }) => (
    <View className={cn(
      'flex-row items-center px-4 py-4',
      !isLast && 'border-b border-gray-100'
    )}>
      <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
        <Ionicons name={icon as any} size={18} color="#3b82f6" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-medium text-gray-900">{title}</Text>
        {subtitle && (
          <Text className="text-sm text-gray-500 mt-1">{subtitle}</Text>
        )}
      </View>
      {children}
    </View>
  );

  const ProviderButton: React.FC<{
    provider: 'openai' | 'local';
    title: string;
    subtitle: string;
    icon: string;
  }> = ({ provider, title, subtitle, icon }) => (
    <Pressable
      onPress={() => handleProviderSwitch(provider)}
      disabled={isLoading}
      className={cn(
        'p-4 rounded-xl border-2 mb-3',
        currentProvider === provider
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white'
      )}
    >
      <View className="flex-row items-center">
        <View className={cn(
          'w-10 h-10 rounded-full items-center justify-center mr-3',
          currentProvider === provider ? 'bg-blue-500' : 'bg-gray-100'
        )}>
          <Ionicons
            name={icon as any}
            size={20}
            color={currentProvider === provider ? 'white' : '#6b7280'}
          />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className={cn(
              'text-lg font-semibold',
              currentProvider === provider ? 'text-blue-700' : 'text-gray-900'
            )}>
              {title}
            </Text>
            {currentProvider === provider && (
              <View className="ml-2 px-2 py-1 bg-blue-500 rounded-full">
                <Text className="text-xs font-medium text-white">ACTIVE</Text>
              </View>
            )}
          </View>
          <Text className="text-sm text-gray-600 mt-1">{subtitle}</Text>
        </View>
        {isLoading && currentProvider !== provider && (
          <Ionicons name="hourglass-outline" size={20} color="#6b7280" />
        )}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Header */}
        <View className="px-4 py-6">
          <Text className="text-2xl font-bold text-gray-900">Settings</Text>
          <Text className="text-gray-600 mt-1">Customize your AI assistant experience</Text>
        </View>

        {/* AI Provider Section */}
        <SettingSection title="AI Provider">
          <View className="p-4">
            <ProviderButton
              provider="openai"
              title="Cloud AI"
              subtitle="Powered by OpenAI GPT-4 • Requires internet connection"
              icon="cloud"
            />
            <ProviderButton
              provider="local"
              title="Local AI"
              subtitle="On-device processing • Works offline • Privacy-first"
              icon="phone-portrait"
            />
          </View>
        </SettingSection>

        {/* Voice & Interaction Section */}
        <SettingSection title="Voice & Interaction">
          <SettingRow
            icon="mic"
            title="Hands-Free Mode"
            subtitle="Always-on wake-word detection even when app is minimized"
          >
            <Switch
              value={handsFreeModeEnabled}
              onValueChange={handleHandsFreeModeToggle}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={handsFreeModeEnabled ? '#3b82f6' : '#f3f4f6'}
            />
          </SettingRow>
          
          <SettingRow
            icon="volume-high"
            title="Wake Word Detection"
            subtitle='Say "Hey Assistant" to activate voice input'
          >
            <Switch
              value={wakewUprdEnabled}
              onValueChange={handleWakeWordToggle}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={wakewUprdEnabled ? '#3b82f6' : '#f3f4f6'}
            />
          </SettingRow>

          <SettingRow
            icon="notifications"
            title="Notifications"
            subtitle="Get notified of important assistant updates"
            isLast
          >
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={notificationsEnabled ? '#3b82f6' : '#f3f4f6'}
            />
          </SettingRow>
        </SettingSection>

        {/* Memory & Privacy Section */}
        <SettingSection title="Memory & Privacy">
          <SettingRow
            icon="bulb"
            title="Conversation Memory"
            subtitle="Remember conversations to provide better context"
          >
            <Switch
              value={memoryEnabled}
              onValueChange={toggleMemory}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={memoryEnabled ? '#3b82f6' : '#f3f4f6'}
            />
          </SettingRow>

          <Pressable onPress={handlePrivacyDashboard}>
            <SettingRow
              icon="shield-checkmark"
              title="Privacy Dashboard"
              subtitle="Manage your data and privacy settings"
              isLast
            >
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </SettingRow>
          </Pressable>
        </SettingSection>

        {/* Advanced Section */}
        <SettingSection title="Advanced">
          <Pressable onPress={handleVoicePipelineTest}>
            <SettingRow
              icon="flask"
              title="Voice Pipeline Test"
              subtitle="Test voice recognition, visualizers, and error handling"
            >
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </SettingRow>
          </Pressable>
          
          <Pressable onPress={handleTurboModuleTest}>
            <SettingRow
              icon="hardware-chip"
              title="Turbo Module Test"
              subtitle="Test OnDeviceLLM and VoicePipeline module integration"
            >
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </SettingRow>
          </Pressable>
          
          <Pressable onPress={handleResetSettings}>
            <SettingRow
              icon="refresh"
              title="Reset All Settings"
              subtitle="Restore all settings to their default values"
              isLast
            >
              <Ionicons name="chevron-forward" size={20} color="#ef4444" />
            </SettingRow>
          </Pressable>
        </SettingSection>

        {/* App Info */}
        <View className="px-4 py-6">
          <Text className="text-center text-sm text-gray-500">
            native-monGARS v1.0.0
          </Text>
          <Text className="text-center text-xs text-gray-400 mt-1">
            Built with privacy and performance in mind
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
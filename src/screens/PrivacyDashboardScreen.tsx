import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { memoryService, Memory } from '../services/MemoryService';
import { useSettingsStore } from '../state/settingsStore';
import { cn } from '../utils/cn';

interface MemoryItemProps {
  memory: Memory;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

const MemoryItem: React.FC<MemoryItemProps> = ({ memory, onDelete, isDeleting }) => {
  const metadata = memory.metadata ? JSON.parse(memory.metadata) : {};
  const isUserMessage = metadata.isUser;
  const timestamp = new Date(memory.timestamp);
  
  const handleDelete = () => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to delete this memory? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(memory.id) },
      ]
    );
  };

  return (
    <View className="bg-white rounded-lg border border-gray-200 p-4 mb-3">
      {/* Header */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <View
              className={cn(
                'w-2 h-2 rounded-full mr-2',
                isUserMessage ? 'bg-blue-500' : 'bg-gray-500'
              )}
            />
            <Text className="text-sm font-medium text-gray-700">
              {isUserMessage ? 'You' : 'Assistant'}
            </Text>
            <Text className="text-xs text-gray-400 ml-2">
              {timestamp.toLocaleDateString()} {timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleDelete}
          disabled={isDeleting}
          className={cn(
            'w-8 h-8 rounded-full items-center justify-center',
            isDeleting ? 'bg-gray-100' : 'bg-red-50'
          )}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          )}
        </Pressable>
      </View>

      {/* Content */}
      <Text className="text-gray-900 text-base leading-5 mb-2">
        {memory.content}
      </Text>

      {/* Metadata */}
      {metadata.provider && (
        <View className="flex-row items-center">
          <Ionicons name="server-outline" size={12} color="#6b7280" />
          <Text className="text-xs text-gray-500 ml-1">
            Provider: {metadata.provider}
          </Text>
        </View>
      )}
    </View>
  );
};

const PrivacyDashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showMemories, setShowMemories] = useState(false);
  const [stats, setStats] = useState<{
    totalMemories: number;
    oldestMemory: string | null;
    newestMemory: string | null;
  }>({
    totalMemories: 0,
    oldestMemory: null,
    newestMemory: null,
  });

  const { 
    dataRetentionDays, 
    analyticsEnabled, 
    crashReportingEnabled,
    setDataRetentionDays,
    toggleAnalytics,
    toggleCrashReporting,
  } = useSettingsStore();

  const loadMemories = useCallback(async () => {
    try {
      await memoryService.initialize();
      const [memoriesData, statsData] = await Promise.all([
        memoryService.getAllMemories(0, 500), // Load up to 500 memories
        memoryService.getStats(),
      ]);
      setMemories(memoriesData);
      setFilteredMemories(memoriesData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load memories:', error);
      Alert.alert('Error', 'Failed to load memories. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // Filter memories based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMemories(memories);
    } else {
      const filtered = memories.filter(memory =>
        memory.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMemories(filtered);
    }
  }, [searchQuery, memories]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadMemories();
  }, [loadMemories]);

  const handleDeleteMemory = async (memoryId: number) => {
    setDeletingIds(prev => new Set(prev).add(memoryId));
    
    try {
      const success = await memoryService.deleteMemory(memoryId);
      if (success) {
        setMemories(prev => prev.filter(memory => memory.id !== memoryId));
        setStats(prev => ({
          ...prev,
          totalMemories: prev.totalMemories - 1,
        }));
      } else {
        Alert.alert('Error', 'Failed to delete memory. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
      Alert.alert('Error', 'Failed to delete memory. Please try again.');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(memoryId);
        return newSet;
      });
    }
  };

  const handleClearAllMemories = () => {
    Alert.alert(
      'Clear All Memories',
      `Are you sure you want to delete all ${stats.totalMemories} memories? This action cannot be undone and will permanently remove your entire conversation history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await memoryService.clearAllMemories();
              setMemories([]);
              setFilteredMemories([]);
              setStats({
                totalMemories: 0,
                oldestMemory: null,
                newestMemory: null,
              });
              Alert.alert('Success', 'All memories have been cleared.');
            } catch (error) {
              console.error('Failed to clear memories:', error);
              Alert.alert('Error', 'Failed to clear memories. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDataRetentionChange = () => {
    Alert.prompt(
      'Data Retention Period',
      'Enter the number of days to keep conversation data (1-365):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: (value) => {
            const days = parseInt(value || '30', 10);
            if (days >= 1 && days <= 365) {
              setDataRetentionDays(days);
              Alert.alert('Updated', `Data retention set to ${days} days.`);
            } else {
              Alert.alert('Invalid', 'Please enter a number between 1 and 365.');
            }
          },
        },
      ],
      'plain-text',
      dataRetentionDays.toString()
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'None';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-600 mt-4">Loading memories...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <Text className="text-xl font-semibold text-gray-900 text-center">
          Privacy Dashboard
        </Text>
        <Text className="text-sm text-gray-500 text-center mt-1">
          Manage your stored memories and data
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
        {/* Stats Section */}
        <View className="px-4 py-4">
          <View className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="stats-chart" size={20} color="#3b82f6" />
              <Text className="text-lg font-semibold text-gray-900 ml-2">
                Memory Statistics
              </Text>
            </View>
            
            <View className="flex-row space-x-3 mb-4">
              <View className="flex-1 bg-blue-50 rounded-lg p-3">
                <Text className="text-2xl font-bold text-blue-600">{stats.totalMemories}</Text>
                <Text className="text-sm text-blue-700">Total Memories</Text>
              </View>
              <View className="flex-1 bg-green-50 rounded-lg p-3">
                <Text className="text-2xl font-bold text-green-600">{dataRetentionDays}d</Text>
                <Text className="text-sm text-green-700">Retention Period</Text>
              </View>
            </View>

            <View className="space-y-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Oldest Memory:</Text>
                <Text className="font-medium text-gray-700">{formatDate(stats.oldestMemory)}</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Newest Memory:</Text>
                <Text className="font-medium text-gray-700">{formatDate(stats.newestMemory)}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</Text>
            
            <Pressable
              onPress={() => setShowMemories(!showMemories)}
              className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <Ionicons name="list" size={16} color="#3b82f6" />
                <Text className="text-blue-600 font-medium ml-2">
                  {showMemories ? 'Hide Memories' : 'View All Memories'}
                </Text>
              </View>
              <Ionicons 
                name={showMemories ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#3b82f6" 
              />
            </Pressable>

            <Pressable
              onPress={handleDataRetentionChange}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <Ionicons name="time" size={16} color="#6b7280" />
                <Text className="text-gray-700 font-medium ml-2">
                  Change Retention Period
                </Text>
              </View>
              <Text className="text-gray-500">{dataRetentionDays} days</Text>
            </Pressable>

            {stats.totalMemories > 0 && (
              <Pressable
                onPress={handleClearAllMemories}
                className="bg-red-50 border border-red-200 rounded-lg p-3 flex-row items-center justify-center"
              >
                <Ionicons name="trash" size={16} color="#dc2626" />
                <Text className="text-red-600 font-medium ml-2">
                  Clear All Memories
                </Text>
              </Pressable>
            )}
          </View>

          {/* Privacy Settings */}
          <View className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Privacy Settings</Text>
            
            <View className="space-y-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">Usage Analytics</Text>
                  <Text className="text-sm text-gray-500">Help improve the app</Text>
                </View>
                <Pressable onPress={toggleAnalytics}>
                  <View className={cn(
                    'w-12 h-6 rounded-full justify-center',
                    analyticsEnabled ? 'bg-blue-500' : 'bg-gray-300'
                  )}>
                    <View className={cn(
                      'w-5 h-5 rounded-full bg-white',
                      analyticsEnabled ? 'ml-6' : 'ml-1'
                    )} />
                  </View>
                </Pressable>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">Crash Reporting</Text>
                  <Text className="text-sm text-gray-500">Send crash reports</Text>
                </View>
                <Pressable onPress={toggleCrashReporting}>
                  <View className={cn(
                    'w-12 h-6 rounded-full justify-center',
                    crashReportingEnabled ? 'bg-blue-500' : 'bg-gray-300'
                  )}>
                    <View className={cn(
                      'w-5 h-5 rounded-full bg-white',
                      crashReportingEnabled ? 'ml-6' : 'ml-1'
                    )} />
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Memories List */}
        {showMemories && (
          <View className="px-4">
            <View className="bg-white rounded-lg border border-gray-200 p-4">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-semibold text-gray-900">
                  Stored Memories
                </Text>
                <Text className="text-sm text-gray-500">
                  {filteredMemories.length} of {memories.length}
                </Text>
              </View>

              {/* Search */}
              {memories.length > 0 && (
                <View className="mb-4">
                  <View className="bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 flex-row items-center">
                    <Ionicons name="search" size={16} color="#6b7280" />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search memories..."
                      className="flex-1 ml-2 text-gray-900"
                      placeholderTextColor="#9ca3af"
                    />
                    {searchQuery.length > 0 && (
                      <Pressable onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={16} color="#6b7280" />
                      </Pressable>
                    )}
                  </View>
                </View>
              )}

              {/* Memories */}
              {filteredMemories.length === 0 ? (
                <View className="items-center py-8">
                  <Ionicons name="archive-outline" size={48} color="#d1d5db" />
                  <Text className="text-gray-500 text-center mt-4 text-base">
                    {searchQuery ? 'No memories match your search' : 'No memories stored'}
                  </Text>
                  <Text className="text-gray-400 text-center mt-2 text-sm">
                    {searchQuery ? 'Try a different search term' : 'Your conversation history will appear here'}
                  </Text>
                </View>
              ) : (
                <ScrollView 
                  className="max-h-96"
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                >
                  {filteredMemories.map((memory) => (
                    <MemoryItem
                      key={memory.id}
                      memory={memory}
                      onDelete={handleDeleteMemory}
                      isDeleting={deletingIds.has(memory.id)}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        )}

        {/* Privacy Information */}
        <View className="px-4 mt-4">
          <View className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="shield-checkmark" size={20} color="#3b82f6" />
              <Text className="text-lg font-semibold text-blue-900 ml-2">
                Privacy Information
              </Text>
            </View>
            <Text className="text-blue-800 text-sm leading-5">
              • All memories are stored locally on your device using SQLite{'\n'}
              • Your data never leaves your device unless you explicitly share it{'\n'}
              • You can delete individual memories or clear all data at any time{'\n'}
              • Deleted memories cannot be recovered{'\n'}
              • AI requests are processed securely without storing personal data
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacyDashboardScreen;
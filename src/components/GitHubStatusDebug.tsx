/**
 * GitHub Integration Status Debug Component
 * Shows GitHub integration status and available features
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { githubService, reportIssueToGitHub, getLatestRelease } from '../utils/githubIntegration';

interface GitHubStatus {
  available: boolean;
  config?: {
    account: string;
    repo: string;
    repoUrl: string;
    hasToken: boolean;
  };
}

export default function GitHubStatusDebug() {
  const [githubStatus, setGitHubStatus] = useState<GitHubStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionTest, setConnectionTest] = useState<boolean | null>(null);

  useEffect(() => {
    checkGitHubStatus();
  }, []);

  const checkGitHubStatus = async () => {
    setIsLoading(true);
    try {
      const status = await githubService.getStatus();
      setGitHubStatus(status);
      
      if (status.available) {
        const connected = await githubService.testConnection();
        setConnectionTest(connected);
      }
    } catch (error) {
      console.error('Failed to check GitHub status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testGitHubFeatures = async () => {
    if (!githubStatus?.available) {
      Alert.alert('GitHub Not Available', 'GitHub credentials are not configured.');
      return;
    }

    setIsLoading(true);
    try {
      // Test repository info
      const repoInfo = await githubService.getRepositoryInfo();
      
      // Test recent releases
      const latestRelease = await getLatestRelease();
      
      // Test issues (read-only)
      const issues = await githubService.getIssues('open', 3);
      
      // Test commits
      const commits = await githubService.getCommits(3);

      Alert.alert(
        'GitHub Features Test',
        `✅ Repository: ${repoInfo?.full_name || 'N/A'}
✅ Latest Release: ${latestRelease?.tag_name || 'None'}
✅ Open Issues: ${issues.length}
✅ Recent Commits: ${commits.length}

All GitHub features are working!`
      );

    } catch (error) {
      Alert.alert('GitHub Test Failed', `Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createTestIssue = async () => {
    if (!githubStatus?.available) {
      Alert.alert('GitHub Not Available', 'GitHub credentials are not configured.');
      return;
    }

    Alert.alert(
      'Create Test Issue',
      'This will create a test issue in your GitHub repository. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            setIsLoading(true);
            try {
              const success = await reportIssueToGitHub(
                'Test Issue from Advanced Agent App',
                'This is a test issue created from the Advanced Agent mobile app to verify GitHub integration is working correctly.',
                { timestamp: new Date().toISOString(), test: true }
              );

              Alert.alert(
                success ? 'Issue Created' : 'Issue Creation Failed',
                success 
                  ? 'Test issue was successfully created in your GitHub repository!'
                  : 'Failed to create test issue. Check your GitHub credentials and permissions.'
              );
            } catch (error) {
              Alert.alert('Error', `Failed to create issue: ${(error as Error).message}`);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading && !githubStatus) {
    return (
      <View className="bg-white rounded-lg p-4 m-4">
        <Text className="text-center text-gray-600">Loading GitHub status...</Text>
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
          <Ionicons name="logo-github" size={20} color="#6B7280" />
          <Text className="font-semibold text-gray-900">GitHub Integration</Text>
          {githubStatus?.available ? (
            <View className="bg-green-100 px-2 py-1 rounded-full">
              <Text className="text-xs font-medium text-green-800">✅ Active</Text>
            </View>
          ) : (
            <View className="bg-gray-100 px-2 py-1 rounded-full">
              <Text className="text-xs font-medium text-gray-800">⚪ Inactive</Text>
            </View>
          )}
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#6B7280" 
        />
      </Pressable>

      {isExpanded && (
        <ScrollView className="mt-4 max-h-96">
          <View className="space-y-3">
            {/* Status Information */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Integration Status</Text>
              <Text className="text-xs text-gray-600">
                Available: {githubStatus?.available ? '✅ Yes' : '❌ No'}
              </Text>
              {connectionTest !== null && (
                <Text className="text-xs text-gray-600">
                  Connection: {connectionTest ? '✅ Connected' : '❌ Failed'}
                </Text>
              )}
            </View>

            {/* Configuration Details */}
            {githubStatus?.config && (
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Configuration</Text>
                <Text className="text-xs text-gray-600">
                  Account: {githubStatus.config.account}
                </Text>
                <Text className="text-xs text-gray-600">
                  Repository: {githubStatus.config.repo}
                </Text>
                <Text className="text-xs text-gray-600">
                  Token: {githubStatus.config.hasToken ? '🔑 Configured' : '❌ Missing'}
                </Text>
                <Text className="text-xs text-blue-600 underline">
                  {githubStatus.config.repoUrl}
                </Text>
              </View>
            )}

            {/* GitHub Features Status */}
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Available Features</Text>
              <View className="space-y-1">
                <Text className="text-xs text-gray-600">
                  📊 Repository Info: {githubStatus?.available ? '✅' : '❌'}
                </Text>
                <Text className="text-xs text-gray-600">
                  🐛 Issue Creation: {githubStatus?.available ? '✅' : '❌'}
                </Text>
                <Text className="text-xs text-gray-600">
                  📦 Release Management: {githubStatus?.available ? '✅' : '❌'}
                </Text>
                <Text className="text-xs text-gray-600">
                  📝 Commit History: {githubStatus?.available ? '✅' : '❌'}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="space-y-2">
              <Pressable
                onPress={checkGitHubStatus}
                className="bg-gray-500 rounded-lg p-3"
                disabled={isLoading}
              >
                <Text className="text-white text-center font-medium">
                  {isLoading ? '🔄 Refreshing...' : '🔄 Refresh Status'}
                </Text>
              </Pressable>

              {githubStatus?.available && (
                <>
                  <Pressable
                    onPress={testGitHubFeatures}
                    className="bg-blue-500 rounded-lg p-3"
                    disabled={isLoading}
                  >
                    <Text className="text-white text-center font-medium">
                      🧪 Test GitHub Features
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={createTestIssue}
                    className="bg-green-500 rounded-lg p-3"
                    disabled={isLoading}
                  >
                    <Text className="text-white text-center font-medium">
                      🐛 Create Test Issue
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* Security Notice */}
            <View className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <Text className="text-xs text-yellow-800">
                🔒 <Text className="font-medium">Security Notice:</Text> GitHub credentials are stored 
                in .specialenv/.env (gitignored) and only loaded when GitHub operations are needed. 
                Tokens are never stored in regular app files or version control.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
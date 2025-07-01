import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../utils/cn';

export interface ErrorInfo {
  type: 'network' | 'stt' | 'llm' | 'permission' | 'timeout' | 'unknown';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ErrorModalProps {
  visible: boolean;
  error: ErrorInfo | null;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  error,
  onDismiss,
  onRetry,
}) => {
  if (!error) return null;

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return 'wifi-outline';
      case 'stt':
        return 'mic-off-outline';
      case 'llm':
        return 'chatbubble-outline';
      case 'permission':
        return 'lock-closed-outline';
      case 'timeout':
        return 'time-outline';
      default:
        return 'alert-circle-outline';
    }
  };

  const getErrorColor = () => {
    switch (error.type) {
      case 'network':
        return '#f59e0b'; // amber-500
      case 'stt':
        return '#ef4444'; // red-500
      case 'llm':
        return '#8b5cf6'; // violet-500
      case 'permission':
        return '#f97316'; // orange-500
      case 'timeout':
        return '#06b6d4'; // cyan-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          {/* Icon */}
          <View className="items-center mb-4">
            <View
              className="w-16 h-16 rounded-full items-center justify-center"
              style={{ backgroundColor: `${getErrorColor()}20` }}
            >
              <Ionicons
                name={getErrorIcon()}
                size={32}
                color={getErrorColor()}
              />
            </View>
          </View>

          {/* Title */}
          <Text className="text-xl font-semibold text-gray-900 text-center mb-2">
            {error.title}
          </Text>

          {/* Message */}
          <Text className="text-base text-gray-600 text-center mb-6 leading-6">
            {error.message}
          </Text>

          {/* Actions */}
          <View className="space-y-3">
            {/* Custom Action */}
            {error.actionLabel && error.onAction && (
              <Pressable
                onPress={() => {
                  error.onAction?.();
                  onDismiss();
                }}
                className="bg-blue-500 rounded-xl py-4 px-6"
              >
                <Text className="text-white font-semibold text-center text-base">
                  {error.actionLabel}
                </Text>
              </Pressable>
            )}

            {/* Retry Button */}
            {onRetry && (
              <Pressable
                onPress={() => {
                  onRetry();
                  onDismiss();
                }}
                className="bg-gray-100 rounded-xl py-4 px-6"
              >
                <Text className="text-gray-900 font-semibold text-center text-base">
                  Try Again
                </Text>
              </Pressable>
            )}

            {/* Dismiss Button */}
            <Pressable
              onPress={onDismiss}
              className="bg-gray-50 rounded-xl py-4 px-6"
            >
              <Text className="text-gray-600 font-medium text-center text-base">
                Dismiss
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Helper function to create error info objects
export const createErrorInfo = (
  type: ErrorInfo['type'],
  title: string,
  message: string,
  actionLabel?: string,
  onAction?: () => void
): ErrorInfo => ({
  type,
  title,
  message,
  actionLabel,
  onAction,
});

// Predefined common errors
export const commonErrors = {
  networkError: (): ErrorInfo => ({
    type: 'network',
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
  }),
  
  sttTimeout: (): ErrorInfo => ({
    type: 'stt',
    title: 'Speech Recognition Timeout',
    message: 'No speech was detected. Please try speaking again or check your microphone permissions.',
  }),
  
  sttPermission: (onAction?: () => void): ErrorInfo => ({
    type: 'permission',
    title: 'Microphone Permission Required',
    message: 'Please allow microphone access to use voice features.',
    actionLabel: 'Open Settings',
    onAction,
  }),
  
  llmError: (): ErrorInfo => ({
    type: 'llm',
    title: 'AI Service Error',
    message: 'The AI service is temporarily unavailable. Please try again in a moment.',
  }),
  
  llmTimeout: (): ErrorInfo => ({
    type: 'timeout',
    title: 'Request Timeout',
    message: 'The AI is taking longer than expected to respond. Please try again with a shorter message.',
  }),
  
  rateLimitError: (): ErrorInfo => ({
    type: 'llm',
    title: 'Service Busy',
    message: 'The AI service is currently experiencing high demand. Please wait a moment and try again.',
  }),
  
  apiKeyError: (): ErrorInfo => ({
    type: 'llm',
    title: 'Service Configuration Issue',
    message: 'There\'s an issue with the AI service configuration. Switching to offline mode.',
  }),
};
import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Layout,
  FadeInUp,
  FadeOutUp,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../utils/cn";
import { useReasoningStore, ReasoningSession } from "../state/reasoningStore";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SessionCardProps {
  session: ReasoningSession;
  onSelect: (session: ReasoningSession) => void;
  onDelete: (id: string) => void;
}

function SessionCard({ session, onSelect, onDelete }: SessionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const cardScale = useSharedValue(1);
  const expandValue = useSharedValue(0);
  const actionsOpacity = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const expandedStyle = useAnimatedStyle(() => ({
    height: expandValue.value === 1 ? "auto" : undefined,
    opacity: withTiming(expandValue.value, { duration: 200 }),
  }));

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
  }));

  const handlePress = () => {
    cardScale.value = withSpring(0.98, { duration: 100 }, () => {
      cardScale.value = withSpring(1);
    });

    setIsExpanded(!isExpanded);
    expandValue.value = withSpring(isExpanded ? 0 : 1);
  };

  const handleLongPress = () => {
    setShowActions(!showActions);
    actionsOpacity.value = withSpring(showActions ? 0 : 1);
  };

  const handleSelect = () => {
    onSelect(session);
  };

  const handleDelete = () => {
    Alert.alert("Delete Session", "Are you sure you want to delete this reasoning session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(session.id),
      },
    ]);
  };

  return (
    <AnimatedPressable
      className="bg-white rounded-xl mb-3 overflow-hidden"
      style={cardStyle}
      onPress={handlePress}
      onLongPress={handleLongPress}
      entering={FadeInUp}
      exiting={FadeOutUp}
      layout={Layout.springify()}
    >
      {/* Card Header */}
      <View className="p-4 border-b border-gray-100">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-base font-medium text-gray-900" numberOfLines={2}>
              {session.problem}
            </Text>
            <View className="flex-row items-center mt-2 space-x-4">
              <Text className="text-xs text-gray-500">
                {formatDistanceToNow(session.timestamp, { addSuffix: true })}
              </Text>
              {session.tokensPerSecond && (
                <Text className="text-xs text-blue-600 font-medium">{session.tokensPerSecond} t/s</Text>
              )}
              {session.duration && (
                <Text className="text-xs text-gray-500">{(session.duration / 1000).toFixed(1)}s</Text>
              )}
            </View>
          </View>

          <View className="flex-row items-center space-x-2">
            <View className="bg-blue-50 px-2 py-1 rounded-full">
              <Text className="text-xs font-medium text-blue-700">{session.steps.length} steps</Text>
            </View>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
          </View>
        </View>
      </View>

      {/* Expanded Content */}
      {isExpanded && (
        <Animated.View style={expandedStyle} className="px-4 pb-4">
          {/* Steps Preview */}
          <View className="mt-3">
            <Text className="text-sm font-medium text-gray-700 mb-2">Reasoning Steps:</Text>
            {session.steps.slice(0, 3).map((step, index) => (
              <View key={index} className="mb-2 border-l-2 border-blue-200 pl-2">
                <Text className="text-xs font-medium text-blue-700">{step.description}</Text>
                <Text className="text-xs text-gray-600" numberOfLines={2}>
                  {step.content}
                </Text>
              </View>
            ))}
            {session.steps.length > 3 && (
              <Text className="text-xs text-gray-500 italic">+{session.steps.length - 3} more steps...</Text>
            )}
          </View>

          {/* Solution Preview */}
          <View className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
            <Text className="text-xs font-medium text-green-700 mb-1">Solution:</Text>
            <Text className="text-sm text-green-900" numberOfLines={3}>
              {session.solution}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Action Buttons */}
      {showActions && (
        <Animated.View
          style={actionsStyle}
          className="absolute top-0 right-0 bg-white shadow-lg rounded-bl-xl border-l border-b border-gray-200"
        >
          <View className="flex-row">
            <Pressable className="px-4 py-3 border-r border-gray-200" onPress={handleSelect}>
              <Ionicons name="eye" size={20} color="#3B82F6" />
            </Pressable>
            <Pressable className="px-4 py-3" onPress={handleDelete}>
              <Ionicons name="trash" size={20} color="#EF4444" />
            </Pressable>
          </View>
        </Animated.View>
      )}
    </AnimatedPressable>
  );
}

export function ReasoningHistory() {
  const insets = useSafeAreaInsets();
  const { sessions, loadSession, deleteSession } = useReasoningStore();

  const handleSessionSelect = (session: ReasoningSession) => {
    loadSession(session);
    // You might want to navigate back to the main interface here
    Alert.alert("Session Loaded", "The reasoning session has been loaded into the main interface.", [
      { text: "OK", style: "default" },
    ]);
  };

  const handleSessionDelete = (id: string) => {
    deleteSession(id);
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-gray-900">Reasoning History</Text>
            <Text className="text-sm text-gray-600">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {sessions.length > 0 && (
            <View className="bg-blue-50 px-3 py-1 rounded-full">
              <Text className="text-xs font-medium text-blue-700">Last: {sessions[0]?.tokensPerSecond || 0} t/s</Text>
            </View>
          )}
        </View>
      </View>

      {/* Sessions List */}
      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        {sessions.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text className="text-lg font-medium text-gray-500 mt-4">No Sessions Yet</Text>
            <Text className="text-sm text-gray-400 text-center mt-2 max-w-xs">
              Start solving mathematical problems to see your reasoning history here.
            </Text>
          </View>
        ) : (
          <>
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onSelect={handleSessionSelect}
                onDelete={handleSessionDelete}
              />
            ))}

            {/* Performance Summary */}
            {sessions.length > 0 && (
              <View className="bg-white rounded-xl p-4 mt-4">
                <Text className="text-lg font-semibold text-gray-900 mb-3">Performance Summary</Text>

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm text-gray-600">Average Speed:</Text>
                  <Text className="text-sm font-medium text-blue-600">
                    {Math.round(
                      sessions.reduce((sum, s) => sum + (s.tokensPerSecond || 0), 0) /
                        sessions.filter((s) => s.tokensPerSecond).length,
                    )}{" "}
                    tokens/sec
                  </Text>
                </View>

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm text-gray-600">Average Duration:</Text>
                  <Text className="text-sm font-medium text-green-600">
                    {(
                      sessions.reduce((sum, s) => sum + (s.duration || 0), 0) /
                      sessions.filter((s) => s.duration).length /
                      1000
                    ).toFixed(1)}
                    s
                  </Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-gray-600">Total Problems:</Text>
                  <Text className="text-sm font-medium text-gray-900">{sessions.length}</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

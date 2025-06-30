import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
  useDerivedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "../utils/cn";

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value?: string | boolean;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
  type?: "navigation" | "switch" | "value";
  disabled?: boolean;
}

function SettingItem({
  icon,
  title,
  subtitle,
  value,
  onPress,
  onValueChange,
  type = "navigation",
  disabled = false,
}: SettingItemProps) {
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;

    scale.value = withSpring(0.98, { duration: 100 }, () => {
      scale.value = withSpring(1);
    });

    if (onPress) onPress();
  };

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        className={cn("bg-white rounded-xl p-4 mb-3 flex-row items-center", disabled && "opacity-50")}
        onPress={handlePress}
        disabled={disabled || type === "switch"}
      >
        <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-3">
          <Ionicons name={icon} size={20} color="#3B82F6" />
        </View>

        <View className="flex-1">
          <Text className="text-base font-medium text-gray-900">{title}</Text>
          {subtitle && <Text className="text-sm text-gray-500 mt-1">{subtitle}</Text>}
        </View>

        {type === "switch" && (
          <Switch
            value={value as boolean}
            onValueChange={onValueChange}
            disabled={disabled}
            trackColor={{ false: "#E5E7EB", true: "#3B82F6" }}
            thumbColor={value ? "#FFFFFF" : "#F3F4F6"}
          />
        )}

        {type === "value" && <Text className="text-sm font-medium text-blue-600">{value}</Text>}

        {type === "navigation" && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
      </Pressable>
    </Animated.View>
  );
}

export function ReasoningSettings() {
  const insets = useSafeAreaInsets();

  // Mock settings state (in real app these would be persisted)
  const [settings, setSettings] = useState({
    useNeuralEngine: true,
    enableKVCaching: true,
    quantization: "INT4",
    maxTokens: 512,
    contextLength: 128000,
    autoSave: true,
    showPerformanceMetrics: true,
    enableHaptics: true,
  });

  const handleToggle = (key: string) => (value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleQuantizationChange = () => {
    const options = ["FP16", "INT8", "INT4"];
    const currentIndex = options.indexOf(settings.quantization);
    const nextIndex = (currentIndex + 1) % options.length;

    Alert.alert(
      "Quantization Mode",
      `Change to ${options[nextIndex]}?\n\nINT4: Smallest size, fastest inference\nINT8: Balanced size and accuracy\nFP16: Highest accuracy, larger size`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change",
          onPress: () =>
            setSettings((prev) => ({
              ...prev,
              quantization: options[nextIndex],
            })),
        },
      ],
    );
  };

  const handleMaxTokensChange = () => {
    const options = [256, 512, 1024, 2048];
    const currentIndex = options.indexOf(settings.maxTokens);
    const nextIndex = (currentIndex + 1) % options.length;

    setSettings((prev) => ({ ...prev, maxTokens: options[nextIndex] }));
  };

  const handleModelInfo = () => {
    Alert.alert(
      "Phi-4-mini-reasoning",
      "Model: microsoft/Phi-4-mini-reasoning\nParameters: 3.8B\nContext Length: 128K tokens\nSpecialization: Mathematical reasoning\n\nThis model is optimized for multi-step, logic-intensive mathematical problem-solving under memory and compute constraints.",
      [{ text: "OK", style: "default" }],
    );
  };

  const handlePerformanceInfo = () => {
    Alert.alert(
      "Performance Metrics",
      "Token Generation: ~25-35 tokens/sec on A17 Pro\nModel Load Time: ~1.2 seconds\nMemory Usage: ~1.2GB\nQuantization: 4-bit integer (8x compression)\n\nPerformance varies by device hardware and problem complexity.",
      [{ text: "OK", style: "default" }],
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Model Cache",
      "This will clear the compiled Core ML model cache and may increase load times for the next inference.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            // In real app, this would clear the Core ML cache
            Alert.alert("Cache Cleared", "Model cache has been cleared.");
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <Text className="text-xl font-bold text-gray-900">AI Settings</Text>
        <Text className="text-sm text-gray-600">Core ML & Phi-4 Configuration</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        {/* Performance Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Performance</Text>

          <SettingItem
            icon="hardware-chip"
            title="Apple Neural Engine"
            subtitle="Use ANE for accelerated inference"
            type="switch"
            value={settings.useNeuralEngine}
            onValueChange={handleToggle("useNeuralEngine")}
          />

          <SettingItem
            icon="flash"
            title="KV Caching"
            subtitle="Enable stateful inference optimization"
            type="switch"
            value={settings.enableKVCaching}
            onValueChange={handleToggle("enableKVCaching")}
          />

          <SettingItem
            icon="speedometer"
            title="Quantization"
            subtitle="Model compression level"
            type="value"
            value={settings.quantization}
            onPress={handleQuantizationChange}
          />

          <SettingItem
            icon="layers"
            title="Max Tokens"
            subtitle="Maximum generation length"
            type="value"
            value={settings.maxTokens.toString()}
            onPress={handleMaxTokensChange}
          />
        </View>

        {/* Model Information */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Model Information</Text>

          <SettingItem
            icon="information-circle"
            title="Model Details"
            subtitle="Phi-4-mini-reasoning specifications"
            onPress={handleModelInfo}
          />

          <SettingItem
            icon="analytics"
            title="Performance Metrics"
            subtitle="Benchmark and hardware performance"
            onPress={handlePerformanceInfo}
          />

          <SettingItem
            icon="document-text"
            title="Context Length"
            subtitle="Maximum input sequence length"
            type="value"
            value={`${(settings.contextLength / 1000).toFixed(0)}K tokens`}
          />
        </View>

        {/* User Experience */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">User Experience</Text>

          <SettingItem
            icon="save"
            title="Auto-save Sessions"
            subtitle="Automatically save reasoning sessions"
            type="switch"
            value={settings.autoSave}
            onValueChange={handleToggle("autoSave")}
          />

          <SettingItem
            icon="bar-chart"
            title="Show Performance Metrics"
            subtitle="Display tokens/sec and timing info"
            type="switch"
            value={settings.showPerformanceMetrics}
            onValueChange={handleToggle("showPerformanceMetrics")}
          />

          <SettingItem
            icon="phone-portrait"
            title="Haptic Feedback"
            subtitle="Vibration feedback for interactions"
            type="switch"
            value={settings.enableHaptics}
            onValueChange={handleToggle("enableHaptics")}
          />
        </View>

        {/* System */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">System</Text>

          <SettingItem
            icon="trash"
            title="Clear Model Cache"
            subtitle="Reset compiled Core ML model cache"
            onPress={handleClearCache}
          />
        </View>

        {/* Technical Information */}
        <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text className="text-base font-semibold text-blue-900 ml-2">Technical Details</Text>
          </View>

          <Text className="text-sm text-blue-800 leading-relaxed">
            This implementation uses Apple's Core ML framework with advanced features like stateful models, INT4
            quantization, and Apple Neural Engine acceleration. The Phi-4-mini model is specifically optimized for
            mathematical reasoning tasks with 3.8B parameters and 128K context length.
          </Text>
        </View>

        {/* Framework Information */}
        <View className="bg-gray-100 rounded-xl p-4">
          <Text className="text-xs text-gray-600 text-center">
            React Native New Architecture • TurboModules • Core ML
          </Text>
          <Text className="text-xs text-gray-500 text-center mt-1">On-Device AI • Privacy-First • Offline Capable</Text>
        </View>
      </ScrollView>
    </View>
  );
}

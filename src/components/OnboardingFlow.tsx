import React, { useState, useRef } from "react";
import { View, Text, Pressable, ScrollView, Dimensions, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "../utils/cn";
import { AccessibilityHelper } from "../utils/accessibility";
import { Analytics } from "../utils/analytics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  example?: string;
  features?: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Phi-4 Reasoning",
    description: "Experience advanced mathematical AI reasoning directly on your device. No internet required.",
    icon: "sparkles",
    features: [
      "On-device AI processing",
      "Complete privacy protection",
      "Offline functionality",
      "Real-time step-by-step reasoning",
    ],
  },
  {
    id: "capabilities",
    title: "Mathematical Problem Solving",
    description: "Phi-4 can solve a wide range of mathematical problems with detailed explanations.",
    icon: "calculator",
    features: [
      "Algebra & Linear Equations",
      "Geometry & Trigonometry",
      "Calculus & Derivatives",
      "Word Problems & Logic",
      "Combinatorics & Probability",
    ],
  },
  {
    id: "how-it-works",
    title: "How It Works",
    description: "Watch as Phi-4 breaks down complex problems into clear, logical steps.",
    icon: "cog",
    example: "2x + 3 = 7",
    features: [
      "Step 1: Identify the equation",
      "Step 2: Isolate the variable",
      "Step 3: Solve for x",
      "Step 4: Verify the solution",
    ],
  },
  {
    id: "performance",
    title: "Optimized Performance",
    description: "Powered by Apple Neural Engine and advanced quantization for lightning-fast reasoning.",
    icon: "flash",
    features: [
      "25-35 tokens/second generation",
      "INT4 quantized model (8x smaller)",
      "Stateful KV caching",
      "Apple Silicon optimization",
    ],
  },
  {
    id: "privacy",
    title: "Privacy First",
    description: "All processing happens on your device. Your problems and solutions never leave your phone.",
    icon: "shield-checkmark",
    features: [
      "No data sent to servers",
      "Complete offline operation",
      "Local storage only",
      "GDPR & privacy compliant",
    ],
  },
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Animation values
  const slideAnimation = useSharedValue(0);
  const fadeAnimation = useSharedValue(1);
  const scaleAnimation = useSharedValue(1);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(slideAnimation.value, [0, 1], [0, -SCREEN_WIDTH]) },
      { scale: scaleAnimation.value },
    ],
    opacity: fadeAnimation.value,
  }));

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      Analytics.trackUserInteraction({ action: "next_step", component: "onboarding", value: currentStep + 1 });

      slideAnimation.value = withSpring(1, {}, () => {
        runOnJS(setCurrentStep)(currentStep + 1);
        slideAnimation.value = 0;
      });
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      Analytics.trackUserInteraction({ action: "previous_step", component: "onboarding", value: currentStep - 1 });

      slideAnimation.value = withSpring(-1, {}, () => {
        runOnJS(setCurrentStep)(currentStep - 1);
        slideAnimation.value = 0;
      });
    }
  };

  const handleSkip = () => {
    Analytics.trackUserInteraction({ action: "skip_onboarding", component: "onboarding", value: currentStep });
    handleComplete();
  };

  const handleComplete = () => {
    Analytics.track("onboarding_completed", {
      steps_viewed: currentStep + 1,
      total_steps: ONBOARDING_STEPS.length,
      completion_rate: (currentStep + 1) / ONBOARDING_STEPS.length,
    });

    fadeAnimation.value = withSpring(0, {}, () => {
      runOnJS(onComplete)();
    });
  };

  const goToStep = (stepIndex: number) => {
    Analytics.trackUserInteraction({ action: "jump_to_step", component: "onboarding", value: stepIndex });
    setCurrentStep(stepIndex);
  };

  const currentStepData = ONBOARDING_STEPS[currentStep];

  // Accessibility announcements
  React.useEffect(() => {
    AccessibilityHelper.announceForAccessibility(
      `Step ${currentStep + 1} of ${ONBOARDING_STEPS.length}: ${currentStepData.title}`,
    );
  }, [currentStep, currentStepData.title]);

  return (
    <View className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100" style={{ paddingTop: insets.top }}>
      <Animated.View style={containerStyle} className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="text-lg font-semibold text-gray-900">
              {currentStep + 1} / {ONBOARDING_STEPS.length}
            </Text>
          </View>

          <Pressable
            onPress={handleSkip}
            className="px-4 py-2 rounded-full"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            accessibilityHint="Skip the introduction and go directly to the app"
          >
            <Text className="text-blue-600 font-medium">Skip</Text>
          </Pressable>
        </View>

        {/* Progress Indicator */}
        <View className="px-6 mb-8">
          <View className="flex-row space-x-2">
            {ONBOARDING_STEPS.map((_, index) => (
              <Pressable
                key={index}
                onPress={() => goToStep(index)}
                className="flex-1"
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Go to step ${index + 1}`}
                accessibilityHint={`Jump to step ${index + 1}: ${ONBOARDING_STEPS[index].title}`}
              >
                <View className={cn("h-2 rounded-full", index <= currentStep ? "bg-blue-600" : "bg-gray-300")} />
              </Pressable>
            ))}
          </View>
        </View>

        <ScrollView ref={scrollViewRef} className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          {/* Icon */}
          <View className="items-center mb-8">
            <View className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center mb-4">
              <Ionicons name={currentStepData.icon} size={40} color="#2563EB" />
            </View>
          </View>

          {/* Content */}
          <View className="mb-8">
            <Text
              className="text-3xl font-bold text-gray-900 text-center mb-4"
              accessible={true}
              accessibilityRole="header"
              accessibilityLabel={`Heading level 1, ${currentStepData.title}`}
            >
              {currentStepData.title}
            </Text>

            <Text className="text-lg text-gray-600 text-center leading-relaxed">{currentStepData.description}</Text>
          </View>

          {/* Example Problem (for how-it-works step) */}
          {currentStepData.example && (
            <View className="bg-white rounded-xl p-6 mb-8 border border-gray-200">
              <Text className="text-sm font-medium text-blue-600 mb-2">EXAMPLE PROBLEM:</Text>
              <Text className="text-xl font-mono text-gray-900 mb-4">{currentStepData.example}</Text>
              <Text className="text-sm text-gray-500">Watch how Phi-4 solves this step by step</Text>
            </View>
          )}

          {/* Features List */}
          {currentStepData.features && (
            <View className="bg-white rounded-xl p-6 mb-8">
              <Text className="text-lg font-semibold text-gray-900 mb-4">
                {currentStep === 0
                  ? "Key Features"
                  : currentStep === 1
                    ? "Problem Types"
                    : currentStep === 2
                      ? "Reasoning Steps"
                      : currentStep === 3
                        ? "Technical Specs"
                        : "Privacy Benefits"}
              </Text>

              {currentStepData.features.map((feature, index) => (
                <View
                  key={index}
                  className="flex-row items-center mb-3"
                  accessible={true}
                  accessibilityLabel={`${feature}, ${index + 1} of ${currentStepData.features!.length}`}
                >
                  <View className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                  <Text className="text-gray-700 flex-1">{feature}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Special content for certain steps */}
          {currentStep === 3 && (
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
              <View className="flex-row items-center mb-2">
                <Ionicons name="information-circle" size={20} color="#2563EB" />
                <Text className="text-blue-900 font-medium ml-2">Performance Note</Text>
              </View>
              <Text className="text-blue-800 text-sm">
                Performance varies by device. iPhone 15 Pro with A17 Pro chip delivers optimal experience.
              </Text>
            </View>
          )}

          {currentStep === 4 && (
            <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8">
              <View className="flex-row items-center mb-2">
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                <Text className="text-green-900 font-medium ml-2">Privacy Guarantee</Text>
              </View>
              <Text className="text-green-800 text-sm">
                Zero telemetry. Zero tracking. Your mathematical problems are yours alone.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Navigation Buttons */}
        <View className="px-6 py-4 flex-row items-center justify-between" style={{ paddingBottom: insets.bottom + 16 }}>
          <Pressable
            onPress={handlePrevious}
            disabled={currentStep === 0}
            className={cn(
              "px-6 py-3 rounded-xl flex-row items-center",
              currentStep === 0 ? "opacity-50" : "bg-gray-100",
            )}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Previous step"
            accessibilityHint={currentStep === 0 ? "No previous step available" : "Go to previous step"}
            accessibilityState={{ disabled: currentStep === 0 }}
          >
            <Ionicons name="chevron-back" size={20} color={currentStep === 0 ? "#9CA3AF" : "#374151"} />
            <Text className={cn("ml-2 font-medium", currentStep === 0 ? "text-gray-400" : "text-gray-700")}>
              Previous
            </Text>
          </Pressable>

          <Pressable
            onPress={handleNext}
            className="bg-blue-600 px-8 py-3 rounded-xl flex-row items-center"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={currentStep === ONBOARDING_STEPS.length - 1 ? "Get started" : "Next step"}
            accessibilityHint={
              currentStep === ONBOARDING_STEPS.length - 1
                ? "Complete onboarding and start using the app"
                : "Continue to next step"
            }
          >
            <Text className="text-white font-semibold mr-2">
              {currentStep === ONBOARDING_STEPS.length - 1 ? "Get Started" : "Next"}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

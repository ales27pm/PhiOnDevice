import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  ScrollView, 
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withRepeat,
  withSequence,
  interpolateColor,
  useDerivedValue
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../utils/cn';
import { useReasoningStore } from '../state/reasoningStore';
import { generateReasoning, EXAMPLE_PROBLEMS } from '../api/phi4-reasoning';
import { useErrorHandler, ErrorHandler, ValidationError } from '../utils/errorHandler';
import { useAnalytics, Analytics } from '../utils/analytics';
import { useAccessibility, AccessibilityHelper } from '../utils/accessibility';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ReasoningInterface() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [streamedSolution, setStreamedSolution] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { handleError, withErrorHandling } = useErrorHandler();
  const { trackInteraction } = useAnalytics();
  const { isScreenReaderEnabled, isReduceMotionEnabled, announce } = useAccessibility();
  
  const {
    currentProblem,
    currentSolution,
    currentSteps,
    isGenerating,
    lastTokensPerSecond,
    lastDuration,
    setProblem,
    startGeneration,
    addStep,
    setSolution,
    completeGeneration,
    clearCurrent
  } = useReasoningStore();

  // Animation values
  const generateButtonScale = useSharedValue(1);
  const loadingOpacity = useSharedValue(0);
  const progressValue = useSharedValue(0);

  // Animated styles
  const generateButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: generateButtonScale.value }]
  }));

  const loadingStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value
  }));

  const progressBarStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progressValue.value,
      [0, 1],
      ['#3B82F6', '#10B981']
    );
    return {
      backgroundColor,
      width: `${progressValue.value * 100}%`
    };
  });

  const handleGenerate = async () => {
    if (!inputText.trim() || isGenerating) return;

    // Track user interaction
    trackInteraction('generate_reasoning', 'reasoning_interface', inputText.length);

    // Clear any previous errors
    setErrorMessage(null);

    // Validate input
    try {
      ErrorHandler.validateMathProblem(inputText);
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrorMessage(error.message);
        Analytics.trackReasoningFailed(inputText, 'VALIDATION_ERROR', error.message);
        return;
      }
    }

    // Announce start of reasoning for screen readers
    AccessibilityHelper.announceReasoningStarted(inputText);

    // Button animation
    generateButtonScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );

    setProblem(inputText);
    startGeneration();
    setStreamedSolution('');
    
    // Start loading animation
    loadingOpacity.value = withSpring(1);
    progressValue.value = 0;

    // Track reasoning started
    Analytics.trackReasoningStarted(inputText);

    const result = await withErrorHandling(
      async () => {
        return await generateReasoning(
          inputText,
          (step) => {
            addStep(step);
            progressValue.value = withSpring(step.step / 5); // Assuming max 5 steps
            
            // Announce step for accessibility
            AccessibilityHelper.announceReasoningStep(step.step, 5, step.description);
            
            // Auto-scroll to bottom when new step is added
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ 
                animated: !isReduceMotionEnabled 
              });
            }, 100);
          },
          (token) => {
            setStreamedSolution(prev => prev + token);
          }
        );
      },
      'ReasoningGeneration',
      true
    );

    if (result) {
      setSolution(result.solution);
      completeGeneration(result.tokensPerSecond, result.duration);
      progressValue.value = withSpring(1);
      
      // Track successful completion
      Analytics.trackReasoningCompleted({
        problemType: 'general', // Could be enhanced with type detection
        problemLength: inputText.length,
        solutionTime: result.duration,
        tokensPerSecond: result.tokensPerSecond,
        stepCount: currentSteps.length,
        wasSuccessful: true
      });
      
      // Announce completion for accessibility
      AccessibilityHelper.announceReasoningCompleted(result.solution, result.duration);
    } else {
      // Error was handled by ErrorHandler, but we need to reset UI state
      setStreamedSolution('');
      clearCurrent();
      Analytics.trackReasoningFailed(inputText, 'GENERATION_FAILED', 'Unknown error during generation');
    }

    loadingOpacity.value = withSpring(0);
  };

  // Monitor memory usage periodically
  useEffect(() => {
    const interval = setInterval(() => {
      ErrorHandler.checkMemoryUsage();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleExampleSelect = (problem: string) => {
    setInputText(problem);
  };

  const handleClear = () => {
    clearCurrent();
    setInputText('');
    setStreamedSolution('');
    progressValue.value = 0;
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-gray-900">Phi-4 Reasoning</Text>
            <Text className="text-sm text-gray-600">On-Device Mathematical AI</Text>
          </View>
          {lastTokensPerSecond > 0 && (
            <View className="bg-blue-50 px-3 py-1 rounded-full">
              <Text className="text-xs font-medium text-blue-700">
                {lastTokensPerSecond} tokens/sec
              </Text>
            </View>
          )}
        </View>
        
        {/* Progress Bar */}
        {isGenerating && (
          <View className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
            <Animated.View 
              className="h-full rounded-full"
              style={progressBarStyle}
            />
          </View>
        )}
      </View>

      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Input Section */}
        <View className="py-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Mathematical Problem
          </Text>
          
          <TextInput
            className={cn(
              "bg-white border rounded-xl px-4 py-3 text-base",
              errorMessage ? "border-red-300" : "border-gray-300"
            )}
            placeholder="Enter a mathematical problem to solve..."
            multiline
            numberOfLines={4}
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              if (errorMessage) setErrorMessage(null); // Clear error when typing
            }}
            editable={!isGenerating}
            style={{ textAlignVertical: 'top' }}
            {...AccessibilityHelper.getProblemInputProps(!!errorMessage, errorMessage || undefined)}
          />

          {/* Error Message Display */}
          {errorMessage && (
            <View className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <Text className="text-sm text-red-700">{errorMessage}</Text>
            </View>
          )}

          {/* Example Problems */}
          <View className="mt-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Example Problems:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-2">
                {EXAMPLE_PROBLEMS.map((example, index) => (
                  <Pressable
                    key={index}
                    className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mr-2"
                    onPress={() => handleExampleSelect(example.problem)}
                    disabled={isGenerating}
                  >
                    <Text className="text-xs font-medium text-blue-700 mb-1">
                      {example.category}
                    </Text>
                    <Text className="text-xs text-blue-600" numberOfLines={2}>
                      {example.problem}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View className="flex-row space-x-3 mt-4">
            <AnimatedPressable
              className={cn(
                "flex-1 bg-blue-600 rounded-xl py-3 flex-row items-center justify-center",
                isGenerating && "opacity-60"
              )}
              style={generateButtonStyle}
              onPress={handleGenerate}
              disabled={!inputText.trim() || isGenerating}
              {...AccessibilityHelper.getGenerateButtonProps(isGenerating, !!inputText.trim())}
            >
              <Ionicons 
                name={isGenerating ? "hourglass" : "flash"} 
                size={20} 
                color="white" 
                style={{ marginRight: 8 }}
              />
              <Text className="text-white font-semibold text-base">
                {isGenerating ? 'Reasoning...' : 'Generate'}
              </Text>
            </AnimatedPressable>

            <Pressable
              className="bg-gray-200 rounded-xl py-3 px-4 flex-row items-center justify-center"
              onPress={handleClear}
              disabled={isGenerating}
            >
              <Ionicons name="refresh" size={20} color="#6B7280" />
            </Pressable>
          </View>
        </View>

        {/* Results Section */}
        {(currentProblem || isGenerating) && (
          <View className="bg-white rounded-xl p-4 mb-4">
            {/* Problem Statement */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-500 mb-1">
                PROBLEM:
              </Text>
              <Text className="text-base text-gray-900">
                {currentProblem}
              </Text>
            </View>

            {/* Reasoning Steps */}
            {currentSteps.length > 0 && (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-500 mb-3">
                  REASONING STEPS:
                </Text>
                {currentSteps.map((step, index) => (
                  <View key={index} className="mb-3 border-l-4 border-blue-200 pl-3">
                    <Text className="text-sm font-semibold text-blue-700 mb-1">
                      Step {step.step}: {step.description}
                    </Text>
                    <Text className="text-sm text-gray-700">
                      {step.content}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Solution */}
            {(currentSolution || streamedSolution) && (
              <View className="bg-green-50 border border-green-200 rounded-lg p-3">
                <Text className="text-sm font-medium text-green-700 mb-1">
                  SOLUTION:
                </Text>
                <Text className="text-base text-green-900">
                  {currentSolution || streamedSolution}
                </Text>
                
                {/* Performance Metrics */}
                {lastDuration > 0 && (
                  <View className="flex-row justify-between mt-3 pt-2 border-t border-green-200">
                    <Text className="text-xs text-green-600">
                      Duration: {(lastDuration / 1000).toFixed(1)}s
                    </Text>
                    <Text className="text-xs text-green-600">
                      Speed: {lastTokensPerSecond} t/s
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Loading Indicator */}
        <Animated.View style={loadingStyle} className="items-center py-4">
          <View className="bg-white rounded-xl p-6 items-center">
            <Ionicons name="hardware-chip" size={40} color="#3B82F6" />
            <Text className="text-base font-medium text-gray-900 mt-2">
              Phi-4 is thinking...
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              Running on Apple Neural Engine
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
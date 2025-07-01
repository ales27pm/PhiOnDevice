import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { cn } from '../utils/cn';

interface VoiceVisualizerProps {
  state: 'idle' | 'wake-word' | 'listening' | 'processing' | 'generating';
  size?: number;
  className?: string;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ 
  state, 
  size = 80, 
  className 
}) => {
  const glowAnimation = useSharedValue(0);
  const waveAnimation1 = useSharedValue(0);
  const waveAnimation2 = useSharedValue(0);
  const waveAnimation3 = useSharedValue(0);
  const pulseAnimation = useSharedValue(0);
  const rotateAnimation = useSharedValue(0);

  useEffect(() => {
    // Cancel all animations first
    cancelAnimation(glowAnimation);
    cancelAnimation(waveAnimation1);
    cancelAnimation(waveAnimation2);
    cancelAnimation(waveAnimation3);
    cancelAnimation(pulseAnimation);
    cancelAnimation(rotateAnimation);

    switch (state) {
      case 'wake-word':
        // Subtle glow effect
        glowAnimation.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 800, easing: Easing.ease }),
            withTiming(0.3, { duration: 800, easing: Easing.ease })
          ),
          -1,
          false
        );
        break;
        
      case 'listening':
        // Waveform animation with multiple bars
        waveAnimation1.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 600, easing: Easing.ease }),
            withTiming(0.2, { duration: 600, easing: Easing.ease })
          ),
          -1,
          false
        );
        waveAnimation2.value = withRepeat(
          withSequence(
            withTiming(0.7, { duration: 800, easing: Easing.ease }),
            withTiming(0.1, { duration: 800, easing: Easing.ease })
          ),
          -1,
          false
        );
        waveAnimation3.value = withRepeat(
          withSequence(
            withTiming(0.9, { duration: 500, easing: Easing.ease }),
            withTiming(0.3, { duration: 500, easing: Easing.ease })
          ),
          -1,
          false
        );
        break;
        
      case 'processing':
        // Pulsing animation
        pulseAnimation.value = withRepeat(
          withTiming(1, { duration: 1000, easing: Easing.ease }),
          -1,
          true
        );
        break;
        
      case 'generating':
        // Rotating spinner
        rotateAnimation.value = withRepeat(
          withTiming(360, { duration: 2000, easing: Easing.linear }),
          -1,
          false
        );
        break;
        
      default:
        // Reset all animations to idle state
        glowAnimation.value = withTiming(0, { duration: 300 });
        waveAnimation1.value = withTiming(0, { duration: 300 });
        waveAnimation2.value = withTiming(0, { duration: 300 });
        waveAnimation3.value = withTiming(0, { duration: 300 });
        pulseAnimation.value = withTiming(0, { duration: 300 });
        rotateAnimation.value = withTiming(0, { duration: 300 });
        break;
    }
  }, [state]);

  const glowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(glowAnimation.value, [0, 1], [0, 0.6]);
    const scale = interpolate(glowAnimation.value, [0, 1], [1, 1.2]);
    
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const waveStyle1 = useAnimatedStyle(() => {
    const height = interpolate(waveAnimation1.value, [0, 1], [size * 0.2, size * 0.8]);
    return { height };
  });

  const waveStyle2 = useAnimatedStyle(() => {
    const height = interpolate(waveAnimation2.value, [0, 1], [size * 0.1, size * 0.6]);
    return { height };
  });

  const waveStyle3 = useAnimatedStyle(() => {
    const height = interpolate(waveAnimation3.value, [0, 1], [size * 0.3, size * 0.9]);
    return { height };
  });

  const pulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnimation.value, [0, 1], [1, 1.15]);
    const opacity = interpolate(pulseAnimation.value, [0, 1], [1, 0.7]);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const rotateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateAnimation.value}deg` }],
    };
  });

  const renderContent = () => {
    switch (state) {
      case 'wake-word':
        return (
          <View className="relative items-center justify-center" style={{ width: size, height: size }}>
            {/* Glow effect */}
            <Animated.View
              style={[glowStyle]}
              className="absolute inset-0 rounded-full bg-blue-400"
            />
            {/* Core circle */}
            <View
              className="rounded-full bg-blue-500 items-center justify-center"
              style={{ width: size * 0.7, height: size * 0.7 }}
            />
          </View>
        );
        
      case 'listening':
        return (
          <View className="flex-row items-end justify-center space-x-1" style={{ height: size }}>
            <Animated.View
              style={[waveStyle1]}
              className="w-2 bg-red-500 rounded-full"
            />
            <Animated.View
              style={[waveStyle2]}
              className="w-2 bg-red-500 rounded-full"
            />
            <Animated.View
              style={[waveStyle3]}
              className="w-2 bg-red-500 rounded-full"
            />
            <Animated.View
              style={[waveStyle1]}
              className="w-2 bg-red-500 rounded-full"
            />
            <Animated.View
              style={[waveStyle2]}
              className="w-2 bg-red-500 rounded-full"
            />
          </View>
        );
        
      case 'processing':
        return (
          <Animated.View
            style={[pulseStyle]}
            className="rounded-full bg-amber-500 items-center justify-center"
            style={{ width: size * 0.8, height: size * 0.8 }}
          />
        );
        
      case 'generating':
        return (
          <Animated.View
            style={[rotateStyle]}
            className="items-center justify-center"
            style={{ width: size, height: size }}
          >
            <View className="w-1 h-6 bg-blue-500 rounded-full absolute top-2" />
            <View className="w-1 h-4 bg-blue-300 rounded-full absolute bottom-2" />
            <View className="w-1 h-5 bg-blue-400 rounded-full absolute left-2" />
            <View className="w-1 h-3 bg-blue-200 rounded-full absolute right-2" />
          </Animated.View>
        );
        
      default:
        return (
          <View
            className="rounded-full bg-gray-300 items-center justify-center"
            style={{ width: size * 0.6, height: size * 0.6 }}
          />
        );
    }
  };

  return (
    <View className={cn("items-center justify-center", className)}>
      {renderContent()}
    </View>
  );
};
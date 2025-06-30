import React, { useEffect, useState } from 'react';
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OnboardingFlow } from './src/components/OnboardingFlow';
import { useOnboardingStore } from './src/state/onboardingStore';
import { Analytics } from './src/utils/analytics';
import { AccessibilityHelper } from './src/utils/accessibility';

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project. 
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const { shouldShowOnboarding, completeOnboarding, skipOnboarding } = useOnboardingStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Track app launch
      Analytics.trackAppLaunch();
      
      // Initialize accessibility
      await AccessibilityHelper.testAccessibility();
      
      // Check if onboarding should be shown
      setShowOnboarding(shouldShowOnboarding());
      
      setIsAppReady(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setIsAppReady(true); // Continue anyway
    }
  };

  const handleOnboardingComplete = () => {
    completeOnboarding();
    setShowOnboarding(false);
    AccessibilityHelper.announceForAccessibility('Welcome to Phi-4 Reasoning. Ready to solve mathematical problems.');
  };

  const handleOnboardingSkip = () => {
    skipOnboarding();
    setShowOnboarding(false);
  };

  if (!isAppReady) {
    return null; // Or a loading screen
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {showOnboarding ? (
          <OnboardingFlow onComplete={handleOnboardingComplete} />
        ) : (
          <AppNavigator />
        )}
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  onboardingVersion: string;
  lastViewedStep: number;
  skippedOnboarding: boolean;
  
  // Actions
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  updateLastViewedStep: (step: number) => void;
  shouldShowOnboarding: () => boolean;
}

const CURRENT_ONBOARDING_VERSION = '1.0.0';

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      onboardingVersion: '',
      lastViewedStep: 0,
      skippedOnboarding: false,

      completeOnboarding: () => set({
        hasCompletedOnboarding: true,
        onboardingVersion: CURRENT_ONBOARDING_VERSION,
        skippedOnboarding: false
      }),

      skipOnboarding: () => set({
        hasCompletedOnboarding: true,
        onboardingVersion: CURRENT_ONBOARDING_VERSION,
        skippedOnboarding: true
      }),

      resetOnboarding: () => set({
        hasCompletedOnboarding: false,
        onboardingVersion: '',
        lastViewedStep: 0,
        skippedOnboarding: false
      }),

      updateLastViewedStep: (step: number) => set({
        lastViewedStep: Math.max(get().lastViewedStep, step)
      }),

      shouldShowOnboarding: () => {
        const state = get();
        return !state.hasCompletedOnboarding || 
               state.onboardingVersion !== CURRENT_ONBOARDING_VERSION;
      }
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
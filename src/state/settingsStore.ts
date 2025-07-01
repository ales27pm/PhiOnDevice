import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SettingsState {
  // Voice & Interaction Settings
  handsFreeModeEnabled: boolean;
  wakewUprdEnabled: boolean;
  notificationsEnabled: boolean;
  
  // Audio Settings
  speechRate: number;
  speechVolume: number;
  speechVoice: string;
  
  // Privacy & Security
  dataRetentionDays: number;
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  
  // UI & Accessibility
  darkModeEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
  reducedAnimations: boolean;
  
  // Actions
  toggleHandsFreeMode: () => void;
  toggleWakeWord: () => void;
  toggleNotifications: () => void;
  toggleDarkMode: () => void;
  toggleAnalytics: () => void;
  toggleCrashReporting: () => void;
  toggleReducedAnimations: () => void;
  
  setSpeechRate: (rate: number) => void;
  setSpeechVolume: (volume: number) => void;
  setSpeechVoice: (voice: string) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setDataRetentionDays: (days: number) => void;
  
  resetAllSettings: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
}

// Default settings
const DEFAULT_SETTINGS = {
  // Voice & Interaction
  handsFreeModeEnabled: false,
  wakewUprdEnabled: false,
  notificationsEnabled: true,
  
  // Audio
  speechRate: 1.0,
  speechVolume: 1.0,
  speechVoice: 'default',
  
  // Privacy & Security
  dataRetentionDays: 30,
  analyticsEnabled: false,
  crashReportingEnabled: true,
  
  // UI & Accessibility
  darkModeEnabled: false,
  fontSize: 'medium' as const,
  reducedAnimations: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      
      // Voice & Interaction Actions
      toggleHandsFreeMode: () => {
        const newValue = !get().handsFreeModeEnabled;
        set({ handsFreeModeEnabled: newValue });
        
        // If enabling hands-free, also enable wake word
        if (newValue) {
          set({ wakewUprdEnabled: true });
        }
        
        console.log(`Hands-free mode ${newValue ? 'enabled' : 'disabled'}`);
      },
      
      toggleWakeWord: () => {
        const newValue = !get().wakewUprdEnabled;
        set({ wakewUprdEnabled: newValue });
        
        // If disabling wake word, also disable hands-free
        if (!newValue) {
          set({ handsFreeModeEnabled: false });
        }
        
        console.log(`Wake word ${newValue ? 'enabled' : 'disabled'}`);
      },
      
      toggleNotifications: () => {
        const newValue = !get().notificationsEnabled;
        set({ notificationsEnabled: newValue });
        console.log(`Notifications ${newValue ? 'enabled' : 'disabled'}`);
      },
      
      // UI Actions
      toggleDarkMode: () => {
        const newValue = !get().darkModeEnabled;
        set({ darkModeEnabled: newValue });
        console.log(`Dark mode ${newValue ? 'enabled' : 'disabled'}`);
      },
      
      toggleAnalytics: () => {
        const newValue = !get().analyticsEnabled;
        set({ analyticsEnabled: newValue });
        console.log(`Analytics ${newValue ? 'enabled' : 'disabled'}`);
      },
      
      toggleCrashReporting: () => {
        const newValue = !get().crashReportingEnabled;
        set({ crashReportingEnabled: newValue });
        console.log(`Crash reporting ${newValue ? 'enabled' : 'disabled'}`);
      },
      
      toggleReducedAnimations: () => {
        const newValue = !get().reducedAnimations;
        set({ reducedAnimations: newValue });
        console.log(`Reduced animations ${newValue ? 'enabled' : 'disabled'}`);
      },
      
      // Setter Actions
      setSpeechRate: (rate: number) => {
        const clampedRate = Math.max(0.5, Math.min(2.0, rate));
        set({ speechRate: clampedRate });
        console.log(`Speech rate set to ${clampedRate}`);
      },
      
      setSpeechVolume: (volume: number) => {
        const clampedVolume = Math.max(0.0, Math.min(1.0, volume));
        set({ speechVolume: clampedVolume });
        console.log(`Speech volume set to ${clampedVolume}`);
      },
      
      setSpeechVoice: (voice: string) => {
        set({ speechVoice: voice });
        console.log(`Speech voice set to ${voice}`);
      },
      
      setFontSize: (size: 'small' | 'medium' | 'large') => {
        set({ fontSize: size });
        console.log(`Font size set to ${size}`);
      },
      
      setDataRetentionDays: (days: number) => {
        const clampedDays = Math.max(1, Math.min(365, days));
        set({ dataRetentionDays: clampedDays });
        console.log(`Data retention set to ${clampedDays} days`);
      },
      
      // Utility Actions
      resetAllSettings: () => {
        set(DEFAULT_SETTINGS);
        console.log('All settings reset to defaults');
      },
      
      exportSettings: () => {
        const currentSettings = get();
        const exportData = {
          ...currentSettings,
          // Remove functions from export
          toggleHandsFreeMode: undefined,
          toggleWakeWord: undefined,
          toggleNotifications: undefined,
          toggleDarkMode: undefined,
          toggleAnalytics: undefined,
          toggleCrashReporting: undefined,
          toggleReducedAnimations: undefined,
          setSpeechRate: undefined,
          setSpeechVolume: undefined,
          setSpeechVoice: undefined,
          setFontSize: undefined,
          setDataRetentionDays: undefined,
          resetAllSettings: undefined,
          exportSettings: undefined,
          importSettings: undefined,
        };
        
        return JSON.stringify(exportData, null, 2);
      },
      
      importSettings: (settingsJson: string) => {
        try {
          const importedSettings = JSON.parse(settingsJson);
          
          // Validate and merge settings
          const validatedSettings = {
            ...DEFAULT_SETTINGS,
            ...importedSettings,
          };
          
          // Ensure values are within valid ranges
          validatedSettings.speechRate = Math.max(0.5, Math.min(2.0, validatedSettings.speechRate));
          validatedSettings.speechVolume = Math.max(0.0, Math.min(1.0, validatedSettings.speechVolume));
          validatedSettings.dataRetentionDays = Math.max(1, Math.min(365, validatedSettings.dataRetentionDays));
          
          set(validatedSettings);
          console.log('Settings imported successfully');
          return true;
        } catch (error) {
          console.error('Failed to import settings:', error);
          return false;
        }
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        // Only persist data, not functions
        const {
          toggleHandsFreeMode,
          toggleWakeWord,
          toggleNotifications,
          toggleDarkMode,
          toggleAnalytics,
          toggleCrashReporting,
          toggleReducedAnimations,
          setSpeechRate,
          setSpeechVolume,
          setSpeechVoice,
          setFontSize,
          setDataRetentionDays,
          resetAllSettings,
          exportSettings,
          importSettings,
          ...persistedState
        } = state;
        
        return persistedState;
      },
    }
  )
);
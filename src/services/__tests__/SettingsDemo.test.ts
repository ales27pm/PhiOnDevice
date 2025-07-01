import { useSettingsStore } from '../../state/settingsStore';

/**
 * Simple demo of settings functionality
 */
export function demoSettingsUsage(): void {
  console.log('🧪 Settings Demo...');
  
  // Note: In a real app, you would use this within React components
  // This demo shows the store interface for testing purposes
  
  const store = useSettingsStore.getState();
  
  console.log('📱 Current Settings:');
  console.log('- Hands-free mode:', store.handsFreeModeEnabled);
  console.log('- Wake word:', store.wakewUprdEnabled);
  console.log('- Notifications:', store.notificationsEnabled);
  console.log('- Speech rate:', store.speechRate);
  console.log('- Font size:', store.fontSize);
  console.log('- Data retention:', store.dataRetentionDays, 'days');
  
  console.log('\n🔧 Testing Settings Changes:');
  
  // Test hands-free mode toggle
  console.log('Enabling hands-free mode...');
  store.toggleHandsFreeMode();
  console.log('- Hands-free mode:', store.handsFreeModeEnabled);
  console.log('- Wake word (should be auto-enabled):', store.wakewUprdEnabled);
  
  // Test wake word disable (should disable hands-free too)
  console.log('\nDisabling wake word...');
  store.toggleWakeWord();
  console.log('- Wake word:', store.wakewUprdEnabled);
  console.log('- Hands-free mode (should be auto-disabled):', store.handsFreeModeEnabled);
  
  // Test speech settings
  console.log('\nAdjusting speech settings...');
  store.setSpeechRate(1.5);
  store.setSpeechVolume(0.8);
  console.log('- Speech rate:', store.speechRate);
  console.log('- Speech volume:', store.speechVolume);
  
  // Test export/import
  console.log('\nTesting export...');
  const exportedSettings = store.exportSettings();
  console.log('- Export length:', exportedSettings.length, 'characters');
  
  // Test import
  console.log('\nTesting import...');
  const testSettings = JSON.stringify({
    handsFreeModeEnabled: true,
    speechRate: 2.0,
    fontSize: 'large',
  });
  const importSuccess = store.importSettings(testSettings);
  console.log('- Import success:', importSuccess);
  console.log('- Speech rate after import:', store.speechRate);
  console.log('- Font size after import:', store.fontSize);
  
  // Test reset
  console.log('\nResetting all settings...');
  store.resetAllSettings();
  console.log('- Hands-free mode (should be false):', store.handsFreeModeEnabled);
  console.log('- Speech rate (should be 1.0):', store.speechRate);
  console.log('- Font size (should be medium):', store.fontSize);
  
  console.log('\n✅ Settings Demo Complete!');
}

// Example usage in a React component:
export const SETTINGS_USAGE_EXAMPLE = `
// In a React component:
import { useSettingsStore } from '../state/settingsStore';

const MyComponent = () => {
  const { 
    handsFreeModeEnabled, 
    toggleHandsFreeMode,
    speechRate,
    setSpeechRate 
  } = useSettingsStore();

  return (
    <View>
      <Switch 
        value={handsFreeModeEnabled}
        onValueChange={toggleHandsFreeMode}
      />
      <Slider
        value={speechRate}
        onValueChange={setSpeechRate}
        minimumValue={0.5}
        maximumValue={2.0}
      />
    </View>
  );
};
`;
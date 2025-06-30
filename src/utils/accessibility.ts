import { AccessibilityInfo } from 'react-native';

// Accessibility utilities for Phi-4 Reasoning app

export interface AccessibilityProps {
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 
    | 'none'
    | 'button'
    | 'link'
    | 'search'
    | 'image'
    | 'keyboardkey'
    | 'text'
    | 'adjustable'
    | 'imagebutton'
    | 'header'
    | 'summary'
    | 'progressbar'
    | 'tab'
    | 'tablist'
    | 'menu'
    | 'menubar'
    | 'menuitem'
    | 'alert'
    | 'checkbox'
    | 'combobox'
    | 'grid'
    | 'list'
    | 'listitem'
    | 'radio'
    | 'radiogroup'
    | 'scrollbar'
    | 'spinbutton'
    | 'switch'
    | 'textbox'
    | 'timer'
    | 'toolbar';
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    busy?: boolean;
    expanded?: boolean;
  };
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  accessibilityActions?: Array<{
    name: string;
    label?: string;
  }>;
  onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void;
}

class AccessibilityManager {
  private isScreenReaderEnabled = false;
  private isReduceMotionEnabled = false;
  private announcements: string[] = [];

  constructor() {
    this.initializeAccessibility();
  }

  private async initializeAccessibility() {
    try {
      this.isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      this.isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();

      // Listen for accessibility changes
      AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
        this.isScreenReaderEnabled = enabled;
        this.announceIfEnabled('Screen reader ' + (enabled ? 'enabled' : 'disabled'));
      });

      AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
        this.isReduceMotionEnabled = enabled;
      });
    } catch (error) {
      console.warn('Failed to initialize accessibility features:', error);
    }
  }

  // Announcement methods
  announceForAccessibility(message: string, priority: 'low' | 'high' = 'low'): void {
    if (this.isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
      this.announcements.push(`[${new Date().toTimeString()}] ${message}`);
      
      // Keep only last 50 announcements
      if (this.announcements.length > 50) {
        this.announcements = this.announcements.slice(-50);
      }
    }
  }

  announceIfEnabled(message: string): void {
    if (this.isScreenReaderEnabled) {
      this.announceForAccessibility(message);
    }
  }

  // Screen reader status
  getScreenReaderEnabled(): boolean {
    return this.isScreenReaderEnabled;
  }

  getReduceMotionEnabled(): boolean {
    return this.isReduceMotionEnabled;
  }

  // Accessibility props generators for common UI patterns
  getButtonProps(label: string, hint?: string, disabled = false): AccessibilityProps {
    return {
      accessible: true,
      accessibilityRole: 'button',
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityState: { disabled }
    };
  }

  getTextInputProps(label: string, value?: string, hint?: string): AccessibilityProps {
    return {
      accessible: true,
      accessibilityRole: 'textbox',
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityValue: value ? { text: value } : undefined
    };
  }

  getProgressBarProps(current: number, max: number, label?: string): AccessibilityProps {
    const percentage = Math.round((current / max) * 100);
    return {
      accessible: true,
      accessibilityRole: 'progressbar',
      accessibilityLabel: label || 'Progress',
      accessibilityValue: {
        min: 0,
        max: 100,
        now: percentage,
        text: `${percentage} percent complete`
      }
    };
  }

  getListItemProps(label: string, position: number, total: number): AccessibilityProps {
    return {
      accessible: true,
      accessibilityRole: 'listitem',
      accessibilityLabel: `${label}, ${position} of ${total}`
    };
  }

  getHeaderProps(level: number, text: string): AccessibilityProps {
    return {
      accessible: true,
      accessibilityRole: 'header',
      accessibilityLabel: `Heading level ${level}, ${text}`
    };
  }

  // Reasoning-specific accessibility helpers
  getReasoningStepProps(step: number, total: number, description: string, content: string): AccessibilityProps {
    return {
      accessible: true,
      accessibilityRole: 'listitem',
      accessibilityLabel: `Step ${step} of ${total}: ${description}`,
      accessibilityHint: content,
      accessibilityValue: {
        min: 1,
        max: total,
        now: step,
        text: `Step ${step} of ${total}`
      }
    };
  }

  getProblemInputProps(hasError: boolean, errorMessage?: string): AccessibilityProps {
    return {
      accessible: true,
      accessibilityRole: 'textbox',
      accessibilityLabel: 'Mathematical problem input',
      accessibilityHint: hasError 
        ? `Error: ${errorMessage}. Enter a valid mathematical problem to solve`
        : 'Enter a mathematical problem such as an equation, geometry question, or word problem',
      accessibilityState: { 
        invalid: hasError 
      }
    };
  }

  getSolutionProps(solution: string, tokensPerSecond?: number, duration?: number): AccessibilityProps {
    let hint = `Solution: ${solution}`;
    if (tokensPerSecond && duration) {
      hint += `. Generated at ${tokensPerSecond} tokens per second in ${Math.round(duration / 1000)} seconds`;
    }

    return {
      accessible: true,
      accessibilityRole: 'text',
      accessibilityLabel: 'Problem solution',
      accessibilityHint: hint
    };
  }

  getGenerateButtonProps(isGenerating: boolean, hasInput: boolean): AccessibilityProps {
    const disabled = isGenerating || !hasInput;
    let label = 'Generate reasoning';
    let hint = 'Tap to start solving the mathematical problem';

    if (isGenerating) {
      label = 'Generating reasoning';
      hint = 'Please wait while the AI solves your problem';
    } else if (!hasInput) {
      hint = 'Enter a problem first, then tap to generate reasoning';
    }

    return {
      accessible: true,
      accessibilityRole: 'button',
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityState: { 
        disabled,
        busy: isGenerating 
      }
    };
  }

  // Navigation and routing accessibility
  getTabProps(label: string, selected: boolean, index: number, total: number): AccessibilityProps {
    return {
      accessible: true,
      accessibilityRole: 'tab',
      accessibilityLabel: `${label} tab, ${index + 1} of ${total}`,
      accessibilityState: { selected }
    };
  }

  // Error and status announcements
  announceReasoningStarted(problem: string): void {
    this.announceForAccessibility(`Started solving: ${problem.substring(0, 100)}${problem.length > 100 ? '...' : ''}`);
  }

  announceReasoningStep(step: number, total: number, description: string): void {
    this.announceForAccessibility(`Step ${step} of ${total}: ${description}`);
  }

  announceReasoningCompleted(solution: string, duration: number): void {
    const shortSolution = solution.substring(0, 150) + (solution.length > 150 ? '...' : '');
    this.announceForAccessibility(`Solution found in ${Math.round(duration / 1000)} seconds: ${shortSolution}`);
  }

  announceError(errorMessage: string): void {
    this.announceForAccessibility(`Error: ${errorMessage}`, 'high');
  }

  announceSessionLoaded(): void {
    this.announceForAccessibility('Previous reasoning session loaded');
  }

  announceSessionDeleted(): void {
    this.announceForAccessibility('Reasoning session deleted');
  }

  // Performance considerations for accessibility
  shouldReduceMotion(): boolean {
    return this.isReduceMotionEnabled;
  }

  getAnimationDuration(defaultDuration: number): number {
    return this.isReduceMotionEnabled ? 0 : defaultDuration;
  }

  // Utility methods
  getAnnouncementHistory(): string[] {
    return [...this.announcements];
  }

  clearAnnouncementHistory(): void {
    this.announcements = [];
  }

  // Test if accessibility features are working
  async testAccessibility(): Promise<{
    screenReader: boolean;
    reduceMotion: boolean;
    canAnnounce: boolean;
  }> {
    try {
      const screenReader = await AccessibilityInfo.isScreenReaderEnabled();
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      
      // Test announcement
      AccessibilityInfo.announceForAccessibility('Accessibility test');
      
      return {
        screenReader,
        reduceMotion,
        canAnnounce: true
      };
    } catch (error) {
      return {
        screenReader: false,
        reduceMotion: false,
        canAnnounce: false
      };
    }
  }
}

// Singleton instance
export const AccessibilityHelper = new AccessibilityManager();

import React from 'react';

// React hook for accessibility
export function useAccessibility() {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = React.useState(false);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = React.useState(false);

  React.useEffect(() => {
    const updateScreenReader = (enabled: boolean) => setIsScreenReaderEnabled(enabled);
    const updateReduceMotion = (enabled: boolean) => setIsReduceMotionEnabled(enabled);

    // Get initial values
    AccessibilityInfo.isScreenReaderEnabled().then(updateScreenReader);
    AccessibilityInfo.isReduceMotionEnabled().then(updateReduceMotion);

    // Listen for changes
    const screenReaderSubscription = AccessibilityInfo.addEventListener('screenReaderChanged', updateScreenReader);
    const reduceMotionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', updateReduceMotion);

    return () => {
      screenReaderSubscription?.remove();
      reduceMotionSubscription?.remove();
    };
  }, []);

  const announce = React.useCallback((message: string, priority: 'low' | 'high' = 'low') => {
    AccessibilityHelper.announceForAccessibility(message, priority);
  }, []);

  return {
    isScreenReaderEnabled,
    isReduceMotionEnabled,
    announce,
    helper: AccessibilityHelper
  };
}
// Analytics tracking for Phi-4 Reasoning app
// In production, this would integrate with Firebase Analytics, Mixpanel, or similar

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
}

export interface ReasoningMetrics {
  problemType: string;
  problemLength: number;
  solutionTime: number;
  tokensPerSecond: number;
  stepCount: number;
  wasSuccessful: boolean;
  errorCode?: string;
}

export interface UserInteraction {
  action: string;
  component: string;
  value?: string | number;
  metadata?: Record<string, any>;
}

class AnalyticsManager {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private isEnabled: boolean;
  private maxEvents = 1000;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === "true";
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        platform: "react-native",
        app_version: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
        environment: process.env.EXPO_PUBLIC_ENVIRONMENT || "development",
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    this.events.push(event);

    // Prevent memory leaks by limiting stored events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    if (__DEV__) {
      console.log("📊 Analytics:", eventName, properties);
    }

    // In production, send to analytics service
    this.sendToAnalyticsService(event);
  }

  // App lifecycle events
  trackAppLaunch(): void {
    this.track("app_launched", {
      session_id: this.sessionId,
      launch_time: new Date().toISOString(),
    });
  }

  trackAppBackground(): void {
    this.track("app_backgrounded", {
      session_duration: this.getSessionDuration(),
    });
  }

  trackAppForeground(): void {
    this.track("app_foregrounded");
  }

  // Reasoning-specific events
  trackReasoningStarted(problem: string, problemType?: string): void {
    this.track("reasoning_started", {
      problem_length: problem.length,
      problem_type: problemType || "unknown",
      problem_hash: this.hashString(problem), // Don't store actual problem for privacy
    });
  }

  trackReasoningCompleted(metrics: ReasoningMetrics): void {
    this.track("reasoning_completed", {
      ...metrics,
      performance_tier: this.getPerformanceTier(metrics.tokensPerSecond),
      complexity_score: this.calculateComplexityScore(metrics),
    });
  }

  trackReasoningFailed(problem: string, errorCode: string, errorMessage?: string): void {
    this.track("reasoning_failed", {
      problem_length: problem.length,
      error_code: errorCode,
      error_message: errorMessage,
      problem_hash: this.hashString(problem),
    });
  }

  // User interaction events
  trackUserInteraction(interaction: UserInteraction): void {
    this.track("user_interaction", {
      action: interaction.action,
      component: interaction.component,
      value: interaction.value,
      ...interaction.metadata,
    });
  }

  trackExampleProblemSelected(example: any): void {
    this.track("example_problem_selected", {
      category: example.category,
      difficulty: example.difficulty,
      problem_length: example.problem.length,
    });
  }

  trackSessionLoaded(sessionId: string): void {
    this.track("session_loaded", {
      loaded_session_id: sessionId,
    });
  }

  trackSessionDeleted(sessionId: string): void {
    this.track("session_deleted", {
      deleted_session_id: sessionId,
    });
  }

  // Settings and configuration events
  trackSettingChanged(setting: string, oldValue: any, newValue: any): void {
    this.track("setting_changed", {
      setting_name: setting,
      old_value: oldValue,
      new_value: newValue,
    });
  }

  trackPerformanceMetric(metric: string, value: number, context?: string): void {
    this.track("performance_metric", {
      metric_name: metric,
      metric_value: value,
      context: context,
    });
  }

  // Error tracking
  trackError(error: Error, context?: string): void {
    this.track("error_occurred", {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack?.substring(0, 500), // Limit stack trace length
      context: context,
    });
  }

  // Feature usage tracking
  trackFeatureUsage(feature: string, metadata?: Record<string, any>): void {
    this.track("feature_used", {
      feature_name: feature,
      ...metadata,
    });
  }

  // Helper methods
  private getPerformanceTier(tokensPerSecond: number): string {
    if (tokensPerSecond >= 35) return "high";
    if (tokensPerSecond >= 25) return "medium";
    return "low";
  }

  private calculateComplexityScore(metrics: ReasoningMetrics): number {
    // Simple complexity score based on multiple factors
    let score = 0;
    score += metrics.stepCount * 10; // Base complexity from step count
    score += metrics.problemLength / 10; // Problem length factor
    score += (metrics.solutionTime / 1000) * 5; // Time factor
    return Math.round(score);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  private getSessionDuration(): number {
    const sessionStart = parseInt(this.sessionId.split("_")[1]);
    return Date.now() - sessionStart;
  }

  private async sendToAnalyticsService(event: AnalyticsEvent): Promise<void> {
    // In production, this would send to your analytics service
    // Examples:
    // - Firebase Analytics: analytics().logEvent(event.name, event.properties)
    // - Mixpanel: mixpanel.track(event.name, event.properties)
    // - Custom API: fetch('/analytics', { method: 'POST', body: JSON.stringify(event) })

    if (__DEV__) {
      // In development, just log to console
      return;
    }

    try {
      // Example implementation:
      // await fetch('https://api.yourdomain.com/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event)
      // });
    } catch (error) {
      console.warn("Failed to send analytics event:", error);
    }
  }

  // Data export for debugging/analysis
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  getEventsSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    this.events.forEach((event) => {
      summary[event.name] = (summary[event.name] || 0) + 1;
    });
    return summary;
  }

  clearEvents(): void {
    this.events = [];
  }

  // User consent and privacy
  setAnalyticsEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.track("analytics_consent_changed", { enabled });
  }

  isAnalyticsEnabled(): boolean {
    return this.isEnabled;
  }
}

// Singleton instance
export const Analytics = new AnalyticsManager();

import React from "react";

// React hook for analytics
export function useAnalytics() {
  const trackInteraction = React.useCallback(
    (action: string, component: string, value?: string | number, metadata?: Record<string, any>) => {
      Analytics.trackUserInteraction({ action, component, value, metadata });
    },
    [],
  );

  const trackFeature = React.useCallback((feature: string, metadata?: Record<string, any>) => {
    Analytics.trackFeatureUsage(feature, metadata);
  }, []);

  const trackError = React.useCallback((error: Error, context?: string) => {
    Analytics.trackError(error, context);
  }, []);

  return {
    track: Analytics.track.bind(Analytics),
    trackInteraction,
    trackFeature,
    trackError,
  };
}

// Analytics event names (constants for consistency)
export const ANALYTICS_EVENTS = {
  APP_LAUNCHED: "app_launched",
  APP_BACKGROUNDED: "app_backgrounded",
  APP_FOREGROUNDED: "app_foregrounded",

  REASONING_STARTED: "reasoning_started",
  REASONING_COMPLETED: "reasoning_completed",
  REASONING_FAILED: "reasoning_failed",

  EXAMPLE_SELECTED: "example_problem_selected",
  SESSION_LOADED: "session_loaded",
  SESSION_DELETED: "session_deleted",

  SETTING_CHANGED: "setting_changed",
  FEATURE_USED: "feature_used",
  ERROR_OCCURRED: "error_occurred",

  USER_INTERACTION: "user_interaction",
  PERFORMANCE_METRIC: "performance_metric",
} as const;

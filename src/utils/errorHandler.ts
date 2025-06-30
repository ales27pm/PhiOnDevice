import { Alert } from "react-native";

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

export class ReasoningError extends Error {
  code: string;
  details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = "ReasoningError";
    this.code = code;
    this.details = details;
  }
}

export class NetworkError extends Error {
  code: string;
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "NetworkError";
    this.code = "NETWORK_ERROR";
    this.statusCode = statusCode;
  }
}

export class ValidationError extends Error {
  code: string;
  field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "ValidationError";
    this.code = "VALIDATION_ERROR";
    this.field = field;
  }
}

// Error codes for different types of failures
export const ERROR_CODES = {
  // Reasoning Engine Errors
  REASONING_FAILED: "REASONING_FAILED",
  INVALID_PROBLEM: "INVALID_PROBLEM",
  GENERATION_TIMEOUT: "GENERATION_TIMEOUT",
  STEP_GENERATION_FAILED: "STEP_GENERATION_FAILED",

  // State Management Errors
  STATE_PERSISTENCE_FAILED: "STATE_PERSISTENCE_FAILED",
  STATE_LOAD_FAILED: "STATE_LOAD_FAILED",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",

  // UI/UX Errors
  ANIMATION_FAILED: "ANIMATION_FAILED",
  RENDER_ERROR: "RENDER_ERROR",
  NAVIGATION_ERROR: "NAVIGATION_ERROR",

  // System Errors
  MEMORY_LIMIT_EXCEEDED: "MEMORY_LIMIT_EXCEEDED",
  PERFORMANCE_DEGRADED: "PERFORMANCE_DEGRADED",
  DEVICE_COMPATIBILITY: "DEVICE_COMPATIBILITY",

  // Network/API Errors
  NETWORK_UNAVAILABLE: "NETWORK_UNAVAILABLE",
  API_RATE_LIMITED: "API_RATE_LIMITED",
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
} as const;

// User-friendly error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.REASONING_FAILED]: {
    title: "Reasoning Error",
    message: "Failed to generate reasoning for this problem. Please try again or try a different problem.",
    actionable: true,
  },
  [ERROR_CODES.INVALID_PROBLEM]: {
    title: "Invalid Problem",
    message: "The problem format is not recognized. Please provide a clear mathematical problem.",
    actionable: true,
  },
  [ERROR_CODES.GENERATION_TIMEOUT]: {
    title: "Generation Timeout",
    message: "The reasoning process took too long. Please try a simpler problem or try again.",
    actionable: true,
  },
  [ERROR_CODES.STATE_PERSISTENCE_FAILED]: {
    title: "Save Error",
    message: "Failed to save your session. Your progress may be lost.",
    actionable: false,
  },
  [ERROR_CODES.MEMORY_LIMIT_EXCEEDED]: {
    title: "Memory Warning",
    message: "The app is using too much memory. Please close other apps and try again.",
    actionable: true,
  },
  [ERROR_CODES.NETWORK_UNAVAILABLE]: {
    title: "Network Error",
    message: "No internet connection available. Some features may be limited.",
    actionable: false,
  },
  [ERROR_CODES.DEVICE_COMPATIBILITY]: {
    title: "Device Compatibility",
    message: "Your device may not support all features of this app. Performance may be limited.",
    actionable: false,
  },
};

// Global error handler
export class ErrorHandler {
  private static errorLog: AppError[] = [];
  private static maxLogSize = 50;

  static logError(error: Error | AppError, context?: string): void {
    const appError: AppError = {
      code: error instanceof ReasoningError ? error.code : "UNKNOWN_ERROR",
      message: error.message,
      details: {
        context,
        stack: (error as Error).stack,
        timestamp: new Date().toISOString(),
      },
      timestamp: Date.now(),
    };

    // Add to error log
    this.errorLog.unshift(appError);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Log to console in development
    if (__DEV__) {
      console.error(`[${context || "App"}] Error:`, error);
    }

    // TODO: In production, send to crash reporting service
    // Example: Crashlytics.recordError(error);
  }

  static handleError(error: Error | AppError, context?: string, showAlert: boolean = true): void {
    this.logError(error, context);

    if (showAlert) {
      const errorCode = error instanceof ReasoningError ? error.code : "UNKNOWN_ERROR";
      const errorInfo = ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] || {
        title: "Unexpected Error",
        message: "An unexpected error occurred. Please try again.",
        actionable: true,
      };

      Alert.alert(errorInfo.title, errorInfo.message, [
        { text: "OK", style: "default" },
        ...(errorInfo.actionable ? [{ text: "Report Issue", onPress: () => this.reportIssue(error) }] : []),
      ]);
    }
  }

  static reportIssue(error: Error | AppError): void {
    // In production, this would open email client or bug report form
    if (__DEV__) {
      console.log("Bug report would be sent:", error);
    }

    Alert.alert("Report Issue", "Thank you for reporting this issue. Our team will investigate.", [
      { text: "OK", style: "default" },
    ]);
  }

  static getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  static clearErrorLog(): void {
    this.errorLog = [];
  }

  // Utility function for handling async operations with error boundaries
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    showAlert: boolean = true,
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error as Error, context, showAlert);
      return null;
    }
  }

  // Validation helpers
  static validateMathProblem(problem: string): void {
    if (!problem || problem.trim().length === 0) {
      throw new ValidationError("Problem cannot be empty", "problem");
    }

    if (problem.length > 1000) {
      throw new ValidationError("Problem is too long. Please keep it under 1000 characters.", "problem");
    }

    // Check for potentially harmful content
    const suspiciousPatterns = [/script/i, /eval/i, /function/i, /javascript/i];

    if (suspiciousPatterns.some((pattern) => pattern.test(problem))) {
      throw new ValidationError("Problem contains invalid characters or syntax.", "problem");
    }
  }

  // Performance monitoring
  static monitorPerformance<T>(operation: () => T, operationName: string, warningThreshold: number = 1000): T {
    const startTime = Date.now();

    try {
      const result = operation();
      const duration = Date.now() - startTime;

      if (duration > warningThreshold) {
        this.logError(
          new ReasoningError(
            ERROR_CODES.PERFORMANCE_DEGRADED,
            `Operation '${operationName}' took ${duration}ms (threshold: ${warningThreshold}ms)`,
          ),
          "PerformanceMonitor",
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logError(
        new ReasoningError(
          ERROR_CODES.REASONING_FAILED,
          `Operation '${operationName}' failed after ${duration}ms: ${(error as Error).message}`,
        ),
        "PerformanceMonitor",
      );
      throw error;
    }
  }

  // Memory monitoring
  static checkMemoryUsage(): void {
    // In a real React Native app, you'd use a native module to check memory
    // For now, we'll simulate memory monitoring
    if (__DEV__) {
      const memoryInfo = (performance as any)?.memory;
      if (memoryInfo) {
        const usedMemory = memoryInfo.usedJSHeapSize / 1024 / 1024; // MB
        const totalMemory = memoryInfo.totalJSHeapSize / 1024 / 1024; // MB

        if (usedMemory > 100) {
          // 100MB threshold
          this.logError(
            new ReasoningError(
              ERROR_CODES.MEMORY_LIMIT_EXCEEDED,
              `High memory usage detected: ${usedMemory.toFixed(1)}MB / ${totalMemory.toFixed(1)}MB`,
            ),
            "MemoryMonitor",
          );
        }
      }
    }
  }
}

import React from "react";

// React Error Boundary helper
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>,
) {
  return class ErrorBoundary extends React.Component<T, { hasError: boolean; error?: Error }> {
    constructor(props: T) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      ErrorHandler.logError(error, `ErrorBoundary: ${Component.name}`);
    }

    render() {
      if (this.state.hasError) {
        if (fallbackComponent) {
          const FallbackComponent = fallbackComponent;
          return React.createElement(FallbackComponent, {
            error: this.state.error!,
            retry: () => this.setState({ hasError: false, error: undefined }),
          });
        }

        return null; // Default fallback
      }

      return React.createElement(Component, this.props);
    }
  };
}

// Hook for error handling in functional components
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: string, showAlert: boolean = true) => {
    ErrorHandler.handleError(error, context, showAlert);
  }, []);

  const withErrorHandling = React.useCallback(
    async <T>(operation: () => Promise<T>, context: string, showAlert: boolean = true): Promise<T | null> => {
      return ErrorHandler.withErrorHandling(operation, context, showAlert);
    },
    [],
  );

  return { handleError, withErrorHandling };
}

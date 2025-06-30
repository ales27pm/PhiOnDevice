// Performance optimization utilities for Phi-4 Reasoning app

import { InteractionManager, Platform } from "react-native";
import { Analytics } from "./analytics";

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  operation: string;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private memoryWarningThreshold = 100 * 1024 * 1024; // 100MB
  private isMonitoring = false;

  startOperation(operationId: string, operationName: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetrics = {
      startTime: Date.now(),
      operation: operationName,
      metadata,
    };

    this.metrics.set(operationId, metric);

    if (__DEV__) {
      console.log(`⏱️ Started: ${operationName} (${operationId})`);
    }
  }

  endOperation(operationId: string): PerformanceMetrics | null {
    const metric = this.metrics.get(operationId);
    if (!metric) {
      console.warn(`Performance metric not found: ${operationId}`);
      return null;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;

    // Track slow operations
    if (metric.duration > 1000) {
      Analytics.trackPerformanceMetric("slow_operation", metric.duration, metric.operation);
    }

    if (__DEV__) {
      console.log(`⏱️ Completed: ${metric.operation} in ${metric.duration}ms`);
    }

    // Clean up
    this.metrics.delete(operationId);

    return metric;
  }

  // Memory management utilities
  checkMemoryUsage(): void {
    if (Platform.OS === "ios") {
      // On iOS, we can't directly access memory info from JS
      // In a real app, you'd use a native module
      return;
    }

    // For development/debugging
    if (__DEV__ && (global as any).performance?.memory) {
      const memory = (global as any).performance.memory;
      const usedMemory = memory.usedJSHeapSize;

      if (usedMemory > this.memoryWarningThreshold) {
        console.warn(`🚨 High memory usage: ${(usedMemory / 1024 / 1024).toFixed(1)}MB`);
        Analytics.trackPerformanceMetric("memory_warning", usedMemory, "memory_check");
      }
    }
  }

  // React Native specific optimizations
  runAfterInteractions<T>(callback: () => T): Promise<T> {
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        resolve(callback());
      });
    });
  }

  // Debounce utility for performance-sensitive operations
  debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  // Throttle utility for frequent operations
  throttle<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
    let isThrottled = false;

    return (...args: Parameters<T>) => {
      if (!isThrottled) {
        func(...args);
        isThrottled = true;
        setTimeout(() => {
          isThrottled = false;
        }, delay);
      }
    };
  }

  // Batch operations for better performance
  async batchOperations<T>(operations: Array<() => Promise<T>>, batchSize: number = 5): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((op) => op()));
      results.push(...batchResults);

      // Allow other operations to run between batches
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return results;
  }

  // Image optimization utilities
  getOptimalImageSize(containerWidth: number, containerHeight: number): { width: number; height: number } {
    // Get device pixel ratio for high-DPI displays
    const pixelRatio = require("react-native").PixelRatio.get();

    return {
      width: Math.ceil(containerWidth * pixelRatio),
      height: Math.ceil(containerHeight * pixelRatio),
    };
  }

  // Animation performance helpers
  getOptimalAnimationConfig(isReducedMotion: boolean) {
    return {
      duration: isReducedMotion ? 0 : 250,
      useNativeDriver: true,
      isInteraction: false, // Don't delay other interactions
    };
  }

  // List optimization helpers
  getItemLayout = (data: any[], index: number, itemHeight: number) => ({
    length: itemHeight,
    offset: itemHeight * index,
    index,
  });

  keyExtractor = (item: any, index: number) => {
    return item.id || item.key || index.toString();
  };

  // Startup performance monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Monitor memory periodically
    const memoryCheck = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Every 30 seconds

    // Cleanup on app background (would need app state listener)
    setTimeout(() => {
      clearInterval(memoryCheck);
      this.isMonitoring = false;
    }, 300000); // Stop after 5 minutes
  }

  // Bundle size and loading optimization
  measureBundleLoad(bundleName: string, loadFunction: () => Promise<any>): Promise<any> {
    const operationId = `bundle_load_${bundleName}`;
    this.startOperation(operationId, `Bundle Load: ${bundleName}`);

    return loadFunction()
      .then((result) => {
        const metric = this.endOperation(operationId);
        if (metric && metric.duration) {
          Analytics.trackPerformanceMetric("bundle_load_time", metric.duration, bundleName);
        }
        return result;
      })
      .catch((error) => {
        this.endOperation(operationId);
        throw error;
      });
  }

  // React component performance helpers
  shouldComponentUpdate(
    prevProps: Record<string, any>,
    nextProps: Record<string, any>,
    shallowCompare: boolean = true,
  ): boolean {
    if (shallowCompare) {
      return !this.shallowEqual(prevProps, nextProps);
    }
    return JSON.stringify(prevProps) !== JSON.stringify(nextProps);
  }

  private shallowEqual(obj1: Record<string, any>, obj2: Record<string, any>): boolean {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (let key of keys1) {
      if (obj1[key] !== obj2[key]) {
        return false;
      }
    }

    return true;
  }

  // Get performance summary
  getPerformanceSummary(): {
    activeOperations: number;
    memoryUsage?: number;
    platform: string;
  } {
    let memoryUsage: number | undefined;

    if (__DEV__ && (global as any).performance?.memory) {
      memoryUsage = (global as any).performance.memory.usedJSHeapSize;
    }

    return {
      activeOperations: this.metrics.size,
      memoryUsage,
      platform: Platform.OS,
    };
  }
}

// Singleton instance
export const Performance = new PerformanceMonitor();

import React from "react";

// React hooks for performance monitoring
export function usePerformanceMonitor() {
  const startOperation = React.useCallback(
    (operationId: string, operationName: string, metadata?: Record<string, any>) => {
      Performance.startOperation(operationId, operationName, metadata);
    },
    [],
  );

  const endOperation = React.useCallback((operationId: string) => {
    return Performance.endOperation(operationId);
  }, []);

  const runAfterInteractions = React.useCallback(<T>(callback: () => T): Promise<T> => {
    return Performance.runAfterInteractions(callback);
  }, []);

  return { startOperation, endOperation, runAfterInteractions };
}

// Higher-order component for performance monitoring
export function withPerformanceMonitoring<P extends object>(Component: React.ComponentType<P>, componentName: string) {
  return React.memo((props: P) => {
    const mountTime = React.useRef<number>(Date.now());

    React.useEffect(() => {
      const renderTime = Date.now() - mountTime.current;
      if (renderTime > 100) {
        // Log slow renders
        Analytics.trackPerformanceMetric("slow_render", renderTime, componentName);
      }
    }, []);

    return React.createElement(Component, props);
  });
}

// Utility functions for common optimizations
export const PerformanceUtils = {
  // Memoization helper
  memoize: <T extends (...args: any[]) => any>(fn: T): T => {
    const cache = new Map();

    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = JSON.stringify(args);

      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = fn(...args);
      cache.set(key, result);

      // Prevent memory leaks by limiting cache size
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      return result;
    }) as T;
  },

  // Deep clone optimization
  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as T;
    if (obj instanceof Array) return obj.map((item) => PerformanceUtils.deepClone(item)) as T;
    if (typeof obj === "object") {
      const clonedObj = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = PerformanceUtils.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    return obj;
  },

  // Efficient array operations
  findWithIndex: <T>(array: T[], predicate: (item: T) => boolean): [T | undefined, number] => {
    for (let i = 0; i < array.length; i++) {
      if (predicate(array[i])) {
        return [array[i], i];
      }
    }
    return [undefined, -1];
  },

  // String operations optimization
  truncateString: (str: string, maxLength: number, suffix: string = "..."): string => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
  },
};

// Start performance monitoring on module load
if (!__DEV__) {
  Performance.startMonitoring();
}

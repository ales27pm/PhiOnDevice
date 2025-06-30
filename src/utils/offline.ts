import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Analytics } from './analytics';

export interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface ConnectionState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  details: any;
}

class OfflineManager {
  private isConnected = true;
  private isInternetReachable: boolean | null = null;
  private connectionType = 'unknown';
  private listeners: Array<(state: ConnectionState) => void> = [];
  private offlineQueue: OfflineAction[] = [];
  private isProcessingQueue = false;

  constructor() {
    this.initializeNetworkMonitoring();
    this.loadOfflineQueue();
  }

  private async initializeNetworkMonitoring() {
    // Get initial network state
    const initialState = await NetInfo.fetch();
    this.updateConnectionState(initialState);

    // Listen for network changes
    NetInfo.addEventListener((state: NetInfoState) => {
      this.updateConnectionState(state);
    });
  }

  private updateConnectionState(state: NetInfoState) {
    const wasConnected = this.isConnected;
    
    this.isConnected = state.isConnected ?? false;
    this.isInternetReachable = state.isInternetReachable;
    this.connectionType = state.type;

    const connectionState: ConnectionState = {
      isConnected: this.isConnected,
      isInternetReachable: this.isInternetReachable,
      type: this.connectionType,
      details: state.details
    };

    // Notify listeners
    this.listeners.forEach(listener => listener(connectionState));

    // Track connectivity changes
    if (wasConnected !== this.isConnected) {
      Analytics.track('connectivity_changed', {
        connected: this.isConnected,
        type: this.connectionType,
        internet_reachable: this.isInternetReachable
      });

      if (this.isConnected && !wasConnected) {
        // Came back online - process offline queue
        this.processOfflineQueue();
      }
    }

    if (__DEV__) {
      console.log('🌐 Network state:', connectionState);
    }
  }

  // Public API
  getConnectionState(): ConnectionState {
    return {
      isConnected: this.isConnected,
      isInternetReachable: this.isInternetReachable,
      type: this.connectionType,
      details: null
    };
  }

  isOnline(): boolean {
    return this.isConnected && (this.isInternetReachable !== false);
  }

  isOffline(): boolean {
    return !this.isOnline();
  }

  addConnectionListener(listener: (state: ConnectionState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Offline queue management
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queuedAction: OfflineAction = {
      ...action,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.offlineQueue.push(queuedAction);
    await this.saveOfflineQueue();

    Analytics.track('action_queued_offline', {
      action_type: action.type,
      queue_size: this.offlineQueue.length
    });
  }

  async processOfflineQueue(): Promise<void> {
    if (this.isProcessingQueue || this.offlineQueue.length === 0 || this.isOffline()) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const actionsToProcess = [...this.offlineQueue];
      
      for (let i = 0; i < actionsToProcess.length; i++) {
        const action = actionsToProcess[i];
        
        try {
          await this.executeOfflineAction(action);
          
          // Remove successful action from queue
          this.offlineQueue = this.offlineQueue.filter(a => a.id !== action.id);
          
        } catch (error) {
          // Increment retry count
          const actionIndex = this.offlineQueue.findIndex(a => a.id === action.id);
          if (actionIndex > -1) {
            this.offlineQueue[actionIndex].retryCount++;
            
            // Remove if max retries exceeded
            if (this.offlineQueue[actionIndex].retryCount >= action.maxRetries) {
              this.offlineQueue.splice(actionIndex, 1);
              
              Analytics.track('offline_action_failed', {
                action_type: action.type,
                retry_count: action.retryCount,
                error: (error as Error).message
              });
            }
          }
        }
      }

      await this.saveOfflineQueue();

    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    // This would be implemented based on your specific action types
    // For now, we'll just simulate processing
    
    switch (action.type) {
      case 'analytics_event':
        // Send queued analytics events
        console.log('Processing offline analytics event:', action.data);
        break;
        
      case 'user_feedback':
        // Send queued user feedback
        console.log('Processing offline user feedback:', action.data);
        break;
        
      default:
        console.warn('Unknown offline action type:', action.type);
    }
  }

  private async saveOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private async loadOfflineQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('offline_queue');
      if (queueData) {
        this.offlineQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.offlineQueue = [];
    }
  }

  // Get offline queue status
  getOfflineQueueStatus(): {
    queueSize: number;
    oldestAction?: Date;
    isProcessing: boolean;
  } {
    const oldestAction = this.offlineQueue.length > 0 
      ? new Date(Math.min(...this.offlineQueue.map(a => a.timestamp)))
      : undefined;

    return {
      queueSize: this.offlineQueue.length,
      oldestAction,
      isProcessing: this.isProcessingQueue
    };
  }

  // Clear offline queue (for debugging/reset)
  async clearOfflineQueue(): Promise<void> {
    this.offlineQueue = [];
    await this.saveOfflineQueue();
  }
}

// Singleton instance
export const OfflineManager = new OfflineManager();

// React hook for offline state
export function useOfflineStatus() {
  const React = require('react');
  const [connectionState, setConnectionState] = React.useState<ConnectionState>(
    OfflineManager.getConnectionState()
  );
  const [queueStatus, setQueueStatus] = React.useState(
    OfflineManager.getOfflineQueueStatus()
  );

  React.useEffect(() => {
    const unsubscribe = OfflineManager.addConnectionListener((state) => {
      setConnectionState(state);
      setQueueStatus(OfflineManager.getOfflineQueueStatus());
    });

    // Update queue status periodically
    const interval = setInterval(() => {
      setQueueStatus(OfflineManager.getOfflineQueueStatus());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const queueAction = React.useCallback(async (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => {
    await OfflineManager.queueAction(action);
    setQueueStatus(OfflineManager.getOfflineQueueStatus());
  }, []);

  return {
    isOnline: connectionState.isConnected && (connectionState.isInternetReachable !== false),
    isOffline: !connectionState.isConnected || connectionState.isInternetReachable === false,
    connectionType: connectionState.type,
    queueSize: queueStatus.queueSize,
    isProcessingQueue: queueStatus.isProcessing,
    queueAction
  };
}

// Network-aware fetch wrapper
export async function networkAwareFetch(
  url: string,
  options: RequestInit = {},
  offlineAction?: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>
): Promise<Response> {
  if (OfflineManager.isOffline()) {
    if (offlineAction) {
      await OfflineManager.queueAction(offlineAction);
      throw new Error('Request queued for when connection is restored');
    }
    throw new Error('No internet connection available');
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    // If network error and offline action provided, queue it
    if (offlineAction && (error as Error).message.includes('network')) {
      await OfflineManager.queueAction(offlineAction);
    }
    throw error;
  }
}

// Offline-first data storage
export class OfflineStorage {
  private storageKey: string;

  constructor(key: string) {
    this.storageKey = `offline_${key}`;
  }

  async get<T>(fallback?: T): Promise<T | undefined> {
    try {
      const data = await AsyncStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : fallback;
    } catch (error) {
      console.error(`Failed to get offline data for ${this.storageKey}:`, error);
      return fallback;
    }
  }

  async set<T>(data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to set offline data for ${this.storageKey}:`, error);
    }
  }

  async remove(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error(`Failed to remove offline data for ${this.storageKey}:`, error);
    }
  }

  async update<T>(updater: (current: T | undefined) => T): Promise<void> {
    const current = await this.get<T>();
    const updated = updater(current);
    await this.set(updated);
  }
}

// Offline-aware component wrapper
export function withOfflineSupport<P extends object>(
  Component: React.ComponentType<P>,
  offlineMessage: string = 'This feature requires an internet connection'
) {
  const React = require('react');
  
  return function OfflineWrapper(props: P) {
    const { isOffline } = useOfflineStatus();
    
    if (isOffline) {
      return React.createElement('div', {
        style: {
          padding: 16,
          textAlign: 'center',
          color: '#666',
          fontStyle: 'italic'
        }
      }, offlineMessage);
    }
    
    return React.createElement(Component, props);
  };
}
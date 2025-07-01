import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import { contextService } from './ContextService';
import { proactiveConditionsService } from './ProactiveConditionsService';

// Task name for the background proactive agent
const PROACTIVE_AGENT_TASK = 'proactive-agent-background-task';

/**
 * Background Task Service for Proactive Agency
 * 
 * Manages background tasks that run periodically to gather context
 * and generate proactive notifications for the user.
 */
export class BackgroundTaskService {
  private static instance: BackgroundTaskService;
  private isRegistered = false;
  private isRunning = false;

  private constructor() {
    this.setupNotificationHandler();
  }

  static getInstance(): BackgroundTaskService {
    if (!BackgroundTaskService.instance) {
      BackgroundTaskService.instance = new BackgroundTaskService();
    }
    return BackgroundTaskService.instance;
  }

  /**
   * Setup notification handler for better user experience
   */
  private setupNotificationHandler(): void {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  /**
   * Initialize the background task service
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('BackgroundTaskService: Initializing...');

      // Initialize dependencies
      await contextService.initialize();

      // Register the background task
      await this.registerBackgroundTask();

      // Start the background fetch
      await this.startBackgroundFetch();

      console.log('BackgroundTaskService: Initialized successfully');
      return true;
    } catch (error) {
      console.error('BackgroundTaskService: Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Register the background task with TaskManager
   */
  private async registerBackgroundTask(): Promise<void> {
    if (this.isRegistered) {
      console.log('BackgroundTaskService: Task already registered');
      return;
    }

    try {
      // Define the background task
      TaskManager.defineTask(PROACTIVE_AGENT_TASK, async () => {
        console.log('🤖 Proactive Agent: Background task executing...');
        
        try {
          // Gather context from various sources
          const context = await contextService.gatherContext();
          
          // Evaluate proactive conditions
          const alerts = await proactiveConditionsService.evaluateConditions(context);
          
          // Send notifications for triggered alerts
          for (const alert of alerts) {
            await this.sendProactiveNotification(alert);
          }

          console.log(`🤖 Proactive Agent: Task completed - ${alerts.length} alerts generated`);
          
          // Return success status
          return alerts.length > 0 
            ? BackgroundFetch.BackgroundFetchResult.NewData 
            : BackgroundFetch.BackgroundFetchResult.NoData;
            
        } catch (error) {
          console.error('🤖 Proactive Agent: Task execution error:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      this.isRegistered = true;
      console.log('BackgroundTaskService: Task registered successfully');
    } catch (error) {
      console.error('BackgroundTaskService: Failed to register task:', error);
      throw error;
    }
  }

  /**
   * Start background fetch with the registered task
   */
  private async startBackgroundFetch(): Promise<void> {
    try {
      // Check if background fetch is available
      const status = await BackgroundFetch.getStatusAsync();
      console.log('BackgroundTaskService: Background fetch status:', status);

      if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || 
          status === BackgroundFetch.BackgroundFetchStatus.Denied) {
        console.warn('BackgroundTaskService: Background fetch is restricted or denied');
        return;
      }

      // Register background fetch with our task
      await BackgroundFetch.registerTaskAsync(PROACTIVE_AGENT_TASK, {
        minimumInterval: 60 * 60, // 1 hour (in seconds)
        stopOnTerminate: false,
        startOnBoot: true,
      });

      this.isRunning = true;
      console.log('BackgroundTaskService: Background fetch started (1 hour interval)');
    } catch (error) {
      console.error('BackgroundTaskService: Failed to start background fetch:', error);
      throw error;
    }
  }

  /**
   * Stop background fetch
   */
  async stopBackgroundFetch(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(PROACTIVE_AGENT_TASK);
      this.isRunning = false;
      console.log('BackgroundTaskService: Background fetch stopped');
    } catch (error) {
      console.error('BackgroundTaskService: Failed to stop background fetch:', error);
    }
  }

  /**
   * Send a proactive notification to the user
   */
  private async sendProactiveNotification(alert: any): Promise<void> {
    try {
      // Check if we can send notifications
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) {
        console.warn('BackgroundTaskService: Notification permission not granted');
        return;
      }

      // Schedule the notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: alert.title,
          body: alert.body,
          sound: alert.priority === 'high' ? 'default' : undefined,
          badge: 1,
          data: {
            proactiveAlert: true,
            alertId: alert.id,
            priority: alert.priority,
            actionable: alert.actionable,
            metadata: alert.metadata,
          },
        },
        trigger: null, // Send immediately
      });

      console.log(`📱 Notification sent: ${alert.title}`);
    } catch (error) {
      console.error('BackgroundTaskService: Failed to send notification:', error);
    }
  }

  /**
   * Run proactive agent manually (for testing)
   */
  async runProactiveAgent(): Promise<void> {
    console.log('🤖 Proactive Agent: Manual execution started...');
    
    try {
      // Gather context
      const context = await contextService.gatherContext();
      console.log('Context gathered:', {
        events: context.upcomingEvents.length,
        weather: !!context.weather,
        location: !!context.location,
      });
      
      // Evaluate conditions
      const alerts = await proactiveConditionsService.evaluateConditions(context);
      console.log(`Generated ${alerts.length} alerts:`, alerts.map(a => a.title));
      
      // Send notifications
      for (const alert of alerts) {
        await this.sendProactiveNotification(alert);
      }

      console.log('🤖 Proactive Agent: Manual execution completed');
    } catch (error) {
      console.error('🤖 Proactive Agent: Manual execution error:', error);
    }
  }

  /**
   * Get the current status of the background task
   */
  async getStatus(): Promise<{
    isRegistered: boolean;
    isRunning: boolean;
    backgroundFetchStatus: string;
    lastExecution?: Date;
  }> {
    const backgroundFetchStatus = await BackgroundFetch.getStatusAsync();
    
    return {
      isRegistered: this.isRegistered,
      isRunning: this.isRunning,
      backgroundFetchStatus: this.getStatusString(backgroundFetchStatus),
    };
  }

  /**
   * Convert background fetch status to readable string
   */
  private getStatusString(status: BackgroundFetch.BackgroundFetchStatus): string {
    switch (status) {
      case BackgroundFetch.BackgroundFetchStatus.Available:
        return 'Available';
      case BackgroundFetch.BackgroundFetchStatus.Denied:
        return 'Denied';
      case BackgroundFetch.BackgroundFetchStatus.Restricted:
        return 'Restricted';
      default:
        return 'Unknown';
    }
  }

  /**
   * Test the proactive conditions with mock data
   */
  async testProactiveConditions(): Promise<void> {
    console.log('🧪 Testing proactive conditions...');
    
    // Create mock context data for testing
    const mockContext = {
      upcomingEvents: [
        {
          id: 'test-1',
          title: 'Client Presentation',
          startDate: new Date(Date.now() + 90 * 60 * 1000), // 1.5 hours from now
          endDate: new Date(Date.now() + 150 * 60 * 1000),
          location: 'Downtown Office',
          notes: 'Important client demo',
        },
      ],
      weather: {
        temperature: 45,
        condition: 'rainy',
        precipitation: 75,
        description: 'Heavy rain expected',
        humidity: 85,
        windSpeed: 12,
      },
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        city: 'San Francisco',
      },
      timestamp: new Date(),
    };

    // Evaluate conditions with mock data
    const alerts = await proactiveConditionsService.evaluateConditions(mockContext);
    console.log(`🧪 Test generated ${alerts.length} alerts:`, alerts);

    // Send test notifications
    for (const alert of alerts) {
      await this.sendProactiveNotification(alert);
    }
  }

  /**
   * Check if background tasks are supported
   */
  async isSupported(): Promise<boolean> {
    return await TaskManager.isAvailableAsync();
  }
}

export const backgroundTaskService = BackgroundTaskService.getInstance();
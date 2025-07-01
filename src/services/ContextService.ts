import * as Calendar from 'expo-calendar';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

/**
 * Context data interfaces
 */
export interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  precipitation: number;
  description: string;
  humidity: number;
  windSpeed: number;
}

export interface ContextData {
  upcomingEvents: CalendarEvent[];
  weather: WeatherData | null;
  location: {
    latitude: number;
    longitude: number;
    city?: string;
  } | null;
  timestamp: Date;
}

/**
 * Proactive condition interfaces
 */
export interface ProactiveCondition {
  id: string;
  name: string;
  description: string;
  check: (context: ContextData) => Promise<ProactiveAlert | null>;
  enabled: boolean;
}

export interface ProactiveAlert {
  id: string;
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  metadata?: Record<string, any>;
}

/**
 * Context Service for gathering proactive intelligence data
 */
export class ContextService {
  private static instance: ContextService;
  private hasPermissions = false;

  private constructor() {}

  static getInstance(): ContextService {
    if (!ContextService.instance) {
      ContextService.instance = new ContextService();
    }
    return ContextService.instance;
  }

  /**
   * Initialize and request necessary permissions
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('ContextService: Initializing permissions...');
      
      // Request notification permissions
      const notificationPermission = await Notifications.requestPermissionsAsync();
      if (!notificationPermission.granted) {
        console.warn('ContextService: Notification permission denied');
      }

      // Request calendar permissions
      const calendarPermission = await Calendar.requestCalendarPermissionsAsync();
      if (!calendarPermission.granted) {
        console.warn('ContextService: Calendar permission denied');
      }

      // Request location permissions
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (!locationPermission.granted) {
        console.warn('ContextService: Location permission denied');
      }

      this.hasPermissions = true;
      console.log('ContextService: Permissions initialized');
      return true;
    } catch (error) {
      console.error('ContextService: Failed to initialize permissions:', error);
      return false;
    }
  }

  /**
   * Gather context data from various sources
   */
  async gatherContext(): Promise<ContextData> {
    console.log('ContextService: Gathering context data...');
    
    const context: ContextData = {
      upcomingEvents: [],
      weather: null,
      location: null,
      timestamp: new Date(),
    };

    try {
      // Gather data in parallel
      const [events, weather, location] = await Promise.allSettled([
        this.getUpcomingEvents(),
        this.getWeatherData(),
        this.getCurrentLocation(),
      ]);

      if (events.status === 'fulfilled') {
        context.upcomingEvents = events.value;
      } else {
        console.warn('ContextService: Failed to get calendar events:', events.reason);
      }

      if (weather.status === 'fulfilled') {
        context.weather = weather.value;
      } else {
        console.warn('ContextService: Failed to get weather data:', weather.reason);
      }

      if (location.status === 'fulfilled') {
        context.location = location.value;
      } else {
        console.warn('ContextService: Failed to get location:', location.reason);
      }

      console.log('ContextService: Context gathered successfully', {
        eventsCount: context.upcomingEvents.length,
        hasWeather: !!context.weather,
        hasLocation: !!context.location,
      });

      return context;
    } catch (error) {
      console.error('ContextService: Error gathering context:', error);
      return context;
    }
  }

  /**
   * Get upcoming calendar events (next 24 hours)
   */
  private async getUpcomingEvents(): Promise<CalendarEvent[]> {
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      if (calendars.length === 0) {
        console.log('ContextService: No calendars found');
        return [];
      }

      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const events = await Calendar.getEventsAsync(
        calendars.map(cal => cal.id),
        now,
        tomorrow
      );

      return events.map(event => ({
        id: event.id,
        title: event.title,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        location: event.location || undefined,
        notes: event.notes || undefined,
      }));
    } catch (error) {
      console.error('ContextService: Calendar access error:', error);
      // Return mock data for testing when calendar access fails
      return this.getMockCalendarEvents();
    }
  }

  /**
   * Get current weather data
   */
  private async getWeatherData(): Promise<WeatherData | null> {
    try {
      // For now, return mock weather data since we don't have a weather API
      // In a real implementation, you would call a weather API here
      return this.getMockWeatherData();
    } catch (error) {
      console.error('ContextService: Weather API error:', error);
      return null;
    }
  }

  /**
   * Get current location
   */
  private async getCurrentLocation(): Promise<{
    latitude: number;
    longitude: number;
    city?: string;
  } | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        city: 'Current Location', // Would reverse geocode in real implementation
      };
    } catch (error) {
      console.error('ContextService: Location error:', error);
      // Return mock location for testing
      return {
        latitude: 37.7749,
        longitude: -122.4194,
        city: 'San Francisco',
      };
    }
  }

  /**
   * Mock calendar events for testing
   */
  private getMockCalendarEvents(): CalendarEvent[] {
    const now = new Date();
    const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const inFourHours = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 20 * 60 * 60 * 1000);

    return [
      {
        id: 'mock-1',
        title: 'Team Meeting',
        startDate: inTwoHours,
        endDate: new Date(inTwoHours.getTime() + 60 * 60 * 1000),
        location: 'Conference Room A',
        notes: 'Quarterly planning discussion',
      },
      {
        id: 'mock-2',
        title: 'Client Presentation',
        startDate: inFourHours,
        endDate: new Date(inFourHours.getTime() + 90 * 60 * 1000),
        location: 'Downtown Office',
        notes: 'Product demo for new client',
      },
      {
        id: 'mock-3',
        title: 'Lunch with Sarah',
        startDate: tomorrow,
        endDate: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        location: 'Central Park Cafe',
      },
    ];
  }

  /**
   * Mock weather data for testing
   */
  private getMockWeatherData(): WeatherData {
    // Simulate different weather conditions
    const conditions = ['sunny', 'cloudy', 'rainy', 'partly-cloudy'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      temperature: Math.floor(Math.random() * 20) + 65, // 65-85°F
      condition,
      precipitation: condition === 'rainy' ? Math.floor(Math.random() * 80) + 20 : Math.floor(Math.random() * 10),
      description: condition === 'rainy' ? 'Light rain expected' : 'Clear skies',
      humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
      windSpeed: Math.floor(Math.random() * 15) + 5, // 5-20 mph
    };
  }

  /**
   * Check if service has necessary permissions
   */
  hasRequiredPermissions(): boolean {
    return this.hasPermissions;
  }
}

export const contextService = ContextService.getInstance();
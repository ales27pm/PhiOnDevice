import { ContextData, ProactiveCondition, ProactiveAlert } from './ContextService';

/**
 * Proactive Conditions Service
 * 
 * Defines intelligent conditions that trigger proactive notifications
 */
export class ProactiveConditionsService {
  private static instance: ProactiveConditionsService;
  private conditions: ProactiveCondition[] = [];

  private constructor() {
    this.initializeConditions();
  }

  static getInstance(): ProactiveConditionsService {
    if (!ProactiveConditionsService.instance) {
      ProactiveConditionsService.instance = new ProactiveConditionsService();
    }
    return ProactiveConditionsService.instance;
  }

  /**
   * Initialize built-in proactive conditions
   */
  private initializeConditions(): void {
    this.conditions = [
      {
        id: 'weather-before-meeting',
        name: 'Weather Alert Before Meetings',
        description: 'Notify about weather conditions before outdoor meetings',
        enabled: true,
        check: this.checkWeatherBeforeMeeting.bind(this),
      },
      {
        id: 'meeting-preparation',
        name: 'Meeting Preparation Reminder',
        description: 'Remind to prepare for important meetings',
        enabled: true,
        check: this.checkMeetingPreparation.bind(this),
      },
      {
        id: 'travel-time-alert',
        name: 'Travel Time Alert',
        description: 'Alert about travel time to meetings with locations',
        enabled: true,
        check: this.checkTravelTime.bind(this),
      },
      {
        id: 'weather-clothing-suggestion',
        name: 'Weather Clothing Suggestion',
        description: 'Suggest appropriate clothing based on weather',
        enabled: true,
        check: this.checkClothingSuggestion.bind(this),
      },
      {
        id: 'back-to-back-meetings',
        name: 'Back-to-Back Meeting Alert',
        description: 'Alert about consecutive meetings without breaks',
        enabled: true,
        check: this.checkBackToBackMeetings.bind(this),
      },
    ];

    console.log(`ProactiveConditionsService: Initialized ${this.conditions.length} conditions`);
  }

  /**
   * Evaluate all enabled conditions against current context
   */
  async evaluateConditions(context: ContextData): Promise<ProactiveAlert[]> {
    console.log('ProactiveConditionsService: Evaluating conditions...');
    
    const alerts: ProactiveAlert[] = [];
    const enabledConditions = this.conditions.filter(c => c.enabled);

    for (const condition of enabledConditions) {
      try {
        console.log(`Checking condition: ${condition.name}`);
        const alert = await condition.check(context);
        if (alert) {
          alerts.push(alert);
          console.log(`✅ Condition triggered: ${condition.name} -> ${alert.title}`);
        }
      } catch (error) {
        console.error(`❌ Error checking condition ${condition.name}:`, error);
      }
    }

    console.log(`ProactiveConditionsService: Generated ${alerts.length} alerts`);
    return alerts;
  }

  /**
   * Check for weather conditions before meetings
   */
  private async checkWeatherBeforeMeeting(context: ContextData): Promise<ProactiveAlert | null> {
    if (!context.weather || context.upcomingEvents.length === 0) {
      return null;
    }

    const now = new Date();
    const nextTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Find meetings in the next 2 hours with outdoor locations or high precipitation
    const upcomingMeetings = context.upcomingEvents.filter(event => 
      event.startDate <= nextTwoHours && 
      event.startDate > now &&
      (event.location || context.weather!.precipitation > 50)
    );

    if (upcomingMeetings.length === 0) {
      return null;
    }

    const meeting = upcomingMeetings[0];
    const weather = context.weather;

    // Check for rain before meeting
    if (weather.precipitation > 50) {
      return {
        id: `weather-meeting-${meeting.id}`,
        title: '🌧️ Rain Expected Before Meeting',
        body: `${weather.description} before "${meeting.title}" at ${meeting.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Consider bringing an umbrella!`,
        priority: 'medium',
        actionable: true,
        metadata: {
          meetingId: meeting.id,
          weatherCondition: weather.condition,
          precipitation: weather.precipitation,
        },
      };
    }

    // Check for extreme temperatures
    if (weather.temperature > 85 || weather.temperature < 40) {
      const tempWarning = weather.temperature > 85 ? 'very hot' : 'very cold';
      return {
        id: `temp-meeting-${meeting.id}`,
        title: `🌡️ ${weather.temperature > 85 ? 'Hot' : 'Cold'} Weather Alert`,
        body: `It's ${tempWarning} (${weather.temperature}°F) for "${meeting.title}". Dress appropriately!`,
        priority: 'low',
        actionable: true,
        metadata: {
          meetingId: meeting.id,
          temperature: weather.temperature,
        },
      };
    }

    return null;
  }

  /**
   * Check for meeting preparation needs
   */
  private async checkMeetingPreparation(context: ContextData): Promise<ProactiveAlert | null> {
    if (context.upcomingEvents.length === 0) {
      return null;
    }

    const now = new Date();
    const next30Minutes = new Date(now.getTime() + 30 * 60 * 1000);

    // Find important meetings in the next 30 minutes
    const importantMeetings = context.upcomingEvents.filter(event => {
      const isWithin30Min = event.startDate <= next30Minutes && event.startDate > now;
      const hasImportantKeywords = event.title.toLowerCase().includes('client') ||
                                  event.title.toLowerCase().includes('presentation') ||
                                  event.title.toLowerCase().includes('interview') ||
                                  event.title.toLowerCase().includes('demo');
      
      return isWithin30Min && hasImportantKeywords;
    });

    if (importantMeetings.length === 0) {
      return null;
    }

    const meeting = importantMeetings[0];
    return {
      id: `prep-${meeting.id}`,
      title: '📋 Meeting Preparation Reminder',
      body: `"${meeting.title}" starts in ${Math.round((meeting.startDate.getTime() - now.getTime()) / (60 * 1000))} minutes. Ready to go?`,
      priority: 'high',
      actionable: true,
      metadata: {
        meetingId: meeting.id,
        timeUntilMeeting: meeting.startDate.getTime() - now.getTime(),
      },
    };
  }

  /**
   * Check for travel time to meetings
   */
  private async checkTravelTime(context: ContextData): Promise<ProactiveAlert | null> {
    if (context.upcomingEvents.length === 0) {
      return null;
    }

    const now = new Date();
    const next45Minutes = new Date(now.getTime() + 45 * 60 * 1000);

    // Find meetings with locations in the next 45 minutes
    const meetingsWithLocation = context.upcomingEvents.filter(event => 
      event.location && 
      event.startDate <= next45Minutes && 
      event.startDate > now
    );

    if (meetingsWithLocation.length === 0) {
      return null;
    }

    const meeting = meetingsWithLocation[0];
    const minutesUntilMeeting = Math.round((meeting.startDate.getTime() - now.getTime()) / (60 * 1000));

    // Estimate travel time based on location (simplified)
    const estimatedTravelTime = this.estimateTravelTime(meeting.location!);

    if (minutesUntilMeeting <= estimatedTravelTime + 10) { // 10 min buffer
      return {
        id: `travel-${meeting.id}`,
        title: '🚗 Time to Leave for Meeting',
        body: `"${meeting.title}" at ${meeting.location} starts in ${minutesUntilMeeting} minutes. Estimated travel time: ${estimatedTravelTime} minutes.`,
        priority: 'high',
        actionable: true,
        metadata: {
          meetingId: meeting.id,
          location: meeting.location,
          estimatedTravelTime,
        },
      };
    }

    return null;
  }

  /**
   * Check for clothing suggestions based on weather
   */
  private async checkClothingSuggestion(context: ContextData): Promise<ProactiveAlert | null> {
    if (!context.weather) {
      return null;
    }

    const weather = context.weather;
    const now = new Date();
    const morning = now.getHours() >= 6 && now.getHours() <= 9;

    // Only suggest clothing in the morning
    if (!morning) {
      return null;
    }

    let suggestion = '';
    let icon = '👔';

    if (weather.temperature < 50) {
      suggestion = 'Bundle up! Coat and warm layers recommended.';
      icon = '🧥';
    } else if (weather.temperature > 80) {
      suggestion = 'Light clothing recommended. Stay cool!';
      icon = '👕';
    } else if (weather.precipitation > 30) {
      suggestion = 'Bring an umbrella or rain jacket.';
      icon = '☂️';
    } else if (weather.humidity > 70) {
      suggestion = 'Breathable fabrics recommended - high humidity today.';
      icon = '🌡️';
    }

    if (suggestion) {
      return {
        id: `clothing-${now.toDateString()}`,
        title: `${icon} Daily Clothing Suggestion`,
        body: `${weather.temperature}°F, ${weather.condition}. ${suggestion}`,
        priority: 'low',
        actionable: false,
        metadata: {
          weather: weather,
          suggestionType: 'clothing',
        },
      };
    }

    return null;
  }

  /**
   * Check for back-to-back meetings without breaks
   */
  private async checkBackToBackMeetings(context: ContextData): Promise<ProactiveAlert | null> {
    if (context.upcomingEvents.length < 2) {
      return null;
    }

    const now = new Date();
    const next3Hours = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    // Get meetings in the next 3 hours, sorted by start time
    const upcomingMeetings = context.upcomingEvents
      .filter(event => event.startDate <= next3Hours && event.startDate > now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    // Check for consecutive meetings with less than 15 minutes between them
    for (let i = 0; i < upcomingMeetings.length - 1; i++) {
      const currentMeeting = upcomingMeetings[i];
      const nextMeeting = upcomingMeetings[i + 1];
      
      const gap = nextMeeting.startDate.getTime() - currentMeeting.endDate.getTime();
      const gapMinutes = gap / (60 * 1000);

      if (gapMinutes < 15 && gapMinutes >= 0) {
        return {
          id: `back-to-back-${currentMeeting.id}-${nextMeeting.id}`,
          title: '⏰ Back-to-Back Meetings Alert',
          body: `Only ${Math.round(gapMinutes)} minutes between "${currentMeeting.title}" and "${nextMeeting.title}". Consider a quick break!`,
          priority: 'medium',
          actionable: true,
          metadata: {
            firstMeetingId: currentMeeting.id,
            secondMeetingId: nextMeeting.id,
            gapMinutes,
          },
        };
      }
    }

    return null;
  }

  /**
   * Simple travel time estimation
   */
  private estimateTravelTime(location: string): number {
    // Simplified travel time estimation
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('downtown') || locationLower.includes('city')) {
      return 25; // 25 minutes for downtown locations
    } else if (locationLower.includes('conference room') || locationLower.includes('office')) {
      return 5; // 5 minutes for office locations
    } else if (locationLower.includes('airport')) {
      return 45; // 45 minutes for airport
    } else {
      return 15; // Default 15 minutes
    }
  }

  /**
   * Get all conditions
   */
  getConditions(): ProactiveCondition[] {
    return [...this.conditions];
  }

  /**
   * Enable/disable a condition
   */
  setConditionEnabled(conditionId: string, enabled: boolean): void {
    const condition = this.conditions.find(c => c.id === conditionId);
    if (condition) {
      condition.enabled = enabled;
      console.log(`ProactiveConditionsService: ${condition.name} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Add a custom condition
   */
  addCondition(condition: ProactiveCondition): void {
    this.conditions.push(condition);
    console.log(`ProactiveConditionsService: Added custom condition: ${condition.name}`);
  }
}

export const proactiveConditionsService = ProactiveConditionsService.getInstance();
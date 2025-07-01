import { contextService } from '../ContextService';
import { proactiveConditionsService } from '../ProactiveConditionsService';
import { backgroundTaskService } from '../BackgroundTaskService';

/**
 * Test proactive agent functionality
 */
export async function testProactiveAgent(): Promise<void> {
  console.log('🤖 Testing Proactive Agent functionality...');
  
  try {
    console.log('Test 1: Initialize Context Service');
    const contextInitialized = await contextService.initialize();
    console.log('✅ Context service initialized:', contextInitialized);
    
    console.log('Test 2: Gather Context Data');
    const context = await contextService.gatherContext();
    console.log('✅ Context gathered:', {
      events: context.upcomingEvents.length,
      weather: !!context.weather,
      location: !!context.location,
      timestamp: context.timestamp,
    });
    
    console.log('Test 3: Get Proactive Conditions');
    const conditions = proactiveConditionsService.getConditions();
    console.log('✅ Available conditions:', conditions.map(c => ({
      name: c.name,
      enabled: c.enabled,
    })));
    
    console.log('Test 4: Evaluate Conditions');
    const alerts = await proactiveConditionsService.evaluateConditions(context);
    console.log('✅ Generated alerts:', alerts.map(a => ({
      title: a.title,
      priority: a.priority,
    })));
    
    console.log('Test 5: Check Background Task Support');
    const isSupported = await backgroundTaskService.isSupported();
    console.log('✅ Background tasks supported:', isSupported);
    
    console.log('Test 6: Get Service Status');
    const status = await backgroundTaskService.getStatus();
    console.log('✅ Service status:', status);
    
    console.log('🎉 All Proactive Agent tests passed!');
  } catch (error) {
    console.error('❌ Proactive Agent test failed:', error);
    throw error;
  }
}

/**
 * Test specific proactive conditions with mock scenarios
 */
export async function testProactiveConditions(): Promise<void> {
  console.log('🧪 Testing Proactive Conditions with mock scenarios...');
  
  try {
    // Scenario 1: Rain before outdoor meeting
    console.log('Scenario 1: Rain before outdoor meeting');
    const rainyContext = {
      upcomingEvents: [
        {
          id: 'test-outdoor-meeting',
          title: 'Lunch Meeting',
          startDate: new Date(Date.now() + 90 * 60 * 1000), // 1.5 hours from now
          endDate: new Date(Date.now() + 150 * 60 * 1000),
          location: 'Central Park Cafe',
          notes: 'Outdoor dining',
        },
      ],
      weather: {
        temperature: 72,
        condition: 'rainy',
        precipitation: 80,
        description: 'Heavy rain expected',
        humidity: 85,
        windSpeed: 15,
      },
      location: {
        latitude: 40.7829,
        longitude: -73.9654,
        city: 'New York',
      },
      timestamp: new Date(),
    };
    
    const rainyAlerts = await proactiveConditionsService.evaluateConditions(rainyContext);
    console.log('✅ Rain scenario alerts:', rainyAlerts.map(a => a.title));
    
    // Scenario 2: Back-to-back meetings
    console.log('Scenario 2: Back-to-back meetings');
    const busyContext = {
      upcomingEvents: [
        {
          id: 'meeting-1',
          title: 'Team Standup',
          startDate: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
          endDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          location: 'Conference Room A',
        },
        {
          id: 'meeting-2',
          title: 'Client Call',
          startDate: new Date(Date.now() + 65 * 60 * 1000), // 1 hour 5 min from now
          endDate: new Date(Date.now() + 125 * 60 * 1000), // 2 hours 5 min from now
          location: 'Phone',
        },
      ],
      weather: {
        temperature: 75,
        condition: 'sunny',
        precipitation: 0,
        description: 'Clear skies',
        humidity: 60,
        windSpeed: 8,
      },
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        city: 'San Francisco',
      },
      timestamp: new Date(),
    };
    
    const busyAlerts = await proactiveConditionsService.evaluateConditions(busyContext);
    console.log('✅ Busy schedule alerts:', busyAlerts.map(a => a.title));
    
    // Scenario 3: Important meeting preparation
    console.log('Scenario 3: Important meeting preparation');
    const importantMeetingContext = {
      upcomingEvents: [
        {
          id: 'important-presentation',
          title: 'Client Presentation - Q4 Results',
          startDate: new Date(Date.now() + 25 * 60 * 1000), // 25 min from now
          endDate: new Date(Date.now() + 85 * 60 * 1000),
          location: 'Downtown Office',
          notes: 'Board members attending',
        },
      ],
      weather: {
        temperature: 68,
        condition: 'cloudy',
        precipitation: 10,
        description: 'Partly cloudy',
        humidity: 55,
        windSpeed: 12,
      },
      location: {
        latitude: 34.0522,
        longitude: -118.2437,
        city: 'Los Angeles',
      },
      timestamp: new Date(),
    };
    
    const importantAlerts = await proactiveConditionsService.evaluateConditions(importantMeetingContext);
    console.log('✅ Important meeting alerts:', importantAlerts.map(a => a.title));
    
    console.log('🎉 All scenario tests completed!');
  } catch (error) {
    console.error('❌ Proactive conditions test failed:', error);
    throw error;
  }
}

/**
 * Test condition toggling
 */
export async function testConditionManagement(): Promise<void> {
  console.log('🧪 Testing condition management...');
  
  try {
    const conditions = proactiveConditionsService.getConditions();
    console.log('Initial conditions:', conditions.map(c => `${c.name}: ${c.enabled}`));
    
    // Test disabling a condition
    const firstCondition = conditions[0];
    console.log(`Disabling condition: ${firstCondition.name}`);
    proactiveConditionsService.setConditionEnabled(firstCondition.id, false);
    
    const updatedConditions = proactiveConditionsService.getConditions();
    const disabledCondition = updatedConditions.find(c => c.id === firstCondition.id);
    console.log(`✅ Condition disabled: ${disabledCondition?.enabled === false}`);
    
    // Re-enable the condition
    console.log(`Re-enabling condition: ${firstCondition.name}`);
    proactiveConditionsService.setConditionEnabled(firstCondition.id, true);
    
    const finalConditions = proactiveConditionsService.getConditions();
    const enabledCondition = finalConditions.find(c => c.id === firstCondition.id);
    console.log(`✅ Condition re-enabled: ${enabledCondition?.enabled === true}`);
    
    console.log('🎉 Condition management test passed!');
  } catch (error) {
    console.error('❌ Condition management test failed:', error);
    throw error;
  }
}
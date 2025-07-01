import { contextService } from '../ContextService';
import { proactiveConditionsService } from '../ProactiveConditionsService';

/**
 * Integration test for the complete proactive agent workflow
 */
export async function testProactiveAgentIntegration(): Promise<void> {
  console.log('🔗 Testing Proactive Agent Integration...');
  
  try {
    // Step 1: Initialize context service
    console.log('Step 1: Initialize Context Service');
    const initialized = await contextService.initialize();
    console.log('✅ Context service initialized:', initialized);
    
    // Step 2: Create a comprehensive test scenario
    console.log('Step 2: Create test scenario - Business user on a rainy day');
    
    const testContext = {
      upcomingEvents: [
        {
          id: 'morning-standup',
          title: 'Daily Standup',
          startDate: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
          endDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          location: 'Conference Room B',
          notes: 'Sprint review',
        },
        {
          id: 'client-demo',
          title: 'Client Presentation - Product Demo',
          startDate: new Date(Date.now() + 70 * 60 * 1000), // 1 hour 10 min from now
          endDate: new Date(Date.now() + 140 * 60 * 1000), // 2 hours 20 min from now
          location: 'Downtown Office Building',
          notes: 'Major client - Q4 deal',
        },
        {
          id: 'lunch-meeting',
          title: 'Lunch with Marketing Team',
          startDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
          endDate: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours from now
          location: 'Rooftop Cafe',
          notes: 'Outdoor dining area',
        },
      ],
      weather: {
        temperature: 42, // Cold
        condition: 'rainy',
        precipitation: 85, // Heavy rain
        description: 'Heavy rain and strong winds expected',
        humidity: 90,
        windSpeed: 18,
      },
      location: {
        latitude: 40.7589,
        longitude: -73.9851,
        city: 'New York City',
      },
      timestamp: new Date(),
    };
    
    console.log('Test scenario created:', {
      events: testContext.upcomingEvents.length,
      weather: `${testContext.weather.temperature}°F, ${testContext.weather.condition}, ${testContext.weather.precipitation}% rain`,
      location: testContext.location.city,
    });
    
    // Step 3: Get all available conditions
    console.log('Step 3: Get available proactive conditions');
    const conditions = proactiveConditionsService.getConditions();
    console.log('✅ Available conditions:', conditions.map(c => ({
      id: c.id,
      name: c.name,
      enabled: c.enabled,
    })));
    
    // Step 4: Evaluate all conditions
    console.log('Step 4: Evaluate conditions against test scenario');
    const alerts = await proactiveConditionsService.evaluateConditions(testContext);
    
    console.log(`✅ Generated ${alerts.length} proactive alerts:`);
    alerts.forEach((alert, index) => {
      console.log(`  ${index + 1}. [${alert.priority.toUpperCase()}] ${alert.title}`);
      console.log(`     ${alert.body}`);
      console.log(`     Actionable: ${alert.actionable}`);
      if (alert.metadata) {
        console.log(`     Metadata: ${JSON.stringify(alert.metadata, null, 2)}`);
      }
      console.log('');
    });
    
    // Step 5: Test condition management
    console.log('Step 5: Test condition management');
    const weatherCondition = conditions.find(c => c.id === 'weather-before-meeting');
    if (weatherCondition) {
      console.log(`Disabling weather condition: ${weatherCondition.name}`);
      proactiveConditionsService.setConditionEnabled(weatherCondition.id, false);
      
      const alertsWithoutWeather = await proactiveConditionsService.evaluateConditions(testContext);
      console.log(`✅ Alerts without weather condition: ${alertsWithoutWeather.length}`);
      
      // Re-enable
      proactiveConditionsService.setConditionEnabled(weatherCondition.id, true);
      console.log('✅ Weather condition re-enabled');
    }
    
    // Step 6: Test edge cases
    console.log('Step 6: Test edge cases');
    
    // Empty context
    const emptyContext = {
      upcomingEvents: [],
      weather: null,
      location: null,
      timestamp: new Date(),
    };
    
    const emptyAlerts = await proactiveConditionsService.evaluateConditions(emptyContext);
    console.log(`✅ Alerts with empty context: ${emptyAlerts.length} (should be 0 or very few)`);
    
    // Far future events
    const futureContext = {
      upcomingEvents: [
        {
          id: 'future-meeting',
          title: 'Next Week Meeting',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          location: 'Conference Room',
        },
      ],
      weather: testContext.weather,
      location: testContext.location,
      timestamp: new Date(),
    };
    
    const futureAlerts = await proactiveConditionsService.evaluateConditions(futureContext);
    console.log(`✅ Alerts with future events: ${futureAlerts.length} (should be fewer)`);
    
    console.log('🎉 Proactive Agent Integration test completed successfully!');
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`- Total conditions tested: ${conditions.length}`);
    console.log(`- Alerts generated in main scenario: ${alerts.length}`);
    console.log(`- Alert priorities: ${alerts.map(a => a.priority).join(', ')}`);
    console.log(`- Actionable alerts: ${alerts.filter(a => a.actionable).length}`);
    
  } catch (error) {
    console.error('❌ Proactive Agent Integration test failed:', error);
    throw error;
  }
}
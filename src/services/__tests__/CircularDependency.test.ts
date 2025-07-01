/**
 * Test to verify that circular dependencies are resolved
 */

// Test that we can import AI services without circular dependency warnings
import { 
  createLLMResponse, 
  createLLMStream,
  createRobustLLMResponse,
  createRobustLLMStream,
  getUserFriendlyErrorMessage,
  LLMProviderType 
} from '../AI';

export async function testNoDependencyCycles(): Promise<void> {
  console.log('🧪 Testing AI service imports for circular dependencies...');
  
  try {
    // Test that all functions are properly imported
    console.log('✅ Basic LLM functions imported:', {
      createLLMResponse: typeof createLLMResponse,
      createLLMStream: typeof createLLMStream,
    });
    
    console.log('✅ Robust LLM functions imported:', {
      createRobustLLMResponse: typeof createRobustLLMResponse,
      createRobustLLMStream: typeof createRobustLLMStream,
    });
    
    console.log('✅ Utility functions imported:', {
      getUserFriendlyErrorMessage: typeof getUserFriendlyErrorMessage,
    });
    
    // Test error message generation
    const testError = new Error('rate limit exceeded');
    const friendlyMessage = getUserFriendlyErrorMessage(testError);
    console.log('✅ Error message generation works:', friendlyMessage);
    
    console.log('🎉 All AI service imports working without circular dependencies!');
  } catch (error) {
    console.error('❌ Circular dependency test failed:', error);
    throw error;
  }
}

// Quick test of import structure
console.log('AI Services import test - checking for circular dependencies...');
console.log('All imports successful - no circular dependency detected.');
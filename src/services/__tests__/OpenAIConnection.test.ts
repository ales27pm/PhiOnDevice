import { OpenAIProvider } from '../AI/OpenAIProvider';
import { getOpenAIClient } from '../../api/openai';

/**
 * Test OpenAI connection and basic functionality
 */
export async function testOpenAIConnection(): Promise<void> {
  console.log('🧪 Starting OpenAI Connection tests...');
  
  try {
    // Test 1: Check API key availability
    console.log('Test 1: Check API key');
    const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('❌ No OpenAI API key found in environment');
      return;
    } else {
      console.log('✅ API key found (length:', apiKey.length, ')');
    }

    // Test 2: Initialize client
    console.log('Test 2: Initialize OpenAI client');
    const client = getOpenAIClient();
    console.log('✅ OpenAI client initialized');

    // Test 3: Create provider
    console.log('Test 3: Create OpenAI provider');
    const provider = new OpenAIProvider({
      memoryEnabled: false, // Disable memory for testing
      maxTokens: 50, // Small response for testing
    });
    console.log('✅ OpenAI provider created');

    // Test 4: Check availability
    console.log('Test 4: Check provider availability');
    const isAvailable = await provider.isAvailable();
    console.log('✅ Provider availability:', isAvailable);

    if (!isAvailable) {
      console.warn('❌ Provider is not available, skipping further tests');
      return;
    }

    // Test 5: Simple non-streaming request
    console.log('Test 5: Simple non-streaming request');
    try {
      const response = await provider.testCoreResponse('Say hello');
      console.log('✅ Non-streaming response:', response.substring(0, 100));
    } catch (error) {
      console.error('❌ Non-streaming request failed:', error);
    }

    // Test 6: Simple streaming request
    console.log('Test 6: Simple streaming request');
    try {
      const stream = await provider.testCoreStreamResponse('Count to 3');
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let streamResponse = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunkCount++;
        const chunk = decoder.decode(value, { stream: true });
        streamResponse += chunk;
      }

      console.log('✅ Streaming response:', streamResponse.substring(0, 100));
      console.log('✅ Received chunks:', chunkCount);
    } catch (error) {
      console.error('❌ Streaming request failed:', error);
    }

    console.log('🎉 OpenAI Connection tests completed!');
  } catch (error) {
    console.error('❌ OpenAI Connection test failed:', error);
    throw error;
  }
}
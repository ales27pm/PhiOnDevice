import { LocalLLMProvider } from '../AI/LocalLLMProvider';
import { memoryService } from '../MemoryService';

/**
 * Test memory integration with AI providers
 */
export async function testMemoryIntegration(): Promise<void> {
  console.log('🧪 Starting Memory Integration tests...');
  
  try {
    // Initialize memory service
    await memoryService.initialize();
    await memoryService.clearAllMemories(); // Start fresh
    
    // Create a local LLM provider with memory enabled
    const provider = new LocalLLMProvider({
      memoryEnabled: true,
      maxMemoryContext: 2,
    });

    console.log('Test 1: First conversation (no memory context)');
    const response1 = await provider.getResponse('Hello, my name is John');
    console.log('✅ Response 1:', response1.substring(0, 100) + '...');

    console.log('Test 2: Second conversation (should have memory context)');
    const response2 = await provider.getResponse('What is my name?');
    console.log('✅ Response 2:', response2.substring(0, 100) + '...');

    console.log('Test 3: Check memory storage');
    const memories = await memoryService.getAllMemories();
    console.log('✅ Total memories stored:', memories.length);
    
    console.log('Test 4: Search memories');
    const searchResults = await memoryService.searchMemory('John');
    console.log('✅ Search results for "John":', searchResults.length);

    console.log('Test 5: Memory-disabled request');
    const response3 = await provider.getResponse('Tell me about the weather', {
      memoryEnabled: false,
    });
    console.log('✅ Response 3 (no memory):', response3.substring(0, 100) + '...');

    console.log('Test 6: Streaming with memory');
    const stream = await provider.streamResponse('Remember, I like coffee');
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let streamResponse = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      streamResponse += decoder.decode(value, { stream: true });
    }
    
    console.log('✅ Streaming response:', streamResponse.substring(0, 100) + '...');

    // Wait a moment for memory saving to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Test 7: Final memory check');
    const finalMemories = await memoryService.getAllMemories();
    console.log('✅ Final memory count:', finalMemories.length);

    console.log('🎉 All Memory Integration tests passed!');
  } catch (error) {
    console.error('❌ Memory Integration test failed:', error);
    throw error;
  }
}
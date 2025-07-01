import { MemoryService } from '../MemoryService';

// Simple test function (not using a testing framework for simplicity)
export async function testMemoryService(): Promise<void> {
  console.log('🧪 Starting MemoryService tests...');
  
  try {
    // Create a test instance
    const memoryService = MemoryService.getInstance({
      databaseName: 'test_memory.db',
      maxMemories: 100,
    });

    // Test 1: Initialize
    console.log('Test 1: Initialize database');
    await memoryService.initialize();
    console.log('✅ Database initialized successfully');

    // Test 2: Add memory
    console.log('Test 2: Add memory');
    const memory1 = await memoryService.addMemory('Hello, this is a test memory', {
      type: 'test',
      importance: 'high',
    });
    console.log('✅ Memory added:', memory1.id);

    // Test 3: Add another memory
    console.log('Test 3: Add another memory');
    const memory2 = await memoryService.addMemory('This is about React Native development');
    console.log('✅ Second memory added:', memory2.id);

    // Test 4: Search memories
    console.log('Test 4: Search memories');
    const searchResults = await memoryService.searchMemory('test');
    console.log('✅ Search results:', searchResults.length, 'found');

    // Test 5: Get memory by ID
    console.log('Test 5: Get memory by ID');
    const retrievedMemory = await memoryService.getMemoryById(memory1.id);
    console.log('✅ Retrieved memory:', retrievedMemory?.content);

    // Test 6: Get all memories
    console.log('Test 6: Get all memories');
    const allMemories = await memoryService.getAllMemories();
    console.log('✅ Total memories:', allMemories.length);

    // Test 7: Get stats
    console.log('Test 7: Get stats');
    const stats = await memoryService.getStats();
    console.log('✅ Stats:', stats);

    console.log('🎉 All MemoryService tests passed!');
  } catch (error) {
    console.error('❌ MemoryService test failed:', error);
    throw error;
  }
}
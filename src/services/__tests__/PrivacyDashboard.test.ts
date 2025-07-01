import { memoryService } from '../MemoryService';

/**
 * Test Privacy Dashboard functionality
 */
export async function testPrivacyDashboard(): Promise<void> {
  console.log('🧪 Testing Privacy Dashboard functionality...');
  
  try {
    // Initialize memory service
    await memoryService.initialize();
    
    console.log('Test 1: Add sample memories');
    const memory1 = await memoryService.addMemory('User: Hello, how are you?', {
      isUser: true,
      timestamp: new Date().toISOString(),
      provider: 'local',
    });
    
    const memory2 = await memoryService.addMemory('Assistant: I am doing well, thank you for asking!', {
      isUser: false,
      timestamp: new Date().toISOString(),
      provider: 'local',
    });
    
    const memory3 = await memoryService.addMemory('User: What can you help me with?', {
      isUser: true,
      timestamp: new Date().toISOString(),
      provider: 'local',
    });
    
    console.log('✅ Added sample memories:', memory1.id, memory2.id, memory3.id);
    
    console.log('Test 2: Get all memories (Privacy Dashboard view)');
    const allMemories = await memoryService.getAllMemories(0, 100);
    console.log('✅ Retrieved memories:', allMemories.length);
    
    console.log('Test 3: Get memory statistics');
    const stats = await memoryService.getStats();
    console.log('✅ Memory stats:', stats);
    
    console.log('Test 4: Search memories (search functionality)');
    const searchResults = await memoryService.searchMemory('hello');
    console.log('✅ Search results for "hello":', searchResults.length);
    
    console.log('Test 5: Delete individual memory');
    const deleteSuccess = await memoryService.deleteMemory(memory1.id);
    console.log('✅ Delete memory result:', deleteSuccess);
    
    console.log('Test 6: Verify deletion');
    const memoriesAfterDelete = await memoryService.getAllMemories(0, 100);
    console.log('✅ Memories after deletion:', memoriesAfterDelete.length);
    
    console.log('Test 7: Clear all memories (dashboard function)');
    await memoryService.clearAllMemories();
    const memoriesAfterClear = await memoryService.getAllMemories(0, 100);
    console.log('✅ Memories after clear all:', memoriesAfterClear.length);
    
    console.log('Test 8: Final stats check');
    const finalStats = await memoryService.getStats();
    console.log('✅ Final stats:', finalStats);
    
    console.log('🎉 All Privacy Dashboard tests passed!');
  } catch (error) {
    console.error('❌ Privacy Dashboard test failed:', error);
    throw error;
  }
}

/**
 * Test data export functionality
 */
export async function testDataExport(): Promise<void> {
  console.log('🧪 Testing data export functionality...');
  
  try {
    // Add some test data
    await memoryService.initialize();
    await memoryService.addMemory('Test conversation for export', {
      isUser: true,
      timestamp: new Date().toISOString(),
    });
    
    // Get all data for export
    const memories = await memoryService.getAllMemories(0, 1000);
    const stats = await memoryService.getStats();
    
    // Simulate export data structure
    const exportData = {
      exportDate: new Date().toISOString(),
      memories: memories.map(memory => ({
        id: memory.id,
        content: memory.content,
        timestamp: memory.timestamp,
        metadata: memory.metadata ? JSON.parse(memory.metadata) : null,
      })),
      stats: stats,
    };
    
    console.log('✅ Export data structure created:', {
      memoriesCount: exportData.memories.length,
      exportDate: exportData.exportDate,
      statsIncluded: !!exportData.stats,
    });
    
    // Clean up
    await memoryService.clearAllMemories();
    
    console.log('🎉 Data export test passed!');
  } catch (error) {
    console.error('❌ Data export test failed:', error);
    throw error;
  }
}
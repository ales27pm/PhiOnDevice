import * as SQLite from 'expo-sqlite';

/**
 * Memory interface for semantic storage
 */
export interface Memory {
  id: number;
  content: string;
  vector: string | null; // JSON string of vector embeddings (placeholder for now)
  timestamp: string;
  metadata?: string; // JSON string for additional metadata
}

/**
 * Search result interface
 */
export interface MemorySearchResult {
  memory: Memory;
  similarity?: number; // For future vector similarity scoring
  relevanceScore: number; // Current text-based relevance score
}

/**
 * Memory Service Configuration
 */
export interface MemoryServiceConfig {
  databaseName?: string;
  maxMemories?: number;
  vectorDimensions?: number;
}

/**
 * Semantic Memory Store Service
 * 
 * This service provides persistent storage and retrieval of memories using SQLite.
 * It's designed to eventually support vector embeddings for semantic similarity search.
 * Currently implements text-based search with placeholder vector storage.
 */
export class MemoryService {
  private static instance: MemoryService;
  private db: SQLite.SQLiteDatabase | null = null;
  private config: MemoryServiceConfig;
  private isInitialized = false;

  private constructor(config: MemoryServiceConfig = {}) {
    this.config = {
      databaseName: 'semantic_memory.db',
      maxMemories: 10000,
      vectorDimensions: 1536, // OpenAI text-embedding-ada-002 dimension
      ...config,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: MemoryServiceConfig): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService(config);
    }
    return MemoryService.instance;
  }

  /**
   * Initialize the SQLite database and create tables
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.db = await SQLite.openDatabaseAsync(this.config.databaseName!);
      
      // Create memories table with vector storage capability
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS memories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          vector TEXT, -- JSON string of vector embeddings
          timestamp TEXT NOT NULL,
          metadata TEXT, -- JSON string for additional metadata
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes for better search performance
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
        CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
      `);

      // Create full-text search virtual table for text search
      await this.db.execAsync(`
        CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
          content,
          content='memories',
          content_rowid='id'
        );
      `);

      // Create triggers to keep FTS table in sync
      await this.db.execAsync(`
        CREATE TRIGGER IF NOT EXISTS memories_fts_insert AFTER INSERT ON memories
        BEGIN
          INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
        END;
      `);

      await this.db.execAsync(`
        CREATE TRIGGER IF NOT EXISTS memories_fts_delete AFTER DELETE ON memories
        BEGIN
          DELETE FROM memories_fts WHERE rowid = old.id;
        END;
      `);

      await this.db.execAsync(`
        CREATE TRIGGER IF NOT EXISTS memories_fts_update AFTER UPDATE ON memories
        BEGIN
          UPDATE memories_fts SET content = new.content WHERE rowid = new.id;
        END;
      `);

      this.isInitialized = true;
      console.log('MemoryService: Database initialized successfully');
    } catch (error) {
      console.error('MemoryService: Failed to initialize database:', error);
      throw new Error(`Failed to initialize memory database: ${error}`);
    }
  }

  /**
   * Add a memory to the store
   * @param text - The content to store as memory
   * @param metadata - Optional metadata object
   * @returns The created memory with ID
   */
  async addMemory(text: string, metadata?: Record<string, any>): Promise<Memory> {
    await this.ensureInitialized();

    if (!text.trim()) {
      throw new Error('Memory content cannot be empty');
    }

    try {
      const timestamp = new Date().toISOString();
      const metadataJson = metadata ? JSON.stringify(metadata) : null;
      
      // Generate placeholder vector (will be replaced with actual embeddings later)
      const placeholderVector = this.generatePlaceholderVector(text);
      const vectorJson = JSON.stringify(placeholderVector);

      const result = await this.db!.runAsync(
        `INSERT INTO memories (content, vector, timestamp, metadata) 
         VALUES (?, ?, ?, ?)`,
        [text, vectorJson, timestamp, metadataJson]
      );

      // Retrieve the created memory
      const memory = await this.getMemoryById(result.lastInsertRowId);
      if (!memory) {
        throw new Error('Failed to retrieve created memory');
      }

      console.log(`MemoryService: Added memory with ID ${memory.id}`);
      return memory;
    } catch (error) {
      console.error('MemoryService: Failed to add memory:', error);
      throw new Error(`Failed to add memory: ${error}`);
    }
  }

  /**
   * Search memories using text similarity
   * @param query - Search query string
   * @param limit - Maximum number of results to return
   * @returns Array of search results with relevance scores
   */
  async searchMemory(query: string, limit: number = 10): Promise<MemorySearchResult[]> {
    await this.ensureInitialized();

    if (!query.trim()) {
      return [];
    }

    try {
      // Sanitize query for FTS5
      const sanitizedQuery = this.sanitizeFTSQuery(query);
      let ftsResults: any[] = [];

      // Try FTS5 search first, but fallback to LIKE if it fails
      if (sanitizedQuery) {
        try {
          ftsResults = await this.db!.getAllAsync(`
            SELECT 
              m.*,
              rank AS fts_rank
            FROM memories_fts f
            JOIN memories m ON m.id = f.rowid
            WHERE memories_fts MATCH ?
            ORDER BY rank
            LIMIT ?
          `, [sanitizedQuery, limit]);
        } catch (ftsError) {
          console.warn('MemoryService: FTS5 search failed, falling back to LIKE search:', ftsError);
          ftsResults = [];
        }
      }

      // Perform LIKE search for broader matching
      const likeResults = await this.db!.getAllAsync(`
        SELECT *
        FROM memories
        WHERE content LIKE ? 
        ${ftsResults.length > 0 ? `AND id NOT IN (${ftsResults.map(r => r.id).join(',')})` : ''}
        ORDER BY created_at DESC
        LIMIT ?
      `, [`%${query}%`, Math.max(0, limit - ftsResults.length)]);

      // Combine and score results
      const allResults = [...ftsResults, ...likeResults];
      
      return allResults.map((row: any) => {
        const memory: Memory = {
          id: row.id,
          content: row.content,
          vector: row.vector,
          timestamp: row.timestamp,
          metadata: row.metadata,
        };

        // Calculate relevance score (simple text-based for now)
        const relevanceScore = this.calculateTextRelevance(query, memory.content);

        return {
          memory,
          relevanceScore,
          similarity: undefined, // Will be used for vector similarity in the future
        };
      }).sort((a, b) => b.relevanceScore - a.relevanceScore);

    } catch (error) {
      console.error('MemoryService: Search failed:', error);
      // Return fallback LIKE search instead of throwing
      try {
        const fallbackResults = await this.db!.getAllAsync(`
          SELECT *
          FROM memories
          WHERE content LIKE ?
          ORDER BY created_at DESC
          LIMIT ?
        `, [`%${query}%`, limit]);

        return fallbackResults.map((row: any) => ({
          memory: {
            id: row.id,
            content: row.content,
            vector: row.vector,
            timestamp: row.timestamp,
            metadata: row.metadata,
          },
          relevanceScore: this.calculateTextRelevance(query, row.content),
          similarity: undefined,
        })).sort((a, b) => b.relevanceScore - a.relevanceScore);
      } catch (fallbackError) {
        console.error('MemoryService: Fallback search also failed:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Get a memory by ID
   */
  async getMemoryById(id: number): Promise<Memory | null> {
    await this.ensureInitialized();

    try {
      const result = await this.db!.getFirstAsync(
        'SELECT * FROM memories WHERE id = ?',
        [id]
      ) as any;

      if (!result) {
        return null;
      }

      return {
        id: result.id,
        content: result.content,
        vector: result.vector,
        timestamp: result.timestamp,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error('MemoryService: Failed to get memory by ID:', error);
      return null;
    }
  }

  /**
   * Get all memories with pagination
   */
  async getAllMemories(offset: number = 0, limit: number = 50): Promise<Memory[]> {
    await this.ensureInitialized();

    try {
      const results = await this.db!.getAllAsync(
        'SELECT * FROM memories ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      ) as any[];

      return results.map(row => ({
        id: row.id,
        content: row.content,
        vector: row.vector,
        timestamp: row.timestamp,
        metadata: row.metadata,
      }));
    } catch (error) {
      console.error('MemoryService: Failed to get memories:', error);
      return [];
    }
  }

  /**
   * Delete a memory by ID
   */
  async deleteMemory(id: number): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const result = await this.db!.runAsync('DELETE FROM memories WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error('MemoryService: Failed to delete memory:', error);
      return false;
    }
  }

  /**
   * Clear all memories
   */
  async clearAllMemories(): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.db!.execAsync('DELETE FROM memories');
      console.log('MemoryService: All memories cleared');
    } catch (error) {
      console.error('MemoryService: Failed to clear memories:', error);
      throw new Error(`Failed to clear memories: ${error}`);
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<{
    totalMemories: number;
    oldestMemory: string | null;
    newestMemory: string | null;
  }> {
    await this.ensureInitialized();

    try {
      const countResult = await this.db!.getFirstAsync(
        'SELECT COUNT(*) as count FROM memories'
      ) as any;

      const dateResults = await this.db!.getFirstAsync(`
        SELECT 
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM memories
      `) as any;

      return {
        totalMemories: countResult?.count || 0,
        oldestMemory: dateResults?.oldest || null,
        newestMemory: dateResults?.newest || null,
      };
    } catch (error) {
      console.error('MemoryService: Failed to get stats:', error);
      return {
        totalMemories: 0,
        oldestMemory: null,
        newestMemory: null,
      };
    }
  }

  /**
   * Private helper methods
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Sanitize query for FTS5 to avoid syntax errors
   */
  private sanitizeFTSQuery(query: string): string | null {
    if (!query || !query.trim()) {
      return null;
    }

    // Remove or escape special FTS5 characters that cause syntax errors
    let sanitized = query
      .replace(/[^\w\s-]/g, ' ') // Remove special chars except word chars, spaces, and hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // If the query is empty after sanitization, return null
    if (!sanitized) {
      return null;
    }

    // Split into words and join with AND for better FTS5 matching
    const words = sanitized.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length === 0) {
      return null;
    }

    // Use OR for broader matching, wrap phrases in quotes for exact matching
    return words.map(word => `"${word}"`).join(' OR ');
  }

  private generatePlaceholderVector(text: string): number[] {
    // Generate a simple hash-based placeholder vector
    // This will be replaced with actual embeddings from OpenAI or similar
    const dimensions = this.config.vectorDimensions!;
    const vector: number[] = new Array(dimensions);
    
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Generate pseudo-random vector based on hash
    for (let i = 0; i < dimensions; i++) {
      const seed = hash * (i + 1);
      vector[i] = (Math.sin(seed) * 43758.5453123) % 1;
    }

    return vector;
  }

  private calculateTextRelevance(query: string, content: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Simple relevance scoring
    let score = 0;
    
    // Exact match bonus
    if (contentLower.includes(queryLower)) {
      score += 1.0;
    }
    
    // Word matching
    const queryWords = queryLower.split(/\s+/);
    const contentWords = contentLower.split(/\s+/);
    
    const matchingWords = queryWords.filter(word => 
      contentWords.some(contentWord => contentWord.includes(word))
    );
    
    score += matchingWords.length / queryWords.length * 0.5;
    
    // Length penalty (prefer shorter, more relevant results)
    score *= Math.max(0.1, 1 - (content.length / 1000));
    
    return score;
  }
}

// Export singleton instance
export const memoryService = MemoryService.getInstance();
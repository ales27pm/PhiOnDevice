/**
 * Agent Factory - Complete Advanced Agent System Assembly
 * 
 * This factory creates and configures the complete advanced agent architecture
 * with all modules integrated and ready for production use.
 */

import {
  AdvancedAgent,
  AgentConfig,
  IPerceptionModule,
  IPlanningModule,
  IMemoryModule,
  IActionModule,
  IDialogueManager,
  ProcessedInput,
  Intent,
  Entity,
  ConversationContext,
  ReasoningResult,
  SessionState,
  KnowledgeResult,
  ToolCall,
  ToolResult,
  AgentResponse,
} from './AgentCore';
import DialogueManager from './DialogueManager';
import ReactAgent from './ReactAgent';
import { generateNativeReasoning, isNativeLLMSupported } from '../api/phi4-reasoning-native';
import { generateEnhancedReasoning } from '../api/enhanced-phi4-reasoning';
import { nativePhi4LLM, getModelBundlePath } from '../api/nativePhi4LLM';
import { Analytics } from '../utils/analytics';
import { ErrorHandler } from '../utils/errorHandler';

/**
 * Perception Module Implementation
 * Handles input processing, intent detection, and entity extraction
 */
class PerceptionModule implements IPerceptionModule {
  async processInput(input: string, context?: any): Promise<ProcessedInput> {
    try {
      const cleanedText = this.cleanInput(input);
      const intent = await this.detectIntent(cleanedText);
      const entities = await this.extractEntities(cleanedText);
      const language = this.detectLanguage(cleanedText);
      const emotion = this.detectEmotion(cleanedText);
      
      return {
        originalText: input,
        cleanedText,
        intent,
        entities,
        language,
        emotion,
        urgency: this.calculateUrgency(cleanedText, intent),
      };
    } catch (error) {
      ErrorHandler.logError(error as Error, 'PerceptionModule.processInput');
      throw error;
    }
  }

  async detectIntent(input: string): Promise<Intent> {
    const normalizedInput = input.toLowerCase();
    
    // Mathematical reasoning patterns
    if (this.containsMathKeywords(normalizedInput)) {
      if (normalizedInput.includes('résoudre') || normalizedInput.includes('solve')) {
        return { name: 'solve_problem', confidence: 0.9, domain: 'math' };
      }
      if (normalizedInput.includes('expliquer') || normalizedInput.includes('explain')) {
        return { name: 'explain_concept', confidence: 0.85, domain: 'math' };
      }
      if (normalizedInput.includes('vérifier') || normalizedInput.includes('check')) {
        return { name: 'verify_solution', confidence: 0.8, domain: 'math' };
      }
      return { name: 'math_assistance', confidence: 0.75, domain: 'math' };
    }
    
    // Reasoning and logic patterns
    if (this.containsReasoningKeywords(normalizedInput)) {
      return { name: 'logical_reasoning', confidence: 0.8, domain: 'reasoning' };
    }
    
    // Social interaction patterns
    if (this.containsSocialKeywords(normalizedInput)) {
      return { name: 'social_interaction', confidence: 0.7, domain: 'social' };
    }
    
    // Tool request patterns
    if (normalizedInput.includes('calculer') || normalizedInput.includes('calculate')) {
      return { name: 'tool_request', confidence: 0.85, domain: 'tool_request' };
    }
    
    // Default general intent
    return { name: 'general_question', confidence: 0.6, domain: 'general' };
  }

  async extractEntities(input: string): Promise<Entity[]> {
    const entities: Entity[] = [];
    
    // Mathematical entities
    const numberPattern = /\d+(?:\.\d+)?/g;
    let match;
    while ((match = numberPattern.exec(input)) !== null) {
      entities.push({
        type: 'number',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.95,
      });
    }
    
    // Variable entities
    const variablePattern = /\b[a-z]\b/g;
    while ((match = variablePattern.exec(input)) !== null) {
      entities.push({
        type: 'variable',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.8,
      });
    }
    
    // Mathematical operations
    const operationPattern = /[+\-*/=]/g;
    while ((match = operationPattern.exec(input)) !== null) {
      entities.push({
        type: 'operation',
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.9,
      });
    }
    
    return entities;
  }

  private cleanInput(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  }

  private containsMathKeywords(input: string): boolean {
    const mathKeywords = [
      'équation', 'equation', 'résoudre', 'solve', 'calculer', 'calculate',
      'dérivée', 'derivative', 'intégrale', 'integral', 'fonction', 'function',
      'graphique', 'graph', 'aire', 'area', 'volume', 'périmètre', 'perimeter'
    ];
    return mathKeywords.some(keyword => input.includes(keyword));
  }

  private containsReasoningKeywords(input: string): boolean {
    const reasoningKeywords = [
      'logique', 'logic', 'raisonnement', 'reasoning', 'preuve', 'proof',
      'démonstration', 'demonstration', 'argument', 'conclusion'
    ];
    return reasoningKeywords.some(keyword => input.includes(keyword));
  }

  private containsSocialKeywords(input: string): boolean {
    const socialKeywords = [
      'salut', 'bonjour', 'hello', 'merci', 'thank', 'comment', 'how',
      'ça va', 'comment allez', 'au revoir', 'goodbye'
    ];
    return socialKeywords.some(keyword => input.includes(keyword));
  }

  private detectLanguage(input: string): string {
    const frenchWords = ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'est', 'sont'];
    const quebecoisWords = ['pis', 'bin', 'toé', 'moé', 'icitte', 'pantoute', 'correct'];
    
    const words = input.toLowerCase().split(/\s+/);
    const frenchCount = words.filter(word => frenchWords.includes(word)).length;
    const quebecoisCount = words.filter(word => quebecoisWords.includes(word)).length;
    
    if (quebecoisCount > 0) return 'fr-qc';
    if (frenchCount > words.length * 0.3) return 'fr';
    return 'en';
  }

  private detectEmotion(input: string): string {
    const emotionPatterns = {
      excited: ['!', 'super', 'génial', 'awesome', 'great'],
      confused: ['?', 'comprends pas', "don't understand", 'confus'],
      frustrated: ['argh', 'difficile', 'hard', 'impossible'],
      happy: ['merci', 'thank', 'parfait', 'perfect'],
    };

    for (const [emotion, patterns] of Object.entries(emotionPatterns)) {
      if (patterns.some(pattern => input.toLowerCase().includes(pattern))) {
        return emotion;
      }
    }

    return 'neutral';
  }

  private calculateUrgency(input: string, intent: Intent): number {
    let urgency = 0.5; // Base urgency
    
    // High urgency indicators
    if (input.includes('urgent') || input.includes('vite') || input.includes('quickly')) {
      urgency += 0.3;
    }
    
    // Question marks indicate seeking help
    const questionMarks = (input.match(/\?/g) || []).length;
    urgency += Math.min(questionMarks * 0.1, 0.2);
    
    // Math problems often need immediate help
    if (intent.domain === 'math') {
      urgency += 0.1;
    }
    
    return Math.min(urgency, 1.0);
  }
}

/**
 * Planning Module Implementation
 * Uses Phi-4-mini-reasoning for sophisticated mathematical planning
 */
class PlanningModule implements IPlanningModule {
  async generateReasoning(
    input: ProcessedInput,
    context: ConversationContext,
    config: AgentConfig
  ): Promise<ReasoningResult> {
    try {
      let reasoning: any[] = [];
      let response = '';
      let confidence = 0.8;
      let toolCalls: ToolCall[] = [];

      // Always prioritize native Phi-4 reasoning for local-first architecture
      const isNativeReady = isNativeLLMSupported && await nativePhi4LLM.isModelLoaded();
      console.log(`🧠 Reasoning Method: ${isNativeReady ? 'Local Phi-4-mini-reasoning' : 'External API'}`);
      
      if (isNativeReady) {
        try {
          console.log('🔒 Processing with local Phi-4-mini-reasoning model...');
          const result = await generateNativeReasoning(
            input.cleanedText,
            (step) => reasoning.push(step),
            undefined, // No token callback for planning
          );
          
          response = result.solution;
          confidence = 0.95; // Higher confidence for local reasoning
          
          // Add a reasoning step indicating local processing
          reasoning.unshift({
            step: 0,
            type: 'think',
            content: '🧠 Traitement local avec Phi-4-mini-reasoning (100% privé)',
            confidence: 1.0,
          });
          
          console.log('✅ Local Phi-4 reasoning completed successfully');
        } catch (error) {
          console.log('⚠️ Local Phi-4 failed, falling back to external API:', (error as Error).message);
          const result = await generateEnhancedReasoning(
            input.cleanedText,
            (step) => reasoning.push(step),
          );
          
          response = result.solution;
          confidence = result.tokensPerSecond > 20 ? 0.8 : 0.6;
          
          // Add a reasoning step indicating fallback
          reasoning.unshift({
            step: 0,
            type: 'observe',
            content: '☁️ Utilisation du raisonnement externe (API) - Local non disponible',
            confidence: 0.7,
          });
        }
      } else {
        // Fallback to enhanced reasoning when native not available
        console.log('🌐 Using external API reasoning (local LLM not available)');
        const result = await generateEnhancedReasoning(
          input.cleanedText,
          (step) => reasoning.push(step),
        );
        
        response = result.solution;
        confidence = result.tokensPerSecond > 20 ? 0.8 : 0.6;
        
        // Add a reasoning step indicating external processing
        reasoning.unshift({
          step: 0,
          type: 'observe',
          content: '☁️ Traitement avec API externe - LLM local non disponible',
          confidence: 0.7,
        });
      }
      
      // Analyze if tools are needed regardless of reasoning method
      if (await this.shouldUseTools(input)) {
        toolCalls = await this.planToolSequence(input);
      }

      return {
        response,
        reasoning,
        confidence,
        toolCalls,
        suggestedActions: this.generateSuggestedActions(input, reasoning),
      };
    } catch (error) {
      ErrorHandler.logError(error as Error, 'PlanningModule.generateReasoning');
      throw error;
    }
  }

  async shouldUseTools(input: ProcessedInput): Promise<boolean> {
    // Determine if tools are needed based on intent and entities
    const mathIntents = ['solve_problem', 'tool_request', 'verify_solution'];
    const hasNumbers = input.entities.some(e => e.type === 'number');
    const hasOperations = input.entities.some(e => e.type === 'operation');
    
    return mathIntents.includes(input.intent.name) && (hasNumbers || hasOperations);
  }

  async planToolSequence(input: ProcessedInput): Promise<ToolCall[]> {
    const toolCalls: ToolCall[] = [];
    
    // Plan tool sequence based on problem type
    if (input.intent.name === 'solve_problem') {
      if (input.entities.some(e => e.type === 'operation' && e.value === '=')) {
        // Equation solving
        toolCalls.push({
          name: 'equation_solver',
          arguments: { equation: input.cleanedText },
          id: `tool_${Date.now()}_1`,
        });
      } else {
        // General calculation
        toolCalls.push({
          name: 'calculator',
          arguments: { expression: input.cleanedText },
          id: `tool_${Date.now()}_2`,
        });
      }
    }
    
    if (input.intent.name === 'explain_concept') {
      toolCalls.push({
        name: 'knowledge_search',
        arguments: { query: input.cleanedText, domain: 'mathematics' },
        id: `tool_${Date.now()}_3`,
      });
    }
    
    return toolCalls;
  }

  private generateSuggestedActions(input: ProcessedInput, reasoning: any[]): string[] {
    const actions: string[] = [];
    
    if (input.intent.domain === 'math') {
      actions.push('Vérifier la solution');
      actions.push('Voir des exemples similaires');
      actions.push('Expliquer une étape');
    }
    
    if (reasoning.length > 3) {
      actions.push('Résumer les étapes');
    }
    
    return actions;
  }
}

/**
 * Memory Module Implementation
 * Manages conversation context, working memory, and knowledge storage
 */
class MemoryModule implements IMemoryModule {
  private conversationHistory: Map<string, any[]> = new Map();
  private workingMemory: Map<string, any> = new Map();
  private knowledgeCache: Map<string, KnowledgeResult[]> = new Map();

  async storeMessage(message: any): Promise<void> {
    const sessionId = message.sessionId || 'default';
    const history = this.conversationHistory.get(sessionId) || [];
    history.push(message);
    
    // Keep only last 20 messages
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    
    this.conversationHistory.set(sessionId, history);
  }

  async retrieveContext(query: string, limit?: number): Promise<ConversationContext> {
    // Simple context retrieval (would be enhanced with vector similarity)
    const sessionId = 'default'; // Would get from session
    const messages = this.conversationHistory.get(sessionId) || [];
    const workingMemory = Object.fromEntries(this.workingMemory);
    
    return {
      messages: messages.slice(-(limit || 10)),
      workingMemory,
      sessionState: {
        sessionId,
        lastInteraction: Date.now(),
        preferences: {
          preferredLanguage: 'fr-qc',
          explanationLevel: 'detailed',
          mathNotation: 'simple',
          personalityStyle: 'friendly',
        },
        conversationMode: 'educational',
        language: 'fr-qc',
      },
      relevantKnowledge: await this.searchKnowledge(query),
    };
  }

  async updateWorkingMemory(key: string, value: any): Promise<void> {
    this.workingMemory.set(key, value);
  }

  async getWorkingMemory(key: string): Promise<any> {
    return this.workingMemory.get(key);
  }

  async searchKnowledge(query: string): Promise<KnowledgeResult[]> {
    // Check cache first
    if (this.knowledgeCache.has(query)) {
      return this.knowledgeCache.get(query)!;
    }
    
    // Simple knowledge search (would be enhanced with proper retrieval)
    const results: KnowledgeResult[] = [
      {
        content: 'Les équations linéaires peuvent être résolues en isolant la variable.',
        source: 'Cours de mathématiques',
        relevance: 0.8,
      },
    ];
    
    this.knowledgeCache.set(query, results);
    return results;
  }
}

/**
 * Agent Factory Class
 * Creates and configures the complete advanced agent system
 */
export class AgentFactory {
  private static instance: AgentFactory;
  
  static getInstance(): AgentFactory {
    if (!this.instance) {
      this.instance = new AgentFactory();
    }
    return this.instance;
  }

  /**
   * Create a complete advanced agent with all modules
   */
  createAdvancedAgent(config?: Partial<AgentConfig>): AdvancedAgent {
    // Default configuration
    const defaultConfig: AgentConfig = {
      maxContextLength: 2048,
      temperature: 0.7,
      enableReasoningTraces: true,
      enableRAG: true,
      enableToolCalling: true,
      language: 'fr-qc',
      persona: 'tutor',
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Create all modules
    const perception = new PerceptionModule();
    const planning = new PlanningModule();
    const memory = new MemoryModule();
    const action = new ReactAgent();
    const dialogue = new DialogueManager(finalConfig);

    // Create and configure the advanced agent
    const agent = new AdvancedAgent(
      perception,
      planning,
      memory,
      action,
      dialogue,
      finalConfig
    );

    Analytics.track('advanced_agent_created', {
      config: finalConfig,
      modules: ['perception', 'planning', 'memory', 'action', 'dialogue'],
    });

    console.log('🤖 Advanced Agent created with complete modular architecture');
    console.log(`   Language: ${finalConfig.language}`);
    console.log(`   Persona: ${finalConfig.persona}`);
    console.log(`   RAG enabled: ${finalConfig.enableRAG}`);
    console.log(`   Tool calling: ${finalConfig.enableToolCalling}`);
    console.log(`   Native LLM: ${isNativeLLMSupported}`);

    return agent;
  }

  /**
   * Create a specialized mathematical reasoning agent
   */
  createMathAgent(): AdvancedAgent {
    return this.createAdvancedAgent({
      persona: 'tutor',
      enableToolCalling: true,
      enableReasoningTraces: true,
      maxContextLength: 1024, // Optimized for math problems
    });
  }

  /**
   * Create a Québécois conversational agent
   */
  createQuebecoisAgent(): AdvancedAgent {
    return this.createAdvancedAgent({
      language: 'fr-qc',
      persona: 'friend',
      enableRAG: true,
      temperature: 0.8, // More conversational
    });
  }

  /**
   * Create an educational tutor agent
   */
  createTutorAgent(): AdvancedAgent {
    return this.createAdvancedAgent({
      persona: 'tutor',
      enableReasoningTraces: true,
      enableToolCalling: true,
      enableRAG: true,
      maxContextLength: 2048,
    });
  }

  /**
   * Initialize the native local LLM for local-first operation
   */
  async initializeNativeLLM(): Promise<boolean> {
    if (!isNativeLLMSupported) {
      console.log('⚠️ Native LLM not supported on this platform');
      return false;
    }

    try {
      console.log('🚀 Initializing native Phi-4-mini-reasoning model...');
      
      const modelPath = getModelBundlePath();
      const success = await nativePhi4LLM.loadModel(modelPath);
      
      if (success) {
        // Optimize for neural engine
        await nativePhi4LLM.setComputeUnits('cpuAndNeuralEngine');
        await nativePhi4LLM.setQuantizationMode('dynamic');
        
        const modelInfo = await nativePhi4LLM.getModelInfo();
        console.log('✅ Native Phi-4 model loaded successfully:');
        console.log(`   Model: ${modelInfo.modelName}`);
        console.log(`   Version: ${modelInfo.version}`);
        console.log(`   Parameters: ${modelInfo.parameterCount}`);
        console.log(`   Memory: ${modelInfo.memoryUsage ? (modelInfo.memoryUsage / 1024 / 1024).toFixed(1) + 'MB' : 'Unknown'}`);
        
        Analytics.track('native_llm_initialized', {
          modelName: modelInfo.modelName,
          version: modelInfo.version,
          memoryUsage: modelInfo.memoryUsage,
        });
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.log('❌ Failed to initialize native LLM:', (error as Error).message);
      ErrorHandler.logError(error as Error, 'AgentFactory.initializeNativeLLM');
      return false;
    }
  }

  /**
   * Get agent capabilities and status
   */
  async getSystemStatus(): Promise<any> {
    const nativeStatus = await nativePhi4LLM.diagnose();
    
    return {
      nativeLLMSupported: isNativeLLMSupported,
      nativeLLMLoaded: nativeStatus.isModelLoaded,
      nativeModelInfo: nativeStatus.modelInfo,
      nativePerformance: nativeStatus.performanceMetrics,
      memoryUsage: nativeStatus.memoryUsage,
      availableModules: [
        'perception',
        'planning', 
        'memory',
        'action',
        'dialogue'
      ],
      supportedLanguages: ['en', 'fr', 'fr-qc'],
      availablePersonas: ['tutor', 'assistant', 'friend', 'expert'],
      toolsAvailable: [
        'calculator',
        'equation_solver',
        'knowledge_search',
        'graph_plotter',
        'step_solver'
      ],
    };
  }
}

// Export singleton instance
export const agentFactory = AgentFactory.getInstance();

// Export for easy imports
export {
  AdvancedAgent,
  DialogueManager,
  ReactAgent,
};

export default AgentFactory;
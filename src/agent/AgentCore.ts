/**
 * Advanced Agent Core - Modular Agent Architecture
 * 
 * This implements the sophisticated agent architecture with:
 * - Perception Module (Input processing, NLU)
 * - Planning Module (Phi-4-mini reasoning)
 * - Memory Module (Context, vector storage)
 * - Action Module (RAG, function calling)
 * - Dialogue Management (Orchestration layer)
 */

import { EventEmitter } from '../utils/EventEmitter';
import { Analytics } from '../utils/analytics';
import { ErrorHandler, ReasoningError } from '../utils/errorHandler';

// Core agent interfaces
export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  metadata?: {
    reasoning?: ReasoningTrace[];
    tools_used?: string[];
    confidence?: number;
    emotion?: string;
    language?: string;
  };
}

export interface ReasoningTrace {
  step: number;
  type: 'think' | 'act' | 'observe';
  content: string;
  confidence: number;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
  id: string;
}

export interface ToolResult {
  tool_call_id: string;
  result: any;
  error?: string;
}

export interface AgentConfig {
  maxContextLength: number;
  temperature: number;
  enableReasoningTraces: boolean;
  enableRAG: boolean;
  enableToolCalling: boolean;
  language: 'en' | 'fr' | 'fr-qc';
  persona: 'tutor' | 'assistant' | 'friend' | 'expert';
}

// Agent module interfaces
export interface IPerceptionModule {
  processInput(input: string, context?: any): Promise<ProcessedInput>;
  detectIntent(input: string): Promise<Intent>;
  extractEntities(input: string): Promise<Entity[]>;
}

export interface IPlanningModule {
  generateReasoning(
    input: ProcessedInput,
    context: ConversationContext,
    config: AgentConfig
  ): Promise<ReasoningResult>;
  shouldUseTools(input: ProcessedInput): Promise<boolean>;
  planToolSequence(input: ProcessedInput): Promise<ToolCall[]>;
}

export interface IMemoryModule {
  storeMessage(message: AgentMessage): Promise<void>;
  retrieveContext(query: string, limit?: number): Promise<ConversationContext>;
  updateWorkingMemory(key: string, value: any): Promise<void>;
  getWorkingMemory(key: string): Promise<any>;
  searchKnowledge(query: string): Promise<KnowledgeResult[]>;
}

export interface IActionModule {
  executeToolCall(toolCall: ToolCall): Promise<ToolResult>;
  performRAGRetrieval(query: string): Promise<KnowledgeResult[]>;
  executeFunction(name: string, args: any): Promise<any>;
}

export interface IDialogueManager {
  processConversationTurn(
    userInput: string,
    sessionId: string
  ): Promise<AgentResponse>;
  updateSessionState(sessionId: string, state: Partial<SessionState>): Promise<void>;
  getSessionState(sessionId: string): Promise<SessionState>;
}

// Supporting types
export interface ProcessedInput {
  originalText: string;
  cleanedText: string;
  intent: Intent;
  entities: Entity[];
  language: string;
  emotion?: string;
  urgency?: number;
}

export interface Intent {
  name: string;
  confidence: number;
  domain: 'math' | 'general' | 'reasoning' | 'social' | 'tool_request';
}

export interface Entity {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
}

export interface ConversationContext {
  messages: AgentMessage[];
  workingMemory: Record<string, any>;
  sessionState: SessionState;
  relevantKnowledge: KnowledgeResult[];
}

export interface SessionState {
  sessionId: string;
  userId?: string;
  currentTopic?: string;
  lastInteraction: number;
  preferences: UserPreferences;
  conversationMode: 'casual' | 'educational' | 'problem_solving';
  language: string;
}

export interface UserPreferences {
  preferredLanguage: string;
  explanationLevel: 'brief' | 'detailed' | 'step_by_step';
  mathNotation: 'simple' | 'advanced';
  personalityStyle: 'formal' | 'friendly' | 'enthusiastic';
}

export interface ReasoningResult {
  response: string;
  reasoning: ReasoningTrace[];
  confidence: number;
  toolCalls?: ToolCall[];
  suggestedActions?: string[];
}

export interface KnowledgeResult {
  content: string;
  source: string;
  relevance: number;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  message: AgentMessage;
  reasoning?: ReasoningTrace[];
  toolResults?: ToolResult[];
  confidence: number;
  nextActions?: string[];
}

/**
 * Core Agent Orchestrator
 * 
 * This is the main agent class that coordinates all modules
 */
export class AdvancedAgent extends EventEmitter {
  private perception: IPerceptionModule;
  private planning: IPlanningModule;
  private memory: IMemoryModule;
  private action: IActionModule;
  private dialogue: IDialogueManager;
  private config: AgentConfig;

  constructor(
    perception: IPerceptionModule,
    planning: IPlanningModule,
    memory: IMemoryModule,
    action: IActionModule,
    dialogue: IDialogueManager,
    config: AgentConfig
  ) {
    super();
    this.perception = perception;
    this.planning = planning;
    this.memory = memory;
    this.action = action;
    this.dialogue = dialogue;
    this.config = config;

    console.log('🤖 Advanced Agent initialized with modular architecture');
  }

  /**
   * Main conversation processing method
   */
  async processConversation(
    userInput: string,
    sessionId: string,
    onReasoningStep?: (step: ReasoningTrace) => void,
    onToolCall?: (tool: ToolCall) => void
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      Analytics.track('agent_conversation_started', {
        sessionId,
        inputLength: userInput.length,
        language: this.config.language,
      });

      // Emit reasoning step updates
      const stepCallback = (step: ReasoningTrace) => {
        if (onReasoningStep) onReasoningStep(step);
        this.emit('reasoning_step', step);
      };

      // Emit tool call updates
      const toolCallback = (tool: ToolCall) => {
        if (onToolCall) onToolCall(tool);
        this.emit('tool_call', tool);
      };

      // 1. PERCEPTION: Process and understand input
      stepCallback({
        step: 1,
        type: 'think',
        content: 'Analyzing user input and extracting intent...',
        confidence: 0.9,
      });

      const processedInput = await this.perception.processInput(userInput);
      
      stepCallback({
        step: 2,
        type: 'observe',
        content: `Detected intent: ${processedInput.intent.name} (${processedInput.intent.confidence.toFixed(2)})`,
        confidence: processedInput.intent.confidence,
      });

      // 2. MEMORY: Retrieve relevant context
      stepCallback({
        step: 3,
        type: 'think',
        content: 'Retrieving conversation context and relevant knowledge...',
        confidence: 0.8,
      });

      const context = await this.memory.retrieveContext(userInput);
      
      // 3. PLANNING: Generate reasoning and plan actions
      stepCallback({
        step: 4,
        type: 'think',
        content: 'Planning response strategy and reasoning approach...',
        confidence: 0.85,
      });

      const reasoningResult = await this.planning.generateReasoning(
        processedInput,
        context,
        this.config
      );

      // Add reasoning steps to callback
      reasoningResult.reasoning.forEach(stepCallback);

      // 4. ACTION: Execute tools if needed
      let toolResults: ToolResult[] = [];
      if (reasoningResult.toolCalls && reasoningResult.toolCalls.length > 0) {
        stepCallback({
          step: reasoningResult.reasoning.length + 1,
          type: 'act',
          content: `Executing ${reasoningResult.toolCalls.length} tool(s)...`,
          confidence: 0.9,
        });

        for (const toolCall of reasoningResult.toolCalls) {
          toolCallback(toolCall);
          const result = await this.action.executeToolCall(toolCall);
          toolResults.push(result);
          
          stepCallback({
            step: reasoningResult.reasoning.length + toolResults.length + 1,
            type: 'observe',
            content: `Tool ${toolCall.name} executed: ${result.error ? 'Error' : 'Success'}`,
            confidence: result.error ? 0.3 : 0.9,
          });
        }
      }

      // 5. DIALOGUE MANAGEMENT: Generate final response
      const finalResponse = await this.dialogue.processConversationTurn(
        userInput,
        sessionId
      );

      // 6. MEMORY: Store conversation
      await this.memory.storeMessage({
        id: `user_${Date.now()}`,
        role: 'user',
        content: userInput,
        timestamp: Date.now(),
        metadata: {
          reasoning: [processedInput.intent as any],
        },
      });

      await this.memory.storeMessage(finalResponse.message);

      const duration = Date.now() - startTime;

      Analytics.track('agent_conversation_completed', {
        sessionId,
        duration,
        toolsUsed: toolResults.length,
        confidence: finalResponse.confidence,
        reasoningSteps: reasoningResult.reasoning.length,
      });

      console.log(`🤖 Agent conversation completed in ${duration}ms`);
      console.log(`   Confidence: ${finalResponse.confidence.toFixed(2)}`);
      console.log(`   Tools used: ${toolResults.length}`);
      console.log(`   Reasoning steps: ${reasoningResult.reasoning.length}`);

      return {
        ...finalResponse,
        reasoning: [...reasoningResult.reasoning, ...(finalResponse.reasoning || [])],
        toolResults,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      Analytics.track('agent_conversation_failed', {
        sessionId,
        duration,
        error: (error as Error).message,
      });

      ErrorHandler.logError(error as Error, 'AdvancedAgent.processConversation');
      
      // Fallback response
      return {
        message: {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: "Je suis désolé, j'ai rencontré une difficulté. Pouvez-vous reformuler votre question?",
          timestamp: Date.now(),
        },
        confidence: 0.1,
        reasoning: [{
          step: 1,
          type: 'observe',
          content: `Error occurred: ${(error as Error).message}`,
          confidence: 0.1,
        }],
      };
    }
  }

  /**
   * Update agent configuration
   */
  async updateConfig(newConfig: Partial<AgentConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    Analytics.track('agent_config_updated', {
      changes: Object.keys(newConfig),
    });

    this.emit('config_updated', this.config);
  }

  /**
   * Get agent status and metrics
   */
  async getStatus(): Promise<AgentStatus> {
    return {
      isReady: true,
      config: this.config,
      capabilities: {
        reasoning: true,
        toolCalling: this.config.enableToolCalling,
        rag: this.config.enableRAG,
        multiLanguage: true,
      },
      performance: {
        averageResponseTime: 2500, // ms
        confidence: 0.85,
        uptime: Date.now(),
      },
    };
  }
}

export interface AgentStatus {
  isReady: boolean;
  config: AgentConfig;
  capabilities: {
    reasoning: boolean;
    toolCalling: boolean;
    rag: boolean;
    multiLanguage: boolean;
  };
  performance: {
    averageResponseTime: number;
    confidence: number;
    uptime: number;
  };
}

// Utility functions for agent system
export class AgentUtils {
  static generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static formatReasoningTrace(traces: ReasoningTrace[]): string {
    return traces.map(trace => 
      `<${trace.type}>${trace.content}</${trace.type}>`
    ).join('\n');
  }

  static calculateConfidence(traces: ReasoningTrace[]): number {
    if (traces.length === 0) return 0.5;
    const avgConfidence = traces.reduce((sum, trace) => sum + trace.confidence, 0) / traces.length;
    return Math.min(Math.max(avgConfidence, 0.0), 1.0);
  }

  static detectLanguage(text: string): string {
    // Simple language detection (can be enhanced with ML)
    const frenchWords = ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'est', 'sont', 'avec', 'dans', 'pour'];
    const quebecoisWords = ['pis', 'bin', 'toé', 'moé', 'icitte', 'pantoute', 'correct', 'su'];
    
    const words = text.toLowerCase().split(/\s+/);
    const frenchCount = words.filter(word => frenchWords.includes(word)).length;
    const quebecoisCount = words.filter(word => quebecoisWords.includes(word)).length;
    
    if (quebecoisCount > 0) return 'fr-qc';
    if (frenchCount > words.length * 0.3) return 'fr';
    return 'en';
  }
}

export default AdvancedAgent;
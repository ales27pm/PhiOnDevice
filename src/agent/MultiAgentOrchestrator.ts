/**
 * Multi-Agent Orchestration System
 * 
 * Advanced system that coordinates multiple specialized agents to solve complex problems
 * through intelligent routing, task decomposition, and collaborative reasoning.
 */

import { EventEmitter } from '../utils/EventEmitter';
import {
  AdvancedAgent,
  AgentConfig,
  AgentMessage,
  AgentResponse,
  ReasoningTrace,
  ToolCall,
} from './AgentCore';
import { agentFactory } from './AgentFactory';
import { Analytics } from '../utils/analytics';
import { ErrorHandler } from '../utils/errorHandler';

export interface AgentCapability {
  domain: string;
  skills: string[];
  confidence: number;
  languages: string[];
}

export interface TaskDecomposition {
  originalTask: string;
  subtasks: SubTask[];
  executionOrder: 'parallel' | 'sequential' | 'conditional';
  estimatedComplexity: number;
}

export interface SubTask {
  id: string;
  description: string;
  requiredAgent: string;
  dependencies: string[];
  priority: number;
  expectedDuration: number;
}

export interface AgentExecution {
  agentId: string;
  subtaskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: AgentResponse;
  startTime?: number;
  endTime?: number;
}

export interface OrchestrationResult {
  taskId: string;
  originalQuery: string;
  decomposition: TaskDecomposition;
  executions: AgentExecution[];
  finalResult: string;
  confidence: number;
  totalDuration: number;
  agentsUsed: string[];
}

/**
 * Multi-Agent Orchestrator
 * 
 * Coordinates multiple specialized agents to solve complex, multi-domain problems
 */
export class MultiAgentOrchestrator extends EventEmitter {
  private agents: Map<string, AdvancedAgent> = new Map();
  private agentCapabilities: Map<string, AgentCapability> = new Map();
  private activeExecutions: Map<string, AgentExecution[]> = new Map();
  private taskHistory: OrchestrationResult[] = [];

  constructor() {
    super();
    this.initializeAgents();
    console.log('🎭 Multi-Agent Orchestrator initialized');
  }

  /**
   * Main orchestration method - processes complex queries using multiple agents
   */
  async orchestrateTask(
    query: string,
    sessionId: string,
    onProgress?: (update: OrchestrationUpdate) => void
  ): Promise<OrchestrationResult> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // 1. Analyze task complexity and determine if orchestration is needed
      const needsOrchestration = await this.analyzeTaskComplexity(query);
      
      if (!needsOrchestration) {
        // Simple task - route to single best agent
        return await this.routeToSingleAgent(query, sessionId, taskId);
      }

      // 2. Decompose complex task into subtasks
      const decomposition = await this.decomposeTask(query);
      
      this.emitProgress(onProgress, {
        type: 'task_decomposed',
        taskId,
        data: { subtasks: decomposition.subtasks.length }
      });

      // 3. Create execution plan
      const executionPlan = this.createExecutionPlan(decomposition);
      
      // 4. Execute subtasks with appropriate agents
      const executions = await this.executeSubtasks(
        decomposition,
        executionPlan,
        sessionId,
        onProgress
      );

      // 5. Synthesize results from all agents
      const finalResult = await this.synthesizeResults(
        query,
        decomposition,
        executions
      );

      const totalDuration = Date.now() - startTime;
      const agentsUsed = [...new Set(executions.map(e => e.agentId))];

      const result: OrchestrationResult = {
        taskId,
        originalQuery: query,
        decomposition,
        executions,
        finalResult: finalResult.content,
        confidence: finalResult.confidence,
        totalDuration,
        agentsUsed,
      };

      this.taskHistory.push(result);
      
      Analytics.track('multi_agent_orchestration_completed', {
        taskId,
        subtasks: decomposition.subtasks.length,
        agentsUsed: agentsUsed.length,
        duration: totalDuration,
        confidence: finalResult.confidence,
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      Analytics.track('multi_agent_orchestration_failed', {
        taskId,
        duration,
        error: (error as Error).message,
      });

      ErrorHandler.logError(error as Error, 'MultiAgentOrchestrator.orchestrateTask');
      throw error;
    }
  }

  /**
   * Add a specialized agent to the orchestrator
   */
  registerAgent(agentId: string, agent: AdvancedAgent, capabilities: AgentCapability): void {
    this.agents.set(agentId, agent);
    this.agentCapabilities.set(agentId, capabilities);
    
    console.log(`🤖 Registered agent: ${agentId} with capabilities: ${capabilities.skills.join(', ')}`);
  }

  /**
   * Get the best agent for a specific task domain
   */
  getBestAgentForTask(domain: string, language: string = 'fr'): string | null {
    let bestAgent: string | null = null;
    let bestScore = 0;

    for (const [agentId, capabilities] of this.agentCapabilities) {
      let score = 0;
      
      // Domain match
      if (capabilities.domain === domain) {
        score += 0.5;
      }
      
      // Language support
      if (capabilities.languages.includes(language)) {
        score += 0.3;
      }
      
      // Base confidence
      score += capabilities.confidence * 0.2;

      if (score > bestScore) {
        bestScore = score;
        bestAgent = agentId;
      }
    }

    return bestAgent;
  }

  private initializeAgents(): void {
    // Math specialist agent
    const mathAgent = agentFactory.createMathAgent();
    this.registerAgent('math_specialist', mathAgent, {
      domain: 'mathematics',
      skills: ['equation_solving', 'calculus', 'algebra', 'geometry', 'statistics'],
      confidence: 0.95,
      languages: ['fr', 'fr-qc', 'en'],
    });

    // Québécois conversation agent
    const quebecAgent = agentFactory.createQuebecoisAgent();
    this.registerAgent('quebec_specialist', quebecAgent, {
      domain: 'conversation',
      skills: ['cultural_context', 'casual_chat', 'language_teaching', 'social_interaction'],
      confidence: 0.9,
      languages: ['fr-qc', 'fr'],
    });

    // Educational tutor agent
    const tutorAgent = agentFactory.createTutorAgent();
    this.registerAgent('education_specialist', tutorAgent, {
      domain: 'education',
      skills: ['step_by_step_teaching', 'concept_explanation', 'adaptive_learning', 'assessment'],
      confidence: 0.92,
      languages: ['fr', 'fr-qc', 'en'],
    });

    // Logic and reasoning specialist
    const reasoningAgent = agentFactory.createAdvancedAgent({
      persona: 'expert',
      enableReasoningTraces: true,
      enableToolCalling: true,
      maxContextLength: 2048,
    });
    this.registerAgent('reasoning_specialist', reasoningAgent, {
      domain: 'logic',
      skills: ['logical_reasoning', 'problem_decomposition', 'critical_thinking', 'analysis'],
      confidence: 0.88,
      languages: ['fr', 'en'],
    });

    console.log(`🎭 Initialized ${this.agents.size} specialized agents`);
  }

  private async analyzeTaskComplexity(query: string): Promise<boolean> {
    // Analyze if task needs multiple agents
    const complexityIndicators = [
      // Multiple domains
      query.toLowerCase().includes('et') || query.toLowerCase().includes('and'),
      // Multiple questions
      (query.match(/\?/g) || []).length > 1,
      // Complex mathematical problems
      query.includes('système') || query.includes('system'),
      // Multi-step instructions
      query.includes('puis') || query.includes('then') || query.includes('ensuite'),
      // Comparative analysis
      query.includes('comparer') || query.includes('compare'),
    ];

    const complexityScore = complexityIndicators.filter(Boolean).length;
    
    // Also check length and domain mixing
    const isDomainMixed = this.detectMultipleDomains(query);
    const isLong = query.length > 200;

    return complexityScore >= 2 || isDomainMixed || isLong;
  }

  private detectMultipleDomains(query: string): boolean {
    const domains = {
      math: ['équation', 'calcul', 'mathématique', 'algebra', 'calculus'],
      social: ['salut', 'comment', 'merci', 'bonjour'],
      education: ['expliquer', 'apprendre', 'enseigner', 'comprendre'],
      logic: ['raisonnement', 'logique', 'preuve', 'argument'],
    };

    const detectedDomains = Object.entries(domains).filter(([domain, keywords]) =>
      keywords.some(keyword => query.toLowerCase().includes(keyword))
    );

    return detectedDomains.length > 1;
  }

  private async decomposeTask(query: string): Promise<TaskDecomposition> {
    // Intelligent task decomposition
    const subtasks: SubTask[] = [];
    let taskCounter = 1;

    // Simple decomposition logic (would be enhanced with Phi-4)
    if (query.includes('résoudre') && query.includes('expliquer')) {
      // Math problem + explanation
      subtasks.push({
        id: `subtask_${taskCounter++}`,
        description: 'Résoudre le problème mathématique',
        requiredAgent: 'math_specialist',
        dependencies: [],
        priority: 1,
        expectedDuration: 3000,
      });

      subtasks.push({
        id: `subtask_${taskCounter++}`,
        description: 'Expliquer la solution de manière pédagogique',
        requiredAgent: 'education_specialist',
        dependencies: ['subtask_1'],
        priority: 2,
        expectedDuration: 2000,
      });
    }

    if (query.includes('comparer') || query.includes('analyser')) {
      // Analysis tasks
      subtasks.push({
        id: `subtask_${taskCounter++}`,
        description: 'Analyser les différents aspects du problème',
        requiredAgent: 'reasoning_specialist',
        dependencies: [],
        priority: 1,
        expectedDuration: 4000,
      });
    }

    // If no specific decomposition, create a general analysis subtask
    if (subtasks.length === 0) {
      subtasks.push({
        id: `subtask_${taskCounter++}`,
        description: 'Traitement principal de la requête',
        requiredAgent: this.getBestAgentForTask('general') || 'education_specialist',
        dependencies: [],
        priority: 1,
        expectedDuration: 3000,
      });
    }

    return {
      originalTask: query,
      subtasks,
      executionOrder: subtasks.some(t => t.dependencies.length > 0) ? 'sequential' : 'parallel',
      estimatedComplexity: subtasks.length * 0.3 + (query.length / 100) * 0.7,
    };
  }

  private createExecutionPlan(decomposition: TaskDecomposition): ExecutionPlan {
    const plan: ExecutionPlan = {
      phases: [],
      totalEstimatedTime: 0,
    };

    if (decomposition.executionOrder === 'sequential') {
      // Create phases based on dependencies
      const phases: SubTask[][] = [];
      const processed = new Set<string>();
      
      while (processed.size < decomposition.subtasks.length) {
        const currentPhase = decomposition.subtasks.filter(task =>
          !processed.has(task.id) && 
          task.dependencies.every(dep => processed.has(dep))
        );
        
        if (currentPhase.length === 0) break; // Avoid infinite loop
        
        phases.push(currentPhase);
        currentPhase.forEach(task => processed.add(task.id));
      }
      
      plan.phases = phases;
    } else {
      // Parallel execution - all tasks in one phase
      plan.phases = [decomposition.subtasks];
    }

    plan.totalEstimatedTime = decomposition.subtasks.reduce(
      (total, task) => total + task.expectedDuration, 0
    );

    return plan;
  }

  private async executeSubtasks(
    decomposition: TaskDecomposition,
    plan: ExecutionPlan,
    sessionId: string,
    onProgress?: (update: OrchestrationUpdate) => void
  ): Promise<AgentExecution[]> {
    const executions: AgentExecution[] = [];

    for (let phaseIndex = 0; phaseIndex < plan.phases.length; phaseIndex++) {
      const phase = plan.phases[phaseIndex];
      
      this.emitProgress(onProgress, {
        type: 'phase_started',
        taskId: sessionId,
        data: { phase: phaseIndex + 1, totalPhases: plan.phases.length }
      });

      // Execute all tasks in current phase
      const phasePromises = phase.map(async (subtask) => {
        const execution: AgentExecution = {
          agentId: subtask.requiredAgent,
          subtaskId: subtask.id,
          status: 'pending',
          startTime: Date.now(),
        };

        try {
          execution.status = 'running';
          executions.push(execution);

          this.emitProgress(onProgress, {
            type: 'subtask_started',
            taskId: sessionId,
            data: { subtaskId: subtask.id, agent: subtask.requiredAgent }
          });

          const agent = this.agents.get(subtask.requiredAgent);
          if (!agent) {
            throw new Error(`Agent ${subtask.requiredAgent} not found`);
          }

          const result = await agent.processConversation(
            subtask.description,
            `${sessionId}_${subtask.id}`
          );

          execution.result = result;
          execution.status = 'completed';
          execution.endTime = Date.now();

          this.emitProgress(onProgress, {
            type: 'subtask_completed',
            taskId: sessionId,
            data: { 
              subtaskId: subtask.id, 
              confidence: result.confidence,
              duration: execution.endTime - execution.startTime!
            }
          });

        } catch (error) {
          execution.status = 'failed';
          execution.endTime = Date.now();
          
          ErrorHandler.logError(error as Error, `MultiAgentOrchestrator.executeSubtask.${subtask.id}`);
        }

        return execution;
      });

      // Wait for all tasks in phase to complete
      await Promise.all(phasePromises);
    }

    return executions;
  }

  private async synthesizeResults(
    originalQuery: string,
    decomposition: TaskDecomposition,
    executions: AgentExecution[]
  ): Promise<{ content: string; confidence: number }> {
    // Collect all successful results
    const successfulResults = executions
      .filter(e => e.status === 'completed' && e.result)
      .map(e => e.result!);

    if (successfulResults.length === 0) {
      return {
        content: "Je suis désolé, je n'ai pas pu traiter votre demande complètement.",
        confidence: 0.1,
      };
    }

    if (successfulResults.length === 1) {
      return {
        content: successfulResults[0].message.content,
        confidence: successfulResults[0].confidence,
      };
    }

    // Synthesize multiple results
    const synthesizedContent = this.combineResults(originalQuery, successfulResults);
    const averageConfidence = successfulResults.reduce(
      (sum, result) => sum + result.confidence, 0
    ) / successfulResults.length;

    return {
      content: synthesizedContent,
      confidence: averageConfidence,
    };
  }

  private combineResults(originalQuery: string, results: AgentResponse[]): string {
    // Intelligent result combination
    let combined = `Voici une réponse complète à votre question : "${originalQuery}"\n\n`;

    results.forEach((result, index) => {
      const agentType = this.identifyAgentType(result);
      combined += `**${agentType}:**\n${result.message.content}\n\n`;
    });

    combined += "Cette réponse combine l'expertise de plusieurs agents spécialisés pour vous offrir une analyse complète.";

    return combined;
  }

  private identifyAgentType(result: AgentResponse): string {
    // Identify agent type based on response characteristics
    const content = result.message.content.toLowerCase();
    
    if (content.includes('équation') || content.includes('calcul')) {
      return 'Analyse Mathématique';
    }
    if (content.includes('étape') || content.includes('expliquer')) {
      return 'Explication Pédagogique';
    }
    if (content.includes('raisonnement') || content.includes('logique')) {
      return 'Raisonnement Logique';
    }
    
    return 'Analyse Générale';
  }

  private async routeToSingleAgent(
    query: string,
    sessionId: string,
    taskId: string
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    
    // Determine best single agent
    const domain = this.detectPrimaryDomain(query);
    const bestAgentId = this.getBestAgentForTask(domain) || 'education_specialist';
    const agent = this.agents.get(bestAgentId)!;

    const result = await agent.processConversation(query, sessionId);
    
    const execution: AgentExecution = {
      agentId: bestAgentId,
      subtaskId: 'single_task',
      status: 'completed',
      result,
      startTime,
      endTime: Date.now(),
    };

    return {
      taskId,
      originalQuery: query,
      decomposition: {
        originalTask: query,
        subtasks: [{
          id: 'single_task',
          description: query,
          requiredAgent: bestAgentId,
          dependencies: [],
          priority: 1,
          expectedDuration: 3000,
        }],
        executionOrder: 'sequential',
        estimatedComplexity: 0.3,
      },
      executions: [execution],
      finalResult: result.message.content,
      confidence: result.confidence,
      totalDuration: Date.now() - startTime,
      agentsUsed: [bestAgentId],
    };
  }

  private detectPrimaryDomain(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('équation') || lowerQuery.includes('calcul') || lowerQuery.includes('mathématique')) {
      return 'mathematics';
    }
    if (lowerQuery.includes('expliquer') || lowerQuery.includes('apprendre') || lowerQuery.includes('comprendre')) {
      return 'education';
    }
    if (lowerQuery.includes('salut') || lowerQuery.includes('comment') || lowerQuery.includes('québécois')) {
      return 'conversation';
    }
    if (lowerQuery.includes('raisonnement') || lowerQuery.includes('logique') || lowerQuery.includes('analyser')) {
      return 'logic';
    }
    
    return 'general';
  }

  private emitProgress(
    callback: ((update: OrchestrationUpdate) => void) | undefined,
    update: OrchestrationUpdate
  ): void {
    if (callback) callback(update);
    this.emit('progress', update);
  }

  // Getters and utilities
  getRegisteredAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  getAgentCapabilities(agentId: string): AgentCapability | undefined {
    return this.agentCapabilities.get(agentId);
  }

  getTaskHistory(): OrchestrationResult[] {
    return this.taskHistory.slice(-10); // Last 10 tasks
  }
}

// Supporting interfaces
interface ExecutionPlan {
  phases: SubTask[][];
  totalEstimatedTime: number;
}

export interface OrchestrationUpdate {
  type: 'task_decomposed' | 'phase_started' | 'subtask_started' | 'subtask_completed' | 'synthesis_started';
  taskId: string;
  data: any;
}

// Export singleton instance
export const multiAgentOrchestrator = new MultiAgentOrchestrator();

export default MultiAgentOrchestrator;
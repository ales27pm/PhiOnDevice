/**
 * Dialogue Management System
 * 
 * Orchestrates conversation flow, state tracking, and system prompt engineering
 * for the advanced agent architecture.
 */

import { 
  IDialogueManager, 
  AgentMessage, 
  AgentResponse, 
  SessionState, 
  UserPreferences,
  AgentConfig,
  ReasoningTrace
} from './AgentCore';
import { Analytics } from '../utils/analytics';
import { ErrorHandler } from '../utils/errorHandler';

export interface DialogueContext {
  currentTopic?: string;
  conversationHistory: AgentMessage[];
  userModel: UserModel;
  conversationFlow: ConversationFlow;
}

export interface UserModel {
  knowledgeLevel: 'beginner' | 'intermediate' | 'advanced';
  interests: string[];
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  preferredPace: 'slow' | 'normal' | 'fast';
  commonMistakes: string[];
}

export interface ConversationFlow {
  currentPhase: 'greeting' | 'problem_analysis' | 'teaching' | 'practice' | 'wrap_up';
  subGoals: string[];
  completedGoals: string[];
  nextActions: string[];
}

export class DialogueManager implements IDialogueManager {
  private sessions: Map<string, SessionState> = new Map();
  private dialogueContexts: Map<string, DialogueContext> = new Map();
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    console.log('💬 Dialogue Manager initialized');
  }

  async processConversationTurn(
    userInput: string,
    sessionId: string
  ): Promise<AgentResponse> {
    try {
      // Get or create session state
      let sessionState = await this.getSessionState(sessionId);
      if (!sessionState) {
        sessionState = this.createNewSession(sessionId);
      }

      // Get dialogue context
      let context = this.dialogueContexts.get(sessionId);
      if (!context) {
        context = this.initializeDialogueContext(sessionState);
        this.dialogueContexts.set(sessionId, context);
      }

      // Update session activity
      sessionState.lastInteraction = Date.now();

      // Analyze conversation state and generate system prompt
      const systemPrompt = this.generateSystemPrompt(context, sessionState);
      
      // Determine conversation strategy
      const strategy = this.determineConversationStrategy(userInput, context);
      
      // Generate response based on strategy
      const response = await this.generateContextualResponse(
        userInput,
        context,
        sessionState,
        strategy,
        systemPrompt
      );

      // Update conversation flow
      this.updateConversationFlow(context, userInput, response);

      // Update session state
      await this.updateSessionState(sessionId, {
        lastInteraction: Date.now(),
        currentTopic: context.currentTopic,
      });

      Analytics.track('dialogue_turn_processed', {
        sessionId,
        strategy: strategy.type,
        phase: context.conversationFlow.currentPhase,
        language: sessionState.language,
      });

      return response;

    } catch (error) {
      ErrorHandler.logError(error as Error, 'DialogueManager.processConversationTurn');
      
      // Fallback response
      return this.generateFallbackResponse(sessionId);
    }
  }

  async updateSessionState(
    sessionId: string, 
    state: Partial<SessionState>
  ): Promise<void> {
    const currentState = this.sessions.get(sessionId);
    if (currentState) {
      this.sessions.set(sessionId, { ...currentState, ...state });
    }
  }

  async getSessionState(sessionId: string): Promise<SessionState> {
    return this.sessions.get(sessionId) || this.createNewSession(sessionId);
  }

  private createNewSession(sessionId: string): SessionState {
    const newSession: SessionState = {
      sessionId,
      lastInteraction: Date.now(),
      preferences: {
        preferredLanguage: this.config.language,
        explanationLevel: 'detailed',
        mathNotation: 'simple',
        personalityStyle: 'friendly',
      },
      conversationMode: 'educational',
      language: this.config.language,
    };

    this.sessions.set(sessionId, newSession);
    return newSession;
  }

  private initializeDialogueContext(sessionState: SessionState): DialogueContext {
    return {
      conversationHistory: [],
      userModel: {
        knowledgeLevel: 'intermediate',
        interests: [],
        learningStyle: 'reading',
        preferredPace: 'normal',
        commonMistakes: [],
      },
      conversationFlow: {
        currentPhase: 'greeting',
        subGoals: [],
        completedGoals: [],
        nextActions: ['establish_rapport', 'understand_needs'],
      },
    };
  }

  private generateSystemPrompt(
    context: DialogueContext,
    sessionState: SessionState
  ): string {
    const { language, preferences, conversationMode } = sessionState;
    const { currentPhase } = context.conversationFlow;
    const { knowledgeLevel, learningStyle } = context.userModel;

    let basePrompt = '';
    
    // Language-specific system prompt
    if (language === 'fr' || language === 'fr-qc') {
      basePrompt = language === 'fr-qc' 
        ? `<|system|>Tu es un assistant québécois chaleureux et patient, spécialisé en mathématiques et raisonnement logique. Tu parles français québécois de façon naturelle et amicale.`
        : `<|system|>Tu es un assistant français patient et pédagogue, spécialisé en mathématiques et raisonnement logique.`;
    } else {
      basePrompt = `<|system|>You are a patient and knowledgeable tutor specializing in mathematics and logical reasoning.`;
    }

    // Add persona and conversation mode
    const personalityPrompts = {
      'friendly': language.startsWith('fr') 
        ? ' Tu es décontracté et encourageant, utilisant un ton amical.'
        : ' You are casual and encouraging, using a friendly tone.',
      'formal': language.startsWith('fr')
        ? ' Tu maintiens un ton professionnel et respectueux.'
        : ' You maintain a professional and respectful tone.',
      'enthusiastic': language.startsWith('fr')
        ? ' Tu es enthousiaste et motivant, montrant de la passion pour les mathématiques.'
        : ' You are enthusiastic and motivating, showing passion for mathematics.',
    };

    basePrompt += personalityPrompts[preferences.personalityStyle];

    // Add conversation phase context
    const phasePrompts = {
      'greeting': language.startsWith('fr')
        ? ' Tu accueilles chaleureusement et cherches à comprendre les besoins.'
        : ' You warmly welcome and seek to understand the user\'s needs.',
      'problem_analysis': language.startsWith('fr')
        ? ' Tu analyses le problème étape par étape de manière méthodique.'
        : ' You analyze the problem step by step in a methodical way.',
      'teaching': language.startsWith('fr')
        ? ' Tu expliques les concepts clairement avec des exemples concrets.'
        : ' You explain concepts clearly with concrete examples.',
      'practice': language.startsWith('fr')
        ? ' Tu guides à travers la pratique avec encouragements.'
        : ' You guide through practice with encouragement.',
      'wrap_up': language.startsWith('fr')
        ? ' Tu résumes les points clés et proposes des étapes suivantes.'
        : ' You summarize key points and suggest next steps.',
    };

    basePrompt += phasePrompts[currentPhase];

    // Add ReAct prompting instructions
    const reactInstructions = language.startsWith('fr')
      ? `

Utilise le format ReAct pour ton raisonnement:
- <think>Réflexion interne sur le problème</think>
- <act>Action à entreprendre ou outil à utiliser</act>
- <observe>Observation des résultats</observe>

Si tu as besoin d'outils externes, utilise ce format JSON:
<tool>{"name": "nom_outil", "arguments": {"param": "valeur"}}</tool>`
      : `

Use the ReAct format for your reasoning:
- <think>Internal reasoning about the problem</think>
- <act>Action to take or tool to use</act>
- <observe>Observation of results</observe>

If you need external tools, use this JSON format:
<tool>{"name": "tool_name", "arguments": {"param": "value"}}</tool>`;

    basePrompt += reactInstructions;

    // Add knowledge level adaptation
    const levelPrompts = {
      'beginner': language.startsWith('fr')
        ? ' Adapte tes explications pour un niveau débutant avec beaucoup d\'exemples.'
        : ' Adapt your explanations for beginner level with many examples.',
      'intermediate': language.startsWith('fr')
        ? ' Utilise un niveau intermédiaire avec un bon équilibre théorie/pratique.'
        : ' Use intermediate level with good balance of theory and practice.',
      'advanced': language.startsWith('fr')
        ? ' Tu peux utiliser des concepts avancés et un raisonnement sophistiqué.'
        : ' You can use advanced concepts and sophisticated reasoning.',
    };

    basePrompt += levelPrompts[knowledgeLevel];

    basePrompt += '<|end|>';

    return basePrompt;
  }

  private determineConversationStrategy(
    userInput: string,
    context: DialogueContext
  ): ConversationStrategy {
    const input = userInput.toLowerCase();
    
    // Detect question types
    if (input.includes('résoudre') || input.includes('solve') || input.includes('=')) {
      return {
        type: 'problem_solving',
        approach: 'step_by_step',
        toolsNeeded: ['calculator', 'graph_plotter'],
      };
    }
    
    if (input.includes('expliquer') || input.includes('explain') || input.includes('comment')) {
      return {
        type: 'explanation',
        approach: 'conceptual',
        toolsNeeded: ['knowledge_base'],
      };
    }
    
    if (input.includes('exemple') || input.includes('example')) {
      return {
        type: 'demonstration',
        approach: 'example_based',
        toolsNeeded: ['example_generator'],
      };
    }

    // Check conversation flow
    if (context.conversationFlow.currentPhase === 'greeting') {
      return {
        type: 'greeting',
        approach: 'rapport_building',
        toolsNeeded: [],
      };
    }

    // Default strategy
    return {
      type: 'general_assistance',
      approach: 'adaptive',
      toolsNeeded: ['knowledge_base'],
    };
  }

  private async generateContextualResponse(
    userInput: string,
    context: DialogueContext,
    sessionState: SessionState,
    strategy: ConversationStrategy,
    systemPrompt: string
  ): Promise<AgentResponse> {
    
    // Build conversation context
    const conversationContext = this.buildConversationContext(
      context.conversationHistory,
      sessionState.preferences
    );

    // Create the full prompt
    const fullPrompt = `${systemPrompt}
${conversationContext}
<|user|>${userInput}<|end|>
<|assistant|>`;

    // Generate reasoning traces based on strategy
    const reasoning: ReasoningTrace[] = [
      {
        step: 1,
        type: 'think',
        content: `Stratégie de conversation: ${strategy.type} avec approche ${strategy.approach}`,
        confidence: 0.9,
      },
      {
        step: 2,
        type: 'think',
        content: `Phase actuelle: ${context.conversationFlow.currentPhase}`,
        confidence: 0.85,
      },
    ];

    // Generate response based on strategy
    let responseContent = '';
    let confidence = 0.8;

    switch (strategy.type) {
      case 'problem_solving':
        responseContent = await this.generateProblemSolvingResponse(userInput, context);
        reasoning.push({
          step: 3,
          type: 'act',
          content: 'Génération d\'une réponse de résolution de problème étape par étape',
          confidence: 0.9,
        });
        break;

      case 'explanation':
        responseContent = await this.generateExplanationResponse(userInput, context);
        reasoning.push({
          step: 3,
          type: 'act',
          content: 'Génération d\'une explication conceptuelle adaptée',
          confidence: 0.85,
        });
        break;

      case 'greeting':
        responseContent = await this.generateGreetingResponse(userInput, sessionState);
        reasoning.push({
          step: 3,
          type: 'act',
          content: 'Génération d\'un accueil chaleureux et contextuel',
          confidence: 0.95,
        });
        break;

      default:
        responseContent = await this.generateGeneralResponse(userInput, context);
        reasoning.push({
          step: 3,
          type: 'act',
          content: 'Génération d\'une réponse générale adaptative',
          confidence: 0.7,
        });
    }

    const response: AgentResponse = {
      message: {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: Date.now(),
        metadata: {
          reasoning,
          confidence,
        },
      },
      reasoning,
      confidence,
    };

    return response;
  }

  private buildConversationContext(
    history: AgentMessage[],
    preferences: UserPreferences
  ): string {
    // Include last few messages for context
    const recentMessages = history.slice(-6);
    
    return recentMessages.map(msg => 
      `<|${msg.role}|>${msg.content}<|end|>`
    ).join('\n');
  }

  private async generateProblemSolvingResponse(
    userInput: string,
    context: DialogueContext
  ): Promise<string> {
    // This would integrate with the Phi-4 reasoning engine
    return `<think>L'utilisateur me présente un problème mathématique. Je vais l'aborder méthodiquement.</think>

Je vais résoudre ce problème étape par étape :

<act>Analyse du problème</act>
<observe>Le problème demande de trouver une solution mathématique</observe>

**Étape 1 : Identification**
Je commence par identifier les éléments clés du problème.

**Étape 2 : Stratégie**
Je choisis la méthode de résolution la plus appropriée.

**Étape 3 : Résolution**
J'applique la méthode choisie de manière systématique.

**Étape 4 : Vérification**
Je vérifie ma solution en la substituant dans l'équation originale.

Voulez-vous que je détaille une étape particulière ?`;
  }

  private async generateExplanationResponse(
    userInput: string,
    context: DialogueContext
  ): Promise<string> {
    return `<think>L'utilisateur cherche une explication. Je vais adapter mon niveau selon son profil.</think>

Excellente question ! Laissez-moi vous expliquer ce concept de manière claire :

**Concept principal :**
[Explication du concept de base]

**Pourquoi c'est important :**
[Contexte et applications]

**Exemple concret :**
[Exemple pratique et relatable]

**Connection avec d'autres concepts :**
[Liens vers des notions connexes]

Est-ce que cette explication répond à votre question, ou souhaitez-vous que j'approfondisse un aspect particulier ?`;
  }

  private async generateGreetingResponse(
    userInput: string,
    sessionState: SessionState
  ): Promise<string> {
    const isQuebecois = sessionState.language === 'fr-qc';
    
    if (isQuebecois) {
      return `Salut ! Ça va bien ? Je suis ici pour t'aider avec tes questions de mathématiques pis de logique. 

Que ce soit pour résoudre des équations, comprendre des concepts, ou juste jasер de maths, je suis là pour toi !

Qu'est-ce qui t'amène aujourd'hui ? As-tu un problème particulier ou quelque chose que tu veux explorer ?`;
    } else {
      return `Bonjour ! Je suis ravi de vous rencontrer. Je suis spécialisé en mathématiques et raisonnement logique.

Je peux vous aider à :
- Résoudre des équations et problèmes
- Expliquer des concepts mathématiques
- Développer votre raisonnement logique

Qu'est-ce qui vous intéresse aujourd'hui ?`;
    }
  }

  private async generateGeneralResponse(
    userInput: string,
    context: DialogueContext
  ): Promise<string> {
    return `<think>Question générale. Je vais fournir une réponse utile et encourageante.</think>

Je comprends votre question. Laissez-moi vous aider avec ça.

<act>Adaptation de ma réponse au contexte</act>

[Réponse contextuelle basée sur l'historique et les préférences]

Y a-t-il autre chose que je puisse clarifier pour vous ?`;
  }

  private updateConversationFlow(
    context: DialogueContext,
    userInput: string,
    response: AgentResponse
  ): void {
    const flow = context.conversationFlow;
    
    // Update conversation phase based on interaction
    if (flow.currentPhase === 'greeting' && userInput.length > 10) {
      flow.currentPhase = 'problem_analysis';
      flow.nextActions = ['understand_problem', 'plan_solution'];
    }
    
    if (userInput.includes('merci') || userInput.includes('thank')) {
      flow.currentPhase = 'wrap_up';
      flow.nextActions = ['summarize', 'suggest_next_steps'];
    }

    // Track completed goals
    if (response.confidence > 0.8) {
      flow.completedGoals.push(`helped_with_${Date.now()}`);
    }
  }

  private generateFallbackResponse(sessionId: string): AgentResponse {
    return {
      message: {
        id: `fallback_${Date.now()}`,
        role: 'assistant',
        content: "Je suis désolé, j'ai rencontré une difficulté. Pouvez-vous reformuler votre question ?",
        timestamp: Date.now(),
      },
      confidence: 0.1,
      reasoning: [{
        step: 1,
        type: 'observe',
        content: 'Fallback response generated due to processing error',
        confidence: 0.1,
      }],
    };
  }
}

interface ConversationStrategy {
  type: 'problem_solving' | 'explanation' | 'demonstration' | 'greeting' | 'general_assistance';
  approach: 'step_by_step' | 'conceptual' | 'example_based' | 'rapport_building' | 'adaptive';
  toolsNeeded: string[];
}

export default DialogueManager;
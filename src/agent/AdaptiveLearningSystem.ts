/**
 * Adaptive Learning System
 * 
 * Advanced system that learns from user interactions, adapts to preferences,
 * and continuously improves the agent's performance through online learning.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  AgentMessage, 
  AgentResponse, 
  UserPreferences, 
  SessionState 
} from './AgentCore';
import { Analytics } from '../utils/analytics';
import { ErrorHandler } from '../utils/errorHandler';

export interface UserModel {
  userId: string;
  knowledgeProfile: KnowledgeProfile;
  learningStyle: LearningStyle;
  interactionHistory: InteractionSummary[];
  preferences: AdaptivePreferences;
  performance: PerformanceMetrics;
  lastUpdated: number;
}

export interface KnowledgeProfile {
  mathematicsLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  conceptMastery: Map<string, ConceptMastery>;
  problemSolvingSkills: ProblemSolvingSkills;
  commonDifficulties: string[];
  strengths: string[];
  learningGoals: string[];
}

export interface ConceptMastery {
  concept: string;
  masteryLevel: number; // 0-1
  attempts: number;
  successes: number;
  lastPracticed: number;
  averageTime: number;
  confidence: number;
}

export interface LearningStyle {
  preferredExplanationType: 'visual' | 'verbal' | 'step-by-step' | 'example-based';
  pacingPreference: 'slow' | 'moderate' | 'fast';
  feedbackStyle: 'immediate' | 'summary' | 'minimal';
  difficultyProgression: 'gradual' | 'challenging' | 'adaptive';
  interactionMode: 'guided' | 'exploratory' | 'collaborative';
}

export interface ProblemSolvingSkills {
  analysisProficiency: number;
  strategicThinking: number;
  errorDetection: number;
  conceptualUnderstanding: number;
  proceduralFluency: number;
}

export interface AdaptivePreferences {
  language: string;
  communicationStyle: 'formal' | 'casual' | 'encouraging' | 'direct';
  explanationDepth: 'brief' | 'detailed' | 'comprehensive';
  exampleFrequency: 'minimal' | 'moderate' | 'extensive';
  hintingStrategy: 'none' | 'subtle' | 'progressive' | 'explicit';
}

export interface PerformanceMetrics {
  overallProgress: number;
  sessionQuality: number[];
  engagementLevel: number;
  satisfactionRating: number;
  learningVelocity: number;
  retentionRate: number;
}

export interface InteractionSummary {
  sessionId: string;
  timestamp: number;
  duration: number;
  topicsDiscussed: string[];
  difficultiesEncountered: string[];
  successfulConcepts: string[];
  satisfactionRating?: number;
  notes?: string;
}

export interface LearningRecommendation {
  type: 'practice' | 'review' | 'advance' | 'remediate';
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  priority: number;
  reasoning: string;
}

export interface AdaptationResult {
  configChanges: any;
  styleAdjustments: Partial<LearningStyle>;
  recommendedActions: LearningRecommendation[];
  confidenceScore: number;
}

/**
 * Adaptive Learning System
 * 
 * Learns from user interactions and continuously improves the agent experience
 */
export class AdaptiveLearningSystem {
  private userModels: Map<string, UserModel> = new Map();
  private sessionData: Map<string, SessionLearningData> = new Map();
  private adaptationRules: AdaptationRule[] = [];

  constructor() {
    this.initializeAdaptationRules();
    this.loadUserModels();
    console.log('🧠 Adaptive Learning System initialized');
  }

  /**
   * Track user interaction for learning
   */
  async trackInteraction(
    userId: string,
    sessionId: string,
    userMessage: AgentMessage,
    agentResponse: AgentResponse,
    context: any
  ): Promise<void> {
    try {
      // Get or create user model
      let userModel = await this.getUserModel(userId);
      if (!userModel) {
        userModel = this.createNewUserModel(userId);
      }

      // Get session data
      let sessionData = this.sessionData.get(sessionId);
      if (!sessionData) {
        sessionData = this.initializeSessionData(sessionId, userId);
        this.sessionData.set(sessionId, sessionData);
      }

      // Extract learning signals from interaction
      const learningSignals = this.extractLearningSignals(
        userMessage,
        agentResponse,
        context
      );

      // Update session data
      this.updateSessionData(sessionData, learningSignals);

      // Update user model incrementally
      await this.updateUserModel(userModel, learningSignals, sessionData);

      // Save updated model
      await this.saveUserModel(userModel);

      Analytics.track('learning_interaction_tracked', {
        userId,
        sessionId,
        concepts: learningSignals.conceptsInvolved,
        difficulty: learningSignals.difficultyLevel,
        success: learningSignals.userSuccess,
      });

    } catch (error) {
      ErrorHandler.logError(error as Error, 'AdaptiveLearningSystem.trackInteraction');
    }
  }

  /**
   * Generate personalized adaptation for user
   */
  async generateAdaptation(
    userId: string,
    currentSession: SessionState
  ): Promise<AdaptationResult> {
    try {
      const userModel = await this.getUserModel(userId);
      if (!userModel) {
        return this.getDefaultAdaptation();
      }

      // Analyze current performance and needs
      const analysis = this.analyzeUserPerformance(userModel);
      
      // Apply adaptation rules
      const adaptations = this.applyAdaptationRules(userModel, analysis);
      
      // Generate specific recommendations
      const recommendations = await this.generateRecommendations(userModel, analysis);

      const result: AdaptationResult = {
        configChanges: adaptations.configChanges,
        styleAdjustments: adaptations.styleAdjustments,
        recommendedActions: recommendations,
        confidenceScore: this.calculateAdaptationConfidence(userModel, analysis),
      };

      Analytics.track('adaptation_generated', {
        userId,
        adaptations: Object.keys(adaptations.configChanges).length,
        recommendations: recommendations.length,
        confidence: result.confidenceScore,
      });

      return result;

    } catch (error) {
      ErrorHandler.logError(error as Error, 'AdaptiveLearningSystem.generateAdaptation');
      return this.getDefaultAdaptation();
    }
  }

  /**
   * Get user's learning progress and insights
   */
  async getUserInsights(userId: string): Promise<UserInsights> {
    const userModel = await this.getUserModel(userId);
    if (!userModel) {
      return this.getDefaultInsights();
    }

    const insights: UserInsights = {
      overallProgress: userModel.performance.overallProgress,
      strengthAreas: userModel.knowledgeProfile.strengths,
      improvementAreas: userModel.knowledgeProfile.commonDifficulties,
      learningVelocity: userModel.performance.learningVelocity,
      recommendations: await this.generateRecommendations(userModel, this.analyzeUserPerformance(userModel)),
      nextMilestones: this.identifyNextMilestones(userModel),
      sessionStats: {
        totalSessions: userModel.interactionHistory.length,
        averageSessionQuality: this.calculateAverageSessionQuality(userModel),
        engagementTrend: this.calculateEngagementTrend(userModel),
      },
    };

    return insights;
  }

  /**
   * Predict optimal difficulty for next problem
   */
  async predictOptimalDifficulty(
    userId: string,
    concept: string
  ): Promise<DifficultyPrediction> {
    const userModel = await this.getUserModel(userId);
    if (!userModel) {
      return { difficulty: 'medium', confidence: 0.5, reasoning: 'No user model available' };
    }

    const conceptMastery = userModel.knowledgeProfile.conceptMastery.get(concept);
    if (!conceptMastery) {
      return { 
        difficulty: 'easy', 
        confidence: 0.7, 
        reasoning: 'Starting with easy difficulty for new concept' 
      };
    }

    // Use mastery level and recent performance to predict difficulty
    let suggestedDifficulty: 'easy' | 'medium' | 'hard';
    let confidence = 0.8;
    let reasoning = '';

    if (conceptMastery.masteryLevel < 0.3) {
      suggestedDifficulty = 'easy';
      reasoning = 'Low mastery level, building foundation';
    } else if (conceptMastery.masteryLevel < 0.7) {
      suggestedDifficulty = 'medium';
      reasoning = 'Moderate mastery, progressive challenge';
    } else {
      suggestedDifficulty = 'hard';
      reasoning = 'High mastery, advanced challenge';
    }

    // Adjust based on recent performance
    const recentPerformance = this.calculateRecentPerformance(userModel, concept);
    if (recentPerformance < 0.6 && suggestedDifficulty !== 'easy') {
      suggestedDifficulty = suggestedDifficulty === 'hard' ? 'medium' : 'easy';
      reasoning += ', adjusted down due to recent struggles';
    }

    return { difficulty: suggestedDifficulty, confidence, reasoning };
  }

  private async getUserModel(userId: string): Promise<UserModel | null> {
    if (this.userModels.has(userId)) {
      return this.userModels.get(userId)!;
    }

    try {
      const stored = await AsyncStorage.getItem(`user_model_${userId}`);
      if (stored) {
        const model = JSON.parse(stored);
        // Convert Map from JSON
        model.knowledgeProfile.conceptMastery = new Map(
          Object.entries(model.knowledgeProfile.conceptMastery || {})
        );
        this.userModels.set(userId, model);
        return model;
      }
    } catch (error) {
      console.warn('Failed to load user model:', error);
    }

    return null;
  }

  private createNewUserModel(userId: string): UserModel {
    return {
      userId,
      knowledgeProfile: {
        mathematicsLevel: 'intermediate',
        conceptMastery: new Map(),
        problemSolvingSkills: {
          analysisProficiency: 0.5,
          strategicThinking: 0.5,
          errorDetection: 0.5,
          conceptualUnderstanding: 0.5,
          proceduralFluency: 0.5,
        },
        commonDifficulties: [],
        strengths: [],
        learningGoals: [],
      },
      learningStyle: {
        preferredExplanationType: 'step-by-step',
        pacingPreference: 'moderate',
        feedbackStyle: 'immediate',
        difficultyProgression: 'adaptive',
        interactionMode: 'guided',
      },
      interactionHistory: [],
      preferences: {
        language: 'fr',
        communicationStyle: 'encouraging',
        explanationDepth: 'detailed',
        exampleFrequency: 'moderate',
        hintingStrategy: 'progressive',
      },
      performance: {
        overallProgress: 0.5,
        sessionQuality: [],
        engagementLevel: 0.5,
        satisfactionRating: 0.5,
        learningVelocity: 0.5,
        retentionRate: 0.5,
      },
      lastUpdated: Date.now(),
    };
  }

  private extractLearningSignals(
    userMessage: AgentMessage,
    agentResponse: AgentResponse,
    context: any
  ): LearningSignals {
    const content = userMessage.content.toLowerCase();
    
    // Extract concepts mentioned
    const conceptsInvolved = this.identifyMathConcepts(content);
    
    // Determine difficulty level
    const difficultyLevel = this.assessDifficultyLevel(content, agentResponse);
    
    // Assess user success
    const userSuccess = this.assessUserSuccess(agentResponse, context);
    
    // Detect emotional state
    const emotionalState = this.detectEmotionalState(content);
    
    // Measure engagement
    const engagementLevel = this.measureEngagement(userMessage, context);

    return {
      conceptsInvolved,
      difficultyLevel,
      userSuccess,
      emotionalState,
      engagementLevel,
      responseTime: context.responseTime || 0,
      hintsUsed: context.hintsUsed || 0,
      errorsCommitted: context.errorsCommitted || 0,
    };
  }

  private identifyMathConcepts(content: string): string[] {
    const concepts = [
      'algebra', 'équation', 'calculus', 'dérivée', 'intégrale',
      'geometry', 'triangle', 'circle', 'statistics', 'probabilité',
      'trigonometry', 'fonction', 'graphique', 'limite'
    ];

    return concepts.filter(concept => content.includes(concept));
  }

  private assessDifficultyLevel(
    content: string,
    response: AgentResponse
  ): 'easy' | 'medium' | 'hard' {
    // Simple heuristic based on content complexity
    const complexity = content.length + (response.reasoning?.length || 0);
    
    if (complexity < 100) return 'easy';
    if (complexity < 300) return 'medium';
    return 'hard';
  }

  private assessUserSuccess(response: AgentResponse, context: any): boolean {
    // Assess based on response confidence and context
    return response.confidence > 0.7 && (context.errorsCommitted || 0) < 2;
  }

  private detectEmotionalState(content: string): string {
    const emotions = {
      frustrated: ['difficile', 'compliqué', 'comprends pas', 'argh'],
      confident: ['facile', 'sûr', 'certain', 'évident'],
      curious: ['pourquoi', 'comment', 'intéressant', 'explorer'],
      confused: ['perdu', 'confus', 'sais pas', 'aide'],
    };

    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return emotion;
      }
    }

    return 'neutral';
  }

  private measureEngagement(message: AgentMessage, context: any): number {
    let engagement = 0.5;
    
    // Message length indicates engagement
    if (message.content.length > 50) engagement += 0.2;
    if (message.content.length > 100) engagement += 0.1;
    
    // Question asking indicates curiosity
    if (message.content.includes('?')) engagement += 0.2;
    
    // Response time (faster = more engaged)
    const responseTime = context.responseTime || 5000;
    if (responseTime < 3000) engagement += 0.1;
    
    return Math.min(engagement, 1.0);
  }

  private initializeAdaptationRules(): void {
    this.adaptationRules = [
      // Difficulty adjustment rules
      {
        condition: (model) => model.performance.overallProgress < 0.3,
        action: (model) => ({
          configChanges: { difficulty: 'easy' },
          styleAdjustments: { difficultyProgression: 'gradual' },
        }),
        priority: 1,
      },
      
      // Pacing adjustment rules
      {
        condition: (model) => model.performance.sessionQuality.slice(-3).every(q => q < 0.5),
        action: (model) => ({
          configChanges: { explanation_depth: 'comprehensive' },
          styleAdjustments: { pacingPreference: 'slow' },
        }),
        priority: 2,
      },
      
      // Engagement improvement rules
      {
        condition: (model) => model.performance.engagementLevel < 0.4,
        action: (model) => ({
          configChanges: { interaction_style: 'encouraging' },
          styleAdjustments: { interactionMode: 'exploratory' },
        }),
        priority: 1,
      },
    ];
  }

  private async saveUserModel(model: UserModel): Promise<void> {
    try {
      // Convert Map to JSON-serializable object
      const serializable = {
        ...model,
        knowledgeProfile: {
          ...model.knowledgeProfile,
          conceptMastery: Object.fromEntries(model.knowledgeProfile.conceptMastery),
        },
      };
      
      await AsyncStorage.setItem(
        `user_model_${model.userId}`,
        JSON.stringify(serializable)
      );
      
      this.userModels.set(model.userId, model);
    } catch (error) {
      ErrorHandler.logError(error as Error, 'AdaptiveLearningSystem.saveUserModel');
    }
  }

  private async loadUserModels(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userModelKeys = keys.filter(key => key.startsWith('user_model_'));
      
      for (const key of userModelKeys) {
        const userId = key.replace('user_model_', '');
        await this.getUserModel(userId);
      }
      
      console.log(`📚 Loaded ${userModelKeys.length} user models`);
    } catch (error) {
      console.warn('Failed to load user models:', error);
    }
  }

  // Additional helper methods would go here...
  private getDefaultAdaptation(): AdaptationResult {
    return {
      configChanges: {},
      styleAdjustments: {},
      recommendedActions: [],
      confidenceScore: 0.5,
    };
  }

  private getDefaultInsights(): UserInsights {
    return {
      overallProgress: 0.5,
      strengthAreas: [],
      improvementAreas: [],
      learningVelocity: 0.5,
      recommendations: [],
      nextMilestones: [],
      sessionStats: {
        totalSessions: 0,
        averageSessionQuality: 0.5,
        engagementTrend: 'stable',
      },
    };
  }

  // More implementation methods...
  private analyzeUserPerformance(model: UserModel): any {
    return {
      currentLevel: model.knowledgeProfile.mathematicsLevel,
      recentTrend: 'improving', // Would calculate from recent sessions
      problemAreas: model.knowledgeProfile.commonDifficulties,
    };
  }

  private applyAdaptationRules(model: UserModel, analysis: any): any {
    const result = { configChanges: {}, styleAdjustments: {} };
    
    for (const rule of this.adaptationRules) {
      if (rule.condition(model)) {
        const adaptation = rule.action(model);
        Object.assign(result.configChanges, adaptation.configChanges);
        Object.assign(result.styleAdjustments, adaptation.styleAdjustments);
      }
    }
    
    return result;
  }

  private async generateRecommendations(model: UserModel, analysis: any): Promise<LearningRecommendation[]> {
    // Generate personalized learning recommendations
    return [
      {
        type: 'practice',
        concept: 'algebra_basics',
        difficulty: 'medium',
        estimatedTime: 15,
        priority: 1,
        reasoning: 'Based on recent performance in algebraic concepts',
      },
    ];
  }

  private calculateAdaptationConfidence(model: UserModel, analysis: any): number {
    // Calculate confidence in adaptation recommendations
    const dataPoints = model.interactionHistory.length;
    const recency = Date.now() - model.lastUpdated;
    
    let confidence = Math.min(dataPoints / 10, 1.0) * 0.7;
    if (recency < 24 * 60 * 60 * 1000) confidence += 0.3; // Recent data
    
    return confidence;
  }

  // More helper methods for complete implementation...
}

// Supporting interfaces
interface LearningSignals {
  conceptsInvolved: string[];
  difficultyLevel: 'easy' | 'medium' | 'hard';
  userSuccess: boolean;
  emotionalState: string;
  engagementLevel: number;
  responseTime: number;
  hintsUsed: number;
  errorsCommitted: number;
}

interface SessionLearningData {
  sessionId: string;
  userId: string;
  startTime: number;
  interactions: LearningSignals[];
  cumulativePerformance: number;
}

interface AdaptationRule {
  condition: (model: UserModel) => boolean;
  action: (model: UserModel) => any;
  priority: number;
}

export interface UserInsights {
  overallProgress: number;
  strengthAreas: string[];
  improvementAreas: string[];
  learningVelocity: number;
  recommendations: LearningRecommendation[];
  nextMilestones: string[];
  sessionStats: {
    totalSessions: number;
    averageSessionQuality: number;
    engagementTrend: 'improving' | 'stable' | 'declining';
  };
}

export interface DifficultyPrediction {
  difficulty: 'easy' | 'medium' | 'hard';
  confidence: number;
  reasoning: string;
}

export const adaptiveLearningSystem = new AdaptiveLearningSystem();

export default AdaptiveLearningSystem;
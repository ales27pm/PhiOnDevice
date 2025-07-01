/**
 * Advanced Agent Interface Component
 * 
 * React Native interface for the sophisticated modular agent system
 * with ReAct reasoning, tool calling, and Québécois French support.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeInUp,
  Layout,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { agentFactory } from '../agent/AgentFactory';
import { 
  AdvancedAgent, 
  AgentMessage, 
  ReasoningTrace, 
  ToolCall, 
  AgentResponse 
} from '../agent/AgentCore';
import { cn } from '../utils/cn';
import { Analytics } from '../utils/analytics';
import SystemStatusDebug from './SystemStatusDebug';
import GitHubStatusDebug from './GitHubStatusDebug';

interface ConversationMessage extends AgentMessage {
  isStreaming?: boolean;
  reasoningSteps?: ReasoningTrace[];
  toolsUsed?: string[];
}

export default function AdvancedAgentInterface() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Agent and conversation state
  const [agent, setAgent] = useState<AdvancedAgent | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReasoningSteps, setShowReasoningSteps] = useState(true);
  const [agentMode, setAgentMode] = useState<'math' | 'quebec' | 'tutor'>('tutor');
  const [systemStatus, setSystemStatus] = useState<any>(null);
  
  // Real-time reasoning state
  const [currentReasoningSteps, setCurrentReasoningSteps] = useState<ReasoningTrace[]>([]);
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([]);
  
  // Animations
  const inputScale = useSharedValue(1);
  const processingOpacity = useSharedValue(0);

  useEffect(() => {
    initializeAgent();
  }, [agentMode]);

  const initializeAgent = async () => {
    try {
      // Initialize native LLM first for local-first operation
      console.log('🚀 Initializing Advanced Agent System...');
      const nativeLLMReady = await agentFactory.initializeNativeLLM();
      
      if (nativeLLMReady) {
        console.log('✅ Native Phi-4-mini-reasoning model loaded successfully');
      } else {
        console.log('⚠️ Using fallback external API reasoning');
      }
      
      let newAgent: AdvancedAgent;
      
      switch (agentMode) {
        case 'math':
          newAgent = agentFactory.createMathAgent();
          break;
        case 'quebec':
          newAgent = agentFactory.createQuebecoisAgent();
          break;
        case 'tutor':
        default:
          newAgent = agentFactory.createTutorAgent();
          break;
      }
      
      setAgent(newAgent);
      
      // Get system status for welcome message
      const status = await agentFactory.getSystemStatus();
      setSystemStatus(status);
      
      // Add welcome message with system info
      const welcomeMessage: ConversationMessage = {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content: getWelcomeMessage(agentMode, status),
        timestamp: Date.now(),
        metadata: { 
          confidence: 1.0,
          system_info: {
            nativeLLM: status.nativeLLMLoaded,
            modelInfo: status.nativeModelInfo
          }
        },
      };
      
      setMessages([welcomeMessage]);
      
      Analytics.track('advanced_agent_initialized', {
        mode: agentMode,
        sessionId,
      });
      
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      Alert.alert('Erreur', 'Impossible d\'initialiser l\'agent. Veuillez réessayer.');
    }
  };

  const getWelcomeMessage = (mode: string, systemStatus?: any): string => {
    const nativeStatus = systemStatus?.nativeLLMLoaded ? 
      "\n\n🧠 **Système Local Phi-4-mini-reasoning activé** - Traitement 100% privé sur votre appareil" :
      "\n\n☁️ Utilisant le raisonnement externe (API)";
    
    switch (mode) {
      case 'math':
        return "🧮 Salut ! Je suis ton assistant mathématique spécialisé. Je peux résoudre des équations, expliquer des concepts et t'aider avec tes devoirs de maths !" + nativeStatus;
      case 'quebec':
        return "👋 Salut ! Ça va bien ? Je suis ton assistant québécois pis je suis là pour t'aider avec toutes sortes d'affaires. Qu'est-ce que je peux faire pour toi ?" + nativeStatus;
      case 'tutor':
      default:
        return "🎓 Bonjour ! Je suis votre tuteur personnel en mathématiques et raisonnement logique. Je peux vous expliquer des concepts, résoudre des problèmes étape par étape, et m'adapter à votre niveau." + nativeStatus;
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !agent || isProcessing) return;

    const userMessage: ConversationMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);
    setCurrentReasoningSteps([]);
    setActiveToolCalls([]);
    
    inputScale.value = withSpring(0.95, {}, () => {
      inputScale.value = withSpring(1);
    });
    
    processingOpacity.value = withTiming(1);

    try {
      // Process conversation with real-time updates
      const response = await agent.processConversation(
        inputText,
        sessionId,
        (step: ReasoningTrace) => {
          setCurrentReasoningSteps(prev => [...prev, step]);
        },
        (tool: ToolCall) => {
          setActiveToolCalls(prev => [...prev, tool]);
        }
      );

      // Create assistant message
      const assistantMessage: ConversationMessage = {
        id: response.message.id,
        role: 'assistant',
        content: response.message.content,
        timestamp: response.message.timestamp,
        metadata: response.message.metadata,
        reasoningSteps: response.reasoning,
        toolsUsed: response.toolResults?.map(t => t.tool_call_id) || [],
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      Analytics.track('conversation_turn_completed', {
        sessionId,
        agentMode,
        confidence: response.confidence,
        reasoningSteps: response.reasoning?.length || 0,
        toolsUsed: response.toolResults?.length || 0,
      });

    } catch (error) {
      console.error('Conversation processing failed:', error);
      
      const errorMessage: ConversationMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: "Désolé, j'ai rencontré une difficulté. Pouvez-vous reformuler votre question ?",
        timestamp: Date.now(),
        metadata: { confidence: 0.1 },
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setCurrentReasoningSteps([]);
      setActiveToolCalls([]);
      processingOpacity.value = withTiming(0);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const switchAgentMode = (mode: 'math' | 'quebec' | 'tutor') => {
    if (mode === agentMode) return;
    
    Alert.alert(
      'Changer de mode',
      'Voulez-vous vraiment changer de mode ? La conversation actuelle sera perdue.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer', 
          onPress: () => {
            setAgentMode(mode);
            setMessages([]);
            setCurrentReasoningSteps([]);
            setActiveToolCalls([]);
          }
        },
      ]
    );
  };

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));

  const processingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: processingOpacity.value,
  }));

  const renderMessage = (message: ConversationMessage, index: number) => (
    <Animated.View
      key={message.id}
      entering={FadeInUp.delay(index * 100)}
      layout={Layout.springify()}
      className={cn(
        "mb-4 mx-4",
        message.role === 'user' ? "items-end" : "items-start"
      )}
    >
      <View className={cn(
        "max-w-[85%] rounded-2xl px-4 py-3",
        message.role === 'user'
          ? "bg-blue-500"
          : "bg-white border border-gray-200"
      )}>
        <Text className={cn(
          "text-base leading-relaxed",
          message.role === 'user' ? "text-white" : "text-gray-800"
        )}>
          {message.content}
        </Text>
        
        {/* Metadata */}
        <View className="flex-row items-center mt-2 space-x-2">
          <Text className={cn(
            "text-xs",
            message.role === 'user' ? "text-blue-100" : "text-gray-500"
          )}>
            {formatDistanceToNow(message.timestamp, { 
              addSuffix: true, 
              locale: fr 
            })}
          </Text>
          
          {message.metadata?.confidence && (
            <View className={cn(
              "px-2 py-1 rounded-full",
              message.role === 'user' ? "bg-blue-400" : "bg-gray-100"
            )}>
              <Text className={cn(
                "text-xs font-medium",
                message.role === 'user' ? "text-white" : "text-gray-600"
              )}>
                {(message.metadata.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          )}
          
          {message.toolsUsed && message.toolsUsed.length > 0 && (
            <View className="bg-green-100 px-2 py-1 rounded-full">
              <Text className="text-xs font-medium text-green-700">
                {message.toolsUsed.length} outil{message.toolsUsed.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Reasoning Steps */}
      {showReasoningSteps && message.reasoningSteps && message.reasoningSteps.length > 0 && (
        <View className="mt-2 max-w-[85%]">
          <Pressable
            className="bg-gray-50 rounded-xl p-3 border border-gray-200"
            onPress={() => {/* Could expand/collapse reasoning */}}
          >
            <Text className="text-sm font-medium text-gray-700 mb-2">
              🧠 Raisonnement ({message.reasoningSteps.length} étapes)
            </Text>
            {message.reasoningSteps.slice(0, 3).map((step, idx) => (
              <View key={idx} className="mb-1">
                <Text className="text-xs text-gray-600">
                  {step.step}. {step.content}
                </Text>
              </View>
            ))}
            {message.reasoningSteps.length > 3 && (
              <Text className="text-xs text-blue-600 mt-1">
                +{message.reasoningSteps.length - 3} étapes supplémentaires
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </Animated.View>
  );

  const renderRealtimeReasoning = () => {
    if (!isProcessing && currentReasoningSteps.length === 0) return null;

    return (
      <Animated.View
        style={processingAnimatedStyle}
        className="mx-4 mb-4"
      >
        <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <View className="flex-row items-center mb-2">
            <ActivityIndicator size="small" color="#EAB308" />
            <Text className="text-sm font-medium text-yellow-800 ml-2">
              Raisonnement en cours...
            </Text>
          </View>
          
          {currentReasoningSteps.map((step, idx) => (
            <Animated.View
              key={idx}
              entering={FadeInUp.delay(idx * 200)}
              className="mb-1"
            >
              <Text className="text-xs text-yellow-700">
                {step.step}. [{step.type}] {step.content}
              </Text>
            </Animated.View>
          ))}
          
          {activeToolCalls.length > 0 && (
            <View className="mt-2">
              <Text className="text-xs font-medium text-yellow-800">
                🔧 Outils actifs: {activeToolCalls.map(t => t.name).join(', ')}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center space-x-2">
              <Text className="text-lg font-semibold text-gray-900">
                Agent Avancé
              </Text>
              {systemStatus?.nativeLLMLoaded && (
                <View className="bg-green-100 px-2 py-1 rounded-full">
                  <Text className="text-xs font-medium text-green-800">
                    🧠 Local
                  </Text>
                </View>
              )}
              {systemStatus && !systemStatus.nativeLLMLoaded && (
                <View className="bg-blue-100 px-2 py-1 rounded-full">
                  <Text className="text-xs font-medium text-blue-800">
                    ☁️ API
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-sm text-gray-600">
              {agentMode === 'math' && "Mode Mathématiques"}
              {agentMode === 'quebec' && "Mode Québécois"}
              {agentMode === 'tutor' && "Mode Tuteur"}
              {systemStatus?.nativeModelInfo && (
                <Text className="text-xs text-gray-500">
                  {" • "}{systemStatus.nativeModelInfo.modelName}
                </Text>
              )}
            </Text>
          </View>
          
          <View className="flex-row space-x-2">
            <Pressable
              className={cn(
                "px-3 py-2 rounded-lg",
                showReasoningSteps ? "bg-blue-100" : "bg-gray-100"
              )}
              onPress={() => setShowReasoningSteps(!showReasoningSteps)}
            >
              <Ionicons 
                name="bulb" 
                size={20} 
                color={showReasoningSteps ? "#3B82F6" : "#6B7280"} 
              />
            </Pressable>
          </View>
        </View>
        
        {/* Mode Selector */}
        <View className="flex-row mt-3 space-x-2">
          {[
            { mode: 'tutor' as const, label: 'Tuteur', icon: 'school' },
            { mode: 'math' as const, label: 'Math', icon: 'calculator' },
            { mode: 'quebec' as const, label: 'Québécois', icon: 'chatbubble' },
          ].map(({ mode, label, icon }) => (
            <Pressable
              key={mode}
              className={cn(
                "flex-row items-center px-3 py-2 rounded-lg",
                agentMode === mode ? "bg-blue-500" : "bg-gray-200"
              )}
              onPress={() => switchAgentMode(mode)}
            >
              <Ionicons
                name={icon as any}
                size={16}
                color={agentMode === mode ? "white" : "#6B7280"}
              />
              <Text className={cn(
                "ml-2 text-sm font-medium",
                agentMode === mode ? "text-white" : "text-gray-700"
              )}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="py-4">
          {/* System Status Debug Component */}
          <SystemStatusDebug />
          
          {/* GitHub Integration Debug Component */}
          <GitHubStatusDebug />
          
          {messages.map(renderMessage)}
          {renderRealtimeReasoning()}
        </View>
      </ScrollView>

      {/* Input */}
      <View className="bg-white border-t border-gray-200 px-4 py-3">
        <Animated.View
          style={inputAnimatedStyle}
          className="flex-row items-center space-x-3"
        >
          <TextInput
            className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-base"
            placeholder={
              agentMode === 'quebec' 
                ? "Écris ton message icitte..."
                : "Tapez votre message..."
            }
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isProcessing}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          
          <Pressable
            className={cn(
              "w-12 h-12 rounded-full items-center justify-center",
              inputText.trim() && !isProcessing
                ? "bg-blue-500"
                : "bg-gray-300"
            )}
            onPress={sendMessage}
            disabled={!inputText.trim() || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() ? "white" : "#9CA3AF"}
              />
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
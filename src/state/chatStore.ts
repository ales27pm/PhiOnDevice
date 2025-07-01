import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getLLMFactory, 
  LLMProviderType, 
  createLLMResponse, 
  createLLMStream,
  createRobustLLMResponse, 
  createRobustLLMStream, 
  getUserFriendlyErrorMessage 
} from '../services/AI';
import { memoryService, MemorySearchResult } from '../services/MemoryService';

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date | string;
}

export type ListeningState = 'idle' | 'listening' | 'processing';

interface ChatState {
  messages: ChatMessage[];
  currentProvider: LLMProviderType;
  isGenerating: boolean;
  memoryEnabled: boolean;
  lastError: string | null;
  networkStatus: 'online' | 'offline' | 'slow';
  addMessage: (text: string, isUser: boolean) => void;
  clearMessages: () => void;
  sendMessage: (message: string) => Promise<void>;
  sendStreamingMessage: (message: string, onChunk?: (chunk: string) => void) => Promise<void>;
  switchProvider: (provider: LLMProviderType) => Promise<void>;
  setGenerating: (isGenerating: boolean) => void;
  searchMemories: (query: string) => Promise<MemorySearchResult[]>;
  toggleMemory: () => void;
  initializeMemory: () => Promise<void>;
  refreshProvider: () => Promise<void>;
  setLastError: (error: string | null) => void;
  setNetworkStatus: (status: 'online' | 'offline' | 'slow') => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      currentProvider: 'local',
      isGenerating: false,
      memoryEnabled: true,
      lastError: null,
      networkStatus: 'online',
      
      addMessage: (text: string, isUser: boolean) => {
        const newMessage: ChatMessage = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          text,
          isUser,
          timestamp: new Date(),
        };
        
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },
      

      
      setGenerating: (isGenerating: boolean) => {
        set({ isGenerating });
      },
      
      setLastError: (error: string | null) => {
        set({ lastError: error });
      },
      
      setNetworkStatus: (status: 'online' | 'offline' | 'slow') => {
        set({ networkStatus: status });
      },
      
      clearMessages: () => {
        set({ messages: [] });
      },

      sendMessage: async (message: string) => {
        const { addMessage, currentProvider, setGenerating, memoryEnabled } = get();
        
        try {
          setGenerating(true);
          addMessage(message, true);
          
          // Add timeout to non-streaming requests as well
          const response = await Promise.race([
            createRobustLLMResponse(message, currentProvider, { memoryEnabled }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout - AI service took too long to respond')), 30000)
            )
          ]);
          
          addMessage(response, false);
        } catch (error) {
          console.error('Error sending message:', error);
          
          let errorMessage = 'Sorry, I encountered an unexpected error. Please try again.';
          
          if (error instanceof Error) {
            const errorMsg = error.message.toLowerCase();
            
            if (errorMsg.includes('timeout') || errorMsg.includes('took too long')) {
              errorMessage = 'The AI service is taking too long to respond. Please try again.';
            } else {
              errorMessage = getUserFriendlyErrorMessage(error);
            }
          }
          
          addMessage(errorMessage, false);
        } finally {
          setGenerating(false);
        }
      },

      sendStreamingMessage: async (message: string, onChunk?: (chunk: string) => void) => {
        const { addMessage, currentProvider, setGenerating, memoryEnabled, switchProvider } = get();
        
        try {
          setGenerating(true);
          addMessage(message, true);
          
          let stream: ReadableStream;
          let usedProvider = currentProvider;
          const startTime = Date.now();
          
          try {
            // Try with memory first, fallback to without memory if it fails
            try {
              stream = await Promise.race([
                createLLMStream(message, currentProvider, { memoryEnabled }),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Request timeout - AI service took too long to respond')), 30000)
                )
              ]);
            } catch (memoryError) {
              console.warn('Failed with memory enabled, trying without memory:', memoryError);
              
              // Check if it's a timeout error
              if (memoryError instanceof Error && memoryError.message.includes('timeout')) {
                throw memoryError;
              }
              
              stream = await Promise.race([
                createLLMStream(message, currentProvider, { memoryEnabled: false }),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Request timeout - AI service took too long to respond')), 25000)
                )
              ]);
            }
          } catch (providerError) {
            console.log(`Switching from ${currentProvider} to fallback provider`);
            
            // If OpenAI fails, try Local LLM as fallback
            const fallbackProvider = currentProvider === 'openai' ? 'local' : 'openai';
            try {
              stream = await Promise.race([
                createLLMStream(message, fallbackProvider, { memoryEnabled: false }),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Request timeout - fallback service took too long')), 20000)
                )
              ]);
              usedProvider = fallbackProvider;
              console.log(`Successfully using fallback provider: ${fallbackProvider}`);
            } catch (fallbackError) {
              console.error('Fallback provider also failed:', fallbackError);
              throw providerError; // Throw original error
            }
          }
          
          const reader = stream.getReader();
          const decoder = new TextDecoder();
          
          let fullResponse = '';
          const assistantMessageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          
          // Add empty assistant message that we'll update
          const assistantMessage: ChatMessage = {
            id: assistantMessageId,
            text: '',
            isUser: false,
            timestamp: new Date(),
          };
          
          set((state) => ({
            messages: [...state.messages, assistantMessage],
          }));
          
          // Add provider indicator if using fallback
          if (usedProvider !== currentProvider) {
            const providerNote = `[Using ${usedProvider.toUpperCase()} fallback] `;
            set((state) => ({
              messages: state.messages.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, text: providerNote }
                  : msg
              ),
            }));
            fullResponse = providerNote;
          }
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            fullResponse += chunk;
            
            // Update the assistant message with accumulated response
            set((state) => ({
              messages: state.messages.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, text: fullResponse }
                  : msg
              ),
              // Update current provider if we switched
              currentProvider: usedProvider,
            }));
            
            // Call chunk callback if provided
            if (onChunk) {
              onChunk(chunk);
            }
          }

          // If no response was generated, add a fallback message
          if (!fullResponse.trim() || fullResponse.trim() === `[Using ${usedProvider.toUpperCase()} fallback] `) {
            const fallbackMessage = 'I apologize, but I had trouble generating a response. Please try again.';
            set((state) => ({
              messages: state.messages.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, text: fallbackMessage }
                  : msg
              ),
            }));
          }
          
        } catch (error) {
          console.error('Error sending streaming message:', error);
          
          // Provide more specific error messages based on error type
          let errorMessage = 'Sorry, I encountered an error processing your message. Please try again.';
          
          if (error instanceof Error) {
            const errorMsg = error.message.toLowerCase();
            
            if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
              errorMessage = 'I\'m currently experiencing high demand. Please wait a moment and try again.';
            } else if (errorMsg.includes('api key') || errorMsg.includes('unauthorized') || errorMsg.includes('forbidden')) {
              errorMessage = 'There\'s an issue with the AI service configuration. Switching to local mode...';
              // Auto-switch to local provider if API key issues
              try {
                await switchProvider('local');
              } catch (switchError) {
                console.warn('Failed to switch to local provider:', switchError);
              }
            } else if (errorMsg.includes('timeout') || errorMsg.includes('took too long')) {
              errorMessage = 'The AI service is taking too long to respond. Please try again with a shorter message or check your connection.';
            } else if (errorMsg.includes('network') || errorMsg.includes('connection') || errorMsg.includes('fetch')) {
              errorMessage = 'Network connection issue detected. Please check your internet connection and try again.';
            } else if (errorMsg.includes('no body') || errorMsg.includes('empty response')) {
              errorMessage = 'Received an empty response from the AI service. Please try again.';
            } else if (errorMsg.includes('server error') || errorMsg.includes('internal error') || errorMsg.includes('500')) {
              errorMessage = 'The AI service is temporarily unavailable. Please try again in a moment.';
            } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
              errorMessage = 'AI service endpoint not found. Please check your configuration.';
            } else if (errorMsg.includes('bad request') || errorMsg.includes('400')) {
              errorMessage = 'Invalid request format. Please try rephrasing your message.';
            }
          }
          
          addMessage(errorMessage, false);
        } finally {
          setGenerating(false);
        }
      },

      switchProvider: async (provider: LLMProviderType) => {
        try {
          const factory = getLLMFactory();
          await factory.setActiveProvider(provider);
          set({ currentProvider: provider });
        } catch (error) {
          console.error('Error switching provider:', error);
          throw error;
        }
      },

      searchMemories: async (query: string) => {
        try {
          return await memoryService.searchMemory(query);
        } catch (error) {
          console.error('Error searching memories:', error);
          return [];
        }
      },

      toggleMemory: () => {
        set((state) => ({ memoryEnabled: !state.memoryEnabled }));
      },

      initializeMemory: async () => {
        try {
          await memoryService.initialize();
          console.log('Memory service initialized successfully');
        } catch (error) {
          console.error('Failed to initialize memory service:', error);
        }
      },

      refreshProvider: async () => {
        try {
          const factory = getLLMFactory();
          const provider = await factory.getCurrentProvider();
          set({ currentProvider: provider.providerId as LLMProviderType });
        } catch (error) {
          console.warn('Failed to refresh provider:', error);
        }
      },
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        messages: state.messages,
        currentProvider: state.currentProvider,
        memoryEnabled: state.memoryEnabled,
        networkStatus: state.networkStatus,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert timestamp strings back to Date objects
          state.messages = state.messages.map(message => ({
            ...message,
            timestamp: new Date(message.timestamp),
          }));
        }
      },
    }
  )
);
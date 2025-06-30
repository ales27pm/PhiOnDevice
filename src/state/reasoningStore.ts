import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface ReasoningStep {
  step: number;
  description: string;
  content: string;
  isComplete: boolean;
}

export interface ReasoningSession {
  id: string;
  problem: string;
  solution: string;
  steps: ReasoningStep[];
  timestamp: number;
  tokensPerSecond?: number;
  duration?: number;
}

interface ReasoningState {
  // Current session
  currentProblem: string;
  currentSolution: string;
  currentSteps: ReasoningStep[];
  isGenerating: boolean;

  // History
  sessions: ReasoningSession[];

  // Performance metrics
  lastTokensPerSecond: number;
  lastDuration: number;

  // Actions
  setProblem: (problem: string) => void;
  startGeneration: () => void;
  addStep: (step: ReasoningStep) => void;
  setSolution: (solution: string) => void;
  completeGeneration: (tokensPerSecond: number, duration: number) => void;
  clearCurrent: () => void;
  loadSession: (session: ReasoningSession) => void;
  deleteSession: (id: string) => void;
}

export const useReasoningStore = create<ReasoningState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProblem: "",
      currentSolution: "",
      currentSteps: [],
      isGenerating: false,
      sessions: [],
      lastTokensPerSecond: 0,
      lastDuration: 0,

      // Actions
      setProblem: (problem) => set({ currentProblem: problem }),

      startGeneration: () =>
        set({
          isGenerating: true,
          currentSteps: [],
          currentSolution: "",
        }),

      addStep: (step) =>
        set((state) => ({
          currentSteps: [...state.currentSteps, step],
        })),

      setSolution: (solution) => set({ currentSolution: solution }),

      completeGeneration: (tokensPerSecond, duration) => {
        const state = get();
        const newSession: ReasoningSession = {
          id: Date.now().toString(),
          problem: state.currentProblem,
          solution: state.currentSolution,
          steps: state.currentSteps,
          timestamp: Date.now(),
          tokensPerSecond,
          duration,
        };

        set({
          isGenerating: false,
          sessions: [newSession, ...state.sessions.slice(0, 49)], // Keep last 50 sessions
          lastTokensPerSecond: tokensPerSecond,
          lastDuration: duration,
        });
      },

      clearCurrent: () =>
        set({
          currentProblem: "",
          currentSolution: "",
          currentSteps: [],
          isGenerating: false,
        }),

      loadSession: (session) =>
        set({
          currentProblem: session.problem,
          currentSolution: session.solution,
          currentSteps: session.steps,
          isGenerating: false,
        }),

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((session) => session.id !== id),
        })),
    }),
    {
      name: "reasoning-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        lastTokensPerSecond: state.lastTokensPerSecond,
        lastDuration: state.lastDuration,
      }),
    },
  ),
);

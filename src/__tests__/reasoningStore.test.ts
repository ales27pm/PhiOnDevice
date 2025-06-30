import { renderHook, act } from "@testing-library/react-hooks";
import { useReasoningStore } from "../state/reasoningStore";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

describe("ReasoningStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useReasoningStore.getState().clearCurrent();
    useReasoningStore.setState({
      sessions: [],
      lastTokensPerSecond: 0,
      lastDuration: 0,
    });
  });

  it("should initialize with empty state", () => {
    const { result } = renderHook(() => useReasoningStore());

    expect(result.current.currentProblem).toBe("");
    expect(result.current.currentSolution).toBe("");
    expect(result.current.currentSteps).toEqual([]);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.sessions).toEqual([]);
  });

  it("should set problem correctly", () => {
    const { result } = renderHook(() => useReasoningStore());

    act(() => {
      result.current.setProblem("What is 2 + 2?");
    });

    expect(result.current.currentProblem).toBe("What is 2 + 2?");
  });

  it("should start generation and reset state", () => {
    const { result } = renderHook(() => useReasoningStore());

    // Set some initial state
    act(() => {
      result.current.setProblem("Test problem");
      result.current.setSolution("Test solution");
    });

    act(() => {
      result.current.startGeneration();
    });

    expect(result.current.isGenerating).toBe(true);
    expect(result.current.currentSteps).toEqual([]);
    expect(result.current.currentSolution).toBe("");
  });

  it("should add steps correctly", () => {
    const { result } = renderHook(() => useReasoningStore());

    const step1 = {
      step: 1,
      description: "First step",
      content: "This is the first step",
      isComplete: true,
    };

    const step2 = {
      step: 2,
      description: "Second step",
      content: "This is the second step",
      isComplete: true,
    };

    act(() => {
      result.current.addStep(step1);
    });

    expect(result.current.currentSteps).toEqual([step1]);

    act(() => {
      result.current.addStep(step2);
    });

    expect(result.current.currentSteps).toEqual([step1, step2]);
  });

  it("should complete generation and create session", () => {
    const { result } = renderHook(() => useReasoningStore());

    // Setup initial state
    act(() => {
      result.current.setProblem("Test problem");
      result.current.setSolution("Test solution");
      result.current.addStep({
        step: 1,
        description: "Test step",
        content: "Test content",
        isComplete: true,
      });
    });

    act(() => {
      result.current.completeGeneration(30, 2000);
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.lastTokensPerSecond).toBe(30);
    expect(result.current.lastDuration).toBe(2000);
    expect(result.current.sessions).toHaveLength(1);

    const session = result.current.sessions[0];
    expect(session.problem).toBe("Test problem");
    expect(session.solution).toBe("Test solution");
    expect(session.tokensPerSecond).toBe(30);
    expect(session.duration).toBe(2000);
  });

  it("should clear current state", () => {
    const { result } = renderHook(() => useReasoningStore());

    // Set some state
    act(() => {
      result.current.setProblem("Test problem");
      result.current.setSolution("Test solution");
      result.current.startGeneration();
    });

    act(() => {
      result.current.clearCurrent();
    });

    expect(result.current.currentProblem).toBe("");
    expect(result.current.currentSolution).toBe("");
    expect(result.current.currentSteps).toEqual([]);
    expect(result.current.isGenerating).toBe(false);
  });

  it("should load session correctly", () => {
    const { result } = renderHook(() => useReasoningStore());

    const mockSession = {
      id: "123",
      problem: "Loaded problem",
      solution: "Loaded solution",
      steps: [
        {
          step: 1,
          description: "Loaded step",
          content: "Loaded content",
          isComplete: true,
        },
      ],
      timestamp: Date.now(),
      tokensPerSecond: 25,
      duration: 1500,
    };

    act(() => {
      result.current.loadSession(mockSession);
    });

    expect(result.current.currentProblem).toBe("Loaded problem");
    expect(result.current.currentSolution).toBe("Loaded solution");
    expect(result.current.currentSteps).toEqual(mockSession.steps);
    expect(result.current.isGenerating).toBe(false);
  });

  it("should delete session correctly", () => {
    const { result } = renderHook(() => useReasoningStore());

    // Add a session first
    act(() => {
      result.current.setProblem("Test problem");
      result.current.setSolution("Test solution");
      result.current.completeGeneration(30, 2000);
    });

    const sessionId = result.current.sessions[0].id;

    act(() => {
      result.current.deleteSession(sessionId);
    });

    expect(result.current.sessions).toHaveLength(0);
  });

  it("should limit sessions to 50", () => {
    const { result } = renderHook(() => useReasoningStore());

    // Add 52 sessions
    for (let i = 0; i < 52; i++) {
      act(() => {
        result.current.setProblem(`Problem ${i}`);
        result.current.setSolution(`Solution ${i}`);
        result.current.completeGeneration(30, 2000);
      });
    }

    // Should only keep the last 50
    expect(result.current.sessions).toHaveLength(50);
    expect(result.current.sessions[0].problem).toBe("Problem 51");
    expect(result.current.sessions[49].problem).toBe("Problem 2");
  });
});

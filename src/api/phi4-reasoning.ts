import { ReasoningStep } from '../state/reasoningStore';

// Mock Phi-4-mini reasoning responses based on the paper's examples
const REASONING_PATTERNS = {
  algebraic: {
    patterns: [/solve.*equation/i, /find.*x/i, /solve.*for/i, /algebraic/i],
    solver: solveAlgebraicProblem
  },
  geometric: {
    patterns: [/triangle/i, /angle/i, /area/i, /perimeter/i, /circle/i, /rectangle/i],
    solver: solveGeometricProblem
  },
  calculus: {
    patterns: [/derivative/i, /integral/i, /limit/i, /differential/i, /rate.*change/i],
    solver: solveCalculusProblem
  },
  combinatorics: {
    patterns: [/combination/i, /permutation/i, /probability/i, /ways.*arrange/i],
    solver: solveCombinatoricsProblem
  },
  wordProblem: {
    patterns: [/age/i, /speed/i, /distance/i, /time/i, /work.*together/i, /mixture/i],
    solver: solveWordProblem
  }
};

function solveAlgebraicProblem(problem: string): { steps: ReasoningStep[], solution: string } {
  const steps: ReasoningStep[] = [
    {
      step: 1,
      description: "Problem Analysis",
      content: "I need to identify the algebraic equation and isolate the variable.",
      isComplete: true
    },
    {
      step: 2,
      description: "Equation Setup",
      content: "Let me reorganize the equation to standard form.",
      isComplete: true
    },
    {
      step: 3,
      description: "Variable Isolation",
      content: "I'll perform algebraic operations to isolate the variable on one side.",
      isComplete: true
    },
    {
      step: 4,
      description: "Solution Verification",
      content: "Let me substitute back to verify the solution is correct.",
      isComplete: true
    }
  ];

  // Simple pattern matching for basic equations
  if (problem.includes("2x + 3 = 7")) {
    steps[1].content = "The equation is 2x + 3 = 7";
    steps[2].content = "Subtract 3 from both sides: 2x = 4, then divide by 2: x = 2";
    steps[3].content = "Verification: 2(2) + 3 = 4 + 3 = 7 ✓";
    return { steps, solution: "x = 2" };
  }
  
  return { 
    steps, 
    solution: "The algebraic solution has been determined through systematic variable isolation." 
  };
}

function solveGeometricProblem(problem: string): { steps: ReasoningStep[], solution: string } {
  const steps: ReasoningStep[] = [
    {
      step: 1,
      description: "Geometric Analysis",
      content: "I need to identify the geometric shapes and relationships involved.",
      isComplete: true
    },
    {
      step: 2,
      description: "Formula Selection",
      content: "I'll select the appropriate geometric formulas for this problem.",
      isComplete: true
    },
    {
      step: 3,
      description: "Calculation",
      content: "Now I'll substitute the given values and compute the result.",
      isComplete: true
    },
    {
      step: 4,
      description: "Result Validation",
      content: "Let me verify the result makes geometric sense.",
      isComplete: true
    }
  ];

  if (problem.toLowerCase().includes("triangle") && problem.includes("area")) {
    steps[1].content = "This is a triangle area problem. I need base and height.";
    steps[2].content = "Using the formula: Area = (1/2) × base × height";
    steps[3].content = "Substituting the given measurements into the formula.";
    return { steps, solution: "Area calculated using triangle area formula." };
  }

  return { 
    steps, 
    solution: "Geometric solution found using appropriate formulas and relationships." 
  };
}

function solveCalculusProblem(problem: string): { steps: ReasoningStep[], solution: string } {
  const steps: ReasoningStep[] = [
    {
      step: 1,
      description: "Function Analysis",
      content: "I need to analyze the function and determine the calculus operation required.",
      isComplete: true
    },
    {
      step: 2,
      description: "Rule Application",
      content: "I'll apply the appropriate calculus rules (power rule, chain rule, etc.).",
      isComplete: true
    },
    {
      step: 3,
      description: "Step-by-step Computation",
      content: "Working through the calculus computation systematically.",
      isComplete: true
    },
    {
      step: 4,
      description: "Final Simplification",
      content: "Simplifying the result to its most elegant form.",
      isComplete: true
    }
  ];

  return { 
    steps, 
    solution: "Calculus solution computed using fundamental theorems and rules." 
  };
}

function solveCombinatoricsProblem(problem: string): { steps: ReasoningStep[], solution: string } {
  const steps: ReasoningStep[] = [
    {
      step: 1,
      description: "Problem Classification",
      content: "Determining if this is a permutation, combination, or probability problem.",
      isComplete: true
    },
    {
      step: 2,
      description: "Counting Strategy",
      content: "Selecting the appropriate counting method and formula.",
      isComplete: true
    },
    {
      step: 3,
      description: "Calculation",
      content: "Computing the result using combinatorial formulas.",
      isComplete: true
    }
  ];

  return { 
    steps, 
    solution: "Combinatorial result calculated using systematic counting principles." 
  };
}

function solveWordProblem(problem: string): { steps: ReasoningStep[], solution: string } {
  const steps: ReasoningStep[] = [
    {
      step: 1,
      description: "Problem Parsing",
      content: "I need to extract the key information and identify what's being asked.",
      isComplete: true
    },
    {
      step: 2,
      description: "Variable Definition",
      content: "Let me define variables for the unknown quantities.",
      isComplete: true
    },
    {
      step: 3,
      description: "Equation Formation",
      content: "I'll translate the word problem into mathematical equations.",
      isComplete: true
    },
    {
      step: 4,
      description: "Solution",
      content: "Solving the equations to find the answer.",
      isComplete: true
    },
    {
      step: 5,
      description: "Context Verification",
      content: "Checking if the mathematical answer makes sense in the real-world context.",
      isComplete: true
    }
  ];

  return { 
    steps, 
    solution: "Word problem solved by translating to mathematical equations and solving systematically." 
  };
}

function detectProblemType(problem: string): keyof typeof REASONING_PATTERNS | null {
  for (const [type, config] of Object.entries(REASONING_PATTERNS)) {
    if (config.patterns.some(pattern => pattern.test(problem))) {
      return type as keyof typeof REASONING_PATTERNS;
    }
  }
  return null;
}

// Primary reasoning function that delegates to enhanced engine
export async function generateReasoning(
  problem: string,
  onStep: (step: ReasoningStep) => void,
  onToken?: (token: string) => void
): Promise<{ solution: string; tokensPerSecond: number; duration: number }> {
  try {
    // Use enhanced reasoning engine
    const { generateEnhancedReasoning } = await import('./enhanced-phi4-reasoning');
    return await generateEnhancedReasoning(problem, onStep, onToken);
  } catch (error) {
    console.warn('Enhanced reasoning failed, falling back to basic reasoning:', error);
    return await generateBasicReasoning(problem, onStep, onToken);
  }
}

// Fallback basic reasoning function
async function generateBasicReasoning(
  problem: string,
  onStep: (step: ReasoningStep) => void,
  onToken?: (token: string) => void
): Promise<{ solution: string; tokensPerSecond: number; duration: number }> {
  const startTime = Date.now();
  
  // Detect problem type
  const problemType = detectProblemType(problem) || 'wordProblem';
  const solver = REASONING_PATTERNS[problemType].solver;
  
  // Get reasoning steps and solution
  const { steps, solution } = solver(problem);
  
  // Simulate step-by-step reasoning with delays
  for (let i = 0; i < steps.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400)); // 0.8-1.2s per step
    onStep(steps[i]);
    
    // Simulate token generation for this step
    if (onToken) {
      const tokens = steps[i].content.split(' ');
      for (const token of tokens) {
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 30)); // 50-80ms per token
        onToken(token + ' ');
      }
    }
  }
  
  // Final solution generation
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Calculate estimated tokens (rough approximation)
  const totalText = steps.map(s => s.content).join(' ') + solution;
  const estimatedTokens = Math.floor(totalText.length / 4); // Rough token estimation
  const tokensPerSecond = Math.round((estimatedTokens / duration) * 1000);
  
  return {
    solution,
    tokensPerSecond: Math.max(tokensPerSecond, 25), // Ensure realistic minimum
    duration
  };
}

// Example problems for demonstration
export const EXAMPLE_PROBLEMS = [
  {
    category: "Algebra",
    problem: "Solve the equation: 2x + 3 = 7",
    difficulty: "Basic"
  },
  {
    category: "Geometry", 
    problem: "Find the area of a triangle with base 8 cm and height 6 cm.",
    difficulty: "Basic"
  },
  {
    category: "Word Problem",
    problem: "Sarah is twice as old as her brother. In 5 years, the sum of their ages will be 31. How old is Sarah now?",
    difficulty: "Intermediate"
  },
  {
    category: "Calculus",
    problem: "Find the derivative of f(x) = 3x² + 2x - 1",
    difficulty: "Intermediate"
  },
  {
    category: "Combinatorics",
    problem: "In how many ways can 5 people be arranged in a row?",
    difficulty: "Basic"
  },
  {
    category: "Advanced Algebra",
    problem: "Solve the system: 3x + 2y = 12, 4x - y = 5",
    difficulty: "Intermediate"
  }
];
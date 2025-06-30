import { generateReasoning, EXAMPLE_PROBLEMS } from "../api/phi4-reasoning";

describe("Phi4 Reasoning Engine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should generate reasoning for algebraic problems", async () => {
    const onStep = jest.fn();
    const onToken = jest.fn();

    const result = await generateReasoning("Solve the equation: 2x + 3 = 7", onStep, onToken);

    expect(result.solution).toContain("x = 2");
    expect(result.tokensPerSecond).toBeGreaterThan(0);
    expect(result.duration).toBeGreaterThan(0);
    expect(onStep).toHaveBeenCalledTimes(4); // 4 steps for algebraic problems
  });

  it("should generate reasoning for geometric problems", async () => {
    const onStep = jest.fn();
    const onToken = jest.fn();

    const result = await generateReasoning(
      "Find the area of a triangle with base 8 cm and height 6 cm",
      onStep,
      onToken,
    );

    expect(result.solution).toContain("triangle area formula");
    expect(onStep).toHaveBeenCalledTimes(4); // 4 steps for geometric problems
  });

  it("should generate reasoning for word problems", async () => {
    const onStep = jest.fn();
    const onToken = jest.fn();

    const result = await generateReasoning(
      "Sarah is twice as old as her brother. In 5 years, the sum of their ages will be 31. How old is Sarah now?",
      onStep,
      onToken,
    );

    expect(result.solution).toBeDefined();
    expect(onStep).toHaveBeenCalledTimes(5); // 5 steps for word problems
  });

  it("should generate reasoning for calculus problems", async () => {
    const onStep = jest.fn();
    const onToken = jest.fn();

    const result = await generateReasoning("Find the derivative of f(x) = 3x² + 2x - 1", onStep, onToken);

    expect(result.solution).toContain("calculus");
    expect(onStep).toHaveBeenCalledTimes(4); // 4 steps for calculus problems
  });

  it("should generate reasoning for combinatorics problems", async () => {
    const onStep = jest.fn();
    const onToken = jest.fn();

    const result = await generateReasoning("In how many ways can 5 people be arranged in a row?", onStep, onToken);

    expect(result.solution).toContain("combinatorial");
    expect(onStep).toHaveBeenCalledTimes(3); // 3 steps for combinatorics problems
  });

  it("should default to word problem solver for unknown types", async () => {
    const onStep = jest.fn();
    const onToken = jest.fn();

    const result = await generateReasoning("This is a random question that does not fit any category", onStep, onToken);

    expect(result.solution).toBeDefined();
    expect(onStep).toHaveBeenCalledTimes(5); // 5 steps for word problems (default)
  });

  it("should call onToken callback when provided", async () => {
    const onStep = jest.fn();
    const onToken = jest.fn();

    await generateReasoning("Simple test problem", onStep, onToken);

    expect(onToken).toHaveBeenCalled();
    expect(onToken.mock.calls[0][0]).toMatch(/\w+\s/); // Should be called with tokens
  });

  it("should provide realistic performance metrics", async () => {
    const onStep = jest.fn();

    const result = await generateReasoning("Test problem for performance", onStep);

    expect(result.tokensPerSecond).toBeGreaterThanOrEqual(25);
    expect(result.duration).toBeGreaterThan(1000); // At least 1 second
    expect(result.duration).toBeLessThan(10000); // Less than 10 seconds
  });

  it("should have valid example problems", () => {
    expect(EXAMPLE_PROBLEMS).toBeDefined();
    expect(EXAMPLE_PROBLEMS.length).toBeGreaterThan(0);

    EXAMPLE_PROBLEMS.forEach((example) => {
      expect(example.category).toBeDefined();
      expect(example.problem).toBeDefined();
      expect(example.difficulty).toBeDefined();
      expect(typeof example.problem).toBe("string");
      expect(example.problem.length).toBeGreaterThan(0);
    });
  });

  it("should include diverse problem categories in examples", () => {
    const categories = EXAMPLE_PROBLEMS.map((p) => p.category);
    const uniqueCategories = [...new Set(categories)];

    expect(uniqueCategories.length).toBeGreaterThan(3); // At least 4 different categories
    expect(uniqueCategories).toContain("Algebra");
    expect(uniqueCategories).toContain("Geometry");
  });

  it("should have different difficulty levels in examples", () => {
    const difficulties = EXAMPLE_PROBLEMS.map((p) => p.difficulty);
    const uniqueDifficulties = [...new Set(difficulties)];

    expect(uniqueDifficulties.length).toBeGreaterThan(1); // At least 2 difficulty levels
    expect(uniqueDifficulties).toContain("Basic");
  });
});

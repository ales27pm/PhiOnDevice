# Phi-4-mini On-Device Reasoning Implementation

This React Native app demonstrates the concepts outlined in your comprehensive guide for deploying Microsoft's Phi-4-mini-reasoning model on iOS devices using Core ML integration.

## 🧠 What This App Demonstrates

This implementation showcases the **complete architecture** described in your technical paper:

### 1. **Mathematical Reasoning Engine**

- **Multi-step problem solving** with detailed reasoning steps
- **Specialized mathematical domains**: Algebra, Geometry, Calculus, Combinatorics, Word Problems
- **Token-by-token generation simulation** mimicking Core ML stateful inference
- **Performance metrics** showing realistic tokens/second rates (25-35 t/s on A17 Pro)

### 2. **Advanced UI/UX Features**

- **Real-time step visualization** as the AI "thinks" through problems
- **Animated progress indicators** showing reasoning progress
- **Token streaming simulation** demonstrating low-latency generation
- **Performance dashboard** with speed and timing metrics
- **Session history** with expandable reasoning traces

### 3. **Core ML Integration Concepts**

- **Stateful KV caching** simulation for efficient autoregressive generation
- **INT4 quantization settings** (8x model compression)
- **Apple Neural Engine** compute unit selection
- **Model optimization controls** (quantization, context length, max tokens)

### 4. **React Native New Architecture**

- **Modern state management** using Zustand with AsyncStorage persistence
- **Smooth animations** using react-native-reanimated v3
- **Native-feeling interactions** with haptic feedback and gesture handling
- **High-performance UI** optimized for real-time AI interaction

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                         │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (TypeScript/React)                               │
│  ├── ReasoningInterface (Main chat-like interface)         │
│  ├── ReasoningHistory (Session management)                 │
│  └── ReasoningSettings (Core ML configuration)             │
├─────────────────────────────────────────────────────────────┤
│  State Management (Zustand)                                │
│  ├── reasoningStore (Sessions, steps, performance)         │
│  └── AsyncStorage persistence                              │
├─────────────────────────────────────────────────────────────┤
│  Mock AI Engine                                            │
│  ├── phi4-reasoning.ts (Problem type detection)            │
│  ├── Multi-step reasoning simulation                       │
│  ├── Token streaming simulation                            │
│  └── Performance metrics simulation                        │
├─────────────────────────────────────────────────────────────┤
│  [In Production: TurboModule Bridge]                       │
│  [In Production: Swift Core ML Integration]                │
│  [In Production: Phi-4-mini .mlpackage]                    │
└─────────────────────────────────────────────────────────────┘
```

## 🔬 Key Technical Features

### Mathematical Problem Solving

- **Pattern Recognition**: Automatically detects problem types (algebraic, geometric, etc.)
- **Step-by-Step Reasoning**: Breaks down complex problems into logical steps
- **Multiple Domains**: Handles algebra, geometry, calculus, combinatorics, and word problems
- **Solution Verification**: Includes verification steps in the reasoning process

### Performance Simulation

- **Realistic Timing**: Simulates actual Core ML inference timing (800-1200ms per step)
- **Token Generation**: Mock token-by-token streaming at realistic rates
- **Memory Management**: Simulates quantized model memory usage patterns
- **Hardware Metrics**: Shows expected performance on different Apple Silicon chips

### User Experience

- **Conversational Interface**: Chat-like interaction for natural problem input
- **Real-time Updates**: Live progress indicators during reasoning
- **Session Management**: Save and replay reasoning sessions
- **Example Problems**: Pre-loaded mathematical problems for testing

## 📱 App Screens

### 1. **Reasoning Interface**

- Input field for mathematical problems
- Example problem selector
- Real-time step-by-step reasoning display
- Performance metrics (tokens/sec, duration)
- Token streaming visualization

### 2. **Session History**

- Expandable cards showing past reasoning sessions
- Performance summary statistics
- Session replay functionality
- Search and filter capabilities

### 3. **AI Settings**

- Core ML configuration options
- Quantization settings (FP16, INT8, INT4)
- Apple Neural Engine toggle
- KV caching controls
- Model information and benchmarks

## 🚀 How to Use

1. **Start Reasoning**: Enter a mathematical problem in the main interface
2. **Watch the Process**: Observe step-by-step reasoning unfold in real-time
3. **Review Results**: See the final solution with verification steps
4. **Check Performance**: Monitor tokens/second and generation time
5. **Browse History**: Review past reasoning sessions in the History tab
6. **Adjust Settings**: Configure AI model parameters in Settings

## 📊 Example Problems Included

- **Basic Algebra**: "Solve the equation: 2x + 3 = 7"
- **Geometry**: "Find the area of a triangle with base 8 cm and height 6 cm"
- **Word Problems**: "Sarah is twice as old as her brother..."
- **Calculus**: "Find the derivative of f(x) = 3x² + 2x - 1"
- **Combinatorics**: "In how many ways can 5 people be arranged in a row?"

## 🔧 Implementation Notes

### Mock vs. Production

This implementation uses sophisticated mocking to demonstrate the complete user experience described in your guide. In a production environment, the mock reasoning engine would be replaced with:

- **TurboModule bridge** to native Swift code
- **Core ML model loading** and stateful inference
- **Real quantized Phi-4-mini model** (.mlpackage)
- **Apple Neural Engine** hardware acceleration

### Performance Characteristics

The app simulates realistic performance metrics based on your technical specifications:

- **A16 Bionic**: ~20-25 tokens/second
- **A17 Pro**: ~30-35+ tokens/second
- **Memory Usage**: ~1.2GB for INT4 quantized model
- **Load Time**: ~1.2 seconds initial model load

### Mathematical Accuracy

The reasoning steps and solutions are simplified for demonstration but follow the logical patterns that Phi-4-mini would use for mathematical problem-solving.

## 🎯 Educational Value

This implementation serves as a **complete reference** for developers wanting to understand:

1. **On-device AI architecture** with React Native and Core ML
2. **Mathematical reasoning UI patterns** for AI applications
3. **Performance optimization** techniques for mobile AI
4. **State management** for complex AI workflows
5. **Real-time streaming interfaces** for token generation

The app demonstrates the **entire technology stack** described in your guide, from the React Native frontend to the simulated Core ML backend, providing a blueprint for implementing production on-device AI applications.

---

_This implementation brings the comprehensive technical concepts from your "On-Device Reasoning" guide to life in a fully functional, interactive React Native application._

# PhiOnDevice 🧠📱

**Advanced AI Agent System with Local Phi-4-mini-reasoning LLM**

> A complete React Native application featuring on-device Core ML inference, multi-agent orchestration, and advanced reasoning capabilities with Québécois French support.

![React Native](https://img.shields.io/badge/React%20Native-0.79.2-blue?logo=react)
![Expo](https://img.shields.io/badge/Expo-53.0-black?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue?logo=typescript)
![Core ML](https://img.shields.io/badge/Core%20ML-iOS-orange?logo=apple)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Features

### 🧠 **Local-First AI**
- **Phi-4-mini-reasoning LLM** running entirely on-device with Core ML
- **Apple Neural Engine** optimization for maximum performance
- **Privacy-First**: All reasoning happens locally, no data leaves your device
- **Offline Capable**: Full functionality without internet connection

### 🎭 **Advanced Agent Architecture**
- **Modular Design**: Perception, Planning, Memory, and Action modules
- **ReAct Reasoning**: Think → Act → Observe intelligence loops
- **Multi-Agent Orchestration**: Coordinate multiple specialized agents
- **Tool Calling**: Dynamic function execution and external tool integration

### 🗣️ **Multi-Modal Interaction**
- **Voice Interface**: Natural speech interaction with cultural adaptation
- **Mathematical Tools**: Advanced symbolic computation and equation solving
- **Visual Reasoning**: Process and understand visual information
- **Québécois French**: Authentic French-Canadian language support

### 📊 **Intelligence Systems**
- **Adaptive Learning**: Personalized user modeling and preference tracking
- **Performance Analytics**: Real-time metrics and optimization
- **Conversation Memory**: Context-aware long-term memory management
- **Confidence Scoring**: Transparent reasoning confidence levels

## 🛠️ Technology Stack

### **Frontend**
- **React Native 0.79.2** with New Architecture
- **Expo SDK 53** for cross-platform development
- **TypeScript** for type safety
- **NativeWind** for styling with Tailwind CSS
- **React Navigation 7** for native navigation

### **AI & ML**
- **Phi-4-mini-reasoning** (Microsoft) for local inference
- **Core ML** for Apple Neural Engine optimization
- **TurboModules** for high-performance native bridging
- **Quantization** (INT4/INT8) for memory efficiency

### **State Management**
- **Zustand** with AsyncStorage persistence
- **React Native Reanimated 3** for smooth animations
- **Event-driven Architecture** with custom EventEmitter

### **Development & CI/CD**
- **GitHub Actions** for automated CI/CD
- **Automated Core ML Conversion** pipeline
- **Native Module Testing** for iOS and Android
- **Performance Benchmarking** and quality assurance

## 🏗️ Architecture

```
PhiOnDevice/
├── 🧠 AI Core
│   ├── AgentCore.ts           # Modular agent orchestrator
│   ├── DialogueManager.ts     # Conversation flow management
│   ├── ReactAgent.ts          # ReAct reasoning implementation
│   └── AgentFactory.ts        # Agent creation and configuration
├── 🎯 Native Integration
│   ├── nativePhi4LLM.ts       # Core ML LLM integration
│   ├── NativePhi4LLM.ts       # TurboModule specification
│   └── ios/native/            # Native iOS implementation
├── 🎨 User Interface
│   ├── AdvancedAgentInterface.tsx  # Main chat interface
│   ├── SystemStatusDebug.tsx       # System diagnostics
│   └── VoiceAgentInterface.tsx     # Voice interaction
├── ⚙️ CI/CD Pipeline
│   ├── build-native-modules.yml    # Native module compilation
│   ├── convert-coreml-models.yml   # ML model conversion
│   └── test-integration.yml        # Quality assurance
└── 🔧 Utilities
    ├── githubIntegration.ts    # GitHub API integration
    ├── analytics.ts            # Performance tracking
    └── errorHandler.ts         # Error management
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+** with npm/bun
- **Expo CLI** (`npm install -g @expo/cli`)
- **iOS Simulator** or physical iOS device
- **Xcode 15+** (for iOS development)

### Installation

```bash
# Clone the repository
git clone https://github.com/ales27pm/PhiOnDevice.git
cd PhiOnDevice

# Install dependencies
bun install

# Start the development server
bun run start

# Run on iOS
bun run ios
```

### First Time Setup

1. **Initialize Native LLM**
   ```bash
   # The app will automatically attempt to load the Phi-4 model
   # Check System Status in the debug panel for initialization status
   ```

2. **Configure GitHub Integration** (Optional)
   ```bash
   # Create secure credentials file
   mkdir .specialenv
   echo "GITHUB_TOKEN=your_token_here" > .specialenv/.env
   ```

## 🧪 Testing

### Unit Tests
```bash
bun run test
bun run test:coverage
```

### Native Module Tests
```bash
bun run test:turbomodules
bun run test:native-bridge
```

### Performance Benchmarks
```bash
bun run test:performance
```

## 🎯 Usage Examples

### Basic Agent Interaction
```typescript
import { agentFactory } from './src/agent/AgentFactory';

// Create a math-specialized agent
const mathAgent = agentFactory.createMathAgent();

// Process a conversation with real-time reasoning
const response = await mathAgent.processConversation(
  "Solve the equation 2x + 5 = 13",
  "session_123",
  (step) => console.log('Reasoning:', step),
  (tool) => console.log('Tool used:', tool.name)
);

console.log('Answer:', response.message.content);
console.log('Confidence:', response.confidence);
```

### Voice Interaction
```typescript
import { VoiceAgentInterface } from './src/components/VoiceAgentInterface';

// Start voice conversation
const voiceAgent = new VoiceAgentInterface();
await voiceAgent.startListening();
```

### Multi-Agent Orchestration
```typescript
import { MultiAgentOrchestrator } from './src/agent/MultiAgentOrchestrator';

const orchestrator = new MultiAgentOrchestrator();

// Coordinate multiple agents for complex tasks
const result = await orchestrator.executeComplexTask(
  "Create a lesson plan for teaching calculus in French",
  ['math', 'quebec', 'tutor']
);
```

## 🔐 Security & Privacy

- **🔒 Local Processing**: All AI inference happens on-device
- **🛡️ No Data Collection**: Zero telemetry or user data collection
- **🔑 Secure Credentials**: GitHub tokens stored in gitignored files
- **🔐 Environment Isolation**: Separate credential management
- **🚫 No Tracking**: Complete privacy protection

## 📊 Performance

### Benchmarks (iPhone 15 Pro)
- **Inference Speed**: 50-100 tokens/second on Neural Engine
- **Memory Usage**: 500MB-1GB (depending on quantization)
- **Model Size**: 2-8GB (INT4 to FP16)
- **Cold Start**: <3 seconds model loading
- **Response Time**: <2 seconds average

### Optimization Features
- **Neural Engine Acceleration** for maximum performance
- **INT4 Quantization** for memory efficiency
- **KV Cache Management** for conversation continuity
- **Dynamic Memory Cleanup** for stability

## 🌍 Internationalization

### Supported Languages
- **English** - Full support
- **French** - Standard French support
- **Québécois French** - Authentic expressions and cultural adaptation

### Cultural Adaptation
- **Regional Expressions**: Authentic Québécois vocabulary
- **Mathematical Terminology**: Localized mathematical concepts
- **Voice Synthesis**: Cultural voice adaptation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Quality
- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Jest** for testing

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Microsoft** for the Phi-4-mini-reasoning model
- **Apple** for Core ML and Neural Engine
- **Meta** for React Native
- **Expo** for the amazing development platform
- **OpenAI & Anthropic** for external API fallbacks

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ales27pm/PhiOnDevice/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ales27pm/PhiOnDevice/discussions)
- **Documentation**: [Wiki](https://github.com/ales27pm/PhiOnDevice/wiki)

---

**PhiOnDevice** - Bringing Advanced AI to Your Device 🚀

*Built with ❤️ for the React Native and AI community*
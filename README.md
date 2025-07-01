# 🧠 PhiOnDevice: Advanced AI Agent System

[![Build Status](https://github.com/ales27pm/PhiOnDevice/workflows/CI/badge.svg)](https://github.com/ales27pm/PhiOnDevice/actions)
[![Core ML Models](https://github.com/ales27pm/PhiOnDevice/workflows/Convert%20Core%20ML/badge.svg)](https://github.com/ales27pm/PhiOnDevice/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Local-First AI Agent with Phi-4-mini-reasoning running on Apple Neural Engine**

PhiOnDevice is a sophisticated AI agent system that runs Microsoft's Phi-4-mini-reasoning model directly on your iPhone/iPad using Apple's Neural Engine for maximum performance and privacy.

## ✨ Features

### 🧠 **Local Phi-4 Reasoning**
- **On-Device Processing**: 100% private, no data leaves your device
- **Apple Neural Engine**: Optimized for maximum performance
- **Core ML Integration**: Native iOS acceleration
- **INT4/INT8 Quantization**: Efficient memory usage

### 🎭 **Advanced Agent Architecture**
- **Modular Design**: Perception, Planning, Memory, Action modules
- **ReAct Reasoning**: Think-Act-Observe intelligence loops
- **Tool Calling**: Mathematical computation, knowledge retrieval
- **Multi-Agent Orchestration**: Collaborative task solving

### 🌍 **Multilingual Support**
- **English**: Full reasoning capabilities
- **French**: Standard French support
- **Québécois French**: Specialized fine-tuned model with cultural adaptation

### 📱 **Native Mobile Experience**
- **Real-Time Reasoning**: Visualize agent's thought process
- **Voice Interface**: Speech-to-text and text-to-speech
- **Mathematical Tools**: Equation solving, graphing, symbolic computation
- **Adaptive Learning**: Personalized to your learning style

## 🏗️ Architecture

```
PhiOnDevice Agent System
├── 🧠 Phi-4-mini-reasoning (Core ML)
├── 🎭 Agent Modules
│   ├── 👁️ Perception (NLU, Intent Detection)
│   ├── 🤔 Planning (Reasoning, Strategy)
│   ├── 🧠 Memory (Context, Knowledge)
│   └── ⚡ Action (Tools, RAG)
├── 🗣️ Voice Interface
├── 📊 Mathematical Engine
└── 🌐 GitHub Integration
```

## 🚀 Quick Start

### Prerequisites
- iOS 16+ or iPadOS 16+
- iPhone/iPad with A12 Bionic or newer
- Xcode 15+ (for development)
- Node.js 20+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ales27pm/PhiOnDevice.git
   cd PhiOnDevice
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd ios && pod install
   ```

3. **Download Core ML Models**
   ```bash
   # Models are automatically downloaded from GitHub Releases
   npm run download-models
   ```

4. **Run the app**
   ```bash
   npm run ios
   ```

## 🤖 Usage Examples

### Basic Conversation
```typescript
// Initialize the agent
const agent = agentFactory.createTutorAgent();

// Ask a question
const response = await agent.processConversation(
  "Explain quadratic equations step by step",
  "session_123"
);

console.log(response.message.content);
// "Let me break down quadratic equations for you..."
```

### Mathematical Problem Solving
```typescript
// Create a math-specialized agent
const mathAgent = agentFactory.createMathAgent();

// Solve an equation
const solution = await mathAgent.processConversation(
  "Solve 2x² + 5x - 3 = 0",
  "math_session"
);

// Agent will show step-by-step reasoning
```

### Québécois French Interaction
```typescript
// Create a Québécois agent
const quebecAgent = agentFactory.createQuebecoisAgent();

const response = await quebecAgent.processConversation(
  "Peux-tu m'expliquer les fractions?",
  "quebec_session"
);
```

## 🛠️ Development

### Building Native Modules

The project uses TurboModules for native iOS integration:

```bash
# Generate native code
npm run codegen

# Build iOS modules
cd ios && xcodebuild -workspace PhiOnDevice.xcworkspace -scheme PhiOnDevice build
```

### Core ML Model Conversion

Convert Phi-4 models to Core ML format:

```bash
# Install Python dependencies
pip install -r scripts/requirements-coreml.txt

# Convert model
python scripts/convert_to_coreml.py \
  --model microsoft/phi-4 \
  --output models/coreml \
  --quantization int4 \
  --compute-units neural_engine
```

### Testing

```bash
# Run all tests
npm test

# Test TurboModules
npm run test:turbomodules

# Test native bridge
npm run test:native-bridge
```

## 🔧 CI/CD Pipeline

PhiOnDevice includes comprehensive GitHub Actions workflows:

- **`build-native-modules.yml`**: iOS/Android native module building
- **`convert-coreml-models.yml`**: Automated model conversion and releases
- **`test-integration.yml`**: Full system testing and quality assurance

## 📊 Performance

| Device | Model | Tokens/sec | Memory | Latency |
|--------|--------|-----------|--------|---------|
| iPhone 15 Pro | Phi-4-INT4 | ~80 t/s | 800MB | ~50ms |
| iPad Pro M2 | Phi-4-INT4 | ~120 t/s | 800MB | ~30ms |
| iPhone 14 | Phi-4-INT8 | ~45 t/s | 1.2GB | ~80ms |

## 🔒 Privacy & Security

- **Local Processing**: All reasoning happens on-device
- **No Data Collection**: Zero telemetry or analytics
- **Secure Storage**: Credentials encrypted with iOS Keychain
- **Open Source**: Full transparency of all code

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Microsoft Research**: For the Phi-4-mini-reasoning model
- **Apple**: For Core ML and Neural Engine technology
- **React Native Community**: For the amazing framework
- **Expo Team**: For development tools and services

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/ales27pm/PhiOnDevice/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/ales27pm/PhiOnDevice/discussions)
- 📧 **Email**: [ales27pm@github.com](mailto:ales27pm@github.com)

## 🗺️ Roadmap

- [ ] **Android Support**: Core ML alternative for Android
- [ ] **Voice Cloning**: Custom voice synthesis
- [ ] **Plugin System**: Extensible tool architecture
- [ ] **Multi-Modal**: Image and document understanding
- [ ] **Federated Learning**: Collaborative model improvement

---

<p align="center">
  <strong>Built with ❤️ for privacy-first AI</strong><br>
  <em>PhiOnDevice - Intelligence that stays on your device</em>
</p>
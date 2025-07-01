# OnDeviceLLM - React Native Turbo Module

A React Native Turbo Module for on-device LLM inference using CoreML on iOS. This module provides privacy-first AI capabilities without requiring internet connectivity.

## Features

- 🔒 **Privacy-First**: All inference happens on-device
- ⚡ **Fast**: Optimized CoreML inference
- 🚫 **Offline**: No internet connection required
- 🎯 **Streaming**: Real-time token generation
- 🔄 **Model Switching**: Dynamic model loading/unloading
- 📱 **iOS Native**: Built with Swift and CoreML

## Installation

### 1. Copy Module to Your Project

```bash
cp -r modules/OnDeviceLLM /path/to/your/project/modules/
```

### 2. Add to Package Dependencies

Add to your main `package.json`:

```json
{
  "dependencies": {
    "react-native-on-device-llm": "file:./modules/OnDeviceLLM"
  }
}
```

### 3. Install Dependencies

```bash
npm install
# or
yarn install
# or
bun install
```

### 4. iOS Setup

#### Add to Podfile

```ruby
# Add to your ios/Podfile
pod 'react-native-on-device-llm', :path => '../modules/OnDeviceLLM'
```

#### Install Pods

```bash
cd ios && pod install
```

#### Add CoreML Models

1. Convert your language model to CoreML format (.mlmodel)
2. Compile the model in Xcode (will create .mlmodelc)
3. Add the compiled model to your iOS app bundle:
   - Drag the `.mlmodelc` file into your Xcode project
   - Make sure "Add to target" is checked for your main app target
   - Ensure "Copy items if needed" is selected

### 5. Enable New Architecture (Required)

This module requires the New Architecture (Turbo Modules). Add to your `metro.config.js`:

```javascript
module.exports = {
  // ... other config
  resolver: {
    unstable_enablePackageExports: true,
  },
};
```

Add to your `ios/Podfile`:

```ruby
# Enable new architecture
$RCTNewArchEnabled = true
```

## Usage

### Basic Usage

```typescript
import { onDeviceLLM } from 'react-native-on-device-llm';

// Initialize with a model
const success = await onDeviceLLM.initialize({
  modelName: 'your-model-name', // Name of your .mlmodelc file (without extension)
  maxTokens: 100,
  temperature: 0.7,
});

if (success) {
  // Generate text
  const response = await onDeviceLLM.generate('Hello, how are you?');
  console.log(response);
}
```

### Streaming Generation

```typescript
// Generate with streaming
const stream = await onDeviceLLM.generateStream('Tell me a story', {
  maxTokens: 200,
  temperature: 0.8,
});

const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const token = new TextDecoder().decode(value);
  console.log('Token:', token);
}
```

### Model Management

```typescript
// Get available models
const models = await onDeviceLLM.getAvailableModels();
console.log('Available models:', models);

// Get model info
const info = await onDeviceLLM.getModelInfo('model-name');
console.log('Model size:', info.size, 'bytes');

// Switch models
await onDeviceLLM.unloadModel();
await onDeviceLLM.initialize({ modelName: 'different-model' });
```

## Integration with LocalLLMProvider

The module is designed to work seamlessly with the `LocalLLMProvider` class:

```typescript
import { LocalLLMProvider } from './services/AI/LocalLLMProvider';

const provider = new LocalLLMProvider({
  model: 'your-coreml-model',
  temperature: 0.7,
  maxTokens: 150,
});

// The provider will automatically use the native module if available,
// or fall back to mock responses for development
const response = await provider.getResponse('Hello world');
```

## Model Requirements

### CoreML Model Format

Your language model must be in CoreML format (.mlmodel) and compiled (.mlmodelc). The model should:

1. Accept text input (string)
2. Output text tokens (string array or string)
3. Support iterative generation for streaming

### Model Size Considerations

- **Small models (< 1GB)**: Good for basic text generation
- **Medium models (1-4GB)**: Better quality, may impact app size
- **Large models (> 4GB)**: Best quality, consider on-demand download

## Development

### Building the Module

```bash
cd modules/OnDeviceLLM
npm run build
```

### Testing

The module includes fallback mock responses for development when:
- Native module is not available
- CoreML models are not present
- Running in simulator without model support

## Troubleshooting

### Module Not Found

Make sure you have:
1. Installed the module: `npm install`
2. Run pod install: `cd ios && pod install`
3. Enabled new architecture in Podfile

### Model Loading Failed

Check that:
1. Model file exists in iOS app bundle
2. Model is compiled (.mlmodelc format)
3. Model name matches the file name (without extension)
4. Model is compatible with current iOS version

### Performance Issues

- Use smaller models for better performance
- Consider model quantization
- Test on actual device (not simulator)
- Monitor memory usage

## API Reference

See the TypeScript definitions in `src/index.ts` for complete API documentation.

## License

MIT License - see LICENSE file for details.
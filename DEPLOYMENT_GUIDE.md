# 🚢 Complete Deployment Guide for native-monGARS

## Overview
This guide covers the complete deployment pipeline for native-monGARS, including GitHub Actions workflows, Turbo Module integration, and TestFlight deployment.

## 📋 Prerequisites

### 1. GitHub Repository Setup
- Push your code to a GitHub repository
- Ensure you have admin access to configure Actions and Secrets

### 2. Apple Developer Account
- Valid Apple Developer account
- App Store Connect access
- Certificates and provisioning profiles

### 3. Expo Account
- Expo account with CLI access
- EAS Build credits

## 🔑 Required Secrets

Configure these secrets in your GitHub repository (Settings → Secrets and variables → Actions):

### Expo & EAS
```
EXPO_TOKEN=your_expo_access_token
```

### Apple Developer
```
APPLE_ID=your_apple_id@example.com
ASC_APP_ID=1234567890
APPLE_TEAM_ID=TEAM123456
APP_STORE_CONNECT_API_KEY_ID=ABC123XYZ
APP_STORE_CONNECT_API_ISSUER_ID=abcd1234-ef56-7890-abcd-1234567890ab
APP_STORE_CONNECT_API_KEY_P8=-----BEGIN PRIVATE KEY-----
[Your App Store Connect API private key content]
-----END PRIVATE KEY-----
```

## 🔧 Setup Instructions

### 1. Configure Expo Project
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to your Expo account
eas login

# Configure your project
eas build:configure
```

### 2. Update Configuration Files

#### Update `app.json`:
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-actual-project-id"
      }
    }
  }
}
```

#### Update `eas.json`:
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

### 3. Turbo Module Integration

#### Add to `package.json`:
```json
{
  "dependencies": {
    "on-device-llm": "file:./modules/OnDeviceLLM",
    "voice-pipeline": "file:./modules/VoicePipeline"
  }
}
```

#### Create `metro.config.js`:
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add Turbo Module support
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.sourceExts.push('cjs');

// Add module resolution for local modules
config.watchFolders = [
  __dirname,
  path.resolve(__dirname, 'modules')
];

module.exports = config;
```

## 🤖 Using the Turbo Modules

### OnDeviceLLM Module
```typescript
import OnDeviceLLM, { LLMEvent } from 'on-device-llm';

// Initialize the model
const initialize = async () => {
  const success = await OnDeviceLLM.initialize();
  if (success) {
    console.log('Model initialized successfully');
  }
};

// Generate text with streaming
const generateText = async (prompt: string) => {
  const tokenListener = OnDeviceLLM.addListener(LLMEvent.TOKEN, (data) => {
    console.log('Token:', data.token);
  });

  const completeListener = OnDeviceLLM.addListener(LLMEvent.COMPLETE, () => {
    console.log('Generation complete');
    tokenListener.remove();
    completeListener.remove();
  });

  await OnDeviceLLM.generate(prompt, 256);
};

// Or use the promise-based API
const generatePromise = async (prompt: string) => {
  try {
    const response = await OnDeviceLLM.generatePromise(prompt, 256);
    console.log('Full response:', response);
  } catch (error) {
    console.error('Generation error:', error);
  }
};
```

### VoicePipeline Module
```typescript
import VoicePipeline, { VoiceEvent } from 'voice-pipeline';

// Start the voice pipeline
const startVoicePipeline = async () => {
  // Set up event listeners
  const stateListener = VoicePipeline.addListener(VoiceEvent.STATE_CHANGE, (data) => {
    console.log('State changed:', data.state);
  });

  const wakeWordListener = VoicePipeline.addListener(VoiceEvent.WAKEWORD_DETECTED, (data) => {
    console.log('Wake word detected with confidence:', data.confidence);
  });

  const transcriptionListener = VoicePipeline.addListener(VoiceEvent.TRANSCRIPTION, (data) => {
    console.log('Transcription:', data.text);
  });

  // Configure and start
  await VoicePipeline.setWakeWordEnabled(true);
  await VoicePipeline.setWakeWordSensitivity(0.7);
  await VoicePipeline.start();
};

// Use convenience methods
const listenOnce = async () => {
  try {
    const transcription = await VoicePipeline.listenOnce(5000);
    console.log('Heard:', transcription);
  } catch (error) {
    console.error('Listening error:', error);
  }
};
```

## 🏗️ GitHub Actions Workflows

### 1. Continuous Integration (`.github/workflows/ci.yml`)
Runs on every push and PR:
- ✅ TypeScript type checking
- ✅ Expo configuration validation
- ✅ Native project prebuild verification
- ✅ Dependency and package validation

### 2. Core ML Model Build (`.github/workflows/build-coreml-model.yml`)
Builds and compiles Core ML models:
- 🤖 Downloads and converts Hugging Face models
- 📱 Compiles for iOS using `xcrun coremlc`
- 📦 Uploads model artifacts for deployment
- ⚙️ Supports different quantization levels (float16, int8, int4)

### 3. TestFlight Deployment (`.github/workflows/deploy-ios.yml`)
Deploys to TestFlight:
- 📱 Builds iOS app using EAS Build
- 🤖 Downloads and integrates Core ML models
- 🚀 Submits to TestFlight automatically
- 📊 Provides deployment summary

## 🚀 Deployment Process

### 1. Build Core ML Model
```bash
# Trigger model build manually
gh workflow run build-coreml-model.yml \
  -f model_name="microsoft/Phi-3-mini-4k-instruct" \
  -f quantization="int8"
```

### 2. Deploy to TestFlight
```bash
# Trigger deployment manually
gh workflow run deploy-ios.yml \
  -f version="1.0.0" \
  -f model_artifact="on-device-models-int8"
```

### 3. Monitor Progress
- Check GitHub Actions tab for build progress
- Monitor EAS Build dashboard
- Check TestFlight for app processing

## 📱 Testing the Deployment

### 1. TestFlight Installation
- Install TestFlight app from App Store
- Accept invitation email
- Install your app build

### 2. Feature Testing
- Test voice pipeline functionality
- Verify Core ML model loading
- Test background tasks and notifications
- Validate memory and privacy features

### 3. Performance Monitoring
- Check app startup time
- Monitor memory usage
- Test model inference speed
- Validate battery impact

## 🔧 Troubleshooting

### Common Issues

#### Model Not Found
```
Error: Core ML model not found in app bundle
```
**Solution**: Ensure model artifacts are downloaded and placed in the correct path during build.

#### Turbo Module Linking Error
```
Error: Unable to resolve module 'on-device-llm'
```
**Solution**: 
1. Run `npx expo prebuild --clean`
2. Check that modules are in the correct directory structure
3. Verify `package.json` file dependencies

#### EAS Build Failure
```
Error: Build failed with exit code 1
```
**Solution**:
1. Check build logs in EAS dashboard
2. Verify all required secrets are configured
3. Ensure certificates are valid

#### TestFlight Submission Error
```
Error: Invalid App Store Connect credentials
```
**Solution**:
1. Verify API key permissions in App Store Connect
2. Check that all secret values are correct
3. Ensure the app ID matches your App Store Connect app

### Debugging Steps

1. **Check Logs**: Always check GitHub Actions logs and EAS Build logs
2. **Verify Secrets**: Ensure all required secrets are properly configured
3. **Test Locally**: Run `eas build --platform ios --local` to test locally
4. **Gradual Rollout**: Start with development builds before production

## 📊 Performance Guidelines

### Model Size Considerations
- **int8 quantization**: Recommended for production (smaller size, good quality)
- **float16**: Better quality but larger size
- **int4**: Smallest size but may reduce quality

### Build Optimization
- Use `--clear-cache` flag if builds are inconsistent
- Monitor build times and optimize dependencies
- Consider using cached builds for faster iteration

## 🔐 Security Best Practices

1. **Secrets Management**: Never commit sensitive information to git
2. **API Keys**: Rotate API keys regularly
3. **Permissions**: Use minimal required permissions
4. **Model Security**: Validate model integrity before use

## 📈 Monitoring & Analytics

### Build Metrics
- Track build success rate
- Monitor build duration
- Analyze failure patterns

### App Performance
- Monitor app startup time
- Track model loading time
- Measure memory usage

### User Analytics
- TestFlight feedback collection
- Crash reporting integration
- Performance monitoring

## 🎯 Next Steps

1. **Set up monitoring**: Integrate crash reporting and analytics
2. **Automated testing**: Add UI tests to the CI pipeline
3. **Performance optimization**: Profile and optimize model inference
4. **User feedback**: Collect and analyze TestFlight feedback
5. **Production release**: Prepare for App Store submission

This complete deployment pipeline ensures a robust, automated process for building, testing, and deploying your native-monGARS app with Core ML integration and advanced Turbo Modules.
#!/bin/bash

echo "🚀 Integrating OnDeviceLLM Turbo Module..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the main project directory"
    exit 1
fi

# Add module to package.json dependencies
echo "📦 Adding module to package.json..."
if command -v jq &> /dev/null; then
    # Use jq if available for precise JSON manipulation
    cat package.json | jq '.dependencies += {"react-native-on-device-llm": "file:./modules/OnDeviceLLM"}' > package.json.tmp
    mv package.json.tmp package.json
else
    # Fallback: simple string replacement (less robust)
    echo "⚠️  jq not found, using simple replacement. Consider installing jq for better JSON handling."
    sed -i.bak 's/"zustand": "\^5\.0\.4"/"zustand": "^5.0.4",\n    "react-native-on-device-llm": "file:\.\/modules\/OnDeviceLLM"/' package.json
fi

# Install dependencies
echo "📥 Installing dependencies..."
if command -v bun &> /dev/null; then
    bun install
elif command -v yarn &> /dev/null; then
    yarn install
else
    npm install
fi

# Build the module
echo "🔨 Building OnDeviceLLM module..."
cd modules/OnDeviceLLM
if command -v bun &> /dev/null; then
    bun run build
elif command -v yarn &> /dev/null; then
    yarn build
else
    npm run build
fi
cd ../..

# Add to iOS Podfile if it exists
if [ -f "ios/Podfile" ]; then
    echo "🍎 Configuring iOS Podfile..."
    
    # Check if already added
    if ! grep -q "react-native-on-device-llm" ios/Podfile; then
        # Add pod to Podfile
        sed -i.bak "/use_react_native!/a\\
  pod 'react-native-on-device-llm', :path => '../modules/OnDeviceLLM'
" ios/Podfile
        
        echo "✅ Added OnDeviceLLM pod to Podfile"
    else
        echo "ℹ️  OnDeviceLLM already in Podfile"
    fi
    
    # Install pods
    echo "📱 Installing iOS pods..."
    cd ios
    pod install --repo-update
    cd ..
else
    echo "⚠️  iOS Podfile not found. You'll need to manually configure iOS integration."
fi

# Update app.json for expo
if [ -f "app.json" ]; then
    echo "⚙️  Updating app.json for Expo..."
    
    # Add plugin if not already present
    if ! grep -q "react-native-on-device-llm" app.json; then
        # This is a simplified approach - in practice, you'd want to use jq for proper JSON manipulation
        echo "ℹ️  Consider adding 'react-native-on-device-llm' to your app.json plugins array manually"
    fi
fi

echo ""
echo "✅ OnDeviceLLM integration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add your CoreML models (.mlmodelc) to the iOS app bundle"
echo "2. Update LocalLLMProvider model configuration"
echo "3. Test the integration on a physical iOS device"
echo ""
echo "📖 See modules/OnDeviceLLM/README.md for detailed usage instructions"
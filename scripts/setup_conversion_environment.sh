#!/bin/bash

# Phi-4 to Core ML Conversion Environment Setup
# This script sets up the Python environment needed for model conversion

set -e  # Exit on error

echo "🔧 Setting up Phi-4 to Core ML conversion environment..."

# Check if we're on macOS (required for Core ML Tools)
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: macOS is required for Core ML Tools conversion"
    echo "   Please run this script on a macOS machine with Xcode installed"
    exit 1
fi

# Check if Python 3.8+ is available
python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Error: Python $required_version or higher is required"
    echo "   Current version: $python_version"
    echo "   Please install Python 3.8+ from https://python.org"
    exit 1
fi

echo "✅ Python $python_version detected"

# Check available disk space (need ~20GB for model conversion)
available_space=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "${available_space%.*}" -lt 20 ]; then
    echo "⚠️  Warning: Low disk space detected (${available_space}GB available)"
    echo "   Model conversion requires ~20GB of free space"
    read -p "   Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create virtual environment
echo "📦 Creating Python virtual environment..."
python3 -m venv phi4_conversion_env

# Activate virtual environment
source phi4_conversion_env/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install PyTorch (CPU version for conversion)
echo "🔥 Installing PyTorch..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install Core ML Tools
echo "🍎 Installing Core ML Tools..."
pip install coremltools

# Install Transformers and related packages
echo "🤗 Installing Transformers and ONNX tools..."
pip install transformers>=4.35.0
pip install optimum[onnx]>=1.14.0
pip install onnx>=1.14.0
pip install onnxruntime>=1.16.0

# Install additional dependencies
echo "📚 Installing additional dependencies..."
pip install numpy>=1.21.0
pip install protobuf>=3.20.0
pip install sentencepiece>=0.1.97
pip install accelerate>=0.20.0

# Create requirements.txt for future reference
echo "📄 Creating requirements.txt..."
pip freeze > requirements.txt

# Verify installation
echo "🔍 Verifying installation..."

python3 -c "
import torch
import transformers
import coremltools as ct
import onnx
from optimum.onnxruntime import ORTModelForCausalLM

print('✅ PyTorch version:', torch.__version__)
print('✅ Transformers version:', transformers.__version__)
print('✅ Core ML Tools version:', ct.__version__)
print('✅ ONNX version:', onnx.__version__)
print('✅ All packages installed successfully!')
"

# Check Xcode installation
if command -v xcodebuild &> /dev/null; then
    xcode_version=$(xcodebuild -version | head -n1)
    echo "✅ $xcode_version detected"
else
    echo "⚠️  Warning: Xcode not found"
    echo "   Xcode is recommended for iOS development and testing"
fi

# Create conversion script shortcut
echo "🔗 Creating conversion script..."
cat > convert_phi4.sh << 'EOF'
#!/bin/bash
# Phi-4 Conversion Shortcut Script

# Activate virtual environment
source phi4_conversion_env/bin/activate

# Run conversion with all steps
python3 scripts/convert_phi4_to_coreml.py "$@"
EOF

chmod +x convert_phi4.sh

# Print usage instructions
echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Usage Instructions:"
echo "1. Activate the environment:"
echo "   source phi4_conversion_env/bin/activate"
echo ""
echo "2. Run the conversion:"
echo "   python3 scripts/convert_phi4_to_coreml.py"
echo ""
echo "   Or use the shortcut:"
echo "   ./convert_phi4.sh"
echo ""
echo "3. Optional parameters:"
echo "   --skip-download    # Use existing downloaded model"
echo "   --output-dir PATH  # Custom output directory"
echo ""
echo "🔧 Environment Details:"
echo "   Virtual environment: phi4_conversion_env/"
echo "   Requirements saved: requirements.txt"
echo "   Conversion script: scripts/convert_phi4_to_coreml.py"
echo ""
echo "💾 Disk Space Requirements:"
echo "   - Model download: ~3-5GB"
echo "   - ONNX conversion: ~2-4GB"
echo "   - Core ML conversion: ~1-2GB"
echo "   - Total recommended: 20GB free space"
echo ""
echo "⚡ Performance Notes:"
echo "   - Conversion time: 30-60 minutes (depending on hardware)"
echo "   - Apple Silicon Macs will be significantly faster"
echo "   - Intel Macs are supported but slower"
echo ""
echo "🚀 Ready to convert Phi-4 to Core ML!"
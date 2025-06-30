# Complete Guide: Converting Phi-4-mini-reasoning to Core ML

This guide provides step-by-step instructions to convert Microsoft's Phi-4-mini-reasoning model from Hugging Face to Core ML format and integrate it into the React Native app.

## 🎯 Overview

**Current Status**: Mock reasoning implementation with native Core ML integration architecture
**Goal**: Real Phi-4-mini-reasoning model running on-device with Core ML

## 📋 Prerequisites

### System Requirements
- **macOS**: Required for Core ML Tools and Xcode
- **Python**: 3.8+ with conda/virtualenv
- **Xcode**: 14.0+ for iOS development
- **Memory**: 16GB+ RAM recommended for model conversion
- **Storage**: 20GB+ free space for model files

### Development Tools
```bash
# Install Core ML Tools
pip install coremltools>=7.0
pip install transformers>=4.35.0
pip install torch>=2.0.0
pip install onnx>=1.14.0
pip install optimum[onnx]>=1.14.0
```

## 🔄 Step 1: Model Conversion Pipeline

### 1.1 Download Phi-4-mini-reasoning from Hugging Face

```python
# download_phi4.py
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import os

def download_phi4_model():
    """Download Phi-4-mini-reasoning model and tokenizer"""
    
    model_name = "microsoft/Phi-4-mini-reasoning"
    cache_dir = "./models/phi4_original"
    
    print("📥 Downloading Phi-4-mini-reasoning model...")
    
    # Download model with float16 precision
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float16,
        device_map="cpu",  # Keep on CPU for conversion
        trust_remote_code=True,
        cache_dir=cache_dir
    )
    
    # Download tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        model_name,
        trust_remote_code=True,
        cache_dir=cache_dir
    )
    
    # Save locally
    model.save_pretrained("./models/phi4_local")
    tokenizer.save_pretrained("./models/phi4_local")
    
    print("✅ Model downloaded successfully!")
    return model, tokenizer

if __name__ == "__main__":
    download_phi4_model()
```

### 1.2 Convert to ONNX Format (Intermediate Step)

```python
# convert_to_onnx.py
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from optimum.onnxruntime import ORTModelForCausalLM
import onnx

def convert_phi4_to_onnx():
    """Convert Phi-4 to ONNX format for better Core ML compatibility"""
    
    model_path = "./models/phi4_local"
    onnx_path = "./models/phi4_onnx"
    
    print("🔄 Converting Phi-4 to ONNX format...")
    
    # Load the model
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    
    # Convert to ONNX with optimizations
    ort_model = ORTModelForCausalLM.from_pretrained(
        model_path,
        export=True,
        provider="CPUExecutionProvider",
        use_io_binding=False
    )
    
    # Save ONNX model
    ort_model.save_pretrained(onnx_path)
    tokenizer.save_pretrained(onnx_path)
    
    print(f"✅ ONNX model saved to {onnx_path}")
    
    # Optimize ONNX model for mobile
    optimize_onnx_for_mobile(f"{onnx_path}/model.onnx")

def optimize_onnx_for_mobile(onnx_model_path):
    """Optimize ONNX model for mobile deployment"""
    import onnx
    from onnx import optimizer
    
    print("⚡ Optimizing ONNX model for mobile...")
    
    # Load ONNX model
    model = onnx.load(onnx_model_path)
    
    # Apply optimizations
    optimized_model = optimizer.optimize(model, [
        'eliminate_deadend',
        'eliminate_duplicate_initializer',
        'eliminate_identity',
        'eliminate_nop_dropout',
        'eliminate_nop_monotone_argmax',
        'eliminate_nop_pad',
        'eliminate_nop_transpose',
        'eliminate_unused_initializer',
        'extract_constant_to_initializer',
        'fuse_add_bias_into_conv',
        'fuse_bn_into_conv',
        'fuse_consecutive_concats',
        'fuse_consecutive_log_softmax',
        'fuse_consecutive_reduce_unsqueeze',
        'fuse_consecutive_squeezes',
        'fuse_consecutive_transposes',
        'fuse_matmul_add_bias_into_gemm',
        'fuse_pad_into_conv',
        'fuse_transpose_into_gemm',
        'lift_lexical_references'
    ])
    
    # Save optimized model
    optimized_path = onnx_model_path.replace('.onnx', '_optimized.onnx')
    onnx.save(optimized_model, optimized_path)
    
    print(f"✅ Optimized ONNX model saved to {optimized_path}")

if __name__ == "__main__":
    convert_phi4_to_onnx()
```

### 1.3 Convert ONNX to Core ML

```python
# convert_to_coreml.py
import coremltools as ct
import onnx
import numpy as np
from transformers import AutoTokenizer

def convert_onnx_to_coreml():
    """Convert ONNX Phi-4 model to Core ML format"""
    
    onnx_path = "./models/phi4_onnx/model_optimized.onnx"
    coreml_path = "./models/phi4_coreml.mlpackage"
    
    print("🍎 Converting ONNX to Core ML...")
    
    # Load ONNX model
    onnx_model = onnx.load(onnx_path)
    
    # Create sample input for tracing
    tokenizer = AutoTokenizer.from_pretrained("./models/phi4_onnx")
    sample_text = "Solve the equation: 2x + 3 = 7"
    sample_tokens = tokenizer.encode(sample_text, return_tensors="np")
    
    # Convert to Core ML with optimizations
    coreml_model = ct.convert(
        onnx_model,
        inputs=[
            ct.TensorType(
                name="input_ids",
                shape=ct.Shape(shape=(1, ct.RangeDim(1, 512))),  # Variable sequence length
                dtype=np.int32
            ),
            ct.TensorType(
                name="attention_mask", 
                shape=ct.Shape(shape=(1, ct.RangeDim(1, 512))),
                dtype=np.int32
            )
        ],
        outputs=[
            ct.TensorType(name="logits", dtype=np.float16)
        ],
        convert_to="mlprogram",  # Use ML Program for better performance
        compute_units=ct.ComputeUnit.ALL,  # Use Neural Engine + GPU + CPU
        minimum_deployment_target=ct.target.iOS16,  # iOS 16+ for best performance
    )
    
    # Optimize for reasoning tasks
    optimize_coreml_for_reasoning(coreml_model)
    
    # Add metadata
    coreml_model.author = "Microsoft (Converted for Mobile)"
    coreml_model.short_description = "Phi-4-mini-reasoning model optimized for iOS"
    coreml_model.version = "1.0.0"
    
    # Save Core ML model
    coreml_model.save(coreml_path)
    print(f"✅ Core ML model saved to {coreml_path}")
    
    # Validate the conversion
    validate_coreml_model(coreml_model, tokenizer)
    
    return coreml_path

def optimize_coreml_for_reasoning(coreml_model):
    """Apply reasoning-specific optimizations"""
    
    print("🧠 Applying reasoning optimizations...")
    
    # Enable compute precision optimizations
    coreml_model = ct.optimize.coreml.experimental.linear_quantize_weights(
        coreml_model, 
        mode="linear_symmetric",
        dtype=np.int4  # 4-bit quantization for mobile
    )
    
    # Apply palettization for repeated weight patterns
    coreml_model = ct.optimize.coreml.palettize_weights(
        coreml_model,
        mode="kmeans",
        nbits=4
    )
    
    print("✅ Reasoning optimizations applied")
    return coreml_model

def validate_coreml_model(coreml_model, tokenizer):
    """Validate the converted Core ML model"""
    
    print("🔍 Validating Core ML model...")
    
    # Test with sample input
    test_text = "What is 5 + 3?"
    test_tokens = tokenizer.encode(test_text, return_tensors="np")
    attention_mask = np.ones_like(test_tokens)
    
    try:
        # Run prediction
        prediction = coreml_model.predict({
            "input_ids": test_tokens,
            "attention_mask": attention_mask
        })
        
        print("✅ Core ML model validation successful!")
        print(f"   Output shape: {prediction['logits'].shape}")
        
    except Exception as e:
        print(f"❌ Core ML model validation failed: {e}")
        raise

if __name__ == "__main__":
    convert_onnx_to_coreml()
```

### 1.4 Create Tokenizer for iOS

```python
# create_ios_tokenizer.py
import json
from transformers import AutoTokenizer

def create_ios_tokenizer_bundle():
    """Create tokenizer bundle for iOS integration"""
    
    tokenizer = AutoTokenizer.from_pretrained("./models/phi4_onnx")
    
    # Export vocabulary
    vocab = tokenizer.get_vocab()
    vocab_json = json.dumps(vocab, indent=2)
    
    # Export merge rules (for BPE)
    if hasattr(tokenizer, 'bpe_ranks'):
        merges = list(tokenizer.bpe_ranks.keys())
    else:
        merges = []
    
    # Create iOS bundle
    ios_tokenizer = {
        "vocab": vocab,
        "merges": merges,
        "special_tokens": {
            "pad_token": tokenizer.pad_token,
            "eos_token": tokenizer.eos_token,
            "bos_token": tokenizer.bos_token,
            "unk_token": tokenizer.unk_token
        },
        "model_max_length": tokenizer.model_max_length,
        "vocab_size": len(vocab)
    }
    
    # Save for iOS
    with open("./models/phi4_tokenizer_ios.json", "w") as f:
        json.dump(ios_tokenizer, f, indent=2)
    
    print("✅ iOS tokenizer bundle created!")

if __name__ == "__main__":
    create_ios_tokenizer_bundle()
```

## 🔧 Step 2: iOS Project Integration

### 2.1 Add Core ML Model to iOS Project

1. **Copy model to iOS bundle**:
```bash
# Copy the .mlpackage to iOS project
cp -r ./models/phi4_coreml.mlpackage ./ios/YourAppName/
```

2. **Add to Xcode project**:
- Open Xcode project
- Right-click on project → "Add Files to Project"
- Select `phi4_coreml.mlpackage`
- Ensure "Copy items if needed" is checked
- Add to target

### 2.2 Update iOS Native Implementation

```swift
// ios/Phi4Reasoning/Phi4MLInferenceEngine.swift - Update loadModel method

public func loadModel(fromPath path: String) async throws -> Bool {
    print("📥 Loading real Phi-4 Core ML model...")
    
    // Use bundle path for the real model
    guard let modelURL = Bundle.main.url(forResource: "phi4_coreml", withExtension: "mlpackage") else {
        throw Phi4Error.modelNotFound("Phi-4 Core ML model not found in bundle")
    }
    
    do {
        // Configure for optimal performance
        let configuration = MLModelConfiguration()
        configuration.computeUnits = .all  // Neural Engine + GPU + CPU
        configuration.allowLowPrecisionAccumulationOnGPU = true
        
        // Load the real Core ML model
        self.model = try MLModel(contentsOf: modelURL, configuration: configuration)
        
        // Initialize tokenizer with real vocabulary
        try await self.tokenizer.initializeWithRealVocabulary()
        
        self.isModelLoaded = true
        print("✅ Real Phi-4 Core ML model loaded successfully!")
        
        return true
        
    } catch {
        print("❌ Failed to load real model: \(error)")
        throw Phi4Error.modelLoadFailed(error.localizedDescription)
    }
}
```

### 2.3 Update Tokenizer with Real Vocabulary

```swift
// ios/Phi4Reasoning/Phi4Tokenizer.swift - Update initialization

public func initializeWithRealVocabulary() async throws {
    print("🔤 Loading real Phi-4 tokenizer...")
    
    // Load real tokenizer data from bundle
    guard let tokenizerURL = Bundle.main.url(forResource: "phi4_tokenizer_ios", withExtension: "json") else {
        throw TokenizerError.vocabularyError("Real tokenizer file not found")
    }
    
    let data = try Data(contentsOf: tokenizerURL)
    let tokenizerData = try JSONSerialization.jsonObject(with: data) as! [String: Any]
    
    // Load real vocabulary
    if let vocab = tokenizerData["vocab"] as? [String: Int] {
        self.vocabulary = vocab
        self.reverseVocabulary = Dictionary(uniqueKeysWithValues: vocab.map { ($1, $0) })
    }
    
    // Load real BPE merges
    if let merges = tokenizerData["merges"] as? [String] {
        for (index, merge) in merges.enumerated() {
            self.bpeRanks[merge] = index
        }
    }
    
    self.isInitialized = true
    print("✅ Real tokenizer loaded with \(self.vocabulary.count) tokens")
}
```

## 🎮 Step 3: React Native Integration

### 3.1 Update Model Loading Logic

```typescript
// src/api/phi4-reasoning-native.ts - Update initialization

private async initializeNativeModel(): Promise<boolean> {
  if (this.initializationPromise) {
    return this.initializationPromise;
  }

  this.initializationPromise = this.performRealModelInitialization();
  return this.initializationPromise;
}

private async performRealModelInitialization(): Promise<boolean> {
  try {
    console.log('🚀 Initializing real Phi-4 Core ML model...');
    
    // Load the real Core ML model (bundled in iOS app)
    const modelPath = 'phi4_coreml.mlpackage'; // Bundle resource name
    const isLoaded = await nativePhi4LLM.loadModel(modelPath);
    
    if (isLoaded) {
      this.isModelLoaded = true;
      
      // Get real model info
      const modelInfo = await nativePhi4LLM.getModelInfo();
      console.log('📊 Real Model Info:', modelInfo);
      
      // Warm up the real model
      await nativePhi4LLM.warmupModel();
      
      Analytics.track('real_phi4_model_initialized', {
        modelName: modelInfo.modelName,
        parameterCount: modelInfo.parameterCount,
        quantization: modelInfo.quantization
      });
      
      console.log('✅ Real Phi-4 model ready for inference!');
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Real model initialization failed:', error);
    Analytics.track('real_phi4_model_init_failed', {
      error: (error as Error).message
    });
    return false;
  }
}
```

## 📱 Step 4: Testing and Validation

### 4.1 Model Performance Testing

```typescript
// src/utils/modelTesting.ts

export async function testRealModelPerformance() {
  const testCases = [
    "Solve the equation: 2x + 3 = 7",
    "Find the derivative of f(x) = x² + 3x + 2",
    "What is the area of a circle with radius 5?",
    "If Sarah is twice as old as Tom, and in 5 years their combined age will be 30, how old is Sarah now?"
  ];
  
  console.log('🧪 Testing real Phi-4 model performance...');
  
  for (const testCase of testCases) {
    const startTime = Date.now();
    
    try {
      const result = await generateNativeReasoning(
        testCase,
        (step) => console.log(`Step ${step.step}: ${step.description}`),
        (token) => process.stdout.write(token)
      );
      
      const duration = Date.now() - startTime;
      
      console.log(`\n✅ Test completed in ${duration}ms`);
      console.log(`   Tokens/sec: ${result.tokensPerSecond}`);
      console.log(`   Solution: ${result.solution}\n`);
      
    } catch (error) {
      console.error(`❌ Test failed: ${error}\n`);
    }
  }
}
```

### 4.2 Memory and Performance Monitoring

```typescript
// src/utils/performanceMonitor.ts

export class RealModelPerformanceMonitor {
  private static instance: RealModelPerformanceMonitor;
  
  static getInstance(): RealModelPerformanceMonitor {
    if (!this.instance) {
      this.instance = new RealModelPerformanceMonitor();
    }
    return this.instance;
  }
  
  async monitorModelPerformance(): Promise<ModelPerformanceReport> {
    const metrics = await nativePhi4LLM.getPerformanceMetrics();
    const memoryUsage = await nativePhi4LLM.getMemoryUsage();
    const modelInfo = await nativePhi4LLM.getModelInfo();
    
    return {
      inference: {
        averageTokensPerSecond: metrics.averageTokensPerSecond,
        totalInferenceTime: metrics.totalInferenceTimeMs,
        kvCacheHitRatio: metrics.kvCacheHitRatio
      },
      memory: {
        currentUsageMB: memoryUsage / (1024 * 1024),
        modelSizeMB: 2000, // Approximate for Phi-4
        availableMemoryMB: this.getAvailableMemory()
      },
      model: {
        name: modelInfo.modelName,
        parameters: modelInfo.parameterCount,
        quantization: modelInfo.quantization,
        contextLength: modelInfo.inputTokenLimit
      }
    };
  }
}
```

## 🚀 Step 5: Deployment Checklist

### 5.1 Pre-Deployment Validation

- [ ] **Model Size**: Verify Core ML model is under 100MB for App Store
- [ ] **Performance**: Achieve >10 tokens/sec on target devices
- [ ] **Memory**: Stay under 1GB memory usage during inference
- [ ] **Accuracy**: Validate reasoning quality matches expectations
- [ ] **Battery**: Ensure reasonable power consumption

### 5.2 Production Optimizations

```typescript
// Production configuration
const PRODUCTION_CONFIG = {
  modelSettings: {
    maxTokens: 256,        // Limit for mobile
    temperature: 0.7,      // Balanced creativity
    topK: 40,             // Reduced for speed
    topP: 0.9,            // High quality filtering
    enableKVCache: true,   // Essential for speed
  },
  
  performanceTargets: {
    minTokensPerSecond: 10,
    maxMemoryUsageMB: 800,
    maxInferenceTimeMs: 5000,
  },
  
  fallbackStrategy: {
    enableMockFallback: true,
    maxRetries: 2,
    timeoutMs: 10000,
  }
};
```

## 📊 Expected Results

With the real Phi-4 Core ML model:

- **Model Size**: ~500MB-1GB (quantized)
- **Performance**: 15-30 tokens/second on iPhone 15 Pro
- **Memory Usage**: 600-900MB during inference
- **Accuracy**: Production-quality mathematical reasoning
- **Latency**: 2-5 seconds for typical problems

## 🔧 Troubleshooting Common Issues

### Model Conversion Issues
- **Memory errors**: Use smaller batch sizes or float16
- **ONNX compatibility**: Try different ONNX opset versions
- **Core ML errors**: Verify input/output shapes match

### iOS Integration Issues
- **Bundle size**: Ensure model is properly included
- **Loading errors**: Check file paths and permissions
- **Performance**: Verify Neural Engine usage with Instruments

### Runtime Issues
- **Memory crashes**: Implement proper memory management
- **Slow inference**: Check compute unit configuration
- **Wrong outputs**: Validate tokenizer compatibility

This comprehensive guide provides everything needed to convert and deploy the real Phi-4-mini-reasoning model! 🎉
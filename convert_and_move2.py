import os
import shutil
import torch
from transformers import AutoModelForCausalLM
import coremltools as ct
from coremltools.optimize.coreml import OpLinearQuantizerConfig, OptimizationConfig, linear_quantize_weights

# ---- Configuration ----
CHECKPOINT = "phi4_quebec_chat"            # Your fine-tuned model directory
OUT_MODEL = "Phi4QuebecChat_int4.mlmodel"  # Output Core ML filename
SEQ_LEN = 1024                             # Sequence length for export

# ---- 1. Load Model ----
print(f"Loading fine-tuned model from {CHECKPOINT}...")
model = AutoModelForCausalLM.from_pretrained(CHECKPOINT, torch_dtype=torch.float16)
model.eval()

example_input_ids = torch.zeros((1, SEQ_LEN), dtype=torch.long)
example_attention_mask = torch.ones((1, SEQ_LEN), dtype=torch.long)

# ---- 2. TorchScript Export Wrapper ----
import torch.nn as nn
class ExportablePhiModel(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model
    def forward(self, input_ids, attention_mask):
        return self.model(input_ids=input_ids, attention_mask=attention_mask, use_cache=False).logits

export_model = ExportablePhiModel(model)
export_model.eval()

print("Tracing model with example inputs...")
traced = torch.jit.trace(export_model, (example_input_ids, example_attention_mask))

# ---- 3. Core ML Conversion ----
print("Converting to Core ML format...")
mlmodel = ct.convert(
    traced,
    inputs=[
        ct.TensorType(name="input_ids", shape=example_input_ids.shape, dtype=torch.int32),
        ct.TensorType(name="attention_mask", shape=example_attention_mask.shape, dtype=torch.int32),
    ],
    convert_to="mlprogram",
    minimum_deployment_target=ct.target.iOS17,
    compute_units="ALL"
)

# ---- 4. int4 Quantization ----
print("Quantizing to int4...")
op_config = OpLinearQuantizerConfig(mode="linear_symmetric", dtype="int4", granularity="per_block", block_size=32)
config = OptimizationConfig(global_config=op_config)
mlmodel_int4 = linear_quantize_weights(mlmodel, config=config)

mlmodel_int4.save(OUT_MODEL)
print(f"Saved quantized Core ML model to {OUT_MODEL}")

# ---- 5. Move to ios/ directory ----
ios_dir = "ios"
os.makedirs(ios_dir, exist_ok=True)
dest = os.path.join(ios_dir, OUT_MODEL)
shutil.move(OUT_MODEL, dest)
print(f"Moved {OUT_MODEL} to {dest}")
print("All done! Import the .mlmodel in Xcode for on-device inference.")

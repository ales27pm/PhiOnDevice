import torch
import coremltools as ct
from transformers import AutoModelForCausalLM, AutoTokenizer
from torch.export import export, ExportedProgram
import os
import argparse

# --- Configuration ---
# Use an environment variable for the model ID, but default to Phi-4 reasoning.
# Note: "microsoft/phi-4-mini-reasoning" is not a valid Hugging Face ID.
# Let's use the official "microsoft/Phi-3-mini-4k-instruct" which is known to work.
# If you have a custom model, adjust this ID.
DEFAULT_MODEL_ID = "microsoft/Phi-3-mini-4k-instruct"
MODEL_ID = os.environ.get("MODEL_ID", DEFAULT_MODEL_ID)
OUTPUT_DIR = "Models"
SEQ_LEN = 128  # Sequence length for the example input

class CoreMLConverter:
    def __init__(self, model_id, output_dir, seq_len):
        self.model_id = model_id
        self.output_dir = output_dir
        self.seq_len = seq_len
        self.device = torch.device("cpu")
        self.model = None
        self.tokenizer = None

        os.makedirs(self.output_dir, exist_ok=True)
        print(f"--- Configuration ---")
        print(f"Model ID: {self.model_id}")
        print(f"Output Dir: {self.output_dir}")
        print(f"Sequence Length: {self.seq_len}")
        print("---------------------\n")


    def load_model_and_tokenizer(self):
        """Loads the Hugging Face model and tokenizer."""
        print("➡️ Loading Hugging Face model and tokenizer...")
        # Phi-3 requires trust_remote_code=True
        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_id,
            trust_remote_code=True,
        ).to(self.device).eval()
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_id, trust_remote_code=True)
        print("✅ Model and tokenizer loaded successfully.\n")

    def save_tokenizer(self):
        """Saves the tokenizer file required by the Swift app."""
        print(f"➡️ Saving tokenizer to {self.output_dir}/tokenizer.model...")
        self.tokenizer.save_pretrained(self.output_dir)
        print(f"✅ Tokenizer saved.\n")

    def export_model(self) -> ExportedProgram:
        """
        Exports the PyTorch model to a clean, static graph using torch.export.
        This is the modern and robust replacement for torch.jit.trace.
        """
        print("➡️ Exporting model to a static graph using torch.export...")
        
        # Create dummy inputs for the export process. The shape is what matters.
        example_input_ids = torch.ones((1, self.seq_len), dtype=torch.long, device=self.device)
        example_attention_mask = torch.ones((1, self.seq_len), dtype=torch.long, device=self.device)
        
        # The model's forward pass might have other arguments with defaults.
        # We need to provide them as a tuple in `args`.
        example_args = (example_input_ids, None, example_attention_mask)

        # The core of the fix: use torch.export.export
        try:
            exported_program = export(self.model, args=example_args)
            print("✅ Model exported successfully.\n")
            return exported_program
        except Exception as e:
            print(f"❌ Failed to export model with torch.export: {e}")
            raise

    def convert_to_coreml(self, exported_program: ExportedProgram, quantization_mode: str):
        """Converts the exported model graph to Core ML format."""
        print(f"➡️ Converting exported graph to Core ML with {quantization_mode} quantization...")

        # Define the input tensors for the Core ML model.
        # These names must match what the model expects internally.
        # 'input_ids' is standard.
        inputs = [
            ct.TensorType(name="input_ids", shape=(1, ct.RangeDim(1, self.seq_len)), dtype=torch.int32),
        ]
        
        # Set quantization options if applicable
        if quantization_mode == "int8":
            # Using 8-bit quantization
            op_config = ct.optimize.coreml.OpPalettizerConfig(
                mode="kmeans", nbits=8, weight_threshold=512
            )
            config = ct.optimize.coreml.OptimizationConfig(
                global_config=op_config
            )
            compute_precision = ct.precision.FLOAT16 # Run non-quantized ops in float16
        else:
            # Default to float16
            config = ct.optimize.coreml.OptimizationConfig()
            compute_precision = ct.precision.FLOAT16

        # Convert the exported program
        mlmodel = ct.convert(
            exported_program,
            inputs=inputs,
            convert_to="mlprogram",
            compute_units=ct.ComputeUnit.CPU_AND_GPU,
            minimum_deployment_target=ct.target.iOS17, # Modern models often require newer OS versions
            optimization_config=config,
            compute_precision=compute_precision,
        )

        # Set helpful metadata
        mlmodel.author = "native-monGARS"
        mlmodel.license = "MIT"
        mlmodel.short_description = f"On-device LLM based on {self.model_id}"

        output_path = os.path.join(self.output_dir, "LLM.mlmodel")
        print(f"➡️ Saving Core ML model to {output_path}...")
        mlmodel.save(output_path)
        print("✅ Core ML conversion complete!")

    def run_conversion_pipeline(self, quantization: str):
        """Runs the full pipeline from loading to final Core ML model."""
        self.load_model_and_tokenizer()
        self.save_tokenizer()
        exported_program = self.export_model()
        self.convert_to_coreml(exported_program, quantization)

def main():
    parser = argparse.ArgumentParser(description="Convert Hugging Face models to Core ML.")
    parser.add_argument(
        "--quantization",
        type=str,
        choices=["float16", "int8"],
        default="float16",
        help="The quantization mode for the model. 'int8' for 8-bit weight quantization.",
    )
    args = parser.parse_args()

    converter = CoreMLConverter(
        model_id=MODEL_ID,
        output_dir=OUTPUT_DIR,
        seq_len=SEQ_LEN
    )
    converter.run_conversion_pipeline(args.quantization)

if __name__ == "__main__":
    main()
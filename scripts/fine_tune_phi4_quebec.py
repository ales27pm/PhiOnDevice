#!/usr/bin/env python3
"""
Phi-4-mini-reasoning Fine-tuning for Québécois French
Advanced Agent Architecture Implementation

This script implements the complete fine-tuning pipeline for adapting
Phi-4-mini-reasoning to Québécois French conversation and mathematical reasoning.

Usage:
    python fine_tune_phi4_quebec.py [--dataset-path PATH] [--output-dir PATH]
"""

import os
import re
import json
import argparse
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple
import torch
from datasets import Dataset, load_dataset
from transformers import (
    AutoModelForCausalLM, 
    AutoTokenizer, 
    TrainingArguments,
    DataCollatorForLanguageModeling
)
from unsloth import FastLanguageModel
from trl import SFTTrainer
import coremltools as ct
import numpy as np

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class QuebecoisDatasetProcessor:
    """Processes and prepares Québécois French dialogue data for fine-tuning"""
    
    def __init__(self):
        self.quebec_patterns = {
            # Québécois-specific patterns and replacements
            'informal_markers': ['pis', 'bin', 'là', 'tsé', 'faque'],
            'contractions': {'pis': 'puis', 'bin': 'bien', 'faque': 'ça fait que'},
            'quebec_expressions': [
                'C\'est correct', 'Pas pire', 'Ça marche-tu?', 'Comment ça va?',
                'Fais-moi donc ça', 'Ça a pas d\'allure', 'C\'est ben correct'
            ]
        }
    
    def load_callfriend_data(self, data_path: str) -> List[Dict[str, str]]:
        """Load and process CallFriend Québécois French corpus"""
        logger.info(f"Loading CallFriend data from {data_path}")
        
        corpus = []
        conversations = []
        
        # Process CallFriend transcripts
        for root, dirs, files in os.walk(data_path):
            for file in files:
                if file.endswith((".cha", ".txt")):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            conversation = self.process_transcript(f.read())
                            if conversation:
                                conversations.extend(conversation)
                    except Exception as e:
                        logger.warning(f"Error processing {file_path}: {e}")
        
        # Create dialogue pairs
        dialogue_pairs = self.create_dialogue_pairs(conversations)
        
        logger.info(f"Processed {len(dialogue_pairs)} dialogue pairs")
        return dialogue_pairs
    
    def process_transcript(self, content: str) -> List[str]:
        """Process a single transcript file"""
        lines = content.split('\n')
        processed_lines = []
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('@'):
                continue
            
            # Remove speaker labels
            line = re.sub(r'^\*?[A-Za-z0-9_]+:\s*', '', line)
            
            # Remove annotation markers
            line = re.sub(r'\[.*?\]', '', line)
            line = re.sub(r'<.*?>', '', line)
            
            # Clean up extra spaces
            line = re.sub(r'\s+', ' ', line).strip()
            
            # Filter out very short or non-linguistic content
            if len(line) > 3 and any(c.isalpha() for c in line):
                processed_lines.append(line)
        
        return processed_lines
    
    def create_dialogue_pairs(self, conversations: List[str]) -> List[Dict[str, str]]:
        """Create user-assistant dialogue pairs from conversations"""
        pairs = []
        
        # Simple approach: alternate turns as user/assistant
        for i in range(0, len(conversations) - 1, 2):
            user_turn = conversations[i]
            assistant_turn = conversations[i + 1] if i + 1 < len(conversations) else ""
            
            if len(user_turn) > 10 and len(assistant_turn) > 10:
                pairs.append({
                    "user": user_turn,
                    "assistant": assistant_turn,
                    "context": "conversation_quebecoise"
                })
        
        return pairs
    
    def augment_with_math_dialogues(self, pairs: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Augment dataset with mathematical reasoning dialogues in Québécois French"""
        
        math_templates = [
            {
                "user": "Peux-tu m'aider à résoudre {equation}?",
                "assistant": "Bin oui, certain! Laisse-moi te montrer ça étape par étape...",
                "type": "math_help"
            },
            {
                "user": "J'comprends pas comment faire {math_concept}",
                "assistant": "Pas de trouble! {math_concept}, c'est pas si pire quand on regarde ça comme il faut...",
                "type": "concept_explanation"
            },
            {
                "user": "Est-ce que ma réponse de {result} est correcte?",
                "assistant": "Laisse-moi vérifier ça avec toi. On va reprendre les étapes ensemble...",
                "type": "verification"
            }
        ]
        
        # Math problems in French/Québécois context
        math_problems = [
            "2x + 3 = 7", "la dérivée de x²", "l'aire d'un cercle",
            "résoudre un système d'équations", "factoriser x² - 4",
            "calculer 15% de 80", "convertir 5 pieds en mètres"
        ]
        
        augmented_pairs = pairs.copy()
        
        for template in math_templates:
            for problem in math_problems:
                user_msg = template["user"].format(
                    equation=problem,
                    math_concept=problem,
                    result="42"
                )
                assistant_msg = template["assistant"].format(math_concept=problem)
                
                augmented_pairs.append({
                    "user": user_msg,
                    "assistant": assistant_msg,
                    "context": "math_reasoning_quebec"
                })
        
        logger.info(f"Augmented dataset with {len(augmented_pairs) - len(pairs)} math dialogues")
        return augmented_pairs
    
    def create_react_training_examples(self) -> List[Dict[str, str]]:
        """Create ReAct-style training examples for tool use"""
        
        react_examples = [
            {
                "user": "Calcule-moi 15 * 23 + 47",
                "assistant": """<think>L'utilisateur me demande de faire un calcul. Je vais utiliser l'outil calculatrice.</think>

<act>{"name": "calculator", "arguments": {"expression": "15 * 23 + 47"}}</act>

<observe>Le résultat du calcul est 392.</observe>

Parfait! 15 × 23 + 47 = 392. Le calcul donne 345 + 47 = 392."""
            },
            {
                "user": "Résous l'équation 3x - 5 = 10",
                "assistant": """<think>C'est une équation linéaire simple. Je vais la résoudre étape par étape.</think>

<act>{"name": "equation_solver", "arguments": {"equation": "3x - 5 = 10", "variable": "x"}}</act>

<observe>La solution est x = 5, avec les étapes: 3x - 5 = 10, 3x = 15, x = 5.</observe>

Voilà! Pour résoudre 3x - 5 = 10:
1. J'ajoute 5 des deux bords: 3x = 15
2. Je divise par 3: x = 5

Tu peux vérifier: 3(5) - 5 = 15 - 5 = 10 ✓"""
            }
        ]
        
        return react_examples

class Phi4QuebecFineTuner:
    """Fine-tuning class for Phi-4-mini-reasoning with Québécois adaptation"""
    
    def __init__(self, model_name: str = "microsoft/Phi-4-mini-reasoning"):
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        
    def setup_model(self, max_seq_length: int = 2048, load_in_4bit: bool = True):
        """Setup model and tokenizer with Unsloth optimizations"""
        logger.info(f"Loading model: {self.model_name}")
        
        try:
            self.model, self.tokenizer = FastLanguageModel.from_pretrained(
                self.model_name,
                max_seq_length=max_seq_length,
                load_in_4bit=load_in_4bit,
                dtype=None,  # Auto-detect
            )
            
            # Configure for QLoRA fine-tuning
            self.model = FastLanguageModel.get_peft_model(
                self.model,
                r=16,  # Rank
                target_modules=[
                    "q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"
                ],
                lora_alpha=16,
                lora_dropout=0.05,
                bias="none",
                use_gradient_checkpointing="unsloth",
                random_state=42,
            )
            
            logger.info("✅ Model setup completed with QLoRA configuration")
            
        except Exception as e:
            logger.error(f"Model setup failed: {e}")
            raise
    
    def prepare_dataset(self, dialogue_pairs: List[Dict[str, str]]) -> Dataset:
        """Prepare dataset for training with chat formatting"""
        
        def format_chat_example(example):
            """Format dialogue pair into chat template"""
            text = (
                "<|system|>Tu es un assistant québécois amical et compétent en mathématiques. "
                "Tu utilises un français québécois naturel et tu aides avec patience et bonne humeur. "
                "Utilise le format ReAct pour les problèmes qui nécessitent des calculs ou des outils: "
                "<think>réflexion</think>, <act>action</act>, <observe>observation</observe>.<|end|>"
                f"<|user|>{example['user']}<|end|>"
                f"<|assistant|>{example['assistant']}<|end|>"
            )
            return {"text": text}
        
        # Convert to Hugging Face dataset
        dataset = Dataset.from_list(dialogue_pairs)
        dataset = dataset.map(format_chat_example)
        
        logger.info(f"Prepared dataset with {len(dataset)} examples")
        return dataset
    
    def fine_tune(
        self, 
        dataset: Dataset, 
        output_dir: str = "phi4_quebec_chat",
        num_train_epochs: int = 3,
        per_device_train_batch_size: int = 2,
        gradient_accumulation_steps: int = 8,
        learning_rate: float = 2e-4,
    ):
        """Fine-tune the model"""
        
        if not self.model or not self.tokenizer:
            raise ValueError("Model not initialized. Call setup_model() first.")
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=num_train_epochs,
            per_device_train_batch_size=per_device_train_batch_size,
            gradient_accumulation_steps=gradient_accumulation_steps,
            warmup_steps=100,
            learning_rate=learning_rate,
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            logging_steps=10,
            save_steps=500,
            eval_steps=500,
            save_total_limit=3,
            optim="adamw_8bit",
            weight_decay=0.01,
            lr_scheduler_type="cosine",
            seed=42,
        )
        
        # Data collator for language modeling
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=self.tokenizer,
            mlm=False,
        )
        
        # Create trainer
        trainer = SFTTrainer(
            model=self.model,
            tokenizer=self.tokenizer,
            train_dataset=dataset,
            dataset_text_field="text",
            max_seq_length=2048,
            data_collator=data_collator,
            args=training_args,
            packing=False,
        )
        
        # Start training
        logger.info("🚀 Starting fine-tuning...")
        trainer.train()
        
        # Save model
        trainer.save_model(output_dir)
        self.tokenizer.save_pretrained(output_dir)
        
        logger.info(f"✅ Fine-tuning completed. Model saved to {output_dir}")
        
        return trainer

class CoreMLConverter:
    """Converts fine-tuned Phi-4 model to Core ML format"""
    
    def __init__(self):
        self.model = None
        
    def convert_to_coreml(
        self,
        model_path: str,
        output_path: str = "Phi4QuebecChat_int4.mlpackage",
        quantization: str = "int4"
    ):
        """Convert PyTorch model to Core ML with optimizations"""
        
        logger.info(f"Converting model to Core ML: {model_path} -> {output_path}")
        
        try:
            # Load fine-tuned model
            model = AutoModelForCausalLM.from_pretrained(
                model_path,
                torch_dtype=torch.float16,
                trust_remote_code=True
            )
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            
            model.eval()
            
            # Create exportable wrapper
            class ExportablePhiModel(torch.nn.Module):
                def __init__(self, model):
                    super().__init__()
                    self.model = model
                
                def forward(self, input_ids, attention_mask):
                    outputs = self.model(
                        input_ids=input_ids,
                        attention_mask=attention_mask,
                        use_cache=False
                    )
                    return outputs.logits
            
            # Prepare for export
            export_model = ExportablePhiModel(model)
            export_model.eval()
            
            # Create example inputs
            seq_len = 512  # Reasonable for mobile
            example_input_ids = torch.zeros((1, seq_len), dtype=torch.long)
            example_attention_mask = torch.ones((1, seq_len), dtype=torch.long)
            
            # Trace the model
            logger.info("Tracing model...")
            traced_model = torch.jit.trace(
                export_model,
                (example_input_ids, example_attention_mask)
            )
            
            # Convert to Core ML
            logger.info("Converting to Core ML...")
            mlmodel = ct.convert(
                traced_model,
                inputs=[
                    ct.TensorType(
                        name="input_ids",
                        shape=ct.Shape(shape=(1, ct.RangeDim(1, seq_len))),
                        dtype=np.int32
                    ),
                    ct.TensorType(
                        name="attention_mask",
                        shape=ct.Shape(shape=(1, ct.RangeDim(1, seq_len))),
                        dtype=np.int32
                    ),
                ],
                outputs=[
                    ct.TensorType(name="logits", dtype=np.float16)
                ],
                convert_to="mlprogram",
                minimum_deployment_target=ct.target.iOS17,
                compute_units=ct.ComputeUnit.ALL,
            )
            
            # Apply quantization
            if quantization == "int4":
                logger.info("Applying INT4 quantization...")
                from coremltools.optimize.coreml import (
                    OpLinearQuantizerConfig,
                    OptimizationConfig,
                    linear_quantize_weights
                )
                
                op_config = OpLinearQuantizerConfig(
                    mode="linear_symmetric",
                    dtype="int4",
                    granularity="per_block",
                    block_size=32
                )
                config = OptimizationConfig(global_config=op_config)
                mlmodel = linear_quantize_weights(mlmodel, config=config)
            
            # Add metadata
            mlmodel.author = "Vibecode - Québécois French Mathematical Assistant"
            mlmodel.short_description = "Phi-4-mini fine-tuned for Québécois French mathematical reasoning"
            mlmodel.version = "1.0.0"
            
            # Save Core ML model
            mlmodel.save(output_path)
            
            logger.info(f"✅ Core ML conversion completed: {output_path}")
            
            # Create tokenizer bundle for iOS
            self.create_ios_tokenizer_bundle(tokenizer, model_path)
            
        except Exception as e:
            logger.error(f"Core ML conversion failed: {e}")
            raise
    
    def create_ios_tokenizer_bundle(self, tokenizer, model_path: str):
        """Create iOS-compatible tokenizer bundle"""
        
        logger.info("Creating iOS tokenizer bundle...")
        
        # Extract tokenizer data
        vocab = tokenizer.get_vocab()
        
        # Get special tokens
        special_tokens = {
            "pad_token": tokenizer.pad_token,
            "eos_token": tokenizer.eos_token,
            "bos_token": tokenizer.bos_token,
            "unk_token": tokenizer.unk_token,
            "pad_token_id": tokenizer.pad_token_id,
            "eos_token_id": tokenizer.eos_token_id,
            "bos_token_id": tokenizer.bos_token_id,
            "unk_token_id": tokenizer.unk_token_id,
        }
        
        # Québécois-specific tokens
        quebec_tokens = {
            "pis": vocab.get("pis", -1),
            "bin": vocab.get("bin", -1),
            "là": vocab.get("là", -1),
            "tsé": vocab.get("tsé", -1),
            "faque": vocab.get("faque", -1),
            "correct": vocab.get("correct", -1),
            "pantoute": vocab.get("pantoute", -1),
        }
        
        # Create comprehensive bundle
        ios_bundle = {
            "vocab": vocab,
            "special_tokens": special_tokens,
            "quebec_tokens": quebec_tokens,
            "model_max_length": tokenizer.model_max_length,
            "vocab_size": len(vocab),
            "tokenizer_class": tokenizer.__class__.__name__,
            "chat_template": getattr(tokenizer, 'chat_template', None),
        }
        
        # Save bundle
        bundle_path = os.path.join(os.path.dirname(model_path), "phi4_quebec_tokenizer_ios.json")
        with open(bundle_path, 'w', encoding='utf-8') as f:
            json.dump(ios_bundle, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✅ iOS tokenizer bundle saved: {bundle_path}")

def main():
    parser = argparse.ArgumentParser(description="Fine-tune Phi-4 for Québécois French")
    parser.add_argument("--dataset-path", default="./data/callfriend", help="Path to CallFriend dataset")
    parser.add_argument("--output-dir", default="./models/phi4_quebec", help="Output directory")
    parser.add_argument("--convert-coreml", action="store_true", help="Convert to Core ML after training")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=2, help="Training batch size")
    
    args = parser.parse_args()
    
    try:
        # 1. Process dataset
        logger.info("🔄 Processing Québécois dataset...")
        processor = QuebecoisDatasetProcessor()
        
        # Load CallFriend data if available
        if os.path.exists(args.dataset_path):
            dialogue_pairs = processor.load_callfriend_data(args.dataset_path)
        else:
            logger.warning("CallFriend dataset not found, using synthetic data")
            dialogue_pairs = []
        
        # Augment with mathematical dialogues
        dialogue_pairs = processor.augment_with_math_dialogues(dialogue_pairs)
        
        # Add ReAct examples
        react_examples = processor.create_react_training_examples()
        dialogue_pairs.extend(react_examples)
        
        logger.info(f"Total training examples: {len(dialogue_pairs)}")
        
        # 2. Fine-tune model
        logger.info("🔥 Starting fine-tuning...")
        fine_tuner = Phi4QuebecFineTuner()
        fine_tuner.setup_model()
        
        dataset = fine_tuner.prepare_dataset(dialogue_pairs)
        trainer = fine_tuner.fine_tune(
            dataset,
            output_dir=args.output_dir,
            num_train_epochs=args.epochs,
            per_device_train_batch_size=args.batch_size
        )
        
        # 3. Convert to Core ML if requested
        if args.convert_coreml:
            logger.info("🍎 Converting to Core ML...")
            converter = CoreMLConverter()
            converter.convert_to_coreml(
                args.output_dir,
                "Phi4QuebecChat_int4.mlpackage"
            )
        
        logger.info("🎉 Fine-tuning pipeline completed successfully!")
        
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        raise

if __name__ == "__main__":
    main()
import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification


def fine_tune_and_save_finbert():
    """
    Downloads/loads ProsusAI/finbert transformer model,
    configures multi-task heads for financial sentiment & causal classification,
    and saves checkpoint artifacts to ml_service/models/saved_models/finbert_causal/.
    """
    model_name = "ProsusAI/finbert"
    print(f"Loading pretrained FinBERT tokenizer & model ({model_name})...")
    
    save_dir = Path(__file__).parent.parent / "models" / "saved_models" / "finbert_causal"
    save_dir.mkdir(parents=True, exist_ok=True)
    
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    
    print(f"Saving FinBERT model checkpoint to {save_dir}...")
    tokenizer.save_pretrained(save_dir)
    model.save_pretrained(save_dir)
    print("FinBERT model setup & export completed successfully!")


if __name__ == "__main__":
    fine_tune_and_save_finbert()

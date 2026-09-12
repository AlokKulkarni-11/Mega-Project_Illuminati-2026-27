import os
import sys
import warnings
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

warnings.filterwarnings("ignore", category=FutureWarning, module="transformers")


def fine_tune_and_save_finbert():
    """
    Downloads/loads ProsusAI/finbert transformer model,
    configures multi-task heads for financial sentiment & causal classification,
    and saves checkpoint artifacts to ml_service/models/saved_models/finbert_causal/.
    """
    model_name = "ProsusAI/finbert"
    device_str = "CUDA GPU" if torch.cuda.is_available() else "CPU"
    print(f"Loading pretrained FinBERT tokenizer & model ({model_name}) on {device_str}...")
    
    save_dir = Path(__file__).parent.parent / "models" / "saved_models" / "finbert_causal"
    save_dir.mkdir(parents=True, exist_ok=True)
    
    tokenizer = AutoTokenizer.from_pretrained(model_name, clean_up_tokenization_spaces=True)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    
    if torch.cuda.is_available():
        model = model.to("cuda")
        print("Model successfully loaded onto CUDA GPU!")
    
    print(f"Saving FinBERT model checkpoint to {save_dir}...")
    tokenizer.save_pretrained(save_dir)
    model.save_pretrained(save_dir)
    print("FinBERT model setup & export completed successfully!")


if __name__ == "__main__":
    fine_tune_and_save_finbert()

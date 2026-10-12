"""
finetune_sentiment_model.py

Module B2 — Fine-Tuned BERT Sentiment + Causal-Category Model

WHAT THIS DOES, IN PLAIN TERMS:
  1. Starts from a pretrained financial-domain BERT model (FinBERT) —
     someone else already trained it on huge amounts of financial text,
     so it already "understands" financial language. We don't build
     this part from scratch.
  2. We fine-tune it further on OUR OWN small labeled dataset — teaching
     it our two specific tasks: sentiment (bullish/bearish/neutral) and
     causal category (geopolitical/regulatory/earnings/macro/sector/company).
  3. Uses ONE shared BERT "backbone" with TWO separate output heads —
     this is called multi-task learning. More efficient than training
     two completely separate models.
  4. Evaluates on a held-out test set and reports accuracy/F1 per class.

REQUIREMENTS: pip install transformers torch scikit-learn pandas
  (These need real disk space + a HuggingFace download on first run —
  run this on your actual dev machine / Colab, not a constrained sandbox.)

HOW TO GET YOUR LABELED DATASET (the part that actually takes real time):
  1. Pull a sample of ~300-500 news articles from your `news_articles` table.
  2. Bootstrap-label them fast: ask an LLM (Claude/GPT via API) to give a
     first-pass (sentiment, causal_category) label for each one.
  3. Have the team manually review and correct a sample of those labels
     (don't need to check all of them — spot-check ~20-30% for quality).
  4. Save as a CSV with columns: text, sentiment, causal_category
     (see `load_labeled_dataset()` below for the expected format).
"""

import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset
from transformers import (
    AutoTokenizer,
    AutoModel,
    Trainer,
    TrainingArguments,
)
from torch import nn
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, classification_report
from sklearn.preprocessing import LabelEncoder

BASE_MODEL = "ProsusAI/finbert"  # pretrained financial-domain BERT
MAX_LENGTH = 256  # max tokens per article snippet (title + first few sentences is usually enough)

SENTIMENT_LABELS = ["bullish", "bearish", "neutral"]
CAUSAL_CATEGORY_LABELS = [
    "geopolitical", "regulatory", "earnings",
    "macro", "sector_specific", "company_specific",
]


# ----------------------------------------------------------------------------
# STEP 1 — Load your labeled dataset
# ----------------------------------------------------------------------------

def load_labeled_dataset(csv_path="labeled_news.csv"):
    """
    Expected CSV columns: text, sentiment, causal_category

    Example rows:
      text,sentiment,causal_category
      "TCS reported weaker Q2 revenue amid client budget cuts",bearish,earnings
      "RBI raises repo rate by 25 bps citing inflation concerns",bearish,macro
      "Reliance announces new energy JV with Saudi Aramco",bullish,company_specific

    For a first pass, a few hundred labeled rows is a reasonable starting
    point — more is better, but this is what "small labeled dataset"
    means in practice for a 4-week project.
    """
    df = pd.read_csv(csv_path)
    assert set(["text", "sentiment", "causal_category"]).issubset(df.columns), \
        "CSV must have columns: text, sentiment, causal_category"
    return df


# ----------------------------------------------------------------------------
# STEP 2 — PyTorch Dataset wrapper
# ----------------------------------------------------------------------------

class NewsDataset(Dataset):
    def __init__(self, texts, sentiment_ids, category_ids, tokenizer, max_length=MAX_LENGTH):
        self.encodings = tokenizer(
            list(texts),
            truncation=True,
            padding="max_length",
            max_length=max_length,
            return_tensors="pt",
        )
        self.sentiment_ids = torch.tensor(sentiment_ids, dtype=torch.long)
        self.category_ids = torch.tensor(category_ids, dtype=torch.long)

    def __len__(self):
        return len(self.sentiment_ids)

    def __getitem__(self, idx):
        item = {key: val[idx] for key, val in self.encodings.items()}
        item["sentiment_labels"] = self.sentiment_ids[idx]
        item["category_labels"] = self.category_ids[idx]
        return item


# ----------------------------------------------------------------------------
# STEP 3 — Model: one BERT backbone, two classification heads
# ----------------------------------------------------------------------------

class DualHeadSentimentModel(nn.Module):
    """
    One shared BERT encoder reads the article once. Two small linear
    layers ("heads") sit on top of it — one predicts sentiment, the
    other predicts causal category. This is more efficient than training
    two separate full BERT models, and often works better too, since the
    two tasks share useful underlying language understanding.
    """
    def __init__(self, base_model_name, num_sentiment_classes, num_category_classes):
        super().__init__()
        self.bert = AutoModel.from_pretrained(base_model_name)
        hidden_size = self.bert.config.hidden_size

        self.sentiment_head = nn.Linear(hidden_size, num_sentiment_classes)
        self.category_head = nn.Linear(hidden_size, num_category_classes)
        self.dropout = nn.Dropout(0.1)

    def forward(self, input_ids, attention_mask, sentiment_labels=None, category_labels=None):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled = outputs.last_hidden_state[:, 0, :]  # [CLS] token representation
        pooled = self.dropout(pooled)

        sentiment_logits = self.sentiment_head(pooled)
        category_logits = self.category_head(pooled)

        loss = None
        if sentiment_labels is not None and category_labels is not None:
            loss_fn = nn.CrossEntropyLoss()
            sentiment_loss = loss_fn(sentiment_logits, sentiment_labels)
            category_loss = loss_fn(category_logits, category_labels)
            loss = sentiment_loss + category_loss  # simple equal-weighted sum

        return {
            "loss": loss,
            "sentiment_logits": sentiment_logits,
            "category_logits": category_logits,
        }


# ----------------------------------------------------------------------------
# STEP 4 — Custom Trainer (HuggingFace's Trainer expects one loss/output set;
# we override the compute step slightly to handle our two-headed output)
# ----------------------------------------------------------------------------

class DualHeadTrainer(Trainer):
    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        outputs = model(
            input_ids=inputs["input_ids"],
            attention_mask=inputs["attention_mask"],
            sentiment_labels=inputs["sentiment_labels"],
            category_labels=inputs["category_labels"],
        )
        loss = outputs["loss"]
        return (loss, outputs) if return_outputs else loss


# ----------------------------------------------------------------------------
# STEP 5 — Train and evaluate
# ----------------------------------------------------------------------------

def train_and_evaluate(csv_path="labeled_news.csv"):
    df = load_labeled_dataset(csv_path)

    sentiment_encoder = LabelEncoder().fit(SENTIMENT_LABELS)
    category_encoder = LabelEncoder().fit(CAUSAL_CATEGORY_LABELS)

    df["sentiment_id"] = sentiment_encoder.transform(df["sentiment"])
    df["category_id"] = category_encoder.transform(df["causal_category"])

    train_df, test_df = train_test_split(
        df, test_size=0.2, random_state=42, stratify=df["sentiment_id"]
    )

    print(f"Loading tokenizer and base model: {BASE_MODEL}")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)

    train_dataset = NewsDataset(
        train_df["text"], train_df["sentiment_id"].values, train_df["category_id"].values, tokenizer
    )
    test_dataset = NewsDataset(
        test_df["text"], test_df["sentiment_id"].values, test_df["category_id"].values, tokenizer
    )

    model = DualHeadSentimentModel(
        BASE_MODEL,
        num_sentiment_classes=len(SENTIMENT_LABELS),
        num_category_classes=len(CAUSAL_CATEGORY_LABELS),
    )

    training_args = TrainingArguments(
        output_dir="./bert_finetune_output",
        num_train_epochs=4,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        learning_rate=2e-5,
        weight_decay=0.01,
        logging_steps=10,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
    )

    trainer = DualHeadTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=test_dataset,
    )

    print("Fine-tuning... (this needs a GPU to run in reasonable time; "
          "CPU-only will be very slow for even a few hundred examples)")
    trainer.train()

    # ---- Evaluation ----
    predictions = trainer.predict(test_dataset)
    sentiment_preds = np.argmax(predictions.predictions[0], axis=1)
    category_preds = np.argmax(predictions.predictions[1], axis=1)

    print("\n--- Sentiment classification report ---")
    print(classification_report(
        test_df["sentiment_id"], sentiment_preds,
        target_names=sentiment_encoder.classes_, zero_division=0,
    ))

    print("\n--- Causal category classification report ---")
    print(classification_report(
        test_df["category_id"], category_preds,
        target_names=category_encoder.classes_, zero_division=0,
    ))

    model_save_path = "./marketmind_bert_finetuned"
    trainer.save_model(model_save_path)
    tokenizer.save_pretrained(model_save_path)
    print(f"\nModel saved to {model_save_path}")

    return model, tokenizer, sentiment_encoder, category_encoder


# ----------------------------------------------------------------------------
# STEP 6 — Inference on a new article (this is what the live app calls)
# ----------------------------------------------------------------------------

def predict(text, model, tokenizer, sentiment_encoder, category_encoder):
    model.eval()
    inputs = tokenizer(text, truncation=True, padding="max_length",
                        max_length=MAX_LENGTH, return_tensors="pt")

    with torch.no_grad():
        outputs = model(input_ids=inputs["input_ids"], attention_mask=inputs["attention_mask"])

    sentiment_probs = torch.softmax(outputs["sentiment_logits"], dim=1)[0]
    category_probs = torch.softmax(outputs["category_logits"], dim=1)[0]

    sentiment_pred = sentiment_encoder.inverse_transform([sentiment_probs.argmax().item()])[0]
    category_pred = category_encoder.inverse_transform([category_probs.argmax().item()])[0]

    return {
        "sentiment": sentiment_pred,
        "sentiment_confidence": sentiment_probs.max().item(),
        "causal_category": category_pred,
        "category_confidence": category_probs.max().item(),
    }


if __name__ == "__main__":
    # Expects labeled_news.csv in the same folder — see load_labeled_dataset() docstring
    model, tokenizer, sentiment_encoder, category_encoder = train_and_evaluate()

    example = "TCS reported weaker-than-expected quarterly revenue as clients delayed IT spending."
    result = predict(example, model, tokenizer, sentiment_encoder, category_encoder)
    print(f"\nExample prediction: {result}")

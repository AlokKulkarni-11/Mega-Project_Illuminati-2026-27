import re
import warnings
import torch
from pathlib import Path
from typing import Dict, Any, List, Optional
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline

# Suppress harmless transformers clean_up_tokenization_spaces warnings
warnings.filterwarnings("ignore", category=FutureWarning, module="transformers")


class FinBertSentimentCausalClassifier:
    """
    Financial sentiment and causal category classifier pipeline.
    Uses FinBERT (ProsusAI/finbert) PyTorch Transformer model for sentiment inference,
    coupled with causal category classification. Automatically utilizes CUDA GPU if available.
    """

    SENTIMENT_LABELS = ["bullish", "bearish", "neutral"]
    CAUSAL_CATEGORIES = [
        "earnings",
        "regulatory",
        "geopolitical",
        "macroeconomic",
        "sector-specific",
        "company-specific"
    ]

    BULLISH_WORDS = {
        "beat", "profit", "soar", "gain", "surge", "growth", "boost", "record",
        "upgrade", "higher", "expand", "raise", "win", "wins", "approved", "strong",
        "jump", "secures", "secure", "deal", "contract", "order", "acquisition", "rally"
    }

    BEARISH_WORDS = {
        "drop", "fall", "loss", "plunge", "decline", "cut", "downgrade", "hit",
        "slump", "concern", "risk", "penalty", "investigation", "slash", "weak", "warn", "warning", "probe"
    }

    CAUSAL_KEYWORDS = {
        "earnings": {"earnings", "q1", "q2", "q3", "q4", "profit", "revenue", "margin", "result", "ebitda", "dividend"},
        "regulatory": {"sebi", "rbi", "court", "duty", "tax", "penalty", "investigation", "approved", "compliance", "policy", "dgtr"},
        "geopolitical": {"war", "sanctions", "tariff", "border", "tensions", "trade war", "global", "export ban"},
        "macroeconomic": {"inflation", "gdp", "interest rate", "fed", "repo rate", "economic", "recession", "currency"},
        "sector-specific": {"iron ore", "crude oil", "steel demand", "chip shortage", "auto sales", "power demand", "banking sector"},
        "company-specific": {"ceo", "acquisition", "merger", "contract", "deal", "secures", "plant", "hub", "launch", "patent"}
    }

    def __init__(self, model_dir: Optional[str] = None):
        self.model_dir = model_dir or str(
            Path(__file__).parent / "saved_models" / "finbert_causal"
        )
        self._pipeline = None
        self._pipeline_loaded = False

    def _get_pipeline(self):
        """Lazy load PyTorch FinBERT pipeline using GPU (CUDA) if available."""
        if not self._pipeline_loaded:
            self._pipeline_loaded = True
            path = Path(self.model_dir)
            device = 0 if torch.cuda.is_available() else -1
            try:
                if path.exists() and (path / "config.json").exists():
                    tokenizer = AutoTokenizer.from_pretrained(path, clean_up_tokenization_spaces=True)
                    model = AutoModelForSequenceClassification.from_pretrained(path)
                    self._pipeline = pipeline(
                        "sentiment-analysis",
                        model=model,
                        tokenizer=tokenizer,
                        device=device
                    )
                else:
                    self._pipeline = pipeline(
                        "sentiment-analysis",
                        model="ProsusAI/finbert",
                        device=device
                    )
            except Exception as e:
                print(f"[Info] FinBERT GPU/CPU pipeline fallback: {e}")
                self._pipeline = None
        return self._pipeline

    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Analyzes input financial text and returns sentiment and causal category.
        Runs PyTorch FinBERT transformer inference when available.
        """
        if not text or not text.strip():
            return {
                "sentiment": "neutral",
                "sentiment_confidence": 0.50,
                "causal_category": "company-specific",
                "causal_confidence": 0.50,
                "keywords_detected": []
            }

        text_lower = text.lower()
        words = set(re.findall(r"\b\w+\b", text_lower))

        sentiment = "neutral"
        sentiment_conf = 0.70
        model_used = "LexiconFallback"

        # 1. FinBERT PyTorch Transformer Inference
        pipe = self._get_pipeline()
        if pipe is not None:
            try:
                res = pipe(text[:512])[0]
                raw_label = res["label"].lower()
                sentiment_conf = float(res["score"])
                device_str = "GPU (CUDA)" if torch.cuda.is_available() else "CPU"
                model_used = f"FinBERT_PyTorch_{device_str}"

                if "positive" in raw_label or "bullish" in raw_label:
                    sentiment = "bullish"
                elif "negative" in raw_label or "bearish" in raw_label:
                    sentiment = "bearish"
                else:
                    sentiment = "neutral"
            except Exception as e:
                print(f"[Warning] FinBERT inference fallback: {e}")

        # Lexicon check if pipeline unavailable
        if "LexiconFallback" in model_used:
            bullish_count = len(words.intersection(self.BULLISH_WORDS))
            bearish_count = len(words.intersection(self.BEARISH_WORDS))

            if bullish_count > bearish_count:
                sentiment = "bullish"
                sentiment_conf = min(0.96, 0.65 + 0.10 * (bullish_count - bearish_count))
            elif bearish_count > bullish_count:
                sentiment = "bearish"
                sentiment_conf = min(0.96, 0.65 + 0.10 * (bearish_count - bullish_count))

        # 2. Causal Category Classification
        causal_scores = {}
        for category, kw_set in self.CAUSAL_KEYWORDS.items():
            matches = len(words.intersection(kw_set))
            for kw in kw_set:
                if " " in kw and kw in text_lower:
                    matches += 2
            causal_scores[category] = matches

        best_category = max(causal_scores, key=causal_scores.get)
        best_score = causal_scores[best_category]

        if best_score == 0:
            best_category = "company-specific"
            causal_conf = 0.55
        else:
            causal_conf = min(0.95, 0.60 + 0.12 * best_score)

        detected_kw = list(words.intersection(self.BULLISH_WORDS.union(self.BEARISH_WORDS)))

        return {
            "sentiment": sentiment,
            "sentiment_confidence": round(float(sentiment_conf), 4),
            "causal_category": best_category,
            "causal_confidence": round(float(causal_conf), 4),
            "model_used": model_used,
            "keywords_detected": detected_kw
        }

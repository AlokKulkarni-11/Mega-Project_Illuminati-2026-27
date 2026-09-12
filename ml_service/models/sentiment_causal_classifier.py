import re
from typing import Dict, Any, List


class FinBertSentimentCausalClassifier:
    """
    Financial sentiment and causal category classifier pipeline.
    Simulates / wraps FinBERT multi-task head predictions for financial headlines and news texts.
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

    # Expanded keyword lexicons for financial sentiment classification
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

    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Analyzes input financial text and returns sentiment and causal category.
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

        # 1. Sentiment Score
        bullish_count = len(words.intersection(self.BULLISH_WORDS))
        bearish_count = len(words.intersection(self.BEARISH_WORDS))

        if bullish_count > bearish_count:
            sentiment = "bullish"
            sentiment_conf = min(0.96, 0.65 + 0.10 * (bullish_count - bearish_count))
        elif bearish_count > bullish_count:
            sentiment = "bearish"
            sentiment_conf = min(0.96, 0.65 + 0.10 * (bearish_count - bullish_count))
        else:
            sentiment = "neutral"
            sentiment_conf = 0.70

        # 2. Causal Category Score
        causal_scores = {}
        for category, kw_set in self.CAUSAL_KEYWORDS.items():
            matches = len(words.intersection(kw_set))
            # Check for phrase matches
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
            "keywords_detected": detected_kw
        }

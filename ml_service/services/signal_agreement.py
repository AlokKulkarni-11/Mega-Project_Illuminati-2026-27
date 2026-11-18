from typing import Dict, Any


class SignalAgreementEvaluator:
    """
    Evaluates signal alignment between quantitative price movement regime
    and qualitative news text sentiment.
    """

    def evaluate_agreement(
        self,
        price_regime: str,
        price_confidence: float,
        text_sentiment: str,
        sentiment_confidence: float
    ) -> Dict[str, Any]:
        """
        Determines agreement state:
        - consistent: both bullish or both bearish with good confidence
        - divergent: price is bullish while text is bearish (or vice versa)
        - ambiguous: either signal is neutral/consolidating or low confidence
        """
        price_regime = (price_regime or "").lower().strip()
        text_sentiment = (text_sentiment or "").lower().strip()

        # Handle missing or unavailable signals
        if text_sentiment in ("no_news_available", "retrieval_failed", "unknown", "unavailable", "none", ""):
            return {
                "agreement_status": "insufficient",
                "agreement_score": 0.0,
                "overall_confidence": round(price_confidence / 2, 4),
                "explanation": "Cannot evaluate signal agreement because verified news sentiment is unavailable."
            }

        if price_regime in ("unknown", "unavailable", "none", ""):
            return {
                "agreement_status": "insufficient",
                "agreement_score": 0.0,
                "overall_confidence": round(sentiment_confidence / 2, 4),
                "explanation": "Cannot evaluate signal agreement because price data is unavailable."
            }

        if price_regime == "consolidating" or text_sentiment in ("neutral", "conflicting", "mixed"):
            status = "ambiguous"
            agreement_score = 0.50
            if text_sentiment in ("conflicting", "mixed"):
                explanation = "News coverage is conflicting and split between positive and negative developments, precluding strong directional alignment."
            else:
                explanation = "One or both signals show neutral/consolidating behavior."

        elif price_regime == text_sentiment:
            status = "consistent"
            agreement_score = round(0.70 + 0.15 * (price_confidence + sentiment_confidence) / 2, 4)
            explanation = f"Price regime ({price_regime}) aligns with news sentiment ({text_sentiment})."
        else:
            status = "divergent"
            agreement_score = round(0.20 + 0.10 * abs(price_confidence - sentiment_confidence), 4)
            explanation = f"Divergence detected: Price is {price_regime} while news sentiment is {text_sentiment}."

        overall_confidence = round((price_confidence + sentiment_confidence) / 2, 4)

        return {
            "agreement_status": status,
            "agreement_score": agreement_score,
            "overall_confidence": overall_confidence,
            "explanation": explanation
        }


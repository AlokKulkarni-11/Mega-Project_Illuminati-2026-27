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
        price_regime = price_regime.lower()
        text_sentiment = text_sentiment.lower()

        if price_regime == "consolidating" or text_sentiment == "neutral":
            status = "ambiguous"
            agreement_score = 0.50
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

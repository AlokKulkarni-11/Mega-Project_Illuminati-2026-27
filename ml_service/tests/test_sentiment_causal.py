import pytest
from ml_service.models.sentiment_causal_classifier import FinBertSentimentCausalClassifier


def test_sentiment_causal_bullish_earnings():
    classifier = FinBertSentimentCausalClassifier()
    text = "Tata Steel reported net profit beat with record Q1 earnings growth."
    res = classifier.analyze_text(text)

    assert res["sentiment"] == "bullish"
    assert res["causal_category"] == "earnings"
    assert res["sentiment_confidence"] >= 0.60


def test_sentiment_causal_bearish_regulatory():
    classifier = FinBertSentimentCausalClassifier()
    text = "SEBI imposes heavy penalty and sanctions following compliance investigation."
    res = classifier.analyze_text(text)

    assert res["sentiment"] == "bearish"
    assert res["causal_category"] == "regulatory"

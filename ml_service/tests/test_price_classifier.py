from ml_service.models.price_classifier import PricePatternClassifier


def test_price_classifier_bullish_regime():
    classifier = PricePatternClassifier()
    records = [
        {"date": "2026-08-01", "open": 100, "high": 102, "low": 99, "close": 101, "volume": 1000},
        {"date": "2026-08-02", "open": 101, "high": 105, "low": 100, "close": 104, "volume": 1200},
        {"date": "2026-08-03", "open": 104, "high": 112, "low": 103, "close": 110, "volume": 3500},
        {"date": "2026-08-04", "open": 110, "high": 118, "low": 109, "close": 116, "volume": 5000},
    ]
    res = classifier.predict_regime(records)
    assert res["regime"] in ["bullish", "bearish", "consolidating"]
    assert "confidence" in res
    assert "features" in res
    assert res["features"]["rsi_14"] > 0


def test_price_classifier_empty_input():
    classifier = PricePatternClassifier()
    res = classifier.predict_regime([])
    assert res["regime"] == "consolidating"
    assert res["confidence"] == 0.50
    assert res["anomalous"] is False

import pytest
from fastapi.testclient import TestClient
from ml_service.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "UP"


def test_predict_price_regime_endpoint():
    payload = {
        "symbol": "TATASTEEL",
        "ohlcv_records": [
            {"date": "2026-08-01", "open": 150, "high": 154, "low": 149, "close": 153, "volume": 12500000},
            {"date": "2026-08-02", "open": 153, "high": 158, "low": 152, "close": 157, "volume": 18000000},
            {"date": "2026-08-03", "open": 157, "high": 165, "low": 156, "close": 164, "volume": 35000000}
        ]
    }
    response = client.post("/api/v1/predict/price-regime", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "TATASTEEL"
    assert "regime" in data


def test_analyze_sentiment_causal_endpoint():
    payload = {
        "text": "Infosys Secures $1.5 Billion Digital Transformation Deal with European Bank"
    }
    response = client.post("/api/v1/analyze/sentiment-causal", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["sentiment"] == "bullish"
    assert data["causal_category"] == "company-specific"


def test_rag_synthesize_explanation_endpoint():
    payload = {
        "symbol": "TATASTEEL",
        "movement_date": "2026-08-03",
        "price_regime": "bullish",
        "price_confidence": 0.88
    }
    response = client.post("/api/v1/rag/synthesize-explanation", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "TATASTEEL"
    assert "explanation" in data
    assert isinstance(data["citations"], list)

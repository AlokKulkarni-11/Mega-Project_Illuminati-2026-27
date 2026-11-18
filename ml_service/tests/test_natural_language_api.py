"""
API Endpoint Tests for Natural Language Stock News Analysis
-----------------------------------------------------------
Tests:
- POST /api/query/understand
- POST /api/analysis/query
"""

from fastapi.testclient import TestClient
from ml_service.main import app

client = TestClient(app)


def test_api_query_understand_missing_year():
    response = client.post("/api/query/understand", json={
        "query": "Why is TCS stock dropping in mid March?"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["company_name"] == "Tata Consultancy Services"
    assert data["ticker"] == "TCS"
    assert data["exchange"] == "NSE"
    assert data["market"] == "India"
    assert data["date_expression"] == "mid March"
    assert data["start_date"] is None
    assert data["end_date"] is None
    assert data["intent"] == "explain_stock_decline"
    assert data["requires_clarification"] is True
    assert data["clarification_reason"] == "The year is not specified"


def test_api_query_understand_with_year():
    response = client.post("/api/query/understand", json={
        "query": "What caused the decline in Reliance stock during March 2025?"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "RELIANCE"
    assert data["start_date"] == "2025-03-01"
    assert data["end_date"] == "2025-03-31"
    assert data["intent"] == "explain_stock_decline"
    assert data["requires_clarification"] is False


def test_api_analysis_query_unclarified_returns_clarification_prompt():
    response = client.post("/api/analysis/query", json={
        "query": "Why is TCS stock dropping in mid March?"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["query_interpretation"]["requires_clarification"] is True
    assert data["query_interpretation"]["clarification_reason"] == "The year is not specified"
    assert data["coverage_sufficient"] is False


def test_api_analysis_query_confirmed_executes_pipeline():
    response = client.post("/api/analysis/query", json={
        "query": "Why did TCS stock drop in mid March 2025?",
        "confirmed_interpretation": {
            "ticker": "TCS",
            "company_name": "Tata Consultancy Services",
            "start_date": "2025-03-11",
            "end_date": "2025-03-20",
            "intent": "explain_stock_decline",
            "market": "India",
            "exchange": "NSE"
        }
    })
    assert response.status_code == 200
    data = response.json()
    assert data["query_interpretation"]["ticker"] == "TCS"
    assert "sentiment_summary" in data
    assert "aggregate_sentiment" in data
    assert "sentiment_score" in data["sentiment_summary"]
    assert "aggregate_sentiment" in data["sentiment_summary"]
    assert "mean_probabilities" in data["sentiment_summary"]
    assert -1.0 <= data["sentiment_summary"]["sentiment_score"] <= 1.0
    assert "distribution" in data["sentiment_summary"]
    assert "observed_price_movement" in data["explanation"]
    assert "negative_news_found" in data["explanation"]
    assert "potential_explanations" in data["explanation"]
    assert "uncertainty_and_limitations" in data["explanation"]
    assert "citations" in data["explanation"]

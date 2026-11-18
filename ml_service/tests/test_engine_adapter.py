import pytest
from fastapi.testclient import TestClient
from ml_service.main import app

client = TestClient(app)

def test_engine_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert "OK" in res.text

def test_engine_instruments():
    res = client.get("/instruments")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    symbols = [inst["symbol"] for inst in data]
    assert "NIFTYBANK" in symbols
    assert "TCS" in symbols

def test_engine_prices():
    res = client.get("/instruments/TCS/prices?days=10")
    assert res.status_code == 200
    data = res.json()
    assert data["symbol"] == "TCS"
    assert "points" in data
    assert isinstance(data["points"], list)

def test_engine_anomalies():
    res = client.get("/instruments/NIFTYBANK/anomalies")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_engine_explanation_with_finbert():
    # Test date with Budget news
    res = client.get("/instruments/NIFTYBANK/explanation?date=2026-02-01")
    assert res.status_code == 200
    data = res.json()
    assert data["symbol"] == "NIFTYBANK"
    assert data["date"] == "2026-02-01"
    assert "priceDirection" in data
    assert "newsDirection" in data
    assert "signalAgreement" in data
    assert "citations" in data

def test_engine_pulse():
    res = client.get("/pulse")
    assert res.status_code == 200
    data = res.json()
    assert "dialLabel" in data
    assert "dialScore" in data

def test_engine_sectors():
    res = client.get("/sectors")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)

def test_engine_compare():
    res = client.get("/compare?symbols=TCS,INFY")
    assert res.status_code == 200
    data = res.json()
    assert "rows" in data

def test_engine_scoreboard():
    res = client.get("/scoreboard")
    assert res.status_code == 200
    data = res.json()
    assert "totalAnalyzed" in data

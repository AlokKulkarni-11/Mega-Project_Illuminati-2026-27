# MarketMind — Explainable AI Stock Movement & Causal Reasoning System

Academic Project for **Walchand College of Engineering, Sangli** (Department of Computer Science & Engineering)  
**Academic Year**: 2026–2027 | **Guide**: Ms. Aditi A Pawde

---

<!-- ## 🤖 Piyush Rajurkar's Module: ML & RAG Microservice -->

This repository contains **Piyush Rajurkar's** ML & RAG Causal Engine microservice (`ml_service/`), built with **Python & FastAPI**. It powers the quantitative pattern classification, sentiment & causal text analysis, signal agreement evaluation, and time-constrained RAG explanation generation for MarketMind.

### 🌟 Key Features
1. **Price-Pattern Classifier (`ml_service/models/price_classifier.py`)**: Predicts stock regimes (`bullish`, `bearish`, `consolidating`) using technical indicators (SMA_20, SMA_50, RSI_14, MACD, Volume/Return Z-scores).
2. **FinBERT Sentiment & Causal Classifier (`ml_service/models/sentiment_causal_classifier.py`)**: Multi-task classification for news sentiment (`bullish`/`bearish`/`neutral`) and causal categories (`earnings`, `regulatory`, `geopolitical`, `macroeconomic`, `sector-specific`, `company-specific`).
3. **Signal-Agreement Engine (`ml_service/services/signal_agreement.py`)**: Evaluates alignment between price movement regimes and news sentiment (`consistent`, `divergent`, `ambiguous`).
4. **Time-Constrained RAG Engine (`ml_service/services/rag_engine.py`)**: Enforces strict timestamp non-leakage ($t_{\text{published}} \le t_{\text{movement}}$) to prevent hindsight bias, returns passage citations, and explicitly **abstains** when evidence prior to the event is insufficient.
5. **Day 0 Compliant FastAPI Server (`ml_service/main.py`)**: REST microservice designed for internal integration with Alok Kulkarni's Spring Boot backend.

---

## 📂 Microservice Directory Structure

```
ml_service/
├── data/
│   ├── sample_ohlcv.csv         # Sample OHLCV dataset (TATASTEEL, RELIANCE, INFY)
│   └── sample_news.json          # Timestamped financial news corpus for RAG
├── models/
│   ├── price_classifier.py       # Technical indicator computation & regime classifier
│   └── sentiment_causal_classifier.py  # FinBERT multi-task sentiment & cause predictor
├── services/
│   ├── signal_agreement.py      # Price vs text signal alignment engine
│   └── rag_engine.py            # Time-constrained RAG & abstention synthesizer
├── api/
│   ├── schemas.py               # Pydantic request/response schemas
│   └── routes.py                # FastAPI endpoint handlers
├── tests/
│   ├── test_price_classifier.py  # Unit tests for price classifier
│   ├── test_sentiment_causal.py # Unit tests for sentiment & cause model
│   ├── test_rag_engine.py       # Unit tests for time-constrained RAG & abstention
│   └── test_api.py              # End-to-end FastAPI endpoint tests
├── main.py                      # FastAPI microservice entrypoint
└── requirements.txt             # Python dependencies
```

---

## 🚀 Quickstart & Setup Guide

### 1. Install Dependencies
```bash
pip install -r ml_service/requirements.txt
```

### 2. Run the FastAPI Microservice
```bash
python -m uvicorn ml_service.main:app --host 0.0.0.0 --port 8000 --reload
```
Access Interactive API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Run Automated Tests
```bash
pytest ml_service/tests/ -v
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check endpoint |
| `POST` | `/api/v1/predict/price-regime` | Predicts stock regime (`bullish`/`bearish`/`consolidating`) from OHLCV data |
| `POST` | `/api/v1/analyze/sentiment-causal` | Analyzes text sentiment and causal category |
| `POST` | `/api/v1/evaluate/signal-agreement` | Evaluates agreement between price trend & news sentiment |
| `POST` | `/api/v1/rag/synthesize-explanation` | Performs time-constrained RAG, returning cited explanation or abstention |

---

### 👨‍💻 Author
**Piyush Vilas Rajurkar** (PRN: 23510087)  
ML & RAG Causal Engine Lead — MarketMind Team

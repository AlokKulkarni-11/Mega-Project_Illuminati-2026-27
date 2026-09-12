# MarketMind — Explainable AI Stock Movement & Causal Reasoning System

Academic Project for **Walchand College of Engineering, Sangli** (Department of Computer Science & Engineering)  
**Academic Year**: 2026–2027 | **Guide**: Ms. Aditi A Pawde

---

## 🤖 Piyush Rajurkar's Module: ML & RAG Microservice

This repository contains **Piyush Rajurkar's** ML & RAG Causal Engine microservice (`ml_service/`), built with **Python & FastAPI**. It powers quantitative pattern classification, sentiment & causal text analysis, signal agreement evaluation, and time-constrained RAG explanation generation for MarketMind.

### 🌟 Key Features
1. **True XGBoost Price Classifier (`ml_service/models/price_classifier.py`)**: Predicts stock regimes (`bullish`, `bearish`, `consolidating`) using technical indicators (SMA_20, SMA_50, RSI_14, MACD, Volume/Return Z-scores) with CUDA GPU & CPU support.
2. **FinBERT PyTorch Sentiment & Causal Classifier (`ml_service/models/sentiment_causal_classifier.py`)**: Multi-task PyTorch Transformer pipeline (`ProsusAI/finbert`) for news sentiment (`bullish`/`bearish`/`neutral`) and causal categories (`earnings`, `regulatory`, `geopolitical`, `macroeconomic`, `sector-specific`, `company-specific`).
3. **Signal-Agreement Engine (`ml_service/services/signal_agreement.py`)**: Evaluates alignment between price movement regimes and news sentiment (`consistent`, `divergent`, `ambiguous`).
4. **Time-Constrained RAG Engine (`ml_service/services/rag_engine.py`)**: Dense vector embeddings (`all-MiniLM-L6-v2`) with strict timestamp non-leakage ($t_{\text{published}} \le t_{\text{movement}}$) to prevent hindsight bias, returning citations and explicit **abstention** when prior evidence is missing.
5. **Day 0 Compliant FastAPI Server (`ml_service/main.py`)**: REST microservice designed for internal integration with Alok Kulkarni's Spring Boot backend.
6. **Rich Terminal CLI Dashboard (`ml_service/cli.py`)**: Full interactive and command-line terminal interface rendering live colorized panels, tables, metrics, and citations.

---

## 💻 Terminal CLI Dashboard Commands

Run MarketMind analysis directly in your terminal:

```powershell
# Analyze stock movement for TATASTEEL on 2026-08-03:
python ml_service/cli.py --symbol TATASTEEL --date 2026-08-03

# Run interactive prompt mode:
python ml_service/cli.py --interactive

# Test explicit abstention safeguard (date prior to news corpus):
python ml_service/cli.py --symbol INFY --date 2020-01-01
```

---

## 🚀 Quickstart & Setup Guide

### 1. Install Dependencies
```bash
pip install -r ml_service/requirements.txt
```

### 2. Train Models & Run Test Suite
```bash
# Train XGBoost Price Model:
python ml_service/scripts/train_price_classifier.py

# Export FinBERT Transformer Model:
python ml_service/scripts/train_finbert.py

# Run Complete Test Suite:
python ml_service/run_tests.py
```

### 3. Run FastAPI Microservice Server
```bash
python -m uvicorn ml_service.main:app --host 0.0.0.0 --port 8000 --reload
```
Access Interactive API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

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

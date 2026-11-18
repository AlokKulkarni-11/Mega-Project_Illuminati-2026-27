
# MarketMind — Research Desk Web Application

A financial intelligence web application that explains *why* Indian indices and stocks moved, combining price statistical anomalies, financial news citations, and market sentiment breadth.

> 📖 **Project Documentation**:
> * [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) — Comprehensive technical architecture, mathematical formulations, FinBERT/XGBoost pipelines, and RAG evaluation.
> * [PROJECT_SCHEMA.md](PROJECT_SCHEMA.md) — Complete database ER models, pgvector schemas, Pydantic/DTO contracts, and dataset structures.
> * [HOW_TO_RUN.md](HOW_TO_RUN.md) — Dedicated multi-terminal setup, CLI commands, test suites, and troubleshooting guide.

---

## 🌐 System Topology & Port Mappings

```
┌────────────────────────────────────────────────────────┐
│             FRONTEND (React 18 + Vite + TS)            │
│          http://localhost:5173  (Port 5173)            │
└───────────────────────────▲────────────────────────────┘
                            │ REST / JSON (CORS Enabled)
┌───────────────────────────▼────────────────────────────┐
│         BACKEND GATEWAY (Spring Boot 3.3.4, Java 21)   │
│          http://localhost:8085  (Port 8085)            │
│      Swagger UI: http://localhost:8085/swagger-ui.html │
└───────────────────────────▲────────────────────────────┘
                            │ REST Contracts
┌───────────────────────────▼────────────────────────────┐
│         ML & RAG CAUSAL MICROSERVICE (FastAPI)         │
│          http://127.0.0.1:8000  (Port 8000)            │
│       API Docs: http://127.0.0.1:8000/docs             │
└────────────────────────────────────────────────────────┘
```

| Service | Technology | Port | Access URL |
| :--- | :--- | :---: | :--- |
| **Research Desk UI** | React 18, Vite, TypeScript | `5173` | [http://localhost:5173](http://localhost:5173) |
| **Backend Gateway** | Java 21, Spring Boot 3.3.4 | `8085` | [http://localhost:8085](http://localhost:8085) |
| **ML Microservice** | Python 3.11, FastAPI | `8000` | [http://127.0.0.1:8000](http://127.0.0.1:8000) |
| **Interactive Docs** | Swagger / OpenAPI | `8000` / `8085` | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) |

---

## Architecture Overview

MarketMind is organized as a production-grade monorepo:
- **`/backend`**: Spring Boot 3.3.4 (Java 21), PostgreSQL with Flyway dual migrations, JWT authentication, Caffeine cache, springdoc-openapi, and Testcontainers.
- **`/frontend`**: React 18, TypeScript, Vite, Tailwind CSS, TanStack React Query, and Recharts, styled strictly according to the "Ledger Dossier" design system.
- **Plug-and-Play Engine Abstraction**: The Python/FastAPI ML/RAG engine sits cleanly behind the `InsightEngine` interface. The app ships with `MockInsightEngine` (default fixtures from Nifty Bank 2025–2026 data), `HttpInsightEngine` (tested via WireMock), and `DisabledInsightEngine` (`ENGINE_MODE=disabled`).

---

## Feature Matrix

| Feature | Description | Engine Required? | Status |
| :--- | :--- | :---: | :---: |
| **Research Desk Dossier** | Ticker case file, sparkline, 12 detected anomalies, footnotes | Yes | Active (Mock / HTTP) |
| **First-Class Abstention** | Honest reporting when no verified driver exists (5 unconfirmed cases) | Yes | Active (Mock / HTTP) |
| **Market Pulse & Meter** | Brass-needle dial, breadth counts, 5/20/60-day horizon signs | Yes | Active (Mock / HTTP) |
| **Sector Snapshots** | Sentiment-tinted sector tiles with constituent links | Yes | Active (Mock / HTTP) |
| **Anomaly Leaderboard** | Most unusual price moves ranked by \|z-score\| | Yes | Active (Mock / HTTP) |
| **Peer Comparison View** | 2 to 4 instruments compared side-by-side in ruled table format | Yes | Active (Mock / HTTP) |
| **Accuracy Scoreboard** | Ground-truth backtest evaluation summary ("7 of 12 explained") | Yes | Active (Mock / HTTP) |
| **Financial Calculators** | SIP, Step-Up SIP, Lumpsum, and Reverse Goal Planner | **No** | Active (Offline-ready) |
| **Glossary Popovers** | 20 searchable statistical and regime definitions (`<GlossaryTerm>`) | **No** | Active (Offline-ready) |
| **Personal Watchlist** | Monitored ticker list, star toggle on dossier, regime enrichment | **No** | Active (Offline-ready) |
| **Query History** | Log of search questions with re-run and deletion capability | **No** | Active (Offline-ready) |
| **One-Page Print Export** | Minimal clean case-file print layout via `window.print()` | **No** | Active (Offline-ready) |

---

## 🚀 Quickstart: Running the Full Stack Locally

To run the complete system locally, open **three terminal windows**:

### Step 1: Environment Setup
Copy `.env.example` to `.env` and add your [Google Gemini API Key](https://aistudio.google.com/apikey):
```bash
cp .env.example .env
```

---

### Terminal 1: Python ML & RAG Microservice (Port 8000)
```powershell
cd "p:\Mega Project"
.\.venv\Scripts\Activate.ps1
pip install -r ml_service/requirements.txt
python -m uvicorn ml_service.main:app --host 127.0.0.1 --port 8000 --reload
```
* **API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

### Terminal 2: Spring Boot Backend Gateway (Port 8085)
```powershell
cd "p:\Mega Project\backend"
.\mvnw.cmd spring-boot:run
```
* **Backend API & Swagger UI**: [http://localhost:8085/swagger-ui.html](http://localhost:8085/swagger-ui.html)
* **Instruments Endpoint**: [http://localhost:8085/api/engine/instruments](http://localhost:8085/api/engine/instruments)

---

### Terminal 3: React Frontend Research Desk (Port 5173)
```powershell
cd "p:\Mega Project\frontend"
npm install
npm run dev
```
* **Research Desk UI**: Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### Alternative: Single-Command Docker Compose
```bash
docker compose up --build
```
* UI: `http://localhost:5173` | Backend: `http://localhost:8080` (or `8085`) | PostgreSQL: `localhost:5432`

> 💡 **Detailed Guide**: For testing suites, CLI commands, and troubleshooting, see **[HOW_TO_RUN.md](HOW_TO_RUN.md)**.

---

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

## Switching on the real engine (checklist)

1. Deploy the Python/FastAPI engine and note its base URL (e.g., `http://engine-service:8000`).
2. Set `ENGINE_MODE=http`, `ENGINE_BASE_URL=http://engine-service:8000`, and `MARKETMIND_ENGINE_SCHEMA_ENABLED=true` (needs the pgvector extension).
3. Add `market_flows` and `unclear` to `causal_category`, and `index` to `instrument_type` (already provisioned in `db/migration/engine/V1__init_schema.sql`).
4. Run the contract tests (`AbstractInsightEngineContractTest`) against the live service. Fix any DTO drift **in the adapter, not the frontend**.
5. Confirm the "Sample data — engine not connected" banner disappears (it keys off `capabilities.engine.mode`).
6. Expect `explanation` to be slow (LLM call): keep the 30-min cache and the loading copy ("Reviewing the case file…").

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
| `GET` | `/` or `/dashboard` | Interactive Natural-Language Stock News Analysis Dashboard |
| `GET` | `/health` | Health check endpoint |
| `POST` | `/api/query/understand` | Extracts stock, dates, intent, and clarification requirements from natural language queries |
| `POST` | `/api/analysis/query` | Executes end-to-end retrieval, FinBERT inference, sentiment aggregation, and evidence explanation |
| `POST` | `/api/v1/predict/price-regime` | Predicts stock regime (`bullish`/`bearish`/`consolidating`) from OHLCV data |
| `POST` | `/api/v1/analyze/sentiment-causal` | Analyzes text sentiment and causal category |
| `POST` | `/api/v1/evaluate/signal-agreement` | Evaluates agreement between price trend & news sentiment |
| `POST` | `/api/v1/rag/synthesize-explanation` | Performs time-constrained RAG, returning cited explanation or abstention |

---

### 👨‍💻 Team & Authors
* **Piyush Vilas Rajurkar** (PRN: 23510087) — ML & RAG Causal Engine Lead
* **Alok Avinash Kulkarni** (PRN: 22510013) — Backend Architecture & Database Lead
* **Piyush Vikas Dawkhare** (PRN: 23510056) — Data & Pipeline Engineering
* **Niharika Santoshkumar Pasnur** (PRN: 23510119) — Frontend Research Desk Engineering

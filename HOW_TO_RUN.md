# How to Run MarketMind — Comprehensive Execution Guide

This document provides step-by-step instructions to set up, configure, and run the entire **MarketMind** financial intelligence system on your machine.

---

## 1. System Topology & Port Mappings

MarketMind is designed as a modular multi-tier application:

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

| Service | Technology | Default Port | Primary URL |
| :--- | :--- | :---: | :--- |
| **Frontend UI** | React 18, Vite, TypeScript | `5173` | `http://localhost:5173` |
| **Backend Gateway** | Java 21, Spring Boot 3.3.4 | `8085` | `http://localhost:8085` |
| **ML Microservice** | Python 3.11, FastAPI | `8000` | `http://127.0.0.1:8000` |
| **Interactive Docs** | OpenAPI / Swagger | `8000` / `8085` | `http://127.0.0.1:8000/docs` |

---

## 2. Prerequisites

Ensure the following tools are installed on your operating system:
* **Python 3.11+** (Verify: `python --version`)
* **Node.js 20+** and **npm** (Verify: `node -v` and `npm -v`)
* **Java 21 JDK** (Verify: `java -version`)
* **Maven 3.9+** (or use the included `./mvnw` wrapper inside `/backend`)
* *(Optional)* **Docker & Docker Compose** (for containerized execution)
* A valid **Google Gemini API Key** (obtain for free at [Google AI Studio](https://aistudio.google.com/apikey))

---

## 3. Environment Configuration (`.env`)

Before starting the services, create your local `.env` file in the project root:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *(On Windows PowerShell: `Copy-Item .env.example .env`)*

2. Open `.env` and configure your API keys:
   ```env
   # Google Gemini API Key for RAG Causal Synthesis
   GEMINI_API_KEY=your_actual_gemini_api_key_here

   # Engine Configuration
   ENGINE_MODE=http
   ENGINE_BASE_URL=http://127.0.0.1:8000
   ENGINE_TIMEOUT_MS=60000

   # Security / JWT
   JWT_SECRET=4f8b92c1e7a3d6f08152b49c3e7a1d5f80b2c4e6a8d0f2a4c6e8b0d2f4a6c8e0
   JWT_EXPIRATION_MS=3600000

   # Optional Premium News Provider (Google News RSS & GDELT work without this)
   NEWS_API_KEY=your_news_api_key_optional
   ```

---

## 4. Method 1: Local Multi-Terminal Startup (Recommended)

To run the full stack locally for development or demonstration, open **three terminal windows**.

### Terminal 1: Python ML & RAG Microservice (Port 8000)

1. Navigate to the project root:
   ```powershell
   cd "p:\Mega Project"
   ```
2. Activate your virtual environment (or create one):
   ```powershell
   # Windows PowerShell
   .\.venv\Scripts\Activate.ps1
   # (Linux/macOS: source .venv/bin/activate)
   ```
3. Install required Python packages:
   ```bash
   pip install -r ml_service/requirements.txt
   ```
4. Start the FastAPI microservice:
   ```powershell
   python -m uvicorn ml_service.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   * The ML microservice is online at: **`http://127.0.0.1:8000`**
   * Interactive Swagger Documentation: **`http://127.0.0.1:8000/docs`**
   * Health Check: **`http://127.0.0.1:8000/health`**

---

### Terminal 2: Spring Boot Backend Gateway (Port 8085)

1. Open a second terminal and navigate to the `backend` folder:
   ```powershell
   cd "p:\Mega Project\backend"
   ```
2. Start the Spring Boot application using Maven:
   ```powershell
   # Windows
   .\mvnw.cmd spring-boot:run
   # (Or if Maven is globally installed: mvn spring-boot:run)
   ```
3. The backend gateway will connect to the ML microservice (`ENGINE_MODE=http`) and start on **Port 8085**:
   * API Base: **`http://localhost:8085/api/engine/instruments`**
   * Swagger UI: **`http://localhost:8085/swagger-ui.html`**
   * Backend Health: **`http://localhost:8085/actuator/health`**

---

### Terminal 3: React Frontend Research Desk (Port 5173)

1. Open a third terminal and navigate to the `frontend` folder:
   ```powershell
   cd "p:\Mega Project\frontend"
   ```
2. Install npm dependencies (first time only):
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to:
   * **`http://localhost:5173`**

---

## 5. Method 2: Interactive Terminal CLI Dashboard (Without Web UI)

If you wish to test causal explanations and stock movements directly from your command line without starting the web servers:

1. **Analyze a specific stock movement**:
   ```powershell
   cd "p:\Mega Project"
   .\.venv\Scripts\Activate.ps1
   python ml_service/cli.py --symbol TATASTEEL --date 2026-08-03
   ```

2. **Launch Interactive Prompt Mode**:
   ```powershell
   python ml_service/cli.py --interactive
   ```

3. **Verify the Honest Abstention Policy**:
   Query a date where no verified news exists:
   ```powershell
   python ml_service/cli.py --symbol INFY --date 2020-01-01
   ```
   *Output will demonstrate explicit refusal to invent false causes.*

4. **Run Instant Offline Verification Script**:
   ```powershell
   python test_dummy_query.py
   ```

---

## 6. Method 3: Docker Compose (Single Command Startup)

To run the entire system inside isolated Docker containers:

1. Ensure Docker Desktop is running.
2. From the project root, execute:
   ```bash
   docker compose up --build
   ```
3. Access points:
   * Frontend: `http://localhost:5173`
   * Backend Gateway: `http://localhost:8080` (or `8085` depending on compose mapping)
   * PostgreSQL + pgvector: `localhost:5432`

To shut down:
```bash
docker compose down
```

---

## 7. Running the Automated Test Suites

To verify system integrity across all layers:

### Python ML Microservice Tests (98 Tests)
```powershell
cd "p:\Mega Project"
$env:PYTHONPATH="P:\Mega Project"
.\.venv\Scripts\pytest ml_service/tests -v
```
*Tests verify RAG non-leakage, FinBERT sentiment scoring, signal agreement evaluation, and date parser logic.*

### Backend Contract & Unit Tests
```powershell
cd "p:\Mega Project\backend"
.\mvnw.cmd test
```

### Frontend Vitest Component Tests
```powershell
cd "p:\Mega Project\frontend"
npm run test
```

---

## 8. Troubleshooting & FAQ

### Q1: Port 8000, 8085, or 5173 is already in use
Check what process is holding the port and terminate it:
```powershell
# In PowerShell:
netstat -ano | findstr :8000
# Kill process by PID:
Stop-Process -Id <PID> -Force
```

### Q2: Backend shows "Sample data — engine not connected"
* Ensure Terminal 1 (Python FastAPI on port 8000) is running.
* Check that `ENGINE_MODE=http` and `ENGINE_BASE_URL=http://127.0.0.1:8000` in your `.env` or `backend/src/main/resources/application.yml`.
* If you want the backend to run in offline mock mode without starting Python, set `ENGINE_MODE=mock`.

### Q3: Gemini API Quota or Rate Limit Warning
* The causal explainer has an automatic local fallback mechanism (`generate_local_aligned_explanation`) that synthesizes an institutional-grade narrative using verified price returns and retrieved news articles without failing when the external API is offline or exhausted.

### Q4: Database connection errors
* By default, the backend boots with an ultra-fast in-memory **H2 database** in PostgreSQL compatibility mode (`DB_URL: jdbc:h2:mem:marketmind`). It requires zero local database installation.
* If connecting to external PostgreSQL or Supabase, set `DB_URL=jdbc:postgresql://db.xxxx.supabase.co:5432/postgres?sslmode=require` in `.env`.


# MarketMind — Research Desk Web Application

A financial intelligence web application that explains *why* Indian indices and stocks moved, combining price statistical anomalies, financial news citations, and market sentiment breadth.

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

## Quickstart & Local Setup

### 1. Prerequisites
- Docker & Docker Compose
- Or locally: Java 21, Maven 3.9+, Node.js 20+, PostgreSQL 16 with pgvector

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run with Docker Compose
Start PostgreSQL, backend, and frontend with a single command:
```bash
docker compose up --build
```
- Frontend UI: `http://localhost:5173`
- Backend API & Swagger: `http://localhost:8080/swagger-ui.html`
- Health check: `http://localhost:8080/api/health`

### 4. Running Backend & Frontend Directly

**Backend:**
```bash
cd backend
mvn clean test
mvn spring-boot:run
```

**Frontend:**
```bash
cd frontend
npm install
npm test
npm run dev
```

---

## Switching on the real engine later (checklist)

1. Deploy the Python/FastAPI engine and note its base URL (e.g., `http://engine-service:8000`).
2. Set `ENGINE_MODE=http`, `ENGINE_BASE_URL=http://engine-service:8000`, and `MARKETMIND_ENGINE_SCHEMA_ENABLED=true` (needs the pgvector extension).
3. Add `market_flows` and `unclear` to `causal_category`, and `index` to `instrument_type` (already provisioned in `db/migration/engine/V1__init_schema.sql`).
4. Run the contract tests (`AbstractInsightEngineContractTest`) against the live service. Fix any DTO drift **in the adapter, not the frontend**.
5. Confirm the "Sample data — engine not connected" banner disappears (it keys off `capabilities.engine.mode`).
6. Expect `explanation` to be slow (LLM call): keep the 30-min cache and the loading copy ("Reviewing the case file…").

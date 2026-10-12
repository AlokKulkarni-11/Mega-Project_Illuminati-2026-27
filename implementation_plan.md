# MarketMind Implementation Plan: Full-Stack Architecture, Phases & Verification

## 1. Executive Summary & Architecture Overview

MarketMind is an Indian market research platform that explains *why* indices and stocks moved, combining quantitative price regime anomalies with qualitative news drivers, signal agreement meters, footnote-style citations, and engagement tools (calculators, watchlists, glossary, pulse, sectors, and leaderboard).

### Core Architectural Principle: The Engine as a Plugin
The market-intelligence engine (price ML + news sentiment + RAG) is decoupled from the application layer behind a strict contract:
- `InsightEngine` interface with 10 core methods.
- Implementations:
  - `MockInsightEngine`: Serves realistic fixtures derived from `data/nifty_bank_anomalies_with_news.csv` and `data/NIFTY_BANK.csv`. Includes 12 real anomalies (7 explained with citations, 5 unconfirmed abstentions).
  - `HttpInsightEngine`: Connects via `RestClient` to an external Python/FastAPI service with a 15-second timeout and failsafe mapping to `EngineUnavailableException` (HTTP 503 problem+json).
- Selection via `marketmind.engine.mode` (`disabled`, `mock`, `http`).
- Capabilities API (`GET /api/capabilities`) reports engine availability, driving dynamic frontend feature gates.
- Abstention is a first-class citizen: when `hasClearDriver=false`, citations are empty, confidence is low, and signal agreement is insufficient. The UI never fabricates an explanation.

### Technology Stack
- **Backend**: Spring Boot 3.x, Java 21, Maven, PostgreSQL (H2 for in-memory integration testing), Flyway migrations, JWT bearer auth (HMAC-SHA256, 1h expiry), Caffeine cache (30m TTL for explanations, 5m for market pulse/prices), Springdoc OpenAPI.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Axios, Recharts, Vitest, React Testing Library.
- **Design Language**: "Ledger Dossier" aesthetic (Paper `#E7E9DE`, Inset `#FAFAF7`, Ink `#1B2B22`, Gain `#1F4E3D`, Loss `#8B2E1F`, Brass `#A8823C`; Fraunces serif + IBM Plex Sans; hairline borders, underlined inputs, footnote citations, no generic SaaS tropes).

---

## 2. Phased Implementation Roadmap

### Phase 0: Scaffold & Infrastructure
- [x] Backend Spring Boot 3 project setup with Maven, Java 21, and package modularity (`config`, `auth`, `user`, `engine`, `watchlist`, `history`, `feedback`, `query`, `common`).
- [x] Frontend React + Vite + TypeScript setup with Tailwind CSS custom palette matching Ledger Dossier tokens.
- [x] Docker Compose configuration for Postgres (pgvector-ready) and containerized builds.
- [x] Environment configuration (`.env.example`, `application.yml`).

### Phase 1: Authentication & Core Application Domain
- [x] Database migrations for core app tables: `users`, `watchlist`, `query_history`, `explanation_feedback`.
- [x] Stateless Spring Security: Public endpoints (`/api/auth/**`, `/api/capabilities`, `/api/health`, `/swagger-ui/**`); all other endpoints protected by JWT bearer.
- [x] Auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
- [x] Password encryption (BCrypt) and JWT token generation/validation with rate limiting.
- [x] Frontend authentication context, token storage, Axios interceptor for 401 redirection, and Ledger Dossier login/register views.

### Phase 2: Engine Abstraction & Mode Matrix
- [x] `InsightEngine` interface definition matching spec DTOs:
  - `InstrumentDto`, `PriceSeriesDto`, `AnomalyDto`, `ExplanationDto`, `MarketPulseDto`, `SectorSnapshotDto`, `ComparisonDto`, `ScoreboardDto`.
- [x] `MockInsightEngine` implementation with embedded JSON fixtures representing NIFTY BANK anomalies and backtest statistics.
- [x] `HttpInsightEngine` implementation utilizing Spring `RestClient` with 15s connection/read timeouts and WireMock test verification.
- [x] Mode controller handling `disabled` (404 ENGINE_DISABLED), `mock` (sample fixtures), and `http` (HTTP proxy with 503 fallback).
- [x] Global problem+json exception handling (`GlobalExceptionHandler`).
- [x] Caffeine cache integration:
  - Explanations cached for 30 minutes.
  - Price series, market pulse, sectors, and leaderboard cached for 5 minutes.
- [x] Abstract contract test suite (`AbstractInsightEngineContractTest`) verifying both Mock and WireMock HTTP engines against identical assertions.

### Phase 3: Core Engine Screens & Capability Gating
- [x] Deterministic Query Resolution (`POST /api/query/resolve`):
  - Rule-based parser mapping queries to intents (`explain`, `compare`, `trend`) and recognized symbols (e.g., `NIFTYBANK`, `HDFCBANK`, `ICICIBANK`).
  - Automatic query history persistence in `query_history` for authenticated users.
- [x] `GET /api/capabilities` contract consumed by frontend React Query / Context.
- [x] Frontend engine screens:
  - `QueryDesk`: Underlined input with quick-pick chips.
  - `StockDossier`: Ticker metrics, anomaly window markers, and sparklines.
  - `SignalLedger`: Multi-horizon price regime vs. news sentiment agreement gauge.
  - `ExplanationPanel`: Detailed causal breakdown, citation footnotes, and explicit abstention state banner ("Driver Unconfirmed").
  - `ComparisonView`: Side-by-side metric comparison across 2-4 instruments.
- [x] Query history management: `GET /api/history`, `DELETE /api/history`, and dossier history view.
- [x] User feedback loop: `POST /api/feedback` with thumb ratings and comments.

### Phase 4: Side Features & Engagement Tools
- [x] Financial Calculators (Engine-Independent):
  - SIP: $FV = P \times \frac{(1+i)^n - 1}{i} \times (1+i)$
  - Step-up SIP: Annual incrementation compounding.
  - Lumpsum: $FV = P(1+r)^t$
  - Reverse Goal Planner: Inflation-adjusted corpus target to required monthly SIP.
  - Visual stacked breakdown (Invested vs Estimated Returns) with explicit non-forecast disclaimer.
- [x] Financial Glossary: 20+ terms (Z-score, excess return, regime, abstention, beta, XIRR) with interactive popover definitions.
- [x] User Watchlist: `GET/POST/DELETE /api/watchlist` with star toggle and engine-aware enrichment.
- [x] Market Pulse & Horizons: 5-day, 20-day, and 60-day directional strip and brass-needle dial.
- [x] Sector Sentiment Snapshot: Ruled sentiment cards with drill-down capability.
- [x] Anomaly Leaderboard: Top $|z|$-score moves ranking.
- [x] Accuracy Scoreboard: Real-time validation stats (e.g., 7 explained vs 5 abstentions).
- [x] Printable Export: Dossier CSS `@media print` formatting without bloated PDF libraries.

### Phase 5: Hardening, Verification & Production Readiness
- [x] Dual-stage Dockerfiles (`backend/Dockerfile`, `frontend/Dockerfile`) and unified `docker-compose.yml`.
- [x] Comprehensive Health Check (`GET /api/health`): Evaluates Database and Engine subsystems independently.
- [x] React Error Boundaries and unhandled rejection toast notifications.
- [x] Verification testing:
  - Frontend Vitest suite covering calculators, glossary, and abstention UI.
  - Backend MockMvc, WireMock, and JPA repository test suites.

---

## 3. Verification & Validation Matrix

| Component | Target Test Area | Test Implementation | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **Frontend Calculators** | SIP, Step-Up, Lumpsum, Goal Planner | `frontend/src/features/calculators/formulas.test.ts` | 100% exact math match |
| **Frontend UI & Abstention** | Dossier, Abstention state | `frontend/src/components/ExplanationPanel.test.tsx` | Abstention displayed without citations |
| **Frontend Capabilities** | Route gating & banner presentation | `frontend/src/components/CapabilitiesGating.test.tsx` | Engine routes gated when disabled |
| **Frontend Glossary** | Popover definitions, keyboard Escape | `frontend/src/components/GlossaryTerm.test.tsx` | Accessible popover toggling |
| **Backend Auth** | Register, Login, JWT verification | `com.marketmind.auth.AuthControllerTest` | 200 OK + JWT issued, 401 on bad credentials |
| **Backend Engine Modes** | Disabled, Mock, HTTP | `com.marketmind.engine.EngineModeMatrixTest` | 404 when disabled, data when mock, 503 when down |
| **Engine Contract** | Mock vs Http engine parity | `com.marketmind.engine.AbstractInsightEngineContractTest` | Parity across all 10 engine methods |
| **Query History** | Query resolve & history storage | `com.marketmind.history.QueryHistoryControllerTest` | Query logged and retrieved properly |
| **Watchlist & Feedback** | Watchlist CRUD & Feedback submission | `WatchlistControllerTest`, `ExplanationFeedbackControllerTest` | Enforces uniqueness and ownership |

---

## 4. Production Transition Guide (Switching to Live Engine)

1. Deploy the Python/FastAPI intelligence engine container.
2. Set backend environment variables:
   - `ENGINE_MODE=http`
   - `ENGINE_BASE_URL=http://<engine-host>:<engine-port>`
   - `marketmind.engine.schema.enabled=true`
3. Execute pgvector migration to unlock schema tables (`instrument`, `price_record`, `anomaly_record`, `news_citation`).
4. Re-run backend contract tests against live endpoints to verify zero schema/DTO drift.
5. Verify frontend automatically removes the "Sample data" banner based on `/api/capabilities`.

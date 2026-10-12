# MarketMind App — Build Prompt (Frontend + Spring Boot Backend + Side Features)

**How to use:** paste PART A once into your AI coding assistant (or save it as `CLAUDE.md` / project rules). Then paste PART B phases one at a time, in order. Attach these files from the project zip when you do: `sql/V1__init_schema.sql`, `frontend_prototype/marketmind_prototype.html`, `data/nifty_bank_anomalies_with_news.csv`, `data/NIFTY_BANK.csv`.

---

# PART A — Master context (paste once)

## Goal
Build the web app for **MarketMind**: a research tool that explains *why* an Indian index/stock moved, plus engagement features around it. **The market-intelligence engine (price ML + news sentiment + RAG, a separate Python/FastAPI service) is NOT part of this build.** It is a pluggable module behind an interface, shipped with a mock now and a real HTTP implementation later. Everything else must work with the engine absent.

## Stack (fixed)
- Backend: Spring Boot 3.x, Java 21, Maven, PostgreSQL (Supabase-compatible), JWT auth, Flyway, springdoc-openapi, Caffeine cache, Testcontainers. DTOs are Java records. No Lombok.
- Frontend: React 18 + TypeScript + Vite + Tailwind. Add only: react-router-dom, axios, @tanstack/react-query, Recharts, Vitest + React Testing Library.
- Config via env vars only. No secrets in the repo. Provide `.env.example`.

## Architecture rule: the engine is a plugin
```java
public interface InsightEngine {
  EngineStatus status();
  List<InstrumentDto> instruments();
  PriceSeriesDto prices(String symbol, int days);
  List<AnomalyDto> anomalies(String symbol, LocalDate from, LocalDate to);
  ExplanationDto explanation(String symbol, LocalDate date);   // may be an abstention
  MarketPulseDto pulse();
  List<SectorSnapshotDto> sectors();
  List<AnomalyDto> leaderboard(int limit);                      // top |z| recent moves
  ComparisonDto compare(List<String> symbols);                  // 2-4 symbols
  ScoreboardDto scoreboard();                                   // backtest accuracy summary
}
```
- `MockInsightEngine` (default): serves fixtures from classpath JSON generated from `data/nifty_bank_anomalies_with_news.csv` + `data/NIFTY_BANK.csv`. Instrument = `NIFTYBANK`, type `index`. The 12 real anomalies include 5 "unconfirmed" ones — they are the test cases for the abstention UI. Synthesize pulse/sectors/scoreboard fixtures plainly labelled as sample data.
- `HttpInsightEngine`: `RestClient` to `ENGINE_BASE_URL`, 15s timeout, maps failures to `EngineUnavailableException`. Written now, exercised against a stub server (WireMock) only.
- Selected by `marketmind.engine.mode = disabled | mock | http` (`ENGINE_MODE`, default `mock`).
- One **abstract contract test class** that both implementations must pass, so swapping later is safe.
- Engine-dependent endpoints: `404 ENGINE_DISABLED` when disabled; `503 ENGINE_UNAVAILABLE` (problem+json) when unreachable. Never leak stack traces.
- `GET /api/capabilities` → `{ engine: { enabled, mode, status }, features: {...} }`. The frontend uses it to show or hide every engine screen. In `mock` mode the UI shows a persistent, honest "Sample data — engine not connected" banner.

### Engine DTO notes (match the Python pipeline's output)
`ExplanationDto { symbol, date, priceDirection(bullish|bearish), returnPct, returnZ, hasClearDriver, causeSummary, causalCategory, scope(market_wide|sector|company|unclear), newsDirection(bullish|bearish|neutral), signalAgreement(aligned|diverging|insufficient), confidence(high|medium|low), citations[{n,title,source,url,publishedDate}] }`
- `causalCategory` enum = geopolitical, regulatory, earnings, macro, sector_specific, company_specific, **market_flows, unclear** (the last two are missing from `V1__init_schema.sql` today; add them when the engine schema is applied).
- **Abstention is a first-class state**: `hasClearDriver=false`, empty citations, `confidence=low`, `signalAgreement=insufficient`. Never fabricate a cause in the UI.

## Database
- Flyway, two locations. `db/migration/app` always runs. `db/migration/engine` runs only if `marketmind.engine.schema.enabled=true` (it needs the pgvector extension, so the app must boot without it). Put the attached `V1__init_schema.sql` there, adding `index` to `instrument_type` and the two enum values above.
- App tables: `users`, `watchlist(user_id, symbol, created_at, unique)`, `query_history(id, user_id, raw_query, intent, resolved_symbols text[], created_at)`, `explanation_feedback(id, user_id, symbol, anomaly_date, helpful, comment, created_at, unique(user_id,symbol,anomaly_date))`. Watchlist stores the symbol as a plain string (no FK to engine tables); it is validated against `engine.instruments()` only when the engine is available.

## Design system — "ledger dossier" (follow `marketmind_prototype.html`)
Must not look like generic AI/SaaS output.
- Tokens: paper `#E7E9DE`, inset `#FAFAF7`, ink `#1B2B22`, ink-soft `#4B5A50`, rule `#C6CBBC`, loss `#8B2E1F`, gain `#1F4E3D`, brass `#A8823C` (flags/needle/footnote marks only).
- Fonts: Fraunces for display (ticker, price, section heads), IBM Plex Sans for everything else. Tabular numerals for data.
- Structure: 1px hairline rules and ruled table rows, not bordered/shadowed cards. Inputs are underlined (2px ink), not boxed. Left-aligned research-desk layout, max width ~840px for reading screens. Citations are numbered footnotes with superscript marks, not link chips.
- Colour is never the only signal: pair loss/gain with the words/arrows (▲ up, ▼ down).
- Motion: one orchestrated reveal per screen (price-change underline draw, agreement meter fill, gauge needle). Respect `prefers-reduced-motion`.
- Loading copy in the ledger's voice ("Reviewing the case file…"), never a generic spinner. Empty/error states have copy written for them.
- Banned: gradients, glassmorphism, purple, emoji icons, centered marketing hero, uniform rounded-xl cards, default Recharts gridlines/legends.
- Footer on every engine screen, verbatim: "MarketMind is a research and explanation tool built on historical price and news data. It does not predict future prices and is not investment advice. Explanations are generated from retrieved sources and may be incomplete."

## Working rules for the assistant
- Do one phase at a time. At the end of each phase: list changed files, exact run commands, and test results. Stop and wait.
- Don't invent endpoints or fields outside this contract. If something is ambiguous, pick the simplest option and note it in one line.
- Terse explanations. No filler. Prefer working code and tests over prose.
- Every engine-independent feature must work with `ENGINE_MODE=disabled`.

---

# PART B — Phases (paste one at a time)

## Phase 0 — Scaffold
Create a monorepo: `/backend` (Spring Boot, packages `config, auth, user, engine, engine.mock, engine.http, watchlist, history, feedback, query, common`) and `/frontend` (Vite + TS + Tailwind; `src/{app,api,components,features,pages,styles,types}`). Configure `application.yml` from env (`DB_URL, DB_USER, DB_PASSWORD, JWT_SECRET, CORS_ORIGINS, ENGINE_MODE, ENGINE_BASE_URL`), CORS for `http://localhost:5173`, a global problem+json exception handler, springdoc, `docker-compose.yml` (Postgres only; use a pgvector image so the engine schema can be enabled later), `.env.example`, root README with run commands. Add the Tailwind theme from the design tokens and self-hosted/linked Fraunces + IBM Plex Sans.
**Done when:** `mvn spring-boot:run` starts with no engine, `npm run dev` renders a blank themed shell, and `/swagger-ui` loads.

## Phase 1 — Auth + app core
Flyway `app` migration for `users`, `watchlist`, `query_history`, `explanation_feedback`. `POST /api/auth/register|login`, `GET /api/auth/me`. BCrypt, JWT bearer (1h expiry), validation, basic rate limit on auth routes. Stateless Spring Security: `/api/auth/**`, `/api/capabilities`, `/api/health` public; everything else authenticated. Frontend: login/register pages in the ledger style, an axios client that attaches the token and handles 401, an auth guard, and a top bar with a quiet text nav (no icon toolbar).
**Done when:** register → login → `/me` works; an expired or bad token redirects to login; auth tests pass (MockMvc).

## Phase 2 — Engine abstraction + mock
Implement everything in "Architecture rule": interface, DTOs, `MockInsightEngine` with fixtures, `HttpInsightEngine`, mode switch, error mapping, `GET /api/capabilities`, the engine controllers (`/api/engine/instruments`, `/instruments/{symbol}/prices`, `/instruments/{symbol}/anomalies`, `/instruments/{symbol}/explanation`, `/pulse`, `/sectors`, `/leaderboard`, `/compare`, `/scoreboard`), a Caffeine cache (explanation TTL 30 min, others 5 min), and the abstract contract test run against Mock and against Http-via-WireMock.
**Done when:** all three modes behave per spec (disabled → 404, mock → data, http with the stub down → 503); the 5 unconfirmed anomalies come back as abstentions; contract tests are green for both implementations.

## Phase 3 — Core engine screens (gated by capabilities)
Routes are lazy-loaded and shown only if `capabilities.engine.enabled`. Otherwise the home page shows the tools/glossary plus a ledger-styled note: "Market intelligence engine not connected."
- `POST /api/query/resolve {q}` → `{ intent: explain|compare|trend, symbols[] }`. Deterministic: match tokens against instrument symbols/names/aliases; "compare"/"vs" → compare. No LLM here. Unmatched → the empty-state copy from the prototype.
- `QueryDesk` (underlined input + quick-pick chips), `StockDossier` (ticker, price/change, Recharts sparkline with the anomaly window marked, minimal axes), `SignalLedger` (price regime / sentiment / agreement meter), `ExplanationPanel` (footnote citations, confidence, scope, **distinct abstention state**), explainability trail (collapsible retrieved-source list with date and source), `ComparisonView` (2-4 rows), anomaly date picker listing detected anomalies.
- Record each resolved query in `query_history`; `GET/DELETE /api/history` plus a History page.
- Feedback: thumbs up/down on an explanation → `POST /api/feedback`.
**Done when:** with the mock, picking each of the 12 Nifty Bank anomalies renders correctly (7 with citations, 5 as abstentions); with `ENGINE_MODE=disabled` the engine routes vanish with no errors; RTL tests cover the abstention state and the capability gating.

## Phase 4 — Side features
Engine-independent (must work with `ENGINE_MODE=disabled`):
1. **Calculators page** (tabs, underlined inputs, serif result, one intro sentence each; pure frontend, formulas unit-tested in Vitest):
   - SIP: `FV = P × (((1+i)^n − 1)/i) × (1+i)`, `i = r/12`, `n` in months.
   - Step-up SIP: monthly SIP increased by `s%` each year; compute year by year.
   - Lumpsum: `FV = P(1+r)^t`.
   - Goal planner (reverse): inflate target `T' = T(1+inf)^t`, then required SIP `= T' × i / ((((1+i)^n) − 1)(1+i))`.
   - Show invested vs. returns as a simple two-segment bar, not a pie. Clearly label as illustrative, not a forecast.
2. **Glossary tooltips**: static JSON, ~20 terms (z-score, RSI, beta, excess return, regime, sentiment, causal category, signal agreement, abstention, SIP, XIRR…). A `<GlossaryTerm>` popover usable anywhere, keyboard accessible.
3. **Watchlist**: `GET/POST/DELETE /api/watchlist`, a star toggle on the dossier, a Watchlist page. When the engine is available, show each symbol's latest regime and agreement; otherwise show the symbols only.
4. **Preferences (minimal)**: default lookback window, reduced-motion override, stored per user.

Engine-dependent (hidden when the engine is off):
5. **Market Pulse**: a brass-needle gauge on a paper dial (accessible: `role="img"` plus a text equivalent) with counts, plus a Short/Medium/Long-term strip. `/api/engine/pulse` returns the three horizons (5/20/60-day return sign).
6. **Sector snapshot** tiles (ruled tiles tinted by aggregate sentiment) → click through to the sector's instruments.
7. **Anomaly leaderboard**: "most unusual moves", ranked by |z|, on the home page.
8. **Daily digest page**: composed on the frontend from pulse + leaderboard + watchlist moves.
9. **Accuracy scoreboard**: one honest line from `/scoreboard`, e.g. "7 of 12 backtested moves had a sourced driver; 5 were left unexplained."
10. *(Stretch, last)* Printable one-page export of a dossier via `window.print()` with a print stylesheet. No PDF library.

**Done when:** features 1-4 work with the engine disabled; 5-9 work in mock mode; calculator formula tests pass against hand-computed values.

## Phase 5 — Hardening + deploy
Dockerfiles for backend and frontend; extend compose to the full stack. `GET /api/health` reports DB and engine status separately. Global React error boundary plus a consistent error toast. Backend tests: auth, watchlist, history, feedback, capabilities, and the engine mode matrix. Frontend: accessibility pass (focus rings, contrast, labels), Lighthouse sanity check. README gets a screenshot-free feature table and this section:

### Switching on the real engine later (checklist)
1. Deploy the Python/FastAPI engine and note its base URL.
2. Set `ENGINE_MODE=http`, `ENGINE_BASE_URL=…`, and `marketmind.engine.schema.enabled=true` (needs the pgvector extension).
3. Add `market_flows` and `unclear` to `causal_category`, and `index` to `instrument_type`.
4. Run the contract tests against the live service. Fix any DTO drift **in the adapter, not the frontend**.
5. Confirm the "Sample data" banner disappears (it keys off `capabilities.engine.mode`).
6. Expect `explanation` to be slow (LLM call): keep the 30-min cache and the loading copy.
**Done when:** `docker compose up` brings up the whole app in mock mode, and the checklist is in the README.

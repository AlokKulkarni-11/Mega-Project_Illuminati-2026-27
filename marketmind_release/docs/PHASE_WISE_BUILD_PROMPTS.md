# MarketMind — Phase-Wise Build Prompts (Frontend + Spring Boot Backend)

Each phase below is a ready-to-paste prompt for an AI coding assistant (Claude
Code, etc.). Paste them **in order** — later phases assume earlier ones exist.
Each prompt references the artifacts already built in this project:
`V1__init_schema.sql`, `marketmind_prototype.html`, and the ML scripts in
`module_b1_price_ml/`, `module_b2_bert_sentiment/`, `module_b3_rag_engine/`.

Side features in Phase 6 are inspired by finlive.in (financial calculators,
an "Equity Market Meter"-style gauge, sector P/E snapshots) — chosen because
they're cheap to build, genuinely useful, and keep a visitor engaged with the
app beyond a single query, without distracting from the core causal-engine
demo.

---

## Phase 0 — Project Scaffolding

```
Set up two projects in a monorepo structure:

1. Backend: Spring Boot 3.x (Java 21), Maven, with dependencies:
   spring-boot-starter-web, spring-boot-starter-data-jpa,
   spring-boot-starter-security, spring-boot-starter-validation,
   postgresql driver, jjwt (for JWT auth), lombok, springdoc-openapi
   (for Swagger UI).

2. Frontend: React 18 + Vite + TypeScript + Tailwind CSS. Include
   react-router-dom, axios, recharts.

Folder structure:
/backend
  /src/main/java/com/marketmind/
    /config       (security, CORS, etc.)
    /entity       (JPA entities)
    /repository
    /service
    /controller
    /dto
  /src/main/resources/application.yml
/frontend
  /src
    /components
    /pages
    /api          (axios client + typed API calls)
    /types        (TypeScript interfaces matching backend DTOs)

Configure application.yml for PostgreSQL connection using environment
variables (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD) — never hardcode
credentials. Configure CORS to allow the frontend's dev origin
(http://localhost:5173).

Do not add any business logic yet — this phase is scaffolding only.
```

---

## Phase 1 — Database Layer (JPA Entities)

```
Reference file: V1__init_schema.sql (attached/provided).

Generate Spring Boot JPA entity classes matching every table in this
schema exactly — same column names, types, constraints, and enums.
Specifically:

- Map each SQL ENUM (instrument_type, regime_label, sentiment_label,
  causal_category, confidence_label, signal_agreement_label) to a Java
  enum, and use @Enumerated(EnumType.STRING) so the DB stores the
  readable string, not an integer.
- Use UUID for the users table's primary key (matches uuid_generate_v4()
  in the schema).
- Set up all @ManyToOne / @OneToMany relationships exactly as the
  foreign keys define them (e.g., Instrument -> Sector, PriceHistory ->
  Instrument, AnomalyEvent -> Instrument, Explanation -> AnomalyEvent,
  ExplanationSource -> Explanation + NewsArticle).
- For news_embeddings.embedding (a pgvector column), do NOT try to map
  it as a JPA entity field — skip that table in JPA entirely. It will be
  written/read directly via native SQL from the Python ML service, not
  through Spring Boot's ORM. Add a comment in the codebase explaining
  why this table has no corresponding entity.
- Generate a Spring Data JPA Repository interface for every entity
  (e.g., InstrumentRepository, PriceHistoryRepository), including at
  least these custom query methods:
    - PriceHistoryRepository: findByInstrumentIdOrderByDateDesc
    - AnomalyEventRepository: findByInstrumentIdOrderByStartDateDesc
    - NewsArticleRepository: findByPublishedAtBetweenAndEntitiesContaining

Do not generate any controllers or services yet — entities and
repositories only, this phase.
```

---

## Phase 2 — Core Backend APIs (Auth + Analytics)

```
Reference: entities/repositories from Phase 1.

Build these in order:

1. AUTH:
   - POST /api/auth/register (email, password, full_name) -> hash
     password with BCrypt, save to users table, return JWT.
   - POST /api/auth/login -> validate credentials, return JWT.
   - JWT filter securing all /api/** routes except /api/auth/**.

2. INSTRUMENTS:
   - GET /api/instruments -> list all active instruments (id, symbol,
     name, sector, type).
   - GET /api/instruments/{symbol}/price-history?days=90 -> daily OHLCV
     for charting.

3. ANOMALY DETECTION (implement the actual statistics, not a stub):
   - Service class AnomalyDetectionService that, given an instrument's
     recent price_history, computes:
       - rolling 20-day return z-score
       - rolling 20-day volume z-score
       - excess return vs. a benchmark index (read from index_history)
     Flag a window as anomalous when |return_z_score| > 2.
   - POST /api/instruments/{symbol}/detect-anomaly -> runs the above,
     writes a row to anomaly_events (only the statistical columns —
     leave regime_label null, that's written later by the ML service),
     returns the created anomaly event.

4. COMPARISON:
   - GET /api/compare?symbols=TCS,INFY,RELIANCE -> for each symbol,
     return latest price, latest anomaly (if any), and sector — used
     for the peer/sector comparison view.

Write unit tests for AnomalyDetectionService specifically (the z-score
math) using a hand-crafted price series with a known expected z-score,
since this is the one piece of logic that must be numerically correct.
```

---

## Phase 3 — ML/RAG Microservice Integration

```
Reference: causal_synthesis.py (the Python FastAPI microservice contract).

Assume the Python ML service exposes these internal endpoints (build
the FastAPI side separately — this phase is the Spring Boot CLIENT
side only):

  POST http://ml-service:8000/classify-regime
    body: { "instrument_id": int }
    returns: { "regime_label": str, "confidence": float }

  POST http://ml-service:8000/analyze-sentiment
    body: { "instrument_symbol": str, "start_date": str, "end_date": str }
    returns: { "sentiment_label": str, "aggregate_score": float, "article_count": int }

  POST http://ml-service:8000/explain
    body: { "instrument_symbol": str, "anomaly_event_id": int }
    returns: { "explanation": str, "confidence": str, "signal_agreement": str,
               "cited_articles": [{ "id": int, "title": str, "source": str, "published_at": str }] }

Build:
1. A Feign client or RestTemplate-based MlServiceClient in Spring Boot
   wrapping all three calls, with a configurable base URL
   (ML_SERVICE_URL environment variable) and a 15-second timeout.
2. GET /api/instruments/{symbol}/explain -> orchestrates: find the
   latest anomaly_event for this instrument, call classify-regime and
   analyze-sentiment if not already populated, call explain, persist
   the result into the explanations and explanation_sources tables,
   and return the full explanation payload to the frontend.
3. Handle the ML service being unavailable gracefully: return a 503
   with a clear message ("Explanation engine temporarily unavailable")
   rather than a raw exception — the frontend needs a real error state
   to design around, not a stack trace.

Until the real Python service exists, stub MlServiceClient's three
methods to return realistic hardcoded example responses, controlled by
a `ml.service.mock=true` property in application.yml — this lets
frontend and backend integration testing proceed before Module B is
ready, per the team's contract-first approach.
```

---

## Phase 4 — Frontend Core Query Flow

```
Reference file: marketmind_prototype.html (the ledger-dossier design —
sage paper background, Fraunces serif for headlines, IBM Plex Sans for
body, ruled hairline rows instead of card shadows, red/green ledger ink
for loss/gain, footnote-style citations).

Convert this prototype into real React components:

1. <QueryDesk /> — the query input bar + quick-select chips, styled
   exactly like the prototype's "research desk" section.
2. <StockDossier /> — the main result view: ticker header, price +
   change (ledger ink colors), sparkline chart (use Recharts, styled
   minimally — no default gridlines/legend clutter, matching the
   prototype's quiet aesthetic).
3. <SignalLedger /> — the three-column price regime / sentiment /
   agreement panel, including the agreement meter bar with the fill
   animation from the prototype.
4. <ExplanationPanel /> — the causal explanation text with numbered
   footnote citations (superscript style, not link chips) and a
   confidence label.
5. <SimilarInstancesTable /> — the historical pattern-match table.

Wire all of these to the real backend from Phase 2/3 (GET
/api/instruments/{symbol}/price-history, GET
/api/instruments/{symbol}/explain, etc.) via a typed API client in
/src/api/. Keep the same color tokens, font choices, and ruled-row
layout from the prototype — do not restyle this into a generic
rounded-card SaaS look.

Add loading and error states for the explanation panel specifically
(it's the slowest call, since it may invoke an LLM) — show a subtle
loading message in the ledger's voice (e.g., "Reviewing the case
file...") rather than a generic spinner.
```

---

## Phase 5 — Comparison & Watchlist

```
1. <ComparisonView /> — takes 2-4 stock symbols, renders each as a
   condensed ledger row (symbol, price regime, sentiment, agreement
   badge) side by side, reusing <SignalLedger />'s column styling at a
   smaller scale. Calls GET /api/compare.

2. Watchlist (Core-adjacent, cheap since the users table already
   exists):
   - Backend: POST/DELETE /api/watchlist/{instrumentId}, GET
     /api/watchlist -> list the logged-in user's watchlisted
     instruments.
   - Frontend: a star/toggle icon on <StockDossier /> to add/remove
     from watchlist, and a simple <WatchlistPage /> listing saved
     stocks with their latest regime/sentiment at a glance.
```

---

## Phase 6 — Engagement Side Features (inspired by finlive.in)

```
These are meant to give a visitor something to explore beyond a single
query — modeled on finlive.in's calculators and Equity Market Meter,
adapted to fit MarketMind's existing design system and data.

1. MARKET PULSE GAUGE + REGIME SIGNALS (inspired by finlive.in's Equity
   Market Meter and its per-index "PE Signals" block — short/medium/
   long-term trend labels):
   - Backend: GET /api/market-pulse -> aggregate regime_label and
     sentiment_label across ALL tracked instruments for today, return
     counts (e.g., { "bullish": 6, "bearish": 12, "consolidating": 7 }).
   - ALSO return a simple three-horizon trend read per instrument or
     sector, mirroring finlive's Short-Term / Medium-Term / Long-Term
     Uptrend/Downtrend labels: compute this cheaply from existing data
     — e.g. short-term = 5-day return sign, medium-term = 20-day return
     sign, long-term = 60-day return sign. No new model needed, just
     three different rolling windows on data you already have.
   - Frontend: a single gauge/needle visual on the homepage showing
     overall market mood at a glance, styled in the ledger aesthetic
     (brass needle on a sage-paper dial, not a generic speedometer
     widget), plus a small three-label strip (Short/Medium/Long-Term)
     underneath it, styled like small ledger stamps. Clicking the
     gauge navigates to a simple breakdown list.
   - SKIP for the 4-week build: a full historical year x month heatmap
     table like finlive's PE heatmap. It's a nice pattern but a
     separate chunk of work — note it as a future enhancement in the
     report, don't build it now.

2. SECTOR SNAPSHOT (like finlive.in's per-index P/E pages):
   - Backend: GET /api/sectors/{sectorName}/snapshot -> average regime
     and sentiment across all instruments in that sector.
   - Frontend: a sector grid on the homepage — each sector shown as a
     small ledger tile colored by aggregate sentiment, similar to the
     "sector heatmap" side feature already scoped.

3. QUICK CALCULATORS (directly inspired by finlive.in's calculator
   suite, but keep the content MUCH shorter than finlive's full
   SEO-length pages — cheap to build, genuinely useful, keeps visitors
   on the site even between queries):
   - SIP Return Calculator: monthly investment, expected annual return,
     duration -> projected maturity value. Pure frontend math, no
     backend needed.
   - Simple compounding / lumpsum calculator: principal, rate,
     duration -> maturity value.
   Build both as a single <CalculatorsPage /> with a tab switcher
   between the two, styled with the same ledger input fields as the
   query bar (underlined inputs, serif numeric display for the
   result). Include ONE short paragraph above each calculator
   explaining what it does (matching finlive's pattern of a brief intro
   before the tool, not a bare unexplained form) — but skip finlive's
   full FAQ/advantages sections entirely, that's their content-marketing
   layer, not something this project needs.

4. GLOSSARY TOOLTIPS (the "explain this term" side feature already
   scoped): a small static JSON file of ~15-20 terms (RSI, beta,
   z-score, excess return, causal category, etc.) with one-sentence
   plain-language definitions. Wrap any occurrence of these terms in
   the UI with a <GlossaryTerm /> component that shows the definition
   in a small popover on hover/tap — no backend needed, pure frontend.

Keep every one of these visually consistent with the ledger dossier
design system already established — same fonts, same paper/ink colors,
same ruled-row conventions — so they read as part of one product, not
bolted-on widgets.
```

---

## Phase 7 — Polish, Testing, Deployment

```
1. Add a global error boundary in React and a consistent error toast
   component for failed API calls.
2. Add Spring Boot integration tests for the auth flow and the
   anomaly-detection endpoint using an in-memory or Testcontainers
   Postgres instance.
3. Dockerize both backend and frontend (separate Dockerfiles), plus a
   docker-compose.yml that also spins up Postgres with the pgvector
   extension and V1__init_schema.sql auto-applied on first run.
4. Add a health-check endpoint (GET /api/health) that reports DB
   connectivity and ML service reachability separately, so the team
   can quickly diagnose which piece is down during demo/viva.
```

---

## Notes on using these prompts

- Paste each phase separately, in order — don't combine phases 1-3 into
  one prompt, since the AI assistant will do a better job scoped to one
  concern at a time.
- Before Phase 3, make sure `causal_synthesis.py`'s three logical steps
  (retrieve, build prompt, call LLM) have been turned into actual
  FastAPI endpoints matching the contract shown — Phase 3's Spring Boot
  client assumes those exist.
- Phase 6 is intentionally separable from the core engine — if the team
  is behind schedule, cut it first (it was already flagged as Stretch
  in the 4-week execution plan) without touching Phases 0-5.

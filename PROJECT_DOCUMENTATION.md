# MarketMind: Explainable AI Stock Movement & Causal Reasoning System
## Comprehensive System Architecture, Machine Learning Pipeline & Project Documentation

---

### Project Metadata
* **Project Title**: MarketMind — Explainable AI Stock Movement & Causal Reasoning System
* **Institution**: Walchand College of Engineering, Sangli (Department of Computer Science & Engineering)
* **Academic Year**: 2026–2027
* **Project Guide**: Ms. Aditi A. Pawde
* **Core Modules**:
  * **Machine Learning & RAG Causal Microservice**: Piyush Rajurkar
  * **Backend Platform & Business Gateway**: Alok Kulkarni
  * **Frontend Research Desk**: MarketMind UI/UX Engineering

---

## 1. Executive Summary & Problem Formulation

### 1.1 The Fundamental Challenge
Retail investors and financial analysts constantly face sudden, sharp market fluctuations. Traditional financial platforms (Bloomberg, TradingView, Moneycontrol) present real-time price charts and raw news feeds side-by-side. However, they suffer from three fundamental deficiencies:
1. **Correlation vs. Causation Confusion**: A stock drops 3%, and a media article is published on the same day. Platforms imply causation without verifying whether the news actually drove the move, whether it was published before or after the price shock, or whether the move was simply systemic market volatility.
2. **Look-Ahead Bias (Data Leakage)**: Modern Large Language Models (LLMs) trained on general web corpora suffer from hindsight bias. When asked why a stock moved on a historical date, they frequently cite events that occurred days or weeks *after* the market close, invalidating historical backtesting.
3. **Speculative Hallucination & Lack of Honest Abstention**: Standard generative AI systems feel compelled to supply an explanation for every single price candle. In reality, over 40% of intraday price moves are driven by transient liquidity imbalances, automated institutional rebalancing, or noise where no verifiable news driver exists.

### 1.2 The MarketMind Solution
**MarketMind** is a deterministic, explainable financial intelligence platform that unifies:
* **Quantitative Price Action**: Statistical z-score anomaly detection and XGBoost price regime classification derived directly from OHLCV series.
* **Qualitative Financial Sentiment**: Transformer-based multi-task FinBERT classification for editorial sentiment and causal categorization.
* **Signal Agreement Evaluation**: A formal matrix mapping price momentum against news tone into **Aligned**, **Diverging**, or **Ambiguous** states.
* **Strict Time-Constrained RAG**: Retrieval-Augmented Generation that enforces strict timestamp non-leakage ($t_{\text{published}} \le t_{\text{movement}}$) and NSE session alignment (IST timezone normalization).
* **Calibrated Causal Synthesis**: A Google Gemini API integration generating an institutional-grade causal narrative (200–250 words when evidence is sufficient; concise without synthetic filler when evidence is sparse) with bracketed footnote citations (`[1]`, `[2]`).
* **Claim-Level Evidence Validation**: Fine-grained claim verification isolating supported, partially supported, unsupported, and contradicted assertions.
* **First-Class Honest Abstention**: An explicit refusal to invent explanations or causal attributions when verified citations do not exist.

---

## 2. High-Level System Architecture

MarketMind operates as a decoupled, multi-tier distributed architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CLIENT TIER (React 18 + Vite)                       │
│      Research Desk Dossier  |  Market Pulse  |  Financial Calculators   │
└───────────────────▲────────────────────────────────▲───────────────────┘
                    │                                │
          REST / JSON (Port 8085)          Direct ML Query (Port 8000)
                    │                                │
┌───────────────────▼────────────────────────────────┴───────────────────┐
│              BACKEND GATEWAY (Spring Boot 3.3.4, Java 21)              │
│   - Security & JWT Auth      - Caffeine Dual-Tier Cache (10s TTL)     │
│   - Flyway Postgre/H2 DB     - Engine Abstraction (HttpInsightEngine)  │
└────────────────────────────────────▲───────────────────────────────────┘
                                     │
                        Internal REST (Port 8000)
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│               PYTHON ML & CAUSAL MICROSERVICE (FastAPI)                │
│                                                                        │
│   ┌────────────────────────┐         ┌─────────────────────────────┐   │
│   │ Quantitative Pipeline  │         │    Qualitative Pipeline     │   │
│   │ - NSE OHLCV Engine     │         │ - Dual-Tier News Retrieval  │   │
│   │ - Rolling Return & Z   │         │ - FinBERT Sentiment (Prosus)│   │
│   │ - XGBoost Classifier   │         │ - Causal Classifier         │   │
│   └───────────┬────────────┘         └──────────────┬──────────────┘   │
│               │                                     │                  │
│               └──────────────────┬──────────────────┘                  │
│                                  │                                     │
│                     ┌────────────▼────────────┐                        │
│                     │ Signal Agreement Engine │                        │
│                     │  (Aligned/Diverging)    │                        │
│                     └────────────┬────────────┘                        │
│                                  │                                     │
│                     ┌────────────▼────────────┐                        │
│                     │ Google Gemini Explainer │                        │
│                     │ (Strict 200-250 Words)  │                        │
│                     └─────────────────────────┘                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Machine Learning & Quantitative Methodologies

### 3.1 Quantitative Price Regime Classification
* **Component Path**: `ml_service/models/price_classifier.py`
* **Input Data**: Historical NSE daily bars (Date, Open, High, Low, Close, Volume, Turnover).
* **Statistical Anomaly Formulation**:
  $$\text{Daily Return: } R_t = \frac{C_t - C_{t-1}}{C_{t-1}}$$
  $$\text{Rolling Mean: } \mu_{60} = \frac{1}{60} \sum_{i=0}^{59} R_{t-i}, \quad \text{Rolling Std: } \sigma_{60} = \sqrt{\frac{1}{60} \sum_{i=0}^{59} (R_{t-i} - \mu_{60})^2}$$
  $$\text{Statistical Z-Score: } Z_t = \frac{R_t - \mu_{60}}{\sigma_{60}}$$
* **Regime Categorization**:
  * **Bullish**: $Z_t \ge +1.50$ (or positive trend breakout).
  * **Bearish**: $Z_t \le -1.50$ (or negative breakdown).
  * **Consolidating**: $-1.50 < Z_t < +1.50$.
* **XGBoost Feature Vector**: Incorporates SMA_20, SMA_50, RSI_14, MACD, MACD Signal, Bollinger Band width, and Volume Z-scores.

### 3.2 Qualitative FinBERT Sentiment & Causal Inference
* **Component Path**: `ml_service/services/finbert_analyzer.py` & `ml_service/models/sentiment_causal_classifier.py`
* **Model Base**: `ProsusAI/finbert` (PyTorch Transformer fine-tuned on financial phrasebanks).
* **Probability Distribution**: Outputs $P(\text{positive})$, $P(\text{negative})$, and $P(\text{neutral})$.
* **Relevance-Weighted Corpus Aggregation**:
  To prevent multi-ticker list articles and market roundups from distorting company-specific sentiment, each article is assigned a relevance weight $w_k$:
  * `company_direct`: $w = 1.0$ (Title or focal content specifically targets the ticker).
  * `sector_industry`: $w = 0.6$ (Sector policy, peer reports, industry headwinds/tailwinds).
  * `macro_market`: $w = 0.4$ (RBI rates, Union budget, headline macroeconomic data).
  * `weak_or_irrelevant`: $w = 0.15$ (Passing mentions in multi-ticker market wrap lists).
  $$\text{Weighted Sentiment Score} = \frac{\sum_{k=1}^N w_k \cdot \Big( P(\text{positive})_k - P(\text{negative})_k \Big)}{\sum_{k=1}^N w_k} \in [-1.0, +1.0]$$
* **Sentiment Categorization & Conflicting Coverage**:
  * Score $> +0.25$ $\implies$ **BULLISH**
  * Score $< -0.25$ $\implies$ **BEARISH**
  * If $P(\text{positive}) \ge 25\%$ and $P(\text{negative}) \ge 25\%$, the corpus is explicitly classified as **CONFLICTING** (`"Conflicting / Mixed"`), preventing opposed positive and negative catalysts from canceling into a deceptive "neutral" signal.
  * Score $\in [-0.25, +0.25]$ (without conflicting polarization) $\implies$ **NEUTRAL**
* **Quality & Dispersion Indicators**: The analyzer calculates `sentiment_dispersion` (standard deviation across scores), `unique_articles_count`, `positive_ratio`, `negative_ratio`, and `neutral_ratio`.
* **Causal Domain Categorization**: Classifies text into one of six fundamental driver categories:
  1. `earnings`: Financial results, margin expansions, EBITDA beats/misses.
  2. `regulatory`: RBI monetary policy, SEBI enforcement, tax/tariff changes.
  3. `geopolitical`: Crude supply disruptions, trade agreements, conflicts.
  4. `macroeconomic`: GDP growth data, inflation (CPI/WPI), credit expansion metrics.
  5. `sector-specific`: Raw material price shifts, sector-wide export duties.
  6. `company-specific`: Management exits, contract wins, mergers/acquisitions.

### 3.3 Signal Agreement & Divergence Analysis Engine
* **Component Path**: `ml_service/services/signal_agreement.py`
* **Signal States**:
  * **Aligned**: Price Regime and FinBERT Sentiment point in the identical direction (e.g., Bullish Price + Bullish News, or Bearish Price + Bearish News).
  * **Diverging**: Price moves sharply against prevailing news sentiment (e.g., Bullish Price despite Bearish News, or Bearish Price despite Bullish News). Triggers dedicated divergence hypothesis analysis.
  * **Ambiguous**: One signal is neutral/consolidating while the other is directional, or news coverage is classified as `conflicting`/`mixed` (precluding strong directional consensus).
  * **Insufficient**: Verified news sentiment or price data is unavailable (`NO_NEWS_AVAILABLE`, `RETRIEVAL_FAILED`, or `none`). The system strictly prevents classifying missing news as a market divergence.

### 3.4 Dedicated Divergence Hypothesis Formulation
When quantitative price action and qualitative news sentiment diverge, MarketMind generates a structured divergence analysis investigating grounded hypotheses:
* **Positive Price Movement with Negative News**:
  1. `[Unverified Hypothesis 1]`: Negative news was already anticipated and discounted prior to publication.
  2. `[Unverified Hypothesis 2]`: Actual delivered metrics were less adverse than worst-case market fears.
  3. `[Unverified Hypothesis 3]`: Positive company-specific catalysts outweighed headline pressures.
  4. `[Unverified Hypothesis 4]`: Broader sector-wide or macroeconomic strength lifted the stock.
* **Negative Price Movement with Positive News**:
  1. `[Unverified Hypothesis 1]`: Constructive catalysts were already priced into the valuation, prompting a "sell-the-news" reaction.
  2. `[Unverified Hypothesis 2]`: Reported results lagged lofty whisper numbers or elevated market expectations.
  3. `[Unverified Hypothesis 3]`: Systemic market weakness or sector rotation overshadowed company-specific news.
* **Unconfirmed Causality Guard**: Every hypothesis is explicitly tagged as `[Unverified Hypothesis]` along with its evidence status (`supported`, `partially_supported`, `unverified_hypothesis`, `contradicted`). The engine distinguishes empirical facts from hypotheses:
  > *"Therefore, while the divergence between the stock's market action and prevailing news coverage is empirically established on the observation date, the precise underlying driver remains unconfirmed from the retrieved news sample alone."*

---

## 4. News Retrieval, Gemini Explainer & Validation Architecture

### 4.1 Dynamic Multi-Source News Retrieval Pipeline
* **Component Path**: `ml_service/services/news_retrieval.py`
* **Multi-Provider Architecture (`BaseNewsProvider`)**:
  * **Google News RSS (`GoogleNewsRSSProvider`)**: Generates optimized financial queries using resolved company name, stock ticker, aliases, and financial keywords. Decodes Google News redirected links via `gnewsdecoder` to canonical publisher URLs, extracts full article text via `trafilatura`, and converts GMT/UTC timestamps to Indian Standard Time (IST). Includes a 7-day relative recency fallback query (`when:7d`) for recent queries where strict date indexing is lagging.
  * **GDELT 2.0 Document API (`GDELTNewsProvider`)**: Free, open-access international provider querying global financial news without API keys, providing cross-border macro, sector, and company event coverage.
  * **NewsAPI (`NewsAPIProvider`)**: Optional premium financial news provider configured via `NEWS_API_KEY` or `NEWSAPI_KEY` in environment variables. If the key is omitted, the provider gracefully skips without failing the pipeline.
  * **Local Historical Corpus**: `india_stock_news_2025.csv` containing **5,579 verified financial articles** (covering SBIN, TCS, NIFTYBANK, INFY, RELIANCE). Used as a historical foundation alongside live online feeds.
* **Date-Aware Dynamic Resolution**:
  * Resolves natural language expressions (`"today"`, `"yesterday"`, `"last 7 days"`, `"this month"`, `"this year"`) using runtime clocks (`datetime.now()`), avoiding hardcoded historical years.
  * Converts multi-day requests into explicit `[start_date, end_date]` intervals and analyzes articles across the entire multi-day span.
* **Dual Retrieval Modes**:
  * **Historical Mode**: Activated when $t_{\text{target}}$ is in the past. Preserves default 14-day lookback for single-date movement explanations, strictly enforces no-look-ahead non-leakage ($t_{\text{published}} \le t_{\text{movement}}$), and combines local records with online fallbacks.
  * **Current / Recent Mode**: Activated for dates within 7 days of runtime. Prioritizes fresh live multi-source retrieval, analyzes articles across the range, runs FinBERT on unique relevant articles, and reports actual retrieval timestamps and honest pricing disclosures.
* **URL Normalization & Deduplication**:
  * Strips marketing and tracking parameters (`utm_*`, `ref`, `fbclid`, `gclid`, `oc`) via `normalize_url()`.
  * Computes token-set Jaccard overlap ($\ge 0.65$) to collapse identical syndicated wire reports into a single unique article while preserving all publisher citations.
* **Relevance Filtering**: Categorizes articles into `company_direct`, `sector_industry`, `macro_market`, or `weak_or_irrelevant`. Irrelevant articles are filtered out prior to sentiment and causal reasoning.
* **Caching & Performance**:
  * Dual-TTL caching keyed by `(ticker, start_date, end_date, should_fallback, local_len)`.
  * 10-minute TTL for recent/live queries to maintain data freshness.
  * 24-hour TTL for historical queries.
  * Transient provider failures (`RETRIEVAL_FAILED`) are strictly excluded from the cache to prevent temporary blips from suppressing future queries.
* **Separation of Retrieval Status from Evidence Sufficiency**:
  * **Retrieval Mode**: `local`, `live`, or `combined`.
  * **Retrieval Status**: `OK`, `NO_NEWS_AVAILABLE`, or `RETRIEVAL_FAILED`.
  * **Evidence Sufficiency**:
    * `sufficient`: $\ge 2$ relevant unique articles.
    * `sparse`: 1 relevant article or brief snippets only.
    * `irrelevant`: Articles found but weakly related.
    * `none`: 0 articles found.
    * `technical_failure`: Network or extraction failure across all sources.

### 4.2 Fine-Grained Claim-Level Validation Layer
* **Component Path**: `ml_service/services/explanation_validator.py`
* **Fine-Grained Claim Decomposition**: Evaluates factual statements individually via `validate_claims()`, outputting:
  * `supported_claims`: Claims backed by valid citations and matching source text.
  * `partially_supported_claims`: Claims with general topical relevance but incomplete factual grounding.
  * `unsupported_claims`: Claims that hallucinate institutional flows (e.g. unverified FII/DII block sales), fabricated earnings figures, or unverified regulatory mandates.
  * `contradicted_claims`: Claims contradicting cited text or violating intraday time sequences (e.g. post-close news driving daytime movements).
* **Citation Bounds**: Every bracketed tag $[k]$ must correspond to an actual retrieved article ($1 \le k \le len(\text{articles})$). Invalid or fake citations are rejected.
* **Temporal Non-Leakage**: Verifies that cited articles were published on or before the stock movement date ($t_{\text{published}} \le t_{\text{movement}}$).
* **Adaptive Word-Count Validation**: Relaxes word count enforcement down to 30 words when evidence is sparse or insufficient (`evidence_sufficiency != "sufficient"`), preventing models from injecting synthetic filler.
* **Structured Validation Status**: Returns `VALID`, `PARTIALLY_VALID`, `INVALID`, or `INSUFFICIENT_EVIDENCE`.

### 4.3 Calibrated Causal Synthesis
* **Component Path**: `ml_service/services/gemini_explainer.py`
* **LLM Engine**: Google Gemini API (`gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`, `gemini-flash-latest`).
* **Generation Constraints**:
  * **Adaptive Word Count Guard**: Strictly enforced between **200 and 250 words** when evidence is sufficient; allows concise, honest explanations (50–120 words) when evidence is sparse without appending boilerplate filler (`allow_short=True`).
  * **Three-Paragraph Structure**:
    * **Paragraph 1 (~70 words)**: Quantitative return magnitude, z-score, and convergence/divergence with FinBERT sentiment.
    * **Paragraph 2 (~85 words)**: Core catalysts citing verified articles with bracketed tags (`[1]`, `[2]`).
    * **Paragraph 3 (~65 words)**: Sector dynamics or divergence hypothesis analysis with explicit confirmation status.
  * **Calibrated Local Fallback**: Synthesizes an institutional narrative using only verified price data and retrieved articles when offline or when API quotas are reached.

### 4.4 First-Class Missing News & Honest Abstention Policy
* **Missing News Distinction**: Missing news is **never** falsified as neutral sentiment.
* If no verified articles exist in the observation window:
  * `newsDirection = "no_news_available"`
  * `evidence_sufficiency = "none"`
  * `sentimentScore = null`
  * `hasClearDriver = false`
  * `signalAgreement = "insufficient"`
  * Preserves the actual historical price regime if price data exists.
  * **Standard Abstention Formula**:
    > *"No verified historical news articles found. No sufficient, verified news evidence was found in the sources searched for this period. This does not establish that no relevant news existed. The price-based classification is available, but a reliable news-based explanation cannot be confirmed."*


---

## 5. Backend Gateway (Spring Boot 3.3.4)

### 5.1 Architecture & Configuration
* **Directory**: `/backend`
* **Language & Runtime**: Java 21, Spring Boot 3.3.4.
* **Database**: PostgreSQL 16 with Flyway migrations (or in-memory H2 in development).
* **Security**: Stateless JWT authentication with HMAC-SHA256 tokens (`/api/auth/**`).
* **Engine Mode Abstraction**:
  * Configured via `ENGINE_MODE=http` (`application.yml`).
  * Calls `HttpInsightEngine.java` which talks directly to Python FastAPI on port 8000 via Spring's `RestClient`.
* **Caffeine Caching**:
  * Set in `CacheConfig.java` to a **10-second TTL** for explanations to allow rapid interactive querying while eliminating duplicate socket calls.

### 5.2 Key Backend REST Endpoints
* `GET /api/engine/instruments`: Returns all tracked stocks and indices.
* `GET /api/engine/instruments/{symbol}/prices?days=60`: Historical OHLCV series.
* `GET /api/engine/instruments/{symbol}/anomalies`: Detected statistical outliers.
* `GET /api/engine/instruments/{symbol}/explanation?date=YYYY-MM-DD`: Full causal explanation payload.
* `GET /api/engine/pulse`: Market-wide needle breadth and sector momentum.
* `GET /api/engine/leaderboard`: Top anomalies ranked by $|Z|$.

---

## 6. Frontend Research Desk (React 18 + Vite)

### 6.1 Design Philosophy: "The Ledger Dossier"
* **Styling**: Tailwind CSS tailored to an institutional financial dossier look:
  * Warm paper tones (`#F8F7F2`, `#EFECE1`), dark ink typography (`#1B1E1A`), brass accents (`#8F7336`).
  * Tabular numerals for price series and monospaced citation tags.
* **Component Architecture**:
  * `ResearchDeskPage.tsx`: Main inquiry desk featuring natural language search, interactive Date Picker, anomaly event selector, and the 3-paragraph Causal Analysis panel.
  * `PulsePage.tsx`: Market breadth dial, sector tiles, and anomaly leaderboard.
  * `CalculatorsPage.tsx`: Offline financial planners (SIP, Step-Up SIP, Lumpsum, Reverse Goal Planner).
  * `GlossaryTerm.tsx`: Interactive tooltip popovers explaining statistical terms (`z-score`, `sentiment`, `signal agreement`, `abstention`).

---

## 7. Project File Structure

```
p:/Mega Project/
├── .env                              # Environment secrets (GEMINI_API_KEY, PORTs, DB)
├── india_stock_news_2025.csv         # 5,579 verified financial news articles
├── test_dummy_query.py               # Instant offline verification script
│
├── ml_service/                       # Python FastAPI Machine Learning Microservice
│   ├── main.py                       # FastAPI application entrypoint
│   ├── requirements.txt              # PyTorch, Transformers, XGBoost, Requests
│   ├── api/
│   │   ├── routes.py                 # NL query understanding & RAG endpoints
│   │   ├── schemas.py                # Pydantic request/response schemas
│   │   └── engine_adapter.py         # Spring Boot HttpInsightEngine contract adapter
│   ├── models/
│   │   ├── price_classifier.py       # XGBoost price regime model
│   │   └── sentiment_causal_classifier.py # FinBERT PyTorch classifier
│   ├── services/
│   │   ├── date_resolver.py          # Day/Month/Year natural language date parser & normalizer
│   │   ├── finbert_analyzer.py       # Multi-class probability & corpus sentiment
│   │   ├── explanation_validator.py  # Post-generation citation, temporal & consistency validator
│   │   ├── gemini_explainer.py       # Strict 200-250 word causal narrative & divergence generator
│   │   ├── news_retrieval.py         # Dual-tier historical news retriever with online fallback
│   │   ├── query_understanding.py    # Intent & entity extraction
│   │   ├── rag_engine.py             # Time-constrained dense vector RAG
│   │   ├── signal_agreement.py       # Alignment & divergence evaluation matrix
│   │   └── stock_resolver.py         # Indian ticker & alias resolver
│   ├── tests/
│   │   ├── test_evidence_timing_sentiment.py # 19 deterministic tests (claims, timing, sentiment, divergence)
│   │   ├── test_four_critical_issues.py      # 20 regression & feature tests
│   │   └── test_natural_language_pipeline.py # 14 natural language date & entity tests
│   └── data/fixtures/                # Ground-truth JSON fixtures
│
├── backend/                          # Spring Boot Java 21 Backend
│   ├── pom.xml                       # Maven dependencies
│   └── src/main/java/com/marketmind/
│       ├── config/CacheConfig.java   # Caffeine cache with 10s explanation TTL
│       ├── engine/http/HttpInsightEngine.java # RestClient connector to port 8000
│       └── engine/controller/EngineController.java # Public REST endpoints
│
└── frontend/                         # React 18 + Vite Web Application
    ├── package.json
    ├── tailwind.config.js            # Ledger Dossier theme tokens
    └── src/
        ├── api/engine.ts             # Axios API client
        └── pages/
            ├── ResearchDeskPage.tsx  # Causal Analysis Dossier with Date Picker & Validation Pill
            ├── PulsePage.tsx         # Market breadth & sector tiles
            └── CalculatorsPage.tsx   # SIP & Goal planners
```

---

## 8. Installation & Execution Guide

### 8.1 Prerequisites
* Python 3.11+ with virtual environment tools
* Java 21 JDK & Maven 3.9+
* Node.js 20+ & npm
* Valid Google Gemini API Key (configured in `.env`)

### 8.2 Launching the Services

#### Step 1: Start the ML Microservice (Port 8000)
```powershell
cd "p:\Mega Project"
.\.venv\Scripts\Activate.ps1
python -m uvicorn ml_service.main:app --host 127.0.0.1 --port 8000 --reload
```
* Swagger Docs: `http://127.0.0.1:8000/docs`

#### Step 2: Start the Backend (Port 8085)
```powershell
cd "p:\Mega Project\backend"
.\mvnw.cmd spring-boot:run
```
* Backend API: `http://localhost:8085/api/engine/instruments`

#### Step 3: Start the Frontend (Port 5173)
```powershell
cd "p:\Mega Project\frontend"
npm run dev
```
* Research Desk UI: `http://localhost:5173`

---

## 9. Verification & Automated Testing

### 9.1 Evidence Validation, Timing & Sentiment Suite (19 Tests)
Execute deterministic unit tests covering claim decomposition, timezone/IST conversion, NSE session timing, syndicated deduplication, relevance filtering, and conflicting sentiment:
```powershell
$env:PYTHONPATH="P:\Mega Project"
.\.venv\Scripts\pytest ml_service/tests/test_evidence_timing_sentiment.py -v
```
*All 19 test cases pass with 100% success rate.*

### 9.2 Critical Issues & Fallback Test Suite (20 Tests)
Execute the automated regression suite verifying online retrieval, `NO_NEWS_AVAILABLE` states, the explanation validation layer, and divergence analysis:
```powershell
$env:PYTHONPATH="P:\Mega Project"
.\.venv\Scripts\pytest ml_service/tests/test_four_critical_issues.py -v
```
*All 20 test cases pass with 100% success rate.*

### 9.3 Dynamic Runtime News Retrieval Suite (20 Tests)
Execute the comprehensive test suite covering the 20 dynamic runtime retrieval specifications (relative dates, multi-day ranges, multi-provider pipeline, deduplication, timezone normalization, error resiliency, caching policies, and backward-compatible schemas):
```powershell
$env:PYTHONPATH="P:\Mega Project"
.\.venv\Scripts\pytest ml_service/tests/test_dynamic_news_retrieval.py -v
```
*All 20 test cases pass with 100% success rate.*

### 9.4 Full Python Test Suite (98 Tests)
Execute the complete microservice test suite encompassing RAG, FinBERT, XGBoost, API contracts, date resolvers, multi-source retrieval, and causal validation:
```powershell
$env:PYTHONPATH="P:\Mega Project"
.\.venv\Scripts\pytest ml_service/tests -v
```
*All 98 pytest tests pass with 100% success rate.*

### 9.5 Frontend Component & Formula Tests (16 Tests)
```powershell
cd "p:\Mega Project\frontend"
npm run test
```
*All 16 Vitest frontend tests pass.*

### 9.4 Live API Queries
Test dynamic causal explanations directly via PowerShell or cURL:

* **NIFTYBANK (Aligned Bullish Rally)**:
  ```powershell
  Invoke-RestMethod -Uri "http://127.0.0.1:8000/instruments/NIFTYBANK/explanation?date=2025-11-26"
  ```
* **TCS (Divergence / Missing News Handling)**:
  ```powershell
  Invoke-RestMethod -Uri "http://127.0.0.1:8000/instruments/TCS/explanation?date=2025-02-28"
  ```


---

## 10. Conclusion & Academic Significance
MarketMind addresses a critical gap in financial technology by transforming opaque market data into **auditable, causal intelligence**. By enforcing strict temporal constraints, grounding all statements in verified news citations, honoring statistical signal divergence, and maintaining an honest abstention policy, MarketMind establishes a novel benchmark for trustworthy financial AI systems.

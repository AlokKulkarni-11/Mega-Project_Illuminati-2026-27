-- ============================================================================
-- MarketMind — Database Schema v1
-- PostgreSQL + pgvector
-- Owner: Alok Kulkarni | Locked Day 0 — changes after this go through a quick
-- team check, since Modules A/B/C all build directly against this.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

CREATE TYPE instrument_type AS ENUM ('stock', 'fund');
CREATE TYPE market_cap_category AS ENUM ('large', 'mid', 'small');
CREATE TYPE regime_label AS ENUM ('bullish', 'bearish', 'consolidating');
CREATE TYPE sentiment_label AS ENUM ('bullish', 'bearish', 'neutral');
CREATE TYPE causal_category AS ENUM (
  'geopolitical', 'regulatory', 'earnings', 'macro',
  'sector_specific', 'company_specific'
);
CREATE TYPE confidence_label AS ENUM ('high', 'medium', 'low');
CREATE TYPE signal_agreement_label AS ENUM ('aligned', 'diverging', 'insufficient');

-- ----------------------------------------------------------------------------
-- USERS  (auth only — watchlist is Stretch, but table exists so it can be
-- turned on later without a migration)
-- ----------------------------------------------------------------------------

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- SECTORS & INSTRUMENTS
-- ----------------------------------------------------------------------------

CREATE TABLE sectors (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100) UNIQUE NOT NULL,
  key_dependencies JSONB,              -- e.g. {"raw_materials": [...], "export_markets": [...], "key_clients": [...]}
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE instruments (
  id                   SERIAL PRIMARY KEY,
  symbol               VARCHAR(20) UNIQUE NOT NULL,      -- e.g. 'TCS', 'INFY'
  name                 VARCHAR(255) NOT NULL,
  type                 instrument_type NOT NULL DEFAULT 'stock',
  sector_id            INTEGER REFERENCES sectors(id),
  market_cap_category  market_cap_category,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_instruments_sector ON instruments(sector_id);

-- ----------------------------------------------------------------------------
-- PRICE DATA
-- ----------------------------------------------------------------------------

CREATE TABLE price_history (
  id            BIGSERIAL PRIMARY KEY,
  instrument_id INTEGER NOT NULL REFERENCES instruments(id),
  date          DATE NOT NULL,
  open          NUMERIC(12,2) NOT NULL,
  high          NUMERIC(12,2) NOT NULL,
  low           NUMERIC(12,2) NOT NULL,
  close         NUMERIC(12,2) NOT NULL,
  volume        BIGINT NOT NULL,
  UNIQUE (instrument_id, date)
);

CREATE INDEX idx_price_history_instrument_date ON price_history(instrument_id, date DESC);

-- Nifty 50 / sector indices — kept separate from instruments since indices
-- aren't tradable instruments and don't need the full instruments schema.
CREATE TABLE index_history (
  id           BIGSERIAL PRIMARY KEY,
  index_symbol VARCHAR(50) NOT NULL,      -- e.g. 'NIFTY50', 'NIFTYIT'
  date         DATE NOT NULL,
  close        NUMERIC(12,2) NOT NULL,
  UNIQUE (index_symbol, date)
);

CREATE INDEX idx_index_history_symbol_date ON index_history(index_symbol, date DESC);

-- ----------------------------------------------------------------------------
-- NEWS + EMBEDDINGS  (Module B2 writes sentiment/causal_category here)
-- ----------------------------------------------------------------------------

CREATE TABLE news_articles (
  id              BIGSERIAL PRIMARY KEY,
  source          VARCHAR(100) NOT NULL,          -- e.g. 'Economic Times'
  url             TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  raw_text        TEXT,
  published_at    TIMESTAMPTZ NOT NULL,
  entities        TEXT[],                          -- instrument symbols mentioned
  sector_tags     TEXT[],                          -- sector names mentioned
  sentiment_label sentiment_label,                  -- set by Module B2 (BERT)
  sentiment_score NUMERIC(4,3),                     -- e.g. 0.680 = 68% bearish confidence
  causal_category causal_category,                  -- set by Module B2 (BERT)
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_published_at ON news_articles(published_at);
CREATE INDEX idx_news_entities ON news_articles USING GIN(entities);
CREATE INDEX idx_news_sector_tags ON news_articles USING GIN(sector_tags);

-- 768 dims = BGE-base default. If Rajurkar picks a different embedding model,
-- this column's dimension needs a migration before ingestion starts.
CREATE TABLE news_embeddings (
  id          BIGSERIAL PRIMARY KEY,
  article_id  BIGINT UNIQUE NOT NULL REFERENCES news_articles(id),
  embedding   VECTOR(768) NOT NULL,
  model_name  VARCHAR(100) NOT NULL DEFAULT 'bge-base-en-v1.5',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_embeddings_vector ON news_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ----------------------------------------------------------------------------
-- ANOMALY DETECTION + REGIME  (Module C writes stats; Module B1 writes regime)
-- ----------------------------------------------------------------------------

CREATE TABLE anomaly_events (
  id               BIGSERIAL PRIMARY KEY,
  instrument_id    INTEGER NOT NULL REFERENCES instruments(id),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  return_z_score   NUMERIC(6,3) NOT NULL,
  volume_z_score   NUMERIC(6,3),
  excess_return    NUMERIC(6,3),              -- stock return minus benchmark return
  regime_label     regime_label,              -- set by Module B1 (price classifier)
  regime_confidence NUMERIC(4,3),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_anomaly_instrument_dates ON anomaly_events(instrument_id, start_date DESC);

-- ----------------------------------------------------------------------------
-- CAUSAL EXPLANATIONS  (Module B3 writes here — RAG synthesis output)
-- ----------------------------------------------------------------------------

CREATE TABLE explanations (
  id                  BIGSERIAL PRIMARY KEY,
  anomaly_event_id    BIGINT UNIQUE NOT NULL REFERENCES anomaly_events(id),
  generated_text      TEXT NOT NULL,
  confidence_label     confidence_label NOT NULL,
  signal_agreement    signal_agreement_label NOT NULL,
  aggregate_sentiment sentiment_label,          -- BERT sentiment aggregated over the retrieval window
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Citations as a join table (not an array) so footnote numbering has a
-- natural sort key and article FK integrity is enforced.
CREATE TABLE explanation_sources (
  id             BIGSERIAL PRIMARY KEY,
  explanation_id BIGINT NOT NULL REFERENCES explanations(id) ON DELETE CASCADE,
  article_id     BIGINT NOT NULL REFERENCES news_articles(id),
  footnote_rank  SMALLINT NOT NULL,           -- display order: 1, 2, 3...
  UNIQUE (explanation_id, footnote_rank)
);

-- ----------------------------------------------------------------------------
-- EVALUATION  (backtest set for Module D / Rajurkar's Week 4 evaluation run)
-- ----------------------------------------------------------------------------

CREATE TABLE backtest_events (
  id                  SERIAL PRIMARY KEY,
  instrument_id       INTEGER NOT NULL REFERENCES instruments(id),
  event_date          DATE NOT NULL,
  known_cause_summary TEXT NOT NULL,           -- ground truth, hand-researched
  source_reference    TEXT,                    -- link/citation for the known cause
  category            causal_category,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE backtest_results (
  id                  SERIAL PRIMARY KEY,
  backtest_event_id   INTEGER NOT NULL REFERENCES backtest_events(id),
  explanation_id      BIGINT REFERENCES explanations(id),
  relevance_score     SMALLINT,    -- 1-5, human-rated
  correctness_score   SMALLINT,    -- 1-5, human-rated
  groundedness_score  SMALLINT,    -- 1-5, human-rated
  rated_by            VARCHAR(100),
  rated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- WATCHLIST  (Stretch feature — schema-ready now that users table exists,
-- not populated/used unless Week 4 has slack)
-- ----------------------------------------------------------------------------

CREATE TABLE watchlist (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id),
  instrument_id INTEGER NOT NULL REFERENCES instruments(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, instrument_id)
);

-- ============================================================================
-- SEED: entity/sector mapping is hand-curated by Module A (Dawkhare) —
-- not seeded here. Instruments/sectors get inserted via a separate seed
-- script once the 20–25 stock list is finalized.
-- ============================================================================

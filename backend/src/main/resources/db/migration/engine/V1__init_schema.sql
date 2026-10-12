-- ============================================================================
-- MarketMind — Database Schema v1 (Engine Schema)
-- PostgreSQL + pgvector
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE instrument_type AS ENUM ('stock', 'fund', 'index');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE market_cap_category AS ENUM ('large', 'mid', 'small');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE regime_label AS ENUM ('bullish', 'bearish', 'consolidating');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sentiment_label AS ENUM ('bullish', 'bearish', 'neutral');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE causal_category AS ENUM (
        'geopolitical', 'regulatory', 'earnings', 'macro',
        'sector_specific', 'company_specific', 'market_flows', 'unclear'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE confidence_label AS ENUM ('high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE signal_agreement_label AS ENUM ('aligned', 'diverging', 'insufficient');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- SECTORS & INSTRUMENTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sectors (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100) UNIQUE NOT NULL,
  key_dependencies JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS instruments (
  id                   SERIAL PRIMARY KEY,
  symbol               VARCHAR(20) UNIQUE NOT NULL,
  name                 VARCHAR(255) NOT NULL,
  type                 instrument_type NOT NULL DEFAULT 'stock',
  sector_id            INTEGER REFERENCES sectors(id),
  market_cap_category  market_cap_category,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instruments_sector ON instruments(sector_id);

-- ----------------------------------------------------------------------------
-- PRICE DATA
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS price_history (
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

CREATE INDEX IF NOT EXISTS idx_price_history_instrument_date ON price_history(instrument_id, date DESC);

CREATE TABLE IF NOT EXISTS index_history (
  id           BIGSERIAL PRIMARY KEY,
  index_symbol VARCHAR(50) NOT NULL,
  date         DATE NOT NULL,
  close        NUMERIC(12,2) NOT NULL,
  UNIQUE (index_symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_index_history_symbol_date ON index_history(index_symbol, date DESC);

-- ----------------------------------------------------------------------------
-- NEWS + EMBEDDINGS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS news_articles (
  id              BIGSERIAL PRIMARY KEY,
  source          VARCHAR(100) NOT NULL,
  url             TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  raw_text        TEXT,
  published_at    TIMESTAMPTZ NOT NULL,
  entities        TEXT[],
  sector_tags     TEXT[],
  sentiment_label sentiment_label,
  sentiment_score NUMERIC(4,3),
  causal_category causal_category,
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_published_at ON news_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_news_entities ON news_articles USING GIN(entities);
CREATE INDEX IF NOT EXISTS idx_news_sector_tags ON news_articles USING GIN(sector_tags);

CREATE TABLE IF NOT EXISTS news_embeddings (
  id          BIGSERIAL PRIMARY KEY,
  article_id  BIGINT UNIQUE NOT NULL REFERENCES news_articles(id),
  embedding   VECTOR(768) NOT NULL,
  model_name  VARCHAR(100) NOT NULL DEFAULT 'bge-base-en-v1.5',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_embeddings_vector ON news_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ----------------------------------------------------------------------------
-- ANOMALY DETECTION + REGIME
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS anomaly_events (
  id                BIGSERIAL PRIMARY KEY,
  instrument_id     INTEGER NOT NULL REFERENCES instruments(id),
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  return_z_score    NUMERIC(6,3) NOT NULL,
  volume_z_score    NUMERIC(6,3),
  excess_return     NUMERIC(6,3),
  regime_label      regime_label,
  regime_confidence NUMERIC(4,3),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_instrument_dates ON anomaly_events(instrument_id, start_date DESC);

-- ----------------------------------------------------------------------------
-- CAUSAL EXPLANATIONS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS explanations (
  id                  BIGSERIAL PRIMARY KEY,
  anomaly_event_id    BIGINT UNIQUE NOT NULL REFERENCES anomaly_events(id),
  generated_text      TEXT NOT NULL,
  confidence_label    confidence_label NOT NULL,
  signal_agreement    signal_agreement_label NOT NULL,
  aggregate_sentiment sentiment_label,
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS explanation_sources (
  id             BIGSERIAL PRIMARY KEY,
  explanation_id BIGINT NOT NULL REFERENCES explanations(id) ON DELETE CASCADE,
  article_id     BIGINT NOT NULL REFERENCES news_articles(id),
  footnote_rank  SMALLINT NOT NULL,
  UNIQUE (explanation_id, footnote_rank)
);

CREATE TABLE IF NOT EXISTS backtest_events (
  id                  SERIAL PRIMARY KEY,
  instrument_id       INTEGER NOT NULL REFERENCES instruments(id),
  event_date          DATE NOT NULL,
  known_cause_summary TEXT NOT NULL,
  source_reference    TEXT,
  category            causal_category,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backtest_results (
  id                 SERIAL PRIMARY KEY,
  backtest_event_id  INTEGER NOT NULL REFERENCES backtest_events(id),
  explanation_id     BIGINT REFERENCES explanations(id),
  relevance_score    SMALLINT,
  correctness_score  SMALLINT,
  groundedness_score SMALLINT,
  rated_by           VARCHAR(100),
  rated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

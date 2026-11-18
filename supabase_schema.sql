-- ============================================================================
-- MarketMind — Complete Supabase PostgreSQL Deployment Script
-- Includes: Extensions (pgvector, uuid-ossp), Enums, App Tables,
--           ML Engine Tables, Vector Indexes, and Seed Instruments.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ----------------------------------------------------------------------------
-- 2. ENUM TYPES
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
-- 3. APP SCHEMA TABLES
-- ----------------------------------------------------------------------------

-- Users (Independent credentials table)
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Personal Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol     VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_watchlist_user_symbol UNIQUE (user_id, symbol)
);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);

-- Query History Audit Trail
CREATE TABLE IF NOT EXISTS query_history (
    id               BIGSERIAL PRIMARY KEY,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_query        TEXT NOT NULL,
    intent           VARCHAR(50) NOT NULL,
    resolved_symbols TEXT[] NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_query_history_user ON query_history(user_id, created_at DESC);

-- Human-in-the-Loop Explanation Feedback
CREATE TABLE IF NOT EXISTS explanation_feedback (
    id           BIGSERIAL PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol       VARCHAR(50) NOT NULL,
    anomaly_date DATE NOT NULL,
    helpful      BOOLEAN NOT NULL,
    comment      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_feedback_user_symbol_date UNIQUE (user_id, symbol, anomaly_date)
);
CREATE INDEX IF NOT EXISTS idx_feedback_user_symbol ON explanation_feedback(user_id, symbol);

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    default_lookback_days INT NOT NULL DEFAULT 60,
    reduced_motion        BOOLEAN NOT NULL DEFAULT false,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. ENGINE & QUANTITATIVE SCHEMA TABLES
-- ----------------------------------------------------------------------------

-- Sectors
CREATE TABLE IF NOT EXISTS sectors (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(100) UNIQUE NOT NULL,
    key_dependencies JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Instruments (Stocks & Indices)
CREATE TABLE IF NOT EXISTS instruments (
    id                  SERIAL PRIMARY KEY,
    symbol              VARCHAR(20) UNIQUE NOT NULL,
    name                VARCHAR(255) NOT NULL,
    type                instrument_type NOT NULL DEFAULT 'stock',
    sector_id           INTEGER REFERENCES sectors(id),
    market_cap_category market_cap_category,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_instruments_sector ON instruments(sector_id);

-- Daily OHLCV Price History
CREATE TABLE IF NOT EXISTS price_history (
    id            BIGSERIAL PRIMARY KEY,
    instrument_id INTEGER NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    date          DATE NOT NULL,
    open          NUMERIC(12,2) NOT NULL,
    high          NUMERIC(12,2) NOT NULL,
    low           NUMERIC(12,2) NOT NULL,
    close         NUMERIC(12,2) NOT NULL,
    volume        BIGINT NOT NULL,
    UNIQUE (instrument_id, date)
);
CREATE INDEX IF NOT EXISTS idx_price_history_instrument_date ON price_history(instrument_id, date DESC);

-- Benchmark Index History
CREATE TABLE IF NOT EXISTS index_history (
    id           BIGSERIAL PRIMARY KEY,
    index_symbol VARCHAR(50) NOT NULL,
    date         DATE NOT NULL,
    close        NUMERIC(12,2) NOT NULL,
    UNIQUE (index_symbol, date)
);
CREATE INDEX IF NOT EXISTS idx_index_history_symbol_date ON index_history(index_symbol, date DESC);

-- Verified Financial News Articles
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

-- Dense Vector Embeddings (pgvector: 768-dimensional)
CREATE TABLE IF NOT EXISTS news_embeddings (
    id          BIGSERIAL PRIMARY KEY,
    article_id  BIGINT UNIQUE NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
    embedding   VECTOR(768) NOT NULL,
    model_name  VARCHAR(100) NOT NULL DEFAULT 'bge-base-en-v1.5',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_embeddings_vector ON news_embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Detected Outliers & Anomalies
CREATE TABLE IF NOT EXISTS anomaly_events (
    id                BIGSERIAL PRIMARY KEY,
    instrument_id     INTEGER NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
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

-- Causal Explanations
CREATE TABLE IF NOT EXISTS explanations (
    id                  BIGSERIAL PRIMARY KEY,
    anomaly_event_id    BIGINT UNIQUE NOT NULL REFERENCES anomaly_events(id) ON DELETE CASCADE,
    generated_text      TEXT NOT NULL,
    confidence_label    confidence_label NOT NULL,
    signal_agreement    signal_agreement_label NOT NULL,
    aggregate_sentiment sentiment_label,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Explanation Citations Link
CREATE TABLE IF NOT EXISTS explanation_sources (
    id             BIGSERIAL PRIMARY KEY,
    explanation_id BIGINT NOT NULL REFERENCES explanations(id) ON DELETE CASCADE,
    article_id     BIGINT NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
    footnote_rank  SMALLINT NOT NULL,
    UNIQUE (explanation_id, footnote_rank)
);

-- Backtest Benchmark Suite
CREATE TABLE IF NOT EXISTS backtest_events (
    id                  SERIAL PRIMARY KEY,
    instrument_id       INTEGER NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    event_date          DATE NOT NULL,
    known_cause_summary TEXT NOT NULL,
    source_reference    TEXT,
    category            causal_category,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backtest_results (
    id                 SERIAL PRIMARY KEY,
    backtest_event_id  INTEGER NOT NULL REFERENCES backtest_events(id) ON DELETE CASCADE,
    explanation_id     BIGINT REFERENCES explanations(id) ON DELETE SET NULL,
    relevance_score    SMALLINT,
    correctness_score  SMALLINT,
    groundedness_score SMALLINT,
    rated_by           VARCHAR(100),
    rated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. INITIAL SEED DATA
-- ----------------------------------------------------------------------------

-- Seed default sectors
INSERT INTO sectors (id, name, key_dependencies) VALUES
    (1, 'Banking & Financial Services', '["RBI Monetary Policy", "Credit Growth", "NPA Ratios"]'::jsonb),
    (2, 'Information Technology', '["US/European Tech Spending", "Currency (USD/INR)", "Client IT Budgets"]'::jsonb),
    (3, 'Energy & Conglomerates', '["Crude Oil GRM", "Domestic Demand", "Green Energy Transition"]'::jsonb),
    (4, 'Metals & Mining', '["China Steel Demand", "Iron Ore Benchmark", "Export Tariffs"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Reset sequence for sectors
SELECT setval('sectors_id_seq', (SELECT MAX(id) FROM sectors));

-- Seed default instruments
INSERT INTO instruments (symbol, name, type, sector_id, market_cap_category, is_active) VALUES
    ('NIFTYBANK', 'Nifty Bank Index', 'index', 1, 'large', true),
    ('SBIN', 'State Bank of India', 'stock', 1, 'large', true),
    ('TCS', 'Tata Consultancy Services Ltd', 'stock', 2, 'large', true),
    ('INFY', 'Infosys Ltd', 'stock', 2, 'large', true),
    ('RELIANCE', 'Reliance Industries Ltd', 'stock', 3, 'large', true),
    ('TATASTEEL', 'Tata Steel Ltd', 'stock', 4, 'large', true)
ON CONFLICT (symbol) DO NOTHING;


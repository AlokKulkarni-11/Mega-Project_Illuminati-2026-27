-- ============================================================================
-- MarketMind — App Schema (Independent of ML engine)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol     VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_watchlist_user_symbol UNIQUE (user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);

CREATE TABLE IF NOT EXISTS query_history (
    id               BIGSERIAL PRIMARY KEY,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_query        TEXT NOT NULL,
    intent           VARCHAR(50) NOT NULL,
    resolved_symbols TEXT[] NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_query_history_user ON query_history(user_id, created_at DESC);

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

CREATE TABLE IF NOT EXISTS user_preferences (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    default_lookback_days INT NOT NULL DEFAULT 60,
    reduced_motion        BOOLEAN NOT NULL DEFAULT false,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

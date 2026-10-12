"""
train_price_classifier.py

Module B1 — Price-Pattern Classifier

WHAT THIS DOES, IN PLAIN TERMS:
  1. Takes daily OHLCV price data for a stock.
  2. Computes ~10 "technical" numbers per day (moving averages, RSI,
     volatility, volume anomaly, etc.) that describe how today compares
     to the stock's own recent history.
  3. Labels each historical day as bullish / bearish / consolidating,
     using a simple rule based on forward returns (what actually
     happened over the next N days).
  4. Trains an XGBoost classifier to predict that label from the
     technical numbers alone.
  5. Evaluates it on unseen (held-out) days and reports accuracy.

This script runs standalone on SYNTHETIC price data (a realistic random
walk with occasional regime shifts) so you can see the whole pipeline
work end-to-end right now. To use real data: replace `generate_synthetic_price_data()`
with a read from your `price_history` table (see the SQL comment at the
bottom of that function).
"""

import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, f1_score, classification_report
from sklearn.preprocessing import LabelEncoder

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)


# ----------------------------------------------------------------------------
# STEP 0 — Get price data (synthetic here; swap for real DB read later)
# ----------------------------------------------------------------------------

def generate_synthetic_price_data(n_days=1250, start_price=1000.0):
    """
    Simulates ~5 years of daily trading (1250 trading days) for one stock.
    Includes occasional "regime shift" periods (sustained drift up or down)
    so the classifier has real bullish/bearish patterns to learn from —
    not just pure noise.

    TO USE REAL DATA INSTEAD:
        SELECT date, open, high, low, close, volume
        FROM price_history
        WHERE instrument_id = %s
        ORDER BY date;
    Load that into a DataFrame with the same column names used below.
    """
    dates = pd.bdate_range(start="2021-01-01", periods=n_days)
    prices = [start_price]
    volumes = []
    base_volume = 2_000_000

    regime = 0  # 0 = normal drift, will occasionally switch to trending
    regime_days_left = 0

    for i in range(1, n_days):
        if regime_days_left <= 0:
            # 15% chance of entering a trending regime (up or down), else normal
            if np.random.rand() < 0.15:
                regime = np.random.choice([-1, 1])
                regime_days_left = np.random.randint(10, 30)
            else:
                regime = 0
                regime_days_left = np.random.randint(15, 40)

        drift = 0.0006 * regime  # small daily drift during a trending regime
        daily_return = np.random.normal(loc=drift, scale=0.014)
        prices.append(prices[-1] * (1 + daily_return))

        # volume spikes somewhat during trending regimes (more activity)
        vol_multiplier = 1.0 + (0.6 if regime != 0 else 0.0) * np.random.rand()
        volumes.append(int(base_volume * vol_multiplier * np.random.uniform(0.7, 1.3)))

        regime_days_left -= 1

    volumes = [base_volume] + volumes  # align length

    close = np.array(prices)
    # Fabricate open/high/low around close for a realistic-looking OHLC
    open_ = close * (1 + np.random.normal(0, 0.003, size=n_days))
    high = np.maximum(open_, close) * (1 + np.abs(np.random.normal(0, 0.004, size=n_days)))
    low = np.minimum(open_, close) * (1 - np.abs(np.random.normal(0, 0.004, size=n_days)))

    df = pd.DataFrame({
        "date": dates,
        "open": open_,
        "high": high,
        "low": low,
        "close": close,
        "volume": volumes,
    })
    return df


# ----------------------------------------------------------------------------
# STEP 1 — Feature engineering (turn raw prices into descriptive numbers)
# ----------------------------------------------------------------------------

def engineer_features(df):
    df = df.copy()
    df["daily_return"] = df["close"].pct_change()

    # Rolling z-score of returns (is today's move unusual for THIS stock?)
    roll_mean = df["daily_return"].rolling(20).mean()
    roll_std = df["daily_return"].rolling(20).std()
    df["return_zscore"] = (df["daily_return"] - roll_mean) / roll_std

    # Volume anomaly (is today's volume unusual?)
    vol_roll_mean = df["volume"].rolling(20).mean()
    vol_roll_std = df["volume"].rolling(20).std()
    df["volume_zscore"] = (df["volume"] - vol_roll_mean) / vol_roll_std

    # Moving averages and price position relative to them
    df["ma20"] = df["close"].rolling(20).mean()
    df["ma50"] = df["close"].rolling(50).mean()
    df["price_vs_ma20"] = (df["close"] - df["ma20"]) / df["ma20"]
    df["price_vs_ma50"] = (df["close"] - df["ma50"]) / df["ma50"]
    df["ma20_vs_ma50"] = (df["ma20"] - df["ma50"]) / df["ma50"]

    # Rolling volatility (20-day)
    df["volatility_20d"] = df["daily_return"].rolling(20).std()

    # RSI (Relative Strength Index) — classic momentum indicator, 0-100
    delta = df["close"].diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = (-delta.clip(upper=0)).rolling(14).mean()
    rs = gain / loss
    df["rsi_14"] = 100 - (100 / (1 + rs))

    # N-day high/low breakout position
    df["dist_from_20d_high"] = (df["close"] - df["close"].rolling(20).max()) / df["close"].rolling(20).max()
    df["dist_from_20d_low"] = (df["close"] - df["close"].rolling(20).min()) / df["close"].rolling(20).min()

    return df


FEATURE_COLUMNS = [
    "return_zscore", "volume_zscore", "price_vs_ma20", "price_vs_ma50",
    "ma20_vs_ma50", "volatility_20d", "rsi_14",
    "dist_from_20d_high", "dist_from_20d_low",
]


# ----------------------------------------------------------------------------
# STEP 2 — Labeling (what actually happened over the NEXT N days)
# ----------------------------------------------------------------------------

def label_regime(df, forward_days=5, bullish_threshold=0.025, bearish_threshold=-0.025):
    """
    Looks FORWARD from each day to see what the stock actually did over
    the next `forward_days` trading days, and labels today accordingly.
    This is standard practice for training this kind of classifier —
    we're teaching the model "these technical conditions TENDED TO
    PRECEDE this kind of move, historically."
    """
    df = df.copy()
    future_return = df["close"].shift(-forward_days) / df["close"] - 1

    conditions = [
        future_return >= bullish_threshold,
        future_return <= bearish_threshold,
    ]
    choices = ["bullish", "bearish"]
    df["regime_label"] = np.select(conditions, choices, default="consolidating")

    # Last `forward_days` rows have no future data to look at — drop them
    df.loc[df.index[-forward_days:], "regime_label"] = np.nan
    return df


# ----------------------------------------------------------------------------
# STEP 3 — Train and evaluate
# ----------------------------------------------------------------------------

def train_and_evaluate(df):
    data = df.dropna(subset=FEATURE_COLUMNS + ["regime_label"]).copy()

    X = data[FEATURE_COLUMNS]
    y_raw = data["regime_label"]

    encoder = LabelEncoder()
    y = encoder.fit_transform(y_raw)  # bullish/bearish/consolidating -> 0/1/2

    # IMPORTANT: temporal split, not random split — we train on the past
    # and test on the future, since shuffling would leak future information
    # into training (the model would "cheat").
    split_idx = int(len(data) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    model = XGBClassifier(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=RANDOM_SEED,
        eval_metric="mlogloss",
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)

    acc = accuracy_score(y_test, preds)
    f1 = f1_score(y_test, preds, average="macro")

    print(f"\nTrain size: {len(X_train)} days | Test size: {len(X_test)} days")
    print(f"Accuracy:      {acc:.3f}")
    print(f"Macro F1:      {f1:.3f}")
    print("\nPer-class report:")
    print(classification_report(y_test, preds, target_names=encoder.classes_, zero_division=0))

    print("Feature importance (which numbers the model relied on most):")
    importances = sorted(zip(FEATURE_COLUMNS, model.feature_importances_), key=lambda x: -x[1])
    for name, score in importances:
        print(f"  {name:<22} {score:.3f}")

    return model, encoder


# ----------------------------------------------------------------------------
# STEP 4 — Predict on the most recent day (this is what the live app calls)
# ----------------------------------------------------------------------------

def predict_latest(model, encoder, df):
    latest_row = df.dropna(subset=FEATURE_COLUMNS).iloc[[-1]]
    X_latest = latest_row[FEATURE_COLUMNS]
    pred_class = model.predict(X_latest)[0]
    pred_probs = model.predict_proba(X_latest)[0]

    label = encoder.inverse_transform([pred_class])[0]
    confidence = pred_probs[pred_class]

    print(f"\nLatest day ({latest_row['date'].values[0]}): "
          f"regime = '{label}', confidence = {confidence:.2f}")
    return label, confidence


if __name__ == "__main__":
    print("Generating synthetic price data (replace with real DB read for production)...")
    raw_df = generate_synthetic_price_data()

    print("Engineering features...")
    featured_df = engineer_features(raw_df)

    print("Labeling historical regimes (based on forward 5-day return)...")
    labeled_df = label_regime(featured_df)

    print("Training XGBoost classifier (temporal train/test split)...")
    model, encoder = train_and_evaluate(labeled_df)

    predict_latest(model, encoder, labeled_df)

"""
analyze_banknifty.py

Loads the real Nifty Bank CSV (NSE format: trailing-space column names,
newest-first date order, DD-Mon-YY dates) and runs it through the SAME
feature engineering + anomaly detection logic used in
train_price_classifier.py — this is the real-data version of that
pipeline, for one instrument.

Nifty Bank is a SECTOR INDEX, not a single company — so in our schema
this maps to the `index_history` table, not `price_history`. The
anomaly detection and pattern logic work identically either way; the
difference only matters later, at the causal-explanation stage, where
"why did Nifty Bank move" points to banking-sector-wide drivers (RBI
policy, bank earnings season, NBFC news) rather than one company's news.
"""

import pandas as pd
import numpy as np


def load_nifty_bank_csv(path):
    df = pd.read_csv(path)

    # Real NSE exports have trailing spaces in every header — strip them.
    df.columns = [c.strip() for c in df.columns]

    # Standardize to our pipeline's expected names.
    df = df.rename(columns={
        "Date": "date",
        "Open": "open",
        "High": "high",
        "Low": "low",
        "Close": "close",
        "Shares Traded": "volume",   # NSE calls it "Shares Traded"; our schema calls it "volume"
    })

    # Turnover column name got mangled encoding the ₹ symbol as "?" —
    # keep it, but rename to something encoding-safe.
    turnover_col = [c for c in df.columns if "Turnover" in c][0]
    df = df.rename(columns={turnover_col: "turnover_cr"})

    # NSE format: "21-Sep-26" = DD-Mon-YY
    df["date"] = pd.to_datetime(df["date"], format="%d-%b-%y")

    # NSE exports newest-first — our feature engineering needs oldest-first
    # (rolling windows, forward-looking labels all assume ascending time order)
    df = df.sort_values("date").reset_index(drop=True)

    return df[["date", "open", "high", "low", "close", "volume", "turnover_cr"]]


# ----------------------------------------------------------------------------
# Reuse the exact feature engineering from train_price_classifier.py
# ----------------------------------------------------------------------------

def engineer_features(df):
    df = df.copy()
    df["daily_return"] = df["close"].pct_change()

    roll_mean = df["daily_return"].rolling(20).mean()
    roll_std = df["daily_return"].rolling(20).std()
    df["return_zscore"] = (df["daily_return"] - roll_mean) / roll_std

    vol_roll_mean = df["volume"].rolling(20).mean()
    vol_roll_std = df["volume"].rolling(20).std()
    df["volume_zscore"] = (df["volume"] - vol_roll_mean) / vol_roll_std

    df["ma20"] = df["close"].rolling(20).mean()
    df["ma50"] = df["close"].rolling(50).mean()
    df["price_vs_ma20"] = (df["close"] - df["ma20"]) / df["ma20"]
    df["price_vs_ma50"] = (df["close"] - df["ma50"]) / df["ma50"]

    df["volatility_20d"] = df["daily_return"].rolling(20).std()

    delta = df["close"].diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = (-delta.clip(upper=0)).rolling(14).mean()
    rs = gain / loss
    df["rsi_14"] = 100 - (100 / (1 + rs))

    return df


def detect_anomalies(df, z_threshold=2.0):
    """
    Flags days where the return z-score exceeds the threshold —
    this is the actual Module C anomaly-detection logic, run for real
    on real Nifty Bank data.
    """
    df = df.copy()
    df["is_anomaly"] = df["return_zscore"].abs() >= z_threshold
    df["direction"] = np.where(df["daily_return"] > 0, "up", "down")
    return df


if __name__ == "__main__":
    print("Loading Nifty Bank data...")
    df = load_nifty_bank_csv("/mnt/user-data/uploads/NIFTY_BANK.csv")
    print(f"Loaded {len(df)} trading days, {df['date'].min().date()} to {df['date'].max().date()}")

    print("\nEngineering features...")
    featured = engineer_features(df)

    print("Detecting anomalies (|z-score| >= 2.0)...")
    result = detect_anomalies(featured)

    anomalies = result[result["is_anomaly"]].copy()
    print(f"\nFound {len(anomalies)} anomalous trading days out of {len(result.dropna(subset=['return_zscore']))} scorable days.")

    print("\nAll flagged anomalies:")
    display_cols = ["date", "close", "daily_return", "return_zscore", "volume_zscore", "direction", "rsi_14"]
    anomalies_display = anomalies[display_cols].copy()
    anomalies_display["date"] = anomalies_display["date"].dt.date
    anomalies_display["daily_return"] = (anomalies_display["daily_return"] * 100).round(2)
    anomalies_display["return_zscore"] = anomalies_display["return_zscore"].round(2)
    anomalies_display["volume_zscore"] = anomalies_display["volume_zscore"].round(2)
    anomalies_display["rsi_14"] = anomalies_display["rsi_14"].round(1)
    print(anomalies_display.to_string(index=False))

    # Save the full featured dataset for the team to inspect / feed downstream
    result.to_csv("/home/claude/nifty_bank_featured.csv", index=False)
    print("\nFull featured dataset saved to nifty_bank_featured.csv")

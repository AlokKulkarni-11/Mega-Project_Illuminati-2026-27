"""
generate_ohlcv_history.py
Generates full OHLCV daily price series for the tracked instruments
from 2025-06-01 to 2026-09-25 (approx 320 trading days).
Includes calibrated anomaly shocks on known event dates (e.g., 2025-11-26, 2026-02-01, etc.).
"""
import json
import random
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)

BASE_CONFIGS = {
    "NIFTYBANK": {"base": 54000.0, "vol": 0.009, "base_vol": 180000000},
    "TCS": {"base": 3900.0, "vol": 0.011, "base_vol": 2200000},
    "INFY": {"base": 1700.0, "vol": 0.013, "base_vol": 3100000},
    "RELIANCE": {"base": 2850.0, "vol": 0.010, "base_vol": 4500000},
    "HDFCBANK": {"base": 1680.0, "vol": 0.008, "base_vol": 3800000},
}

# Specific event shocks to match anomaly dates
KNOWN_SHOCKS = {
    "2025-11-26": {"return": 0.012, "vol_mult": 1.8},     # Bullish rebound (+1.2%)
    "2026-02-01": {"return": -0.020, "vol_mult": 2.5},    # Budget shock (-2.0%)
    "2026-02-03": {"return": 0.0243, "vol_mult": 2.1},    # Post-budget relief (+2.43%)
    "2026-03-04": {"return": -0.0181, "vol_mult": 1.7},   # Rate cut hesitation (-1.81%)
    "2026-03-06": {"return": -0.0215, "vol_mult": 1.9},   # Pre-weekend de-risking (-2.15%)
    "2026-03-09": {"return": -0.0305, "vol_mult": 2.4},   # Global spillover (-3.05%)
    "2026-04-08": {"return": 0.0567, "vol_mult": 3.2},    # Sharp breakout (+5.67%)
}

def generate_trading_days(start_str="2025-06-01", end_str="2026-09-25"):
    start = datetime.strptime(start_str, "%Y-%m-%d")
    end = datetime.strptime(end_str, "%Y-%m-%d")
    cur = start
    days = []
    while cur <= end:
        # Weekdays only (0 = Monday, 4 = Friday)
        if cur.weekday() < 5:
            days.append(cur.strftime("%Y-%m-%d"))
        cur += timedelta(days=1)
    return days

def build_ohlcv_series(symbol, trading_days):
    cfg = BASE_CONFIGS[symbol]
    cur_price = cfg["base"]
    series = []

    for dt in trading_days:
        if dt in KNOWN_SHOCKS:
            ret = KNOWN_SHOCKS[dt]["return"]
            vol_mult = KNOWN_SHOCKS[dt]["vol_mult"]
        else:
            # Gaussian daily return with mild mean-reversion
            drift = -0.0001 * (cur_price - cfg["base"]) / cfg["base"]
            ret = random.gauss(drift, cfg["vol"])
            vol_mult = random.uniform(0.7, 1.4)

        prev_close = cur_price
        cur_price = prev_close * (1.0 + ret)
        
        # Realistic OHLC relationship
        intra_vol = abs(ret) + cfg["vol"] * random.uniform(0.5, 1.2)
        open_px = prev_close * (1.0 + random.gauss(0, cfg["vol"] * 0.3))
        high_px = max(open_px, cur_price) * (1.0 + random.uniform(0.001, intra_vol * 0.7))
        low_px = min(open_px, cur_price) * (1.0 - random.uniform(0.001, intra_vol * 0.7))
        volume = int(cfg["base_vol"] * vol_mult * random.uniform(0.85, 1.15))

        series.append({
            "date": dt,
            "open": round(open_px, 2),
            "high": round(high_px, 2),
            "low": round(low_px, 2),
            "close": round(cur_price, 2),
            "volume": volume
        })
    return series

def main():
    trading_days = generate_trading_days()
    result = {}
    for sym in BASE_CONFIGS:
        result[sym] = build_ohlcv_series(sym, trading_days)
        print(f"Generated {len(result[sym])} OHLCV bars for {sym} (last close: {result[sym][-1]['close']})")

    out_path = Path("ml_service/data/fixtures/prices.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(f"Successfully wrote multi-month OHLCV data to {out_path}")

if __name__ == "__main__":
    main()

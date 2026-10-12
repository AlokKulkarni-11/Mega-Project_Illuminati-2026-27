"""Run: python test_marketmind_pipeline.py   (or pytest). No network / API key needed."""
import json
import os
import tempfile
from datetime import date

import numpy as np
import pandas as pd

import marketmind_pipeline as mp

REAL_CSV = os.environ.get("NIFTY_BANK_CSV",
                          os.path.join(os.path.dirname(__file__), "..", "data", "NIFTY_BANK.csv"))


def test_google_url_keeps_date_operators():
    u = mp.google_news_url("Bank Nifty", date(2026, 4, 6), date(2026, 4, 9))
    assert "after:2026-04-06" in u and "before:2026-04-09" in u and "ceid=IN:en" in u


def test_parse_llm_json_handles_fences_and_chatter():
    raw = 'Sure!\n```json\n{"has_clear_driver": true, "cited": [1]}\n```\nHope that helps'
    assert mp.parse_llm_json(raw)["cited"] == [1]


def test_no_citations_forces_abstention():
    r = mp.enforce_rules({"has_clear_driver": True, "cause_summary": "x", "cited": [],
                          "confidence": "high", "causal_category": "macro"}, 5)
    assert r["has_clear_driver"] is False and r["confidence"] == "low" and r["causal_category"] == "unclear"


def test_out_of_range_citations_are_dropped():
    r = mp.enforce_rules({"has_clear_driver": True, "cited": [0, 3, 9, "a"], "confidence": "high"}, 3)
    assert r["cited"] == [3] and r["confidence"] == "medium"      # single source caps "high"


def test_invalid_enums_fall_back():
    r = mp.enforce_rules({"has_clear_driver": True, "cited": [1, 2], "causal_category": "vibes",
                          "scope": "galaxy", "news_direction": "sideways", "confidence": "certain"}, 2)
    assert (r["causal_category"], r["scope"], r["news_direction"], r["confidence"]) == \
           ("unclear", "unclear", "neutral", "low")


def test_time_filter_drops_future_articles():
    arts = [{"published_date": d, "title": d} for d in ("2026-04-05", "2026-04-07", "2026-04-08", "2026-04-09")]
    kept = [a["published_date"] for a in mp.filter_window(arts, date(2026, 4, 8), 2)]
    assert kept == ["2026-04-07", "2026-04-08"]                     # 04-09 is future, 04-05 too old


def test_signal_agreement_table():
    assert mp.signal_agreement("bearish", "bearish", True) == "aligned"
    assert mp.signal_agreement("bearish", "neutral", True) == "diverging"
    assert mp.signal_agreement("bullish", "bearish", True) == "diverging"
    assert mp.signal_agreement("bullish", "bullish", False) == "insufficient"


def test_ranking_prefers_same_day_direction_matched_headlines():
    day = date(2026, 4, 8)
    arts = [
        {"title": "Bank Nifty surges as banking stocks rally", "published_date": "2026-04-08"},
        {"title": "Cricket final tonight", "published_date": "2026-04-08"},
        {"title": "Bank Nifty slumps", "published_date": "2026-04-06"},
    ]
    assert mp.rank_articles(arts, day, "bullish")[0]["title"].startswith("Bank Nifty surges")


def test_detect_anomalies_flags_injected_spike():
    rng = np.random.default_rng(0)
    close = 100 * np.cumprod(1 + rng.normal(0, 0.005, 120))
    close[80:] *= 1.08                                              # +8% jump on index 80
    df = pd.DataFrame({"date": pd.bdate_range("2026-01-01", periods=120), "open": close,
                       "high": close, "low": close, "close": close, "volume": 1e6})
    hits = mp.detect_anomalies(df)
    assert pd.Timestamp(df.loc[80, "date"]) in set(hits["date"])
    assert hits.loc[hits["date"] == df.loc[80, "date"], "price_direction"].iloc[0] == "bullish"


def test_real_csv_yields_the_12_known_anomalies():
    if not os.path.exists(REAL_CSV):
        print("  (skipped: real CSV not found)")
        return
    hits = mp.detect_anomalies(mp.load_prices(REAL_CSV))
    assert len(hits) == 12
    assert "2026-04-08" in set(hits["date"].dt.strftime("%Y-%m-%d"))


def test_failed_fetch_raises_and_is_never_cached():
    orig = mp.fetch_news_live
    try:
        with tempfile.TemporaryDirectory() as d:
            mp.fetch_news_live = lambda *a, **k: ([], 3)             # all 3 queries errored
            try:
                mp.cached_fetch(d, date(2026, 4, 8), ["a", "b", "c"], 2)
                raise AssertionError("expected FetchFailed")
            except mp.FetchFailed:
                pass
            assert os.listdir(d) == []                                # nothing cached
            mp.fetch_news_live = lambda *a, **k: ([], 0)              # succeeded but genuinely empty
            assert mp.cached_fetch(d, date(2026, 4, 8), ["a"], 2) == []
            assert os.listdir(d) == []                                # empties not cached either
            art = {"title": "t", "source": "s", "url": "u", "published_at": "x", "published_date": "2026-04-08", "snippet": ""}
            mp.fetch_news_live = lambda *a, **k: ([art], 0)
            assert mp.cached_fetch(d, date(2026, 4, 8), ["a"], 2) == [art]
            mp.fetch_news_live = lambda *a, **k: (_ for _ in ()).throw(AssertionError("should hit cache"))
            assert mp.cached_fetch(d, date(2026, 4, 8), ["a"], 2) == [art]   # served from cache
    finally:
        mp.fetch_news_live = orig


def test_mock_pipeline_end_to_end():
    if not os.path.exists(REAL_CSV):
        print("  (skipped: real CSV not found)")
        return
    with tempfile.TemporaryDirectory() as d:
        args = mp.parse_args(["--prices", REAL_CSV, "--mock", "--out-dir", d])
        out = mp.run(args)
        assert len(out) == 12 and set(out["mode"]) == {"MOCK"}
        assert (~out["has_clear_driver"]).any() and out["has_clear_driver"].any()   # both paths hit
        assert (out.loc[~out["has_clear_driver"], "confidence"] == "low").all()
        assert (out.loc[~out["has_clear_driver"], "signal_agreement"] == "insufficient").all()
        for f in ("anomalies_explained.csv", "anomalies_explained.json", "headlines_labeled.csv"):
            assert os.path.exists(os.path.join(d, f))
        json.load(open(os.path.join(d, "anomalies_explained.json"), encoding="utf-8"))


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"PASS {t.__name__}")
    print(f"\n{len(tests)} tests passed")

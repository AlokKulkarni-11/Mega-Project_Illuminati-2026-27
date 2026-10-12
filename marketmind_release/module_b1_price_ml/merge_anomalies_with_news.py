"""
merge_anomalies_with_news.py

Takes the anomalies detected by analyze_banknifty.py and attaches a
researched news explanation to each one, producing the final labeled
CSV: nifty_bank_anomalies_with_news.csv

HOW THE `research` DICT BELOW WAS ACTUALLY BUILT (be honest about this
with your team): for each anomaly date, I ran a web search for
"Nifty Bank [date] [up/down] banking stocks news" and read the results.
Where a real, dated news article clearly matched that specific day's
move, I recorded it with confidence="high" (or "medium" if the match
was indirect/inferred). Where no clear dated article turned up, I
recorded confidence="unconfirmed" rather than guessing — this mirrors
exactly what the RAG engine (Module B3) should do at query time: cite
real evidence when it exists, say so plainly when it doesn't.

In production, this step is what causal_synthesis.py automates —
instead of a human running searches, it does time-filtered retrieval
against the news_articles/news_embeddings tables and an LLM call. This
script is the manual version of that same idea, done once by hand to
build a small verified backtest set (per the project's evaluation plan).

INPUT: the anomalies list (from analyze_banknifty.py's output —
        pulled from nifty_bank_featured.csv's flagged rows)
OUTPUT: nifty_bank_anomalies_with_news.csv
"""

import pandas as pd

# ----------------------------------------------------------------------------
# The 12 anomalies detected by analyze_banknifty.py
# (copied from that script's output — in a fuller pipeline this would be
# read directly from nifty_bank_featured.csv where is_anomaly == True)
# ----------------------------------------------------------------------------

ANOMALIES = [
    {"date": "2025-11-26", "close": 59528.05, "daily_return_pct": 1.20, "z_score": 2.17},
    {"date": "2026-02-01", "close": 58417.20, "daily_return_pct": -2.00, "z_score": -2.33},
    {"date": "2026-02-03", "close": 60041.30, "daily_return_pct": 2.43, "z_score": 2.47},
    {"date": "2026-03-04", "close": 58755.25, "daily_return_pct": -1.81, "z_score": -2.15},
    {"date": "2026-03-06", "close": 57783.25, "daily_return_pct": -2.15, "z_score": -2.13},
    {"date": "2026-03-09", "close": 56019.80, "daily_return_pct": -3.05, "z_score": -2.42},
    {"date": "2026-04-08", "close": 55703.90, "daily_return_pct": 5.67, "z_score": 2.27},
    {"date": "2026-06-12", "close": 56814.80, "daily_return_pct": 2.97, "z_score": 2.43},
    {"date": "2026-07-08", "close": 56742.60, "daily_return_pct": -2.51, "z_score": -2.42},
    {"date": "2026-08-31", "close": 58024.95, "daily_return_pct": 0.92, "z_score": 2.02},
    {"date": "2026-09-01", "close": 57409.60, "daily_return_pct": -1.06, "z_score": -2.02},
    {"date": "2026-09-15", "close": 55794.75, "daily_return_pct": -1.43, "z_score": -2.20},
]

# ----------------------------------------------------------------------------
# Manually researched news findings, one entry per anomaly date.
# confidence: "high" = clear dated article matching this specific move,
#             "medium" = indirect/inferred match,
#             "unconfirmed" = no clear dated article found, do not guess.
# ----------------------------------------------------------------------------

RESEARCH = {
    "2025-11-26": {
        "label": "bullish", "headline": None,
        "explanation": "No specific, confirmed news driver found for this date in available search results.",
        "source": None, "confidence": "unconfirmed",
    },
    "2026-02-01": {
        "label": "bearish",
        "headline": "Nifty Bank falls post Budget 2026, PSU banks lead losses as merger, borrowing concerns weigh",
        "explanation": "Union Budget 2026 presented on Feb 1; PSU banks fell sharply on merger concerns and the government's record Rs 17.2 trillion borrowing plan, which raised bond yield concerns hurting PSU bank treasury books.",
        "source": "TradingView (Moneycontrol) / BusinessToday / Upstox, Feb 1 2026", "confidence": "high",
    },
    "2026-02-03": {
        "label": "bullish", "headline": None,
        "explanation": "No specific, confirmed news driver found for this date in available search results (plausibly a post-Budget relief rebound, but not directly sourced).",
        "source": None, "confidence": "unconfirmed",
    },
    "2026-03-04": {
        "label": "bearish", "headline": None,
        "explanation": "No specific, confirmed news driver found for this exact date in available search results.",
        "source": None, "confidence": "unconfirmed",
    },
    "2026-03-06": {
        "label": "bearish", "headline": None,
        "explanation": "No specific, confirmed news driver found for this exact date in available search results.",
        "source": None, "confidence": "unconfirmed",
    },
    "2026-03-09": {
        "label": "bearish",
        "headline": "Why Is the Indian Stock Market Falling Today (9 March 2026)?",
        "explanation": "Banking and IT stocks led a broad market decline driven by global market weakness, FII selling, and profit booking after a period of strong prior gains.",
        "source": "Swastika Investmart, March 9 2026", "confidence": "high",
    },
    "2026-04-08": {
        "label": "bullish",
        "headline": "Sensex Nifty Updates April 8: Benchmarks Jump Nearly 4% Tracking Global Rally",
        "explanation": "Indian markets surged on a global rally; banking and financial stocks led gains while India VIX plunged, signaling easing volatility.",
        "source": "5paisa, April 8 2026", "confidence": "high",
    },
    "2026-06-12": {
        "label": "bullish",
        "headline": "Bank Nifty surges to 56,814.80 (+2.97%) on draft US-Iran ceasefire reports",
        "explanation": "Reports of a draft US-Iran ceasefire MoU sent crude oil 4% lower and triggered a broad risk-on rally across Indian markets; Bank Nifty was the standout gainer.",
        "source": "Jainam Broking (X) / 5paisa / Liquide, June 12 2026", "confidence": "high",
    },
    "2026-07-08": {
        "label": "bearish",
        "headline": "Why is the Stock Market Down Today on July 8, 2026? Nifty Falls Over 2%",
        "explanation": "Renewed US-Iran tensions after Trump said the ceasefire MoU was 'over' reignited Middle East geopolitical concerns; Brent crude jumped 5.66%, triggering broad risk-off selling.",
        "source": "Angel One / BreakingTrade, July 8 2026", "confidence": "high",
    },
    "2026-08-31": {
        "label": "bullish",
        "headline": "(Inferred) Sharp gain during closing auction, referenced in next day's coverage",
        "explanation": "Referenced indirectly in Sep 1 coverage as 'a strong rise in the previous session, when the index had gained significantly during the closing auction' — no direct Aug 31 article found.",
        "source": "businessnewsthisweek.com (Sep 1 article, referencing prior session)", "confidence": "medium",
    },
    "2026-09-01": {
        "label": "bearish",
        "headline": "Bank Nifty Slides Nearly 800 Points as Banking Stocks Face Heavy Selling",
        "explanation": "Profit booking after the prior session's sharp gains; broader equity market remained relatively stable, so this was sector-specific unwinding.",
        "source": "businessnewsthisweek.com, September 1 2026", "confidence": "high",
    },
    "2026-09-15": {
        "label": "bearish", "headline": None,
        "explanation": "No specific, confirmed news driver found for this date — only general technical/trendline commentary, not a causal news article.",
        "source": None, "confidence": "unconfirmed",
    },
}


def build_merged_csv(output_path="nifty_bank_anomalies_with_news.csv"):
    rows = []
    for anomaly in ANOMALIES:
        r = RESEARCH[anomaly["date"]]
        rows.append({**anomaly, **r})

    df = pd.DataFrame(rows)
    df.to_csv(output_path, index=False)

    print(f"Wrote {len(df)} rows to {output_path}")
    print(f"\nConfidence breakdown:\n{df['confidence'].value_counts()}")
    return df


if __name__ == "__main__":
    build_merged_csv()

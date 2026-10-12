#!/usr/bin/env python3
"""
marketmind_pipeline.py — price CSV -> anomalies -> news -> cited cause

One script that automates what we did by hand for Nifty Bank:

  1. load_prices()        read the NSE-format CSV (trailing-space headers, newest-first)
  2. detect_anomalies()   rolling z-score on daily returns (same logic as analyze_banknifty.py)
  3. fetch news           Google News RSS, date-windowed per anomaly (free, no API key)
  4. filter + rank        HARD time filter (published <= anomaly date), then keyword ranking
  5. explain_anomaly()    LLM picks the cause from the numbered articles ONLY, with
                          code-enforced citation/abstention rules
  6. signal agreement     price direction vs direction implied by the news
  7. outputs              anomalies_explained.csv / .json  +  headlines_labeled.csv
                          (weak labels for BERT fine-tuning)

USAGE
  pip install pandas numpy feedparser requests anthropic
  export ANTHROPIC_API_KEY=...            # optional: MARKETMIND_MODEL=claude-sonnet-5
  python marketmind_pipeline.py --prices NIFTY_BANK.csv --name "Nifty Bank"
  python marketmind_pipeline.py --prices NIFTY_BANK.csv --mock     # offline dry run, NO real news/LLM

OPTIONAL FULL TEXT (--fulltext): Google News RSS links are encoded redirects. This
uses `googlenewsdecoder` + `trafilatura` (pip install both) in a try/except and falls
back to headline-only per article. I have not verified that decoder's API against the
current release — treat --fulltext as experimental.

KNOWN LIMITS (be upfront about these in the report)
  * Time alignment is DAY-level: Google News RSS has no time-of-day filter, so an
    article published after market close on the anomaly date can still be retrieved.
  * Default input to the LLM is headline + RSS snippet, not full article text.
  * Google News date operators are undocumented and could change without notice.
  * price_direction is bullish/bearish only; a single anomaly day is not a "sentiment".
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import re
import time
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import quote_plus

import numpy as np
import pandas as pd

IST = timezone(timedelta(hours=5, minutes=30))

# 6 categories match the DB enum in V1__init_schema.sql. "market_flows" (FII selling,
# profit booking) and "unclear" are NOT in that enum yet — see note at bottom of file.
CATEGORIES = ["geopolitical", "regulatory", "earnings", "macro",
              "sector_specific", "company_specific", "market_flows", "unclear"]
SCOPES = ["market_wide", "sector", "company", "unclear"]
DIRECTIONS = ["bullish", "bearish", "neutral"]
CONFIDENCES = ["high", "medium", "low"]

UP_WORDS = {"surge", "surges", "rally", "rallies", "jump", "jumps", "gain", "gains", "soar",
            "soars", "rise", "rises", "climb", "climbs", "advance", "rebound", "rebounds", "spike"}
DOWN_WORDS = {"fall", "falls", "slump", "slumps", "drop", "drops", "decline", "declines",
              "crash", "crashes", "tumble", "tumbles", "plunge", "plunges", "slide", "slides",
              "sink", "sinks", "sell-off", "selloff", "loss", "losses", "slip", "slips"}


# --------------------------------------------------------------------------
# 1. PRICES
# --------------------------------------------------------------------------
def load_prices(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, encoding_errors="replace")
    df.columns = [c.strip() for c in df.columns]
    rename = {}
    for c in df.columns:
        lc = c.lower()
        if lc == "date":
            rename[c] = "date"
        elif lc in ("open", "high", "low", "close"):
            rename[c] = lc
        elif lc in ("shares traded", "volume"):
            rename[c] = "volume"
        elif lc.startswith("turnover"):          # "Turnover (₹ Cr)" arrives with a mangled ₹
            rename[c] = "turnover_cr"
    df = df.rename(columns=rename)
    missing = {"date", "open", "high", "low", "close"} - set(df.columns)
    if missing:
        raise ValueError(f"Price CSV is missing columns: {sorted(missing)}")

    raw = df["date"].astype(str).str.strip()
    for fmt in ("%d-%b-%y", "%d-%b-%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            df["date"] = pd.to_datetime(raw, format=fmt)
            break
        except (ValueError, TypeError):
            continue
    else:
        df["date"] = pd.to_datetime(raw, dayfirst=True)

    if "volume" not in df.columns:
        df["volume"] = np.nan
    return df.sort_values("date").reset_index(drop=True)


# --------------------------------------------------------------------------
# 2. ANOMALIES
# --------------------------------------------------------------------------
def detect_anomalies(df: pd.DataFrame, window: int = 20, z_threshold: float = 2.0) -> pd.DataFrame:
    d = df.copy()
    d["daily_return"] = d["close"].pct_change()
    m = d["daily_return"].rolling(window).mean()
    s = d["daily_return"].rolling(window).std()
    d["return_z"] = (d["daily_return"] - m) / s
    vm = d["volume"].rolling(window).mean()
    vs = d["volume"].rolling(window).std()
    d["volume_z"] = (d["volume"] - vm) / vs
    d["is_anomaly"] = d["return_z"].abs() >= z_threshold
    d["price_direction"] = np.where(d["daily_return"] > 0, "bullish", "bearish")
    return d[d["is_anomaly"]].reset_index(drop=True)


# --------------------------------------------------------------------------
# 3. NEWS RETRIEVAL
# --------------------------------------------------------------------------
def google_news_url(query: str, after: date, before: date) -> str:
    """`before:` is exclusive at day level, so pass anomaly_day + 1 to include the anomaly day."""
    q = f"{query} after:{after:%Y-%m-%d} before:{before:%Y-%m-%d}"
    return f"https://news.google.com/rss/search?q={quote_plus(q, safe=':')}&hl=en-IN&gl=IN&ceid=IN:en"


def _split_title(raw_title: str, source: str) -> str:
    t = raw_title.strip()
    if source and t.endswith(f" - {source}"):
        return t[: -len(source) - 3].strip()
    return re.sub(r"\s+-\s+[^-]{2,40}$", "", t).strip()


def _dedupe(articles: list[dict]) -> list[dict]:
    seen, out = set(), []
    for a in articles:
        key = re.sub(r"\W+", " ", a["title"].lower()).strip()
        if key and key not in seen:
            seen.add(key)
            out.append(a)
    return out


class FetchFailed(Exception):
    """Every query for a date failed (offline / blocked). Distinct from 'no news exists'."""


def fetch_news_live(queries: list[str], after: date, before: date,
                    delay: tuple[float, float] = (1.5, 3.0)) -> tuple[list[dict], int]:
    import feedparser
    import requests
    out, errors = [], 0
    for q in queries:
        url = google_news_url(q, after, before)
        try:
            r = requests.get(url, timeout=20,
                             headers={"User-Agent": "Mozilla/5.0 (MarketMind academic project)"})
            r.raise_for_status()
            feed = feedparser.parse(r.content)
        except Exception as e:  # network / block / parse — skip this query, keep going
            print(f"    [warn] '{q}' {after}..{before}: {e}")
            errors += 1
            continue
        for e in feed.entries:
            try:
                pub = parsedate_to_datetime(e.published).astimezone(IST)
            except Exception:
                continue
            source = (e.get("source") or {}).get("title", "")
            out.append({
                "title": _split_title(e.title, source),
                "source": source or "unknown",
                "url": e.link,
                "published_at": pub.isoformat(),
                "published_date": pub.date().isoformat(),
                "snippet": re.sub(r"<[^>]+>", " ", e.get("summary", "")).strip(),
            })
        time.sleep(random.uniform(*delay))
    return _dedupe(out), errors


def filter_window(articles: list[dict], anomaly_day: date, lookback_days: int) -> list[dict]:
    """HARD time filter — the anti-hindsight rule. Nothing published after the anomaly day survives."""
    lo = (anomaly_day - timedelta(days=lookback_days)).isoformat()
    hi = anomaly_day.isoformat()
    return [a for a in articles if lo <= a["published_date"] <= hi]


def rank_articles(articles: list[dict], anomaly_day: date, direction: str) -> list[dict]:
    def score(a: dict) -> int:
        t = a["title"].lower()
        words = set(re.findall(r"[a-z\-]+", t))
        s = 0
        if "bank nifty" in t or "nifty bank" in t:
            s += 3
        elif any(k in t for k in ("nifty", "sensex", "banking", "bank stocks")):
            s += 2
        gap = (anomaly_day - date.fromisoformat(a["published_date"])).days
        s += {0: 2, 1: 1}.get(gap, 0)
        same, opp = (UP_WORDS, DOWN_WORDS) if direction == "bullish" else (DOWN_WORDS, UP_WORDS)
        if words & same:
            s += 1
        elif words & opp:
            s -= 1
        return s
    return sorted(articles, key=score, reverse=True)


def enrich_fulltext(articles: list[dict], max_chars: int = 1500) -> None:
    """Experimental: decode Google News redirect + extract body. Silent per-article fallback."""
    try:
        import trafilatura
        from googlenewsdecoder import gnewsdecoder
    except ImportError:
        print("    [warn] --fulltext needs: pip install googlenewsdecoder trafilatura")
        return
    for a in articles:
        try:
            dec = gnewsdecoder(a["url"], interval=1)
            if not dec.get("status"):
                continue
            html = trafilatura.fetch_url(dec["decoded_url"])
            text = trafilatura.extract(html) if html else None
            if text:
                a["snippet"] = text[:max_chars]
        except Exception:
            continue


# ---- offline stand-ins (dry run only; every title is tagged [MOCK]) ----
def mock_fetch(anomaly_day: date) -> list[dict]:
    if anomaly_day.day % 4 == 0:           # exercise the "no articles -> abstain" path
        return []
    out = []
    for gap in (0, 1):
        d = anomaly_day - timedelta(days=gap)
        out.append({"title": f"[MOCK] Bank Nifty moves sharply as banking stocks react ({d})",
                    "source": "MockWire", "url": "", "snippet": "",
                    "published_at": datetime.combine(d, datetime.min.time(), IST).isoformat(),
                    "published_date": d.isoformat()})
    return out


# --------------------------------------------------------------------------
# 4. CAUSAL EXPLANATION (LLM) — rules enforced in code, not just in the prompt
# --------------------------------------------------------------------------
SYSTEM_PROMPT = f"""You are a financial research assistant explaining why an Indian market index or stock moved on one specific day, using ONLY the numbered articles provided.

Rules:
1. Do not use outside knowledge about that date. If the articles do not clearly explain the move, set has_clear_driver to false.
2. Every claim in cause_summary must be supported by the article numbers you cite.
3. Say whether the cause is market-wide, sector-level, or company-level (scope).
4. Explain the move that already happened. Never predict future prices.
5. Reply with ONE JSON object and nothing else, with exactly these keys:
   has_clear_driver (bool), cause_summary (1-3 sentences), causal_category (one of {CATEGORIES}),
   scope (one of {SCOPES}), news_direction (one of {DIRECTIONS}: the direction the cited news implies for the instrument),
   cited (list of article numbers), confidence (one of {CONFIDENCES})."""


def build_user_prompt(instrument: str, row: pd.Series, articles: list[dict]) -> str:
    vz = "n/a" if pd.isna(row.get("volume_z")) else f"{row['volume_z']:.2f}"
    lines = [
        f"Instrument: {instrument}",
        f"Date of move: {row['date']:%Y-%m-%d}",
        f"Price move: {row['daily_return'] * 100:+.2f}% (return z-score {row['return_z']:.2f}, volume z-score {vz}), direction: {row['price_direction']}",
        "Articles (all published on or before the move date):",
    ]
    for i, a in enumerate(articles, 1):
        lines.append(f"[{i}] ({a['published_date']}, {a['source']}) {a['title']}")
        if a.get("snippet") and a["snippet"].lower() != a["title"].lower():
            lines.append(f"    {a['snippet'][:1500]}")
    return "\n".join(lines)


def parse_llm_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.M).strip()
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ValueError("no JSON object in LLM output")
    return json.loads(m.group(0))


def enforce_rules(res: dict, n_articles: int) -> dict:
    """Validation the prompt alone can't guarantee."""
    cited = sorted({i for i in res.get("cited", []) if isinstance(i, int) and 1 <= i <= n_articles})
    out = {
        "has_clear_driver": bool(res.get("has_clear_driver")),
        "cause_summary": str(res.get("cause_summary", "")).strip(),
        "causal_category": res.get("causal_category") if res.get("causal_category") in CATEGORIES else "unclear",
        "scope": res.get("scope") if res.get("scope") in SCOPES else "unclear",
        "news_direction": res.get("news_direction") if res.get("news_direction") in DIRECTIONS else "neutral",
        "cited": cited,
        "confidence": res.get("confidence") if res.get("confidence") in CONFIDENCES else "low",
    }
    if not cited:                                   # a "cause" with no citation is not allowed
        out["has_clear_driver"] = False
    if not out["has_clear_driver"]:
        out.update(confidence="low", causal_category="unclear", scope="unclear",
                   cause_summary=out["cause_summary"] or "No strong driver identified in the retrieved news.")
    elif len(cited) < 2 and out["confidence"] == "high":
        out["confidence"] = "medium"                # single-source claims can't be "high"
    return out


def signal_agreement(price_direction: str, news_direction: str, has_driver: bool) -> str:
    if not has_driver:
        return "insufficient"
    return "aligned" if price_direction == news_direction else "diverging"


def abstain(reason: str) -> dict:
    return {"has_clear_driver": False, "cause_summary": reason, "causal_category": "unclear",
            "scope": "unclear", "news_direction": "neutral", "cited": [], "confidence": "low"}


def explain_anomaly(instrument: str, row: pd.Series, articles: list[dict], llm_fn) -> dict:
    if not articles:                                # skip the LLM call entirely — nothing to cite
        res = abstain("No articles found in the time-filtered window.")
    else:
        try:
            raw = llm_fn(SYSTEM_PROMPT, build_user_prompt(instrument, row, articles))
            res = enforce_rules(parse_llm_json(raw), len(articles))
        except Exception as e:
            res = abstain(f"LLM step failed or returned unparseable output ({type(e).__name__}).")
    res["signal_agreement"] = signal_agreement(row["price_direction"], res["news_direction"], res["has_clear_driver"])
    return res


def make_anthropic_llm(model: str):
    from anthropic import Anthropic
    client = Anthropic()                            # reads ANTHROPIC_API_KEY

    def call(system: str, user: str) -> str:
        last = None
        for attempt in range(3):
            try:
                r = client.messages.create(model=model, max_tokens=700, system=system,
                                           messages=[{"role": "user", "content": user}])
                return "".join(b.text for b in r.content if getattr(b, "type", "") == "text")
            except Exception as e:
                last = e
                time.sleep(2 * (attempt + 1))
        raise last
    return call


def mock_llm(system: str, user: str) -> str:
    d = "bearish" if "direction: bearish" in user else "bullish"
    return "```json\n" + json.dumps({
        "has_clear_driver": True, "cause_summary": "[MOCK] placeholder cause — dry run, not real analysis.",
        "causal_category": "macro", "scope": "market_wide", "news_direction": d,
        "cited": [1, 2], "confidence": "high"}) + "\n```"


# --------------------------------------------------------------------------
# 5. ORCHESTRATION
# --------------------------------------------------------------------------
def cached_fetch(cache_dir: str, day: date, queries: list[str], lookback: int) -> list[dict]:
    os.makedirs(cache_dir, exist_ok=True)
    key = hashlib.md5(f"{'|'.join(queries)}|{lookback}".encode()).hexdigest()[:8]
    path = os.path.join(cache_dir, f"news_{day.isoformat()}_{key}.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    arts, errors = fetch_news_live(queries, day - timedelta(days=lookback), day + timedelta(days=1))
    if errors == len(queries):
        raise FetchFailed(f"all {errors} queries failed for {day}")
    if arts:                                        # never cache empties: a transient glitch would stick
        with open(path, "w", encoding="utf-8") as f:
            json.dump(arts, f, ensure_ascii=False)
    return arts


def run(a: argparse.Namespace) -> pd.DataFrame:
    prices = load_prices(a.prices)
    anomalies = detect_anomalies(prices, a.window, a.z)
    print(f"{len(prices)} trading days | {prices['date'].min():%Y-%m-%d} -> {prices['date'].max():%Y-%m-%d} "
          f"| {len(anomalies)} anomalies (|z| >= {a.z})")
    if a.max_anomalies:
        anomalies = anomalies.head(a.max_anomalies)

    queries = [q.strip() for q in a.queries.split(",") if q.strip()]
    llm_fn = mock_llm if a.mock else make_anthropic_llm(a.model)
    mode = "MOCK" if a.mock else "live"
    os.makedirs(a.out_dir, exist_ok=True)

    rows, detail, label_rows = [], [], []
    for _, r in anomalies.iterrows():
        day = r["date"].date()
        print(f"- {day}  {r['daily_return'] * 100:+.2f}%  z={r['return_z']:.2f}")
        fetch_status = "mock" if a.mock else "ok"
        try:
            raw = mock_fetch(day) if a.mock else cached_fetch(os.path.join(a.out_dir, "cache"), day, queries, a.lookback)
        except FetchFailed as err:
            raw, fetch_status = [], "failed"
            print(f"    [FETCH FAILED] {err} — not treated as 'no news'")
        if not raw and fetch_status == "ok":
            fetch_status = "empty"
        in_window = filter_window(raw, day, a.lookback)
        top = rank_articles(in_window, day, r["price_direction"])[: a.top_k]
        if a.fulltext and not a.mock:
            enrich_fulltext(top)
        if fetch_status == "failed":
            e = abstain("News fetch failed (network error or blocked). This is NOT evidence that no news exists.")
            e["signal_agreement"] = "insufficient"
        else:
            e = explain_anomaly(a.name, r, top, llm_fn)
        cited = [top[i - 1] for i in e["cited"]]

        rows.append({
            "date": day.isoformat(), "close": r["close"],
            "daily_return_pct": round(r["daily_return"] * 100, 2),
            "return_z": round(r["return_z"], 2),
            "volume_z": None if pd.isna(r["volume_z"]) else round(r["volume_z"], 2),
            "price_direction": r["price_direction"],
            "articles_retrieved": len(raw), "articles_in_window": len(in_window), "articles_used": len(top),
            "has_clear_driver": e["has_clear_driver"], "cause_summary": e["cause_summary"],
            "causal_category": e["causal_category"], "scope": e["scope"],
            "news_direction": e["news_direction"], "signal_agreement": e["signal_agreement"],
            "confidence": e["confidence"],
            "cited_headlines": " || ".join(c["title"] for c in cited),
            "cited_sources": " || ".join(c["source"] for c in cited),
            "cited_urls": " || ".join(c["url"] for c in cited),
            "fetch_status": fetch_status, "mode": mode,
        })
        detail.append({"date": day.isoformat(), "explanation": e, "articles_shown_to_llm": top})
        for i, art in enumerate(top, 1):
            label_rows.append({
                "text": art["title"],
                "sentiment": r["price_direction"],          # WEAK label: what the index did that day
                "causal_category": e["causal_category"] if i in e["cited"] else "",
                "anomaly_date": day.isoformat(), "published_date": art["published_date"],
                "source": art["source"], "is_cited": i in e["cited"], "mode": mode,
            })

    out = pd.DataFrame(rows)
    out.to_csv(os.path.join(a.out_dir, "anomalies_explained.csv"), index=False)
    with open(os.path.join(a.out_dir, "anomalies_explained.json"), "w", encoding="utf-8") as f:
        json.dump(detail, f, indent=2, ensure_ascii=False)
    pd.DataFrame(label_rows).to_csv(os.path.join(a.out_dir, "headlines_labeled.csv"), index=False)

    if len(out):
        print(f"\n[{mode}] explained {len(out)} anomalies -> {a.out_dir}/")
        print(out[["date", "daily_return_pct", "has_clear_driver", "confidence", "signal_agreement"]].to_string(index=False))
    return out


def parse_args(argv=None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="MarketMind: anomalies -> news -> cited cause")
    p.add_argument("--prices", required=True)
    p.add_argument("--name", default="Nifty Bank")
    p.add_argument("--queries", default="Bank Nifty,Nifty Bank,Sensex Nifty today",
                   help="comma-separated Google News queries")
    p.add_argument("--window", type=int, default=20, help="rolling window for z-scores")
    p.add_argument("--z", type=float, default=2.0)
    p.add_argument("--lookback", type=int, default=2, help="days before the anomaly date to search")
    p.add_argument("--top-k", type=int, default=8)
    p.add_argument("--max-anomalies", type=int, default=0, help="0 = all")
    p.add_argument("--model", default=os.environ.get("MARKETMIND_MODEL", "claude-sonnet-5"))
    p.add_argument("--out-dir", default="marketmind_out")
    p.add_argument("--fulltext", action="store_true")
    p.add_argument("--mock", action="store_true", help="offline dry run with fake news + fake LLM")
    return p.parse_args(argv)


if __name__ == "__main__":
    run(parse_args())

# NOTE FOR ALOK (schema owner): "market_flows" and "unclear" are used above but are not values
# of the causal_category enum in V1__init_schema.sql. FII selling / profit-booking days don't
# fit the original six categories, so either add both values to the enum or map them at write time.

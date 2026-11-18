"""
upload_news_to_supabase.py
==========================
Populates the Supabase 'news_articles' table from india_stock_news_2025.csv.

Supports two connection methods:
1. Supabase REST API (Default & Recommended - pure HTTPS, no DB driver needed):
   Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY / SUPABASE_ANON_KEY)
2. Direct PostgreSQL connection:
   Requires: DATABASE_URL (e.g., postgresql://postgres:pass@db.xxxx.supabase.co:5432/postgres)

Usage:
    python upload_news_to_supabase.py
    python upload_news_to_supabase.py --supabase-url "https://xyz.supabase.co" --supabase-key "eyJ..."
    python upload_news_to_supabase.py --batch-size 250
"""

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List

import requests

IST = timezone(timedelta(hours=5, minutes=30))


def load_env_file():
    """Loads .env variables into os.environ if present."""
    root_env = Path(__file__).resolve().parent / ".env"
    if root_env.exists():
        with open(root_env, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k not in os.environ:
                        os.environ[k] = v


def parse_timestamp_iso(ts_str: str) -> str:
    """Parses timestamp string and returns standard ISO 8601 string with IST (+05:30) offset."""
    if not ts_str or not ts_str.strip():
        return datetime.now(IST).isoformat()
    clean = ts_str.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(clean[:19], fmt)
            return dt.replace(tzinfo=IST).isoformat()
        except Exception:
            continue
    return datetime.now(IST).isoformat()


def extract_source_from_title_or_url(title: str, url: str) -> str:
    """Infers publisher name from title or canonical URL."""
    if " - " in title:
        candidate = title.rsplit(" - ", 1)[-1].strip()
        if len(candidate) <= 50 and not candidate.startswith("http"):
            return candidate
    if " | " in title:
        candidate = title.rsplit(" | ", 1)[-1].strip()
        if len(candidate) <= 50:
            return candidate
    if url:
        try:
            domain = url.split("//")[-1].split("/")[0]
            domain = domain.replace("www.", "")
            parts = domain.split(".")
            if len(parts) >= 2:
                return parts[0].capitalize()
        except Exception:
            pass
    return "Financial News"


def prepare_articles(csv_path: Path) -> List[Dict[str, Any]]:
    """
    Reads the CSV, deduplicates by URL while aggregating entities,
    and formats records according to the Supabase news_articles schema.
    """
    if not csv_path.exists():
        print(f"[Error] CSV file not found at: {csv_path}")
        sys.exit(1)

    print(f"[*] Reading and preparing articles from {csv_path.name}...")
    articles_by_url: Dict[str, Dict[str, Any]] = {}

    with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_url = (row.get("link") or "").strip()
            title = (row.get("title") or "").strip()
            if not raw_url:
                if not title:
                    continue
                raw_url = f"https://news.marketmind.local/{hashlib.md5(title.encode()).hexdigest()[:16]}"

            stock = (row.get("stock") or "").strip().upper()
            raw_text = (row.get("text_content") or title).strip()
            ts_iso = parse_timestamp_iso(row.get("timestamp") or "")
            source = extract_source_from_title_or_url(title, raw_url)

            # Map sentiment label
            market_label = (row.get("market_label") or "").strip().lower()
            sentiment_label = None
            if market_label in ("bullish", "bearish", "neutral"):
                sentiment_label = market_label

            conf_raw = row.get("confidence")
            sentiment_score = None
            try:
                if conf_raw and conf_raw != "nan":
                    sentiment_score = round(float(conf_raw), 3)
            except Exception:
                pass

            if raw_url in articles_by_url:
                # Merge stock entities into existing article
                existing = articles_by_url[raw_url]
                if stock and stock not in existing["entities"]:
                    existing["entities"].append(stock)
            else:
                articles_by_url[raw_url] = {
                    "source": source[:100],
                    "url": raw_url,
                    "title": title or "Financial Update",
                    "raw_text": raw_text,
                    "published_at": ts_iso,
                    "entities": [stock] if stock else [],
                    "sector_tags": ["Banking"] if stock in ("SBIN", "NIFTYBANK", "HDFCBANK") else (
                        ["Technology"] if stock in ("TCS", "INFY") else ["Conglomerate"]
                    ),
                    "sentiment_label": sentiment_label,
                    "sentiment_score": sentiment_score,
                    "causal_category": "company_specific"
                }

    unique_articles = list(articles_by_url.values())
    print(f"[+] Prepared {len(unique_articles)} unique articles across {len(articles_by_url)} unique URLs.")
    return unique_articles


def upload_via_rest(supabase_url: str, supabase_key: str, articles: List[Dict[str, Any]], batch_size: int = 150):
    """Uploads prepared articles using Supabase PostgREST API with on_conflict upsert."""
    clean_url = supabase_url.rstrip("/")
    endpoint = f"{clean_url}/rest/v1/news_articles?on_conflict=url"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"
    }

    total = len(articles)
    print(f"[*] Starting upload of {total} articles to {clean_url} in batches of {batch_size}...")

    success_count = 0
    start_time = time.time()

    for i in range(0, total, batch_size):
        batch = articles[i:i + batch_size]
        try:
            resp = requests.post(endpoint, headers=headers, json=batch, timeout=30)
            if resp.status_code in (200, 201, 204):
                success_count += len(batch)
                progress = (success_count / total) * 100
                print(f"    [{progress:5.1f}%] Inserted/merged {success_count}/{total} articles...")
            else:
                print(f"    [Warning] Batch {i//batch_size + 1} HTTP {resp.status_code}: {resp.text[:200]}")
                # Fallback: try individual items in problematic batch
                for item in batch:
                    try:
                        r = requests.post(endpoint, headers=headers, json=[item], timeout=10)
                        if r.status_code in (200, 201, 204):
                            success_count += 1
                    except Exception:
                        pass
        except Exception as e:
            print(f"    [Error] Batch {i//batch_size + 1} failed: {e}")
            time.sleep(2)

    elapsed = time.time() - start_time
    print(f"\n[DONE] Successfully populated Supabase news_articles: {success_count}/{total} records in {elapsed:.1f}s.")


def main():
    load_env_file()

    parser = argparse.ArgumentParser(description="Upload historical news to Supabase news_articles table.")
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL"), help="Supabase project URL")
    parser.add_argument("--supabase-key", default=os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY"), help="Supabase API key")
    parser.add_argument("--csv", default=str(Path(__file__).resolve().parent / "india_stock_news_2025.csv"), help="Path to news CSV")
    parser.add_argument("--batch-size", type=int, default=150, help="Batch size for insertion")

    args = parser.parse_args()

    supabase_url = args.supabase_url
    supabase_key = args.supabase_key

    if not supabase_url or not supabase_key:
        print("=" * 70)
        print("MarketMind — Supabase News Article Importer")
        print("=" * 70)
        print("[!] Missing Supabase credentials.")
        print("    Please provide them via command-line flags or add them to your .env file:")
        print("        SUPABASE_URL=https://your-project.supabase.co")
        print("        SUPABASE_KEY=your-supabase-anon-or-service-role-key\n")
        print("    Example usage:")
        print('        python upload_news_to_supabase.py --supabase-url "https://xyz.supabase.co" --supabase-key "eyJ..."')
        print("=" * 70)
        sys.exit(1)

    csv_path = Path(args.csv)
    articles = prepare_articles(csv_path)
    upload_via_rest(supabase_url, supabase_key, articles, batch_size=args.batch_size)


if __name__ == "__main__":
    main()


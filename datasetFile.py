"""
Indian Stock Market News Scraper (Jan 1, 2025 - Dec 31, 2025)
---------------------------------------------------------------
Uses Google News RSS (free, no API key required) to pull historical headlines
for a list of Indian stocks/tickers you supply, and writes them to a local CSV.

WHY GOOGLE NEWS RSS:
Most Indian financial sites (Moneycontrol, Economic Times, LiveMint) do not
expose a public date-range archive API, and paid history APIs (Bloomberg,
Refinitiv, Zylalabs, etc.) are not free. Google News RSS supports date-bounded
search via `after:` / `before:` operators and works without an API key, which
makes it the most practical free source for a full-year historical pull.

HOW IT WORKS:
1. You provide a TICKER -> company/search-name mapping (edit the TICKERS dict).
2. For each ticker, the script queries Google News RSS in date windows
   (weekly by default) across the full year, so it doesn't fire 365
   separate requests per ticker.
3. Each RSS entry gives a title, link, and publish timestamp.
4. Optionally (FETCH_FULL_TEXT = True), the script visits each article link
   and pulls the visible paragraph text as `text_content`. This is a
   best-effort generic scrape (grabs all <p> tags) since every publisher's
   HTML is different -- some sites will block this or return partial text.
5. `market_label` and `confidence` are left as null (None), to be filled in
   later by your labeling/model pipeline.

IMPORTANT NOTES / LIMITATIONS:
- Google can rate-limit or temporarily block an IP that fires too many
  requests too quickly. REQUEST_DELAY adds a polite random pause between
  calls -- don't remove it, and expect a full year x many tickers run to
  take a while (this is scraping, not a bulk API).
- Full-article scraping (`fetch_full_text`) may fail or return empty text
  for paywalled or JS-heavy pages (e.g. some ET/LiveMint articles). Those
  rows will just have an empty text_content -- filter/handle downstream.
- Respect each publisher's robots.txt / terms of use, especially if you
  plan to scrape at higher volume or redistribute the scraped text.
- Google News RSS matches on the search string, not on tightly resolved
  "which stock does this really affect" -- your `stock` column reflects
  which ticker's query produced the result, not NLP-verified relevance.
  Do a review pass on ambiguous cases (e.g. common words like "SBI").

REQUIREMENTS:
    pip install feedparser requests beautifulsoup4
"""

import csv
import hashlib
import random
import re
import time
from datetime import datetime, timedelta
from urllib.parse import quote

import feedparser
import requests
import trafilatura
from bs4 import BeautifulSoup

# ---------------- CONFIG ----------------

START_DATE = datetime(2025, 1, 1)
END_DATE = datetime(2025, 12, 31)
WINDOW_DAYS = 7           # size of each date window per RSS query (7 = weekly)
REQUEST_DELAY = (2, 4)    # random delay range (seconds) between requests
FETCH_FULL_TEXT = True     # False = skip visiting each article (much faster, less data)
FULL_TEXT_MAX_CHARS = 5000
OUTPUT_FILE = "india_stock_news_2025.csv"

# Ticker -> search term (usually the company name). EDIT THIS with your own list.
TICKERS = {
    # "INFY": "Infosys",
    # "ONGC": "Oil and Natural Gas Corporation",
    "SBIN": "State Bank of India",
    "TCS": "Tata Consultancy Services",
    # add more "TICKER": "Company Name" pairs here
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}

# Patterns that indicate low-quality / junk scraped content
MIN_TEXT_LENGTH = 80
BAD_PATTERNS = [
    re.compile(r"<[a-z][\s\S]*?>", re.IGNORECASE),        # any HTML tag
    re.compile(r"subscribe|sign\s*in|log\s*in|paywall",    # paywalls
               re.IGNORECASE),
    re.compile(r"cookie|privacy policy|gdpr|we use cookies", # cookie banners
               re.IGNORECASE),
    re.compile(r"javascript\s+is\s+(disabled|required)",   # JS-blocked pages
               re.IGNORECASE),
    re.compile(r"access\s+denied|403\s+forbidden",
               re.IGNORECASE),
]

# ---------------- HELPERS ----------------

def date_windows(start, end, step_days):
    """Yield (window_start, window_end) pairs covering [start, end]."""
    cur = start
    while cur <= end:
        window_end = min(cur + timedelta(days=step_days - 1), end)
        yield cur, window_end
        cur = window_end + timedelta(days=1)


def build_rss_url(search_term, win_start, win_end):
    """Google News RSS search URL bounded to a date window (before: is exclusive)."""
    before = win_end + timedelta(days=1)
    query = (
        f'"{search_term}" after:{win_start.strftime("%Y-%m-%d")} '
        f'before:{before.strftime("%Y-%m-%d")}'
    )
    return f"https://news.google.com/rss/search?q={quote(query)}&hl=en-IN&gl=IN&ceid=IN:en"


def make_news_id(link, title):
    return hashlib.md5((link + title).encode("utf-8")).hexdigest()[:16]


def parse_pubdate(entry):
    if getattr(entry, "published_parsed", None):
        return datetime(*entry.published_parsed[:6]).strftime("%Y-%m-%d %H:%M:%S")
    return entry.get("published", "")


def fetch_full_text(url, timeout=20):
    """
    Follow the Google News redirect and extract clean article body text
    using trafilatura, which handles anti-scraping headers and content
    extraction far better than raw BeautifulSoup on <p> tags.
    """
    try:
        # trafilatura.fetch_url follows redirects (incl. Google News URLs)
        # and sets appropriate headers automatically
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            return ""
        text = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            no_fallback=False,   # fall back to readability/justext if needed
        )
        return (text or "")[:FULL_TEXT_MAX_CHARS]
    except Exception:
        return ""


def is_bad_text(text: str) -> bool:
    """Return True if text is empty, too short, HTML, or known junk."""
    t = (text or "").strip()
    if not t or len(t) < MIN_TEXT_LENGTH:
        return True
    for pat in BAD_PATTERNS:
        if pat.search(t):
            return True
    return False


# ---------------- MAIN ----------------

FIELDNAMES = ["news_id", "timestamp", "title", "text_content", "link",
              "stock", "market_label", "confidence"]


def load_seen_ids(filename):
    """Read already-scraped news_ids from an existing output CSV (for resume support)."""
    seen = set()
    try:
        with open(filename, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("news_id"):
                    seen.add(row["news_id"])
        print(f"[Resume] Found {len(seen)} existing rows in '{filename}' — skipping duplicates.")
    except FileNotFoundError:
        pass  # first run, nothing to resume
    return seen


def open_output_file(filename):
    """Open the CSV for appending; write header only if the file is new/empty."""
    import os
    file_exists = os.path.isfile(filename) and os.path.getsize(filename) > 0
    f = open(filename, "a", newline="", encoding="utf-8")
    writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
    if not file_exists:
        writer.writeheader()
    return f, writer


def scrape():
    seen_ids = load_seen_ids(OUTPUT_FILE)
    seen_links = set()
    total_written = 0

    csv_file, writer = open_output_file(OUTPUT_FILE)

    try:
        for ticker, search_term in TICKERS.items():
            print(f"\n=== Scraping news for {ticker} ({search_term}) ===")
            for win_start, win_end in date_windows(START_DATE, END_DATE, WINDOW_DAYS):
                url = build_rss_url(search_term, win_start, win_end)
                try:
                    feed = feedparser.parse(url)
                except Exception as e:
                    print(f"  window {win_start.date()}-{win_end.date()} failed: {e}")
                    continue

                new_in_window = 0
                window_rows = []
                for entry in feed.entries:
                    link = entry.get("link", "")
                    title = entry.get("title", "")
                    if not link or link in seen_links:
                        continue
                    seen_links.add(link)

                    news_id = make_news_id(link, title)
                    if news_id in seen_ids:
                        continue  # already saved in a previous run

                    timestamp = parse_pubdate(entry)
                    if FETCH_FULL_TEXT:
                        text_content = fetch_full_text(link)
                        # Reject junk; leave empty so backfill can retry
                        if is_bad_text(text_content):
                            text_content = ""
                        time.sleep(random.uniform(*REQUEST_DELAY))
                    else:
                        text_content = entry.get("summary", "")

                    row = {
                        "news_id": news_id,
                        "timestamp": timestamp,
                        "title": title,
                        "text_content": text_content,
                        "link": link,
                        "stock": ticker,
                        "market_label": None,
                        "confidence": None,
                    }
                    window_rows.append(row)
                    seen_ids.add(news_id)
                    new_in_window += 1

                # ── Flush this window's rows to disk immediately ──
                if window_rows:
                    writer.writerows(window_rows)
                    csv_file.flush()
                    total_written += len(window_rows)

                print(f"  {win_start.date()} to {win_end.date()}: +{new_in_window} "
                      f"articles (total saved: {total_written})")
                time.sleep(random.uniform(*REQUEST_DELAY))

    except KeyboardInterrupt:
        print(f"\n[Interrupted] Progress saved — {total_written} rows written to '{OUTPUT_FILE}'.")
    finally:
        csv_file.close()

    print(f"\nDone. Total rows saved to '{OUTPUT_FILE}': {total_written}")
    return total_written


if __name__ == "__main__":
    scrape()

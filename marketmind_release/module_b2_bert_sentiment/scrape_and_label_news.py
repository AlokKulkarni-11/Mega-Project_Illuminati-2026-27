"""
scrape_and_label_news.py

Scrapes a year of news headlines for a list of stocks using Google News
RSS (date-filtered), then AUTO-LABELS each headline as bullish/bearish/
neutral based on what the stock's price actually did in the days
following that headline's publish date. No manual labeling needed for
this pass — output is a ready-to-use CSV for BERT fine-tuning.

HOW THE AUTO-LABELING WORKS (read this before trusting the output):
  For each headline published on date D, we look at the stock's return
  from D to D+FORWARD_DAYS (default 3 trading days). If that forward
  return is above BULLISH_THRESHOLD, we label the headline "bullish".
  Below -BEARISH_THRESHOLD, "bearish". Otherwise "neutral".

  IMPORTANT LIMITATION: this labels "what the stock did around this
  date", not "what this specific headline caused". Multiple headlines
  on the same day get the same label even if only one of them was
  actually relevant. Some labels will be noisy/wrong. This is a
  standard trade-off for bootstrap labeling at scale — treat this CSV
  as a large, cheap, somewhat-noisy training set, not ground truth.
  Your smaller hand-reviewed dataset (labeled_news_example.csv) is
  still valuable for spot-checking quality.

REQUIREMENTS: pip install feedparser pandas requests trafilatura

INPUT: a prices CSV with columns: symbol,date,close
  (e.g., exported from your NSE bhavcopy downloads — one row per
  stock per trading day)

OUTPUT: labeled_news_bulk.csv with columns:
  symbol, headline, published_at, source, forward_return, label
"""

import time
import random
from datetime import datetime, timedelta

import feedparser
import pandas as pd
import requests

# ----------------------------------------------------------------------------
# CONFIG
# ----------------------------------------------------------------------------

STOCKS = [
    # (symbol, search_name) — search_name is what actually gets typed into
    # Google News; using the company name usually works better than the
    # ticker symbol alone (e.g., "Tata Consultancy Services" beats "TCS").
    ("TCS", "Tata Consultancy Services"),
    ("INFY", "Infosys"),
    ("RELIANCE", "Reliance Industries"),
    ("HDFCBANK", "HDFC Bank"),
    # ... add the rest of your 20-25 stocks here
]

DAYS_BACK = 365          # how far back to search
CHUNK_DAYS = 7           # query in weekly chunks (Google News RSS caps
                          # results per query at ~100 — weekly chunks keep
                          # each query well under that for most stocks)
FORWARD_DAYS = 3         # look this many trading days ahead to label
BULLISH_THRESHOLD = 0.02   # +2% forward return = bullish
BEARISH_THRESHOLD = -0.02  # -2% forward return = bearish

REQUEST_DELAY_RANGE = (2, 4)  # seconds between requests — be polite,
                                # don't hammer Google's servers


# ----------------------------------------------------------------------------
# STEP 1 — Scrape headlines via date-chunked Google News RSS
# ----------------------------------------------------------------------------

def fetch_headlines_for_window(search_name, after_date, before_date):
    """
    Queries Google News RSS for one stock, one date window.
    Returns a list of dicts: {headline, link, published_at, source}
    """
    query = f"{search_name} stock".replace(" ", "+")
    url = (
        f"https://news.google.com/rss/search?q={query}"
        f"+after:{after_date}+before:{before_date}"
        f"&ceid=IN:en&hl=en-IN&gl=IN"
    )

    try:
        feed = feedparser.parse(url)
    except Exception as e:
        print(f"  [warn] failed to fetch {after_date} to {before_date}: {e}")
        return []

    results = []
    for entry in feed.entries:
        results.append({
            "headline": entry.title,
            "link": entry.link,
            "published_at": entry.get("published", ""),
            "source": entry.get("source", {}).get("title", "unknown"),
        })
    return results


def scrape_year_of_headlines(stocks, days_back=DAYS_BACK, chunk_days=CHUNK_DAYS):
    """
    Iterates each stock over the full lookback period in weekly chunks,
    collecting headlines. This chunking is what avoids the ~100-result
    cap per query — instead of one query for 365 days (which would
    silently drop most results), we make ~52 smaller queries per stock.
    """
    all_rows = []
    end_date = datetime.today()
    start_date = end_date - timedelta(days=days_back)

    for symbol, search_name in stocks:
        print(f"Scraping: {symbol} ({search_name})")
        current = start_date

        while current < end_date:
            chunk_end = min(current + timedelta(days=chunk_days), end_date)
            after_str = current.strftime("%Y-%m-%d")
            before_str = chunk_end.strftime("%Y-%m-%d")

            headlines = fetch_headlines_for_window(search_name, after_str, before_str)
            for h in headlines:
                h["symbol"] = symbol
            all_rows.extend(headlines)

            print(f"  {after_str} to {before_str}: {len(headlines)} headlines")

            time.sleep(random.uniform(*REQUEST_DELAY_RANGE))
            current = chunk_end

    df = pd.DataFrame(all_rows)
    df = df.drop_duplicates(subset=["link"])  # same article can appear in overlapping chunks
    return df


# ----------------------------------------------------------------------------
# STEP 2 — Auto-label using forward price return
# ----------------------------------------------------------------------------

def load_price_data(prices_csv_path):
    """
    Expected CSV columns: symbol, date, close
    One row per stock per trading day. This is what you'd export from
    your NSE bhavcopy downloads for your 20-25 tracked stocks.
    """
    df = pd.read_csv(prices_csv_path, parse_dates=["date"])
    df = df.sort_values(["symbol", "date"]).reset_index(drop=True)
    return df


def get_forward_return(prices_df, symbol, headline_date, forward_days=FORWARD_DAYS):
    """
    Finds the closing price on (or just after) headline_date, and the
    closing price `forward_days` TRADING days later, and computes the
    percentage return between them. Returns None if we don't have
    enough price data around that date (e.g., headline is too recent).
    """
    stock_prices = prices_df[prices_df["symbol"] == symbol].reset_index(drop=True)
    if stock_prices.empty:
        return None

    # Find the first trading day on or after the headline's date
    future_prices = stock_prices[stock_prices["date"] >= headline_date]
    if future_prices.empty:
        return None

    start_idx = future_prices.index[0]
    end_idx = start_idx + forward_days

    if end_idx >= len(stock_prices):
        return None  # not enough future data (headline too recent)

    start_price = stock_prices.loc[start_idx, "close"]
    end_price = stock_prices.loc[end_idx, "close"]

    if start_price == 0:
        return None

    return (end_price - start_price) / start_price


def label_headlines(headlines_df, prices_df):
    labels = []
    forward_returns = []

    for _, row in headlines_df.iterrows():
        try:
            # Google News RSS published_at format: "Wed, 15 Mar 2023 10:30:00 GMT"
            headline_date = pd.to_datetime(row["published_at"]).tz_localize(None).normalize()
        except Exception:
            labels.append(None)
            forward_returns.append(None)
            continue

        fwd_return = get_forward_return(prices_df, row["symbol"], headline_date)

        if fwd_return is None:
            label = None
        elif fwd_return >= BULLISH_THRESHOLD:
            label = "bullish"
        elif fwd_return <= BEARISH_THRESHOLD:
            label = "bearish"
        else:
            label = "neutral"

        labels.append(label)
        forward_returns.append(fwd_return)

    headlines_df = headlines_df.copy()
    headlines_df["forward_return"] = forward_returns
    headlines_df["label"] = labels
    return headlines_df


# ----------------------------------------------------------------------------
# MAIN
# ----------------------------------------------------------------------------

if __name__ == "__main__":
    print("Step 1: Scraping a year of headlines (this will take a while — "
          f"~{len(STOCKS) * (DAYS_BACK // CHUNK_DAYS)} requests, "
          f"paced {REQUEST_DELAY_RANGE[0]}-{REQUEST_DELAY_RANGE[1]}s apart)...")
    headlines_df = scrape_year_of_headlines(STOCKS)
    print(f"Collected {len(headlines_df)} unique headlines.")

    print("\nStep 2: Loading price data...")
    prices_df = load_price_data("prices.csv")  # symbol,date,close

    print("Step 3: Auto-labeling headlines by forward price return...")
    labeled_df = label_headlines(headlines_df, prices_df)

    # Drop rows we couldn't label (usually: headline too recent, or
    # missing price data for that stock/date)
    before_drop = len(labeled_df)
    labeled_df = labeled_df.dropna(subset=["label"])
    print(f"  Dropped {before_drop - len(labeled_df)} unlabelable rows "
          f"(insufficient price data around that date).")

    output_columns = ["symbol", "headline", "published_at", "source", "forward_return", "label"]
    labeled_df[output_columns].to_csv("labeled_news_bulk.csv", index=False)

    print(f"\nDone. Wrote {len(labeled_df)} labeled headlines to labeled_news_bulk.csv")
    print("\nLabel distribution:")
    print(labeled_df["label"].value_counts())

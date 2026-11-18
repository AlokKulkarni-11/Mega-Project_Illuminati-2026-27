"""
Historical News Retrieval Service
---------------------------------
Retrieves, verifies, deduplicates, and ranks historical stock news articles.
- Dual-tier Architecture:
  1. Local Tier: Searches PostgreSQL or local indexed CSV/JSON datasets (instant).
  2. Live Web Tier: If local news coverage is missing or sparse (< 3 articles),
     automatically executes an on-demand historical query against Google News RSS,
     decodes publisher links, extracts article text, and persists new articles to disk.
- Strictly verifies publication dates (start_date <= pub_date <= end_date).
- Removes duplicate and syndicated articles across publishers.
- Ranks articles by topic relevance and recency within the window.
- Flags coverage limitations without fabricating articles.
"""

import csv
import hashlib
import json
import os
import re
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import feedparser
import requests
import trafilatura
from googlenewsdecoder import gnewsdecoder

from ml_service.services.stock_resolver import DEFAULT_STOCK_CATALOG

# Indian Standard Time (UTC+05:30)
IST = timezone(timedelta(hours=5, minutes=30))


def parse_and_convert_to_ist(date_str: str) -> Tuple[Optional[datetime], bool]:
    """
    Parses date_str and converts it to Indian Standard Time (IST, UTC+05:30) if timezone is provided.
    Returns: (datetime_in_ist_or_naive, has_time_of_day)
    """
    if not date_str:
        return None, False

    import email.utils

    clean = date_str.strip()
    has_time = False

    # Check if string has explicit time of day (e.g. HH:MM)
    if re.search(r"\b\d{1,2}:\d{2}", clean):
        has_time = True

    # 1. Try email.utils (RFC 2822 / RSS format with GMT/UTC)
    try:
        dt = email.utils.parsedate_to_datetime(clean)
        if dt is not None:
            if dt.tzinfo is not None:
                dt_ist = dt.astimezone(IST).replace(tzinfo=None)
                return dt_ist, True
            return dt.replace(tzinfo=None), has_time
    except Exception:
        pass


    # 2. Try ISO formats
    try:
        clean_iso = clean.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_iso)
        if dt.tzinfo is not None:
            dt_ist = dt.astimezone(IST).replace(tzinfo=None)
            return dt_ist, has_time
        return dt.replace(tzinfo=None), has_time
    except Exception:
        pass

    # 3. Try standard naive date-time formats
    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y/%m/%d %H:%M:%S",
        "%d-%m-%Y %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
    ):
        try:
            dt = datetime.strptime(clean[:19], fmt)
            return dt, True
        except Exception:
            continue

    # 4. Date-only formats (no time of day)
    for fmt in (
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%d %b %Y",
        "%d %B %Y",
    ):
        try:
            dt = datetime.strptime(clean[:12].strip(), fmt)
            return dt, False
        except Exception:
            continue

    return None, False


def classify_nse_market_timing(pub_dt: Optional[datetime], has_time: bool, target_date_str: str) -> str:
    """
    Classifies article publication timing relative to NSE market hours:
    - NSE Trading Hours: 09:15 to 15:30 IST on Monday-Friday.
    Returns:
      'before_market_open' | 'during_market_hours' | 'after_market_close' |
      'prior_to_target_date' | 'non_trading_day' | 'unknown_timing'
    """
    if not pub_dt:
        return "unknown_timing"

    try:
        target_dt = datetime.strptime(target_date_str[:10], "%Y-%m-%d")
    except Exception:
        target_dt = pub_dt

    pub_date_only = pub_dt.date()
    target_date_only = target_dt.date()

    if pub_date_only < target_date_only:
        return "prior_to_target_date"

    if pub_date_only == target_date_only:
        # Weekend check
        if pub_dt.weekday() in (5, 6):
            return "non_trading_day"

        if not has_time:
            return "unknown_timing"

        pub_time = pub_dt.time()
        market_open = datetime.strptime("09:15", "%H:%M").time()
        market_close = datetime.strptime("15:30", "%H:%M").time()

        if pub_time < market_open:
            return "before_market_open"
        elif pub_time <= market_close:
            return "during_market_hours"
        else:
            return "after_market_close"

    return "unknown_timing"



def normalize_url(url: str) -> str:
    """Normalizes URL by removing common tracking parameters and lowercasing host."""
    if not url:
        return ""
    try:
        parsed = urllib.parse.urlparse(url.strip())
        tracking_keys = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "fbclid", "gclid", "source"}
        q_params = urllib.parse.parse_qsl(parsed.query, keep_blank_values=False)
        clean_params = [(k, v) for k, v in q_params if k.lower() not in tracking_keys and not k.lower().startswith("utm_")]
        clean_query = urllib.parse.urlencode(clean_params)
        clean_path = parsed.path.rstrip("/")
        normalized = urllib.parse.urlunparse((
            parsed.scheme.lower() or "https",
            parsed.netloc.lower(),
            clean_path,
            parsed.params,
            clean_query,
            ""
        ))
        return normalized
    except Exception:
        return url.strip().lower()


class BaseNewsProvider:
    """Abstract interface for financial news providers."""
    name: str = "base"

    def is_available(self) -> bool:
        return True

    def fetch_news(
        self,
        ticker: str,
        company_name: str,
        aliases: List[str],
        start_date: str,
        end_date: str,
        keywords: Optional[List[str]] = None,
        max_articles: int = 15
    ) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def fetch(
        self,
        ticker: str,
        start_date: Any,
        end_date: Any,
        company_name: str = "",
        aliases: Optional[List[str]] = None,
        keywords: Optional[List[str]] = None,
        max_articles: int = 15
    ) -> List[Dict[str, Any]]:
        s_str = start_date.strftime("%Y-%m-%d") if hasattr(start_date, "strftime") else str(start_date)
        e_str = end_date.strftime("%Y-%m-%d") if hasattr(end_date, "strftime") else str(end_date)
        return self.fetch_news(
            ticker=ticker,
            company_name=company_name or ticker,
            aliases=aliases or [],
            start_date=s_str,
            end_date=e_str,
            keywords=keywords,
            max_articles=max_articles
        )


class GoogleNewsRSSProvider(BaseNewsProvider):
    """Google News RSS provider with redirect decoding and content extraction."""
    name: str = "google_news_rss"

    def fetch_news(
        self,
        ticker: str,
        company_name: str,
        aliases: List[str],
        start_date: str,
        end_date: str,
        keywords: Optional[List[str]] = None,
        max_articles: int = 15
    ) -> List[Dict[str, Any]]:
        start_dt, _ = parse_and_convert_to_ist(start_date)
        end_dt, _ = parse_and_convert_to_ist(end_date)
        if not start_dt or not end_dt:
            return []

        stock_filter = "(stock OR shares OR market OR results OR earnings OR quarterly)"
        if keywords:
            fin_kws = [k for k in keywords if k.lower() not in [ticker.lower(), "stock", "shares"] and len(k) > 2]
            if fin_kws:
                stock_filter = f"({fin_kws[0]} OR stock OR shares)"

        before_dt = end_dt + timedelta(days=1)
        search_terms = f'"{ticker}"'
        if company_name and company_name.lower() != ticker.lower():
            search_terms = f'("{ticker}" OR "{company_name}")'

        query_str = f"{search_terms} {stock_filter} after:{start_dt.strftime('%Y-%m-%d')} before:{before_dt.strftime('%Y-%m-%d')}"
        rss_url = f"https://news.google.com/rss/search?q={urllib.parse.quote(query_str)}&hl=en-IN&gl=IN&ceid=IN:en"

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
        session = requests.Session()
        session.headers.update(headers)

        feed = None
        for attempt in range(2):
            try:
                resp = session.get(rss_url, timeout=10)
                if resp.status_code == 200:
                    feed = feedparser.parse(resp.content)
                    break
                elif resp.status_code != 200 and attempt == 1:
                    raise Exception(f"Google News RSS returned HTTP status {resp.status_code}")
            except Exception:
                if attempt == 1:
                    raise

        if not feed or not getattr(feed, "entries", None):
            # Fallback for recent queries (within 7 days of current time) where strict date filter might yield 0 in RSS
            if (datetime.now() - end_dt).days <= 7:
                try:
                    fallback_query = f'{search_terms} (stock OR shares OR NSE) when:7d'
                    fb_url = f"https://news.google.com/rss/search?q={urllib.parse.quote(fallback_query)}&hl=en-IN&gl=IN&ceid=IN:en"
                    resp = session.get(fb_url, timeout=10)
                    if resp.status_code == 200:
                        feed = feedparser.parse(resp.content)
                except Exception:
                    pass

        if not feed or not getattr(feed, "entries", None):
            return []

        fetched_articles = []
        for entry in feed.entries[:max_articles]:
            title = getattr(entry, "title", "").strip()
            link = getattr(entry, "link", "").strip()
            raw_pub = getattr(entry, "published", "")
            source_title = "Financial News"
            if hasattr(entry, "source") and isinstance(entry.source, dict):
                source_title = entry.source.get("title", source_title)
            elif " - " in title:
                parts = title.rsplit(" - ", 1)
                title, source_title = parts[0].strip(), parts[1].strip()

            if not title or not link:
                continue

            pub_dt, has_time = parse_and_convert_to_ist(raw_pub)
            pub_dt = pub_dt or start_dt

            # Strict date filtering: start_dt <= pub_dt <= end_dt
            if pub_dt < start_dt or pub_dt > end_dt.replace(hour=23, minute=59, second=59):
                continue

            pub_iso = pub_dt.strftime("%Y-%m-%d %H:%M:%S")
            news_id = hashlib.md5(f"{link}{title}".encode()).hexdigest()[:16]

            real_url = link
            text_content = ""
            try:
                dec = gnewsdecoder(link)
                if isinstance(dec, dict):
                    real_url = dec.get("decoded_url") or link
                elif dec:
                    real_url = str(dec)

                if real_url and "news.google.com" not in real_url:
                    sub_resp = session.get(real_url, timeout=6)
                    if sub_resp.status_code == 200:
                        text_content = (trafilatura.extract(sub_resp.text) or "").strip()[:8000]
            except Exception:
                pass

            if not text_content:
                raw_summary = getattr(entry, "summary", "") or getattr(entry, "description", "")
                if raw_summary:
                    clean_summary = re.sub(r"<[^>]+>", " ", raw_summary)
                    text_content = " ".join(clean_summary.split())

            fetched_articles.append({
                "news_id": news_id,
                "symbol": ticker.upper(),
                "title": title,
                "text_content": text_content,
                "link": real_url,
                "source": source_title,
                "published_at": pub_iso,
                "market_label": None,
                "provider": self.name
            })

        return fetched_articles


class GDELTNewsProvider(BaseNewsProvider):
    """GDELT 2.0 Document API provider for open global financial news coverage."""
    name: str = "gdelt"

    def fetch_news(
        self,
        ticker: str,
        company_name: str,
        aliases: List[str],
        start_date: str,
        end_date: str,
        keywords: Optional[List[str]] = None,
        max_articles: int = 15
    ) -> List[Dict[str, Any]]:
        start_dt, _ = parse_and_convert_to_ist(start_date)
        end_dt, _ = parse_and_convert_to_ist(end_date)
        if not start_dt or not end_dt:
            return []

        search_term = f'"{company_name or ticker}"'
        gdelt_query = f'{search_term} (stock OR shares OR market OR results OR profit OR quarterly OR NSE) sourcelang:eng'

        s_str = start_dt.strftime("%Y%m%d%H%M%S")
        e_str = end_dt.replace(hour=23, minute=59, second=59).strftime("%Y%m%d%H%M%S")

        params = {
            "query": gdelt_query,
            "mode": "ArtList",
            "maxrecords": min(max_articles, 20),
            "format": "json",
            "startdatetime": s_str,
            "enddatetime": e_str
        }

        url = "https://api.gdeltproject.org/api/v2/doc/doc"
        headers = {"User-Agent": "MarketMind-Financial-Intelligence/1.0"}
        session = requests.Session()
        session.headers.update(headers)

        resp = session.get(url, params=params, timeout=8)
        if resp.status_code != 200:
            raise Exception(f"GDELT API returned HTTP status {resp.status_code}")
        data = resp.json()
        raw_articles = data.get("articles", [])

        results = []
        for item in raw_articles[:max_articles]:
            title = item.get("title", "").strip()
            link = item.get("url", "").strip()
            seendate = item.get("seendate", "")
            source = item.get("domain", "GDELT Financial News")

            if not title or not link:
                continue

            pub_dt = None
            if seendate:
                try:
                    pub_dt = datetime.strptime(seendate[:15], "%Y%m%dT%H%M%S")
                except Exception:
                    pub_dt = start_dt
            else:
                pub_dt = start_dt

            if pub_dt < start_dt or pub_dt > end_dt.replace(hour=23, minute=59, second=59):
                continue

            news_id = hashlib.md5(f"{link}{title}".encode()).hexdigest()[:16]
            results.append({
                "news_id": news_id,
                "symbol": ticker.upper(),
                "title": title,
                "text_content": title,
                "link": link,
                "source": source,
                "published_at": pub_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "market_label": None,
                "provider": self.name
            })

        return results


class NewsAPIProvider(BaseNewsProvider):
    """NewsAPI provider for configurable premium financial news feeds."""
    name: str = "newsapi"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("NEWS_API_KEY") or os.getenv("NEWSAPI_KEY")

    def is_available(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    def fetch_news(
        self,
        ticker: str,
        company_name: str,
        aliases: List[str],
        start_date: str,
        end_date: str,
        keywords: Optional[List[str]] = None,
        max_articles: int = 15
    ) -> List[Dict[str, Any]]:
        if not self.is_available():
            return []

        start_dt, _ = parse_and_convert_to_ist(start_date)
        end_dt, _ = parse_and_convert_to_ist(end_date)
        if not start_dt or not end_dt:
            return []

        query = f'("{company_name or ticker}" OR "{ticker}") AND (stock OR shares OR market OR results OR earnings)'
        url = "https://newsapi.org/v2/everything"
        params = {
            "q": query,
            "from": start_dt.strftime("%Y-%m-%d"),
            "to": end_dt.strftime("%Y-%m-%d"),
            "language": "en",
            "sortBy": "relevancy",
            "pageSize": min(max_articles, 20),
            "apiKey": self.api_key
        }

        session = requests.Session()
        resp = session.get(url, params=params, timeout=8)
        if resp.status_code != 200:
            raise Exception(f"NewsAPI returned HTTP status {resp.status_code}")
        data = resp.json()
        raw_articles = data.get("articles", [])

        results = []
        for item in raw_articles[:max_articles]:
            title = (item.get("title") or "").strip()
            link = (item.get("url") or "").strip()
            published_at = item.get("publishedAt", "")
            source_info = item.get("source") or {}
            source_name = source_info.get("name") or "NewsAPI Financial"
            description = item.get("description") or ""
            content = item.get("content") or ""
            full_text = f"{description} {content}".strip()

            if not title or not link:
                continue

            pub_dt, _ = parse_and_convert_to_ist(published_at)
            pub_dt = pub_dt or start_dt

            if pub_dt < start_dt or pub_dt > end_dt.replace(hour=23, minute=59, second=59):
                continue

            news_id = hashlib.md5(f"{link}{title}".encode()).hexdigest()[:16]
            results.append({
                "news_id": news_id,
                "symbol": ticker.upper(),
                "title": title,
                "text_content": full_text or title,
                "link": link,
                "source": source_name,
                "published_at": pub_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "market_label": None,
                "provider": self.name
            })

        return results


class SupabaseNewsProvider(BaseNewsProvider):
    """
    Supabase cloud database provider for financial news.
    Queries the 'news_articles' PostgreSQL table via PostgREST.
    """
    name: str = "supabase"

    def __init__(
        self,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None
    ):
        self.supabase_url = (supabase_url or os.getenv("SUPABASE_URL") or "").rstrip("/")
        self.supabase_key = (
            supabase_key
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or os.getenv("SUPABASE_KEY")
            or os.getenv("SUPABASE_ANON_KEY")
            or ""
        )

    def is_available(self) -> bool:
        return bool(self.supabase_url and self.supabase_key)

    def fetch_news(
        self,
        ticker: str,
        company_name: str,
        aliases: List[str],
        start_date: str,
        end_date: str,
        keywords: Optional[List[str]] = None,
        max_articles: int = 15
    ) -> List[Dict[str, Any]]:
        if not self.is_available():
            return []

        endpoint = f"{self.supabase_url}/rest/v1/news_articles"
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }

        sym = ticker.upper()
        params = {
            "select": "id,source,url,title,raw_text,published_at,entities,sentiment_label,sentiment_score",
            "published_at": f"gte.{start_date}T00:00:00+05:30",
            "order": "published_at.desc",
            "limit": str(max_articles * 2)
        }
        if end_date:
            params["and"] = f"(published_at.lte.{end_date}T23:59:59+05:30)"

        params["or"] = f'(entities.cs.{{"{sym}"}},title.ilike.*{sym}*)'

        try:
            resp = requests.get(endpoint, headers=headers, params=params, timeout=10)
            if resp.status_code != 200:
                return []
            data = resp.json()
            if not isinstance(data, list):
                return []

            results = []
            for row in data:
                raw_text = (row.get("raw_text") or row.get("title") or "").strip()
                pub_raw = row.get("published_at") or ""
                pub_dt, has_time = parse_and_convert_to_ist(pub_raw)
                pub_str = pub_dt.strftime("%Y-%m-%d %H:%M:%S") if pub_dt else pub_raw[:19]

                results.append({
                    "news_id": str(row.get("id") or hashlib.md5((row.get("url", "") + row.get("title", "")).encode()).hexdigest()[:16]),
                    "symbol": sym,
                    "title": row.get("title", "Financial Report"),
                    "text_content": raw_text,
                    "link": row.get("url", "#"),
                    "source": row.get("source", "Financial News"),
                    "published_at": pub_str,
                    "market_label": row.get("sentiment_label"),
                    "provider": self.name
                })
            return results[:max_articles]
        except Exception as e:
            return []


class HistoricalNewsRetriever:
    """
    Retrieves and ranks historical news articles for a given stock and date range,
    with automatic multi-source live web fallback when local coverage is insufficient.
    """

    def __init__(
        self,
        db_url: Optional[str] = None,
        csv_path: Optional[str] = None,
        json_path: Optional[str] = None,
        enable_online_fallback: bool = True,
        providers: Optional[List[BaseNewsProvider]] = None
    ):
        self.db_url = db_url or os.getenv("DATABASE_URL")
        self.csv_path = csv_path or str(Path(__file__).parent.parent.parent / "india_stock_news_2025.csv")
        self.json_path = json_path or str(Path(__file__).parent.parent / "data" / "sample_news.json")
        self.enable_online_fallback = enable_online_fallback
        self.providers: List[BaseNewsProvider] = providers if providers is not None else [
            SupabaseNewsProvider(),
            GoogleNewsRSSProvider(),
            GDELTNewsProvider(),
            NewsAPIProvider()
        ]
        self._articles_cache: Optional[List[Dict[str, Any]]] = None
        self._last_fetch_failed: bool = False
        self._last_fetch_error_msg: Optional[str] = None
        self._succeeded_sources: List[str] = []
        self._failed_sources: List[str] = []
        self._cache: Dict[str, Tuple[Dict[str, Any], float, bool]] = {}

    def _parse_pub_date(self, date_str: str) -> Optional[datetime]:
        """Parses arbitrary publication date strings into datetime (converting to IST if timezone is present)."""
        dt, _ = parse_and_convert_to_ist(date_str)
        return dt

    def classify_article_relevance(
        self,
        title: str,
        text_content: str,
        ticker: str,
        company_name: str = "",
        aliases: Optional[List[str]] = None
    ) -> str:
        """
        Classifies article relevance:
        - 'company_direct': direct focus on the company in title or primary text
        - 'sector_industry': discusses company's sector / industry peers
        - 'macro_market': broader macroeconomic, regulatory, or market trends
        - 'weak_or_irrelevant': mere passing mention in a list or ticker tape
        """
        title_lower = (title or "").lower()
        content_lower = (text_content or "").lower()
        t_lower = ticker.lower()
        c_lower = (company_name or "").lower()
        alias_lowers = [a.lower() for a in (aliases or []) if len(a) >= 3]

        all_names = [t_lower]
        if c_lower and c_lower != t_lower:
            all_names.append(c_lower)
        all_names.extend(alias_lowers)

        # Check mention frequency
        total_mentions = 0
        for name in all_names:
            total_mentions += len(re.findall(rf"\b{re.escape(name)}\b", content_lower))

        # Check if text is a list / market-wrap mentioning multiple peer tickers
        other_tickers = ["infy", "reliance", "hdfc", "icici", "wipro", "sbi", "itc", "bharti", "tcs", "nifty", "sensex"]
        other_peer_hits = sum(1 for ot in other_tickers if ot != t_lower and re.search(rf"\b{ot}\b", content_lower[:400]))

        # 1. Company Direct in Title
        for name in all_names:
            if re.search(rf"\b{re.escape(name)}\b", title_lower):
                return "company_direct"

        # If only 1 mention in a market roundup/list with multiple tickers, it's weak/irrelevant
        if other_peer_hits >= 2 and total_mentions <= 1:
            return "weak_or_irrelevant"

        # If prominently in first 250 chars and has multiple mentions
        for name in all_names:
            if re.search(rf"\b{re.escape(name)}\b", content_lower[:250]) and total_mentions >= 2:
                return "company_direct"

        if total_mentions >= 3:
            return "company_direct"

        # 2. Sector / Industry Check
        sector_terms = {
            "it": ["software", "tech", "it services", "cloud", "saas", "digital transformation", "ai deal"],
            "bank": ["banking", "npa", "credit growth", "net interest margin", "rbi", "lending", "deposits", "psu bank"],
            "auto": ["automotive", "ev", "passenger vehicles", "commercial vehicles", "auto sales"],
            "pharma": ["pharma", "drug", "usfda", "clinical trial", "formulations", "generic"],
            "energy": ["crude oil", "refining", "telecom", "petrochemical", "green hydrogen"],
        }
        all_sector_kws = [kw for kws in sector_terms.values() for kw in kws]
        sector_hits = sum(1 for kw in all_sector_kws if kw in title_lower or kw in content_lower[:400])

        if sector_hits >= 2:
            return "sector_industry"

        # 3. Macro / Market Check
        macro_terms = ["rbi repo rate", "inflation", "gdp growth", "cpi", "wpi", "budget", "fii flows", "sebi", "sensex", "nifty 50"]
        if any(m in title_lower or m in content_lower[:400] for m in macro_terms):
            return "macro_market"

        # 4. If only 1 passing mention in a large text, it's weak/irrelevant
        if total_mentions <= 1 and len(content_lower) > 300:
            return "weak_or_irrelevant"

        return "company_direct" if total_mentions >= 1 else "weak_or_irrelevant"

    def _load_local_corpus(self) -> List[Dict[str, Any]]:
        """Loads articles from Supabase cloud, local CSV, and JSON stores."""
        if self._articles_cache is not None:
            return self._articles_cache

        articles = []
        seen_ids = set()

        # 0. Load from Supabase cloud database if configured
        supabase_url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
        supabase_key = (
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or os.getenv("SUPABASE_KEY")
            or os.getenv("SUPABASE_ANON_KEY")
            or ""
        )
        if supabase_url and supabase_key:
            try:
                endpoint = f"{supabase_url}/rest/v1/news_articles"
                headers = {
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json"
                }
                params = {
                    "select": "id,source,url,title,raw_text,published_at,entities,sentiment_label,sentiment_score",
                    "order": "published_at.desc",
                    "limit": "5000"
                }
                resp = requests.get(endpoint, headers=headers, params=params, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list) and data:
                        for row in data:
                            news_id = str(row.get("id"))
                            if news_id in seen_ids:
                                continue
                            seen_ids.add(news_id)
                            entities = row.get("entities") or []
                            sym = entities[0] if entities else "MARKET"
                            articles.append({
                                "news_id": news_id,
                                "symbol": sym,
                                "title": row.get("title", ""),
                                "text_content": row.get("raw_text") or row.get("title", ""),
                                "link": row.get("url", ""),
                                "source": row.get("source", "Supabase News"),
                                "published_at": (row.get("published_at") or "")[:19].replace("T", " "),
                                "market_label": row.get("sentiment_label"),
                                "provider": "supabase"
                            })
            except Exception as e:
                print(f"[NewsRetriever] Supabase cloud fetch notice: {e}")

        # 1. Load CSV dataset if present
        csv_file = Path(self.csv_path)
        if csv_file.exists():
            try:
                with open(csv_file, "r", encoding="utf-8", errors="replace") as f:
                    reader = csv.DictReader(f)
                    for r in reader:
                        news_id = r.get("news_id") or hashlib.md5(f"{r.get('link')}{r.get('title')}".encode()).hexdigest()[:16]
                        if news_id in seen_ids:
                            continue
                        seen_ids.add(news_id)

                        stock = (r.get("stock") or "").strip().upper()
                        articles.append({
                            "news_id": news_id,
                            "symbol": stock,
                            "title": r.get("title", "").strip(),
                            "text_content": r.get("text_content", "").strip(),
                            "link": r.get("link", "").strip(),
                            "source": r.get("source") or "Financial News",
                            "published_at": r.get("timestamp") or "",
                            "market_label": r.get("market_label"),
                        })
            except Exception as e:
                print(f"[NewsRetriever] CSV load warning: {e}")

        # 2. Load JSON dataset if present
        json_file = Path(self.json_path)
        if json_file.exists():
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        news_id = item.get("id") or hashlib.md5(f"{item.get('title')}".encode()).hexdigest()[:16]
                        if news_id in seen_ids:
                            continue
                        seen_ids.add(news_id)
                        articles.append({
                            "news_id": news_id,
                            "symbol": (item.get("symbol") or "").upper(),
                            "title": item.get("title", ""),
                            "text_content": item.get("content", ""),
                            "link": item.get("link", ""),
                            "source": item.get("source", "Financial Press"),
                            "published_at": item.get("published_at", ""),
                            "causal_category": item.get("causal_category"),
                            "sentiment": item.get("sentiment"),
                        })
            except Exception as e:
                print(f"[NewsRetriever] JSON load warning: {e}")

        self._articles_cache = articles
        return self._articles_cache

    def fetch_online_news(
        self,
        ticker: str,
        start_date: str,
        end_date: str,
        keywords: Optional[List[str]] = None,
        max_fetch: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Fetches live historical articles from configured providers on-demand,
        decodes real publisher URLs, extracts clean body text, and caches results.
        """
        self._last_fetch_failed = False
        self._last_fetch_error_msg = None
        self._succeeded_sources = []
        self._failed_sources = []

        ticker_upper = ticker.upper()
        company_name = ""
        aliases = []
        for item in DEFAULT_STOCK_CATALOG:
            if item["ticker"] == ticker_upper:
                company_name = item.get("company_name", "")
                aliases = item.get("aliases", [])
                break

        all_live_articles = []
        any_success = False

        for provider in self.providers:
            if not provider.is_available():
                continue
            try:
                articles = provider.fetch_news(
                    ticker=ticker_upper,
                    company_name=company_name,
                    aliases=aliases,
                    start_date=start_date,
                    end_date=end_date,
                    keywords=keywords,
                    max_articles=max_fetch
                )
                self._succeeded_sources.append(provider.name)
                any_success = True
                if articles:
                    all_live_articles.extend(articles)
            except Exception as e:
                err_str = str(e)
                if hasattr(provider, "api_key") and provider.api_key:
                    err_str = err_str.replace(provider.api_key, "[REDACTED_API_KEY]")
                self._failed_sources.append(f"{provider.name}: {err_str}")

        self._raw_fetched_count = len(all_live_articles)

        if not any_success and self._failed_sources:
            self._last_fetch_failed = True
            self._last_fetch_error_msg = "; ".join(self._failed_sources)

        # Deduplicate fetched articles
        deduped_live = self.deduplicate(all_live_articles)

        # Persist newly fetched articles to local cache & CSV for future instant queries
        if deduped_live and self._articles_cache is not None:
            for art in deduped_live:
                if not any(c.get("news_id") == art.get("news_id") for c in self._articles_cache):
                    self._articles_cache.append(art)

        if deduped_live:
            csv_file = Path(self.csv_path)
            file_exists = csv_file.exists() and csv_file.stat().st_size > 0
            fieldnames = ["news_id", "timestamp", "title", "text_content", "link", "stock", "market_label", "confidence"]
            try:
                with open(csv_file, "a", newline="", encoding="utf-8") as f:
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    if not file_exists:
                        writer.writeheader()
                    for art in deduped_live:
                        writer.writerow({
                            "news_id": art["news_id"],
                            "timestamp": art["published_at"],
                            "title": art["title"],
                            "text_content": art.get("text_content", ""),
                            "link": art.get("link", ""),
                            "stock": art.get("symbol", ticker_upper),
                            "market_label": "",
                            "confidence": ""
                        })
            except Exception as e:
                print(f"[NewsRetriever] Failed to append live articles to CSV: {e}")

        return deduped_live

    def deduplicate(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Removes exact and near-duplicate syndicated articles using normalized token overlap.
        Preserves original sources without counting the same event multiple times.
        """
        unique = []
        seen_urls = set()
        seen_title_tokens = []

        def get_tokens(s: str) -> set:
            words = set(re.findall(r"\b\w{3,}\b", s.lower()))
            stopwords = {"the", "and", "for", "with", "that", "this", "from", "are", "was", "will", "has", "have", "its", "shares", "stock"}
            return words - stopwords

        for art in articles:
            raw_url = art.get("link", "").strip()
            norm_url = normalize_url(raw_url)
            if norm_url and norm_url in seen_urls:
                continue
            if norm_url:
                seen_urls.add(norm_url)

            title = art.get("title", "")
            tokens = get_tokens(title)

            # Check for near-duplicate syndicated titles
            is_dup = False
            for prev_tokens, prev_art in seen_title_tokens:
                if tokens and prev_tokens:
                    overlap = len(tokens.intersection(prev_tokens)) / max(len(tokens.union(prev_tokens)), 1)
                    if overlap >= 0.65:
                        is_dup = True
                        syndicated = prev_art.setdefault("syndicated_sources", [])
                        src = art.get("source") or "Syndicated Press"
                        if src not in syndicated:
                            syndicated.append(src)
                        prev_art["syndicated_count"] = prev_art.get("syndicated_count", 1) + 1
                        break

            if is_dup:
                continue

            art_copy = dict(art)
            art_copy.setdefault("syndicated_sources", [art.get("source") or "Financial Press"])
            art_copy.setdefault("syndicated_count", 1)
            seen_title_tokens.append((tokens, art_copy))
            unique.append(art_copy)

        return unique

    def retrieve(
        self,
        ticker: str,
        start_date: str,
        end_date: str,
        keywords: Optional[List[str]] = None,
        top_k: int = 15,
        enable_online_fallback: Optional[bool] = None,
        should_fallback: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Retrieves, filters, deduplicates, and ranks historical and current articles.
        Separates technical retrieval success from evidence quality and sufficiency.
        """
        if enable_online_fallback is None and should_fallback is not None:
            enable_online_fallback = should_fallback
        effective_fallback = self.enable_online_fallback if enable_online_fallback is None else enable_online_fallback
        should_fallback = effective_fallback
        ticker_upper = ticker.upper()

        # Cache lookup (only for online searches, incorporating local corpus length)
        local_len = len(self._articles_cache) if self._articles_cache is not None else 0
        cache_key = f"{ticker_upper}:{start_date}:{end_date}:{effective_fallback}:{local_len}"
        now_ts = datetime.now().timestamp()
        if effective_fallback and cache_key in self._cache:
            cached_res, cached_at, is_rec_entry = self._cache[cache_key]
            ttl = 600 if is_rec_entry else 86400
            if (now_ts - cached_at) < ttl:
                res_copy = dict(cached_res)
                res_copy["from_cache"] = True
                return res_copy

        start_dt = self._parse_pub_date(start_date)
        end_dt = self._parse_pub_date(end_date)
        if end_dt:
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

        # Determine retrieval mode: Recent vs Historical
        is_recent = False
        if end_dt:
            is_recent = (datetime.now() - end_dt).days <= 7

        all_corpus = self._load_local_corpus()
        matched = []

        # Find company name and aliases for ticker
        company_name = ""
        aliases = []
        for item in DEFAULT_STOCK_CATALOG:
            if item["ticker"] == ticker_upper:
                company_name = item.get("company_name", "")
                aliases = item.get("aliases", [])
                break

        for art in all_corpus:
            art_symbol = art.get("symbol", "").upper()
            title = art.get("title", "")
            content = art.get("text_content", "")
            full_text = f"{title} {content}"

            # Check symbol match or mention in text
            symbol_matched = (art_symbol == ticker_upper) or (re.search(rf"\b{re.escape(ticker_upper)}\b", full_text, re.I) is not None)
            if not symbol_matched and aliases:
                for al in aliases:
                    if len(al) >= 4 and re.search(rf"\b{re.escape(al)}\b", full_text, re.I):
                        symbol_matched = True
                        break

            if not symbol_matched:
                continue

            # Verify publication date
            pub_dt = self._parse_pub_date(art.get("published_at", ""))
            if start_dt or end_dt:
                if not pub_dt:
                    continue
                if start_dt and pub_dt < start_dt:
                    continue
                if end_dt and pub_dt > end_dt:
                    continue

            matched.append(art)

        # Multi-source live fetch execution
        live_articles = []
        if is_recent and should_fallback:
            # Recent mode: live retrieval takes precedence to fetch fresh articles
            live_articles = self.fetch_online_news(ticker_upper, start_date, end_date, keywords=keywords, max_fetch=top_k)
            for la in live_articles:
                if not any(m.get("news_id") == la.get("news_id") for m in matched):
                    matched.append(la)
        elif (len(matched) < 6 or any("2026" in str(d) for d in [start_date, end_date])) and should_fallback:
            # Historical mode fallback
            live_articles = self.fetch_online_news(ticker_upper, start_date, end_date, keywords=keywords, max_fetch=top_k)
            for la in live_articles:
                if not any(m.get("news_id") == la.get("news_id") for m in matched):
                    matched.append(la)

        # Determine retrieval mode label
        local_matched_count = len([a for a in matched if a.get("provider") is None])
        live_matched_count = len([a for a in matched if a.get("provider") is not None])
        if local_matched_count > 0 and live_matched_count > 0:
            retrieval_mode = "combined"
        elif live_matched_count > 0:
            retrieval_mode = "live"
        else:
            retrieval_mode = "local"

        # Classify timing and relevance for each matched article
        scored_articles = []
        for art in matched:
            title = art.get("title", "")
            content = art.get("text_content", "")
            full_text = f"{title} {content}"
            raw_pub = art.get("published_at", "")
            pub_dt, has_time = parse_and_convert_to_ist(raw_pub)

            # Classify NSE market timing relative to end_date
            timing_cat = classify_nse_market_timing(pub_dt, has_time, end_date)
            is_after_market_close = (timing_cat == "after_market_close")

            # Classify relevance category
            rel_cat = self.classify_article_relevance(
                title=title,
                text_content=content,
                ticker=ticker_upper,
                company_name=company_name,
                aliases=aliases
            )

            rel_score = 0.50
            if rel_cat == "company_direct":
                rel_score += 0.30
            elif rel_cat == "sector_industry":
                rel_score += 0.15
            elif rel_cat == "macro_market":
                rel_score += 0.05
            elif rel_cat == "weak_or_irrelevant":
                rel_score = 0.20

            if keywords:
                q_words = [k.lower() for k in keywords if len(k) > 2]
                text_lower = full_text.lower()
                hits = sum(1 for kw in q_words if kw in text_lower)
                if q_words:
                    rel_score += 0.20 * (hits / len(q_words))

            recency_boost = 0.0
            if pub_dt and start_dt and end_dt:
                total_span = (end_dt - start_dt).total_seconds()
                if total_span > 0:
                    pos = (pub_dt - start_dt).total_seconds() / total_span
                    recency_boost = 0.10 * max(0.0, min(1.0, pos))

            final_score = round(min(0.99, rel_score + recency_boost), 4)

            art_copy = dict(art)
            art_copy["relevance_score"] = final_score
            art_copy["relevance_category"] = rel_cat
            art_copy["timing_category"] = timing_cat
            art_copy["is_after_market_close"] = is_after_market_close
            art_copy["has_exact_timestamp"] = has_time
            scored_articles.append(art_copy)

        # Deduplicate
        deduped = self.deduplicate(scored_articles)

        # Sort descending by relevance score
        deduped.sort(key=lambda x: x["relevance_score"], reverse=True)
        final_articles = deduped[:top_k]

        # Count direct vs sector vs weak articles
        direct_articles = [a for a in final_articles if a.get("relevance_category") == "company_direct"]
        sector_articles = [a for a in final_articles if a.get("relevance_category") in ("sector_industry", "macro_market")]
        weak_articles = [a for a in final_articles if a.get("relevance_category") == "weak_or_irrelevant"]
        verified_ts_count = sum(1 for a in final_articles if a.get("has_exact_timestamp") or a.get("published_at"))

        # Determine Evidence Sufficiency
        if len(final_articles) == 0:
            if getattr(self, "_last_fetch_failed", False):
                retrieval_status = "RETRIEVAL_FAILED"
                evidence_sufficiency = "technical_failure"
                limitation_note = (
                    f"Live online news retrieval failed for {ticker_upper} ({self._last_fetch_error_msg or 'source unavailable'}) "
                    f"and no local historical articles were found."
                )
            else:
                retrieval_status = "NO_NEWS_AVAILABLE"
                evidence_sufficiency = "none"
                limitation_note = (
                    f"No verified historical news articles found. No sufficient, verified news evidence was found in the sources searched for this period. "
                    f"This does not establish that no relevant news existed. The price-based classification is available, "
                    f"but a reliable news-based explanation cannot be confirmed."
                )
        elif len(direct_articles) == 0 and len(sector_articles) == 0:
            retrieval_status = "OK"
            evidence_sufficiency = "irrelevant"
            limitation_note = (
                f"Retrieved articles for {ticker_upper} only contained brief passing mentions without substantive operational "
                f"or fundamental details. Causal news attribution is not supported by the available evidence."
            )
        elif len(direct_articles) == 0 and len(sector_articles) > 0:
            retrieval_status = "OK"
            evidence_sufficiency = "sparse"
            limitation_note = (
                f"No company-specific articles were retrieved for {ticker_upper}; available coverage reflects broader sector "
                f"or macroeconomic trends. Findings represent contextual background rather than verified company catalysts."
            )
        elif len(direct_articles) == 1:
            retrieval_status = "OK"
            evidence_sufficiency = "sparse"
            limitation_note = (
                f"Only a single verified company-specific article was identified for {ticker_upper} between {start_date} and {end_date}. "
                f"Causal inferences carry higher uncertainty."
            )
        else:
            retrieval_status = "OK"
            evidence_sufficiency = "sufficient"
            limitation_note = None

        coverage_sufficient = evidence_sufficiency == "sufficient"

        succeeded_sources = list(self._succeeded_sources)
        if local_matched_count > 0 and "local_corpus" not in succeeded_sources:
            succeeded_sources.insert(0, "local_corpus")

        retrieval_ts = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S IST")

        result = {
            "articles": final_articles,
            "count": len(final_articles),
            "direct_count": len(direct_articles),
            "sector_count": len(sector_articles),
            "weak_count": len(weak_articles),
            "coverage_sufficient": coverage_sufficient,
            "evidence_sufficiency": evidence_sufficiency,
            "retrieval_status": retrieval_status,
            "retrieval_mode": retrieval_mode,
            "requested_date_range": {"start_date": start_date, "end_date": end_date},
            "retrieval_timestamp": retrieval_ts,
            "fetched_count": local_matched_count + getattr(self, "_raw_fetched_count", 0) if getattr(self, "_raw_fetched_count", 0) > 0 else len(matched),
            "unique_count": len(final_articles),
            "relevant_count": len(direct_articles) + len(sector_articles),
            "verified_timestamp_count": verified_ts_count,
            "succeeded_sources": succeeded_sources,
            "failed_sources": list(self._failed_sources),
            "is_incomplete": evidence_sufficiency in ("sparse", "none", "technical_failure", "irrelevant"),
            "limitation_note": limitation_note,
            "start_date": start_date,
            "end_date": end_date,
            "ticker": ticker_upper,
        }

        # Cache result only when technical failure did NOT occur and online search was performed
        if effective_fallback and retrieval_status != "RETRIEVAL_FAILED" and evidence_sufficiency != "technical_failure":
            self._cache[cache_key] = (result, now_ts, is_recent)

        return result



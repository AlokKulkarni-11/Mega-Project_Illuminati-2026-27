"""
Comprehensive Automated Test Suite for Dynamic Runtime Financial News Retrieval
Covers the 20 test specifications:
1. Querying yesterday dynamically.
2. Querying this year dynamically.
3. Querying a specific historical date.
4. Querying a multi-day range.
5. Retrieving recent articles through mocked RSS responses.
6. Combining local and online articles.
7. Deduplicating articles across sources.
8. Excluding articles outside the requested range.
9. Preventing historical look-ahead leakage.
10. Handling missing publication timestamps.
11. Handling timezones correctly.
12. Handling provider timeouts and rate limits.
13. Continuing when one provider fails.
14. Handling missing API keys.
15. Correctly reporting NO_NEWS_AVAILABLE.
16. Correctly reporting RETRIEVAL_FAILED.
17. Preventing temporary provider failures from being cached as permanent empty results.
18. Ensuring old API responses remain compatible.
19. Ensuring current retrieval does not fabricate price data.
20. Ensuring citations point to actual retrieved articles.
"""

from datetime import datetime, date, timedelta
from unittest.mock import MagicMock, patch
import pytest
import requests

from ml_service.services.date_resolver import (
    resolve_date_range,
    normalize_date_input,
    DateResolutionService,
    DateResolver
)
from ml_service.services.news_retrieval import (
    HistoricalNewsRetriever,
    BaseNewsProvider,
    GoogleNewsRSSProvider,
    GDELTNewsProvider,
    NewsAPIProvider,
    normalize_url
)
from ml_service.services.query_understanding import QueryUnderstandingService


# ---------------------------------------------------------------------------
# 1. Querying yesterday dynamically
# ---------------------------------------------------------------------------
def test_01_querying_yesterday_dynamically():
    ref_dt = datetime(2026, 10, 27, 10, 0, 0)
    start_d, end_d = resolve_date_range("Why did TCS fall yesterday?", ref_dt=ref_dt)
    assert start_d == date(2026, 10, 26)
    assert end_d == date(2026, 10, 26)


# ---------------------------------------------------------------------------
# 2. Querying this year dynamically
# ---------------------------------------------------------------------------
def test_02_querying_this_year_dynamically():
    ref_dt = datetime(2026, 10, 27, 10, 0, 0)
    start_d, end_d = resolve_date_range("How has Tata Motors performed this year?", ref_dt=ref_dt)
    assert start_d == date(2026, 1, 1)
    assert end_d == date(2026, 10, 27)


# ---------------------------------------------------------------------------
# 3. Querying a specific historical date
# ---------------------------------------------------------------------------
def test_03_querying_specific_historical_date():
    start_d, end_d = resolve_date_range("Why did SBI fall on 15 March 2025?")
    assert start_d == date(2025, 3, 15)
    assert end_d == date(2025, 3, 15)


# ---------------------------------------------------------------------------
# 4. Querying a multi-day range
# ---------------------------------------------------------------------------
def test_04_querying_multi_day_range():
    ref_dt = datetime(2026, 10, 27, 10, 0, 0)
    start_d, end_d = resolve_date_range("Explain Reliance movement during the last 7 days", ref_dt=ref_dt)
    assert start_d == date(2026, 10, 20)
    assert end_d == date(2026, 10, 27)

    start_d_30, end_d_30 = resolve_date_range("Infosys performance over the last 30 days", ref_dt=ref_dt)
    assert start_d_30 == date(2026, 9, 27)
    assert end_d_30 == date(2026, 10, 27)


# ---------------------------------------------------------------------------
# 5. Retrieving recent articles through mocked RSS responses
# ---------------------------------------------------------------------------
def test_05_retrieving_recent_articles_through_mocked_rss():
    mock_rss_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
        <channel>
            <title>Google News - TCS</title>
            <item>
                <title>TCS signs $1 Billion mega deal in cloud AI - Economic Times</title>
                <link>https://news.google.com/rss/articles/CBMiMWh0dHBzOi8vZWNvbm9taWN0aW1lcy5pbmRpYXRpbWVzLmNvbS90Y3MtbWVnYS1kZWFs0gEA?oc=5</link>
                <pubDate>Mon, 26 Oct 2026 09:30:00 GMT</pubDate>
                <description>Tata Consultancy Services secured a multi-year deal.</description>
                <source url="https://economictimes.indiatimes.com">The Economic Times</source>
            </item>
        </channel>
    </rss>
    """
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = mock_rss_xml.encode("utf-8")

    provider = GoogleNewsRSSProvider()
    with patch("requests.Session.get", return_value=mock_response):
        articles = provider.fetch("TCS", date(2026, 10, 25), date(2026, 10, 27))
        assert len(articles) == 1
        art = articles[0]
        assert "TCS signs $1 Billion" in art["title"]
        assert art["source"] == "The Economic Times"
        assert art["published_at"].startswith("2026-10-26")


# ---------------------------------------------------------------------------
# 6. Combining local and online articles
# ---------------------------------------------------------------------------
def test_06_combining_local_and_online_articles():
    retriever = HistoricalNewsRetriever()
    retriever._articles_cache = [
        {
            "news_id": "loc_tcs_01",
            "symbol": "TCS",
            "title": "TCS quarterly preview and revenue momentum",
            "text_content": "Detailed preview of TCS quarterly performance.",
            "source": "Local Archive",
            "published_at": "2026-10-25 10:00:00",
            "link": "https://archive.com/tcs-local-1"
        }
    ]

    online_article = {
        "news_id": "onl_tcs_02",
        "symbol": "TCS",
        "title": "TCS wins digital banking contract in UK",
        "text_content": "Major multi-year contract secured by Tata Consultancy Services.",
        "source": "Live Mint",
        "link": "https://livemint.com/tcs-online-contract",
        "published_at": "2026-10-26 12:00:00",
        "provider": "google_news_rss"
    }

    mock_provider = MagicMock(spec=GoogleNewsRSSProvider)
    mock_provider.name = "google_news_rss"
    mock_provider.is_available.return_value = True
    mock_provider.fetch_news.return_value = [online_article]

    retriever.providers = [mock_provider]

    res = retriever.retrieve("TCS", "2026-10-25", "2026-10-27", should_fallback=True)
    assert res["count"] == 2
    sources = {a.get("source") for a in res["articles"]}
    assert "Local Archive" in sources
    assert "Live Mint" in sources
    assert res["retrieval_mode"] == "combined"


# ---------------------------------------------------------------------------
# 7. Deduplicating articles across sources
# ---------------------------------------------------------------------------
def test_07_deduplicating_articles_across_sources():
    retriever = HistoricalNewsRetriever()
    retriever._articles_cache = []

    # Two articles with same syndicated headline & overlapping content from different providers
    provider1 = MagicMock(spec=GoogleNewsRSSProvider)
    provider1.name = "google_news_rss"
    provider1.is_available.return_value = True
    provider1.fetch_news.return_value = [
        {
            "news_id": "art_rss_01",
            "symbol": "TCS",
            "title": "TCS shares tumble 3 percent following management guidance cut",
            "text_content": "Tata Consultancy Services shares fell sharply after cautious commentary.",
            "source": "Reuters",
            "link": "https://reuters.com/tcs-shares?utm_source=twitter&ref=rss",
            "published_at": "2026-10-26 10:00:00",
            "provider": "google_news_rss"
        }
    ]

    provider2 = MagicMock(spec=GDELTNewsProvider)
    provider2.name = "gdelt"
    provider2.is_available.return_value = True
    provider2.fetch_news.return_value = [
        {
            "news_id": "art_gdelt_02",
            "symbol": "TCS",
            "title": "TCS shares tumble 3 percent following management guidance cut",
            "text_content": "Tata Consultancy Services shares fell sharply after cautious commentary.",
            "source": "Syndicated Wire",
            "link": "https://reuters.com/tcs-shares",  # Canonical matching link
            "published_at": "2026-10-26 10:05:00",
            "provider": "gdelt"
        }
    ]

    retriever.providers = [provider1, provider2]
    res = retriever.retrieve("TCS", "2026-10-25", "2026-10-27", should_fallback=True)
    assert res["unique_count"] == 1
    assert res["count"] == 1
    assert res["fetched_count"] == 2


# ---------------------------------------------------------------------------
# 8. Excluding articles outside the requested range
# ---------------------------------------------------------------------------
def test_08_excluding_articles_outside_requested_range():
    retriever = HistoricalNewsRetriever()
    retriever._articles_cache = [
        {
            "news_id": "tcs_sep",
            "symbol": "TCS",
            "title": "TCS older report from September",
            "text_content": "Article from September regarding Q2 earnings.",
            "source": "Local Archive",
            "published_at": "2026-09-01 10:00:00",
            "link": "https://archive.com/tcs-sep"
        },
        {
            "news_id": "tcs_oct",
            "symbol": "TCS",
            "title": "TCS in-range report from October 26",
            "text_content": "Article from October 26 about new cloud business.",
            "source": "Local Archive",
            "published_at": "2026-10-26 10:00:00",
            "link": "https://archive.com/tcs-oct"
        }
    ]

    res = retriever.retrieve("TCS", "2026-10-25", "2026-10-27", should_fallback=False)
    assert res["count"] == 1
    assert res["articles"][0]["title"] == "TCS in-range report from October 26"


# ---------------------------------------------------------------------------
# 9. Preventing historical look-ahead leakage
# ---------------------------------------------------------------------------
def test_09_preventing_historical_look_ahead_leakage():
    retriever = HistoricalNewsRetriever()
    retriever._articles_cache = [
        {
            "news_id": "infy_target_day",
            "symbol": "INFY",
            "title": "Infosys quarterly announcement before close",
            "text_content": "Results published during trading hours.",
            "source": "Local Archive",
            "published_at": "2025-03-15 11:00:00",
            "link": "https://archive.com/infy-before"
        },
        {
            "news_id": "infy_future_day",
            "symbol": "INFY",
            "title": "Infosys post-market reactions and next-day commentary",
            "text_content": "Results commentary published next day.",
            "source": "Local Archive",
            "published_at": "2025-03-16 09:00:00",
            "link": "https://archive.com/infy-after"
        }
    ]

    # Target movement date is 2025-03-15. News from 2025-03-16 must be excluded.
    res = retriever.retrieve("INFY", "2025-03-01", "2025-03-15", should_fallback=False)
    titles = [a["title"] for a in res["articles"]]
    assert "Infosys quarterly announcement before close" in titles
    assert "Infosys post-market reactions and next-day commentary" not in titles


# ---------------------------------------------------------------------------
# 10. Handling missing publication timestamps
# ---------------------------------------------------------------------------
def test_10_handling_missing_publication_timestamps():
    retriever = HistoricalNewsRetriever()
    retriever._articles_cache = []

    mock_provider = MagicMock()
    mock_provider.name = "MockProvider"
    mock_provider.is_available.return_value = True
    mock_provider.fetch_news.return_value = [
        {
            "news_id": "undated_art",
            "symbol": "TCS",
            "title": "TCS launches new banking platform in Nordics",
            "text_content": "No exact published date is available for this syndication.",
            "source": "Tech Wire",
            "link": "https://wire.com/tcs-nordics",
            "published_at": "",  # Missing/unverified
            "provider": "MockProvider"
        }
    ]
    retriever.providers = [mock_provider]

    res = retriever.retrieve("TCS", "2026-10-25", "2026-10-27", should_fallback=True)
    assert res["count"] == 1
    art = res["articles"][0]
    assert art["published_at"] == ""
    assert art["has_exact_timestamp"] is False
    assert res["verified_timestamp_count"] == 0


# ---------------------------------------------------------------------------
# 11. Handling timezones correctly (Conversion to IST)
# ---------------------------------------------------------------------------
def test_11_handling_timezones_correctly():
    mock_rss_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
        <channel>
            <title>Google News</title>
            <item>
                <title>Reliance Industries announces dividend - PR Wire</title>
                <link>https://news.google.com/rss/articles/12345</link>
                <!-- 18:30 UTC on Oct 25 is 00:00 IST on Oct 26 -->
                <pubDate>Sun, 25 Oct 2026 18:30:00 GMT</pubDate>
                <description>RIL dividend announcement.</description>
                <source url="https://ril.com">PR Wire</source>
            </item>
        </channel>
    </rss>
    """
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = mock_rss_xml.encode("utf-8")

    provider = GoogleNewsRSSProvider()
    with patch("requests.Session.get", return_value=mock_response):
        articles = provider.fetch("RELIANCE", date(2026, 10, 25), date(2026, 10, 27))
        assert len(articles) == 1
        pub_dt = articles[0]["published_at"]
        # 18:30 UTC on 25 Oct converts to 2026-10-26 00:00:00 in IST
        assert pub_dt.startswith("2026-10-26 00:00:00")


# ---------------------------------------------------------------------------
# 12. Handling provider timeouts and rate limits
# ---------------------------------------------------------------------------
def test_12_handling_provider_timeouts_and_rate_limits():
    provider = GoogleNewsRSSProvider()
    with patch("requests.Session.get", side_effect=requests.exceptions.Timeout("Connection timed out")):
        with pytest.raises(Exception):
            provider.fetch("TCS", date(2026, 10, 25), date(2026, 10, 27))


# ---------------------------------------------------------------------------
# 13. Continuing when one provider fails
# ---------------------------------------------------------------------------
def test_13_continuing_when_one_provider_fails():
    retriever = HistoricalNewsRetriever()
    retriever._articles_cache = []

    # Provider 1 raises connection failure
    provider1 = MagicMock(spec=GoogleNewsRSSProvider)
    provider1.name = "google_news_rss"
    provider1.is_available.return_value = True
    provider1.fetch_news.side_effect = requests.exceptions.ConnectionError("DNS failure")

    # Provider 2 succeeds
    provider2 = MagicMock(spec=GDELTNewsProvider)
    provider2.name = "gdelt"
    provider2.is_available.return_value = True
    provider2.fetch_news.return_value = [
        {
            "news_id": "gdelt_tcs_01",
            "symbol": "TCS",
            "title": "TCS expands cloud partnership with Microsoft",
            "text_content": "Major collaboration announcement on cloud AI.",
            "source": "Business Standard",
            "link": "https://business-standard.com/tcs-msft",
            "published_at": "2026-10-26 14:00:00",
            "provider": "gdelt"
        }
    ]

    retriever.providers = [provider1, provider2]
    res = retriever.retrieve("TCS", "2026-10-25", "2026-10-27", should_fallback=True)

    assert res["count"] == 1
    assert any("google_news_rss" in f for f in res["failed_sources"])
    assert "gdelt" in res["succeeded_sources"]
    assert res["retrieval_status"] == "OK"


# ---------------------------------------------------------------------------
# 14. Handling missing API keys (Graceful skip)
# ---------------------------------------------------------------------------
def test_14_handling_missing_api_keys():
    with patch.dict("os.environ", {}, clear=True):
        provider = NewsAPIProvider()
        articles = provider.fetch("TCS", date(2026, 10, 25), date(2026, 10, 27))
        # When API key is missing, provider is unavailable and gracefully returns empty list
        assert articles == []
        assert provider.is_available() is False


# ---------------------------------------------------------------------------
# 15. Correctly reporting NO_NEWS_AVAILABLE
# ---------------------------------------------------------------------------
def test_15_correctly_reporting_no_news_available():
    retriever = HistoricalNewsRetriever()
    retriever._articles_cache = []

    # Provider contacted successfully, but no news exists
    mock_provider = MagicMock(spec=GoogleNewsRSSProvider)
    mock_provider.name = "google_news_rss"
    mock_provider.is_available.return_value = True
    mock_provider.fetch_news.return_value = []

    retriever.providers = [mock_provider]
    res = retriever.retrieve("TCS", "2026-10-25", "2026-10-27", should_fallback=True)

    assert res["count"] == 0
    assert res["retrieval_status"] == "NO_NEWS_AVAILABLE"
    assert "google_news_rss" in res["succeeded_sources"]


# ---------------------------------------------------------------------------
# 16. Correctly reporting RETRIEVAL_FAILED
# ---------------------------------------------------------------------------
def test_16_correctly_reporting_retrieval_failed():
    retriever = HistoricalNewsRetriever()
    retriever._articles_cache = []

    mock_provider = MagicMock(spec=GoogleNewsRSSProvider)
    mock_provider.name = "google_news_rss"
    mock_provider.is_available.return_value = True
    mock_provider.fetch_news.side_effect = requests.exceptions.RequestException("Network unreachable")

    retriever.providers = [mock_provider]
    res = retriever.retrieve("TCS", "2026-10-25", "2026-10-27", should_fallback=True)

    assert res["count"] == 0
    assert res["retrieval_status"] == "RETRIEVAL_FAILED"
    assert any("google_news_rss" in f for f in res["failed_sources"])


# ---------------------------------------------------------------------------
# 17. Preventing temporary provider failures from being cached
# ---------------------------------------------------------------------------
def test_17_preventing_temporary_provider_failures_from_being_cached():
    retriever = HistoricalNewsRetriever()
    retriever._articles_cache = []

    mock_provider = MagicMock(spec=GoogleNewsRSSProvider)
    mock_provider.name = "google_news_rss"
    mock_provider.is_available.return_value = True
    # First call fails
    mock_provider.fetch_news.side_effect = requests.exceptions.ConnectionError("Temporary blip")

    retriever.providers = [mock_provider]
    res1 = retriever.retrieve("TCS", "2026-10-25", "2026-10-27", should_fallback=True)
    assert res1["count"] == 0
    assert res1["retrieval_status"] == "RETRIEVAL_FAILED"
    assert len(retriever._cache) == 0  # Failed response must NOT be cached!

    # Second call succeeds
    mock_provider.fetch_news.side_effect = None
    mock_provider.fetch_news.return_value = [
        {
            "news_id": "rec_01",
            "symbol": "TCS",
            "title": "TCS recovers after midday dip with strong institutional buying",
            "text_content": "Recovery driven by IT sector rebound and cloud momentum.",
            "source": "CNBC-TV18",
            "link": "https://cnbctv18.com/tcs-recovery",
            "published_at": "2026-10-26 15:00:00",
            "provider": "google_news_rss"
        }
    ]
    res2 = retriever.retrieve("TCS", "2026-10-25", "2026-10-27", should_fallback=True)
    assert res2["count"] == 1
    assert res2["retrieval_status"] == "OK"


# ---------------------------------------------------------------------------
# 18. Ensuring old API responses remain compatible
# ---------------------------------------------------------------------------
def test_18_ensuring_old_api_responses_remain_compatible():
    from ml_service.api.schemas import (
        QueryAnalysisResponse,
        QueryUnderstandResponse,
        SentimentSummary,
        SentimentDistribution,
        ExplanationDetails
    )

    query_interp = QueryUnderstandResponse(
        original_query="Why is TCS falling?",
        company_name="Tata Consultancy Services",
        ticker="TCS",
        date_expression="yesterday",
        start_date="2026-10-26",
        end_date="2026-10-26",
        intent="explain_stock_decline",
        requires_clarification=False,
        topic=["cloud", "earnings"]
    )

    dist = SentimentDistribution(
        positive=2, negative=1, neutral=1,
        positive_pct=50.0, negative_pct=25.0, neutral_pct=25.0
    )
    sent_summary = SentimentSummary(
        total_articles=4,
        sentiment_score=0.25,
        aggregate_sentiment="Neutral",
        aggregate_label="NEUTRAL",
        distribution=dist,
        model_version="ProsusAI/finbert"
    )

    explanation = ExplanationDetails(
        observed_price_movement="Consolidating",
        has_price_verification=True,
        negative_news_found="None",
        potential_explanations=["Stable revenue momentum"],
        uncertainty_and_limitations=[],
        citations=[],
        total_citations=0
    )

    resp = QueryAnalysisResponse(
        query="Why is TCS falling?",
        query_interpretation=query_interp,
        sentiment_summary=sent_summary,
        explanation=explanation,
        coverage_sufficient=True
    )

    # Must serialize and deserialize cleanly without error
    dumped = resp.model_dump()
    assert dumped["query_interpretation"]["ticker"] == "TCS"
    assert dumped["retrieval_status"] == "OK"
    assert "retrieval_mode" in dumped


# ---------------------------------------------------------------------------
# 19. Ensuring current retrieval does not fabricate price data
# ---------------------------------------------------------------------------
def test_19_ensuring_current_retrieval_does_not_fabricate_price_data():
    from fastapi.testclient import TestClient
    from ml_service.main import app

    client = TestClient(app)
    today_str = date.today().isoformat()
    resp = client.get(f"/instruments/TCS/explanation?date={today_str}")

    assert resp.status_code == 200
    data = resp.json()
    # Must contain honest disclosure in priceNote
    assert "priceNote" in data
    assert "Real-time intraday tick prices are not available" in data["priceNote"]


# ---------------------------------------------------------------------------
# 20. Ensuring citations point to actual retrieved articles
# ---------------------------------------------------------------------------
def test_20_ensuring_citations_point_to_actual_retrieved_articles():
    retriever = HistoricalNewsRetriever()
    retriever._articles_cache = []

    actual_url = "https://economictimes.indiatimes.com/tcs-actual-report-12345"
    mock_provider = MagicMock(spec=GoogleNewsRSSProvider)
    mock_provider.name = "Verified Source"
    mock_provider.is_available.return_value = True
    mock_provider.fetch_news.return_value = [
        {
            "news_id": "verified_deal_01",
            "symbol": "TCS",
            "title": "TCS announces $1.2B deal with UK insurer",
            "text_content": "Deal covers cloud and AI infrastructure modernisation across all business units.",
            "source": "The Economic Times",
            "link": actual_url,
            "published_at": "2026-10-26 11:30:00",
            "provider": "Verified Source"
        }
    ]
    retriever.providers = [mock_provider]

    res = retriever.retrieve("TCS", "2026-10-25", "2026-10-27", should_fallback=True)
    assert res["count"] == 1
    art = res["articles"][0]
    assert art["link"] == actual_url
    assert art["source"] == "The Economic Times"
    assert art["provider"] == "Verified Source"

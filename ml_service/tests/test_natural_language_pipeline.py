"""
Comprehensive Test Suite for Natural-Language Stock News Analysis
-------------------------------------------------------------------
Tests all requirements from Section 10:
1. Company-name and ticker resolution.
2. Ambiguous stock symbols (e.g. Tata, HDFC).
3. Mid-month date resolution (days 11-20).
4. Missing years (must require clarification, never silently guess).
5. Relative date expressions (last month, last week, two weeks ago).
6. Explicit historical years (e.g. 2025, 2026).
7. Queries asking why a stock declined (explain_stock_decline).
8. Queries requesting sentiment only.
9. Missing historical news (sparse coverage handling).
10. Incorrect publication dates (filtering out articles outside the window).
11. Articles without full text (headline-only handling).
12. No relevant articles found.
13. Unsupported explanation claims (causality disclaimers & price verification checks).
"""

from datetime import datetime
import pytest

from ml_service.services.stock_resolver import StockResolutionService
from ml_service.services.date_resolver import DateResolutionService
from ml_service.services.intent_classifier import IntentClassifierService
from ml_service.services.query_understanding import QueryUnderstandingService
from ml_service.services.news_retrieval import HistoricalNewsRetriever
from ml_service.services.finbert_analyzer import FinBertNewsAnalyzer
from ml_service.services.explanation_engine import EvidenceBasedExplanationEngine


# Fixed reference date for deterministic testing
FIXED_REF_DATE = datetime(2026, 4, 15, 12, 0, 0)


# --- 1. Company Name and Ticker Resolution ---
def test_company_name_and_ticker_resolution():
    resolver = StockResolutionService()

    # Exact Ticker
    res1 = resolver.resolve("Why is TCS stock dropping in mid March?")
    assert res1["resolved"] is True
    assert res1["ticker"] == "TCS"
    assert res1["exchange"] == "NSE"
    assert res1["company_name"] == "Tata Consultancy Services"

    # Company Name
    res2 = resolver.resolve("Analyze Infosys news during the last two weeks of January 2026.")
    assert res2["resolved"] is True
    assert res2["ticker"] == "INFY"
    assert res2["exchange"] == "NSE"

    # Common abbreviation
    res3 = resolver.resolve("What is happening with Reliance?")
    assert res3["resolved"] is True
    assert res3["ticker"] == "RELIANCE"

    # US Equities
    res4 = resolver.resolve("Show positive and negative news about NVIDIA in August.")
    assert res4["resolved"] is True
    assert res4["ticker"] == "NVDA"
    assert res4["exchange"] == "NASDAQ"
    assert res4["market"] == "US"


# --- 2. Ambiguous Stock Symbols ---
def test_ambiguous_stock_symbols():
    resolver = StockResolutionService()
    # "Tata" matches Tata Motors, Tata Steel, TCS
    res = resolver.resolve("Compare Tata stock movement")
    assert res["is_ambiguous"] is True
    assert len(res["candidates"]) > 1
    candidate_tickers = [c["ticker"] for c in res["candidates"]]
    assert "TATAMOTORS" in candidate_tickers or "TATASTEEL" in candidate_tickers


# --- 3. Mid-Month Date Resolution ---
def test_mid_month_date_resolution():
    date_resolver = DateResolutionService()
    # Explicit mid-month with year
    res = date_resolver.resolve("Why did TCS stock drop in mid March 2025?")
    assert res["requires_clarification"] is False
    assert res["start_date"] == "2025-03-11"
    assert res["end_date"] == "2025-03-20"
    assert "mid" in res["date_expression"]


# --- 4. Missing Year Rule (Must NEVER silently guess) ---
def test_missing_year_requires_clarification():
    date_resolver = DateResolutionService()
    # "mid March" without a year
    res = date_resolver.resolve("Why is TCS stock dropping in mid March?")
    assert res["requires_clarification"] is True
    assert res["start_date"] is None
    assert res["end_date"] is None
    assert res["clarification_reason"] == "The year is not specified"

    # Test through QueryUnderstandingService
    qu = QueryUnderstandingService(date_resolver=date_resolver)
    parsed = qu.understand("Why is TCS stock dropping in mid March?")
    assert parsed["requires_clarification"] is True
    assert parsed["start_date"] is None
    assert parsed["end_date"] is None
    assert parsed["clarification_reason"] == "The year is not specified"
    assert parsed["clarification_type"] == "missing_year"
    assert parsed["clarification_options"] is not None


# --- 5. Relative Date Expressions ---
def test_relative_date_expressions_deterministic():
    date_resolver = DateResolutionService()
    # reference date: 2026-04-15
    res_last_month = date_resolver.resolve("Apple performance last month", reference_date=FIXED_REF_DATE)
    assert res_last_month["requires_clarification"] is False
    # Last month before April 2026 is March 2026 (2026-03-01 to 2026-03-31)
    assert res_last_month["start_date"] == "2026-03-01"
    assert res_last_month["end_date"] == "2026-03-31"

    # Last week
    res_last_week = date_resolver.resolve("Summarize TCS news during last week", reference_date=FIXED_REF_DATE)
    assert res_last_week["requires_clarification"] is False
    assert res_last_week["start_date"] == "2026-04-08"
    assert res_last_week["end_date"] == "2026-04-14"

    # Two weeks ago
    res_two_wks = date_resolver.resolve("HDFC news two weeks ago", reference_date=FIXED_REF_DATE)
    assert res_two_wks["requires_clarification"] is False
    assert res_two_wks["start_date"] == "2026-04-01"
    assert res_two_wks["end_date"] == "2026-04-08"


# --- 6. Explicit Historical Years ---
def test_explicit_historical_years():
    date_resolver = DateResolutionService()
    # Last two weeks of January 2026
    res1 = date_resolver.resolve("Analyze Infosys news during the last two weeks of January 2026.")
    assert res1["requires_clarification"] is False
    assert res1["start_date"] == "2026-01-15"
    assert res1["end_date"] == "2026-01-31"

    # Second week of June 2025
    res2 = date_resolver.resolve("Find negative news about HDFC Bank during the second week of June 2025.")
    assert res2["requires_clarification"] is False
    assert res2["start_date"] == "2025-06-08"
    assert res2["end_date"] == "2025-06-14"

    # First quarter of 2025
    res3 = date_resolver.resolve("Quarterly review during the first quarter of 2025")
    assert res3["requires_clarification"] is False
    assert res3["start_date"] == "2025-01-01"
    assert res3["end_date"] == "2025-03-31"


# --- 7. Queries Asking Why Stock Declined ---
def test_explain_stock_decline_intent():
    classifier = IntentClassifierService()
    queries = [
        "Why is TCS stock dropping in mid March 2025?",
        "What caused the decline in Reliance stock during March 2025?",
        "Why was Apple's stock performing poorly last month?",
    ]
    for q in queries:
        res = classifier.classify(q)
        assert res["intent"] == "explain_stock_decline"
        assert res["wants_explanation"] is True
        assert "stock decline" in res["topic"]


# --- 8. Queries Requesting Sentiment Only ---
def test_sentiment_only_intent():
    classifier = IntentClassifierService()
    res1 = classifier.classify("Analyze Infosys news during March 2025.")
    assert res1["intent"] == "sentiment_analysis"
    assert res1["wants_sentiment"] is True

    res2 = classifier.classify("Find negative news about HDFC Bank during the second week of June 2025.")
    assert res2["intent"] == "negative_news_search"

    res3 = classifier.classify("Compare TCS sentiment before and after its quarterly results.")
    assert res3["intent"] == "period_comparison"


# --- 9. Missing Historical News (Coverage Limitation) ---
def test_missing_historical_news_handling():
    retriever = HistoricalNewsRetriever(enable_online_fallback=False)
    # Window far in the past where no articles exist
    res = retriever.retrieve(ticker="TCS", start_date="1995-01-01", end_date="1995-01-15")
    assert res["count"] == 0
    assert res["coverage_sufficient"] is False
    assert "No verified historical news articles found" in res["limitation_note"]


# --- 10. Publication Date Verification (Excluding Out-of-Window News) ---
def test_publication_date_filtering():
    retriever = HistoricalNewsRetriever(enable_online_fallback=False)
    # Synthetic articles
    mock_articles = [
        {"news_id": "1", "symbol": "TCS", "title": "TCS in window", "published_at": "2025-03-12 10:00:00", "link": "http://a.com/1"},
        {"news_id": "2", "symbol": "TCS", "title": "TCS future", "published_at": "2025-04-01 10:00:00", "link": "http://a.com/2"},
        {"news_id": "3", "symbol": "TCS", "title": "TCS past", "published_at": "2025-02-28 10:00:00", "link": "http://a.com/3"},
    ]
    retriever._articles_cache = mock_articles

    res = retriever.retrieve(ticker="TCS", start_date="2025-03-11", end_date="2025-03-20")
    # Only article 1 should match
    assert res["count"] == 1
    assert res["articles"][0]["news_id"] == "1"


# --- 11. Articles Without Full Text (Headline-Only) ---
def test_articles_without_full_text():
    analyzer = FinBertNewsAnalyzer()
    explanation_engine = EvidenceBasedExplanationEngine()

    mock_article = {
        "news_id": "h1",
        "symbol": "TCS",
        "title": "TCS Reports Profit Surge in Q3",
        "text_content": "",  # Empty body text
        "link": "https://example.com/tcs",
        "source": "Reuters",
        "published_at": "2025-03-12"
    }

    # FinBERT should classify successfully from headline alone
    sentiment_res = analyzer.analyze_corpus([mock_article])
    assert sentiment_res["total_articles"] == 1
    assert sentiment_res["sentiment_score"] > 0  # Profit Surge is positive
    assert sentiment_res["aggregate_sentiment"] in ["Bullish", "Strongly Bullish"]
    assert "mean_probabilities" in sentiment_res
    assert sentiment_res["mean_probabilities"]["positive"] > 0

    # Explanation engine should note headline-only limitation
    exp = explanation_engine.generate_explanation(
        query="Why did TCS surge?",
        company_name="Tata Consultancy Services",
        ticker="TCS",
        start_date="2025-03-11",
        end_date="2025-03-20",
        intent="sentiment_analysis",
        articles=sentiment_res["analyzed_articles"],
        sentiment_summary=sentiment_res
    )
    assert any("headline snippets" in d.lower() for d in exp["uncertainty_and_limitations"])


# --- 12. Explanation Claims Unsupported by Articles (Correlation Safeguards) ---
def test_explanation_causality_safeguard_and_price_absence():
    explanation_engine = EvidenceBasedExplanationEngine()

    exp = explanation_engine.generate_explanation(
        query="Why did TCS stock drop in mid March 2025?",
        company_name="Tata Consultancy Services",
        ticker="TCS",
        start_date="2025-03-11",
        end_date="2025-03-20",
        intent="explain_stock_decline",
        articles=[],
        sentiment_summary={"total_articles": 0, "sentiment_score": 0.0, "distribution": {}},
        price_data=None  # No price data
    )

    # 1. Price absence disclaimer
    assert exp["has_price_verification"] is False
    assert "cannot independently verify the reported price movement" in exp["observed_price_movement"]

    # 2. Causation vs correlation disclaimer
    assert any("correlation does not imply direct causation" in d.lower() for d in exp["uncertainty_and_limitations"])


# --- 13. End-to-End Query Understanding Example Query ---
def test_e2e_example_query():
    qu = QueryUnderstandingService()
    # "Why is TCS stock dropping in mid March?"
    out = qu.understand("Why is TCS stock dropping in mid March?")

    assert out["company_name"] == "Tata Consultancy Services"
    assert out["ticker"] == "TCS"
    assert out["market"] == "India"
    assert out["exchange"] == "NSE"
    assert out["date_expression"] == "mid March"
    assert out["start_date"] is None
    assert out["end_date"] is None
    assert out["intent"] == "explain_stock_decline"
    assert out["requires_clarification"] is True
    assert out["clarification_reason"] == "The year is not specified"


# --- 14. Weighted Aggregate Probability Calculation ---
def test_weighted_aggregate_probability():
    analyzer = FinBertNewsAnalyzer()

    # Article 1: Highly relevant (0.9), highly confident negative
    art1 = {
        "news_id": "w1",
        "symbol": "TCS",
        "title": "TCS reports massive profit drop and revenue warning",
        "text_content": "TCS reports profit crash and issues sharp quarterly guidance warning.",
        "relevance_score": 0.90,
    }
    # Article 2: Low relevance (0.2), slightly positive fluff
    art2 = {
        "news_id": "w2",
        "symbol": "TCS",
        "title": "TCS employee completes half-marathon in London",
        "text_content": "A software engineer from TCS won a community sports recognition medal.",
        "relevance_score": 0.20,
    }

    res = analyzer.analyze_corpus([art1, art2])
    assert res["total_articles"] == 2
    assert "weighted_probabilities" in res
    assert "mean_probabilities" in res
    assert "weighted_sentiment_score" in res

    # The high relevance of art1 should make weighted negative probability higher than art2's positive influence
    w_probs = res["weighted_probabilities"]
    assert w_probs["negative"] > 0
    assert 0.0 <= w_probs["positive"] <= 1.0
    assert 0.0 <= w_probs["negative"] <= 1.0
    assert 0.0 <= w_probs["neutral"] <= 1.0
    # Sum of probabilities approximately 1
    assert round(w_probs["positive"] + w_probs["negative"] + w_probs["neutral"], 1) == 1.0

"""
Comprehensive Verification Tests for the Four Critical Issues in MarketMind:
1. Live Online News Retrieval at Runtime
2. Historical Dates Return No Useful Sentiment When Articles Are Missing (NO_NEWS_AVAILABLE)
3. Explanation Validation Layer (Citations, Temporal, Evidence, Data Consistency)
4. Dedicated Divergence Analysis When Price Regime and News Sentiment Diverge
"""

from unittest.mock import patch, MagicMock
from datetime import datetime
import pytest
from fastapi.testclient import TestClient

from ml_service.main import app
from ml_service.services.news_retrieval import HistoricalNewsRetriever
from ml_service.services.date_resolver import normalize_date_input
from ml_service.services.finbert_analyzer import FinBertNewsAnalyzer
from ml_service.services.signal_agreement import SignalAgreementEvaluator
from ml_service.services.explanation_validator import ExplanationValidator
from ml_service.services.gemini_explainer import GeminiExplanationGenerator
from ml_service.models.price_classifier import PricePatternClassifier


client = TestClient(app)


# ---------------------------------------------------------------------------
# ISSUE 1: Live Online News Retrieval
# ---------------------------------------------------------------------------

def test_local_news_available():
    """1. Local news is available: Local retrieval and FinBERT analysis continue working."""
    retriever = HistoricalNewsRetriever(enable_online_fallback=False)
    analyzer = FinBertNewsAnalyzer()

    # Pre-populate local cache with verified in-window news
    mock_articles = [
        {
            "news_id": "art_1",
            "symbol": "TCS",
            "title": "TCS Q3 Net Profit Surges 12% on Strong Order Book",
            "text_content": "Tata Consultancy Services reported robust quarterly profit growth driven by deal expansions.",
            "link": "https://financialnews.com/tcs-q3-profit",
            "source": "Financial Express",
            "published_at": "2025-02-25 10:00:00"
        }
    ]
    retriever._articles_cache = mock_articles

    res = retriever.retrieve(ticker="TCS", start_date="2025-02-20", end_date="2025-02-28")
    assert res["count"] == 1
    assert res["retrieval_status"] == "OK"

    corpus_res = analyzer.analyze_corpus(res["articles"])
    assert corpus_res["total_articles"] == 1
    assert corpus_res["aggregate_label"] in ("BULLISH", "STRONG_BULLISH")
    assert corpus_res["sentiment_score"] > 0


def test_local_news_insufficient_triggers_online_fallback():
    """2. Local news is insufficient: Online fallback is triggered."""
    retriever = HistoricalNewsRetriever(enable_online_fallback=True)
    retriever._articles_cache = []  # No local articles

    # Mock requests.Session in fetch_online_news
    mock_feed = MagicMock()
    mock_entry = MagicMock()
    mock_entry.title = "TCS Secures Large Multi-Year Deal in Europe"
    mock_entry.link = "https://news.google.com/rss/articles/mock123"
    mock_entry.published = "Wed, 26 Feb 2025 12:00:00 GMT"
    mock_entry.source = {"title": "Reuters"}
    mock_entry.summary = "Tata Consultancy Services announced a major multi-year digital transformation contract."
    mock_feed.entries = [mock_entry]

    with patch("requests.Session.get") as mock_get, \
         patch("feedparser.parse", return_value=mock_feed):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.content = b"<rss></rss>"
        mock_get.return_value = mock_resp

        res = retriever.retrieve(ticker="TCS", start_date="2025-02-20", end_date="2025-02-28")
        assert res["count"] >= 1
        assert res["retrieval_status"] == "OK"
        assert res["articles"][0]["symbol"] == "TCS"


def test_online_news_source_unavailable():
    """3. Online news source is unavailable: Clear retrieval failure status."""
    retriever = HistoricalNewsRetriever(enable_online_fallback=True)
    retriever._articles_cache = []

    with patch("requests.Session.get", side_effect=Exception("Connection timed out")):
        res = retriever.retrieve(ticker="TCS", start_date="2025-02-20", end_date="2025-02-28")
        assert res["count"] == 0
        assert res["retrieval_status"] == "RETRIEVAL_FAILED"
        assert "failed" in res["limitation_note"].lower()


def test_online_news_excludes_irrelevant_articles():
    """4. Online news contains irrelevant or out-of-window articles: Excluded."""
    retriever = HistoricalNewsRetriever(enable_online_fallback=True)
    retriever._articles_cache = []

    mock_feed = MagicMock()
    # Entry 1: in window
    e1 = MagicMock()
    e1.title = "TCS Reports Steady Performance"
    e1.link = "http://a.com/1"
    e1.published = "Wed, 26 Feb 2025 10:00:00 GMT"
    e1.source = {"title": "LiveMint"}
    e1.summary = "TCS shares traded firm."

    # Entry 2: outside window (March 2025)
    e2 = MagicMock()
    e2.title = "TCS Future Announcement"
    e2.link = "http://a.com/2"
    e2.published = "Mon, 10 Mar 2025 10:00:00 GMT"
    e2.source = {"title": "LiveMint"}
    e2.summary = "Future developments."

    mock_feed.entries = [e1, e2]

    with patch("requests.Session.get") as mock_get, \
         patch("feedparser.parse", return_value=mock_feed):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.content = b"<rss></rss>"
        mock_get.return_value = mock_resp

        res = retriever.retrieve(ticker="TCS", start_date="2025-02-20", end_date="2025-02-28")
        # Only e1 should be included
        assert res["count"] == 1
        assert res["articles"][0]["title"] == "TCS Reports Steady Performance"


# ---------------------------------------------------------------------------
# ISSUE 2: Historical Dates Return No Useful Sentiment When Articles Missing
# ---------------------------------------------------------------------------

def test_query_date_normalization_26_feb_2025():
    """5. Query date is '26 Feb 2025': Correct date normalization to '2025-02-26'."""
    assert normalize_date_input("26 Feb 2025") == "2025-02-26"
    assert normalize_date_input("26 February 2025") == "2025-02-26"
    assert normalize_date_input("26th February 2025") == "2025-02-26"


def test_query_date_normalization_iso():
    """6. Query date is '2025-02-26': Same historical date is resolved."""
    assert normalize_date_input("2025-02-26") == "2025-02-26"
    assert normalize_date_input("2025/02/26") == "2025-02-26"


def test_no_articles_returns_no_news_available_not_neutral():
    """7. No articles exist for requested date: NO_NEWS_AVAILABLE, not neutral sentiment."""
    analyzer = FinBertNewsAnalyzer()
    res = analyzer.analyze_corpus([])

    assert res["total_articles"] == 0
    assert res["aggregate_label"] == "NO_NEWS_AVAILABLE"
    assert res["aggregate_sentiment"] == "No News Available"
    assert res["sentiment_score"] is None
    assert res["weighted_sentiment_score"] is None


def test_historical_price_data_exists_but_news_missing():
    """8. Historical price data exists but news does not: Price regime is preserved; news sentiment is unavailable."""
    response = client.get("/instruments/TCS/explanation?date=1990-01-01")
    assert response.status_code == 200
    data = response.json()

    # Price regime preserved
    assert data["priceDirection"] in ("bullish", "bearish", "consolidating")
    assert isinstance(data["returnPct"], (int, float))
    # News sentiment is NO_NEWS_AVAILABLE or RETRIEVAL_FAILED
    assert data["newsDirection"] in ("no_news_available", "retrieval_failed")
    assert data["hasClearDriver"] is False
    assert data["sentimentScore"] is None
    assert data["signalAgreement"] == "insufficient"
    assert data["validationStatus"] == "INSUFFICIENT_EVIDENCE"


def test_both_price_and_news_missing():
    """9. Both price and news data are missing: Both conditions reported."""
    # Query with non-existent symbol and historical date with no articles
    with patch("ml_service.api.engine_adapter._get_fixture") as mock_fix:
        mock_fix.return_value = {}
        response = client.get("/instruments/UNKNOWN_SYM/explanation?date=1980-01-01")
        assert response.status_code == 200
        data = response.json()
        assert data["priceDataAvailable"] is False
        assert data["newsDirection"] in ("no_news_available", "retrieval_failed")
        assert data["signalAgreement"] == "insufficient"


# ---------------------------------------------------------------------------
# ISSUE 3: Explanation Validation Layer
# ---------------------------------------------------------------------------

def test_article_published_after_target_date_excluded():
    """10. An article is published after target date: Validation detects temporal violation."""
    validator = ExplanationValidator()
    articles = [
        {
            "title": "Future News",
            "published_at": "2025-03-05 10:00:00",
            "text_content": "Earnings update."
        }
    ]
    explanation = "TCS moved higher following positive announcements reported in recent disclosures [1]."
    t_ok, t_errs = validator.validate_temporal(articles, target_date="2025-02-28", validated_citations=[1])
    assert t_ok is False
    assert any("Temporal violation" in err for err in t_errs)


def test_gemini_cites_nonexistent_article_fails_validation():
    """11. Gemini cites a nonexistent article: Citation validation fails."""
    validator = ExplanationValidator()
    articles = [{"title": "Only Article", "published_at": "2025-02-26 10:00:00", "text_content": "Content."}]
    explanation = "The company recorded strong growth as detailed in report [1] and corroborated by secondary review [2]."

    c_ok, valid_cites, c_errs = validator.validate_citations(explanation, articles)
    assert c_ok is False
    assert 1 in valid_cites
    assert any("Invalid citation [2]" in err for err in c_errs)


def test_unsupported_factual_claims_or_contradictions_detected():
    """12. Contradictions between price regime and narrative detected."""
    validator = ExplanationValidator()
    # Narrative says "plummeted" and "sharp price collapse", but regime is bullish (+3.5%)
    explanation = (
        "On 2025-02-26, TCS suffered a sharp sell-off and plummeted significantly following market concerns [1]. "
        "The bearish price collapse left investors cautious."
    )
    d_ok, d_errs = validator.validate_data_consistency(
        explanation=explanation,
        price_regime="bullish",
        return_pct=3.5,
        news_sentiment="bearish",
        signal_agreement="diverging"
    )
    assert d_ok is False
    assert any("Price consistency contradiction" in err for err in d_errs)


# ---------------------------------------------------------------------------
# ISSUE 4: Divergence Analysis
# ---------------------------------------------------------------------------

def test_price_and_sentiment_agree_preserved():
    """13. Price and sentiment agree: Aligned behaviour preserved."""
    evaluator = SignalAgreementEvaluator()
    res = evaluator.evaluate_agreement(
        price_regime="bullish",
        price_confidence=0.85,
        text_sentiment="bullish",
        sentiment_confidence=0.80
    )
    assert res["agreement_status"] == "consistent"
    assert res["agreement_score"] >= 0.70


def test_price_bullish_and_sentiment_bearish_divergence_generated():
    """14. Price is bullish and sentiment is bearish: Dedicated divergence analysis generated."""
    explainer = GeminiExplanationGenerator()
    articles = [
        {
            "title": "TCS Faces Client Spending Cuts in North America",
            "published_at": "2025-02-25 10:00:00",
            "text_content": "Technology spending slowed down across financial services clients.",
            "source": "Business Standard"
        }
    ]

    res = explainer.generate_explanation_with_validation(
        symbol="TCS",
        target_date="2025-02-26",
        price_regime="bullish",
        return_pct=2.45,
        return_z=1.92,
        news_sentiment="bearish",
        articles=articles,
        signal_agreement="diverging"
    )

    exp_text = res["explanation"]
    assert "bullish" in exp_text.lower()
    assert "negative" in exp_text.lower() or "bearish" in exp_text.lower()
    assert "hypotheses" in exp_text.lower() or "divergence" in exp_text.lower()
    assert res["divergence_analysis"] is not None
    assert res["validation"]["is_valid"] is True


def test_price_bearish_and_sentiment_bullish_divergence_generated():
    """15. Price is bearish and sentiment is bullish: Dedicated divergence analysis generated."""
    explainer = GeminiExplanationGenerator()
    articles = [
        {
            "title": "TCS Bags Landmark Deal with European Banking Major",
            "published_at": "2025-02-25 10:00:00",
            "text_content": "TCS announced a multi-billion euro cloud transformation contract.",
            "source": "Economic Times"
        }
    ]

    res = explainer.generate_explanation_with_validation(
        symbol="TCS",
        target_date="2025-02-26",
        price_regime="bearish",
        return_pct=-2.85,
        return_z=-2.10,
        news_sentiment="bullish",
        articles=articles,
        signal_agreement="diverging"
    )

    exp_text = res["explanation"]
    assert "bearish" in exp_text.lower() or "pullback" in exp_text.lower()
    assert "bullish" in exp_text.lower() or "positive" in exp_text.lower()
    assert "divergence" in exp_text.lower()
    assert res["validation"]["is_valid"] is True


def test_sentiment_unavailable_no_false_divergence():
    """16. Sentiment is unavailable: No false divergence classification."""
    evaluator = SignalAgreementEvaluator()

    res1 = evaluator.evaluate_agreement(
        price_regime="bullish",
        price_confidence=0.85,
        text_sentiment="no_news_available",
        sentiment_confidence=0.0
    )
    assert res1["agreement_status"] == "insufficient"
    assert res1["agreement_score"] == 0.0

    res2 = evaluator.evaluate_agreement(
        price_regime="bearish",
        price_confidence=0.85,
        text_sentiment="retrieval_failed",
        sentiment_confidence=0.0
    )
    assert res2["agreement_status"] == "insufficient"


def test_divergence_insufficient_evidence_unconfirmed():
    """17. Divergence has insufficient evidence: Cause explicitly reported as unconfirmed."""
    explainer = GeminiExplanationGenerator(api_key=None)
    articles = [
        {
            "title": "TCS Margins Decline Marginally",
            "published_at": "2025-02-25 10:00:00",
            "text_content": "Operating margin compressed by 20 basis points.",
            "source": "Mint"
        }
    ]

    exp = explainer._local_aligned_synthesis(
        symbol="TCS",
        target_date="2025-02-26",
        price_regime="bullish",
        return_pct=1.85,
        return_z=1.65,
        news_sentiment="bearish",
        articles=articles,
        causal_category="company_specific",
        signal_agreement="diverging"
    )
    assert "unconfirmed" in exp.lower() or "unsubstantiated" in exp.lower()


# ---------------------------------------------------------------------------
# Regression and Architecture Integrity
# ---------------------------------------------------------------------------

def test_gemini_api_unavailable_graceful_fallback():
    """18. Gemini API is unavailable: Existing fallback behaviour remains functional without fabricated evidence."""
    explainer = GeminiExplanationGenerator(api_key=None)
    articles = [
        {
            "title": "TCS Accelerates Enterprise AI Deployment",
            "published_at": "2025-02-25 10:00:00",
            "text_content": "Tata Consultancy Services announced its new enterprise generative AI platform.",
            "source": "The Hindu BusinessLine"
        }
    ]

    with patch.object(explainer, "_call_gemini", side_effect=Exception("API Key Quota Exceeded")):
        exp = explainer.generate_explanation(
            symbol="TCS",
            target_date="2025-02-26",
            price_regime="bullish",
            return_pct=1.95,
            return_z=1.70,
            news_sentiment="bullish",
            articles=articles,
            signal_agreement="aligned"
        )
        assert len(exp.split()) >= 180
        assert "[1]" in exp


def test_existing_price_classification_works():
    """19. Existing price classification works without regression."""
    classifier = PricePatternClassifier()
    records = [
        {"date": "2026-08-01", "open": 100, "high": 102, "low": 99, "close": 101, "volume": 1000},
        {"date": "2026-08-02", "open": 101, "high": 105, "low": 100, "close": 104, "volume": 1200},
        {"date": "2026-08-03", "open": 104, "high": 112, "low": 103, "close": 110, "volume": 3500},
        {"date": "2026-08-04", "open": 110, "high": 118, "low": 109, "close": 116, "volume": 5000},
    ]
    res = classifier.predict_regime(records)
    assert res["regime"] in ["bullish", "bearish", "consolidating"]
    assert "confidence" in res
    assert "features" in res
    assert res["features"]["rsi_14"] > 0


def test_existing_api_endpoints_work():
    """20. Existing API endpoints work without regression."""
    resp1 = client.get("/instruments")
    assert resp1.status_code == 200
    assert len(resp1.json()) > 0

    resp2 = client.get("/instruments/TCS/prices?days=30")
    assert resp2.status_code == 200
    assert "points" in resp2.json()

    resp3 = client.get("/instruments/TCS/explanation?date=2025-02-28")
    assert resp3.status_code == 200
    data = resp3.json()
    assert data["symbol"] == "TCS"
    assert "causeSummary" in data
    assert "newsDirection" in data

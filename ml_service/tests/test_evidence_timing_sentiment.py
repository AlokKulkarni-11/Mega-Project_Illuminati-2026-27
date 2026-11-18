"""
Comprehensive Deterministic Tests for Evidence Validation, Historical Timing,
Sentiment Reliability, Evidence Sufficiency, and Divergence Analysis in MarketMind.
"""

from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
import pytest

from ml_service.services.explanation_validator import ExplanationValidator
from ml_service.services.news_retrieval import (
    HistoricalNewsRetriever,
    parse_and_convert_to_ist,
    classify_nse_market_timing
)
from ml_service.services.finbert_analyzer import FinBertNewsAnalyzer
from ml_service.services.signal_agreement import SignalAgreementEvaluator
from ml_service.services.gemini_explainer import GeminiExplanationGenerator


# ---------------------------------------------------------------------------
# 1. Evidence Validation Tests
# ---------------------------------------------------------------------------

def test_citation_exists_but_does_not_support_claim():
    """A citation exists but does not support the specific claim made in the text."""
    validator = ExplanationValidator()
    articles = [
        {
            "title": "IT Sector Anticipates Steady Demand Across Banking Clients",
            "published_at": "2025-02-25 10:00:00",
            "text_content": "Technology services firms see stable pipelines in North America.",
            "source": "Mint"
        }
    ]
    # Claim asserts institutional investors dumped TCS shares, but article says nothing about it
    explanation = (
        "On 2025-02-26, institutional investors sold large blocks of TCS shares causing severe distribution [1]. "
        "The market recorded elevated volatility."
    )
    sup, part, unsup, cont, errs = validator.validate_claims(
        explanation=explanation,
        articles=articles,
        validated_citations=[1],
        target_date="2025-02-26"
    )
    assert len(unsup) >= 1
    assert any("institutional" in e.lower() for e in errs)


def test_unsupported_institutional_selling_claim_rejected():
    """An unsupported institutional-selling claim is identified as unsupported."""
    validator = ExplanationValidator()
    articles = [
        {
            "title": "TCS Launches New AI Innovation Lab in Hyderabad",
            "published_at": "2025-02-25 11:00:00",
            "text_content": "TCS inaugurates a state-of-the-art center to develop generative AI solutions.",
            "source": "Economic Times"
        }
    ]
    explanation = (
        "TCS fell sharply as foreign institutional books dumped equity holdings following risk aversion [1]. "
        "FIIs dumped massive quantities during the trading session."
    )
    sup, part, unsup, cont, errs = validator.validate_claims(
        explanation=explanation,
        articles=articles,
        validated_citations=[1],
        target_date="2025-02-26"
    )
    assert len(unsup) >= 1
    assert any("institutional" in err.lower() for err in errs)


def test_claim_contradicting_cited_article_rejected():
    """A claim that directly contradicts what the cited source says is rejected."""
    validator = ExplanationValidator()
    articles = [
        {
            "title": "TCS Q3 Net Profit Surges 12% on Record Deal Wins",
            "published_at": "2025-02-25 12:00:00",
            "text_content": "Operating profit grew substantially with strong margin expansion.",
            "source": "Business Standard"
        }
    ]
    # Sentence claims profit declined and missed estimates
    explanation = "TCS underperformed after quarterly profit fell and margins contracted sharply [1]."
    sup, part, unsup, cont, errs = validator.validate_claims(
        explanation=explanation,
        articles=articles,
        validated_citations=[1],
        target_date="2025-02-26"
    )
    assert len(cont) >= 1
    assert any("Contradicted claim" in err for err in errs)


def test_supported_claim_with_valid_citation_passes():
    """A factual claim directly supported by the cited article passes validation."""
    validator = ExplanationValidator()
    articles = [
        {
            "title": "TCS Secures Multi-Million Dollar Deal with European Bank",
            "published_at": "2025-02-25 10:00:00",
            "text_content": "Tata Consultancy Services announced a major multi-year digital transformation contract.",
            "source": "Reuters"
        }
    ]
    explanation = "TCS advanced after announcing a major digital transformation contract with a European bank [1]."
    sup, part, unsup, cont, errs = validator.validate_claims(
        explanation=explanation,
        articles=articles,
        validated_citations=[1],
        target_date="2025-02-26"
    )
    assert len(sup) >= 1
    assert len(cont) == 0


# ---------------------------------------------------------------------------
# 2. Historical Timing and No-Look-Ahead Tests
# ---------------------------------------------------------------------------

def test_article_published_after_target_date_excluded():
    """Articles published strictly after target date are rejected by temporal check."""
    validator = ExplanationValidator()
    articles = [
        {
            "title": "Future Analyst Report",
            "published_at": "2025-03-01 10:00:00",
            "text_content": "Future analysis."
        }
    ]
    is_ok, errs = validator.validate_temporal(articles, target_date="2025-02-26", validated_citations=[1])
    assert is_ok is False
    assert any("Temporal violation" in e for e in errs)


def test_article_published_after_market_close_cannot_cause_daytime_move():
    """An article published after market close on target date cannot be claimed to cause daytime decline."""
    validator = ExplanationValidator()
    articles = [
        {
            "title": "TCS Faces Brokerage Downgrade in Evening Note",
            "published_at": "2025-02-26 18:30:00",  # Post 15:30 IST
            "text_content": "Brokerage downgrades TCS stock after the closing bell.",
            "timing_category": "after_market_close",
            "is_after_market_close": True
        }
    ]
    explanation = "The stock dropped during the day because a brokerage downgrade directly drove the decline [1]."
    sup, part, unsup, cont, errs = validator.validate_claims(
        explanation=explanation,
        articles=articles,
        validated_citations=[1],
        target_date="2025-02-26"
    )
    assert len(unsup) >= 1
    assert any("market close" in e.lower() for e in errs)


def test_missing_timestamps_do_not_cause_invented_timing():
    """Date-only strings (without hours) are marked unknown_timing and do not invent times."""
    dt, has_time = parse_and_convert_to_ist("2025-02-26")
    assert has_time is False
    timing = classify_nse_market_timing(dt, has_time, target_date_str="2025-02-26")
    assert timing == "unknown_timing"


def test_timezone_conversion_gmt_to_ist():
    """Publication time in GMT is properly converted to IST (+05:30)."""
    # 12:00:00 GMT on 26 Feb = 17:30:00 IST on 26 Feb (after market close at 15:30 IST)
    dt_ist, has_time = parse_and_convert_to_ist("Wed, 26 Feb 2025 12:00:00 GMT")
    assert has_time is True
    assert dt_ist.hour == 17
    assert dt_ist.minute == 30
    timing = classify_nse_market_timing(dt_ist, has_time, target_date_str="2025-02-26")
    assert timing == "after_market_close"

    # 03:00:00 GMT on 26 Feb = 08:30:00 IST on 26 Feb (before market open at 09:15 IST)
    dt_morning, has_time_m = parse_and_convert_to_ist("Wed, 26 Feb 2025 03:00:00 GMT")
    assert dt_morning.hour == 8
    assert dt_morning.minute == 30
    timing_m = classify_nse_market_timing(dt_morning, has_time_m, target_date_str="2025-02-26")
    assert timing_m == "before_market_open"


# ---------------------------------------------------------------------------
# 3. Sentiment Quality Tests
# ---------------------------------------------------------------------------

def test_duplicate_articles_do_not_inflate_sentiment():
    """Near-duplicate syndicated articles are consolidated and do not multiply sentiment weight."""
    retriever = HistoricalNewsRetriever(enable_online_fallback=False)
    raw_articles = [
        {
            "news_id": "art_1",
            "title": "TCS Q3 Net Profit Surges 12% on Strong Order Book",
            "link": "https://source1.com/tcs-q3",
            "source": "Express",
            "published_at": "2025-02-25 10:00:00"
        },
        {
            "news_id": "art_2",
            "title": "TCS Q3 Net Profit Surges 12% with Strong Order Book Gains",
            "link": "https://source2.com/tcs-q3-duplicate",
            "source": "Syndicated Wire",
            "published_at": "2025-02-25 10:05:00"
        }
    ]
    deduped = retriever.deduplicate(raw_articles)
    assert len(deduped) == 1
    assert deduped[0]["syndicated_count"] == 2


def test_irrelevant_company_mentions_classified_as_weak():
    """Articles with only a fleeting passing mention in a general list are classified as weak_or_irrelevant."""
    retriever = HistoricalNewsRetriever()
    relevance = retriever.classify_article_relevance(
        title="Top 50 Nifty Stocks Summary for February",
        text_content="Markets remained mixed today across auto, energy, and telecom sectors. Stocks like TCS, INFY, RELIANCE, HDFC, and ICICI traded in narrow ranges with no major corporate updates.",
        ticker="TCS"
    )
    assert relevance in ("weak_or_irrelevant", "sector_industry")


def test_sector_news_distinguished_from_company_specific():
    """Sector-wide commentary is categorized as sector_industry rather than company_direct."""
    retriever = HistoricalNewsRetriever()
    relevance = retriever.classify_article_relevance(
        title="Indian IT Services Sector Sees Cloud Deal Momentum",
        text_content="Software and tech export services are experiencing steady pipeline expansions across North America as firms adopt digital transformation.",
        ticker="TCS"
    )
    assert relevance == "sector_industry"


def test_balanced_positive_and_negative_evidence_identified_as_conflicting():
    """When both positive and negative articles are balanced, sentiment is classified as CONFLICTING."""
    analyzer = FinBertNewsAnalyzer()
    articles = [
        {
            "title": "TCS Secures Large Multi-Year Deal in Europe",
            "text_content": "Strong revenue growth and deal expansion reported.",
            "relevance_score": 0.8,
            "relevance_category": "company_direct"
        },
        {
            "title": "TCS Margin Squeeze Alarms Investors as Operating Costs Surge",
            "text_content": "Substantial profit decline and wage headwinds threaten operating margins.",
            "relevance_score": 0.8,
            "relevance_category": "company_direct"
        }
    ]
    res = analyzer.analyze_corpus(articles)
    assert res["is_conflicting"] is True
    assert res["aggregate_label"] == "CONFLICTING"
    assert "Conflicting" in res["aggregate_sentiment"]


def test_insufficient_relevant_evidence_produces_insufficient_result():
    """Empty article set returns NO_NEWS_AVAILABLE without forcing neutral score."""
    analyzer = FinBertNewsAnalyzer()
    res = analyzer.analyze_corpus([])
    assert res["aggregate_label"] == "NO_NEWS_AVAILABLE"
    assert res["sentiment_score"] is None


# ---------------------------------------------------------------------------
# 4. Retrieval Reliability and Evidence Sufficiency Tests
# ---------------------------------------------------------------------------

def test_retrieval_distinguishes_sparse_from_sufficient_evidence():
    """Retriever marks exactly 1 article as sparse evidence and 2+ direct as sufficient."""
    retriever = HistoricalNewsRetriever(enable_online_fallback=False)
    retriever._articles_cache = [
        {
            "news_id": "art_1",
            "symbol": "TCS",
            "title": "TCS Q3 Results Announced",
            "text_content": "Company reports operational performance.",
            "link": "https://example.com/1",
            "published_at": "2025-02-25 10:00:00"
        }
    ]
    res_single = retriever.retrieve(ticker="TCS", start_date="2025-02-20", end_date="2025-02-26")
    assert res_single["evidence_sufficiency"] == "sparse"

    retriever._articles_cache.append({
        "news_id": "art_2",
        "symbol": "TCS",
        "title": "TCS Signs Major Contract with UK Bank",
        "text_content": "Multi-year deal signed.",
        "link": "https://example.com/2",
        "published_at": "2025-02-25 14:00:00"
    })
    res_multi = retriever.retrieve(ticker="TCS", start_date="2025-02-20", end_date="2025-02-26")
    assert res_multi["evidence_sufficiency"] == "sufficient"


def test_honest_abstention_wording_when_news_missing():
    """Missing news generates the honest disclaimer rather than asserting no news existed."""
    retriever = HistoricalNewsRetriever(enable_online_fallback=False)
    retriever._articles_cache = []
    res = retriever.retrieve(ticker="UNKNOWN_TICKER", start_date="2025-02-20", end_date="2025-02-26")
    assert res["retrieval_status"] == "NO_NEWS_AVAILABLE"
    assert "No sufficient, verified news evidence was found in the sources searched" in res["limitation_note"]
    assert "This does not establish that no relevant news existed" in res["limitation_note"]


# ---------------------------------------------------------------------------
# 5. Divergence Analysis Tests
# ---------------------------------------------------------------------------

def test_divergence_labels_unverified_hypotheses_explicitly():
    """Divergence synthesis explicitly uses the [Unverified Hypothesis] label."""
    explainer = GeminiExplanationGenerator(api_key=None)
    articles = [
        {
            "title": "TCS Faces Margin Contraction in North America",
            "text_content": "Margins compressed due to delayed decision-making.",
            "published_at": "2025-02-25 10:00:00",
            "source": "Business Line"
        }
    ]
    exp = explainer._local_aligned_synthesis(
        symbol="TCS",
        target_date="2025-02-26",
        price_regime="bullish",
        return_pct=2.1,
        return_z=1.8,
        news_sentiment="bearish",
        articles=articles,
        causal_category="company_specific",
        signal_agreement="diverging"
    )
    assert "[Unverified Hypothesis" in exp
    assert "unconfirmed" in exp.lower() or "unsubstantiated" in exp.lower()


def test_missing_news_does_not_count_as_divergence():
    """Missing news produces an insufficient state, not a divergence."""
    evaluator = SignalAgreementEvaluator()
    res = evaluator.evaluate_agreement(
        price_regime="bullish",
        price_confidence=0.85,
        text_sentiment="no_news_available",
        sentiment_confidence=0.0
    )
    assert res["agreement_status"] == "insufficient"
    assert res["agreement_status"] != "divergent"


# ---------------------------------------------------------------------------
# 6. Word Count Flexibility and Fallback Tests
# ---------------------------------------------------------------------------

def test_word_count_allows_concise_explanations_when_evidence_sparse():
    """When evidence is sparse, concise explanations do not trigger validation failure."""
    validator = ExplanationValidator()
    articles = [
        {
            "title": "TCS Brief Notice",
            "published_at": "2025-02-25 10:00:00",
            "text_content": "TCS held a board meeting."
        }
    ]
    # Short 45-word explanation without artificial padding
    short_explanation = (
        "On 2025-02-26, TCS traded in a consolidating price regime. "
        "A brief disclosure \"TCS Brief Notice\" [1] was reported in the press. "
        "Because only limited evidence was retrieved, reliable causal drivers cannot be established."
    )
    val = validator.validate(
        explanation=short_explanation,
        articles=articles,
        target_date="2025-02-26",
        price_regime="consolidating",
        return_pct=0.1,
        news_sentiment="neutral",
        signal_agreement="ambiguous",
        evidence_sufficiency="sparse"
    )
    assert val["is_valid"] is True
    assert val["validation_status"] in ("VALID", "PARTIALLY_VALID")
    assert not any("below recommended minimum" in err for err in val["validation_errors"])


def test_fit_word_count_no_filler_when_allow_short_is_true():
    """_fit_word_count does not append boilerplate filler when allow_short is True."""
    concise = "TCS recorded a small pullback. News coverage was limited to a brief announcement [1]."
    fitted = GeminiExplanationGenerator._fit_word_count(concise, min_words=200, max_words=250, allow_short=True)
    assert fitted == concise
    assert "broader sector dynamics" not in fitted

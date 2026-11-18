"""
ml_service/tests/test_gemini_explainer.py
Tests for GeminiExplanationGenerator service.
"""
from ml_service.services.gemini_explainer import GeminiExplanationGenerator


def test_local_synthesis_fallback():
    generator = GeminiExplanationGenerator(api_key=None)
    articles = [
        {
            "title": "TCS signs mega cloud modernization deal with European retailer",
            "source": "Moneycontrol",
            "published_at": "2025-11-25",
            "text_content": "TCS expanded its IT infrastructure contract covering cloud architecture."
        },
        {
            "title": "IT sector momentum lifts tech equities",
            "source": "Economic Times",
            "published_at": "2025-11-24",
            "text_content": "Strong order book updates boosted IT sector equities."
        }
    ]

    result = generator.generate_aligned_explanation(
        symbol="TCS",
        target_date="2025-11-26",
        price_regime="bullish",
        return_pct=1.85,
        return_z=2.15,
        news_sentiment="bullish",
        articles=articles,
        causal_category="company-specific"
    )

    assert isinstance(result, str)
    assert len(result) > 40
    assert "TCS" in result
    assert "rallied" in result or "1.85" in result
    assert "[1]" in result


def test_empty_articles_fallback():
    generator = GeminiExplanationGenerator(api_key=None)
    result = generator.generate_aligned_explanation(
        symbol="NIFTYBANK",
        target_date="2026-02-01",
        price_regime="bearish",
        return_pct=-2.1,
        return_z=-2.3,
        news_sentiment="bearish",
        articles=[]
    )
    assert "NIFTYBANK" in result
    assert "no specific corroborating news" in result.lower()

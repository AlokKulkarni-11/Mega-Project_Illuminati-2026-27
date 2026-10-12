import pytest
from ml_service.services.rag_engine import TimeConstrainedRAGEngine


def test_rag_engine_time_constraint_retrieval():
    engine = TimeConstrainedRAGEngine()

    # Query for TATASTEEL on 2026-08-03
    res = engine.synthesize_explanation(
        symbol="TATASTEEL",
        movement_date="2026-08-03",
        price_regime="bullish",
        price_confidence=0.85
    )

    assert res["symbol"] == "TATASTEEL"
    assert res["abstain"] is False
    assert res["evidence_count"] > 0
    # Confirm no citation has publication date after 2026-08-03
    for cite in res["citations"]:
        assert cite["published_at"][:10] <= "2026-08-03"


def test_rag_engine_abstention_on_no_prior_evidence():
    engine = TimeConstrainedRAGEngine()

    # Query for a symbol with no prior news on an early date
    res = engine.synthesize_explanation(
        symbol="UNKNOWN_TICKER",
        movement_date="2020-01-01",
        price_regime="bearish"
    )

    assert res["abstain"] is True
    assert "Insufficient" in res["explanation"]
    assert len(res["citations"]) == 0

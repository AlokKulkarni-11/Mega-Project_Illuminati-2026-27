from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException

from ml_service.api.schemas import (
    PriceRegimeRequest, PriceRegimeResponse,
    SentimentCausalRequest, SentimentCausalResponse,
    SignalAgreementRequest, SignalAgreementResponse,
    RAGSynthesisRequest, RAGSynthesisResponse,
    QueryUnderstandRequest, QueryUnderstandResponse,
    QueryAnalysisRequest, QueryAnalysisResponse,
    SentimentSummary, SentimentDistribution,
    ExplanationDetails, CitationItem
)
from ml_service.models.price_classifier import PricePatternClassifier
from ml_service.models.sentiment_causal_classifier import FinBertSentimentCausalClassifier
from ml_service.services.signal_agreement import SignalAgreementEvaluator
from ml_service.services.rag_engine import TimeConstrainedRAGEngine

from ml_service.services.query_understanding import QueryUnderstandingService
from ml_service.services.news_retrieval import HistoricalNewsRetriever
from ml_service.services.finbert_analyzer import FinBertNewsAnalyzer
from ml_service.services.explanation_engine import EvidenceBasedExplanationEngine

# Main API router (handles both /api/v1/... and top-level /api/...)
router = APIRouter(tags=["MarketMind ML Microservice"])

price_classifier = PricePatternClassifier()
sentiment_classifier = FinBertSentimentCausalClassifier()
agreement_evaluator = SignalAgreementEvaluator()
rag_engine = TimeConstrainedRAGEngine()

query_service = QueryUnderstandingService()
news_retriever = HistoricalNewsRetriever()
finbert_analyzer = FinBertNewsAnalyzer()
explanation_engine = EvidenceBasedExplanationEngine()


def _parse_ref_date(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        return datetime.strptime(dt_str[:10], "%Y-%m-%d")
    except Exception:
        return None


# --- Legacy / Internal ML Microservice Endpoints ---

@router.post("/api/v1/predict/price-regime", response_model=PriceRegimeResponse)
def predict_price_regime(request: PriceRegimeRequest):
    """Predicts stock regime (bullish/bearish/consolidating) from OHLCV array."""
    records = [rec.model_dump() for rec in request.ohlcv_records]
    result = price_classifier.predict_regime(records)
    return PriceRegimeResponse(
        symbol=request.symbol,
        regime=result["regime"],
        confidence=result["confidence"],
        anomalous=result["anomalous"],
        return_zscore=result["return_zscore"],
        volume_zscore=result["volume_zscore"],
        features=result["features"]
    )


@router.post("/api/v1/analyze/sentiment-causal", response_model=SentimentCausalResponse)
def analyze_sentiment_causal(request: SentimentCausalRequest):
    """Predicts sentiment and causal category for financial text."""
    result = sentiment_classifier.analyze_text(request.text)
    return SentimentCausalResponse(**result)


@router.post("/api/v1/evaluate/signal-agreement", response_model=SignalAgreementResponse)
def evaluate_signal_agreement(request: SignalAgreementRequest):
    """Evaluates alignment between price movement and news sentiment."""
    result = agreement_evaluator.evaluate_agreement(
        price_regime=request.price_regime,
        price_confidence=request.price_confidence,
        text_sentiment=request.text_sentiment,
        sentiment_confidence=request.sentiment_confidence
    )
    return SignalAgreementResponse(**result)


@router.post("/api/v1/rag/synthesize-explanation", response_model=RAGSynthesisResponse)
def synthesize_explanation(request: RAGSynthesisRequest):
    """Executes time-constrained RAG, returning cited explanation or explicit abstention."""
    result = rag_engine.synthesize_explanation(
        symbol=request.symbol,
        movement_date=request.movement_date,
        price_regime=request.price_regime or "bullish",
        price_confidence=request.price_confidence or 0.85,
        query_context=request.query_context or ""
    )
    return RAGSynthesisResponse(**result)


# --- Natural-Language Stock News Analysis Endpoints ---

@router.post("/api/query/understand", response_model=QueryUnderstandResponse)
@router.post("/api/v1/query/understand", response_model=QueryUnderstandResponse)
def understand_natural_language_query(request: QueryUnderstandRequest):
    """
    Query Understanding Service:
    Extracts structured company, stock, temporal, topic, and intent metadata from
    natural-language queries, detecting missing years and ambiguity.
    """
    ref_dt = _parse_ref_date(request.reference_date)
    understanding = query_service.understand(request.query, reference_date=ref_dt)
    return QueryUnderstandResponse(**understanding)


@router.post("/api/analysis/query", response_model=QueryAnalysisResponse)
@router.post("/api/v1/analysis/query", response_model=QueryAnalysisResponse)
def analyze_natural_language_query(request: QueryAnalysisRequest):
    """
    End-to-End Natural-Language Stock News Analysis:
    Validates query interpretation, retrieves historical articles, executes FinBERT
    probability inference, computes aggregate sentiment, and generates an evidence-grounded explanation.
    """
    ref_dt = _parse_ref_date(request.reference_date)

    # 1. Parse or validate confirmed interpretation
    if request.confirmed_interpretation:
        conf = request.confirmed_interpretation
        # Backend validation: check ticker and date boundaries rather than blindly trusting client
        stock_match = query_service.stock_resolver.resolve(conf.ticker)
        canonical_ticker = stock_match["ticker"] if stock_match["resolved"] else conf.ticker.upper()
        company_name = conf.company_name or stock_match.get("company_name") or canonical_ticker

        # Date validation
        try:
            s_dt = datetime.strptime(conf.start_date[:10], "%Y-%m-%d")
            e_dt = datetime.strptime(conf.end_date[:10], "%Y-%m-%d")
            if s_dt > e_dt:
                raise ValueError("start_date cannot be after end_date")
            start_date_str = conf.start_date[:10]
            end_date_str = conf.end_date[:10]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid date format or range: {e}")

        # Construct validated interpretation
        interpretation = {
            "original_query": request.query,
            "company_name": company_name,
            "ticker": canonical_ticker,
            "market": conf.market or stock_match.get("market") or "India",
            "exchange": conf.exchange or stock_match.get("exchange") or "NSE",
            "date_expression": f"{start_date_str} to {end_date_str}",
            "start_date": start_date_str,
            "end_date": end_date_str,
            "time_expression_confidence": 1.0,
            "search_keywords": [canonical_ticker, company_name],
            "topic": ["financial performance", "stock movement"],
            "intent": conf.intent or "sentiment_analysis",
            "requires_clarification": False,
            "clarification_reason": None,
            "clarification_type": None,
            "clarification_options": None,
            "stock_candidates": None,
        }
    else:
        # Run full query understanding
        interpretation = query_service.understand(request.query, reference_date=ref_dt)

        if interpretation.get("requires_clarification"):
            # Return interpretation with clarification request
            empty_dist = SentimentDistribution(
                positive=0, negative=0, neutral=0,
                positive_pct=0.0, negative_pct=0.0, neutral_pct=0.0
            )
            empty_summary = SentimentSummary(
                total_articles=0,
                sentiment_score=0.0,
                aggregate_sentiment="Neutral",
                aggregate_label="NEUTRAL",
                mean_probabilities={"positive": 0.0, "negative": 0.0, "neutral": 0.0},
                distribution=empty_dist,
                model_version=FinBertNewsAnalyzer.MODEL_VERSION
            )
            empty_exp = ExplanationDetails(
                observed_price_movement="Awaiting user clarification before retrieving historical records.",
                has_price_verification=False,
                negative_news_found="Clarification required.",
                potential_explanations=[],
                uncertainty_and_limitations=[f"Clarification needed: {interpretation.get('clarification_reason')}"],
                citations=[],
                total_citations=0
            )
            return QueryAnalysisResponse(
                query=request.query,
                query_interpretation=QueryUnderstandResponse(**interpretation),
                sentiment_summary=empty_summary,
                aggregate_sentiment="Neutral",
                aggregate_label="NEUTRAL",
                explanation=empty_exp,
                coverage_sufficient=False,
                limitation_note=interpretation.get("clarification_reason")
            )

    ticker = interpretation["ticker"]
    company_name = interpretation["company_name"] or ticker
    start_date = interpretation["start_date"]
    end_date = interpretation["end_date"]
    intent = interpretation["intent"]

    # 2. Historical News Retrieval & Verification
    retrieval_res = news_retriever.retrieve(
        ticker=ticker,
        start_date=start_date,
        end_date=end_date,
        keywords=interpretation.get("search_keywords", []),
        top_k=15
    )
    raw_articles = retrieval_res["articles"]

    # 3. Fine-Tuned FinBERT Analysis & Aggregation
    sentiment_res = finbert_analyzer.analyze_corpus(raw_articles)
    analyzed_articles = sentiment_res["analyzed_articles"]

    # 4. Evidence-Based Explanation Synthesis
    explanation_res = explanation_engine.generate_explanation(
        query=request.query,
        company_name=company_name,
        ticker=ticker,
        start_date=start_date,
        end_date=end_date,
        intent=intent,
        articles=analyzed_articles,
        sentiment_summary=sentiment_res,
        price_data=None  # will be enriched when OHLCV is supplied
    )

    sentiment_dist = SentimentDistribution(**sentiment_res["distribution"])
    sentiment_summary = SentimentSummary(
        total_articles=sentiment_res["total_articles"],
        sentiment_score=sentiment_res["sentiment_score"],
        weighted_sentiment_score=sentiment_res.get("weighted_sentiment_score"),
        aggregate_sentiment=sentiment_res.get("aggregate_sentiment", "Neutral"),
        aggregate_label=sentiment_res.get("aggregate_label", "NEUTRAL"),
        mean_probabilities=sentiment_res.get("mean_probabilities"),
        weighted_probabilities=sentiment_res.get("weighted_probabilities"),
        distribution=sentiment_dist,
        model_version=sentiment_res["model_version"]
    )

    citations = [CitationItem(**c) for c in explanation_res["citations"]]
    explanation_details = ExplanationDetails(
        observed_price_movement=explanation_res["observed_price_movement"],
        has_price_verification=explanation_res["has_price_verification"],
        negative_news_found=explanation_res["negative_news_found"],
        potential_explanations=explanation_res["potential_explanations"],
        uncertainty_and_limitations=explanation_res["uncertainty_and_limitations"],
        citations=citations,
        total_citations=explanation_res["total_citations"]
    )

    return QueryAnalysisResponse(
        query=request.query,
        query_interpretation=QueryUnderstandResponse(**interpretation),
        sentiment_summary=sentiment_summary,
        aggregate_sentiment=sentiment_res.get("aggregate_sentiment", "Neutral"),
        aggregate_label=sentiment_res.get("aggregate_label", "NEUTRAL"),
        weighted_sentiment_score=sentiment_res.get("weighted_sentiment_score"),
        weighted_probabilities=sentiment_res.get("weighted_probabilities"),
        explanation=explanation_details,
        coverage_sufficient=retrieval_res["coverage_sufficient"],
        limitation_note=retrieval_res.get("limitation_note"),
        retrieval_mode=retrieval_res.get("retrieval_mode", "local"),
        retrieval_status=retrieval_res.get("retrieval_status", "OK"),
        retrieval_timestamp=retrieval_res.get("retrieval_timestamp"),
        evidence_sufficiency=retrieval_res.get("evidence_sufficiency", "sufficient"),
        succeeded_sources=retrieval_res.get("succeeded_sources", []),
        failed_sources=retrieval_res.get("failed_sources", []),
        is_incomplete=retrieval_res.get("is_incomplete", False),
        fetched_count=retrieval_res.get("fetched_count", len(raw_articles)),
        unique_count=retrieval_res.get("unique_count", len(raw_articles)),
        relevant_count=retrieval_res.get("relevant_count", len(raw_articles))
    )

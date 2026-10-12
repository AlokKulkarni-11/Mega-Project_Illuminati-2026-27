from fastapi import APIRouter, HTTPException
from ml_service.api.schemas import (
    PriceRegimeRequest, PriceRegimeResponse,
    SentimentCausalRequest, SentimentCausalResponse,
    SignalAgreementRequest, SignalAgreementResponse,
    RAGSynthesisRequest, RAGSynthesisResponse
)
from ml_service.models.price_classifier import PricePatternClassifier
from ml_service.models.sentiment_causal_classifier import FinBertSentimentCausalClassifier
from ml_service.services.signal_agreement import SignalAgreementEvaluator
from ml_service.services.rag_engine import TimeConstrainedRAGEngine

router = APIRouter(prefix="/api/v1", tags=["MarketMind ML Microservice"])

price_classifier = PricePatternClassifier()
sentiment_classifier = FinBertSentimentCausalClassifier()
agreement_evaluator = SignalAgreementEvaluator()
rag_engine = TimeConstrainedRAGEngine()


@router.post("/predict/price-regime", response_model=PriceRegimeResponse)
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


@router.post("/analyze/sentiment-causal", response_model=SentimentCausalResponse)
def analyze_sentiment_causal(request: SentimentCausalRequest):
    """Predicts sentiment and causal category for financial text."""
    result = sentiment_classifier.analyze_text(request.text)
    return SentimentCausalResponse(**result)


@router.post("/evaluate/signal-agreement", response_model=SignalAgreementResponse)
def evaluate_signal_agreement(request: SignalAgreementRequest):
    """Evaluates alignment between price movement and news sentiment."""
    result = agreement_evaluator.evaluate_agreement(
        price_regime=request.price_regime,
        price_confidence=request.price_confidence,
        text_sentiment=request.text_sentiment,
        sentiment_confidence=request.sentiment_confidence
    )
    return SignalAgreementResponse(**result)


@router.post("/rag/synthesize-explanation", response_model=RAGSynthesisResponse)
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

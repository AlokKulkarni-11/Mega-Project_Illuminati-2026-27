from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class OHLCVRecord(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: float


class PriceRegimeRequest(BaseModel):
    symbol: str
    ohlcv_records: List[OHLCVRecord]


class TechnicalFeatures(BaseModel):
    rsi_14: float
    macd: float
    macd_signal: float
    sma_20: float
    last_close: float


class PriceRegimeResponse(BaseModel):
    symbol: str
    regime: str  # bullish | bearish | consolidating
    confidence: float
    anomalous: bool
    return_zscore: float
    volume_zscore: float
    features: TechnicalFeatures


class SentimentCausalRequest(BaseModel):
    text: str
    symbol: Optional[str] = None


class SentimentCausalResponse(BaseModel):
    sentiment: str  # bullish | bearish | neutral
    sentiment_confidence: float
    causal_category: str  # earnings | regulatory | geopolitical | macroeconomic | sector-specific | company-specific
    causal_confidence: float
    keywords_detected: List[str]


class SignalAgreementRequest(BaseModel):
    price_regime: str
    price_confidence: float
    text_sentiment: str
    sentiment_confidence: float


class SignalAgreementResponse(BaseModel):
    agreement_status: str  # consistent | divergent | ambiguous
    agreement_score: float
    overall_confidence: float
    explanation: str


class CitationItem(BaseModel):
    id: Optional[str] = None
    title: str
    source: str
    published_at: str
    relevance_score: float
    snippet: str


class RAGSynthesisRequest(BaseModel):
    symbol: str
    movement_date: str  # YYYY-MM-DD or ISO timestamp
    price_regime: Optional[str] = "bullish"
    price_confidence: Optional[float] = 0.85
    query_context: Optional[str] = ""


class RAGSynthesisResponse(BaseModel):
    symbol: str
    movement_date: str
    price_regime: str
    abstain: bool
    explanation: str
    confidence_score: float
    primary_causal_category: str
    citations: List[CitationItem]
    evidence_count: int

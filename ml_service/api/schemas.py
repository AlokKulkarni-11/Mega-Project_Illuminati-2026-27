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
    news_id: Optional[str] = None
    title: str
    source: str
    published_at: str
    relevance_score: Optional[float] = 0.5
    link: Optional[str] = None
    sentiment: Optional[str] = None
    confidence: Optional[float] = None
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


# --- Natural-Language Stock News Analysis API Schemas ---

class QueryUnderstandRequest(BaseModel):
    query: str
    reference_date: Optional[str] = None  # YYYY-MM-DD for deterministic testing


class ClarificationOption(BaseModel):
    label: Optional[str] = None
    year: Optional[int] = None
    company_name: Optional[str] = None
    ticker: Optional[str] = None
    exchange: Optional[str] = None


class QueryUnderstandResponse(BaseModel):
    original_query: str
    company_name: Optional[str] = None
    ticker: Optional[str] = None
    market: Optional[str] = None
    exchange: Optional[str] = None
    date_expression: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    time_expression_confidence: float = 0.0
    search_keywords: List[str] = []
    topic: List[str] = []
    intent: str
    requires_clarification: bool
    clarification_reason: Optional[str] = None
    clarification_type: Optional[str] = None
    clarification_options: Optional[List[Dict[str, Any]]] = None
    stock_candidates: Optional[List[Dict[str, Any]]] = None


class ConfirmedInterpretation(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    start_date: str
    end_date: str
    intent: Optional[str] = "sentiment_analysis"
    market: Optional[str] = "India"
    exchange: Optional[str] = "NSE"


class QueryAnalysisRequest(BaseModel):
    query: str
    confirmed_interpretation: Optional[ConfirmedInterpretation] = None
    reference_date: Optional[str] = None


class SentimentDistribution(BaseModel):
    positive: int
    negative: int
    neutral: int
    positive_pct: float
    negative_pct: float
    neutral_pct: float


class SentimentSummary(BaseModel):
    total_articles: int
    sentiment_score: Optional[float] = None
    weighted_sentiment_score: Optional[float] = None
    aggregate_sentiment: str = "Neutral"
    aggregate_label: str = "NEUTRAL"
    mean_probabilities: Optional[Dict[str, float]] = None
    weighted_probabilities: Optional[Dict[str, float]] = None
    distribution: SentimentDistribution
    model_version: str



class ExplanationDetails(BaseModel):
    observed_price_movement: str
    has_price_verification: bool
    negative_news_found: str
    potential_explanations: List[str]
    uncertainty_and_limitations: List[str]
    citations: List[CitationItem]
    total_citations: int


class QueryAnalysisResponse(BaseModel):
    query: str
    query_interpretation: QueryUnderstandResponse
    sentiment_summary: SentimentSummary
    aggregate_sentiment: str = "Neutral"
    aggregate_label: str = "NEUTRAL"
    weighted_sentiment_score: Optional[float] = None
    weighted_probabilities: Optional[Dict[str, float]] = None
    explanation: ExplanationDetails
    coverage_sufficient: bool
    limitation_note: Optional[str] = None
    retrieval_mode: Optional[str] = "local"
    retrieval_status: Optional[str] = "OK"
    retrieval_timestamp: Optional[str] = None
    evidence_sufficiency: Optional[str] = "sufficient"
    succeeded_sources: Optional[List[str]] = None
    failed_sources: Optional[List[str]] = None
    is_incomplete: Optional[bool] = False
    fetched_count: Optional[int] = 0
    unique_count: Optional[int] = 0
    relevant_count: Optional[int] = 0


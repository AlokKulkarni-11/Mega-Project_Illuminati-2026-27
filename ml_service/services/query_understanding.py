"""
Query Understanding Service
---------------------------
Core orchestration service for natural language query interpretation.
Extracts structured entity, temporal, intent, and topical metadata from user questions:
- Company Name, Stock Ticker, Market, and Exchange (via StockResolutionService)
- Date Range and Time Expression (via DateResolutionService)
- Intent (explain_stock_decline, sentiment_analysis, comparison, etc. via IntentClassifierService)
- Topics & Search Keywords
- Clarification Requirements (Missing year, Ambiguous company, Event date required)

Supports deterministic clocks for testing.
"""

from datetime import datetime
from typing import Dict, Any, Optional, List

from ml_service.services.stock_resolver import StockResolutionService
from ml_service.services.date_resolver import DateResolutionService
from ml_service.services.intent_classifier import IntentClassifierService


class QueryUnderstandingService:
    """
    Parses and interprets natural language stock analysis queries into structured representations.
    """

    def __init__(
        self,
        stock_resolver: Optional[StockResolutionService] = None,
        date_resolver: Optional[DateResolutionService] = None,
        intent_classifier: Optional[IntentClassifierService] = None
    ):
        self.stock_resolver = stock_resolver or StockResolutionService()
        self.date_resolver = date_resolver or DateResolutionService()
        self.intent_classifier = intent_classifier or IntentClassifierService()

    def understand(
        self,
        query: str,
        reference_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Parses the natural language query into a structured understanding object.
        """
        if not query or not query.strip():
            return {
                "original_query": query,
                "company_name": None,
                "ticker": None,
                "market": None,
                "exchange": None,
                "date_expression": None,
                "start_date": None,
                "end_date": None,
                "time_expression_confidence": 0.0,
                "search_keywords": [],
                "topic": [],
                "intent": "sentiment_analysis",
                "requires_clarification": True,
                "clarification_reason": "Query is empty",
                "clarification_type": "empty_query",
                "clarification_options": None
            }

        # 1. Resolve Stock / Company
        stock_res = self.stock_resolver.resolve(query)

        # 2. Resolve Dates / Time Expressions
        date_res = self.date_resolver.resolve(query, reference_date=reference_date)

        # 3. Classify Intent and Extract Topics
        intent_res = self.intent_classifier.classify(query)

        # 4. Determine Clarification Requirements
        requires_clarification = False
        clarification_reason = None
        clarification_type = None
        clarification_options = None

        if stock_res.get("is_ambiguous"):
            requires_clarification = True
            clarification_reason = stock_res.get("message")
            clarification_type = "ambiguous_stock"
            clarification_options = [
                {"company_name": c["company_name"], "ticker": c["ticker"], "exchange": c["exchange"]}
                for c in stock_res.get("candidates", [])
            ]
        elif not stock_res.get("resolved"):
            requires_clarification = True
            clarification_reason = "No recognized stock ticker or company name found in the query."
            clarification_type = "missing_stock"
        elif date_res.get("requires_clarification"):
            requires_clarification = True
            clarification_reason = date_res.get("clarification_reason")
            clarification_type = date_res.get("clarification_type")
            if clarification_type == "missing_year":
                current_year = (reference_date or datetime.now()).year
                clarification_options = [
                    {"label": f"{current_year}", "year": current_year},
                    {"label": f"{current_year - 1}", "year": current_year - 1},
                    {"label": f"{current_year - 2}", "year": current_year - 2},
                ]

        # Combine keywords
        keywords = list(intent_res.get("search_keywords", []))
        if stock_res.get("ticker") and stock_res.get("ticker") not in keywords:
            keywords.insert(0, stock_res["ticker"])

        return {
            "original_query": query,
            "company_name": stock_res.get("company_name"),
            "ticker": stock_res.get("ticker"),
            "market": stock_res.get("market"),
            "exchange": stock_res.get("exchange"),
            "date_expression": date_res.get("date_expression"),
            "start_date": date_res.get("start_date"),
            "end_date": date_res.get("end_date"),
            "time_expression_confidence": date_res.get("time_expression_confidence", 0.0),
            "search_keywords": keywords,
            "topic": intent_res.get("topic", []),
            "intent": intent_res.get("intent", "sentiment_analysis"),
            "requires_clarification": requires_clarification,
            "clarification_reason": clarification_reason,
            "clarification_type": clarification_type,
            "clarification_options": clarification_options,
            "stock_candidates": stock_res.get("candidates") if stock_res.get("is_ambiguous") else None,
        }

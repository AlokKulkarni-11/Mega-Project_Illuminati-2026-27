import unittest
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ml_service.tests.test_price_classifier import test_price_classifier_bullish_regime, test_price_classifier_empty_input
from ml_service.tests.test_sentiment_causal import test_sentiment_causal_bullish_earnings, test_sentiment_causal_bearish_regulatory
from ml_service.tests.test_rag_engine import test_rag_engine_time_constraint_retrieval, test_rag_engine_abstention_on_no_prior_evidence
from ml_service.tests.test_natural_language_pipeline import (
    test_company_name_and_ticker_resolution,
    test_ambiguous_stock_symbols,
    test_mid_month_date_resolution,
    test_missing_year_requires_clarification,
    test_relative_date_expressions_deterministic,
    test_explicit_historical_years,
    test_explain_stock_decline_intent,
    test_sentiment_only_intent,
    test_missing_historical_news_handling,
    test_publication_date_filtering,
    test_articles_without_full_text,
    test_explanation_causality_safeguard_and_price_absence,
    test_e2e_example_query,
)
from ml_service.tests.test_natural_language_api import (
    test_api_query_understand_missing_year,
    test_api_query_understand_with_year,
    test_api_analysis_query_unclarified_returns_clarification_prompt,
    test_api_analysis_query_confirmed_executes_pipeline,
)


class TestMarketMindMLService(unittest.TestCase):

    # Price Regime & Causal Baseline Tests
    def test_price_classifier_bullish(self):
        test_price_classifier_bullish_regime()

    def test_price_classifier_empty(self):
        test_price_classifier_empty_input()

    def test_sentiment_causal_bullish(self):
        test_sentiment_causal_bullish_earnings()

    def test_sentiment_causal_bearish(self):
        test_sentiment_causal_bearish_regulatory()

    def test_rag_engine_time_constraint(self):
        test_rag_engine_time_constraint_retrieval()

    def test_rag_engine_abstention(self):
        test_rag_engine_abstention_on_no_prior_evidence()

    # Core Feature: Natural-Language Stock News Analysis Tests
    def test_nl_company_ticker_resolution(self):
        test_company_name_and_ticker_resolution()

    def test_nl_ambiguous_stock(self):
        test_ambiguous_stock_symbols()

    def test_nl_mid_month_resolution(self):
        test_mid_month_date_resolution()

    def test_nl_missing_year_rule(self):
        test_missing_year_requires_clarification()

    def test_nl_relative_dates(self):
        test_relative_date_expressions_deterministic()

    def test_nl_explicit_years(self):
        test_explicit_historical_years()

    def test_nl_explain_decline(self):
        test_explain_stock_decline_intent()

    def test_nl_sentiment_only(self):
        test_sentiment_only_intent()

    def test_nl_missing_news(self):
        test_missing_historical_news_handling()

    def test_nl_pub_date_filtering(self):
        test_publication_date_filtering()

    def test_nl_articles_without_full_text(self):
        test_articles_without_full_text()

    def test_nl_explanation_causality_safeguards(self):
        test_explanation_causality_safeguard_and_price_absence()

    def test_nl_e2e_example(self):
        test_e2e_example_query()

    # API Endpoint Tests
    def test_nl_api_query_understand_missing_year(self):
        test_api_query_understand_missing_year()

    def test_nl_api_query_understand_with_year(self):
        test_api_query_understand_with_year()

    def test_nl_api_analysis_unclarified(self):
        test_api_analysis_query_unclarified_returns_clarification_prompt()

    def test_nl_api_analysis_confirmed(self):
        test_api_analysis_query_confirmed_executes_pipeline()


if __name__ == "__main__":
    unittest.main()

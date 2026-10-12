import unittest
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ml_service.tests.test_price_classifier import test_price_classifier_bullish_regime, test_price_classifier_empty_input
from ml_service.tests.test_sentiment_causal import test_sentiment_causal_bullish_earnings, test_sentiment_causal_bearish_regulatory
from ml_service.tests.test_rag_engine import test_rag_engine_time_constraint_retrieval, test_rag_engine_abstention_on_no_prior_evidence


class TestMarketMindMLService(unittest.TestCase):

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


if __name__ == "__main__":
    unittest.main()

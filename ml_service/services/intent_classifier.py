"""
Query Intent Classifier Service
--------------------------------
Classifies natural language stock queries into core financial intents:
- explain_stock_decline: "Why did TCS stock drop in mid March?", "What caused the decline..."
- sentiment_analysis: "Analyze Infosys news during March 2025"
- positive_news_search: "Show positive news about NVIDIA..."
- negative_news_search: "Find negative news about HDFC Bank..."
- period_comparison: "Compare TCS sentiment before and after..."
- stock_news_summary: "Summarize important news during last week..."

Also extracts relevant financial topics and search keywords from the query.
"""

import re
from typing import Dict, Any, List, Tuple


DECLINE_TRIGGERS = [
    r"\bwhy\s+(?:is|did|was|are)\b.*?\b(?:drop|dropping|dropped|fell|falling|fall|decline|declining|declined|crash|crashing|down|poorly|slump|plunge)\b",
    r"\bwhat\s+caused\s+(?:the\s+)?(?:decline|drop|fall|slump|crash|loss)\b",
    r"\bwhy\s+was\b.*?\bperforming\s+poorly\b",
    r"\breason\s+for\s+(?:decline|drop|fall)\b",
]

COMPARISON_TRIGGERS = [
    r"\bcompare\b",
    r"\bbefore\s+and\s+after\b",
    r"\bversus\b|\bvs\b",
    r"\bdifference\s+between\b",
]

POSITIVE_TRIGGERS = [
    r"\bshow\s+positive\b",
    r"\bfind\s+positive\b",
    r"\bpositive\s+news\b",
    r"\bbullish\s+news\b",
    r"\bgood\s+news\b",
]

NEGATIVE_TRIGGERS = [
    r"\bfind\s+negative\b",
    r"\bshow\s+negative\b",
    r"\bnegative\s+news\b",
    r"\bbearish\s+news\b",
    r"\bbad\s+news\b",
]

SUMMARY_TRIGGERS = [
    r"\bsummarize\b",
    r"\bsummary\b",
    r"\boverview\b",
    r"\bdigest\b",
    r"\bhighlights\b",
]

SENTIMENT_TRIGGERS = [
    r"\banalyze\b.*?\b(?:sentiment|news)\b",
    r"\bsentiment\b",
    r"\bmarket\s+mood\b",
]

TOPIC_PATTERNS = {
    "stock decline": [r"\bdrop\b", r"\bdecline\b", r"\bfall\b", r"\bcrash\b", r"\bdown\b", r"\bpoorly\b", r"\bslump\b"],
    "negative news": [r"\bnegative\b", r"\bbad\b", r"\bbearish\b", r"\bconcern\b", r"\brisk\b", r"\bpenalty\b"],
    "positive news": [r"\bpositive\b", r"\bgood\b", r"\bbullish\b", r"\bgain\b", r"\brally\b", r"\bgrowth\b"],
    "financial performance": [r"\bquarterly\b", r"\bresults\b", r"\bearnings\b", r"\bfinancial\b", r"\brevenue\b", r"\bprofit\b"],
    "regulatory & compliance": [r"\bsebi\b", r"\brbi\b", r"\bcourt\b", r"\bpenalty\b", r"\btax\b", r"\binvestigation\b", r"\bpolicy\b"],
    "management & governance": [r"\bceo\b", r"\bmanagement\b", r"\bboard\b", r"\bresign\b", r"\bappoint\b", r"\bfraud\b"],
    "mergers & acquisitions": [r"\bacquisition\b", r"\bmerger\b", r"\bstake\b", r"\bdeal\b", r"\bipo\b"],
}


class IntentClassifierService:
    """
    Classifies user financial query intents and extracts topics & keywords.
    """

    def classify(self, query: str) -> Dict[str, Any]:
        q_lower = query.lower()

        # 1. Determine Intent
        intent = "sentiment_analysis"  # default
        intent_confidence = 0.80

        # Check Decline / Causality
        is_decline = any(re.search(pat, q_lower) for pat in DECLINE_TRIGGERS)
        if is_decline:
            intent = "explain_stock_decline"
            intent_confidence = 0.95
        # Check Comparison
        elif any(re.search(pat, q_lower) for pat in COMPARISON_TRIGGERS):
            intent = "period_comparison"
            intent_confidence = 0.92
        # Check Both Positive and Negative
        elif any(re.search(pat, q_lower) for pat in POSITIVE_TRIGGERS) and any(re.search(pat, q_lower) for pat in NEGATIVE_TRIGGERS):
            intent = "sentiment_analysis"
            intent_confidence = 0.90
        # Check Positive
        elif any(re.search(pat, q_lower) for pat in POSITIVE_TRIGGERS):
            intent = "positive_news_search"
            intent_confidence = 0.92
        # Check Negative
        elif any(re.search(pat, q_lower) for pat in NEGATIVE_TRIGGERS):
            intent = "negative_news_search"
            intent_confidence = 0.92
        # Check Summary
        elif any(re.search(pat, q_lower) for pat in SUMMARY_TRIGGERS):
            intent = "stock_news_summary"
            intent_confidence = 0.90
        # Explicit sentiment check
        elif any(re.search(pat, q_lower) for pat in SENTIMENT_TRIGGERS):
            intent = "sentiment_analysis"
            intent_confidence = 0.90

        # 2. Extract Topics
        detected_topics = []
        for topic, patterns in TOPIC_PATTERNS.items():
            if any(re.search(pat, q_lower) for pat in patterns):
                detected_topics.append(topic)

        if not detected_topics:
            if intent == "explain_stock_decline":
                detected_topics = ["stock decline", "negative news", "financial performance"]
            else:
                detected_topics = ["financial performance", "market news"]

        # 3. Extract Search Keywords
        # Remove common query stop words
        stop_words = {
            "why", "is", "did", "was", "are", "what", "caused", "the", "in", "during",
            "about", "show", "find", "analyze", "compare", "for", "from", "and", "or",
            "its", "a", "an", "at", "to", "of", "stock", "news"
        }
        words = re.findall(r"\b[A-Za-z0-9\-]+\b", query)
        keywords = [w for w in words if w.lower() not in stop_words and len(w) > 1]

        return {
            "intent": intent,
            "intent_confidence": intent_confidence,
            "topic": detected_topics,
            "search_keywords": keywords,
            "wants_explanation": intent == "explain_stock_decline",
            "wants_comparison": intent == "period_comparison",
            "wants_sentiment": intent in ["sentiment_analysis", "positive_news_search", "negative_news_search"]
        }

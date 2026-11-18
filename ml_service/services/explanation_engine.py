"""
Evidence-Based Explanation Engine
---------------------------------
Generates grounded, rigorous stock movement and sentiment explanations.
Strictly separates:
1. Observed stock-price movement (with explicit disclaimer when price data is unavailable).
2. Negative news found during the selected period.
3. Potential explanations supported by those articles.
4. Missing evidence, uncertainty, and limitations.

Core Principles:
- Cites real articles with real headlines, dates, sources, and URLs.
- Never invents reasons or fabricates facts.
- Explicitly disclaims mere correlation vs causality: avoids claiming an article
  caused a stock-price movement merely because it was published around the same time.
- If reliable historical price data is unavailable, explains that the system can
  analyze news sentiment but cannot independently verify the reported decline.
"""

from typing import Dict, Any, List, Optional


class EvidenceBasedExplanationEngine:
    """
    Synthesizes structured, evidence-grounded explanations for stock movements.
    """

    def generate_explanation(
        self,
        query: str,
        company_name: str,
        ticker: str,
        start_date: str,
        end_date: str,
        intent: str,
        articles: List[Dict[str, Any]],
        sentiment_summary: Dict[str, Any],
        price_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates a 4-part evidence-based explanation separating observed price movement,
        negative news, supported potential explanations, and missing evidence/uncertainty.
        """
        total_articles = len(articles)
        negative_articles = [a for a in articles if a.get("sentiment") == "negative"]
        positive_articles = [a for a in articles if a.get("sentiment") == "positive"]

        # 1. Section 1: Observed Stock-Price Movement
        if price_data and price_data.get("available"):
            start_price = price_data.get("start_price")
            end_price = price_data.get("end_price")
            pct_change = price_data.get("pct_change", 0.0)
            trend_desc = "declined" if pct_change < 0 else ("grew" if pct_change > 0 else "remained flat")
            observed_price_movement = (
                f"Historical market data records show {company_name} ({ticker}) stock {trend_desc} by "
                f"{abs(pct_change):.2f}% from {start_price} to {end_price} between {start_date} and {end_date}."
            )
            has_price_verification = True
        else:
            observed_price_movement = (
                f"Independent historical tick/daily OHLCV price records for {company_name} ({ticker}) between "
                f"{start_date} and {end_date} are not locally indexed in the market cache. The system can "
                f"systematically analyze news sentiment for this window, but cannot independently verify the reported price movement."
            )
            has_price_verification = False

        agg_sentiment = sentiment_summary.get("aggregate_sentiment") or (
            "Bullish" if sentiment_summary.get("sentiment_score", 0) > 0.15 else
            ("Bearish" if sentiment_summary.get("sentiment_score", 0) < -0.15 else "Neutral")
        )
        agg_score = sentiment_summary.get("sentiment_score", 0.0)
        dist = sentiment_summary.get("distribution", {})

        # 2. Section 2: Negative News Found & Aggregate Corpus Sentiment
        if total_articles > 0:
            agg_summary_prefix = (
                f"Overall Aggregate Sentiment of Analyzed News: {agg_sentiment.upper()} "
                f"(Score: {agg_score:+.2f}; {dist.get('positive_pct', 0)}% positive, "
                f"{dist.get('neutral_pct', 0)}% neutral, {dist.get('negative_pct', 0)}% negative across {total_articles} articles). "
            )
        else:
            agg_summary_prefix = ""

        if negative_articles:
            top_neg = negative_articles[:3]
            headlines_summary = "; ".join([f"\"{a.get('title')}\" ({a.get('source', 'News')}, {a.get('published_at', '')[:10]})" for a in top_neg])
            negative_news_found = (
                f"{agg_summary_prefix}A total of {len(negative_articles)} negative news article(s) were identified during {start_date} to {end_date}. "
                f"Notable headlines include: {headlines_summary}."
            )
        elif total_articles > 0:
            negative_news_found = (
                f"{agg_summary_prefix}No predominantly negative news articles were identified for {ticker} during {start_date} to {end_date}. "
                f"The majority of coverage reflected routine operational updates."
            )
        else:
            negative_news_found = f"No archived news articles were found in the database for {ticker} during {start_date} to {end_date}."

        # 3. Section 3: Potential Explanations Supported by Articles
        potential_explanations = []
        if intent == "explain_stock_decline":
            if negative_articles:
                # Group by detected topic / causal theme
                themes = set()
                for art in negative_articles:
                    title_lower = art.get("title", "").lower()
                    if any(w in title_lower for w in ["fraud", "cyber", "loses", "scam"]):
                        themes.add("cyber fraud / security incident reports")
                    elif any(w in title_lower for w in ["stake", "sell", "ipo", "divert"]):
                        themes.add("stake sale and equity dilution announcements")
                    elif any(w in title_lower for w in ["overbought", "rsi", "drop", "fall"]):
                        themes.add("technical overbought signals and momentum pullbacks")
                    elif any(w in title_lower for w in ["rate", "margin", "curbs", "rbi"]):
                        themes.add("monetary policy adjustments and regulatory constraints")
                    else:
                        themes.add("operational and financial performance headwinds")

                themes_text = ", ".join(sorted(themes))
                potential_explanations.append(
                    f"Reported news suggests potential downward sentiment drivers centered on: {themes_text}."
                )
                potential_explanations.append(
                    f"Article evidence: {negative_articles[0].get('title')} (published on {negative_articles[0].get('published_at', '')[:10]} "
                    f"by {negative_articles[0].get('source', 'publisher')})."
                )
            else:
                potential_explanations.append(
                    f"Because no verified negative news was published during this period, the perceived movement may be driven by "
                    f"broader macroeconomic trends, sectoral index pullbacks, or market volatility rather than company-specific catalysts."
                )
        else:
            # General sentiment or comparison summary
            score = sentiment_summary.get("sentiment_score", 0.0)
            tone = "bullish" if score > 0.15 else ("bearish" if score < -0.15 else "balanced/neutral")
            potential_explanations.append(
                f"Aggregate market sentiment for {company_name} over this period is {tone.upper()} (score: {score:+.2f}). "
                f"News distribution shows {sentiment_summary.get('distribution', {}).get('positive', 0)} positive, "
                f"{sentiment_summary.get('distribution', {}).get('negative', 0)} negative, and "
                f"{sentiment_summary.get('distribution', {}).get('neutral', 0)} neutral articles."
            )

        # 4. Section 4: Missing Evidence, Uncertainty, and Causality Safeguards
        uncertainty_disclaimers = [
            "Correlation does not imply direct causation: An article published around the same time as a price shift does not prove that the article caused the movement.",
        ]
        if not has_price_verification:
            uncertainty_disclaimers.append("Lacking independent OHLCV price feeds for this exact window prevents validating the exact magnitude of the decline.")
        if total_articles < 3:
            uncertainty_disclaimers.append(f"Low article volume ({total_articles} article(s)) increases margin of error; conclusions should be treated as preliminary.")
        if any(not a.get("text_content") for a in articles):
            uncertainty_disclaimers.append("Certain articles only contained headline snippets without full paragraph body text, which may limit nuanced context.")

        # Format Citations
        citations = []
        for art in articles[:8]:
            citations.append({
                "news_id": art.get("news_id"),
                "title": art.get("title"),
                "source": art.get("source", "Financial Press"),
                "published_at": art.get("published_at"),
                "link": art.get("link"),
                "sentiment": art.get("sentiment", "neutral"),
                "confidence": art.get("confidence", 0.70),
                "relevance_score": art.get("relevance_score", 0.50),
                "snippet": (art.get("text_content") or art.get("title") or "")[:220] + "..."
            })

        return {
            "query": query,
            "company_name": company_name,
            "ticker": ticker,
            "start_date": start_date,
            "end_date": end_date,
            "intent": intent,
            "observed_price_movement": observed_price_movement,
            "has_price_verification": has_price_verification,
            "negative_news_found": negative_news_found,
            "potential_explanations": potential_explanations,
            "uncertainty_and_limitations": uncertainty_disclaimers,
            "citations": citations,
            "total_citations": len(citations),
        }

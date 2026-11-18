"""
test_dummy_query.py
Runs a fast dummy query to test the 200-250 word explanation generator
without external network delays or API rate limits.
"""

from ml_service.services.gemini_explainer import GeminiExplanationGenerator

def main():
    print("=" * 65)
    print("MarketMind Causal Explanation Generator - Dummy Query Test")
    print("=" * 65)

    explainer = GeminiExplanationGenerator()

    # 1. Dummy Stock Parameters
    symbol = "BANKNIFTY"
    target_date = "2025-11-26"
    price_regime = "bullish"
    return_pct = 1.45
    return_z = 2.30
    news_sentiment = "bullish"
    causal_category = "macroeconomic"

    # 2. Dummy News Articles (Simulated Financial Media)
    dummy_articles = [
        {
            "title": "RBI keeps repo rate unchanged at 6.5%, highlighting resilient banking sector liquidity",
            "source": "The Economic Times",
            "published_at": "2025-11-26T09:30:00Z",
            "text_content": "The central bank held rates steady, citing solid capital adequacy ratios and accelerating credit expansion across private and public lenders."
        },
        {
            "title": "Institutional desks pour fresh capital into banking majors amid record credit growth numbers",
            "source": "Moneycontrol",
            "published_at": "2025-11-26T12:45:00Z",
            "text_content": "Foreign portfolio investors and domestic institutions absorbed supply aggressively, pushing banking stocks to record session highs."
        }
    ]

    print(f"\n[1] Running Dummy Query for {symbol} on {target_date}...")
    print(f"    Quantitative Signal : Return {return_pct:+.2f}%, z-score: {return_z:+.2f} ({price_regime.upper()})")
    print(f"    Qualitative Signal  : FinBERT News Sentiment ({news_sentiment.upper()})")
    print(f"    Agreement State     : ALIGNED\n")

    # Generate explanation
    explanation = explainer.generate_aligned_explanation(
        symbol=symbol,
        target_date=target_date,
        price_regime=price_regime,
        return_pct=return_pct,
        return_z=return_z,
        news_sentiment=news_sentiment,
        articles=dummy_articles,
        causal_category=causal_category
    )

    print("=" * 65)
    print("GENERATED ELABORATED EXPLANATION:")
    print("=" * 65)
    print(explanation)
    print("=" * 65)

    word_count = len(explanation.split())
    print(f"\nTotal Word Count: {word_count} words (Target: 200 - 250 words)")

    if 200 <= word_count <= 250:
        print("[SUCCESS] Word count is precisely within the 200 to 250 words range.")
    else:
        print(f"[NOTICE] Word count is {word_count} words.")

if __name__ == "__main__":
    main()

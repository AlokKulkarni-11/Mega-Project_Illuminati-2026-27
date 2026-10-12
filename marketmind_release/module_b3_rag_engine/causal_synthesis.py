"""
causal_synthesis.py

Module B3 — Signal Fusion + RAG Causal Synthesis

WHAT THIS DOES, IN PLAIN TERMS:
  1. Given a stock and a detected anomaly window (start_date, end_date),
     search the news_embeddings table for articles that are:
       a) semantically similar to a query about that stock/sector, AND
       b) published BEFORE OR DURING the anomaly window — never after.
          This "time filter" is the single most important line of logic
          in this whole file: it's what stops the system from citing
          news that came out AFTER the price move as if it caused it
          (hindsight bias).
  2. Combines that retrieved news with the price regime (from B1) and
     sentiment (from B2) into one context block.
  3. Sends that context to an LLM with strict instructions: cite sources,
     rank evidence strength, and EXPLICITLY SAY "no strong driver found"
     if the evidence is weak — never invent a confident-sounding story.

REQUIREMENTS: pip install psycopg2-binary anthropic sentence-transformers
"""

import os
import json
from datetime import date, timedelta

import psycopg2
from anthropic import Anthropic
from sentence_transformers import SentenceTransformer

DB_CONFIG = {
    "host": "localhost",
    "dbname": "marketmind",
    "user": "marketmind_app",
    "password": os.environ.get("DB_PASSWORD", "CHANGE_ME"),
}

EMBEDDING_MODEL_NAME = "BAAI/bge-base-en-v1.5"  # must match what generate_embeddings.py used
LOOKBACK_DAYS = 10       # how far before the anomaly window to search for news
TOP_K_ARTICLES = 6       # max articles to retrieve for context

client = Anthropic()  # reads ANTHROPIC_API_KEY from environment
embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)


# ----------------------------------------------------------------------------
# STEP 1 — Time-aligned retrieval (the hindsight-bias-prevention step)
# ----------------------------------------------------------------------------

def retrieve_relevant_articles(conn, instrument_symbol, sector_name, anomaly_start, anomaly_end):
    """
    Retrieves news articles that are:
      - published no later than anomaly_end (hard cutoff — this is the
        rule that prevents hindsight bias)
      - published no earlier than LOOKBACK_DAYS before anomaly_start
        (we don't want ancient, irrelevant news either)
      - either mention this instrument by symbol OR are tagged with its
        sector (catches sector-wide causes, not just company-specific news)
      - ranked by semantic similarity to a query about "why is this stock
        moving" using the embeddings already computed by generate_embeddings.py

    Returns a list of dicts: {id, title, source, published_at, raw_text}
    """
    query_text = f"reasons for {instrument_symbol} stock price movement, {sector_name} sector news"
    query_embedding = embedding_model.encode(query_text).tolist()

    lookback_start = anomaly_start - timedelta(days=LOOKBACK_DAYS)

    sql = """
        SELECT a.id, a.title, a.source, a.published_at, a.raw_text,
               (e.embedding <=> %s::vector) AS distance
        FROM news_articles a
        JOIN news_embeddings e ON e.article_id = a.id
        WHERE a.published_at::date <= %s
          AND a.published_at::date >= %s
          AND (
                %s = ANY(a.entities)
                OR %s = ANY(a.sector_tags)
              )
        ORDER BY distance ASC
        LIMIT %s;
    """
    with conn.cursor() as cur:
        cur.execute(sql, (
            query_embedding, anomaly_end, lookback_start,
            instrument_symbol, sector_name, TOP_K_ARTICLES,
        ))
        rows = cur.fetchall()

    articles = [
        {
            "id": r[0], "title": r[1], "source": r[2],
            "published_at": r[3].strftime("%Y-%m-%d"), "raw_text": r[4],
        }
        for r in rows
    ]
    return articles


# ----------------------------------------------------------------------------
# STEP 2 — Build the causal synthesis prompt
# ----------------------------------------------------------------------------

SYNTHESIS_SYSTEM_PROMPT = """You are a financial research assistant explaining why a stock moved, \
using ONLY the retrieved articles provided. Follow these rules strictly:

1. Cite every claim using the article's number, e.g. [1], [2].
2. If the retrieved articles do not clearly support a specific cause, say so explicitly: \
"No strong driver was identified in the available news for this window." Do NOT invent a \
plausible-sounding explanation when evidence is weak.
3. Distinguish market-wide/sector-wide causes from company-specific causes if the context \
indicates which one applies.
4. Keep the explanation to 2-4 sentences. Do not speculate about future price movement — \
only explain the move that already happened.
5. Mention the price regime and sentiment signals only as supporting context, not as the \
cause themselves — the cause must come from the cited articles.
"""

def build_user_prompt(instrument_symbol, price_regime, sentiment_summary, signal_agreement, articles):
    if not articles:
        article_block = "(No relevant articles found in the time-filtered search.)"
    else:
        article_block = "\n\n".join(
            f"[{i+1}] {a['title']} — {a['source']}, {a['published_at']}\n{a['raw_text'][:600]}"
            for i, a in enumerate(articles)
        )

    return f"""Stock: {instrument_symbol}
Price regime (from statistical + ML model): {price_regime}
Aggregate news sentiment (from fine-tuned BERT model): {sentiment_summary}
Signal agreement between price and sentiment: {signal_agreement}

Retrieved articles (published before or during the price move — nothing after):
{article_block}

Explain why {instrument_symbol} moved, following the system rules exactly."""


# ----------------------------------------------------------------------------
# STEP 3 — Call the LLM and get the cited explanation
# ----------------------------------------------------------------------------

def generate_explanation(instrument_symbol, price_regime, sentiment_summary,
                          signal_agreement, articles):
    user_prompt = build_user_prompt(
        instrument_symbol, price_regime, sentiment_summary, signal_agreement, articles
    )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        system=SYNTHESIS_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    explanation_text = response.content[0].text

    # Confidence heuristic: more corroborating sources + tighter agreement = higher confidence.
    # This is intentionally simple and explainable, not a hidden black-box score.
    if not articles:
        confidence = "low"
    elif len(articles) >= 3 and signal_agreement == "aligned":
        confidence = "high"
    elif len(articles) >= 1:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "explanation": explanation_text,
        "confidence": confidence,
        "cited_articles": articles,  # save these to explanation_sources table, in order
    }


# ----------------------------------------------------------------------------
# STEP 4 — End-to-end example (this is what the live app calls per query)
# ----------------------------------------------------------------------------

def explain_stock_move(instrument_symbol, sector_name, anomaly_start, anomaly_end,
                        price_regime, sentiment_summary, signal_agreement):
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        articles = retrieve_relevant_articles(
            conn, instrument_symbol, sector_name, anomaly_start, anomaly_end
        )
        result = generate_explanation(
            instrument_symbol, price_regime, sentiment_summary, signal_agreement, articles
        )
        return result
    finally:
        conn.close()


if __name__ == "__main__":
    # Example call — replace with real values once B1/B2 outputs and the DB are live
    result = explain_stock_move(
        instrument_symbol="TCS",
        sector_name="IT",
        anomaly_start=date(2026, 9, 15),
        anomaly_end=date(2026, 9, 19),
        price_regime="bearish (z-score -2.6)",
        sentiment_summary="68% bearish across 41 articles",
        signal_agreement="aligned",
    )
    print(json.dumps(result, indent=2, default=str))

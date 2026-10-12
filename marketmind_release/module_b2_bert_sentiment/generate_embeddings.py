"""
generate_embeddings.py

Runs once a day (via cron / scheduled task). Finds news articles that
don't have an embedding yet, generates embeddings for them, saves them
back to the database. Skips anything already done — safe to run daily
forever without redoing work.

Model: BAAI/bge-base-en-v1.5 (768-dim) — downloaded once, runs locally,
no API calls, no per-request cost.
"""

import psycopg2
from psycopg2.extras import execute_values
from sentence_transformers import SentenceTransformer

DB_CONFIG = {
    "host": "localhost",
    "dbname": "marketmind",
    "user": "marketmind_app",
    "password": "CHANGE_ME",   # pull from env var in real deployment, not hardcoded
}

MODEL_NAME = "BAAI/bge-base-en-v1.5"
BATCH_SIZE = 32  # how many articles we embed at once — bigger batches are faster per-article


def fetch_articles_without_embeddings(conn):
    """
    The core trick: LEFT JOIN news_articles to news_embeddings and only
    keep rows where no embedding exists yet (embedding.id IS NULL).
    This is what makes the job safe to run daily without reprocessing
    everything — it only ever looks at what's new.
    """
    query = """
        SELECT a.id, a.title, a.raw_text
        FROM news_articles a
        LEFT JOIN news_embeddings e ON e.article_id = a.id
        WHERE e.id IS NULL
          AND a.raw_text IS NOT NULL
        ORDER BY a.published_at DESC;
    """
    with conn.cursor() as cur:
        cur.execute(query)
        return cur.fetchall()  # list of (id, title, raw_text)


def save_embeddings(conn, article_ids, embeddings):
    """
    Bulk-insert all new embeddings in one database round-trip instead
    of one INSERT per article — much faster for a few thousand rows.
    """
    rows = [
        (article_id, embedding.tolist(), MODEL_NAME)
        for article_id, embedding in zip(article_ids, embeddings)
    ]
    query = """
        INSERT INTO news_embeddings (article_id, embedding, model_name)
        VALUES %s
        ON CONFLICT (article_id) DO NOTHING;
    """
    with conn.cursor() as cur:
        execute_values(cur, query, rows)
    conn.commit()


def run():
    print("Loading embedding model (first run downloads it once, then it's cached locally)...")
    model = SentenceTransformer(MODEL_NAME)

    conn = psycopg2.connect(**DB_CONFIG)

    try:
        articles = fetch_articles_without_embeddings(conn)
        print(f"Found {len(articles)} articles needing embeddings.")

        if not articles:
            print("Nothing new today. Done.")
            return

        # Process in batches so we don't load everything into memory at once
        for i in range(0, len(articles), BATCH_SIZE):
            batch = articles[i : i + BATCH_SIZE]
            article_ids = [row[0] for row in batch]
            # Combine title + body — titles carry a lot of signal for financial news
            texts = [f"{row[1]}. {row[2]}" for row in batch]

            embeddings = model.encode(texts, show_progress_bar=False)
            save_embeddings(conn, article_ids, embeddings)

            print(f"  Embedded {i + len(batch)} / {len(articles)}")

        print("Done. All new articles embedded.")

    finally:
        conn.close()


if __name__ == "__main__":
    run()

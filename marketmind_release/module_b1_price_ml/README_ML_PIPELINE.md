# MarketMind — Module B (ML/RAG) Starter Kit

Three scripts, one per stage of the pipeline described in the architecture doc.
Run them in this order once real data is flowing.

## What's tested vs. what isn't

| Script | Status |
|---|---|
| `train_price_classifier.py` | **Ran successfully end-to-end** on synthetic data (see run output below). Fully working pipeline — swap in real price data and it should work the same way. |
| `finetune_sentiment_model.py` | **Syntax-checked, not run.** Needs `transformers` + `torch` + a HuggingFace download, which needs real disk space and internet access your dev machine has but this sandbox didn't. Test it on your own machine or Google Colab (free GPU) before relying on it. |
| `causal_synthesis.py` | **Syntax-checked, not run.** Needs a live Postgres DB with real embeddings, plus an Anthropic API key. Logic is correct; test against your actual DB once B1/B2/ingestion are producing real data. |

## How they connect

```
train_price_classifier.py          finetune_sentiment_model.py
  reads: price_history table         reads: labeled_news.csv (you build this)
  writes: anomaly_events.regime_label  writes: news_articles.sentiment_label,
                                                news_articles.causal_category
        \                                    /
         \                                  /
          v                                v
              causal_synthesis.py
              reads: anomaly_events, news_articles, news_embeddings
              writes: explanations, explanation_sources
```

## Running `train_price_classifier.py` (works right now)

```bash
pip install xgboost scikit-learn pandas numpy
python3 train_price_classifier.py
```

This generates synthetic price data, trains, and prints an evaluation report.
To use real data, replace `generate_synthetic_price_data()` with a read from
your `price_history` table — the SQL is in that function's docstring.

**What we saw when we ran it**: ~47% accuracy on synthetic data, weak on the
bearish class specifically. This is expected — synthetic random-walk data
doesn't have strong real patterns to learn from. It proves the *pipeline*
works correctly; real accuracy depends entirely on real data having genuine
signal, which is exactly what your evaluation section is meant to measure.

## Running `finetune_sentiment_model.py` (needs your own machine/Colab)

```bash
pip install transformers torch scikit-learn pandas
python3 finetune_sentiment_model.py
```

Needs `labeled_news.csv` in the same folder — see `labeled_news_example.csv`
for the exact format (15 example rows included). Build your real version by:
1. Pull ~300-500 articles from `news_articles`.
2. Ask an LLM to give first-pass (sentiment, causal_category) labels.
3. Team manually reviews/corrects a sample (~20-30%) for quality.

If you don't have a GPU, use Google Colab's free tier (Runtime → Change
runtime type → GPU) — CPU-only fine-tuning of BERT is very slow even on a
few hundred examples.

## Running `causal_synthesis.py` (needs live DB + API key)

```bash
pip install psycopg2-binary anthropic sentence-transformers
export DB_PASSWORD="your_db_password"
export ANTHROPIC_API_KEY="your_api_key"
python3 causal_synthesis.py
```

Needs: a running Postgres with the schema from `V1__init_schema.sql`, articles
already embedded (via `generate_embeddings.py`), and at least one anomaly
event with a regime label. Until real data exists, you can smoke-test the
prompt-building logic (`build_user_prompt`) with fake article lists directly,
without touching the database at all.

## The one thing to get right before wiring these together

The **time filter** in `retrieve_relevant_articles()` — articles must have
`published_at <= anomaly_end`. Get this wrong and the system will cite news
that came out *after* the price move as if it caused it, which defeats the
whole point of the project. Test this specifically with a manual example
before trusting the pipeline.

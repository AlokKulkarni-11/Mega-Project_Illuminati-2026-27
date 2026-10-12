# MarketMind — Project Package

Everything built so far: the end-to-end pipeline (working, tested against real
Nifty Bank data), the individual module scripts it was built from, the DB
schema, the frontend prototype, and the planning documents.

## Start here: the end-to-end pipeline

```
pipeline/marketmind_pipeline.py
```

This is the real, tested, working version of the whole idea: price CSV ->
detect anomalies -> fetch news -> filter by date -> rank -> LLM picks a cause
with citations -> signal agreement -> CSV/JSON output.

### Setup

```bash
pip install -r requirements.txt
cp .env.example .env     # fill in GEMINI_API_KEY
export $(cat .env | grep -v '^#' | xargs)   # or use python-dotenv / your shell's own method
```

### Dry run first (no API key, no network — confirms the CSV parses and logic works)

```bash
python pipeline/marketmind_pipeline.py --prices data/NIFTY_BANK.csv --mock
```

### Real run, Gemini (default provider)

```bash
python pipeline/marketmind_pipeline.py --prices data/NIFTY_BANK.csv --name "Nifty Bank"
```

### Real run, Claude instead

```bash
python pipeline/marketmind_pipeline.py --prices data/NIFTY_BANK.csv --name "Nifty Bank" \
  --provider anthropic
```

### For a single stock instead of an index

```bash
python pipeline/marketmind_pipeline.py --prices data/infosys.csv --name "Infosys" \
  --queries "Infosys,INFY,Infosys stock,Infosys shares"
```

Output lands in `marketmind_out/`: `anomalies_explained.csv`,
`anomalies_explained.json` (full evidence trail), `headlines_labeled.csv`
(weak labels for BERT fine-tuning).

### Run the test suite (no network/API key needed — 13 tests)

```bash
cd pipeline && python test_marketmind_pipeline.py
```

**What's actually verified vs. not**: anomaly detection, time filtering,
citation/abstention rules, and a full mock run are tested and passing. The
real Gemini/Claude API call and the real Google News fetch are NOT verified
end-to-end by me — my environment can't reach either. Run one real query
yourself and sanity-check the output before trusting it at scale.

---

## What else is in this package

| Folder | What it is | Status |
|---|---|---|
| `sql/` | `V1__init_schema.sql` — full Postgres + pgvector schema | Design complete, not yet deployed |
| `module_a_ingestion/` | Placeholder for Dawkhare's real NSE/news scrapers | Not built — schema + CSV format ready for it |
| `module_b1_price_ml/` | `train_price_classifier.py` (XGBoost, ran successfully on synthetic data), `analyze_banknifty.py` + `merge_anomalies_with_news.py` (ran successfully on your real Nifty Bank data) | Working |
| `module_b2_bert_sentiment/` | `finetune_sentiment_model.py` (dual-head BERT, syntax-checked, needs GPU to actually train), `scrape_and_label_news.py` (auto-labels headlines by forward price return), `generate_embeddings.py` (daily embedding cron job) | Written, not fully executed (needs GPU / real DB) |
| `module_b3_rag_engine/` | `causal_synthesis.py` — the original DB-backed design for this step, written before `pipeline/marketmind_pipeline.py` replaced it with a tested, file-based version for now | Superseded for now — see note below |
| `frontend_prototype/` | `marketmind_prototype.html` — the ledger-dossier UI design, interactive, open directly in a browser | Working prototype |
| `docs/` | Full project scope doc, team workload distribution, 4-week execution plan, phase-wise AI build prompts | Planning complete |

### Note on `causal_synthesis.py` vs `pipeline/marketmind_pipeline.py`

`causal_synthesis.py` was the first design for the RAG step — it assumes a
live Postgres database with pre-computed embeddings already populated by
`generate_embeddings.py`. `pipeline/marketmind_pipeline.py` is a newer,
self-contained, actually-tested version that fetches news live and doesn't
need the database yet. Once Postgres is actually running with real data,
merge the two: keep `marketmind_pipeline.py`'s tested retrieval-ranking and
citation-enforcement logic, but have it read from `news_embeddings` (vector
search) instead of hitting Google News live every time.

### Known gap to fix before wiring into the DB

`marketmind_pipeline.py` uses `causal_category` values (`market_flows`,
`unclear`) that aren't in the `causal_category` enum in `V1__init_schema.sql`.
Alok needs to either add these two values to the schema enum, or map them to
existing categories at write time.

## Team module ownership (for reference)

- **Alok Kulkarni** — backend/API (Spring Boot) + DB schema (`sql/`)
- **Niharika** — frontend (`frontend_prototype/` -> real React build)
- **Piyush Dawkhare** — cloud + data ingestion (`module_a_ingestion/`)
- **Piyush Rajurkar** — all ML: price classifier, BERT fine-tuning, RAG
  (`module_b1_price_ml/`, `module_b2_bert_sentiment/`, `module_b3_rag_engine/`,
  and now `pipeline/marketmind_pipeline.py`)

See `docs/MarketMind_4Week_Execution_Plan.docx` for the full timeline and
`docs/PHASE_WISE_BUILD_PROMPTS.md` for ready-to-paste prompts to build the
Spring Boot backend and React frontend.

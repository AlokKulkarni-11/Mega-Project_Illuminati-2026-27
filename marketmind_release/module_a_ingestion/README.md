# Module A — Data Ingestion (Piyush Dawkhare)

This folder is a placeholder. The schema it writes to is in `/sql/V1__init_schema.sql`.

What goes here, per the project plan:
- NSE/BSE price fetchers (Security-wise Archives or yfinance) for the full
  20-25 stock universe
- News/RSS scrapers for daily ingestion
- Entity/sector mapping table population
- Cloud deployment + CI/CD scripts

For a working reference of the CSV format these scripts need to produce, see
`/data/NIFTY_BANK.csv` and the loader in `/pipeline/marketmind_pipeline.py`'s
`load_prices()` function — it expects: date, open, high, low, close, volume
(renamed from "Shares Traded"), turnover_cr.

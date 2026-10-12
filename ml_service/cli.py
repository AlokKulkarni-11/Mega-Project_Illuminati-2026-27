import sys
import os
import argparse
from pathlib import Path
from datetime import datetime

# Reconfigure stdout for Windows UTF-8 console output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich import print as rprint

from ml_service.models.price_classifier import PricePatternClassifier
from ml_service.models.sentiment_causal_classifier import FinBertSentimentCausalClassifier
from ml_service.services.signal_agreement import SignalAgreementEvaluator
from ml_service.services.rag_engine import TimeConstrainedRAGEngine

console = Console(force_terminal=True)


def print_banner():
    banner_text = (
        "=================================================================================\n"
        "                  MARKETMIND TERMINAL CLI DASHBOARD                             \n"
        "   Explainable AI System for Stock Movement & Causal Reasoning Analysis         \n"
        "   Lead Developer: Piyush Rajurkar (ML & RAG Causal Engine Lead)                 \n"
        "================================================================================="
    )
    console.print(Panel(Text(banner_text, style="bold cyan"), border_style="bright_blue"))


def load_sample_ohlcv(symbol: str) -> list:
    csv_path = Path(__file__).parent / "data" / "sample_ohlcv.csv"
    if not csv_path.exists():
        return []
    try:
        df = pd.read_csv(csv_path)
        df_sub = df[df["symbol"].str.upper() == symbol.upper()]
        if df_sub.empty:
            df_sub = df.iloc[:5]
        return df_sub.to_dict(orient="records")
    except Exception as e:
        console.print(f"[bold red]Error loading OHLCV data: {e}[/bold red]")
        return []


def run_marketmind_analysis(symbol: str, movement_date: str, query_context: str = ""):
    print_banner()

    console.print(f"\n[bold yellow]Running MarketMind Causal Analysis for:[/bold yellow] [bold white]{symbol.upper()}[/bold white] on [bold green]{movement_date}[/bold green]...\n")

    # 1. Instantiate Models & Engines
    with console.status("[bold green]Loading ML models & RAG vector index...", spinner="dots"):
        price_classifier = PricePatternClassifier()
        sentiment_classifier = FinBertSentimentCausalClassifier()
        agreement_evaluator = SignalAgreementEvaluator()
        rag_engine = TimeConstrainedRAGEngine()

        ohlcv_records = load_sample_ohlcv(symbol)
        price_res = price_classifier.predict_regime(ohlcv_records)

        rag_res = rag_engine.synthesize_explanation(
            symbol=symbol,
            movement_date=movement_date,
            price_regime=price_res["regime"],
            price_confidence=price_res["confidence"],
            query_context=query_context
        )

        top_news_text = ""
        if rag_res["citations"]:
            top_news_text = rag_res["citations"][0]["title"] + ". " + rag_res["citations"][0]["snippet"]
        else:
            top_news_text = f"{symbol} corporate developments and financial indicators."

        sent_res = sentiment_classifier.analyze_text(top_news_text)

        agree_res = agreement_evaluator.evaluate_agreement(
            price_regime=price_res["regime"],
            price_confidence=price_res["confidence"],
            text_sentiment=sent_res["sentiment"],
            sentiment_confidence=sent_res["sentiment_confidence"]
        )

    # 2. Render Technical Indicator & OHLCV Table
    ohlcv_table = Table(title=f"Historical OHLCV & Technical Features ({symbol.upper()})", header_style="bold magenta")
    ohlcv_table.add_column("Date", style="dim", width=12)
    ohlcv_table.add_column("Open", justify="right")
    ohlcv_table.add_column("High", justify="right")
    ohlcv_table.add_column("Low", justify="right")
    ohlcv_table.add_column("Close", justify="right", style="bold green")
    ohlcv_table.add_column("Volume", justify="right")

    for rec in ohlcv_records[-5:]:
        ohlcv_table.add_row(
            str(rec.get("date")),
            f"Rs.{rec.get('open'):,.1f}",
            f"Rs.{rec.get('high'):,.1f}",
            f"Rs.{rec.get('low'):,.1f}",
            f"Rs.{rec.get('close'):,.1f}",
            f"{int(rec.get('volume')):,}"
        )
    console.print(ohlcv_table)

    # 3. Render Quantitative Price Regime Panel
    regime_color = "green" if price_res["regime"] == "bullish" else "red" if price_res["regime"] == "bearish" else "yellow"
    anom_text = "[bold red]ANOMALY DETECTED[/bold red]" if price_res["anomalous"] else "[dim green]Normal Trading Range[/dim green]"

    feat = price_res.get("features", {})
    price_info = (
        f"* Predicted Regime: [{regime_color}]{price_res['regime'].upper()}[/{regime_color}]\n"
        f"* Model Used: {price_res.get('model_used', 'XGBoost')}\n"
        f"* Regime Confidence: {price_res['confidence'] * 100:.1f}%\n"
        f"* Return Z-Score: {price_res['return_zscore']:+.2f} std\n"
        f"* Volume Z-Score: {price_res['volume_zscore']:+.2f} std\n"
        f"* Status: {anom_text}\n"
        f"* Technical Indicators: RSI_14={feat.get('rsi_14')}, MACD={feat.get('macd')}, SMA_20=Rs.{feat.get('sma_20')}"
    )
    console.print(Panel(price_info, title="1. XGBoost Price-Pattern Classifier Output", border_style=regime_color))

    # 4. Render Qualitative News Sentiment & Causal Panel
    sent_color = "green" if sent_res["sentiment"] == "bullish" else "red" if sent_res["sentiment"] == "bearish" else "yellow"
    sent_info = (
        f"* News Sentiment: [{sent_color}]{sent_res['sentiment'].upper()}[/{sent_color}]\n"
        f"* Sentiment Confidence: {sent_res['sentiment_confidence'] * 100:.1f}%\n"
        f"* Primary Causal Category: [bold cyan]{sent_res['causal_category'].upper()}[/bold cyan] ({sent_res['causal_confidence'] * 100:.1f}% conf)\n"
        f"* NLP Framework: {sent_res.get('model_used', 'FinBERT_PyTorch')}\n"
        f"* Keywords Detected: {', '.join(sent_res['keywords_detected']) if sent_res['keywords_detected'] else 'None'}"
    )
    console.print(Panel(sent_info, title="2. FinBERT Sentiment & Causal Classifier Output", border_style=sent_color))

    # 5. Render Signal Agreement Badge
    status_color = "green" if agree_res["agreement_status"] == "consistent" else "red" if agree_res["agreement_status"] == "divergent" else "yellow"
    agree_info = (
        f"Signal Agreement State: [{status_color}]{agree_res['agreement_status'].upper()}[/{status_color}]\n"
        f"Agreement Score: {agree_res['agreement_score'] * 100:.1f}%\n"
        f"Explanation: {agree_res['explanation']}"
    )
    console.print(Panel(agree_info, title="3. Signal-Agreement Evaluation", border_style=status_color))

    # 6. Render Time-Constrained RAG Causal Synthesis & Citations
    if rag_res["abstain"]:
        abstain_panel = (
            f"[bold red]EXPLICIT ABSTENTION TRIGGERED[/bold red]\n\n"
            f"[yellow]{rag_res['explanation']}[/yellow]\n\n"
            f"[dim]Safeguard Active: Strict hard timestamp cutoff (t_published <= {movement_date}) prevented retrieval "
            f"of unverified post-event articles to eliminate hindsight bias.[/dim]"
        )
        console.print(Panel(abstain_panel, title="4. Time-Constrained RAG Engine Output", border_style="red"))
    else:
        rag_info = (
            f"[bold green]Verified Causal Explanation (t_published <= {movement_date}):[/bold green]\n"
            f"{rag_res['explanation']}\n\n"
            f"* Overall Confidence Score: [bold green]{rag_res['confidence_score'] * 100:.1f}%[/bold green]\n"
            f"* Causal Category: {rag_res['primary_causal_category'].upper()}\n"
            f"* Valid Pre-Event Citations Count: {rag_res['evidence_count']}"
        )
        console.print(Panel(rag_info, title="4. Time-Constrained RAG Causal Synthesis", border_style="bright_blue"))

        # Citations Table
        if rag_res["citations"]:
            cite_table = Table(title="Supporting Pre-Event Evidence & Citations", header_style="bold cyan")
            cite_table.add_column("Title", style="bold white", width=35)
            cite_table.add_column("Source", style="yellow", width=18)
            cite_table.add_column("Published Date", style="dim", width=15)
            cite_table.add_column("Relevance", justify="right", style="green")

            for cite in rag_res["citations"]:
                cite_table.add_row(
                    cite["title"][:32] + "...",
                    cite["source"],
                    str(cite["published_at"])[:10],
                    f"{cite['relevance_score'] * 100:.1f}%"
                )
            console.print(cite_table)

    console.print("\n[bold green]Analysis complete. Ready for next query![/bold green]\n")


def main():
    parser = argparse.ArgumentParser(description="MarketMind Terminal CLI Dashboard")
    parser.add_argument("--symbol", type=str, default="TATASTEEL", help="Stock ticker symbol (e.g. TATASTEEL, RELIANCE, INFY)")
    parser.add_argument("--date", type=str, default="2026-08-03", help="Movement date (YYYY-MM-DD)")
    parser.add_argument("--query", type=str, default="", help="Optional query context")
    parser.add_argument("--interactive", action="store_true", help="Run interactive prompt mode")

    args = parser.parse_args()

    if args.interactive:
        print_banner()
        console.print("[bold yellow]Interactive Query Selection Mode[/bold yellow]")
        symbol = console.input("[bold cyan]Enter Stock Ticker Symbol [default: TATASTEEL]: [/bold cyan]").strip() or "TATASTEEL"
        movement_date = console.input("[bold cyan]Enter Movement Date (YYYY-MM-DD) [default: 2026-08-03]: [/bold cyan]").strip() or "2026-08-03"
        query_context = console.input("[bold cyan]Enter optional query context [press Enter for none]: [/bold cyan]").strip()
        run_marketmind_analysis(symbol, movement_date, query_context)
    else:
        run_marketmind_analysis(args.symbol, args.date, args.query)


if __name__ == "__main__":
    main()

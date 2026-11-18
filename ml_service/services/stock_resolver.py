"""
Stock Resolution Service
------------------------
Maps company names, common abbreviations, and ticker symbols to canonical stock records.
Supports Indian equities (NSE, BSE) and major global equities, resolving market,
exchange, and handling ambiguous matches with clarification options.
"""

from typing import Dict, Any, List, Optional
import re


# Canonical stock directory
DEFAULT_STOCK_CATALOG: List[Dict[str, Any]] = [
    {
        "ticker": "NIFTYBANK",
        "company_name": "Nifty Bank",
        "canonical_name": "Nifty Bank Index",
        "exchange": "NSE",
        "market": "India",
        "secondary_exchanges": [],
        "aliases": ["nifty bank", "bank nifty", "niftybank", "banknifty", "nifty bank index"],
        "sector": "Banking & Financial Services",
    },
    {
        "ticker": "TCS",
        "company_name": "Tata Consultancy Services",
        "canonical_name": "Tata Consultancy Services Limited",
        "exchange": "NSE",
        "market": "India",
        "secondary_exchanges": ["BSE"],
        "aliases": ["tcs", "tata consultancy services", "tata consultancy", "tata consult", "tcs ltd"],
        "sector": "Information Technology",
    },
    {
        "ticker": "INFY",
        "company_name": "Infosys",
        "canonical_name": "Infosys Limited",
        "exchange": "NSE",
        "market": "India",
        "secondary_exchanges": ["BSE", "NYSE"],
        "aliases": ["infy", "infosys", "infosys limited", "infy ltd"],
        "sector": "Information Technology",
    },
    {
        "ticker": "RELIANCE",
        "company_name": "Reliance Industries",
        "canonical_name": "Reliance Industries Limited",
        "exchange": "NSE",
        "market": "India",
        "secondary_exchanges": ["BSE"],
        "aliases": ["reliance", "ril", "reliance industries", "reliance ind", "mukesh ambani reliance"],
        "sector": "Energy & Petrochemicals",
    },
    {
        "ticker": "HDFCBANK",
        "company_name": "HDFC Bank",
        "canonical_name": "HDFC Bank Limited",
        "exchange": "NSE",
        "market": "India",
        "secondary_exchanges": ["BSE", "NYSE"],
        "aliases": ["hdfc bank", "hdfcbank", "hdfc bnk"],
        "sector": "Banking & Financial Services",
    },
    {
        "ticker": "SBIN",
        "company_name": "State Bank of India",
        "canonical_name": "State Bank of India",
        "exchange": "NSE",
        "market": "India",
        "secondary_exchanges": ["BSE"],
        "aliases": ["sbi", "sbin", "state bank of india", "state bank"],
        "sector": "Banking & Financial Services",
    },
    {
        "ticker": "TATAMOTORS",
        "company_name": "Tata Motors",
        "canonical_name": "Tata Motors Limited",
        "exchange": "NSE",
        "market": "India",
        "secondary_exchanges": ["BSE"],
        "aliases": ["tata motors", "tatamotors", "tata motor"],
        "sector": "Automotive",
    },
    {
        "ticker": "TATASTEEL",
        "company_name": "Tata Steel",
        "canonical_name": "Tata Steel Limited",
        "exchange": "NSE",
        "market": "India",
        "secondary_exchanges": ["BSE"],
        "aliases": ["tata steel", "tatasteel"],
        "sector": "Metals & Mining",
    },
    {
        "ticker": "ICICIBANK",
        "company_name": "ICICI Bank",
        "canonical_name": "ICICI Bank Limited",
        "exchange": "NSE",
        "market": "India",
        "secondary_exchanges": ["BSE", "NYSE"],
        "aliases": ["icici", "icicibank", "icici bank", "icici bank ltd"],
        "sector": "Banking & Financial Services",
    },
    {
        "ticker": "WIPRO",
        "company_name": "Wipro",
        "canonical_name": "Wipro Limited",
        "exchange": "NSE",
        "market": "India",
        "secondary_exchanges": ["BSE", "NYSE"],
        "aliases": ["wipro", "wipro limited", "wipro ltd"],
        "sector": "Information Technology",
    },
    {
        "ticker": "BHARTIARTL",
        "company_name": "Bharti Airtel",
        "canonical_name": "Bharti Airtel Limited",
        "exchange": "NSE",
        "market": "India",
        "secondary_exchanges": ["BSE"],
        "aliases": ["airtel", "bharti airtel", "bhartiartl"],
        "sector": "Telecommunications",
    },
    {
        "ticker": "ITC",
        "company_name": "ITC",
        "canonical_name": "ITC Limited",
        "exchange": "NSE",
        "market": "India",
        "secondary_exchanges": ["BSE"],
        "aliases": ["itc", "itc limited", "itc ltd"],
        "sector": "Consumer Goods & FMCG",
    },
    {
        "ticker": "NVDA",
        "company_name": "NVIDIA",
        "canonical_name": "NVIDIA Corporation",
        "exchange": "NASDAQ",
        "market": "US",
        "secondary_exchanges": [],
        "aliases": ["nvidia", "nvda", "nvidia corp", "nvidia corporation"],
        "sector": "Semiconductors",
    },
    {
        "ticker": "AAPL",
        "company_name": "Apple",
        "canonical_name": "Apple Inc.",
        "exchange": "NASDAQ",
        "market": "US",
        "secondary_exchanges": [],
        "aliases": ["apple", "aapl", "apple inc", "apple's", "apple computer"],
        "sector": "Consumer Electronics & Tech",
    },
    {
        "ticker": "MSFT",
        "company_name": "Microsoft",
        "canonical_name": "Microsoft Corporation",
        "exchange": "NASDAQ",
        "market": "US",
        "secondary_exchanges": [],
        "aliases": ["microsoft", "msft", "microsoft corp"],
        "sector": "Software & Cloud",
    },
    {
        "ticker": "TSLA",
        "company_name": "Tesla",
        "canonical_name": "Tesla, Inc.",
        "exchange": "NASDAQ",
        "market": "US",
        "secondary_exchanges": [],
        "aliases": ["tesla", "tsla", "tesla inc", "tesla motors"],
        "sector": "Automotive & Clean Energy",
    },
]


class StockResolutionService:
    """
    Resolves natural language company names, abbreviations, or ticker symbols
    to canonical stock records.
    """

    def __init__(self, catalog: Optional[List[Dict[str, Any]]] = None):
        self.catalog = catalog or DEFAULT_STOCK_CATALOG

    def _normalize(self, text: str) -> str:
        text = text.lower().strip()
        text = re.sub(r"['’]s\b", "", text)  # apple's -> apple
        text = re.sub(r"[^\w\s]", " ", text)
        return " ".join(text.split())

    def resolve(self, query: str) -> Dict[str, Any]:
        """
        Analyzes a query string and resolves matching stock(s).
        Returns a dictionary with:
          - resolved: bool
          - canonical_record: Optional[Dict]
          - is_ambiguous: bool
          - candidates: List[Dict]
          - message: Optional[str]
        """
        normalized_q = self._normalize(query)
        words = normalized_q.split()

        matches = []
        seen_tickers = set()

        # 1. Exact ticker match (word boundary check)
        for stock in self.catalog:
            ticker_lower = stock["ticker"].lower()
            if ticker_lower in words or f" {ticker_lower} " in f" {normalized_q} ":
                if stock["ticker"] not in seen_tickers:
                    matches.append((stock, 1.0))
                    seen_tickers.add(stock["ticker"])

        # 2. Alias exact / phrase match
        for stock in self.catalog:
            if stock["ticker"] in seen_tickers:
                continue
            for alias in stock["aliases"]:
                alias_norm = self._normalize(alias)
                # Check if entire alias is present in the query
                pattern = r"\b" + re.escape(alias_norm) + r"\b"
                if re.search(pattern, normalized_q):
                    matches.append((stock, 0.95))
                    seen_tickers.add(stock["ticker"])
                    break

        # 3. Partial substring match check (e.g. "Tata" might match Tata Motors, Tata Steel, TCS)
        if not matches:
            for stock in self.catalog:
                if stock["ticker"] in seen_tickers:
                    continue
                for alias in stock["aliases"]:
                    alias_norm = self._normalize(alias)
                    for word in words:
                        if len(word) >= 4 and word in alias_norm.split():
                            matches.append((stock, 0.70))
                            seen_tickers.add(stock["ticker"])
                            break
                    if stock["ticker"] in seen_tickers:
                        break

        # Check for ambiguous matches like "Tata"
        if len(matches) > 1:
            # Check if one match has significantly higher confidence
            sorted_matches = sorted(matches, key=lambda x: x[1], reverse=True)
            if sorted_matches[0][1] >= 0.95 and sorted_matches[1][1] < 0.90:
                best_stock = sorted_matches[0][0]
                return {
                    "resolved": True,
                    "company_name": best_stock["company_name"],
                    "ticker": best_stock["ticker"],
                    "market": best_stock["market"],
                    "exchange": best_stock["exchange"],
                    "canonical_record": best_stock,
                    "is_ambiguous": False,
                    "candidates": [s for s, _ in sorted_matches],
                }

            # Ambiguity detected
            candidates = [s for s, _ in sorted_matches]
            candidate_names = [f"{s['company_name']} ({s['ticker']})" for s in candidates]
            return {
                "resolved": False,
                "company_name": None,
                "ticker": None,
                "market": None,
                "exchange": None,
                "canonical_record": None,
                "is_ambiguous": True,
                "candidates": candidates,
                "message": f"Multiple matching companies detected: {', '.join(candidate_names)}. Please select one.",
            }

        elif len(matches) == 1:
            best_stock = matches[0][0]
            return {
                "resolved": True,
                "company_name": best_stock["company_name"],
                "ticker": best_stock["ticker"],
                "market": best_stock["market"],
                "exchange": best_stock["exchange"],
                "canonical_record": best_stock,
                "is_ambiguous": False,
                "candidates": [best_stock],
            }

        return {
            "resolved": False,
            "company_name": None,
            "ticker": None,
            "market": None,
            "exchange": None,
            "canonical_record": None,
            "is_ambiguous": False,
            "candidates": [],
            "message": "No recognized stock or company found in query.",
        }

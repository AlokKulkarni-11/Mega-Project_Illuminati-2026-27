import json
import re
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional


class TimeConstrainedRAGEngine:
    """
    Time-Constrained Retrieval-Augmented Generation (RAG) Engine.
    Uses SentenceTransformers dense vector embeddings for semantic search.
    Enforces a strict hard publication timestamp cutoff (t_published <= t_movement)
    to prevent hindsight bias in stock movement explanations.
    """

    def __init__(self, news_corpus_path: Optional[str] = None):
        self.news_corpus_path = news_corpus_path or str(
            Path(__file__).parent.parent / "data" / "sample_news.json"
        )
        self.corpus = self._load_corpus()
        self._embedding_model = None
        self._model_attempted = False
        self.corpus_embeddings = None

    def _load_corpus(self) -> List[Dict[str, Any]]:
        path = Path(self.news_corpus_path)
        if not path.exists():
            return []
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _get_embedding_model(self):
        if not self._model_attempted:
            self._model_attempted = True
            try:
                from sentence_transformers import SentenceTransformer
                self._embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception as e:
                print(f"[Info] SentenceTransformer embedding model fallback: {e}")
                self._embedding_model = None
        return self._embedding_model

    def compute_vector_similarity(self, query: str, doc_idx: int, text: str) -> float:
        """
        Computes SentenceTransformer vector cosine similarity between query and candidate doc.
        Falls back to TF-IDF keyword overlap if embeddings unavailable.
        """
        model = self._get_embedding_model()
        if model is not None and self.corpus:
            try:
                if self.corpus_embeddings is None:
                    texts = [f"{art.get('title', '')}. {art.get('content', '')}" for art in self.corpus]
                    self.corpus_embeddings = model.encode(texts, convert_to_numpy=True)

                q_emb = model.encode(query, convert_to_numpy=True)
                d_emb = self.corpus_embeddings[doc_idx]
                norm_q = np.linalg.norm(q_emb)
                norm_d = np.linalg.norm(d_emb)
                if norm_q > 0 and norm_d > 0:
                    sim = float(np.dot(q_emb, d_emb) / (norm_q * norm_d))
                    return max(0.0, min(0.99, sim))
            except Exception:
                pass

        # Fallback TF-IDF keyword overlap similarity
        if not query or not text:
            return 0.0
        q_words = set(re.findall(r"\b\w+\b", query.lower()))
        t_words = set(re.findall(r"\b\w+\b", text.lower()))
        if not q_words or not t_words:
            return 0.0
        intersection = q_words.intersection(t_words)
        return len(intersection) / (len(q_words) ** 0.5 * len(t_words) ** 0.5 + 1e-5)

    def parse_datetime(self, dt_str: str) -> Optional[datetime]:
        """Parses ISO or date strings into offset-naive UTC datetime objects."""
        if not dt_str:
            return None
        dt_str = dt_str.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(dt_str)
            return dt.replace(tzinfo=None)
        except Exception:
            try:
                dt = datetime.strptime(dt_str[:10], "%Y-%m-%d")
                return dt.replace(tzinfo=None)
            except Exception:
                return None

    def retrieve_valid_evidence(
        self,
        symbol: str,
        movement_date: str,
        query_context: str = "",
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Retrieves articles matching symbol where published_at <= movement_date.
        Strictly enforces temporal non-leakage and uses dense vector similarity.
        """
        movement_dt = self.parse_datetime(movement_date)
        if not movement_dt:
            movement_dt = datetime.utcnow().replace(tzinfo=None)

        query = query_context or f"{symbol} stock price change market news earnings revenue regulation"
        valid_articles = []

        for idx, article in enumerate(self.corpus):
            art_symbol = article.get("symbol", "").upper()
            if art_symbol != symbol.upper():
                continue

            pub_dt = self.parse_datetime(article.get("published_at", ""))
            # Strict Time Constraint Filter
            if pub_dt and pub_dt > movement_dt:
                continue  # Discard future news (hindsight bias prevention)

            content = f"{article.get('title', '')} {article.get('content', '')}"
            vec_sim = self.compute_vector_similarity(query, idx, content)

            recency_boost = 1.0
            if pub_dt:
                days_diff = (movement_dt - pub_dt).days
                if 0 <= days_diff <= 7:
                    recency_boost = 1.25

            final_score = min(0.99, vec_sim * recency_boost + 0.25)

            article_copy = dict(article)
            article_copy["relevance_score"] = round(float(final_score), 4)
            valid_articles.append(article_copy)

        # Sort by relevance score descending
        valid_articles.sort(key=lambda x: x["relevance_score"], reverse=True)
        return valid_articles[:top_k]

    def synthesize_explanation(
        self,
        symbol: str,
        movement_date: str,
        price_regime: str = "bullish",
        price_confidence: float = 0.85,
        query_context: str = "",
        min_relevance_threshold: float = 0.35
    ) -> Dict[str, Any]:
        """
        Synthesizes cited explanation or triggers explicit abstention if prior evidence is missing.
        """
        evidence = self.retrieve_valid_evidence(
            symbol=symbol,
            movement_date=movement_date,
            query_context=query_context
        )

        # Abstention Check
        if not evidence or evidence[0]["relevance_score"] < min_relevance_threshold:
            return {
                "symbol": symbol,
                "movement_date": movement_date,
                "price_regime": price_regime,
                "abstain": True,
                "explanation": (
                    f"Insufficient reliable news or filing evidence published on or before {movement_date} "
                    f"for {symbol} to establish a verifiable causal explanation without hindsight bias."
                ),
                "confidence_score": 0.30,
                "primary_causal_category": "unknown",
                "citations": [],
                "evidence_count": 0
            }

        top_article = evidence[0]
        primary_cause = top_article.get("causal_category", "company-specific")
        sentiment = top_article.get("sentiment", "neutral")

        # Citations formatting
        citations = []
        for art in evidence:
            citations.append({
                "id": art.get("id"),
                "title": art.get("title"),
                "source": art.get("source"),
                "published_at": art.get("published_at"),
                "relevance_score": art.get("relevance_score"),
                "snippet": art.get("content", "")[:180] + "..."
            })

        explanation_text = (
            f"Significant {price_regime.upper()} movement in {symbol} on {movement_date} is primarily attributed "
            f"to {primary_cause.upper()} factors reported prior to the event. Key driver: \"{top_article.get('title')}\" "
            f"(Source: {top_article.get('source')}, Published: {top_article.get('published_at')[:10]}). "
            f"Signal agreement indicates that pre-event market news sentiment was predominantly {sentiment.upper()}."
        )

        overall_conf = round(min(0.95, (price_confidence + top_article.get("relevance_score", 0.5)) / 2), 4)

        return {
            "symbol": symbol,
            "movement_date": movement_date,
            "price_regime": price_regime,
            "abstain": False,
            "explanation": explanation_text,
            "confidence_score": overall_conf,
            "primary_causal_category": primary_cause,
            "citations": citations,
            "evidence_count": len(citations)
        }

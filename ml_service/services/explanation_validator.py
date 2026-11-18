"""
Explanation Validation Service
------------------------------
Validates LLM-generated and synthesized stock movement explanations against:
1. Citation Bounds: Every bracketed citation [k] must reference an actually retrieved article.
2. Temporal Non-Leakage: Cited articles must have been published on or before the target date.
3. Data Consistency: Verifies narrative direction aligns with quantitative price regime and sentiment.
4. Fact & Catalyst Coverage: Ensures key drivers correspond to retrieved article texts.
5. Output Form & Word Count: Checks target elaboration (200-250 words) without malformed text.
"""

import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple


class ExplanationValidator:
    """
    Validates generated financial explanations against source ground truth.
    """

    def __init__(self, min_words: int = 180, max_words: int = 270):
        self.min_words = min_words
        self.max_words = max_words

    def _parse_date(self, d_str: Optional[str]) -> Optional[datetime]:
        if not d_str:
            return None
        clean = d_str.strip()[:10]
        try:
            return datetime.strptime(clean, "%Y-%m-%d")
        except Exception:
            return None

    def validate_citations(
        self,
        explanation: str,
        articles: List[Dict[str, Any]]
    ) -> Tuple[bool, List[int], List[str]]:
        """
        Validates bracketed citations e.g. [1], [2].
        Returns: (is_valid, validated_citation_indices, errors)
        """
        citations = [int(m) for m in re.findall(r"\[(\d+)\]", explanation)]
        errors = []
        validated = []
        n_articles = len(articles)

        if not citations and n_articles > 0:
            errors.append("Explanation does not contain any bracketed citations [k] despite retrieved articles.")

        for c in citations:
            if c < 1 or c > n_articles:
                errors.append(f"Invalid citation [{c}]: Only {n_articles} verified article(s) available.")
            else:
                validated.append(c)

        is_valid = len(errors) == 0 and len(validated) > 0 if n_articles > 0 else len(citations) == 0
        return is_valid, sorted(list(set(validated))), errors

    def validate_temporal(
        self,
        articles: List[Dict[str, Any]],
        target_date: str,
        validated_citations: List[int]
    ) -> Tuple[bool, List[str]]:
        """
        Verifies that cited articles were published on or before the movement date.
        """
        errors = []
        target_dt = self._parse_date(target_date)
        if not target_dt:
            return True, []

        for c_idx in validated_citations:
            art = articles[c_idx - 1]
            pub_str = art.get("published_at") or ""
            pub_dt = self._parse_date(pub_str)
            if pub_dt and pub_dt > target_dt:
                errors.append(
                    f"Temporal violation: Cited article [{c_idx}] ('{art.get('title')}') was published on "
                    f"{pub_str[:10]}, which is after the target movement date {target_date}."
                )

        return len(errors) == 0, errors

    def validate_data_consistency(
        self,
        explanation: str,
        price_regime: str,
        return_pct: float,
        news_sentiment: str,
        signal_agreement: str
    ) -> Tuple[bool, List[str]]:
        """
        Detects contradictions between quantitative facts and the generated narrative.
        """
        errors = []
        text_lower = explanation.lower()
        p_regime = (price_regime or "").lower().strip()
        n_sent = (news_sentiment or "").lower().strip()

        # 1. Price movement consistency
        if p_regime == "bullish" or return_pct > 1.0:
            if any(phrase in text_lower for phrase in [
                "suffered a sharp sell-off", "plummeted", "sharp price collapse",
                "bearish price decline", "fell significantly", "massive losses"
            ]):
                errors.append(f"Price consistency contradiction: Narrative describes a bearish collapse, but price regime is {p_regime} ({return_pct:+.2f}%).")

        elif p_regime == "bearish" or return_pct < -1.0:
            if any(phrase in text_lower for phrase in [
                "rallied strongly", "surged to new highs", "bullish price rally",
                "robust gains", "advanced sharply"
            ]):
                errors.append(f"Price consistency contradiction: Narrative describes a bullish surge, but price regime is {p_regime} ({return_pct:+.2f}%).")

        # 2. News sentiment consistency
        if n_sent == "bearish":
            if any(phrase in text_lower for phrase in [
                "overwhelmingly positive news flow", "bullish headlines dominated",
                "exclusively positive sentiment in the press"
            ]):
                errors.append("Sentiment consistency contradiction: Narrative asserts positive news flow, but verified sentiment is BEARISH.")

        elif n_sent == "bullish":
            if any(phrase in text_lower for phrase in [
                "overwhelmingly negative news flow", "bearish headlines dominated",
                "exclusively pessimistic sentiment in the press"
            ]):
                errors.append("Sentiment consistency contradiction: Narrative asserts negative news flow, but verified sentiment is BULLISH.")

        return len(errors) == 0, errors

    def validate_claims(
        self,
        explanation: str,
        articles: List[Dict[str, Any]],
        validated_citations: List[int],
        target_date: str
    ) -> Tuple[List[str], List[str], List[str], List[str], List[str]]:
        """
        Validates individual factual claims in the explanation against cited articles.
        Returns:
            - supported_claims: List[str]
            - partially_supported_claims: List[str]
            - unsupported_claims: List[str]
            - contradicted_claims: List[str]
            - claim_errors: List[str]
        """
        supported = []
        partially_supported = []
        unsupported = []
        contradicted = []
        errors = []

        if not articles or not explanation:
            return supported, partially_supported, unsupported, contradicted, errors

        # Split explanation into sentences
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', explanation) if len(s.strip()) > 15]

        for s in sentences:
            s_lower = s.lower()
            cited_nums = [int(m) for m in re.findall(r"\[(\d+)\]", s)]
            relevant_arts = [articles[k - 1] for k in cited_nums if 1 <= k <= len(articles)]

            # Combine text of cited articles (or all articles if un-cited but general)
            if relevant_arts:
                source_text = " ".join([f"{a.get('title', '')} {a.get('text_content', '')}" for a in relevant_arts]).lower()
            else:
                source_text = " ".join([f"{a.get('title', '')} {a.get('text_content', '')}" for a in articles]).lower()

            # 1. Institutional Flow Claims
            inst_claim = any(phrase in s_lower for phrase in [
                "institutional investors sold", "institutional selling", "fiis dumped", "fiis sold",
                "diis sold", "large block sales", "institutional accumulation", "institutional desks",
                "foreign institutional books", "foreign institutions dumped", "institutional dumping"
            ])
            if inst_claim:
                has_inst_evidence = any(kw in source_text for kw in [
                    "institutional", "fii", "dii", "foreign investor", "fund manager", "block deal", "bulk deal"
                ])
                if not has_inst_evidence:
                    unsupported.append(s)
                    errors.append(f"Unsupported claim: Sentence asserts institutional trading activity, but cited source(s) contain no evidence of institutional flow.")
                    continue

            # 2. Earnings and Financial Results Claims
            earnings_claim = any(phrase in s_lower for phrase in [
                "profit fell", "profit surged", "profit declined", "revenue dropped", "revenue grew",
                "margin contraction", "margin expansion", "earnings beat", "earnings missed", "ebitda"
            ])
            if earnings_claim:
                has_earnings_evidence = any(kw in source_text for kw in ["profit", "revenue", "earnings", "margin", "ebitda", "q1", "q2", "q3", "q4", "quarterly"])
                if not has_earnings_evidence:
                    unsupported.append(s)
                    errors.append(f"Unsupported claim: Sentence asserts specific earnings/financial results without source evidence.")
                    continue

                # Contradiction check: claim says profit fell/missed vs article says profit surged/jumped/beat
                claim_negative = any(kw in s_lower for kw in ["profit fell", "profit declined", "earnings missed", "margin contraction", "revenue dropped"])
                source_positive = any(kw in source_text for kw in ["profit surges", "profit jumped", "profit grew", "profit rises", "beat estimates", "record profit"])
                if claim_negative and source_positive:
                    contradicted.append(s)
                    errors.append(f"Contradicted claim: Sentence claims earnings/profit declined, but cited source reports profit growth or beats.")
                    continue

                claim_positive = any(kw in s_lower for kw in ["profit surged", "profit grew", "earnings beat", "margin expansion", "revenue rose"])
                source_negative = any(kw in source_text for kw in ["profit drops", "profit plunged", "loss widens", "earnings miss", "margin drops"])
                if claim_positive and source_negative:
                    contradicted.append(s)
                    errors.append(f"Contradicted claim: Sentence claims earnings growth, but cited source reports profit decline or loss.")
                    continue

            # 3. Regulatory / Government Policy Claims
            reg_claim = any(phrase in s_lower for phrase in [
                "rbi penalty", "rbi issued", "sebi penalty", "sebi probe", "regulatory crackdown", "export duty", "tariff"
            ])
            if reg_claim:
                has_reg_evidence = any(kw in source_text for kw in ["rbi", "sebi", "regulat", "penalty", "duty", "tariff", "probe", "order"])
                if not has_reg_evidence:
                    unsupported.append(s)
                    errors.append(f"Unsupported claim: Sentence asserts regulatory action or government policy without corroborating evidence.")
                    continue

            # 4. Intraday Causal Sequencing Violation (post-market close news claiming to cause daytime move)
            if relevant_arts:
                for a in relevant_arts:
                    timing_cat = a.get("timing_category") or ""
                    is_post_close = a.get("is_after_market_close") or (timing_cat == "after_market_close")
                    if is_post_close:
                        causal_claim = any(w in s_lower for w in [
                            "precipitating this", "caused the", "triggered the", "prompted the decline",
                            "was the primary driver of the", "directly drove the"
                        ])
                        if causal_claim:
                            unsupported.append(s)
                            errors.append(
                                f"Causal sequence violation: Article ('{a.get('title')}') was published after market close on {target_date} "
                                f"and could not have caused the earlier intraday movement."
                            )
                            break

            # 5. Semantic overlap evaluation
            if cited_nums and relevant_arts:
                claim_words = set(re.findall(r"\b\w{4,}\b", s_lower)) - {"which", "their", "there", "these", "about", "stock", "shares", "company"}
                overlap = len(claim_words.intersection(set(re.findall(r"\b\w{4,}\b", source_text)))) / max(len(claim_words), 1)
                if overlap >= 0.20:
                    supported.append(s)
                elif overlap >= 0.10:
                    partially_supported.append(s)
                else:
                    unsupported.append(s)
            elif any(w in s_lower for w in ["hypotheses", "unconfirmed", "hypothesis", "cannot be confirmed"]):
                # Explicitly labelled hypotheses are valid cautious statements
                supported.append(s)

        return supported, partially_supported, unsupported, contradicted, errors

    def validate_factual_evidence(
        self,
        explanation: str,
        articles: List[Dict[str, Any]],
        validated_citations: List[int]
    ) -> Tuple[bool, float, List[str]]:
        """
        Checks that key claims in paragraphs have lexical/semantic anchor in cited articles.
        """
        if not articles or not validated_citations:
            return True, 0.0, []

        cited_text = " ".join([
            f"{articles[c - 1].get('title', '')} {articles[c - 1].get('text_content', '')}"
            for c in validated_citations
        ]).lower()
        cited_words = set(re.findall(r"\b\w{4,}\b", cited_text))

        exp_words = set(re.findall(r"\b\w{4,}\b", explanation.lower()))
        common = exp_words.intersection(cited_words)
        coverage = round(len(common) / max(len(exp_words), 1), 3)

        errors = []
        if coverage < 0.12 and len(articles) > 0:
            errors.append(f"Low factual evidence overlap with source articles (coverage: {coverage:.1%}).")

        return len(errors) == 0, coverage, errors

    def validate(
        self,
        explanation: str,
        articles: List[Dict[str, Any]],
        target_date: str,
        price_regime: str,
        return_pct: float,
        news_sentiment: str,
        signal_agreement: str,
        evidence_sufficiency: str = "sufficient"
    ) -> Dict[str, Any]:
        """
        Comprehensive validation of generated explanation.
        Validates claim-level evidence, citations, temporal constraints, and data consistency.
        """
        if not explanation or not explanation.strip():
            return {
                "is_valid": False,
                "validation_status": "INVALID",
                "validation_errors": ["Explanation is empty."],
                "validated_citations": [],
                "supported_claims": [],
                "partially_supported_claims": [],
                "unsupported_claims": [],
                "contradicted_claims": [],
                "evidence_coverage": 0.0,
                "word_count": 0
            }

        words = explanation.split()
        word_count = len(words)

        if not articles or evidence_sufficiency in ("none", "technical_failure"):
            return {
                "is_valid": True,
                "validation_status": "INSUFFICIENT_EVIDENCE",
                "validation_errors": ["No verified news articles available to corroborate explanation."],
                "validated_citations": [],
                "supported_claims": [],
                "partially_supported_claims": [],
                "unsupported_claims": [],
                "contradicted_claims": [],
                "evidence_coverage": 0.0,
                "word_count": word_count
            }

        all_errors = []

        # 1. Citation validation
        c_ok, valid_cites, c_errs = self.validate_citations(explanation, articles)
        all_errors.extend(c_errs)

        # 2. Temporal validation
        t_ok, t_errs = self.validate_temporal(articles, target_date, valid_cites)
        all_errors.extend(t_errs)

        # 3. Data consistency validation
        d_ok, d_errs = self.validate_data_consistency(
            explanation=explanation,
            price_regime=price_regime,
            return_pct=return_pct,
            news_sentiment=news_sentiment,
            signal_agreement=signal_agreement
        )
        all_errors.extend(d_errs)

        # 4. Claim-Level Evidence Validation
        sup_claims, part_claims, unsup_claims, cont_claims, claim_errs = self.validate_claims(
            explanation=explanation,
            articles=articles,
            validated_citations=valid_cites,
            target_date=target_date
        )
        all_errors.extend(claim_errs)

        # 5. Factual evidence coverage
        e_ok, coverage, e_errs = self.validate_factual_evidence(explanation, articles, valid_cites)
        all_errors.extend(e_errs)

        # 6. Adaptive Word Count Check (only strictly enforce 180-270 when evidence is sufficient)
        if evidence_sufficiency == "sufficient" and len(articles) >= 2:
            if word_count < self.min_words:
                all_errors.append(f"Word count ({word_count}) below recommended minimum ({self.min_words} words).")
            elif word_count > self.max_words:
                all_errors.append(f"Word count ({word_count}) exceeds recommended maximum ({self.max_words} words).")
        else:
            # When evidence is sparse or limited, allow concise explanations down to 30 words
            if word_count < 30:
                all_errors.append(f"Explanation too brief ({word_count} words).")

        # Determine validation status
        if not all_errors:
            status = "VALID"
            is_valid = True
        elif not t_ok or not d_ok or cont_claims or (c_errs and not valid_cites):
            status = "INVALID"
            is_valid = False
        else:
            status = "PARTIALLY_VALID"
            is_valid = True

        return {
            "is_valid": is_valid,
            "validation_status": status,
            "validation_errors": all_errors,
            "validated_citations": valid_cites,
            "supported_claims": sup_claims,
            "partially_supported_claims": part_claims,
            "unsupported_claims": unsup_claims,
            "contradicted_claims": cont_claims,
            "evidence_coverage": coverage,
            "word_count": word_count
        }


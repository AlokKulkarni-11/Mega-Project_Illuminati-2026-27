"""
Date and Time Expression Resolution Service
-------------------------------------------
Interprets temporal expressions in natural language queries:
- Early / Mid / Late month (e.g., "mid March", "early April 2025")
- Specific weeks (e.g., "first week of August", "second week of June 2025", "last two weeks of January 2026")
- Quarters (e.g., "first quarter of 2025", "Q3 2024")
- Relative time expressions (e.g., "last month", "last week", "two weeks ago")
- Event-relative markers ("before the earnings announcement", "after the results announcement")

CRITICAL SAFETY RULE:
If the year is missing and cannot be safely determined, it does NOT silently assume the current year.
Instead, it leaves start_date and end_date as None and flags requires_clarification=True.
Supports deterministic reference dates for reproducible testing.
"""

import calendar
import re
from datetime import datetime, timedelta, date
from typing import Dict, Any, Optional, Tuple


MONTH_NAMES = {
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12
}


class DateResolutionService:
    """
    Interprets natural language date and time expressions.
    """

    def __init__(self, default_timezone: str = "Asia/Kolkata"):
        self.default_timezone = default_timezone

    def resolve(
        self,
        query: str,
        reference_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Extracts and resolves date expressions from query text.
        reference_date: deterministic clock for relative expressions (defaults to datetime.now())
        """
        ref_dt = reference_date or datetime.now()
        q_lower = query.lower()

        # 1. Check for explicit quarter expressions: e.g. "first quarter of 2025", "Q1 2025"
        qtr_match = re.search(
            r"\b(first|second|third|fourth|1st|2nd|3rd|4th|q1|q2|q3|q4)\s+quarter(?:\s+of)?(?:\s+(\d{4}))?\b",
            q_lower
        ) or re.search(r"\b(q[1-4])\s+(\d{4})\b", q_lower)

        if qtr_match:
            q_str = qtr_match.group(1).lower()
            year_str = qtr_match.group(2) if len(qtr_match.groups()) >= 2 else None
            q_num = 1
            if "first" in q_str or "1" in q_str:
                q_num = 1
            elif "second" in q_str or "2" in q_str:
                q_num = 2
            elif "third" in q_str or "3" in q_str:
                q_num = 3
            elif "fourth" in q_str or "4" in q_str:
                q_num = 4

            expr = query[qtr_match.start():qtr_match.end()]
            if not year_str:
                return {
                    "date_expression": expr,
                    "start_date": None,
                    "end_date": None,
                    "time_expression_confidence": 0.85,
                    "requires_clarification": True,
                    "clarification_reason": "The year is not specified",
                    "clarification_type": "missing_year"
                }
            year = int(year_str)
            start_month = (q_num - 1) * 3 + 1
            end_month = start_month + 2
            last_day = calendar.monthrange(year, end_month)[1]
            return {
                "date_expression": expr,
                "start_date": f"{year:04d}-{start_month:02d}-01",
                "end_date": f"{year:04d}-{end_month:02d}-{last_day:02d}",
                "time_expression_confidence": 0.95,
                "requires_clarification": False,
                "clarification_reason": None,
                "clarification_type": None
            }

        # 2. Check for "last two weeks of <Month> <Year?>"
        last_two_wks = re.search(
            r"\blast\s+two\s+weeks\s+of\s+([a-z]+)(?:\s+(\d{4}))?\b",
            q_lower
        )
        if last_two_wks:
            m_name = last_two_wks.group(1)
            y_str = last_two_wks.group(2)
            if m_name in MONTH_NAMES:
                month = MONTH_NAMES[m_name]
                expr = query[last_two_wks.start():last_two_wks.end()]
                if not y_str:
                    return {
                        "date_expression": expr,
                        "start_date": None,
                        "end_date": None,
                        "time_expression_confidence": 0.90,
                        "requires_clarification": True,
                        "clarification_reason": "The year is not specified",
                        "clarification_type": "missing_year"
                    }
                year = int(y_str)
                last_day = calendar.monthrange(year, month)[1]
                return {
                    "date_expression": expr,
                    "start_date": f"{year:04d}-{month:02d}-15",
                    "end_date": f"{year:04d}-{month:02d}-{last_day:02d}",
                    "time_expression_confidence": 0.95,
                    "requires_clarification": False,
                    "clarification_reason": None,
                    "clarification_type": None
                }

        # 3. Check for specific week of month: e.g. "first week of August", "second week of June 2025"
        week_match = re.search(
            r"\b(first|second|third|fourth|last|1st|2nd|3rd|4th)\s+week\s+of\s+([a-z]+)(?:\s+(\d{4}))?\b",
            q_lower
        )
        if week_match:
            wk_str = week_match.group(1).lower()
            m_name = week_match.group(2).lower()
            y_str = week_match.group(3)
            if m_name in MONTH_NAMES:
                month = MONTH_NAMES[m_name]
                expr = query[week_match.start():week_match.end()]
                if not y_str:
                    return {
                        "date_expression": expr,
                        "start_date": None,
                        "end_date": None,
                        "time_expression_confidence": 0.90,
                        "requires_clarification": True,
                        "clarification_reason": "The year is not specified",
                        "clarification_type": "missing_year"
                    }
                year = int(y_str)
                last_day = calendar.monthrange(year, month)[1]
                if "first" in wk_str or "1" in wk_str:
                    s_day, e_day = 1, 7
                elif "second" in wk_str or "2" in wk_str:
                    s_day, e_day = 8, 14
                elif "third" in wk_str or "3" in wk_str:
                    s_day, e_day = 15, 21
                else:  # fourth or last week
                    s_day, e_day = 22, last_day

                return {
                    "date_expression": expr,
                    "start_date": f"{year:04d}-{month:02d}-{s_day:02d}",
                    "end_date": f"{year:04d}-{month:02d}-{e_day:02d}",
                    "time_expression_confidence": 0.95,
                    "requires_clarification": False,
                    "clarification_reason": None,
                    "clarification_type": None
                }

        # 4. Check for Early / Mid / Late Month: e.g. "mid March", "early April 2025", "late December"
        part_month = re.search(
            r"\b(early|mid|late)\s+([a-z]+)(?:\s+(\d{4}))?\b",
            q_lower
        )
        if part_month:
            part = part_month.group(1).lower()
            m_name = part_month.group(2).lower()
            y_str = part_month.group(3)
            if m_name in MONTH_NAMES:
                month = MONTH_NAMES[m_name]
                expr = query[part_month.start():part_month.end()]
                if not y_str:
                    return {
                        "date_expression": expr,
                        "start_date": None,
                        "end_date": None,
                        "time_expression_confidence": 0.90,
                        "requires_clarification": True,
                        "clarification_reason": "The year is not specified",
                        "clarification_type": "missing_year"
                    }
                year = int(y_str)
                last_day = calendar.monthrange(year, month)[1]
                if part == "early":
                    s_day, e_day = 1, 10
                elif part == "mid":
                    s_day, e_day = 11, 20
                else:  # late
                    s_day, e_day = 21, last_day

                return {
                    "date_expression": expr,
                    "start_date": f"{year:04d}-{month:02d}-{s_day:02d}",
                    "end_date": f"{year:04d}-{month:02d}-{e_day:02d}",
                    "time_expression_confidence": 0.95,
                    "requires_clarification": False,
                    "clarification_reason": None,
                    "clarification_type": None
                }

        # 5. Check for Specific Calendar Day: e.g. "26 Nov 2025", "26th November 2025", "November 26, 2025"
        p_day_month = re.search(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]+)(?:\s*,?\s*(\d{4}))?\b", query)
        if p_day_month and p_day_month.group(2).lower() in MONTH_NAMES:
            d_val = int(p_day_month.group(1))
            m_val = MONTH_NAMES[p_day_month.group(2).lower()]
            y_val = p_day_month.group(3)
            expr = query[p_day_month.start():p_day_month.end()].strip()
            if 1 <= d_val <= 31:
                if not y_val:
                    return {
                        "date_expression": expr,
                        "start_date": None,
                        "end_date": None,
                        "time_expression_confidence": 0.90,
                        "requires_clarification": True,
                        "clarification_reason": "The year is not specified",
                        "clarification_type": "missing_year"
                    }
                year = int(y_val)
                return {
                    "date_expression": expr,
                    "start_date": f"{year:04d}-{m_val:02d}-{d_val:02d}",
                    "end_date": f"{year:04d}-{m_val:02d}-{d_val:02d}",
                    "time_expression_confidence": 0.98,
                    "requires_clarification": False,
                    "clarification_reason": None,
                    "clarification_type": None
                }

        p_month_day = re.search(r"\b([a-zA-Z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b", query)
        if p_month_day and p_month_day.group(1).lower() in MONTH_NAMES:
            m_val = MONTH_NAMES[p_month_day.group(1).lower()]
            d_val = int(p_month_day.group(2))
            y_val = p_month_day.group(3)
            expr = query[p_month_day.start():p_month_day.end()].strip()
            if 1 <= d_val <= 31:
                if not y_val:
                    return {
                        "date_expression": expr,
                        "start_date": None,
                        "end_date": None,
                        "time_expression_confidence": 0.90,
                        "requires_clarification": True,
                        "clarification_reason": "The year is not specified",
                        "clarification_type": "missing_year"
                    }
                year = int(y_val)
                return {
                    "date_expression": expr,
                    "start_date": f"{year:04d}-{m_val:02d}-{d_val:02d}",
                    "end_date": f"{year:04d}-{m_val:02d}-{d_val:02d}",
                    "time_expression_confidence": 0.98,
                    "requires_clarification": False,
                    "clarification_reason": None,
                    "clarification_type": None
                }

        # 6. Check for Whole Month: e.g. "during March 2025", "in January 2026", "in March"
        for m_name in MONTH_NAMES:
            pattern = rf"\b(?:in|during|for|throughout)?\s*({m_name})(?:\s+(\d{{4}}))?\b"
            m_match = re.search(pattern, q_lower)
            if m_match:
                month = MONTH_NAMES[m_name]
                y_str = m_match.group(2)
                expr = query[m_match.start():m_match.end()].strip()
                if not y_str:
                    return {
                        "date_expression": expr,
                        "start_date": None,
                        "end_date": None,
                        "time_expression_confidence": 0.85,
                        "requires_clarification": True,
                        "clarification_reason": "The year is not specified",
                        "clarification_type": "missing_year"
                    }
                year = int(y_str)
                last_day = calendar.monthrange(year, month)[1]
                return {
                    "date_expression": expr,
                    "start_date": f"{year:04d}-{month:02d}-01",
                    "end_date": f"{year:04d}-{month:02d}-{last_day:02d}",
                    "time_expression_confidence": 0.95,
                    "requires_clarification": False,
                    "clarification_reason": None,
                    "clarification_type": None
                }

        # 6. Relative time expressions: today, yesterday, last N days, this month, this year, last month, last week
        if re.search(r"\b(today)\b", q_lower):
            today_str = ref_dt.strftime("%Y-%m-%d")
            return {
                "date_expression": "today",
                "start_date": today_str,
                "end_date": today_str,
                "time_expression_confidence": 0.98,
                "requires_clarification": False,
                "clarification_reason": None,
                "clarification_type": None
            }

        if re.search(r"\b(yesterday)\b", q_lower):
            y_dt = ref_dt - timedelta(days=1)
            y_str = y_dt.strftime("%Y-%m-%d")
            return {
                "date_expression": "yesterday",
                "start_date": y_str,
                "end_date": y_str,
                "time_expression_confidence": 0.98,
                "requires_clarification": False,
                "clarification_reason": None,
                "clarification_type": None
            }

        n_days_match = re.search(
            r"\b(?:last|past|over the past|during the last)\s+(\d{1,2}|seven|ten|fourteen|thirty)\s+days?\b",
            q_lower
        )
        if n_days_match:
            raw_n = n_days_match.group(1).lower()
            word_to_num = {"seven": 7, "ten": 10, "fourteen": 14, "thirty": 30}
            num_days = word_to_num.get(raw_n, int(raw_n) if raw_n.isdigit() else 7)
            start_d = ref_dt - timedelta(days=num_days)
            return {
                "date_expression": f"last {num_days} days",
                "start_date": start_d.strftime("%Y-%m-%d"),
                "end_date": ref_dt.strftime("%Y-%m-%d"),
                "time_expression_confidence": 0.95,
                "requires_clarification": False,
                "clarification_reason": None,
                "clarification_type": None
            }

        if "this year" in q_lower or "current year" in q_lower:
            return {
                "date_expression": "this year",
                "start_date": f"{ref_dt.year:04d}-01-01",
                "end_date": ref_dt.strftime("%Y-%m-%d"),
                "time_expression_confidence": 0.95,
                "requires_clarification": False,
                "clarification_reason": None,
                "clarification_type": None
            }

        if "this month" in q_lower or "current month" in q_lower:
            return {
                "date_expression": "this month",
                "start_date": f"{ref_dt.year:04d}-{ref_dt.month:02d}-01",
                "end_date": ref_dt.strftime("%Y-%m-%d"),
                "time_expression_confidence": 0.95,
                "requires_clarification": False,
                "clarification_reason": None,
                "clarification_type": None
            }

        if "this week" in q_lower or "current week" in q_lower:
            monday_dt = ref_dt - timedelta(days=ref_dt.weekday())
            return {
                "date_expression": "this week",
                "start_date": monday_dt.strftime("%Y-%m-%d"),
                "end_date": ref_dt.strftime("%Y-%m-%d"),
                "time_expression_confidence": 0.92,
                "requires_clarification": False,
                "clarification_reason": None,
                "clarification_type": None
            }

        if "last month" in q_lower:
            # Previous calendar month from reference date
            first_of_this_month = ref_dt.replace(day=1)
            last_day_prev_month = first_of_this_month - timedelta(days=1)
            first_day_prev_month = last_day_prev_month.replace(day=1)
            return {
                "date_expression": "last month",
                "start_date": first_day_prev_month.strftime("%Y-%m-%d"),
                "end_date": last_day_prev_month.strftime("%Y-%m-%d"),
                "time_expression_confidence": 0.92,
                "requires_clarification": False,
                "clarification_reason": None,
                "clarification_type": None
            }

        if "last week" in q_lower or "past week" in q_lower:
            end_d = ref_dt - timedelta(days=1)
            start_d = ref_dt - timedelta(days=7)
            return {
                "date_expression": "last week",
                "start_date": start_d.strftime("%Y-%m-%d"),
                "end_date": end_d.strftime("%Y-%m-%d"),
                "time_expression_confidence": 0.90,
                "requires_clarification": False,
                "clarification_reason": None,
                "clarification_type": None
            }

        if "two weeks ago" in q_lower or "past two weeks" in q_lower:
            end_d = ref_dt - timedelta(days=7)
            start_d = ref_dt - timedelta(days=14)
            return {
                "date_expression": "two weeks ago",
                "start_date": start_d.strftime("%Y-%m-%d"),
                "end_date": end_d.strftime("%Y-%m-%d"),
                "time_expression_confidence": 0.88,
                "requires_clarification": False,
                "clarification_reason": None,
                "clarification_type": None
            }

        # 7. Event-relative markers: "before the earnings announcement", "after the results announcement"
        if "before" in q_lower and ("earnings" in q_lower or "results" in q_lower):
            return {
                "date_expression": "before earnings announcement",
                "start_date": None,
                "end_date": None,
                "time_expression_confidence": 0.80,
                "requires_clarification": True,
                "clarification_reason": "Which quarterly earnings or results announcement date should be analyzed?",
                "clarification_type": "event_date_required"
            }

        if "after" in q_lower and ("earnings" in q_lower or "results" in q_lower):
            return {
                "date_expression": "after results announcement",
                "start_date": None,
                "end_date": None,
                "time_expression_confidence": 0.80,
                "requires_clarification": True,
                "clarification_reason": "Which quarterly earnings or results announcement date should be analyzed?",
                "clarification_type": "event_date_required"
            }

        # 8. ISO or explicit YYYY-MM-DD pattern: e.g. "from 2025-03-01 to 2025-03-15"
        iso_dates = re.findall(r"\b(\d{4}-\d{2}-\d{2})\b", query)
        if len(iso_dates) >= 2:
            return {
                "date_expression": f"{iso_dates[0]} to {iso_dates[1]}",
                "start_date": iso_dates[0],
                "end_date": iso_dates[1],
                "time_expression_confidence": 1.0,
                "requires_clarification": False,
                "clarification_reason": None,
                "clarification_type": None
            }
        elif len(iso_dates) == 1:
            return {
                "date_expression": iso_dates[0],
                "start_date": iso_dates[0],
                "end_date": iso_dates[0],
                "time_expression_confidence": 1.0,
                "requires_clarification": False,
                "clarification_reason": None,
                "clarification_type": None
            }

        # No identifiable date expression found
        return {
            "date_expression": None,
            "start_date": None,
            "end_date": None,
            "time_expression_confidence": 0.0,
            "requires_clarification": True,
            "clarification_reason": "No date or time range specified in query",
            "clarification_type": "missing_date"
        }


def normalize_date_input(date_str: Optional[str]) -> Optional[str]:
    """
    Normalizes user-provided or API date strings into a standard YYYY-MM-DD format.
    Handles inputs such as:
    - '26 February 2025'
    - '26 Feb 2025'
    - '2025-02-26'
    - '26-02-2025'
    - '26/02/2025'
    Returns YYYY-MM-DD string or None if unparseable.
    """
    if not date_str or not isinstance(date_str, str):
        return None
    clean = date_str.strip()
    if not clean:
        return None

    # 1. Direct standard formats
    for fmt in (
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%d %B %Y",
        "%d %b %Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%B %d %Y",
        "%b %d %Y",
        "%Y-%m-%d %H:%M:%S",
    ):
        try:
            return datetime.strptime(clean, fmt).strftime("%Y-%m-%d")
        except Exception:
            continue

    # 2. ISO format fallback
    try:
        return datetime.fromisoformat(clean.replace("Z", "+00:00")).strftime("%Y-%m-%d")
    except Exception:
        pass

    # 3. Use DateResolutionService resolution
    resolver = DateResolutionService()
    res = resolver.resolve(clean)
    if not res.get("requires_clarification") and res.get("start_date"):
        return res["start_date"]

    return None


def resolve_date_range(query: str, ref_dt: Optional[datetime] = None) -> Tuple[Optional[date], Optional[date]]:
    """
    Convenience function returning (start_date, end_date) as date objects
    from a natural language query or expression.
    """
    resolver = DateResolutionService()
    res = resolver.resolve(query, reference_date=ref_dt)
    if res.get("requires_clarification") or not res.get("start_date"):
        return None, None
    s = datetime.strptime(res["start_date"], "%Y-%m-%d").date()
    e = datetime.strptime(res["end_date"], "%Y-%m-%d").date()
    return s, e


DateResolver = DateResolutionService


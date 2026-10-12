package com.marketmind.query;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

@Service
public class QueryResolutionService {

    public static final String UNMATCHED_COPY = "Not in this dossier's tracked universe yet — try TCS, Infosys, Reliance, or HDFC Bank.";

    private static final Map<String, List<String>> ALIASES = new LinkedHashMap<>();

    static {
        ALIASES.put("NIFTYBANK", List.of("bank nifty", "nifty bank", "banknifty", "niftybank"));
        ALIASES.put("TCS", List.of("tata consultancy services", "tata consultancy", "tcs"));
        ALIASES.put("INFY", List.of("infosys limited", "infosys", "infy"));
        ALIASES.put("RELIANCE", List.of("reliance industries", "reliance", "ril"));
        ALIASES.put("HDFCBANK", List.of("hdfc bank limited", "hdfc bank", "hdfcbank", "hdfc"));
    }

    public QueryResolveResponse resolve(String query) {
        if (query == null || query.isBlank()) {
            return new QueryResolveResponse("explain", Collections.emptyList(), UNMATCHED_COPY);
        }

        String lower = query.toLowerCase().trim();

        // Detect intent
        String intent = "explain";
        if (lower.contains("compare") || lower.contains(" vs ") || lower.contains(" vs. ") || lower.contains(" versus ")) {
            intent = "compare";
        } else if (lower.contains("trend") || lower.contains("regime") || lower.contains("pattern")) {
            intent = "trend";
        }

        // Deterministic token matching against symbols and aliases
        List<String> matchedSymbols = new ArrayList<>();
        for (Map.Entry<String, List<String>> entry : ALIASES.entrySet()) {
            String canonical = entry.getKey();
            for (String alias : entry.getValue()) {
                if (containsWordOrPhrase(lower, alias)) {
                    if (!matchedSymbols.contains(canonical)) {
                        matchedSymbols.add(canonical);
                    }
                    break;
                }
            }
        }

        if (matchedSymbols.size() > 1 && !"compare".equals(intent)) {
            intent = "compare";
        }

        String unmatchedMsg = matchedSymbols.isEmpty() ? UNMATCHED_COPY : null;

        return new QueryResolveResponse(intent, matchedSymbols, unmatchedMsg);
    }

    private boolean containsWordOrPhrase(String text, String phrase) {
        if (phrase.contains(" ")) {
            return text.contains(phrase);
        }
        Pattern pattern = Pattern.compile("\\b" + Pattern.quote(phrase) + "\\b", Pattern.CASE_INSENSITIVE);
        return pattern.matcher(text).find();
    }
}

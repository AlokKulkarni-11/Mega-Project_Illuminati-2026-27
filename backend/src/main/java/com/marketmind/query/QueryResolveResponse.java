package com.marketmind.query;

import java.util.List;

public record QueryResolveResponse(
        String intent,
        List<String> symbols,
        String unmatchedMessage
) {}

package com.marketmind.watchlist;

import java.time.Instant;

public record WatchlistItemDto(
        Long id,
        String symbol,
        String name,
        String regime,
        String agreement,
        Instant createdAt,
        Double price,
        Double change,
        Double changePercent,
        Double dayHigh,
        Double dayLow,
        Long volume,
        String sector,
        boolean hasSentimentUsp
) {
    public WatchlistItemDto(Long id, String symbol, String name, String regime, String agreement, Instant createdAt) {
        this(id, symbol, name, regime, agreement, createdAt, null, null, null, null, null, null, null, false);
    }
}

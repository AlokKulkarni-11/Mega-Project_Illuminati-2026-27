package com.marketmind.watchlist;

import java.time.Instant;

public record WatchlistItemDto(
        Long id,
        String symbol,
        String name,
        String regime,
        String agreement,
        Instant createdAt
) {}

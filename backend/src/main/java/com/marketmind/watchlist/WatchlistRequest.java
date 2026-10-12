package com.marketmind.watchlist;

import jakarta.validation.constraints.NotBlank;

public record WatchlistRequest(
        @NotBlank(message = "Symbol is required")
        String symbol
) {}

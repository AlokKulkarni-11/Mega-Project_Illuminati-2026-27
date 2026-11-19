package com.marketmind.watchlist;

import com.marketmind.auth.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/watchlist")
@Tag(name = "Watchlist", description = "User watchlist management with engine enrichment and live market data")
public class WatchlistController {

    private final WatchlistService watchlistService;

    public WatchlistController(WatchlistService watchlistService) {
        this.watchlistService = watchlistService;
    }

    @GetMapping
    @Operation(summary = "Get user watchlist items")
    public ResponseEntity<List<WatchlistItemDto>> getWatchlist(@AuthenticationPrincipal UserPrincipal principal) {
        UUID userId = resolveUserId(principal);
        return ResponseEntity.ok(watchlistService.getWatchlist(userId));
    }

    @PostMapping
    @Operation(summary = "Add a symbol to user watchlist")
    public ResponseEntity<WatchlistItemDto> addToWatchlist(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody WatchlistRequest request
    ) {
        UUID userId = resolveUserId(principal);
        return ResponseEntity.ok(watchlistService.addToWatchlist(userId, request.symbol()));
    }

    @DeleteMapping("/{symbol}")
    @Operation(summary = "Remove a symbol from user watchlist")
    public ResponseEntity<Map<String, String>> removeFromWatchlist(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String symbol
    ) {
        UUID userId = resolveUserId(principal);
        watchlistService.removeFromWatchlist(userId, symbol);
        return ResponseEntity.ok(Map.of("message", "Symbol removed from watchlist", "symbol", symbol));
    }

    @GetMapping("/check")
    @Operation(summary = "Check if symbol is present in user watchlist")
    public ResponseEntity<Map<String, Boolean>> checkInWatchlist(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String symbol
    ) {
        UUID userId = resolveUserId(principal);
        boolean exists = watchlistService.isInWatchlist(userId, symbol);
        return ResponseEntity.ok(Map.of("inWatchlist", exists));
    }

    private UUID resolveUserId(UserPrincipal principal) {
        if (principal != null && principal.getId() != null) {
            return principal.getId();
        }
        return WatchlistService.DEFAULT_DEMO_USER_ID;
    }

    @GetMapping("/directory")
    @Operation(summary = "Search all Indian equity stocks across sectors")
    public ResponseEntity<List<LiveStockQuoteService.FallbackStockInfo>> searchStocks(
            @RequestParam(required = false, defaultValue = "") String q
    ) {
        return ResponseEntity.ok(watchlistService.searchDirectory(q));
    }

    @GetMapping("/quote/{symbol}")
    @Operation(summary = "Get live stock quote and USP availability")
    public ResponseEntity<LiveStockQuoteService.StockQuote> getLiveQuote(@PathVariable String symbol) {
        LiveStockQuoteService.StockQuote quote = watchlistService.getLiveQuote(symbol);
        if (quote == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(quote);
    }
}

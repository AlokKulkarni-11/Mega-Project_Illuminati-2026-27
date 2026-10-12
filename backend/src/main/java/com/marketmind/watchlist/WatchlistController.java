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

@RestController
@RequestMapping("/api/watchlist")
@Tag(name = "Watchlist", description = "User watchlist management with engine enrichment")
public class WatchlistController {

    private final WatchlistService watchlistService;

    public WatchlistController(WatchlistService watchlistService) {
        this.watchlistService = watchlistService;
    }

    @GetMapping
    @Operation(summary = "Get user watchlist items")
    public ResponseEntity<List<WatchlistItemDto>> getWatchlist(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(watchlistService.getWatchlist(principal.getId()));
    }

    @PostMapping
    @Operation(summary = "Add a symbol to user watchlist")
    public ResponseEntity<WatchlistItemDto> addToWatchlist(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody WatchlistRequest request
    ) {
        return ResponseEntity.ok(watchlistService.addToWatchlist(principal.getId(), request.symbol()));
    }

    @DeleteMapping("/{symbol}")
    @Operation(summary = "Remove a symbol from user watchlist")
    public ResponseEntity<Map<String, String>> removeFromWatchlist(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String symbol
    ) {
        watchlistService.removeFromWatchlist(principal.getId(), symbol);
        return ResponseEntity.ok(Map.of("message", "Symbol removed from watchlist", "symbol", symbol));
    }

    @GetMapping("/check")
    @Operation(summary = "Check if symbol is present in user watchlist")
    public ResponseEntity<Map<String, Boolean>> checkInWatchlist(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String symbol
    ) {
        boolean exists = watchlistService.isInWatchlist(principal.getId(), symbol);
        return ResponseEntity.ok(Map.of("inWatchlist", exists));
    }
}

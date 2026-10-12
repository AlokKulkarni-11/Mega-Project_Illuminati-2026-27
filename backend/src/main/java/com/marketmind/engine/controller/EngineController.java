package com.marketmind.engine.controller;

import com.marketmind.config.CacheConfig;
import com.marketmind.engine.InsightEngine;
import com.marketmind.engine.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/engine")
@Tag(name = "Insight Engine", description = "Market intelligence engine endpoints")
public class EngineController {

    private final InsightEngine engine;

    public EngineController(InsightEngine engine) {
        this.engine = engine;
    }

    @GetMapping("/instruments")
    @Cacheable(CacheConfig.CACHE_INSTRUMENTS)
    @Operation(summary = "Get list of tracked instruments")
    public ResponseEntity<List<InstrumentDto>> getInstruments() {
        return ResponseEntity.ok(engine.instruments());
    }

    @GetMapping("/instruments/{symbol}/prices")
    @Cacheable(value = CacheConfig.CACHE_PRICES, key = "#symbol + '_' + #days")
    @Operation(summary = "Get price series history for an instrument")
    public ResponseEntity<PriceSeriesDto> getPrices(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "60") int days
    ) {
        return ResponseEntity.ok(engine.prices(symbol, days));
    }

    @GetMapping("/instruments/{symbol}/anomalies")
    @Cacheable(value = CacheConfig.CACHE_ANOMALIES, key = "#symbol + '_' + #from + '_' + #to")
    @Operation(summary = "Get detected anomalies for an instrument")
    public ResponseEntity<List<AnomalyDto>> getAnomalies(
            @PathVariable String symbol,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(engine.anomalies(symbol, from, to));
    }

    @GetMapping("/instruments/{symbol}/explanation")
    @Cacheable(value = CacheConfig.CACHE_EXPLANATIONS, key = "#symbol + '_' + #date")
    @Operation(summary = "Get causal explanation for an anomaly on a given date (or abstention)")
    public ResponseEntity<ExplanationDto> getExplanation(
            @PathVariable String symbol,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(engine.explanation(symbol, date));
    }

    @GetMapping("/pulse")
    @Cacheable(CacheConfig.CACHE_PULSE)
    @Operation(summary = "Get overall market pulse and multi-horizon directional strip")
    public ResponseEntity<MarketPulseDto> getPulse() {
        return ResponseEntity.ok(engine.pulse());
    }

    @GetMapping("/sectors")
    @Cacheable(CacheConfig.CACHE_SECTORS)
    @Operation(summary = "Get sector snapshots and aggregate sentiment")
    public ResponseEntity<List<SectorSnapshotDto>> getSectors() {
        return ResponseEntity.ok(engine.sectors());
    }

    @GetMapping("/leaderboard")
    @Cacheable(value = CacheConfig.CACHE_LEADERBOARD, key = "#limit")
    @Operation(summary = "Get leaderboard of most unusual moves ranked by absolute z-score")
    public ResponseEntity<List<AnomalyDto>> getLeaderboard(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(engine.leaderboard(limit));
    }

    @GetMapping("/compare")
    @Cacheable(value = CacheConfig.CACHE_COMPARE, key = "#symbols")
    @Operation(summary = "Compare 2-4 instruments side by side")
    public ResponseEntity<ComparisonDto> compare(@RequestParam String symbols) {
        List<String> symbolList = Arrays.stream(symbols.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        return ResponseEntity.ok(engine.compare(symbolList));
    }

    @GetMapping("/scoreboard")
    @Cacheable(CacheConfig.CACHE_SCOREBOARD)
    @Operation(summary = "Get backtest accuracy and abstention summary")
    public ResponseEntity<ScoreboardDto> getScoreboard() {
        return ResponseEntity.ok(engine.scoreboard());
    }
}

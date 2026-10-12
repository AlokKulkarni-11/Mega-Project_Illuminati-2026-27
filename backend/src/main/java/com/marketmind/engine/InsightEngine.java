package com.marketmind.engine;

import com.marketmind.engine.dto.*;

import java.time.LocalDate;
import java.util.List;

public interface InsightEngine {
    EngineStatus status();
    List<InstrumentDto> instruments();
    PriceSeriesDto prices(String symbol, int days);
    List<AnomalyDto> anomalies(String symbol, LocalDate from, LocalDate to);
    ExplanationDto explanation(String symbol, LocalDate date);   // may be an abstention
    MarketPulseDto pulse();
    List<SectorSnapshotDto> sectors();
    List<AnomalyDto> leaderboard(int limit);                      // top |z| recent moves
    ComparisonDto compare(List<String> symbols);                  // 2-4 symbols
    ScoreboardDto scoreboard();                                   // backtest accuracy summary
}

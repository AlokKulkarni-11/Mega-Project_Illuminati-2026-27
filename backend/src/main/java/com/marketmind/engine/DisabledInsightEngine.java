package com.marketmind.engine;

import com.marketmind.common.EngineDisabledException;
import com.marketmind.engine.dto.*;

import java.time.LocalDate;
import java.util.List;

public class DisabledInsightEngine implements InsightEngine {

    @Override
    public EngineStatus status() {
        return EngineStatus.DISABLED;
    }

    @Override
    public List<InstrumentDto> instruments() {
        throw new EngineDisabledException("ENGINE_DISABLED: The market intelligence engine is currently disabled.");
    }

    @Override
    public PriceSeriesDto prices(String symbol, int days) {
        throw new EngineDisabledException("ENGINE_DISABLED: The market intelligence engine is currently disabled.");
    }

    @Override
    public List<AnomalyDto> anomalies(String symbol, LocalDate from, LocalDate to) {
        throw new EngineDisabledException("ENGINE_DISABLED: The market intelligence engine is currently disabled.");
    }

    @Override
    public ExplanationDto explanation(String symbol, LocalDate date) {
        throw new EngineDisabledException("ENGINE_DISABLED: The market intelligence engine is currently disabled.");
    }

    @Override
    public MarketPulseDto pulse() {
        throw new EngineDisabledException("ENGINE_DISABLED: The market intelligence engine is currently disabled.");
    }

    @Override
    public List<SectorSnapshotDto> sectors() {
        throw new EngineDisabledException("ENGINE_DISABLED: The market intelligence engine is currently disabled.");
    }

    @Override
    public List<AnomalyDto> leaderboard(int limit) {
        throw new EngineDisabledException("ENGINE_DISABLED: The market intelligence engine is currently disabled.");
    }

    @Override
    public ComparisonDto compare(List<String> symbols) {
        throw new EngineDisabledException("ENGINE_DISABLED: The market intelligence engine is currently disabled.");
    }

    @Override
    public ScoreboardDto scoreboard() {
        throw new EngineDisabledException("ENGINE_DISABLED: The market intelligence engine is currently disabled.");
    }
}

package com.marketmind.engine;

import com.marketmind.engine.dto.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public abstract class AbstractInsightEngineContractTest {

    protected abstract InsightEngine getEngine();

    @Test
    @DisplayName("Contract: status() returns a non-null EngineStatus")
    void testStatus() {
        InsightEngine engine = getEngine();
        assertNotNull(engine.status());
    }

    @Test
    @DisplayName("Contract: instruments() includes NIFTYBANK of type index")
    void testInstruments() {
        InsightEngine engine = getEngine();
        List<InstrumentDto> instruments = engine.instruments();
        assertNotNull(instruments);
        assertFalse(instruments.isEmpty());

        boolean hasNiftyBank = instruments.stream()
                .anyMatch(i -> "NIFTYBANK".equalsIgnoreCase(i.symbol()) && "index".equalsIgnoreCase(i.type()));
        assertTrue(hasNiftyBank, "Instruments must contain NIFTYBANK with type 'index'");
    }

    @Test
    @DisplayName("Contract: prices() returns valid price points")
    void testPrices() {
        InsightEngine engine = getEngine();
        PriceSeriesDto series = engine.prices("NIFTYBANK", 10);
        assertNotNull(series);
        assertEquals("NIFTYBANK", series.symbol());
        assertNotNull(series.points());
        assertFalse(series.points().isEmpty());
    }

    @Test
    @DisplayName("Contract: anomalies() returns 12 Nifty Bank anomalies including 5 unconfirmed")
    void testAnomalies() {
        InsightEngine engine = getEngine();
        List<AnomalyDto> anomalies = engine.anomalies("NIFTYBANK", null, null);
        assertNotNull(anomalies);
        assertEquals(12, anomalies.size(), "Should have exactly 12 Nifty Bank anomalies");

        long unconfirmedCount = anomalies.stream()
                .filter(a -> "unconfirmed".equalsIgnoreCase(a.confidence()))
                .count();
        assertEquals(5, unconfirmedCount, "Should have exactly 5 unconfirmed anomalies for abstention testing");
    }

    @Test
    @DisplayName("Contract: explanation() on 2026-02-01 returns confirmed driver with citation")
    void testConfirmedExplanation() {
        InsightEngine engine = getEngine();
        ExplanationDto explanation = engine.explanation("NIFTYBANK", LocalDate.of(2026, 2, 1));
        assertNotNull(explanation);
        assertTrue(explanation.hasClearDriver(), "Budget date must have clear driver");
        assertEquals("regulatory", explanation.causalCategory());
        assertEquals("high", explanation.confidence());
        assertEquals("aligned", explanation.signalAgreement());
        assertFalse(explanation.citations().isEmpty(), "Confirmed explanation must include citations");
        assertEquals(1, explanation.citations().getFirst().n());
    }

    @Test
    @DisplayName("Contract: explanation() on unconfirmed anomaly date returns first-class abstention")
    void testAbstentionExplanation() {
        InsightEngine engine = getEngine();
        ExplanationDto explanation = engine.explanation("NIFTYBANK", LocalDate.of(2025, 11, 26));
        assertNotNull(explanation);
        assertFalse(explanation.hasClearDriver(), "Unconfirmed date must be an abstention with hasClearDriver=false");
        assertEquals("low", explanation.confidence(), "Abstention confidence must be low");
        assertEquals("insufficient", explanation.signalAgreement(), "Abstention signal agreement must be insufficient");
        assertTrue(explanation.citations().isEmpty(), "Abstention must have empty citations");
    }

    @Test
    @DisplayName("Contract: pulse() returns brass-dial metrics and 3 horizon indicators")
    void testPulse() {
        InsightEngine engine = getEngine();
        MarketPulseDto pulse = engine.pulse();
        assertNotNull(pulse);
        assertTrue(pulse.dialScore() >= 0 && pulse.dialScore() <= 100);
        assertNotNull(pulse.shortTerm());
        assertEquals(5, pulse.shortTerm().days());
        assertNotNull(pulse.mediumTerm());
        assertEquals(20, pulse.mediumTerm().days());
        assertNotNull(pulse.longTerm());
        assertEquals(60, pulse.longTerm().days());
    }

    @Test
    @DisplayName("Contract: sectors() returns non-empty sector snapshots")
    void testSectors() {
        InsightEngine engine = getEngine();
        List<SectorSnapshotDto> sectors = engine.sectors();
        assertNotNull(sectors);
        assertFalse(sectors.isEmpty());
    }

    @Test
    @DisplayName("Contract: leaderboard() respects limit parameter")
    void testLeaderboard() {
        InsightEngine engine = getEngine();
        List<AnomalyDto> top5 = engine.leaderboard(5);
        assertNotNull(top5);
        assertTrue(top5.size() <= 5);
    }

    @Test
    @DisplayName("Contract: compare() returns rows for requested symbols")
    void testCompare() {
        InsightEngine engine = getEngine();
        ComparisonDto comparison = engine.compare(List.of("TCS", "INFY"));
        assertNotNull(comparison);
        assertNotNull(comparison.rows());
        assertFalse(comparison.rows().isEmpty());
    }

    @Test
    @DisplayName("Contract: scoreboard() returns 7 explained and 5 unexplained counts")
    void testScoreboard() {
        InsightEngine engine = getEngine();
        ScoreboardDto scoreboard = engine.scoreboard();
        assertNotNull(scoreboard);
        assertEquals(12, scoreboard.totalAnalyzed());
        assertEquals(7, scoreboard.explainedCount());
        assertEquals(5, scoreboard.unexplainedCount());
        assertTrue(scoreboard.summary().contains("7 of 12"));
    }
}

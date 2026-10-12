package com.marketmind.engine.mock;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.marketmind.engine.InsightEngine;
import com.marketmind.engine.dto.*;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class MockInsightEngine implements InsightEngine {

    private static final Logger log = LoggerFactory.getLogger(MockInsightEngine.class);

    private final ObjectMapper objectMapper;
    private List<InstrumentDto> instrumentList = new ArrayList<>();
    private Map<String, List<PricePointDto>> priceMap = new HashMap<>();
    private List<AnomalyDto> anomalyList = new ArrayList<>();
    private List<ExplanationDto> explanationList = new ArrayList<>();
    private MarketPulseDto pulseData;
    private List<SectorSnapshotDto> sectorList = new ArrayList<>();
    private List<AnomalyDto> leaderboardList = new ArrayList<>();
    private ScoreboardDto scoreboardData;
    private ComparisonDto comparisonData;

    public MockInsightEngine() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    @PostConstruct
    public void init() {
        try {
            loadInstruments();
            loadPrices();
            loadAnomalies();
            loadExplanations();
            loadPulse();
            loadSectors();
            loadLeaderboard();
            loadScoreboard();
            loadComparison();
            log.info("MockInsightEngine initialized successfully with sample fixtures.");
        } catch (Exception e) {
            log.error("Failed to load fixtures in MockInsightEngine", e);
            throw new IllegalStateException("Failed to load mock fixtures", e);
        }
    }

    private void loadInstruments() throws Exception {
        try (InputStream is = new ClassPathResource("fixtures/instruments.json").getInputStream()) {
            this.instrumentList = objectMapper.readValue(is, new TypeReference<>() {});
        }
    }

    private void loadPrices() throws Exception {
        try (InputStream is = new ClassPathResource("fixtures/prices.json").getInputStream()) {
            this.priceMap = objectMapper.readValue(is, new TypeReference<>() {});
        }
    }

    private void loadAnomalies() throws Exception {
        try (InputStream is = new ClassPathResource("fixtures/nifty_bank_anomalies.json").getInputStream()) {
            this.anomalyList = objectMapper.readValue(is, new TypeReference<>() {});
        }
    }

    private void loadExplanations() throws Exception {
        try (InputStream is = new ClassPathResource("fixtures/explanations.json").getInputStream()) {
            this.explanationList = objectMapper.readValue(is, new TypeReference<>() {});
        }
    }

    private void loadPulse() throws Exception {
        try (InputStream is = new ClassPathResource("fixtures/pulse.json").getInputStream()) {
            this.pulseData = objectMapper.readValue(is, MarketPulseDto.class);
        }
    }

    private void loadSectors() throws Exception {
        try (InputStream is = new ClassPathResource("fixtures/sectors.json").getInputStream()) {
            this.sectorList = objectMapper.readValue(is, new TypeReference<>() {});
        }
    }

    private void loadLeaderboard() throws Exception {
        try (InputStream is = new ClassPathResource("fixtures/leaderboard.json").getInputStream()) {
            this.leaderboardList = objectMapper.readValue(is, new TypeReference<>() {});
        }
    }

    private void loadScoreboard() throws Exception {
        try (InputStream is = new ClassPathResource("fixtures/scoreboard.json").getInputStream()) {
            this.scoreboardData = objectMapper.readValue(is, ScoreboardDto.class);
        }
    }

    private void loadComparison() throws Exception {
        try (InputStream is = new ClassPathResource("fixtures/compare.json").getInputStream()) {
            this.comparisonData = objectMapper.readValue(is, ComparisonDto.class);
        }
    }

    @Override
    public EngineStatus status() {
        return EngineStatus.HEALTHY;
    }

    @Override
    public List<InstrumentDto> instruments() {
        return Collections.unmodifiableList(instrumentList);
    }

    @Override
    public PriceSeriesDto prices(String symbol, int days) {
        String sym = symbol.toUpperCase().trim();
        List<PricePointDto> points = priceMap.get(sym);
        if (points == null) {
            points = priceMap.get("NIFTYBANK");
            if (points == null) {
                points = Collections.emptyList();
            }
        }

        if (days > 0 && points.size() > days) {
            points = points.subList(points.size() - days, points.size());
        }

        return new PriceSeriesDto(sym, points);
    }

    @Override
    public List<AnomalyDto> anomalies(String symbol, LocalDate from, LocalDate to) {
        String sym = symbol.toUpperCase().trim();
        return anomalyList.stream()
                .filter(a -> sym.equalsIgnoreCase(a.symbol()) || sym.equals("NIFTYBANK"))
                .filter(a -> from == null || !a.date().isBefore(from))
                .filter(a -> to == null || !a.date().isAfter(to))
                .sorted(Comparator.comparing(AnomalyDto::date).reversed())
                .collect(Collectors.toList());
    }

    @Override
    public ExplanationDto explanation(String symbol, LocalDate date) {
        String sym = symbol.toUpperCase().trim();
        Optional<ExplanationDto> match = explanationList.stream()
                .filter(e -> sym.equalsIgnoreCase(e.symbol()) && (date == null || date.equals(e.date())))
                .findFirst();

        if (match.isPresent()) {
            return match.get();
        }

        // Return a first-class abstention when no confirmed explanation exists
        return new ExplanationDto(
                sym,
                date != null ? date : LocalDate.now(),
                "neutral",
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                false,
                "No confirmed causal driver found in retrieved financial coverage. This move may reflect general market flows, liquidity shifts, or portfolio rebalancing.",
                "unclear",
                "unclear",
                "neutral",
                "insufficient",
                "low",
                Collections.emptyList()
        );
    }

    @Override
    public MarketPulseDto pulse() {
        return pulseData;
    }

    @Override
    public List<SectorSnapshotDto> sectors() {
        return Collections.unmodifiableList(sectorList);
    }

    @Override
    public List<AnomalyDto> leaderboard(int limit) {
        int n = limit > 0 ? Math.min(limit, leaderboardList.size()) : leaderboardList.size();
        return leaderboardList.subList(0, n);
    }

    @Override
    public ComparisonDto compare(List<String> symbols) {
        if (symbols == null || symbols.isEmpty()) {
            return comparisonData;
        }

        Set<String> requested = symbols.stream().map(s -> s.toUpperCase().trim()).collect(Collectors.toSet());
        List<ComparisonRowDto> filtered = comparisonData.rows().stream()
                .filter(r -> requested.contains(r.symbol().toUpperCase()))
                .collect(Collectors.toList());

        if (filtered.isEmpty()) {
            filtered = comparisonData.rows();
        }

        return new ComparisonDto(filtered);
    }

    @Override
    public ScoreboardDto scoreboard() {
        return scoreboardData;
    }
}

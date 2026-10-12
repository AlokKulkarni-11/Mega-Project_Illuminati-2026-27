package com.marketmind.engine.http;

import com.marketmind.common.EngineUnavailableException;
import com.marketmind.engine.InsightEngine;
import com.marketmind.engine.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

@Component
public class HttpInsightEngine implements InsightEngine {

    private static final Logger log = LoggerFactory.getLogger(HttpInsightEngine.class);

    private final RestClient restClient;

    @Autowired
    public HttpInsightEngine(
            @Value("${marketmind.engine.base-url:http://localhost:8000}") String baseUrl,
            @Value("${marketmind.engine.timeout-ms:15000}") int timeoutMs
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(timeoutMs));
        factory.setReadTimeout(Duration.ofMillis(timeoutMs));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }

    // Constructor for testing with pre-built RestClient
    public HttpInsightEngine(RestClient restClient) {
        this.restClient = restClient;
    }

    private <T> T execute(String operationName, java.util.function.Supplier<T> call) {
        try {
            return call.get();
        } catch (Exception ex) {
            log.error("HttpInsightEngine call failed for {}: {}", operationName, ex.getMessage());
            throw new EngineUnavailableException("Engine service unavailable during " + operationName + ": " + ex.getMessage(), ex);
        }
    }

    @Override
    public EngineStatus status() {
        return execute("status", () -> {
            String res = restClient.get()
                    .uri("/health")
                    .retrieve()
                    .body(String.class);
            return (res != null && res.contains("OK")) ? EngineStatus.HEALTHY : EngineStatus.DEGRADED;
        });
    }

    @Override
    public List<InstrumentDto> instruments() {
        return execute("instruments", () ->
                restClient.get()
                        .uri("/instruments")
                        .retrieve()
                        .body(new ParameterizedTypeReference<List<InstrumentDto>>() {})
        );
    }

    @Override
    public PriceSeriesDto prices(String symbol, int days) {
        return execute("prices", () ->
                restClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/instruments/{symbol}/prices")
                                .queryParam("days", days)
                                .build(symbol))
                        .retrieve()
                        .body(PriceSeriesDto.class)
        );
    }

    @Override
    public List<AnomalyDto> anomalies(String symbol, LocalDate from, LocalDate to) {
        return execute("anomalies", () ->
                restClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/instruments/{symbol}/anomalies")
                                .queryParam("from", from)
                                .queryParam("to", to)
                                .build(symbol))
                        .retrieve()
                        .body(new ParameterizedTypeReference<List<AnomalyDto>>() {})
        );
    }

    @Override
    public ExplanationDto explanation(String symbol, LocalDate date) {
        return execute("explanation", () ->
                restClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/instruments/{symbol}/explanation")
                                .queryParam("date", date)
                                .build(symbol))
                        .retrieve()
                        .body(ExplanationDto.class)
        );
    }

    @Override
    public MarketPulseDto pulse() {
        return execute("pulse", () ->
                restClient.get()
                        .uri("/pulse")
                        .retrieve()
                        .body(MarketPulseDto.class)
        );
    }

    @Override
    public List<SectorSnapshotDto> sectors() {
        return execute("sectors", () ->
                restClient.get()
                        .uri("/sectors")
                        .retrieve()
                        .body(new ParameterizedTypeReference<List<SectorSnapshotDto>>() {})
        );
    }

    @Override
    public List<AnomalyDto> leaderboard(int limit) {
        return execute("leaderboard", () -> {
            List<AnomalyDto> list = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/leaderboard")
                            .queryParam("limit", limit)
                            .build())
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<AnomalyDto>>() {});
            if (list == null) {
                return Collections.emptyList();
            }
            if (limit > 0 && list.size() > limit) {
                return list.subList(0, limit);
            }
            return list;
        });
    }

    @Override
    public ComparisonDto compare(List<String> symbols) {
        return execute("compare", () ->
                restClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/compare")
                                .queryParam("symbols", String.join(",", symbols))
                                .build())
                        .retrieve()
                        .body(ComparisonDto.class)
        );
    }

    @Override
    public ScoreboardDto scoreboard() {
        return execute("scoreboard", () ->
                restClient.get()
                        .uri("/scoreboard")
                        .retrieve()
                        .body(ScoreboardDto.class)
        );
    }
}

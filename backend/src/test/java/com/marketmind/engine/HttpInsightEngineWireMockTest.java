package com.marketmind.engine;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import com.marketmind.common.EngineUnavailableException;
import com.marketmind.engine.http.HttpInsightEngine;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.assertThrows;

public class HttpInsightEngineWireMockTest extends AbstractInsightEngineContractTest {

    private static WireMockServer wireMockServer;
    private static HttpInsightEngine httpEngine;

    @BeforeAll
    static void startWireMock() {
        wireMockServer = new WireMockServer(0);
        wireMockServer.start();
        WireMock.configureFor("localhost", wireMockServer.port());
        httpEngine = new HttpInsightEngine("http://localhost:" + wireMockServer.port(), 5000);
    }

    @AfterAll
    static void stopWireMock() {
        if (wireMockServer != null) {
            wireMockServer.stop();
        }
    }

    private static String loadFixture(String path) {
        try (InputStream is = new ClassPathResource(path).getInputStream()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Could not load fixture: " + path, e);
        }
    }

    @BeforeEach
    void resetAndStub() {
        wireMockServer.resetAll();

        stubFor(get(urlEqualTo("/health"))
                .willReturn(aResponse().withStatus(200).withBody("OK")));

        stubFor(get(urlEqualTo("/instruments"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody(loadFixture("fixtures/instruments.json"))));

        stubFor(get(urlPathMatching("/instruments/NIFTYBANK/prices.*"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "symbol": "NIFTYBANK",
                                  "points": [
                                    { "date": "2026-09-15", "open": 56884.25, "high": 56996.35, "low": 55794.75, "close": 55794.75, "volume": 253162379 }
                                  ]
                                }
                                """)));

        stubFor(get(urlPathMatching("/instruments/NIFTYBANK/anomalies.*"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody(loadFixture("fixtures/nifty_bank_anomalies.json"))));

        stubFor(get(urlEqualTo("/instruments/NIFTYBANK/explanation?date=2026-02-01"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "symbol": "NIFTYBANK",
                                  "date": "2026-02-01",
                                  "priceDirection": "bearish",
                                  "returnPct": -2.0,
                                  "returnZ": -2.33,
                                  "hasClearDriver": true,
                                  "causeSummary": "Union Budget 2026 presented on Feb 1; PSU banks fell sharply.",
                                  "causalCategory": "regulatory",
                                  "scope": "sector",
                                  "newsDirection": "bearish",
                                  "signalAgreement": "aligned",
                                  "confidence": "high",
                                  "citations": [
                                    { "n": 1, "title": "Budget 2026 Impact", "source": "Moneycontrol", "url": "https://example.com", "publishedDate": "2026-02-01" }
                                  ]
                                }
                                """)));

        stubFor(get(urlEqualTo("/instruments/NIFTYBANK/explanation?date=2025-11-26"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "symbol": "NIFTYBANK",
                                  "date": "2025-11-26",
                                  "priceDirection": "bullish",
                                  "returnPct": 1.2,
                                  "returnZ": 2.17,
                                  "hasClearDriver": false,
                                  "causeSummary": "No confirmed driver",
                                  "causalCategory": "unclear",
                                  "scope": "unclear",
                                  "newsDirection": "neutral",
                                  "signalAgreement": "insufficient",
                                  "confidence": "low",
                                  "citations": []
                                }
                                """)));

        stubFor(get(urlEqualTo("/pulse"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody(loadFixture("fixtures/pulse.json"))));

        stubFor(get(urlEqualTo("/sectors"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody(loadFixture("fixtures/sectors.json"))));

        stubFor(get(urlPathMatching("/leaderboard.*"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody(loadFixture("fixtures/leaderboard.json"))));

        stubFor(get(urlPathMatching("/compare.*"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody(loadFixture("fixtures/compare.json"))));

        stubFor(get(urlEqualTo("/scoreboard"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody(loadFixture("fixtures/scoreboard.json"))));
    }

    @Override
    protected InsightEngine getEngine() {
        return httpEngine;
    }

    @Test
    void testFailureThrowsEngineUnavailableException() {
        HttpInsightEngine brokenEngine = new HttpInsightEngine("http://localhost:59999", 500);
        assertThrows(EngineUnavailableException.class, brokenEngine::pulse);
    }
}

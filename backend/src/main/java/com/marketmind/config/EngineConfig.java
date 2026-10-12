package com.marketmind.config;

import com.marketmind.engine.DisabledInsightEngine;
import com.marketmind.engine.InsightEngine;
import com.marketmind.engine.http.HttpInsightEngine;
import com.marketmind.engine.mock.MockInsightEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class EngineConfig {

    private static final Logger log = LoggerFactory.getLogger(EngineConfig.class);

    @Bean
    @Primary
    public InsightEngine insightEngine(
            @Value("${marketmind.engine.mode:mock}") String mode,
            MockInsightEngine mockEngine,
            HttpInsightEngine httpEngine
    ) {
        log.info("Configuring InsightEngine bean with mode: {}", mode);
        return switch (mode.toLowerCase().trim()) {
            case "disabled" -> new DisabledInsightEngine();
            case "http" -> httpEngine;
            case "mock" -> mockEngine;
            default -> {
                log.warn("Unknown engine mode '{}', defaulting to mock", mode);
                yield mockEngine;
            }
        };
    }
}

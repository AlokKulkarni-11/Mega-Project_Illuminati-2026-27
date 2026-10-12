package com.marketmind.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.flyway.FlywayConfigurationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class FlywayConfig {

    private static final Logger log = LoggerFactory.getLogger(FlywayConfig.class);

    @Value("${marketmind.engine.schema.enabled:false}")
    private boolean engineSchemaEnabled;

    @Bean
    public FlywayConfigurationCustomizer flywayCustomizer() {
        return configuration -> {
            List<String> locations = new ArrayList<>();
            locations.add("classpath:db/migration/app");

            if (engineSchemaEnabled) {
                log.info("Engine schema migration enabled: adding classpath:db/migration/engine");
                locations.add("classpath:db/migration/engine");
            } else {
                log.info("Engine schema migration disabled: running app migrations only");
            }

            configuration.locations(locations.toArray(new String[0]));
        };
    }
}

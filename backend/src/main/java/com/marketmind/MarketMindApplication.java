package com.marketmind;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@SpringBootApplication
@EnableCaching
public class MarketMindApplication {

    private static final Logger log = LoggerFactory.getLogger(MarketMindApplication.class);

    public static void main(String[] args) {
        loadDotEnvIfPresent();
        configureDatabaseMode();
        SpringApplication.run(MarketMindApplication.class, args);
    }

    private static void configureDatabaseMode() {
        String dbUrl = System.getProperty("DB_URL");
        if (dbUrl == null) {
            dbUrl = System.getenv("DB_URL");
        }

        if (dbUrl != null && dbUrl.contains("postgresql")) {
            log.info("Detected PostgreSQL database URL. Enabling Flyway migrations.");
            if (System.getProperty("FLYWAY_ENABLED") == null && System.getenv("FLYWAY_ENABLED") == null) {
                System.setProperty("FLYWAY_ENABLED", "true");
            }
            if (System.getProperty("HIBERNATE_DDL_AUTO") == null && System.getenv("HIBERNATE_DDL_AUTO") == null) {
                System.setProperty("HIBERNATE_DDL_AUTO", "validate");
            }
        } else {
            log.info("No external PostgreSQL configured. Running with in-memory dummy database.");
        }
    }

    /**
     * Reads key=value pairs from .env or ../.env if present, setting them as system properties
     * so Spring Boot's property resolution (e.g. ${DB_URL:...}) picks them up seamlessly.
     */
    private static void loadDotEnvIfPresent() {
        List<Path> potentialPaths = List.of(
                Paths.get(".env"),
                Paths.get("../.env")
        );

        for (Path path : potentialPaths) {
            if (Files.exists(path)) {
                try {
                    log.info("Loading environment properties from {}", path.toAbsolutePath().normalize());
                    for (String line : Files.readAllLines(path)) {
                        line = line.trim();
                        if (!line.isEmpty() && !line.startsWith("#") && line.contains("=")) {
                            int idx = line.indexOf('=');
                            String key = line.substring(0, idx).trim();
                            String value = line.substring(idx + 1).trim();
                            // Do not overwrite existing system properties or environment variables
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, value);
                            }
                        }
                    }
                    break;
                } catch (Exception e) {
                    log.warn("Could not load .env file from {}: {}", path, e.getMessage());
                }
            }
        }
    }
}

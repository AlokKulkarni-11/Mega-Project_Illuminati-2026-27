package com.marketmind;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@SpringBootApplication
@EnableCaching
@EnableScheduling
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
            String dbUser = System.getProperty("DB_USER");
            if (dbUser == null) {
                dbUser = System.getenv("DB_USER");
            }
            if (dbUser == null) {
                dbUser = "postgres";
            }

            String dbPassword = System.getProperty("DB_PASSWORD");
            if (dbPassword == null) {
                dbPassword = System.getenv("DB_PASSWORD");
            }
            if (dbPassword == null) {
                dbPassword = "";
            }

            // Test if PostgreSQL is reachable and credentials are valid
            boolean connectionValid = false;
            try {
                java.sql.DriverManager.setLoginTimeout(3);
                try (java.sql.Connection conn = java.sql.DriverManager.getConnection(dbUrl, dbUser, dbPassword)) {
                    connectionValid = true;
                }
            } catch (Exception e) {
                log.warn("PostgreSQL connection to {} failed ({}: {}).", dbUrl, e.getClass().getSimpleName(), e.getMessage());
                log.warn("Falling back automatically to in-memory H2 database so backend starts seamlessly without crashing.");
            }

            if (connectionValid) {
                log.info("Detected reachable PostgreSQL database. Enabling Flyway migrations.");
                if (System.getProperty("FLYWAY_ENABLED") == null && System.getenv("FLYWAY_ENABLED") == null) {
                    System.setProperty("FLYWAY_ENABLED", "true");
                }
                if (System.getProperty("HIBERNATE_DDL_AUTO") == null && System.getenv("HIBERNATE_DDL_AUTO") == null) {
                    System.setProperty("HIBERNATE_DDL_AUTO", "validate");
                }
            } else {
                System.setProperty("DB_URL", "jdbc:h2:mem:marketmind;DB_CLOSE_DELAY=-1;MODE=PostgreSQL");
                System.setProperty("DB_USER", "sa");
                System.setProperty("DB_PASSWORD", "");
                System.setProperty("FLYWAY_ENABLED", "false");
                System.setProperty("HIBERNATE_DDL_AUTO", "update");
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

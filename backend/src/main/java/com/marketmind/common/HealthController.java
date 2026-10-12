package com.marketmind.common;

import com.marketmind.engine.InsightEngine;
import com.marketmind.engine.dto.EngineStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
@Tag(name = "Health", description = "Application and component health check")
public class HealthController {

    private final DataSource dataSource;
    private final InsightEngine engine;
    private final String engineMode;

    public HealthController(
            DataSource dataSource,
            InsightEngine engine,
            @Value("${marketmind.engine.mode:mock}") String engineMode
    ) {
        this.dataSource = dataSource;
        this.engine = engine;
        this.engineMode = engineMode;
    }

    @GetMapping
    @Operation(summary = "Check health of application, database, and insight engine")
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> response = new LinkedHashMap<>();

        // Check DB
        Map<String, Object> dbHealth = new LinkedHashMap<>();
        boolean dbOk = false;
        try (Connection conn = dataSource.getConnection()) {
            dbOk = conn.isValid(2);
            dbHealth.put("status", dbOk ? "UP" : "DOWN");
            dbHealth.put("databaseProduct", conn.getMetaData().getDatabaseProductName());
        } catch (Exception e) {
            dbHealth.put("status", "DOWN");
            dbHealth.put("error", e.getMessage());
        }

        // Check Engine
        Map<String, Object> engineHealth = new LinkedHashMap<>();
        engineHealth.put("mode", engineMode);
        try {
            EngineStatus engineStatus = engine.status();
            engineHealth.put("status", engineStatus.name());
        } catch (Exception e) {
            engineHealth.put("status", "UNAVAILABLE");
            engineHealth.put("error", e.getMessage());
        }

        boolean overallUp = dbOk;
        response.put("status", overallUp ? "UP" : "DOWN");
        response.put("components", Map.of("db", dbHealth, "engine", engineHealth));

        return ResponseEntity.ok(response);
    }
}

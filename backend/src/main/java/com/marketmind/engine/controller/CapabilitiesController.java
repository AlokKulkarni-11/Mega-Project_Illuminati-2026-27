package com.marketmind.engine.controller;

import com.marketmind.engine.InsightEngine;
import com.marketmind.engine.dto.EngineCapabilitiesDto;
import com.marketmind.engine.dto.EngineInfoDto;
import com.marketmind.engine.dto.EngineStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/capabilities")
@Tag(name = "Capabilities", description = "Query app and engine capabilities")
public class CapabilitiesController {

    private final InsightEngine engine;
    private final String engineMode;

    public CapabilitiesController(
            InsightEngine engine,
            @Value("${marketmind.engine.mode:mock}") String engineMode
    ) {
        this.engine = engine;
        this.engineMode = engineMode.toLowerCase().trim();
    }

    @GetMapping
    @Operation(summary = "Get system capabilities and engine availability status")
    public ResponseEntity<EngineCapabilitiesDto> getCapabilities() {
        boolean isEnabled = !"disabled".equalsIgnoreCase(engineMode);
        EngineStatus status;
        try {
            status = isEnabled ? engine.status() : EngineStatus.DISABLED;
        } catch (Exception e) {
            status = EngineStatus.UNAVAILABLE;
        }

        EngineInfoDto engineInfo = new EngineInfoDto(isEnabled, engineMode, status.name());

        Map<String, Boolean> features = new LinkedHashMap<>();
        features.put("dossier", isEnabled);
        features.put("pulse", isEnabled);
        features.put("sectors", isEnabled);
        features.put("leaderboard", isEnabled);
        features.put("scoreboard", isEnabled);
        features.put("compare", isEnabled);
        // Engine-independent features
        features.put("calculators", true);
        features.put("glossary", true);
        features.put("watchlist", true);
        features.put("history", true);

        return ResponseEntity.ok(new EngineCapabilitiesDto(engineInfo, features));
    }
}

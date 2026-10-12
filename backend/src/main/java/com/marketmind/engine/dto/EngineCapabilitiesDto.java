package com.marketmind.engine.dto;

import java.util.Map;

public record EngineCapabilitiesDto(
        EngineInfoDto engine,
        Map<String, Boolean> features
) {}

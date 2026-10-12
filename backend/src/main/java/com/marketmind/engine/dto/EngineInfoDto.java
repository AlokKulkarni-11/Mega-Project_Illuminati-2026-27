package com.marketmind.engine.dto;

public record EngineInfoDto(
        boolean enabled,
        String mode,
        String status
) {}

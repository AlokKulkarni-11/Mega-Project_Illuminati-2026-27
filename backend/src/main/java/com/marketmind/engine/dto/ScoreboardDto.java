package com.marketmind.engine.dto;

public record ScoreboardDto(
        int totalAnalyzed,
        int explainedCount,
        int unexplainedCount,
        String summary
) {}

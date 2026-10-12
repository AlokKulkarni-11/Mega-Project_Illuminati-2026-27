package com.marketmind.engine.dto;

import java.math.BigDecimal;
import java.util.List;

public record SectorSnapshotDto(
        String sector,
        String sentiment,
        BigDecimal changePct,
        List<String> topSymbols
) {}

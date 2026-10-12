package com.marketmind.engine.dto;

import java.math.BigDecimal;

public record ComparisonRowDto(
        String symbol,
        BigDecimal latestPrice,
        BigDecimal changePct,
        String regime,
        String agreement
) {}

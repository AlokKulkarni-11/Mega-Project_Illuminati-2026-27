package com.marketmind.engine.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AnomalyDto(
        String symbol,
        LocalDate date,
        String direction,
        BigDecimal returnPct,
        BigDecimal returnZ,
        String label,
        String confidence
) {}

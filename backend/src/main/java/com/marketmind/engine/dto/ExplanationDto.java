package com.marketmind.engine.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ExplanationDto(
        String symbol,
        LocalDate date,
        String priceDirection,
        BigDecimal returnPct,
        BigDecimal returnZ,
        boolean hasClearDriver,
        String causeSummary,
        String causalCategory,
        String scope,
        String newsDirection,
        String signalAgreement,
        String confidence,
        List<CitationDto> citations
) {}
